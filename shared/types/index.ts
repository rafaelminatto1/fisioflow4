import { z } from 'zod';

// Schemas de validação usando Zod

// User Types
export const UserRoleSchema = z.enum(['admin', 'fisioterapeuta', 'recepcionista', 'paciente']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Patient Types
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  cpf: z.string().length(11),
  birthDate: z.date(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string().length(8),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
  lgpdConsent: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Authentication Types
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Appointment Types (preparação para próximas fases)
export const AppointmentStatusSchema = z.enum(['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show']);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

// Exercise Types (preparação para próximas fases)
export const ExerciseCategorySchema = z.enum(['strength', 'flexibility', 'balance', 'cardio', 'rehabilitation']);
export type ExerciseCategory = z.infer<typeof ExerciseCategorySchema>;

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}