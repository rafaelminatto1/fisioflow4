'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Plus, Filter, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PatientLayout from '@/components/patient/PatientLayout'
import { apiClient } from '@/lib/api'

interface Appointment {
  id: string
  date: string
  time: string
  therapist_name: string
  therapist_specialty: string
  appointment_type: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'
  location: string
  duration_minutes: number
  notes?: string
  can_reschedule: boolean
  can_cancel: boolean
}

interface AvailableSlot {
  date: string
  time: string
  therapist_id: string
  therapist_name: string
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showBookingForm, setShowBookingForm] = useState(false)

  useEffect(() => {
    loadAppointments()
    loadAvailableSlots()
  }, [])

  const loadAppointments = async () => {
    try {
      const response = await apiClient.get('/patient-portal/appointments')
      setAppointments(response.data.appointments)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    }
  }

  const loadAvailableSlots = async () => {
    try {
      const response = await apiClient.get('/patient-portal/available-slots')
      setAvailableSlots(response.data.slots)
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
      case 'CONCLUIDO':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'CANCELADO':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'AGENDADO':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-blue-100 text-blue-800'
      case 'CONCLUIDO':
        return 'bg-green-100 text-green-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      case 'AGENDADO':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'Agendado'
      case 'CONFIRMADO':
        return 'Confirmado'
      case 'CONCLUIDO':
        return 'Concluído'
      case 'CANCELADO':
        return 'Cancelado'
      default:
        return status
    }
  }

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await apiClient.post(`/patient-portal/appointments/${appointmentId}/confirm`)
      await loadAppointments()
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await apiClient.post(`/patient-portal/appointments/${appointmentId}/cancel`)
      await loadAppointments()
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
    }
  }

  const handleBookAppointment = async (slot: AvailableSlot, appointmentType: string) => {
    try {
      await apiClient.post('/patient-portal/appointments', {
        date: slot.date,
        time: slot.time,
        therapist_id: slot.therapist_id,
        appointment_type: appointmentType
      })
      await loadAppointments()
      await loadAvailableSlots()
      setShowBookingForm(false)
    } catch (error) {
      console.error('Erro ao agendar consulta:', error)
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.therapist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.appointment_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const upcomingAppointments = filteredAppointments.filter(apt => 
    new Date(apt.date) >= new Date() && apt.status !== 'CANCELADO'
  )

  const pastAppointments = filteredAppointments.filter(apt => 
    new Date(apt.date) < new Date() || apt.status === 'CANCELADO' || apt.status === 'CONCLUIDO'
  )

  if (isLoading) {
    return (
      <PatientLayout currentPage="appointments">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando agendamentos...</p>
          </div>
        </div>
      </PatientLayout>
    )
  }

  return (
    <PatientLayout currentPage="appointments">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Agendamentos</h1>
              <p className="text-gray-600">Gerencie suas consultas e agendamentos</p>
            </div>
            <Button onClick={() => setShowBookingForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Consulta
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por terapeuta ou tipo de consulta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">
                Próximas Consultas ({upcomingAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Histórico ({pastAppointments.length})
              </TabsTrigger>
              {showBookingForm && (
                <TabsTrigger value="book">
                  Agendar Nova
                </TabsTrigger>
              )}
            </TabsList>

            {/* Upcoming Appointments */}
            <TabsContent value="upcoming" className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhuma consulta agendada</h3>
                    <p className="text-gray-600 mb-4">Você não possui consultas futuras agendadas.</p>
                    <Button onClick={() => setShowBookingForm(true)}>
                      Agendar Primeira Consulta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {upcomingAppointments.map((appointment) => (
                    <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{appointment.appointment_type}</CardTitle>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {appointment.therapist_name} • {appointment.therapist_specialty}
                            </p>
                          </div>
                          <Badge className={getStatusColor(appointment.status)} variant="secondary">
                            {getStatusLabel(appointment.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {new Date(appointment.date).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {appointment.time} ({appointment.duration_minutes} min)
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          📍 {appointment.location}
                        </div>

                        {appointment.notes && (
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            <strong>Observações:</strong> {appointment.notes}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {appointment.status === 'AGENDADO' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConfirmAppointment(appointment.id)}
                            >
                              Confirmar
                            </Button>
                          )}
                          {appointment.can_reschedule && (
                            <Button size="sm" variant="outline">
                              Remarcar
                            </Button>
                          )}
                          {appointment.can_cancel && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(appointment.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Past Appointments */}
            <TabsContent value="past" className="space-y-4">
              {pastAppointments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum histórico encontrado</h3>
                    <p className="text-gray-600">Você ainda não possui consultas anteriores.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pastAppointments.map((appointment) => (
                    <Card key={appointment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(appointment.status)}
                            <div>
                              <h4 className="font-medium">{appointment.appointment_type}</h4>
                              <p className="text-sm text-gray-600">
                                {appointment.therapist_name} • {new Date(appointment.date).toLocaleDateString('pt-BR')} às {appointment.time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(appointment.status)} variant="secondary">
                              {getStatusLabel(appointment.status)}
                            </Badge>
                            {appointment.status === 'CONCLUIDO' && (
                              <Button size="sm" variant="outline">
                                Ver Evolução
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

            {/* Book Appointment */}
            {showBookingForm && (
              <TabsContent value="book" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Horários Disponíveis</CardTitle>
                    <p className="text-sm text-gray-600">
                      Escolha um horário disponível para sua consulta
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableSlots.slice(0, 12).map((slot, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-medium">
                                {new Date(slot.date).toLocaleDateString('pt-BR', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-2xl font-bold">{slot.time}</div>
                              <div className="text-sm text-gray-600">{slot.therapist_name}</div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleBookAppointment(slot, 'Consulta de Rotina')}
                              >
                                Agendar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </PatientLayout>
  )
}