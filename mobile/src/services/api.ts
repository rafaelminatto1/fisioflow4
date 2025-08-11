import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let currentToken: string | null = null;

export const setAuthToken = (token: string) => {
  currentToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add token to request if available
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { token } = response.data;
          await SecureStore.setItemAsync('auth_token', token);
          setAuthToken(token);

          // Retry original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_data');
        setAuthToken('');
        
        // You might want to emit an event here to redirect to login
        // or use a navigation service
      }
    }

    return Promise.reject(error);
  }
);

// API Service functions
export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

export const patientService = {
  getDashboardStats: async () => {
    const response = await apiClient.get('/patient-portal/stats');
    return response.data;
  },

  getExerciseProgress: async () => {
    const response = await apiClient.get('/patient-portal/exercises/progress');
    return response.data;
  },

  getExercises: async () => {
    const response = await apiClient.get('/patient-portal/exercises/prescribed');
    return response.data;
  },

  completeExercise: async (exerciseId: string, data: any) => {
    const response = await apiClient.post('/patient-portal/exercises/complete', {
      exercise_id: exerciseId,
      ...data,
    });
    return response.data;
  },

  getAppointments: async () => {
    const response = await apiClient.get('/patient-portal/appointments');
    return response.data;
  },

  confirmAppointment: async (appointmentId: string) => {
    const response = await apiClient.post(`/patient-portal/appointments/${appointmentId}/confirm`);
    return response.data;
  },

  cancelAppointment: async (appointmentId: string) => {
    const response = await apiClient.post(`/patient-portal/appointments/${appointmentId}/cancel`);
    return response.data;
  },

  getConversations: async () => {
    const response = await apiClient.get('/patient-portal/messages/conversations');
    return response.data;
  },

  getMessages: async (conversationId: string) => {
    const response = await apiClient.get(`/patient-portal/messages/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post('/patient-portal/messages/send', {
      conversation_id: conversationId,
      content,
      message_type: 'TEXT',
    });
    return response.data;
  },

  getMedicalRecords: async () => {
    const response = await apiClient.get('/patient-portal/medical-records');
    return response.data;
  },
};

export const offlineService = {
  // Store data for offline access
  storeData: async (key: string, data: any) => {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  },

  // Get stored data for offline access
  getData: async (key: string) => {
    try {
      const data = await SecureStore.getItemAsync(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  },

  // Remove stored data
  removeData: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing offline data:', error);
    }
  },

  // Sync offline data when connection is restored
  syncOfflineData: async () => {
    try {
      // Get pending exercise completions
      const pendingExercises = await SecureStore.getItemAsync('pending_exercises');
      if (pendingExercises) {
        const exercises = JSON.parse(pendingExercises);
        
        for (const exercise of exercises) {
          try {
            await patientService.completeExercise(exercise.exerciseId, exercise.data);
          } catch (error) {
            console.error('Error syncing exercise:', error);
          }
        }
        
        // Clear pending exercises after sync
        await SecureStore.deleteItemAsync('pending_exercises');
      }
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  },
};

export default apiClient;