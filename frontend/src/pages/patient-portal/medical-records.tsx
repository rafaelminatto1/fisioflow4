'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Calendar, Download, Eye, Search, Filter, Heart, Activity, Brain, Stethoscope } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PatientLayout from '@/components/patient/PatientLayout'
import { apiClient } from '@/lib/api'

interface MedicalRecord {
  id: string
  date: string
  therapist_name: string
  record_type: 'EVALUATION' | 'EVOLUTION' | 'DISCHARGE' | 'PRESCRIPTION'
  title: string
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  pain_scale?: number
  functional_status?: string
  goals_achieved?: string[]
  next_session_goals?: string[]
  can_download: boolean
}

interface Prescription {
  id: string
  date: string
  therapist_name: string
  type: 'EXERCISE' | 'MEDICATION' | 'LIFESTYLE'
  title: string
  description: string
  duration_weeks?: number
  frequency: string
  instructions: string[]
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  progress_percentage: number
}

interface TestResult {
  id: string
  date: string
  test_name: string
  test_type: 'IMAGING' | 'LAB' | 'FUNCTIONAL'
  result_summary: string
  status: 'PENDING' | 'COMPLETED' | 'REVIEWED'
  reference_values?: string
  observations?: string
  file_url?: string
  ordered_by: string
}

