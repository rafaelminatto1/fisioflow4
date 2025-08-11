import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setAuthToken } from '@/services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setAuthToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      // Clear invalid stored data
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { token: authToken, user: userData } = response.data;

      // Save to secure storage
      await SecureStore.setItemAsync(TOKEN_KEY, authToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);

      // Update state
      setToken(authToken);
      setUser(userData);
      setAuthToken(authToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro no login');
    }
  };

  const loginWithBiometrics = async () => {
    try {
      // Get stored email for biometric login
      const storedEmail = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
      if (!storedEmail) {
        throw new Error('Nenhuma conta configurada para login biométrico');
      }

      // For now, we'll use the stored token if it exists
      // In a real app, you'd want to implement a biometric-specific auth endpoint
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (!storedToken || !storedUser) {
        throw new Error('Dados de autenticação não encontrados');
      }

      // Verify token is still valid
      setAuthToken(storedToken);
      const response = await apiClient.get('/auth/me');

      setToken(storedToken);
      setUser(response.data.user);
    } catch (error: any) {
      // Clear invalid data
      await clearStoredAuth();
      throw new Error(error.response?.data?.message || 'Erro na autenticação biométrica');
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local state and storage
      setUser(null);
      setToken(null);
      setAuthToken('');
      await clearStoredAuth();
    }
  };

  const refreshUser = async () => {
    try {
      if (!token) return;

      const response = await apiClient.get('/auth/me');
      const userData = response.data.user;

      setUser(userData);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithBiometrics,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}