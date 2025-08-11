'use client'

import React, { useState, useCallback } from 'react'
import { Brain, Loader2, Stethoscope, AlertTriangle, CheckCircle2, FileText, Lightbulb, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'

interface DiagnosisHypothesis {
  condition: string
  confidence: number
  icd_code?: string
  category: 'MUSCULOESQUELETICA' | 'NEUROLOGICA' | 'CARDIOVASCULAR' | 'RESPIRATORIA' | 'OUTRAS'
  severity: 'LEVE' | 'MODERADA' | 'SEVERA'
  likelihood_score: number
  supporting_evidence: string[]
  contradictory_evidence: string[]
  differential_diagnosis: string[]
  recommended_tests: string[]
  red_flags: string[]
  clinical_reasoning: string
  treatment_priorities: string[]
}

interface ClinicalRecommendation {
  category: 'ASSESSMENT' | 'INTERVENTION' | 'MONITORING' | 'REFERRAL'
  priority: 'ALTA' | 'MEDIA' | 'BAIXA'
  recommendation: string
  rationale: string
  timeframe: string
  evidence_level: 'A' | 'B' | 'C' | 'D'
}

interface DiagnosisAnalysis {
  primary_hypotheses: DiagnosisHypothesis[]
  differential_diagnoses: DiagnosisHypothesis[]
  clinical_recommendations: ClinicalRecommendation[]
  risk_factors: string[]
  prognosis_indicators: string[]
  treatment_goals: string[]
  follow_up_schedule: string[]
  confidence_score: number
  analysis_summary: string
}

interface DiagnosisSupportProps {
  patientId: string
  patientName?: string
  patientAge?: number
  patientGender?: string
  onDiagnosisSelected?: (hypothesis: DiagnosisHypothesis) => void
  onRecommendationsApplied?: (recommendations: ClinicalRecommendation[]) => void
}

export function DiagnosisSupport({
  patientId,
  patientName,
  patientAge,
  patientGender,
  onDiagnosisSelected,
  onRecommendationsApplied
}: DiagnosisSupportProps) {
  const { toast } = useToast()
  const [analysis, setAnalysis] = useState<DiagnosisAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<string>('')
  const [processingTime, setProcessingTime] = useState<number>(0)
  
  // Input fields
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [currentSymptoms, setCurrentSymptoms] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [physicalFindings, setPhysicalFindings] = useState('')
  const [functionalLimitations, setFunctionalLimitations] = useState('')
  const [previousTreatments, setPreviousTreatments] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')

  const categoryColors = {
    MUSCULOESQUELETICA: 'bg-blue-100 text-blue-800',
    NEUROLOGICA: 'bg-purple-100 text-purple-800',
    CARDIOVASCULAR: 'bg-red-100 text-red-800',
    RESPIRATORIA: 'bg-green-100 text-green-800',
    OUTRAS: 'bg-gray-100 text-gray-800'
  }

  const categoryLabels = {
    MUSCULOESQUELETICA: 'Musculoesquelética',
    NEUROLOGICA: 'Neurológica',
    CARDIOVASCULAR: 'Cardiovascular',
    RESPIRATORIA: 'Respiratória',
    OUTRAS: 'Outras'
  }

  const priorityColors = {
    ALTA: 'bg-red-100 text-red-800 border-red-300',
    MEDIA: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    BAIXA: 'bg-green-100 text-green-800 border-green-300'
  }

  const severityColors = {
    LEVE: 'bg-green-100 text-green-800',
    MODERADA: 'bg-yellow-100 text-yellow-800',
    SEVERA: 'bg-red-100 text-red-800'
  }

  const evidenceLevels = {
    A: 'Evidência forte',
    B: 'Evidência moderada', 
    C: 'Evidência limitada',
    D: 'Opinião de especialista'
  }

  const analyzeCase = async () => {
    if (!chiefComplaint.trim() || !currentSymptoms.trim()) {
      toast({
        title: "Dados insuficientes",
        description: "Preencha pelo menos a queixa principal e sintomas atuais.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setAnalysis(null)
    
    try {
      const response = await apiClient.post('/ai/diagnosis/support', {
        patient_id: patientId,
        patient_demographics: {
          age: patientAge,
          gender: patientGender
        },
        clinical_data: {
          chief_complaint: chiefComplaint,
          current_symptoms: currentSymptoms,
          medical_history: medicalHistory,
          physical_findings: physicalFindings,
          functional_limitations: functionalLimitations,
          previous_treatments: previousTreatments,
          current_medications: currentMedications
        },
        analysis_depth: 'comprehensive',
        include_differential: true,
        max_hypotheses: 5
      })

      if (response.data.success) {
        setAnalysis(response.data.analysis)
        setProvider(response.data.provider)
        setProcessingTime(response.data.processing_time)
        
        toast({
          title: "Análise concluída",
          description: `Geradas ${response.data.analysis.primary_hypotheses.length} hipóteses diagnósticas principais.`,
        })
      } else {
        throw new Error(response.data.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao analisar caso:', error)
      toast({
        title: "Erro na análise",
        description: "Não foi possível processar a análise diagnóstica. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectHypothesis = (hypothesis: DiagnosisHypothesis) => {
    if (onDiagnosisSelected) {
      onDiagnosisSelected(hypothesis)
    }
    
    toast({
      title: "Hipótese selecionada",
      description: `"${hypothesis.condition}" foi adicionada ao diagnóstico do paciente.`,
    })
  }

  const applyRecommendations = (recommendations: ClinicalRecommendation[]) => {
    if (onRecommendationsApplied) {
      onRecommendationsApplied(recommendations)
    }
    
    toast({
      title: "Recomendações aplicadas",
      description: `${recommendations.length} recomendação${recommendations.length !== 1 ? 'ões' : ''} foram adicionadas ao plano.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                Apoio ao Diagnóstico com IA
              </CardTitle>
              {patientName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Paciente: {patientName}
                  {patientAge && ` • ${patientAge} anos`}
                  {patientGender && ` • ${patientGender}`}
                </p>
              )}
            </div>
            
            <Button 
              onClick={analyzeCase} 
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Stethoscope className="h-4 w-4 mr-2" />
              )}
              Analisar Caso
            </Button>
          </div>
          
          {provider && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{provider}</Badge>
              <span>Confiança: {Math.round((analysis?.confidence_score || 0) * 100)}%</span>
              <span>Tempo: {processingTime.toFixed(1)}s</span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Clinical Data Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-4 md:space-y-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="complaint">Queixa Principal *</Label>
                <Textarea
                  id="complaint"
                  placeholder="Ex: Dor lombar há 3 semanas..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="symptoms">Sintomas Atuais *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Ex: Dor irradiando para perna direita, formigamento..."
                  value={currentSymptoms}
                  onChange={(e) => setCurrentSymptoms(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="history">História Clínica</Label>
                <Textarea
                  id="history"
                  placeholder="Ex: Episódios anteriores, cirurgias, traumas..."
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="physical">Achados Físicos</Label>
                <Textarea
                  id="physical"
                  placeholder="Ex: Limitação de flexão, teste de Lasègue positivo..."
                  value={physicalFindings}
                  onChange={(e) => setPhysicalFindings(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="limitations">Limitações Funcionais</Label>
                <Textarea
                  id="limitations"
                  placeholder="Ex: Dificuldade para caminhar, sentar por muito tempo..."
                  value={functionalLimitations}
                  onChange={(e) => setFunctionalLimitations(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="treatments">Tratamentos Anteriores</Label>
                <Input
                  id="treatments"
                  placeholder="Ex: Fisioterapia, medicamentos..."
                  value={previousTreatments}
                  onChange={(e) => setPreviousTreatments(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="medications">Medicações Atuais</Label>
                <Input
                  id="medications"
                  placeholder="Ex: Ibuprofeno 600mg, relaxante muscular..."
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Tabs defaultValue="hypotheses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hypotheses">Hipóteses</TabsTrigger>
            <TabsTrigger value="differential">Diagnóstico Diferencial</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

          {/* Primary Hypotheses */}
          <TabsContent value="hypotheses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Hipóteses Diagnósticas Principais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.primary_hypotheses.map((hypothesis, index) => (
                  <Card key={index} className="border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{hypothesis.condition}</h3>
                            {hypothesis.icd_code && (
                              <Badge variant="outline" className="text-xs">
                                {hypothesis.icd_code}
                              </Badge>
                            )}
                            <Badge className={categoryColors[hypothesis.category]}>
                              {categoryLabels[hypothesis.category]}
                            </Badge>
                            <Badge className={severityColors[hypothesis.severity]}>
                              {hypothesis.severity}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Confiança:</span>
                              <Progress value={hypothesis.confidence * 100} className="w-20 h-2" />
                              <span className="text-sm font-medium">{Math.round(hypothesis.confidence * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Probabilidade:</span>
                              <Progress value={hypothesis.likelihood_score * 100} className="w-20 h-2" />
                              <span className="text-sm font-medium">{Math.round(hypothesis.likelihood_score * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectHypothesis(hypothesis)}
                        >
                          Selecionar
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-indigo-800 mb-1">Raciocínio Clínico:</p>
                        <p className="text-sm text-indigo-700">{hypothesis.clinical_reasoning}</p>
                      </div>

                      {/* Supporting Evidence */}
                      {hypothesis.supporting_evidence.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Evidências Favoráveis:
                          </p>
                          <ul className="text-sm space-y-1 text-green-600">
                            {hypothesis.supporting_evidence.map((evidence, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {evidence}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Red Flags */}
                      {hypothesis.red_flags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Sinais de Alerta:
                          </p>
                          <ul className="text-sm space-y-1 text-red-600">
                            {hypothesis.red_flags.map((flag, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Tests */}
                      {hypothesis.recommended_tests.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            Exames Recomendados:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {hypothesis.recommended_tests.map((test, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {test}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Treatment Priorities */}
                      {hypothesis.treatment_priorities.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Prioridades de Tratamento:</p>
                          <ul className="text-sm space-y-1">
                            {hypothesis.treatment_priorities.map((priority, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-xs bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                {priority}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Differential Diagnosis */}
          <TabsContent value="differential" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico Diferencial</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Outras condições a serem consideradas na avaliação
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.differential_diagnoses.map((diff, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{diff.condition}</h4>
                        <Badge className={categoryColors[diff.category]} variant="secondary">
                          {categoryLabels[diff.category]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{diff.clinical_reasoning}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.round(diff.confidence * 100)}%</div>
                      <Progress value={diff.confidence * 100} className="w-16 h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinical Recommendations */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recomendações Clínicas</CardTitle>
                  <Button
                    onClick={() => applyRecommendations(analysis.clinical_recommendations)}
                    size="sm"
                  >
                    Aplicar Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.clinical_recommendations.map((rec, index) => (
                  <Card key={index} className={`border-l-4 ${priorityColors[rec.priority].includes('red') ? 'border-l-red-500' : priorityColors[rec.priority].includes('yellow') ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColors[rec.priority]}>
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline">
                            {rec.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Nível {rec.evidence_level}: {evidenceLevels[rec.evidence_level]}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{rec.timeframe}</span>
                      </div>
                      
                      <h4 className="font-medium mb-2">{rec.recommendation}</h4>
                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Resumo da Análise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{analysis.analysis_summary}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Fatores de Risco:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.risk_factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Indicadores Prognósticos:</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.prognosis_indicators.map((indicator, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Objetivos do Tratamento:</h4>
                  <ul className="text-sm space-y-1">
                    {analysis.treatment_goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Cronograma de Acompanhamento:</h4>
                  <ul className="text-sm space-y-1">
                    {analysis.follow_up_schedule.map((schedule, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-xs bg-gray-100 text-gray-800 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {schedule}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3 text-indigo-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Analisando dados clínicos e gerando hipóteses diagnósticas...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}