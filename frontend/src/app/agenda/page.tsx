'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Calendar, CalendarView, Appointment } from '@/components/calendar/Calendar'
import { AppointmentCard } from '@/components/calendar/AppointmentCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { appointmentsService } from '@/services/appointments'

export default function AgendaPage() {
  const { user } = useAuth()
  const [view, setView] = useState<CalendarView>('month')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([])
  const [therapists, setTherapists] = useState<Array<{ id: string; name: string }>>([])

  // Carregar dados iniciais
  useEffect(() => {
    loadAppointments()
    loadPatients()
    loadTherapists()
  }, [])

  const loadAppointments = async () => {
    try {
      setIsLoading(true)
      const data = await appointmentsService.getAppointments({
        start_date: new Date().toISOString().split('T')[0],
        therapist_id: user?.role === 'FISIOTERAPEUTA' ? user.id : undefined
      })
      setAppointments(data)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPatients = async () => {
    try {
      // Simular carregamento de pacientes
      // Na implementação real, usar patientsService.getPatients()
      setPatients([
        { id: '1', name: 'Maria Silva' },
        { id: '2', name: 'João Santos' },
        { id: '3', name: 'Ana Costa' }
      ])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const loadTherapists = async () => {
    try {
      // Simular carregamento de terapeutas
      // Na implementação real, usar usersService.getTherapists()
      setTherapists([
        { id: '1', name: 'Dr. Pedro Lima' },
        { id: '2', name: 'Dra. Carla Mendes' },
        { id: '3', name: 'Dr. Rafael Costa' }
      ])
    } catch (error) {
      console.error('Erro ao carregar terapeutas:', error)
    }
  }

  // Manipuladores de eventos
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleTimeSlotClick = (date: Date, time: string) => {
    // Abrir formulário de novo agendamento
    console.log('Criar agendamento para:', date, time)
  }

  const handleCreateAppointment = async (data: any) => {
    try {
      const newAppointment = await appointmentsService.createAppointment(data)
      setAppointments(prev => [...prev, newAppointment])
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
    }
  }

  // Calcular estatísticas
  const today = new Date()
  const todayAppointments = appointments.filter(apt => 
    apt.appointment_date === today.toISOString().split('T')[0]
  )

  const stats = {
    total: appointments.length,
    hoje: todayAppointments.length,
    confirmados: appointments.filter(apt => apt.status === 'confirmado').length,
    pendentes: appointments.filter(apt => apt.status === 'agendado').length,
    concluidos: appointments.filter(apt => apt.status === 'concluido').length,
    cancelados: appointments.filter(apt => apt.status === 'cancelado').length
  }

  // Próximos agendamentos
  const upcomingAppointments = appointments
    .filter(apt => {
      const appointmentDate = new Date(`${apt.appointment_date}T${apt.start_time}`)
      return appointmentDate > new Date() && apt.status !== 'cancelado'
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.start_time}`)
      const dateB = new Date(`${b.appointment_date}T${b.start_time}`)
      return dateA.getTime() - dateB.getTime()
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie seus agendamentos e horários
          </p>
        </div>
        
        <Button onClick={loadAppointments} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.hoje}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.confirmados}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.concluidos}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.cancelados}</p>
                <p className="text-xs text-muted-foreground">Cancelados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendário principal */}
            <Card className="lg:col-span-3">
              <CardContent className="p-0">
                <div className="h-[800px]">
                  <Calendar
                    appointments={appointments}
                    view={view}
                    onViewChange={setView}
                    onAppointmentClick={handleAppointmentClick}
                    onTimeSlotClick={handleTimeSlotClick}
                    isLoading={isLoading}
                    className="h-full p-6"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Painel lateral */}
            <div className="space-y-4">
              {/* Agendamento selecionado */}
              {selectedAppointment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Agendamento Selecionado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <AppointmentCard
                      appointment={selectedAppointment}
                      onClick={() => setSelectedAppointment(null)}
                      compact={false}
                      showActions={true}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Próximos agendamentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Próximos Agendamentos</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {upcomingAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum agendamento próximo
                    </p>
                  ) : (
                    upcomingAppointments.map(appointment => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onClick={() => handleAppointmentClick(appointment)}
                        compact={true}
                        showActions={false}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Status Legend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Legenda</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-xs">Agendado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-xs">Confirmado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                    <span className="text-xs">Em Andamento</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-gray-500"></div>
                    <span className="text-xs">Concluído</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-xs">Cancelado</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">Nenhum agendamento</h3>
                  <p>Não há agendamentos para exibir.</p>
                </div>
              ) : (
                appointments
                  .sort((a, b) => `${a.appointment_date}T${a.start_time}`.localeCompare(`${b.appointment_date}T${b.start_time}`))
                  .map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() => handleAppointmentClick(appointment)}
                      showActions={true}
                    />
                  ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">Nenhum agendamento próximo</h3>
                  <p>Você não tem agendamentos futuros.</p>
                </div>
              ) : (
                upcomingAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => handleAppointmentClick(appointment)}
                    showActions={true}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}