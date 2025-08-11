'use client'

import React, { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, CheckCircle, Star, Clock, Target, Trophy, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PatientLayout from '@/components/patient/PatientLayout'
import { apiClient } from '@/lib/api'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  difficulty_level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'
  duration_minutes: number
  repetitions?: number
  sets?: number
  video_url?: string
  thumbnail_url?: string
  instructions: string[]
  equipment_needed: string[]
  muscle_groups: string[]
  benefits: string[]
}

interface PrescribedExercise extends Exercise {
  prescription_id: string
  prescribed_date: string
  frequency_per_week: number
  total_sessions_prescribed: number
  completed_sessions: number
  progress_percentage: number
  last_completed?: string
  next_session?: string
  is_completed: boolean
}

interface ExerciseExecution {
  id: string
  exercise_id: string
  execution_date: string
  duration_seconds: number
  repetitions_completed: number
  sets_completed: number
  difficulty_rating: number
  notes?: string
  pain_level?: number
}

export default function PatientExercises() {
  const [prescribedExercises, setPrescribedExercises] = useState<PrescribedExercise[]>([])
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([])
  const [executions, setExecutions] = useState<ExerciseExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<PrescribedExercise | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    loadExerciseData()
  }, [])

  const loadExerciseData = async () => {
    try {
      const [prescribedRes, libraryRes, executionsRes] = await Promise.all([
        apiClient.get('/patient-portal/exercises/prescribed'),
        apiClient.get('/patient-portal/exercises/library'),
        apiClient.get('/patient-portal/exercises/executions')
      ])

      setPrescribedExercises(prescribedRes.data.exercises)
      setExerciseLibrary(libraryRes.data.exercises)
      setExecutions(executionsRes.data.executions)
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startExercise = (exercise: PrescribedExercise) => {
    setSelectedExercise(exercise)
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const completeExercise = async (exerciseId: string, data: {
    duration_seconds: number
    repetitions_completed: number
    sets_completed: number
    difficulty_rating: number
    pain_level?: number
    notes?: string
  }) => {
    try {
      await apiClient.post('/patient-portal/exercises/complete', {
        exercise_id: exerciseId,
        ...data
      })
      await loadExerciseData()
      setSelectedExercise(null)
    } catch (error) {
      console.error('Erro ao completar exercício:', error)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'INICIANTE':
        return 'bg-green-100 text-green-800'
      case 'INTERMEDIARIO':
        return 'bg-yellow-100 text-yellow-800'
      case 'AVANCADO':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'INICIANTE':
        return 'Iniciante'
      case 'INTERMEDIARIO':
        return 'Intermediário'
      case 'AVANCADO':
        return 'Avançado'
      default:
        return difficulty
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const todaysExercises = prescribedExercises.filter(ex => {
    if (!ex.next_session) return false
    const today = new Date().toDateString()
    const nextSession = new Date(ex.next_session).toDateString()
    return today === nextSession
  })

  const upcomingExercises = prescribedExercises.filter(ex => {
    if (!ex.next_session) return false
    const today = new Date()
    const nextSession = new Date(ex.next_session)
    return nextSession > today
  })

  const completedExercises = prescribedExercises.filter(ex => ex.is_completed)

  if (isLoading) {
    return (
      <PatientLayout currentPage="exercises">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando exercícios...</p>
          </div>
        </div>
      </PatientLayout>
    )
  }

  if (selectedExercise) {
    return (
      <PatientLayout currentPage="exercises">
        <div className="flex-1 bg-gray-900 text-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-gray-800"
                onClick={() => setSelectedExercise(null)}
              >
                ← Voltar
              </Button>
              <div className="text-center">
                <h1 className="text-2xl font-bold">{selectedExercise.name}</h1>
                <p className="text-gray-400">{selectedExercise.category}</p>
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video/Exercise Area */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gray-700 rounded-t-lg flex items-center justify-center">
                      {selectedExercise.video_url ? (
                        <div className="w-full h-full">
                          {/* Video player would go here */}
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <div className="text-center">
                              <Play className="h-16 w-16 text-white mb-4 mx-auto" />
                              <p className="text-white">Vídeo do Exercício</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Activity className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
                          <p className="text-gray-400">Siga as instruções abaixo</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center justify-center gap-4 mb-6">
                        <Button 
                          size="lg" 
                          variant={isPlaying ? "secondary" : "default"}
                          onClick={togglePlayPause}
                        >
                          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => setCurrentTime(0)}>
                          <RotateCcw className="h-6 w-6" />
                        </Button>
                      </div>

                      <div className="text-center">
                        <div className="text-4xl font-bold mb-2">{formatTime(currentTime)}</div>
                        <div className="text-gray-400">
                          de {selectedExercise.duration_minutes}:00 minutos
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exercise Completion */}
                <Card className="mt-4 bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Finalizar Exercício</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Repetições
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
                          placeholder={selectedExercise.repetitions?.toString() || "0"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Séries
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
                          placeholder={selectedExercise.sets?.toString() || "0"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Dificuldade (1-5 estrelas)
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className="h-6 w-6 text-yellow-500 cursor-pointer" />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Observações (opcional)
                      </label>
                      <textarea 
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
                        rows={3}
                        placeholder="Como se sentiu durante o exercício?"
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => completeExercise(selectedExercise.id, {
                        duration_seconds: currentTime,
                        repetitions_completed: selectedExercise.repetitions || 0,
                        sets_completed: selectedExercise.sets || 0,
                        difficulty_rating: 3
                      })}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Concluir Exercício
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Instructions */}
              <div>
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Instruções
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white mb-2">Como fazer:</h4>
                      <ul className="space-y-2">
                        {selectedExercise.instructions.map((instruction, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-blue-400 font-bold">{index + 1}.</span>
                            {instruction}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-white mb-2">Equipamentos:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedExercise.equipment_needed.map((equipment, index) => (
                          <Badge key={index} variant="secondary">
                            {equipment}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-white mb-2">Músculos trabalhados:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedExercise.muscle_groups.map((muscle, index) => (
                          <Badge key={index} variant="outline" className="text-gray-300 border-gray-600">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-white mb-2">Benefícios:</h4>
                      <ul className="space-y-1">
                        {selectedExercise.benefits.slice(0, 3).map((benefit, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </PatientLayout>
    )
  }

  return (
    <PatientLayout currentPage="exercises">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Exercícios</h1>
              <p className="text-gray-600">Acompanhe seu programa de exercícios personalizado</p>
            </div>
          </div>

          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Hoje ({todaysExercises.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Programados ({upcomingExercises.length})</TabsTrigger>
              <TabsTrigger value="completed">Concluídos ({completedExercises.length})</TabsTrigger>
              <TabsTrigger value="library">Biblioteca</TabsTrigger>
            </TabsList>

            {/* Today's Exercises */}
            <TabsContent value="today" className="space-y-4">
              {todaysExercises.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum exercício para hoje</h3>
                    <p className="text-gray-600">Você não possui exercícios agendados para hoje.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todaysExercises.map((exercise) => (
                    <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{exercise.name}</CardTitle>
                            <p className="text-sm text-gray-600">{exercise.category}</p>
                          </div>
                          <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                            {getDifficultyLabel(exercise.difficulty_level)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">{exercise.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exercise.duration_minutes} min
                          </span>
                          {exercise.repetitions && (
                            <span>{exercise.repetitions} rep</span>
                          )}
                          {exercise.sets && (
                            <span>{exercise.sets} séries</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Progresso</span>
                            <span>{exercise.completed_sessions}/{exercise.total_sessions_prescribed}</span>
                          </div>
                          <Progress value={exercise.progress_percentage} className="h-2" />
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => startExercise(exercise)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Fazer Exercício
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Upcoming Exercises */}
            <TabsContent value="upcoming" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{exercise.name}</CardTitle>
                          <p className="text-sm text-gray-600">{exercise.category}</p>
                        </div>
                        <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                          {getDifficultyLabel(exercise.difficulty_level)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Progresso</span>
                          <span>{exercise.completed_sessions}/{exercise.total_sessions_prescribed}</span>
                        </div>
                        <Progress value={exercise.progress_percentage} className="h-2" />
                      </div>

                      {exercise.next_session && (
                        <div className="text-sm text-gray-600">
                          <strong>Próxima sessão:</strong> {new Date(exercise.next_session).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      
                      <Button variant="outline" className="w-full" disabled>
                        <Clock className="h-4 w-4 mr-2" />
                        Agendado
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Completed Exercises */}
            <TabsContent value="completed" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedExercises.map((exercise) => (
                  <Card key={exercise.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{exercise.name}</CardTitle>
                          <p className="text-sm text-gray-600">{exercise.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                            {getDifficultyLabel(exercise.difficulty_level)}
                          </Badge>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Progress value={100} className="h-2" />
                        <div className="text-sm text-green-600 font-medium">
                          ✓ Programa completo
                        </div>
                      </div>

                      {exercise.last_completed && (
                        <div className="text-sm text-gray-600">
                          <strong>Concluído em:</strong> {new Date(exercise.last_completed).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      
                      <Button variant="outline" className="w-full">
                        <Trophy className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Exercise Library */}
            <TabsContent value="library" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {exerciseLibrary.slice(0, 12).map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                          <Activity className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{exercise.name}</h4>
                          <p className="text-sm text-gray-600">{exercise.category}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                            {getDifficultyLabel(exercise.difficulty_level)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {exercise.duration_minutes} min
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PatientLayout>
  )
}