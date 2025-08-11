'use client'

import React, { useState, useCallback } from 'react'
import { Sparkles, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface SOAPData {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

interface SOAPSuggestion {
  field: keyof SOAPData
  suggestion: string
  confidence: number
  reasoning?: string
}

interface SOAPAutoCompleteProps {
  patientId: string
  patientName?: string
  initialData?: Partial<SOAPData>
  onDataChange?: (data: Partial<SOAPData>) => void
  onSuggestionsApplied?: (suggestions: SOAPSuggestion[]) => void
}

export function SOAPAutoComplete({
  patientId,
  patientName,
  initialData = {},
  onDataChange,
  onSuggestionsApplied
}: SOAPAutoCompleteProps) {
  const { toast } = useToast()
  const [soapData, setSOAPData] = useState<Partial<SOAPData>>(initialData)
  const [suggestions, setSuggestions] = useState<SOAPSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<string>('')
  const [confidence, setConfidence] = useState<number>(0)
  const [processingTime, setProcessingTime] = useState<number>(0)

  const fieldLabels = {
    subjective: 'Subjetivo',
    objective: 'Objetivo', 
    assessment: 'Avaliação',
    plan: 'Plano'
  }

  const fieldPlaceholders = {
    subjective: 'O que o paciente relata sobre sua condição, sintomas, dor...',
    objective: 'Achados do exame físico, testes, observações objetivas...',
    assessment: 'Análise clínica, diagnóstico fisioterapêutico, interpretação...',
    plan: 'Plano de tratamento, exercícios, modalidades, orientações...'
  }

  const updateSOAPData = useCallback((field: keyof SOAPData, value: string) => {
    const newData = { ...soapData, [field]: value }
    setSOAPData(newData)
    if (onDataChange) {
      onDataChange(newData)
    }
  }, [soapData, onDataChange])

  const getSuggestions = async () => {
    setIsLoading(true)
    setSuggestions([])
    
    try {
      const response = await apiClient.post('/ai/soap/complete', {
        patient_id: patientId,
        subjective: soapData.subjective || '',
        objective: soapData.objective || '',
        assessment: soapData.assessment || '',
        plan: soapData.plan || ''
      })

      if (response.data.success) {
        const aiSuggestions = response.data.suggestions
        
        // Parse AI suggestions to structured format
        const parsedSuggestions: SOAPSuggestion[] = []
        
        // Try to extract suggestions for each SOAP field
        Object.keys(fieldLabels).forEach((field) => {
          const fieldKey = field as keyof SOAPData
          const currentValue = soapData[fieldKey] || ''
          
          // If field is empty or short, look for suggestions in AI response
          if (currentValue.length < 50) {
            const suggestion = extractFieldSuggestion(aiSuggestions, fieldKey)
            if (suggestion) {
              parsedSuggestions.push({
                field: fieldKey,
                suggestion: suggestion,
                confidence: response.data.confidence || 0.8,
                reasoning: `Baseado no contexto clínico do paciente`
              })
            }
          }
        })
        
        setSuggestions(parsedSuggestions)
        setProvider(response.data.provider)
        setConfidence(response.data.confidence)
        setProcessingTime(response.data.processing_time)
        
        if (parsedSuggestions.length === 0) {
          toast({
            title: "Nenhuma sugestão gerada",
            description: "Todos os campos SOAP parecem estar completos ou a IA não conseguiu gerar sugestões relevantes.",
            variant: "default"
          })
        }
      } else {
        throw new Error(response.data.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao obter sugestões:', error)
      toast({
        title: "Erro ao obter sugestões",
        description: "Não foi possível processar as sugestões de IA. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractFieldSuggestion = (aiResponse: string, field: keyof SOAPData): string | null => {
    // Simple parsing logic - in production, this could be more sophisticated
    const fieldPatterns = {
      subjective: /(?:subjetivo|queixa|relata|sintomas?)[\s\S]*?(?=objetivo|avaliação|plano|$)/i,
      objective: /(?:objetivo|exame|achados?)[\s\S]*?(?=avaliação|plano|subjetivo|$)/i,
      assessment: /(?:avaliação|análise|diagnóstico)[\s\S]*?(?=plano|subjetivo|objetivo|$)/i,
      plan: /(?:plano|tratamento|conduta)[\s\S]*?(?=subjetivo|objetivo|avaliação|$)/i
    }
    
    const pattern = fieldPatterns[field]
    const match = aiResponse.match(pattern)
    
    if (match) {
      return match[0].replace(new RegExp(`^(${Object.keys(fieldLabels).join('|')}):?\\s*`, 'i'), '').trim()
    }
    
    return null
  }

  const applySuggestion = (suggestion: SOAPSuggestion) => {
    updateSOAPData(suggestion.field, suggestion.suggestion)
    
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s !== suggestion))
    
    toast({
      title: "Sugestão aplicada",
      description: `Campo "${fieldLabels[suggestion.field]}" foi atualizado com a sugestão da IA.`,
    })
  }

  const applyAllSuggestions = () => {
    suggestions.forEach(suggestion => {
      updateSOAPData(suggestion.field, suggestion.suggestion)
    })
    
    setSuggestions([])
    
    if (onSuggestionsApplied) {
      onSuggestionsApplied(suggestions)
    }
    
    toast({
      title: "Todas as sugestões aplicadas",
      description: `${suggestions.length} sugestões foram aplicadas aos campos SOAP.`,
    })
  }

  const clearSuggestions = () => {
    setSuggestions([])
  }

  const getCompletionPercentage = () => {
    const fields = Object.keys(fieldLabels) as (keyof SOAPData)[]
    const filledFields = fields.filter(field => (soapData[field] || '').trim().length > 0)
    return (filledFields.length / fields.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header with patient info and AI controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Auto-completar SOAP com IA
              </CardTitle>
              {patientName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Paciente: {patientName}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round(getCompletionPercentage())}% Completo
                </div>
                <Progress value={getCompletionPercentage()} className="w-24 h-2" />
              </div>
              
              <Button 
                onClick={getSuggestions} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Obter Sugestões
              </Button>
            </div>
          </div>
          
          {provider && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{provider}</Badge>
              <span>Confiança: {Math.round(confidence * 100)}%</span>
              <span>Tempo: {processingTime.toFixed(1)}s</span>
            </div>
          )}
        </CardHeader>
        
        {suggestions.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">
                {suggestions.length} sugestão{suggestions.length !== 1 ? 'ões' : ''} disponível{suggestions.length !== 1 ? 'is' : ''}
              </h3>
              <div className="flex gap-2">
                <Button 
                  onClick={applyAllSuggestions} 
                  size="sm" 
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aplicar Todas
                </Button>
                <Button 
                  onClick={clearSuggestions} 
                  size="sm" 
                  variant="outline"
                >
                  Descartar
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-3 bg-purple-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {fieldLabels[suggestion.field]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Confiança: {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {suggestion.suggestion}
                      </p>
                      {suggestion.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.reasoning}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => applySuggestion(suggestion)}
                      size="sm"
                      variant="outline"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* SOAP Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(fieldLabels) as (keyof SOAPData)[]).map((field) => (
          <Card key={field}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {fieldLabels[field]}
                {(soapData[field] || '').trim().length > 0 && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-2 inline" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={fieldPlaceholders[field]}
                value={soapData[field] || ''}
                onChange={(e) => updateSOAPData(field, e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{(soapData[field] || '').length} caracteres</span>
                {(soapData[field] || '').trim().length === 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Campo vazio
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3 text-purple-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analisando dados do paciente e gerando sugestões...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}