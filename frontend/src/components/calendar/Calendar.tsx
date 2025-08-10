'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AppointmentCard } from './AppointmentCard'
import { TimeSlotGrid } from './TimeSlotGrid'
import { AppointmentFormDialog } from './AppointmentFormDialog'

export type CalendarView = 'month' | 'week' | 'day'

export interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  therapist_id: string
  therapist_name: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'
  type: string
  notes?: string
  is_recurring: boolean
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    days_of_week?: number[]
    end_date?: string
  }
}

interface CalendarProps {
  appointments?: Appointment[]
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onAppointmentClick: (appointment: Appointment) => void
  onTimeSlotClick: (date: Date, time: string) => void
  isLoading?: boolean
  className?: string
}

export function Calendar({
  appointments = [],
  view,
  onViewChange,
  onAppointmentClick,
  onTimeSlotClick,
  isLoading = false,
  className
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)

  // Filtrar appointments para o período visível
  const getVisibleAppointments = () => {
    let startDate: Date
    let endDate: Date

    switch (view) {
      case 'month':
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
        break
      case 'week':
        startDate = startOfWeek(currentDate, { locale: ptBR })
        endDate = endOfWeek(currentDate, { locale: ptBR })
        break
      case 'day':
        startDate = currentDate
        endDate = currentDate
        break
      default:
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
    }

    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date)
      return appointmentDate >= startDate && appointmentDate <= endDate
    })
  }

  const visibleAppointments = getVisibleAppointments()

  // Navegação do calendário
  const navigateCalendar = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Obter appointments para uma data específica
  const getAppointmentsForDate = (date: Date) => {
    return visibleAppointments.filter(appointment =>
      isSameDay(new Date(appointment.appointment_date), date)
    )
  }

  // Renderizar visualização mensal
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { locale: ptBR })
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-1 h-full">
        {/* Cabeçalho dos dias da semana */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
        
        {/* Dias do mês */}
        {days.map(day => {
          const dayAppointments = getAppointmentsForDate(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          
          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] cursor-pointer transition-all hover:shadow-md",
                !isCurrentMonth && "opacity-30",
                isSelected && "ring-2 ring-primary",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <CardContent className="p-2 h-full">
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {dayAppointments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayAppointments.length}
                    </Badge>
                  )}
                </div>
                
                {/* Appointments preview */}
                <div className="space-y-1 overflow-hidden">
                  {dayAppointments.slice(0, 3).map(appointment => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "text-xs p-1 rounded truncate",
                        appointment.status === 'confirmado' && "bg-green-100 text-green-800",
                        appointment.status === 'agendado' && "bg-blue-100 text-blue-800",
                        appointment.status === 'em_andamento' && "bg-yellow-100 text-yellow-800",
                        appointment.status === 'concluido' && "bg-gray-100 text-gray-800",
                        appointment.status === 'cancelado' && "bg-red-100 text-red-800"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(appointment)
                      }}
                    >
                      {format(new Date(`2000-01-01T${appointment.start_time}`), 'HH:mm')} - {appointment.patient_name}
                    </div>
                  ))}
                  
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Renderizar visualização semanal
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR })
    const weekEnd = endOfWeek(currentDate, { locale: ptBR })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="flex flex-col h-full">
        {/* Cabeçalho da semana */}
        <div className="grid grid-cols-8 gap-1 mb-4 border-b pb-2">
          <div></div> {/* Espaço para coluna de horários */}
          {days.map(day => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-sm font-medium">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                "text-xl font-bold",
                isToday(day) && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Grid de horários */}
        <div className="flex-1">
          <TimeSlotGrid
            days={days}
            appointments={visibleAppointments}
            onAppointmentClick={onAppointmentClick}
            onTimeSlotClick={onTimeSlotClick}
          />
        </div>
      </div>
    )
  }

  // Renderizar visualização diária
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate)

    return (
      <div className="flex flex-col h-full">
        {/* Cabeçalho do dia */}
        <div className="mb-4 border-b pb-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-muted-foreground">
            {dayAppointments.length} agendamento(s)
          </p>
        </div>

        {/* Lista de appointments */}
        <div className="flex-1 space-y-4">
          {dayAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum agendamento</h3>
              <p>Não há agendamentos para este dia.</p>
              <Button
                className="mt-4"
                onClick={() => onTimeSlotClick(currentDate, '09:00')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          ) : (
            dayAppointments
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map(appointment => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => onAppointmentClick(appointment)}
                />
              ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">
            {format(currentDate, view === 'month' ? "MMMM 'de' yyyy" : "dd/MM/yyyy", { locale: ptBR })}
          </h1>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateCalendar('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Hoje
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateCalendar('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Seletor de visualização */}
          <div className="flex border rounded-md">
            {(['month', 'week', 'day'] as CalendarView[]).map(viewType => (
              <Button
                key={viewType}
                variant={view === viewType ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => onViewChange(viewType)}
              >
                {viewType === 'month' && 'Mês'}
                {viewType === 'week' && 'Semana'}
                {viewType === 'day' && 'Dia'}
              </Button>
            ))}
          </div>

          <Button onClick={() => setShowAppointmentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Conteúdo do calendário */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Dialog para novo agendamento */}
      <AppointmentFormDialog
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        selectedDate={selectedDate || currentDate}
        selectedTime="09:00"
      />
    </div>
  )
}