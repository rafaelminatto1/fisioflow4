'use client'

import React, { useState, useCallback } from 'react'
import { Dumbbell, Loader2, Target, Clock, RotateCcw, CheckCircle2, AlertTriangle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface ExerciseSuggestion {
  id: string
  name: string
  description: string
  muscle_groups: string[]
  difficulty_level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'
  duration_minutes: number
  repetitions?: number
  sets?: number
  equipment_needed: string[]
  contraindications: string[]
  benefits: string[]
  instructions: string[]
  modifications: string[]
  confidence: number
  relevance_score: number
  reasoning: string
}

interface PatientCondition {
  condition: string
  severity: 'LEVE' | 'MODERADA' | 'SEVERA'
  affected_areas: string[]
  limitations: string[]
}

interface ExerciseSuggesterProps {
  patientId: string
  patientName?: string
  currentConditions?: PatientCondition[]
  onExerciseSelected?: (exercise: ExerciseSuggestion) => void
  onSuggestionsApplied?: (exercises: ExerciseSuggestion[]) => void
}

export function ExerciseSuggester({
  patientId,
  patientName,
  currentConditions = [],
  onExerciseSelected,
  onSuggestionsApplied
}: ExerciseSuggesterProps) {
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([])
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<string>('')
  const [processingTime, setProcessingTime] = useState<number>(0)
  
  // Form fields for custom request
  const [customGoals, setCustomGoals] = useState('')
  const [sessionDuration, setSessionDuration] = useState(30)
  const [difficultyLevel, setDifficultyLevel] = useState<'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'>('INTERMEDIARIO')
  const [availableEquipment, setAvailableEquipment] = useState('')
  const [specificLimitations, setSpecificLimitations] = useState('')

  const difficultyColors = {
    INICIANTE: 'bg-green-100 text-green-800',
    INTERMEDIARIO: 'bg-yellow-100 text-yellow-800',
    AVANCADO: 'bg-red-100 text-red-800'
  }

  const difficultyLabels = {
    INICIANTE: 'Iniciante',
    INTERMEDIARIO: 'Intermediário',
    AVANCADO: 'Avançado'
  }

  const getSuggestions = async () => {
    setIsLoading(true)
    setSuggestions([])
    setSelectedExercises(new Set())
    
    try {
      const response = await apiClient.post('/ai/exercises/suggest', {
        patient_id: patientId,
        conditions: currentConditions,
        goals: customGoals || 'Melhora da condição geral e alívio de sintomas',
        session_duration: sessionDuration,
        difficulty_level: difficultyLevel,
        available_equipment: availableEquipment.split(',').map(eq => eq.trim()).filter(eq => eq),
        limitations: specificLimitations || '',
        max_suggestions: 8
      })

      if (response.data.success) {
        setSuggestions(response.data.exercises)
        setProvider(response.data.provider)
        setProcessingTime(response.data.processing_time)
        
        if (response.data.exercises.length === 0) {
          toast({
            title: "Nenhuma sugestão gerada",
            description: "Não foi possível gerar exercícios relevantes para este paciente. Tente ajustar os parâmetros.",
            variant: "default"
          })
        } else {
          toast({
            title: "Sugestões geradas com sucesso",
            description: `${response.data.exercises.length} exercícios sugeridos baseados no perfil do paciente.`,
          })
        }
      } else {
        throw new Error(response.data.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao obter sugestões de exercícios:', error)
      toast({
        title: "Erro ao gerar sugestões",
        description: "Não foi possível processar as sugestões de exercícios. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExerciseSelection = (exerciseId: string) => {
    const newSelection = new Set(selectedExercises)
    if (newSelection.has(exerciseId)) {
      newSelection.delete(exerciseId)
    } else {
      newSelection.add(exerciseId)
    }
    setSelectedExercises(newSelection)
  }

  const selectExercise = (exercise: ExerciseSuggestion) => {
    if (onExerciseSelected) {
      onExerciseSelected(exercise)
    }
    
    toast({
      title: "Exercício selecionado",
      description: `"${exercise.name}" foi adicionado ao plano do paciente.`,
    })
  }

  const applySelectedExercises = () => {
    const selected = suggestions.filter(ex => selectedExercises.has(ex.id))
    
    if (selected.length === 0) {
      toast({
        title: "Nenhum exercício selecionado",
        description: "Selecione pelo menos um exercício para aplicar.",
        variant: "default"
      })
      return
    }

    if (onSuggestionsApplied) {
      onSuggestionsApplied(selected)
    }
    
    setSelectedExercises(new Set())
    
    toast({
      title: "Exercícios aplicados",
      description: `${selected.length} exercício${selected.length !== 1 ? 's' : ''} foram adicionado${selected.length !== 1 ? 's' : ''} ao plano.`,
    })
  }

  const selectAllExercises = () => {
    if (selectedExercises.size === suggestions.length) {
      setSelectedExercises(new Set())
    } else {
      setSelectedExercises(new Set(suggestions.map(ex => ex.id)))
    }
  }

  const getAverageConfidence = () => {
    if (suggestions.length === 0) return 0
    return suggestions.reduce((sum, ex) => sum + ex.confidence, 0) / suggestions.length
  }

  return (
    <div className="space-y-6">
      {/* Header with patient info and controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-blue-600" />
                Sugestão de Exercícios com IA
              </CardTitle>
              {patientName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Paciente: {patientName}
                </p>
              )}
            </div>
            
            <Button 
              onClick={getSuggestions} 
              disabled={isLoading}
              variant="default"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Gerar Sugestões
            </Button>
          </div>
          
          {provider && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{provider}</Badge>
              <span>Confiança Média: {Math.round(getAverageConfidence() * 100)}%</span>
              <span>Tempo: {processingTime.toFixed(1)}s</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goals">Objetivos do Tratamento</Label>
              <Textarea
                id="goals"
                placeholder="Ex: Fortalecimento de core, melhora da flexibilidade..."
                value={customGoals}
                onChange={(e) => setCustomGoals(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração da Sessão (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="120"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Nível de Dificuldade</Label>
                <select
                  id="difficulty"
                  className="w-full p-2 border rounded-md"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value as any)}
                >
                  <option value="INICIANTE">Iniciante</option>
                  <option value="INTERMEDIARIO">Intermediário</option>
                  <option value="AVANCADO">Avançado</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamentos Disponíveis</Label>
              <Input
                id="equipment"
                placeholder="Ex: halteres, bola suíça, theraband..."
                value={availableEquipment}
                onChange={(e) => setAvailableEquipment(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separe por vírgulas</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limitations">Limitações Específicas</Label>
              <Textarea
                id="limitations"
                placeholder="Ex: dor ao flexionar joelho, limitação de amplitude..."
                value={specificLimitations}
                onChange={(e) => setSpecificLimitations(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Current Conditions Display */}
          {currentConditions.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Condições Atuais:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentConditions.map((condition, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {condition.condition} ({condition.severity})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {suggestions.length} Exercício{suggestions.length !== 1 ? 's' : ''} Sugerido{suggestions.length !== 1 ? 's' : ''}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={selectAllExercises}
                  variant="outline"
                  size="sm"
                >
                  {selectedExercises.size === suggestions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
                <Button
                  onClick={applySelectedExercises}
                  disabled={selectedExercises.size === 0}
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aplicar Selecionados ({selectedExercises.size})
                </Button>
              </div>
            </div>
          </CardContent>

          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestions.map((exercise) => (
                <Card key={exercise.id} className={`border-l-4 ${selectedExercises.has(exercise.id) ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-base">{exercise.name}</h3>
                          <Badge className={difficultyColors[exercise.difficulty_level]}>
                            {difficultyLabels[exercise.difficulty_level]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exercise.duration_minutes}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {Math.round(exercise.confidence * 100)}%
                          </span>
                          {exercise.repetitions && (
                            <span>{exercise.repetitions} rep</span>
                          )}
                          {exercise.sets && (
                            <span>{exercise.sets} séries</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExerciseSelection(exercise.id)}
                        >
                          {selectedExercises.has(exercise.id) ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-gray-700">{exercise.description}</p>
                    
                    {/* Muscle Groups */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Grupos Musculares:</p>
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscle_groups.map((group, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Equipment */}
                    {exercise.equipment_needed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Equipamentos:</p>
                        <div className="flex flex-wrap gap-1">
                          {exercise.equipment_needed.map((equipment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {equipment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefits */}
                    {exercise.benefits.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Benefícios:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {exercise.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Contraindications */}
                    {exercise.contraindications.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Contraindicações:
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {exercise.contraindications.slice(0, 2).map((contra, index) => (
                            <li key={index}>• {contra}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Reasoning */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-800 mb-1">Recomendação da IA:</p>
                      <p className="text-xs text-purple-700">{exercise.reasoning}</p>
                    </div>

                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Relevância:</span>
                        <Progress value={exercise.relevance_score * 100} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">{Math.round(exercise.relevance_score * 100)}%</span>
                      </div>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => selectExercise(exercise)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3 text-blue-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analisando perfil do paciente e gerando exercícios personalizados...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}