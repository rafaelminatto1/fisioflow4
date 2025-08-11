import { api } from './api'

export interface Exercise {
  id: string
  title: string
  description: string
  instructions: string
  category: string
  difficulty: string
  body_regions: string[]
  video_url?: string
  thumbnail_url?: string
  images: string[]
  default_duration_seconds?: number
  default_repetitions?: number
  default_sets?: number
  default_rest_seconds?: number
  equipment_needed: string[]
  contraindications: string[]
  precautions: string[]
  benefits: string[]
  points_value: number
  is_active: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
  average_rating?: number
  total_executions?: number
}

export interface PatientExercise {
  id: string
  patient_id: string
  exercise_id: string
  prescribed_by: string
  custom_duration_seconds?: number
  custom_repetitions?: number
  custom_sets?: number
  custom_rest_seconds?: number
  therapist_notes?: string
  patient_notes?: string
  start_date: string
  end_date?: string
  frequency_per_week: number
  days_of_week?: number[]
  is_active: boolean
  is_completed: boolean
  completed_at?: string
  prescribed_at: string
  updated_at: string
  effective_parameters: {
    duration_seconds?: number
    repetitions?: number
    sets?: number
    rest_seconds?: number
  }
  exercise?: Exercise
  completion_rate?: number
}

export interface ExerciseExecution {
  id: string
  patient_exercise_id: string
  exercise_id: string
  patient_id: string
  started_at: string
  completed_at?: string
  duration_seconds?: number
  repetitions_completed?: number
  sets_completed?: number
  patient_rating?: number
  difficulty_felt?: number
  pain_level?: number
  effort_level?: number
  patient_comments?: string
  points_earned: number
  bonus_points: number
  location?: string
  is_completed: boolean
  duration_minutes?: number
  completion_percentage: number
  exercise?: Exercise
  patient_exercise?: PatientExercise
}

export interface ExerciseFilters {
  category?: string
  difficulty?: string
  body_region?: string
  search?: string
  approved_only?: boolean
  sort_by?: 'title' | 'difficulty' | 'category' | 'created_at'
  sort_order?: 'asc' | 'desc'
  include_stats?: boolean
  page?: number
  per_page?: number
}

export interface PatientExerciseFilters {
  is_active?: boolean
  is_completed?: boolean
  start_date?: string
  end_date?: string
  include_stats?: boolean
  page?: number
  per_page?: number
}

export interface ExerciseExecutionFilters {
  exercise_id?: string
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

export interface CreateExerciseData {
  title: string
  description: string
  instructions: string
  category: string
  difficulty: string
  body_regions: string[]
  video_url?: string
  thumbnail_url?: string
  images?: string[]
  default_duration_seconds?: number
  default_repetitions?: number
  default_sets?: number
  default_rest_seconds?: number
  equipment_needed?: string[]
  contraindications?: string[]
  precautions?: string[]
  benefits?: string[]
  points_value?: number
}

export interface PrescribeExerciseData {
  patient_id: string
  exercise_id: string
  start_date: string
  end_date?: string
  frequency_per_week?: number
  days_of_week?: number[]
  custom_duration_seconds?: number
  custom_repetitions?: number
  custom_sets?: number
  custom_rest_seconds?: number
  therapist_notes?: string
}

export interface CreateExecutionData {
  patient_exercise_id: string
  duration_seconds?: number
  repetitions_completed?: number
  sets_completed?: number
  patient_rating?: number
  difficulty_felt?: number
  pain_level?: number
  effort_level?: number
  patient_comments?: string
  location?: string
}

export interface ExerciseStats {
  total_exercises: number
  approved_exercises: number
  pending_approval: number
  category_distribution: Record<string, number>
  difficulty_distribution: Record<string, number>
  most_executed: Array<{
    exercise_id: string
    title: string
    execution_count: number
  }>
}

export interface PatientStats {
  total_prescribed: number
  completed_prescriptions: number
  completion_rate: number
  total_executions: number
  total_points: number
  weekly_executions: Array<{
    week: string
    executions: number
  }>
}

class ExercisesService {
  // =============================================================================
  // BIBLIOTECA DE EXERCÍCIOS
  // =============================================================================

  async getExercises(filters: ExerciseFilters = {}) {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })

