'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Activity, Heart, Trophy, MessageSquare, FileText, User, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'

interface PatientStats {
  appointments_this_month: number
  completed_sessions: number
  exercises_completed: number
  adherence_rate: number
  next_appointment?: {
    id: string
    date: string
    time: string
    therapist_name: string
    type: string
  }
}

interface ExerciseProgress {
  exercise_name: string
  completed_sessions: number
  total_sessions: number
  last_completed: string
  progress_percentage: number
}

interface RecentActivity {
  id: string
  type: 'APPOINTMENT' | 'EXERCISE' | 'MESSAGE' | 'EVOLUTION'
  description: string
  date: string
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED'
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PatientStats | null>(null)
  const [exercises, setExercises] = useState<ExerciseProgress[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load patient stats
      const statsResponse = await apiClient.get('/patient-portal/stats')
      setStats(statsResponse.data)

      // Load exercise progress
      const exercisesResponse = await apiClient.get('/patient-portal/exercises/progress')
      setExercises(exercisesResponse.data.exercises)

      // Load recent activities
      const activitiesResponse = await apiClient.get('/patient-portal/activities')
      setActivities(activitiesResponse.data.activities)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-4 w-4" />
      case 'EXERCISE':
        return <Activity className="h-4 w-4" />
      case 'MESSAGE':
        return <MessageSquare className="h-4 w-4" />
      case 'EVOLUTION':
        return <FileText className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído'
      case 'PENDING':
        return 'Pendente'
      case 'CANCELLED':
        return 'Cancelado'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {user?.full_name}!
              </h1>
              <p className="text-gray-600">Bem-vindo ao seu portal do paciente</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notificações
              </Button>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Consultas este Mês</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.appointments_this_month || 0}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sessões Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.completed_sessions || 0}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Exercícios Feitos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.exercises_completed || 0}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa de Aderência</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.round(stats?.adherence_rate || 0)}%
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Heart className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Appointment */}
        {stats?.next_appointment && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próxima Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    {new Date(stats.next_appointment.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-blue-700">
                    {stats.next_appointment.time} • {stats.next_appointment.therapist_name}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {stats.next_appointment.type}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Remarcar
                  </Button>
                  <Button size="sm">
                    Confirmar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="activities">Atividades Recentes</TabsTrigger>
            <TabsTrigger value="exercises">Exercícios</TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progresso dos Exercícios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exercises.slice(0, 5).map((exercise, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{exercise.exercise_name}</h4>
                        <span className="text-xs text-gray-500">
                          {exercise.completed_sessions}/{exercise.total_sessions}
                        </span>
                      </div>
                      <Progress value={exercise.progress_percentage} className="h-2" />
                      <p className="text-xs text-gray-500">
                        Último: {new Date(exercise.last_completed).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evolução Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900">Meta de Frequência</p>
                        <p className="text-sm text-green-700">8 sessões por mês</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {stats?.appointments_this_month || 0}/8
                        </p>
                        <p className="text-xs text-green-600">
                          {Math.round(((stats?.appointments_this_month || 0) / 8) * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">Meta de Exercícios</p>
                        <p className="text-sm text-blue-700">Diariamente</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round(stats?.adherence_rate || 0)}%
                        </p>
                        <p className="text-xs text-blue-600">Aderência</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString('pt-BR')} às {new Date(activity.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(activity.status)} variant="secondary">
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((exercise, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{exercise.exercise_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-medium">
                          {exercise.completed_sessions}/{exercise.total_sessions}
                        </span>
                      </div>
                      <Progress value={exercise.progress_percentage} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Último: {new Date(exercise.last_completed).toLocaleDateString('pt-BR')}</span>
                        <span>{Math.round(exercise.progress_percentage)}%</span>
                      </div>
                      <Button size="sm" className="w-full" variant="outline">
                        Fazer Exercício
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
  )
}