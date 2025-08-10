'use client'

import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Appointment } from './Calendar'

interface TimeSlotGridProps {
  days: Date[]
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
  onTimeSlotClick: (date: Date, time: string) => void
  startHour?: number
  endHour?: number
  slotDuration?: number // em minutos
}

export function TimeSlotGrid({
  days,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
  startHour = 7,
  endHour = 19,
  slotDuration = 30
}: TimeSlotGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ date: Date; time: string } | null>(null)

  // Gerar slots de tempo
  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minutes = 0; minutes < 60; minutes += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Obter appointments para uma data e horário específicos
  const getAppointmentForSlot = (date: Date, time: string) => {
    return appointments.find(appointment => {
      if (!isSameDay(new Date(appointment.appointment_date), date)) {
        return false
      }

      const appointmentStart = appointment.start_time
      const appointmentEnd = appointment.end_time
      
      return time >= appointmentStart && time < appointmentEnd
    })
  }

  // Calcular altura do appointment baseado na duração
  const calculateAppointmentHeight = (appointment: Appointment) => {
    const start = new Date(`2000-01-01T${appointment.start_time}`)
    const end = new Date(`2000-01-01T${appointment.end_time}`)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    const slotsSpanned = durationMinutes / slotDuration
    return slotsSpanned * 60 // 60px por slot
  }

  // Verificar se um slot está ocupado
  const isSlotOccupied = (date: Date, time: string) => {
    return getAppointmentForSlot(date, time) !== undefined
  }

  // Verificar se é um slot de início de appointment
  const isAppointmentStart = (date: Date, time: string) => {
    const appointment = getAppointmentForSlot(date, time)
    return appointment && appointment.start_time === time
  }

  // Obter configuração de cor baseada no status
  const getAppointmentStyles = (appointment: Appointment) => {
    const baseStyles = "absolute left-1 right-1 rounded-md border-l-4 p-2 shadow-sm cursor-pointer hover:shadow-md transition-all z-10"
    
    switch (appointment.status) {
      case 'confirmado':
        return `${baseStyles} bg-green-50 border-green-500 hover:bg-green-100`
      case 'agendado':
        return `${baseStyles} bg-blue-50 border-blue-500 hover:bg-blue-100`
      case 'em_andamento':
        return `${baseStyles} bg-yellow-50 border-yellow-500 hover:bg-yellow-100`
      case 'concluido':
        return `${baseStyles} bg-gray-50 border-gray-500 hover:bg-gray-100`
      case 'cancelado':
        return `${baseStyles} bg-red-50 border-red-500 hover:bg-red-100 opacity-60`
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 hover:bg-gray-100`
    }
  }

  return (
    <div className="flex overflow-hidden h-full">
      {/* Coluna de horários */}
      <div className="w-20 flex-shrink-0 border-r">
        <div className="h-12"></div> {/* Espaço para cabeçalho */}
        {timeSlots.map((time, index) => (
          <div
            key={time}
            className={cn(
              "h-15 border-b text-xs text-muted-foreground flex items-center justify-end pr-2",
              index % (60 / slotDuration) === 0 && "border-b-2 font-medium"
            )}
          >
            {index % (60 / slotDuration) === 0 && format(new Date(`2000-01-01T${time}`), 'HH:mm')}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="flex-1 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-full">
          {days.map(day => (
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              {/* Cabeçalho do dia */}
              <div className="h-12 border-b p-2 text-center bg-muted/20">
                <div className="text-sm font-medium">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className="text-lg font-bold">
                  {format(day, 'd')}
                </div>
              </div>

              {/* Slots de tempo */}
              <div className="relative">
                {timeSlots.map((time, timeIndex) => {
                  const appointment = getAppointmentForSlot(day, time)
                  const isStart = isAppointmentStart(day, time)
                  const isHovered = hoveredSlot?.date === day && hoveredSlot?.time === time

                  return (
                    <div key={time} className="relative">
                      {/* Slot de tempo */}
                      <div
                        className={cn(
                          "h-15 border-b transition-colors relative",
                          timeIndex % (60 / slotDuration) === 0 && "border-b-2",
                          !appointment && "hover:bg-muted/10 cursor-pointer",
                          isHovered && "bg-primary/10"
                        )}
                        onMouseEnter={() => !appointment && setHoveredSlot({ date: day, time })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => !appointment && onTimeSlotClick(day, time)}
                      >
                        {/* Botão de adicionar appointment */}
                        {isHovered && !appointment && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Appointment card */}
                      {appointment && isStart && (
                        <div
                          className={getAppointmentStyles(appointment)}
                          style={{ 
                            height: `${calculateAppointmentHeight(appointment)}px`,
                            top: 0
                          }}
                          onClick={() => onAppointmentClick(appointment)}
                        >
                          <div className="text-xs font-medium truncate">
                            {appointment.patient_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(`2000-01-01T${appointment.start_time}`), 'HH:mm')} - 
                            {format(new Date(`2000-01-01T${appointment.end_time}`), 'HH:mm')}
                          </div>
                          {appointment.type && (
                            <div className="text-xs text-muted-foreground truncate mt-1">
                              {appointment.type}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}