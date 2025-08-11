'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Target, Zap, Award, Calendar, BarChart3, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { exercisesService, ExerciseStats, PatientStats } from '@/services/exercises'
import { useAuth } from '@/contexts/AuthContext'

interface ExercisesDashboardProps {
  patientId?: string
  className?: string
}

export function ExercisesDashboard({ patientId, className }: ExercisesDashboardProps) {
  const { user } = useAuth()
  const [libraryStats, setLibraryStats] = useState<ExerciseStats | null>(null)
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isPatientView = patientId || user?.role === 'PACIENTE'
  const targetPatientId = patientId || (user?.role === 'PACIENTE' ? user.id : null)

  useEffect(() => {
    loadStats()
  }, [targetPatientId])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      
      if (isPatientView && targetPatientId) {
        const stats = await exercisesService.getPatientStats(targetPatientId)
        setPatientStats(stats)
      } else if (user?.role === 'ADMIN' || user?.role === 'FISIOTERAPEUTA') {
        const stats = await exercisesService.getLibraryStats()
        setLibraryStats(stats)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Dashboard do paciente
  if (isPatientView && patientStats) {
    const completionRate = Math.round(patientStats.completion_rate)
    const weeklyData = patientStats.weekly_executions.map(item => ({
      week: new Date(item.week).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      executions: item.executions
    }))

    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Estatísticas principais */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exercícios Prescritos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patientStats.total_prescribed}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {patientStats.completed_prescriptions} concluídos
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Adesão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execuções</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patientStats.total_executions}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Total realizadas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontos</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{patientStats.total_points}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Pontos acumulados
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de progresso semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="executions" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Badges de conquistas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Suas Conquistas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patientStats.total_executions >= 10 && (
                <Badge variant="outline" className="border-yellow-200 text-yellow-700">
                  🏃 Primeira Semana
                </Badge>
              )}
              {patientStats.total_executions >= 50 && (
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  💪 Dedicado
                </Badge>
              )}
              {completionRate >= 80 && (
                <Badge variant="outline" className="border-green-200 text-green-700">
                  ⭐ Consistente
                </Badge>
              )}
              {patientStats.total_points >= 500 && (
                <Badge variant="outline" className="border-purple-200 text-purple-700">
                  👑 Pontuador
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard da biblioteca (para terapeutas/admins)
  if (libraryStats) {
    const categoryData = Object.entries(libraryStats.category_distribution).map(([key, value]) => ({
      name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
      color: getRandomColor()
    }))

    const difficultyData = Object.entries(libraryStats.difficulty_distribution).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: getDifficultyColor(key)
    }))

    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Estatísticas da biblioteca */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Exercícios</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{libraryStats.total_exercises}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Na biblioteca
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{libraryStats.approved_exercises}</div>
              <Progress 
                value={(libraryStats.approved_exercises / libraryStats.total_exercises) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{libraryStats.pending_approval}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Aguardando aprovação
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mais Executado</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">
                {libraryStats.most_executed[0]?.title || 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {libraryStats.most_executed[0]?.execution_count || 0} execuções
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
            <TabsTrigger value="difficulty">Por Dificuldade</TabsTrigger>
            <TabsTrigger value="popular">Mais Populares</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2">
                    {categoryData.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium">{category.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="difficulty">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Dificuldade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="popular">
            <Card>
              <CardHeader>
                <CardTitle>Exercícios Mais Executados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {libraryStats.most_executed.map((exercise, index) => (
                    <div key={exercise.exercise_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{exercise.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {exercise.execution_count} execuções
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        Top {index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum dado disponível</h3>
          <p className="text-muted-foreground">
            Não foi possível carregar as estatísticas de exercícios.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Helpers para cores
function getRandomColor() {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
    '#00ff88', '#0088fe', '#ff8042', '#8dd1e1'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

function getDifficultyColor(difficulty: string) {
  const colors = {
    'iniciante': '#22c55e',
    'intermediario': '#eab308', 
    'avancado': '#f97316',
    'especialista': '#ef4444'
  }
  return colors[difficulty as keyof typeof colors] || '#6b7280'
}