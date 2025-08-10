'use client';

import { apiService } from './api';

// Types for Appointment Management
export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  appointment_type: 'AVALIACAO' | 'TRATAMENTO' | 'RETORNO' | 'GRUPO' | 'DOMICILIAR' | 'TELEMEDICINA';
  status: 'AGENDADO' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'FALTOU' | 'REAGENDADO';
  title?: string;
  description?: string;
  location?: string;
  room?: string;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  confirmation_required: boolean;
  confirmed_at?: string;
  reminder_sent: boolean;
  notes?: string;
  cancellation_reason?: string;
  is_past: boolean;
  is_today: boolean;
  is_confirmed: boolean;
  can_be_cancelled: boolean;
  can_be_rescheduled: boolean;
  created_at: string;
  updated_at?: string;
  patient_name?: string;
  therapist_name?: string;
  reminders?: AppointmentReminder[];
}

export interface RecurrencePattern {
  frequency: 'DIARIA' | 'SEMANAL' | 'MENSAL';
  interval: number;
  end_date?: string;
  count?: number;
  days_of_week?: number[]; // For weekly: 0=Monday, 6=Sunday
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  reminder_type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  minutes_before: number;
  scheduled_for: string;
  sent_at?: string;
  failed_at?: string;
  error_message?: string;
  subject?: string;
  message: string;
  is_sent: boolean;
  is_failed: boolean;
  is_pending: boolean;
  created_at: string;
}

export interface CreateAppointmentData {
  patient_id: string;
  therapist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  appointment_type?: string;
  title?: string;
  description?: string;
  location?: string;
  room?: string;
  confirmation_required?: boolean;
  notes?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  reminders?: CreateReminderData[];
}

export interface CreateReminderData {
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  minutes_before: number;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  duration: number;
}

export interface AvailableSlotsResponse {
  available_slots: TimeSlot[];
  date: string;
  therapist_id: string;
  total_slots: number;
  available_count: number;
}

export interface CalendarData {
  calendar: Record<string, Appointment[]>;
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  statistics: {
    total: number;
    completed: number;
    cancelled: number;
    completion_rate: number;
  };
}

export interface ScheduleTemplate {
  id: string;
  therapist_id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_duration: number;
  max_patients_per_slot: number;
  is_active: boolean;
  time_slots: TimeSlot[];
  created_at: string;
  updated_at?: string;
}

class AppointmentService {
  // Appointment CRUD
  async createAppointment(data: CreateAppointmentData): Promise<{ message: string; appointment: Appointment; recurring_count: number }> {
    return await apiService.request({
      method: 'POST',
      url: '/api/v1/appointments/',
      data,
    });
  }

  async getAppointments(params?: {
    start_date?: string;
    end_date?: string;
    therapist_id?: string;
    patient_id?: string;
    status?: string[];
    appointment_type?: string;
  }): Promise<{ appointments: Appointment[] }> {
    return await apiService.request({
      method: 'GET',
      url: '/api/v1/appointments/',
      params,
    });
  }

  async getAppointment(appointmentId: string): Promise<Appointment> {
    return await apiService.request({
      method: 'GET',
      url: `/api/v1/appointments/${appointmentId}`,
    });
  }

