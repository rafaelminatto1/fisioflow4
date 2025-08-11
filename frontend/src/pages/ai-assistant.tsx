'use client'

import React, { useState } from 'react'
import { Bot, MessageSquare, Dumbbell, Stethoscope, FileText, Brain, BarChart3, Settings, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { AIChat } from '@/components/ai/AIChat'
import { SOAPAutoComplete } from '@/components/ai/SOAPAutoComplete'
import { ExerciseSuggester } from '@/components/ai/ExerciseSuggester'
import { DiagnosisSupport } from '@/components/ai/DiagnosisSupport'
import Layout from '@/components/Layout'

interface QuickActionProps {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  onClick: () => void
  disabled?: boolean
}

function QuickAction({ icon, title, description, badge, onClick, disabled = false }: QuickActionProps) {
  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`}>
      <CardContent className="p-4" onClick={disabled ? undefined : onClick}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface AIStatsProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: string
  color?: string
}

function AIStats({ icon, label, value, trend, color = "text-blue-600" }: AIStatsProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold">{value}</span>
          {trend && (
            <span className="text-xs text-green-600">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string
    name: string
    age?: number
    gender?: string
  } | null>(null)

  const quickActions = [
    {
      icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
      title: "Chat com IA",
      description: "Converse com o assistente sobre casos clínicos, dúvidas e orientações",
      badge: "Ativo",
      onClick: () => setActiveTab('chat')
    },
    {
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      title: "Auto-completar SOAP",
      description: "Complete registros médicos automaticamente com base no contexto",
      badge: "Beta",
      onClick: () => setActiveTab('soap')
    },
    {
      icon: <Dumbbell className="h-5 w-5 text-green-600" />,
      title: "Sugerir Exercícios",
      description: "Gere exercícios personalizados baseados na condição do paciente",
      badge: "Novo",
      onClick: () => setActiveTab('exercises')
    },
    {
      icon: <Stethoscope className="h-5 w-5 text-indigo-600" />,
      title: "Apoio ao Diagnóstico",
      description: "Análise de casos e sugestões de hipóteses diagnósticas",
      badge: "Pro",
      onClick: () => setActiveTab('diagnosis')
    }
  ]

  const aiStats = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Consultas IA Hoje",
      value: "47",
      trend: "+12%",
      color: "text-blue-600"
    },
    {
      icon: <Brain className="h-4 w-4" />,
      label: "Confiança Média",
      value: "94%",
      trend: "+2%",
      color: "text-purple-600"
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Tempo Médio",
      value: "2.1s",
      trend: "-0.3s",
      color: "text-green-600"
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Economia de Tempo",
      value: "3.2h",
      trend: "+45min",
      color: "text-orange-600"
    }
  ]

  const recentActivities = [
    {
      type: 'SOAP',
      description: 'Auto-completou evolução para João Silva',
      time: '2 min atrás',
      confidence: 95
    },
    {
      type: 'Exercícios',
      description: 'Sugeriu 6 exercícios para Maria Santos',
      time: '8 min atrás',
      confidence: 88
    },
    {
      type: 'Diagnóstico',
      description: 'Analisou caso de lombalgia aguda',
      time: '15 min atrás',
      confidence: 92
    },
    {
      type: 'Chat',
      description: 'Respondeu dúvida sobre protocolo AVE',
      time: '23 min atrás',
      confidence: 97
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              Assistente de IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Potencialize seu trabalho com inteligência artificial especializada em fisioterapia
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Configurações
            </Button>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Sistema Online
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="chat">Chat IA</TabsTrigger>
            <TabsTrigger value="soap">SOAP</TabsTrigger>
            <TabsTrigger value="exercises">Exercícios</TabsTrigger>
            <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Bot className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-blue-900">
                      Bem-vindo, {user?.full_name || 'Doutor'}!
                    </h2>
                    <p className="text-blue-700">
                      Seu assistente de IA está pronto para ajudar com análises clínicas, 
                      sugestões de tratamento e automação de tarefas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiStats.map((stat, index) => (
                <AIStats
                  key={index}
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                  trend={stat.trend}
                  color={stat.color}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Acesse rapidamente as principais funcionalidades de IA
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <QuickAction
                      key={index}
                      icon={action.icon}
                      title={action.title}
                      description={action.description}
                      badge={action.badge}
                      onClick={action.onClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {activity.time}
                            </span>
                          </div>
                          <p className="text-sm">{activity.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Confiança</div>
                          <div className="text-sm font-medium">{activity.confidence}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dicas da IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">💡 Dica de Produtividade</p>
                      <p className="text-xs text-blue-700">
                        Use o chat da IA para tirar dúvidas rápidas sobre protocolos clínicos 
                        enquanto atende pacientes.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">🎯 Melhore a Precisão</p>
                      <p className="text-xs text-green-700">
                        Forneça mais detalhes sobre sintomas e limitações para obter 
                        sugestões de exercícios mais precisas.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 mb-1">🔍 Análise Completa</p>
                      <p className="text-xs text-purple-700">
                        O apoio ao diagnóstico funciona melhor com informações completas 
                        sobre histórico e exame físico.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat IA Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat com Assistente de IA
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Converse com seu assistente especializado em fisioterapia
                </p>
              </CardHeader>
              <CardContent>
                <AIChat
                  context={{
                    user_role: user?.role,
                    clinic_specialty: 'fisioterapia',
                    current_date: new Date().toISOString()
                  }}
                  placeholder="Pergunte sobre protocolos, tratamentos, exercícios ou tire dúvidas clínicas..."
                  maxHeight="500px"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SOAP Tab */}
          <TabsContent value="soap">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Auto-completar SOAP
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete registros médicos automaticamente com IA
                </p>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <SOAPAutoComplete
                    patientId={selectedPatient.id}
                    patientName={selectedPatient.name}
                    onDataChange={(data) => console.log('SOAP updated:', data)}
                    onSuggestionsApplied={(suggestions) => {
                      console.log('Applied suggestions:', suggestions)
                      // Here you would typically save to the medical record
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Selecione um Paciente</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para usar o auto-completar SOAP, primeiro selecione um paciente
                    </p>
                    <Button
                      onClick={() => {
                        // Mock patient selection - in real app, this would open a patient selector
                        setSelectedPatient({
                          id: 'mock-patient-1',
                          name: 'João Silva',
                          age: 45,
                          gender: 'Masculino'
                        })
                      }}
                    >
                      Selecionar Paciente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Sugestão de Exercícios
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gere exercícios personalizados com base na condição do paciente
                </p>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <ExerciseSuggester
                    patientId={selectedPatient.id}
                    patientName={selectedPatient.name}
                    currentConditions={[
                      {
                        condition: 'Lombalgia crônica',
                        severity: 'MODERADA',
                        affected_areas: ['coluna lombar', 'músculos paravertebrais'],
                        limitations: ['flexão limitada', 'dor ao sentar']
                      }
                    ]}
                    onExerciseSelected={(exercise) => {
                      console.log('Selected exercise:', exercise)
                      // Here you would typically add to patient's exercise plan
                    }}
                    onSuggestionsApplied={(exercises) => {
                      console.log('Applied exercises:', exercises)
                      // Here you would typically save to patient's treatment plan
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Selecione um Paciente</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para sugerir exercícios personalizados, primeiro selecione um paciente
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedPatient({
                          id: 'mock-patient-1',
                          name: 'João Silva',
                          age: 45,
                          gender: 'Masculino'
                        })
                      }}
                    >
                      Selecionar Paciente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Apoio ao Diagnóstico
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Análise de casos clínicos e sugestões de hipóteses diagnósticas
                </p>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <DiagnosisSupport
                    patientId={selectedPatient.id}
                    patientName={selectedPatient.name}
                    patientAge={selectedPatient.age}
                    patientGender={selectedPatient.gender}
                    onDiagnosisSelected={(hypothesis) => {
                      console.log('Selected diagnosis:', hypothesis)
                      // Here you would typically add to patient's medical record
                    }}
                    onRecommendationsApplied={(recommendations) => {
                      console.log('Applied recommendations:', recommendations)
                      // Here you would typically create tasks or treatment plan items
                    }}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Selecione um Paciente</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para análise diagnóstica, primeiro selecione um paciente
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedPatient({
                          id: 'mock-patient-1',
                          name: 'João Silva',
                          age: 45,
                          gender: 'Masculino'
                        })
                      }}
                    >
                      Selecionar Paciente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}