    return api.get<{
      data: Exercise[]
      total: number
      page: number
      per_page: number
      pages: number
    }>(`/exercises?${params.toString()}`)
  }

  async getExercise(exerciseId: string, includeStats = false) {
    const params = new URLSearchParams()
    if (includeStats) {
      params.append('include_stats', 'true')
    }

    return api.get<{ exercise: Exercise }>(`/exercises/${exerciseId}?${params.toString()}`)
  }

  async createExercise(data: CreateExerciseData) {
    return api.post<{
      message: string
      exercise: Exercise
    }>('/exercises', data)
  }

  async updateExercise(exerciseId: string, data: Partial<CreateExerciseData>) {
    return api.put<{
      message: string
      exercise: Exercise
    }>(`/exercises/${exerciseId}`, data)
  }

  async approveExercise(exerciseId: string) {
    return api.post<{ message: string }>(`/exercises/${exerciseId}/approve`)
  }

  async deleteExercise(exerciseId: string) {
    return api.delete<{ message: string }>(`/exercises/${exerciseId}`)
  }

  // =============================================================================
  // PRESCRIÇÃO DE EXERCÍCIOS
  // =============================================================================

  async getPatientExercises(patientId: string, filters: PatientExerciseFilters = {}) {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })

    return api.get<{
      data: PatientExercise[]
      total: number
      page: number
      per_page: number
      pages: number
    }>(`/exercises/patient/${patientId}?${params.toString()}`)
  }

  async prescribeExercise(data: PrescribeExerciseData) {
    return api.post<{
      message: string
      patient_exercise: PatientExercise
    }>('/exercises/prescribe', data)
  }

  async updatePatientExercise(patientExerciseId: string, data: Partial<PrescribeExerciseData>) {
    return api.put<{
      message: string
      patient_exercise: PatientExercise
    }>(`/exercises/patient-exercise/${patientExerciseId}`, data)
  }

  // =============================================================================
  // EXECUÇÕES DE EXERCÍCIOS
  // =============================================================================

  async createExecution(data: CreateExecutionData) {
    return api.post<{
      message: string
      execution: ExerciseExecution
      points_earned: number
    }>('/exercises/execution', data)
  }

  async getPatientExecutions(patientId: string, filters: ExerciseExecutionFilters = {}) {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value))
      }
    })

    return api.get<{
      data: ExerciseExecution[]
      total: number
      page: number
      per_page: number
      pages: number
    }>(`/exercises/executions/${patientId}?${params.toString()}`)
  }

  // =============================================================================
  // ESTATÍSTICAS
  // =============================================================================

  async getLibraryStats() {
    return api.get<ExerciseStats>('/exercises/stats/library')
  }

  async getPatientStats(patientId: string) {
    return api.get<PatientStats>(`/exercises/stats/patient/${patientId}`)
  }

  // =============================================================================
  // UTILITÁRIOS
  // =============================================================================

  async getCategories() {
    return api.get<{
      categories: Array<{ value: string; label: string }>
    }>('/exercises/categories')
  }

  async getDifficulties() {
    return api.get<{
      difficulties: Array<{ value: string; label: string }>
    }>('/exercises/difficulties')
  }

  async getBodyRegions() {
    return api.get<{
      body_regions: Array<{ value: string; label: string }>
    }>('/exercises/body-regions')
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A'
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes === 0) return `${remainingSeconds}s`
    if (remainingSeconds === 0) return `${minutes}min`
    return `${minutes}min ${remainingSeconds}s`
  }

  getDifficultyColor(difficulty: string): string {
    const colors = {
      'iniciante': 'green',
      'intermediario': 'yellow',
      'avancado': 'orange',
      'especialista': 'red'
    }
    return colors[difficulty as keyof typeof colors] || 'gray'
  }

  getCategoryIcon(category: string): string {
    const icons = {
      'fortalecimento': '💪',
      'alongamento': '🧘',
      'mobilidade': '🤸',
      'equilibrio': '⚖️',
      'coordenacao': '🎯',
      'cardio': '❤️',
      'respiratorio': '🫁',
      'propriocepcao': '🧠',
      'relaxamento': '😌',
      'funcional': '🏃'
    }
    return icons[category as keyof typeof icons] || '🏋️'
  }

  getBodyRegionLabel(region: string): string {
    const labels = {
      'cervical': 'Cervical',
      'toracica': 'Torácica',
      'lombar': 'Lombar',
      'ombro': 'Ombro',
      'cotovelo': 'Cotovelo',
      'punho_mao': 'Punho/Mão',
      'quadril': 'Quadril',
      'joelho': 'Joelho',
      'tornozelo_pe': 'Tornozelo/Pé',
      'corpo_todo': 'Corpo Todo',
      'core': 'Core'
    }
    return labels[region as keyof typeof labels] || region
  }

  calculateCompletionPercentage(execution: ExerciseExecution): number {
    if (!execution.patient_exercise) return 0

    const params = execution.patient_exercise.effective_parameters
    let totalScore = 0
    let completedScore = 0

    // Verificar repetições
    if (params.repetitions) {
      totalScore += 1
      if (execution.repetitions_completed && execution.repetitions_completed >= params.repetitions) {
        completedScore += 1
      }
    }

    // Verificar séries
    if (params.sets) {
      totalScore += 1
      if (execution.sets_completed && execution.sets_completed >= params.sets) {
        completedScore += 1
      }
    }

    // Verificar duração
    if (params.duration_seconds) {
      totalScore += 1
      if (execution.duration_seconds && execution.duration_seconds >= params.duration_seconds) {
        completedScore += 1
      }
    }

    return totalScore > 0 ? (completedScore / totalScore) * 100 : 0
  }

  getRatingStars(rating?: number): string {
    if (!rating) return '☆☆☆☆☆'
    
    const fullStars = Math.floor(rating)
    const halfStar = rating % 1 >= 0.5 ? 1 : 0
    const emptyStars = 5 - fullStars - halfStar
    
    return '★'.repeat(fullStars) + 
           '☆'.repeat(halfStar) + 
           '☆'.repeat(emptyStars)
  }

  getPainLevelLabel(level?: number): string {
    if (!level) return 'Sem dor'
    
    const labels = [
      'Sem dor',
      'Dor muito leve',
      'Dor leve',
      'Dor moderada',
      'Dor moderada-severa',
      'Dor severa',
      'Dor muito severa',
      'Dor intensa',
      'Dor muito intensa',
      'Dor insuportável',
      'Pior dor possível'
    ]
    
    return labels[Math.min(level, 10)] || 'N/A'
  }

  getEffortLevelLabel(level?: number): string {
    if (!level) return 'Sem esforço'
    
    const labels = [
      'Sem esforço',
      'Muito fácil',
      'Fácil',
      'Moderado',
      'Um pouco difícil',
      'Difícil',
      'Muito difícil',
      'Extremamente difícil',
      'Máximo esforço'
    ]
    
    return labels[Math.min(level - 1, 8)] || 'N/A'
  }
}

export const exercisesService = new ExercisesService()