export default function PatientMedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [recordTypeFilter, setRecordTypeFilter] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)

  useEffect(() => {
    loadMedicalData()
  }, [])

  const loadMedicalData = async () => {
    try {
      const [recordsRes, prescriptionsRes, testsRes] = await Promise.all([
        apiClient.get('/patient-portal/medical-records'),
        apiClient.get('/patient-portal/prescriptions'),
        apiClient.get('/patient-portal/test-results')
      ])

      setMedicalRecords(recordsRes.data.records)
      setPrescriptions(prescriptionsRes.data.prescriptions)
      setTestResults(testsRes.data.test_results)
    } catch (error) {
      console.error('Erro ao carregar dados médicos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadRecord = async (recordId: string) => {
    try {
      const response = await apiClient.get(`/patient-portal/medical-records/${recordId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `prontuario-${recordId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao baixar registro:', error)
    }
  }

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'EVALUATION':
        return <Stethoscope className="h-4 w-4" />
      case 'EVOLUTION':
        return <Activity className="h-4 w-4" />
      case 'DISCHARGE':
        return <Heart className="h-4 w-4" />
      case 'PRESCRIPTION':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'EVALUATION':
        return 'bg-blue-100 text-blue-800'
      case 'EVOLUTION':
        return 'bg-green-100 text-green-800'
      case 'DISCHARGE':
        return 'bg-purple-100 text-purple-800'
      case 'PRESCRIPTION':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'EVALUATION':
        return 'Avaliação'
      case 'EVOLUTION':
        return 'Evolução'
      case 'DISCHARGE':
        return 'Alta'
      case 'PRESCRIPTION':
        return 'Prescrição'
      default:
        return type
    }
  }

  const getPrescriptionStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPrescriptionStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo'
      case 'COMPLETED':
        return 'Concluído'
      case 'CANCELLED':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'REVIEWED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTestStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente'
      case 'COMPLETED':
        return 'Concluído'
      case 'REVIEWED':
        return 'Revisado'
      default:
        return status
    }
  }

  const filteredRecords = medicalRecords.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.therapist_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = recordTypeFilter === 'all' || record.record_type === recordTypeFilter
    return matchesSearch && matchesType
  })

  if (isLoading) {
    return (
      <PatientLayout currentPage="medical-records">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando prontuário...</p>
          </div>
        </div>
      </PatientLayout>
    )
  }

  if (selectedRecord) {
    return (
      <PatientLayout currentPage="medical-records">
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedRecord(null)}
              >
                ← Voltar para o Prontuário
              </Button>
              <div className="flex gap-2">
                {selectedRecord.can_download && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadRecord(selectedRecord.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedRecord.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedRecord.date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span>Dr(a). {selectedRecord.therapist_name}</span>
                    </div>
                  </div>
                  <Badge className={getRecordTypeColor(selectedRecord.record_type)}>
                    {getRecordTypeLabel(selectedRecord.record_type)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* SOAP Format */}
                {selectedRecord.subjective && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">S</span>
                      </div>
                      Subjetivo
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.subjective}</p>
                    </div>
                  </div>
                )}

                {selectedRecord.objective && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">O</span>
                      </div>
                      Objetivo
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.objective}</p>
                    </div>
                  </div>
                )}

                {selectedRecord.assessment && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">A</span>
                      </div>
                      Avaliação
                    </h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.assessment}</p>
                    </div>
                  </div>
                )}

                {selectedRecord.plan && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">P</span>
                      </div>
                      Plano
                    </h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRecord.plan}</p>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(selectedRecord.pain_scale !== undefined || selectedRecord.functional_status) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRecord.pain_scale !== undefined && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Escala de Dor</h4>
                          <div className="text-2xl font-bold text-red-600">
                            {selectedRecord.pain_scale}/10
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedRecord.functional_status && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Status Funcional</h4>
                          <p className="text-gray-700">{selectedRecord.functional_status}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Goals */}
                {selectedRecord.goals_achieved && selectedRecord.goals_achieved.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Objetivos Alcançados</h4>
                    <ul className="space-y-2">
                      {selectedRecord.goals_achieved.map((goal, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          </div>
                          <span className="text-gray-700">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecord.next_session_goals && selectedRecord.next_session_goals.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Objetivos para Próxima Sessão</h4>
                    <ul className="space-y-2">
                      {selectedRecord.next_session_goals.map((goal, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                          <span className="text-gray-700">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PatientLayout>
    )
  }

  return (
    <PatientLayout currentPage="medical-records">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meu Prontuário</h1>
              <p className="text-gray-600">Acompanhe seu histórico médico e prescrições</p>
            </div>
          </div>

          <Tabs defaultValue="records" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="records">Registros ({medicalRecords.length})</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescrições ({prescriptions.length})</TabsTrigger>
              <TabsTrigger value="tests">Exames ({testResults.length})</TabsTrigger>
            </TabsList>

            {/* Medical Records */}
            <TabsContent value="records" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar registros..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="EVALUATION">Avaliação</SelectItem>
                    <SelectItem value="EVOLUTION">Evolução</SelectItem>
                    <SelectItem value="DISCHARGE">Alta</SelectItem>
                    <SelectItem value="PRESCRIPTION">Prescrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredRecords.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
                    <p className="text-gray-600">Seus registros médicos aparecerão aqui após as consultas.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getRecordTypeIcon(record.record_type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{record.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Dr(a). {record.therapist_name} • {new Date(record.date).toLocaleDateString('pt-BR')}
                              </p>
                              {record.assessment && (
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                  {record.assessment.substring(0, 150)}...
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Badge className={getRecordTypeColor(record.record_type)} variant="secondary">
                              {getRecordTypeLabel(record.record_type)}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {record.can_download && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadRecord(record.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Prescriptions */}
            <TabsContent value="prescriptions" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {prescriptions.map((prescription) => (
                  <Card key={prescription.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{prescription.title}</CardTitle>
                          <p className="text-sm text-gray-600">
                            Dr(a). {prescription.therapist_name} • {new Date(prescription.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge className={getPrescriptionStatusColor(prescription.status)} variant="secondary">
                          {getPrescriptionStatusLabel(prescription.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700">{prescription.description}</p>
                      
                      <div className="text-sm">
                        <strong>Frequência:</strong> {prescription.frequency}
                        {prescription.duration_weeks && (
                          <span> • <strong>Duração:</strong> {prescription.duration_weeks} semanas</span>
                        )}
                      </div>

                      {prescription.instructions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Instruções:</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {prescription.instructions.map((instruction, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                {instruction}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {prescription.status === 'ACTIVE' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>{Math.round(prescription.progress_percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${prescription.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Test Results */}
            <TabsContent value="tests" className="space-y-4">
              <div className="space-y-3">
                {testResults.map((test) => (
                  <Card key={test.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">{test.test_name}</h3>
                            <Badge className={getTestStatusColor(test.status)} variant="secondary">
                              {getTestStatusLabel(test.status)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            Solicitado por: {test.ordered_by} • {new Date(test.date).toLocaleDateString('pt-BR')}
                          </p>
                          
                          <p className="text-sm text-gray-700">{test.result_summary}</p>
                          
                          {test.reference_values && (
                            <p className="text-xs text-gray-500 mt-2">
                              <strong>Valores de referência:</strong> {test.reference_values}
                            </p>
                          )}
                          
                          {test.observations && (
                            <p className="text-xs text-gray-600 mt-1">
                              <strong>Observações:</strong> {test.observations}
                            </p>
                          )}
                        </div>
                        
                        {test.file_url && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        )}
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