  async updateAppointment(appointmentId: string, data: Partial<CreateAppointmentData>): Promise<{ message: string; appointment: Appointment }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/appointments/${appointmentId}`,
      data,
    });
  }

  async updateAppointmentStatus(appointmentId: string, status: string, cancellation_reason?: string): Promise<{ message: string; appointment: Appointment }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/appointments/${appointmentId}/status`,
      data: { status, cancellation_reason },
    });
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<{ message: string }> {
    return await apiService.request({
      method: 'DELETE',
      url: `/api/v1/appointments/${appointmentId}`,
      data: { reason },
    });
  }

  // Calendar & Scheduling
  async getCalendarView(year?: number, month?: number, therapist_id?: string): Promise<CalendarData> {
    return await apiService.request({
      method: 'GET',
      url: '/api/v1/appointments/calendar',
      params: { year, month, therapist_id },
    });
  }

  async getAvailableSlots(therapist_id: string, date: string): Promise<AvailableSlotsResponse> {
    return await apiService.request({
      method: 'GET',
      url: '/api/v1/appointments/available-slots',
      params: { therapist_id, date },
    });
  }

  // Helper methods
  getAppointmentTypeDisplay(type: string): string {
    const typeMap: Record<string, string> = {
      'AVALIACAO': 'Avaliação',
      'TRATAMENTO': 'Tratamento',
      'RETORNO': 'Retorno',
      'GRUPO': 'Grupo',
      'DOMICILIAR': 'Domiciliar',
      'TELEMEDICINA': 'Telemedicina',
    };
    return typeMap[type] || type;
  }

  getStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      'AGENDADO': 'Agendado',
      'CONFIRMADO': 'Confirmado',
      'EM_ANDAMENTO': 'Em andamento',
      'CONCLUIDO': 'Concluído',
      'CANCELADO': 'Cancelado',
      'FALTOU': 'Paciente faltou',
      'REAGENDADO': 'Reagendado',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'AGENDADO': 'bg-blue-100 text-blue-800',
      'CONFIRMADO': 'bg-green-100 text-green-800',
      'EM_ANDAMENTO': 'bg-orange-100 text-orange-800',
      'CONCLUIDO': 'bg-gray-100 text-gray-800',
      'CANCELADO': 'bg-red-100 text-red-800',
      'FALTOU': 'bg-yellow-100 text-yellow-800',
      'REAGENDADO': 'bg-purple-100 text-purple-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  formatTime(time: string): string {
    return time; // Already in HH:MM format
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  formatDateTime(dateString: string, timeString: string): string {
    const date = new Date(`${dateString}T${timeString}`);
    return date.toLocaleString('pt-BR');
  }

  isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isFuture(dateString: string, timeString: string): boolean {
    const appointmentDateTime = new Date(`${dateString}T${timeString}`);
    return appointmentDateTime > new Date();
  }

  // Recurring appointment helpers
  generateRecurringDates(
    startDate: string,
    pattern: RecurrencePattern,
    maxCount: number = 52
  ): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    let current = new Date(start);
    let count = 0;

    while (count < maxCount) {
      // Add current date
      dates.push(current.toISOString().split('T')[0]);
      count++;

      // Calculate next date based on frequency
      switch (pattern.frequency) {
        case 'DIARIA':
          current.setDate(current.getDate() + pattern.interval);
          break;
        case 'SEMANAL':
          current.setDate(current.getDate() + (7 * pattern.interval));
          break;
        case 'MENSAL':
          current.setMonth(current.getMonth() + pattern.interval);
          break;
      }

      // Check end conditions
      if (pattern.end_date && current > new Date(pattern.end_date)) {
        break;
      }
      if (pattern.count && count >= pattern.count) {
        break;
      }
    }

    return dates.slice(1); // Remove first date (original appointment)
  }

  // Time conflict detection
  hasTimeConflict(
    appointment1: { start_time: string; end_time: string },
    appointment2: { start_time: string; end_time: string }
  ): boolean {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1 = timeToMinutes(appointment1.start_time);
    const end1 = timeToMinutes(appointment1.end_time);
    const start2 = timeToMinutes(appointment2.start_time);
    const end2 = timeToMinutes(appointment2.end_time);

    return Math.max(start1, start2) < Math.min(end1, end2);
  }

  // Generate time options for dropdowns
  generateTimeOptions(startTime: string = '08:00', endTime: string = '18:00', interval: number = 15): string[] {
    const options: string[] = [];
    
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    for (let minutes = start; minutes <= end; minutes += interval) {
      options.push(minutesToTime(minutes));
    }

    return options;
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;