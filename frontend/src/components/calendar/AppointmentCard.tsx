'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, FileText, RefreshCw, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Appointment } from './Calendar'

interface AppointmentCardProps {
  appointment: Appointment
  onClick: () => void
  showActions?: boolean
  compact?: boolean
  className?: string
}

export function AppointmentCard({
  appointment,
  onClick,
  showActions = true,
  compact = false,
  className
}: AppointmentCardProps) {
  // Configurações de status
  const statusConfig = {
    agendado: {
      label: 'Agendado',
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    confirmado: {
      label: 'Confirmado',
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    em_andamento: {
      label: 'Em Andamento',
      variant: 'default' as const,
      icon: RefreshCw,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    },
    concluido: {
      label: 'Concluído',
      variant: 'secondary' as const,
      icon: CheckCircle2,
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    },
    cancelado: {
      label: 'Cancelado',
      variant: 'destructive' as const,
      icon: X,
      color: 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const status = statusConfig[appointment.status]
  const StatusIcon = status.icon

  // Calcular duração da sessão
  const startTime = new Date(`2000-01-01T${appointment.start_time}`)
  const endTime = new Date(`2000-01-01T${appointment.end_time}`)
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

  // Verificar se está próximo do horário
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
  const now = new Date()
  const timeDiff = appointmentDateTime.getTime() - now.getTime()
  const isUpcoming = timeDiff > 0 && timeDiff <= 30 * 60 * 1000 // Próximo 30 minutos
  const isLate = timeDiff < 0 && appointment.status !== 'concluido' && appointment.status !== 'cancelado'

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          status.color,
          isUpcoming && "ring-2 ring-yellow-400 ring-opacity-50",
          isLate && "ring-2 ring-red-400 ring-opacity-50",
          compact && "p-2",
          className
        )}
        onClick={onClick}
      >
        <CardContent className={cn("p-4", compact && "p-2")}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Cabeçalho */}
              <div className="flex items-center space-x-2 mb-2">
                <StatusIcon className={cn("h-4 w-4", status.color.split(' ')[0])} />
                <Badge variant={status.variant} className="text-xs">
                  {status.label}
                </Badge>
                
                {appointment.is_recurring && (
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agendamento recorrente</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {isUpcoming && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Próximo agendamento (30 min)</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {isLate && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-red-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agendamento atrasado</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Informações principais */}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "font-medium truncate",
                    compact && "text-sm"
                  )}>
                    {appointment.patient_name}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "text-muted-foreground",
                    compact && "text-xs"
                  )}>
                    {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ({duration} min)
                  </span>
                </div>

                {!compact && appointment.type && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {appointment.type}
                    </span>
                  </div>
                )}

                {!compact && appointment.therapist_name && (
                  <div className="text-xs text-muted-foreground">
                    Terapeuta: {appointment.therapist_name}
                  </div>
                )}

                {!compact && appointment.notes && (
                  <div className="text-xs text-muted-foreground italic">
                    "{appointment.notes}"
                  </div>
                )}
              </div>

              {/* Padrão de recorrência */}
              {!compact && appointment.is_recurring && appointment.recurrence_pattern && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center space-x-1">
                    <RefreshCw className="h-3 w-3" />
                    <span>
                      {appointment.recurrence_pattern.frequency === 'daily' && 'Diário'}
                      {appointment.recurrence_pattern.frequency === 'weekly' && 'Semanal'}
                      {appointment.recurrence_pattern.frequency === 'monthly' && 'Mensal'}
                      {appointment.recurrence_pattern.interval > 1 && 
                        ` (a cada ${appointment.recurrence_pattern.interval})`
                      }
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            {showActions && !compact && (
              <div className="flex flex-col space-y-1 ml-4">
                {appointment.status === 'agendado' && (
                  <Button size="sm" variant="outline" className="text-xs">
                    Confirmar
                  </Button>
                )}
                
                {appointment.status === 'confirmado' && (
                  <Button size="sm" variant="default" className="text-xs">
                    Iniciar
                  </Button>
                )}
                
                {appointment.status === 'em_andamento' && (
                  <Button size="sm" variant="default" className="text-xs">
                    Finalizar
                  </Button>
                )}

                <Button size="sm" variant="ghost" className="text-xs">
                  Editar
                </Button>
              </div>
            )}
          </div>

          {/* Barra de progresso para status em andamento */}
          {appointment.status === 'em_andamento' && !compact && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-yellow-600 h-1 rounded-full transition-all duration-1000"
                  style={{ width: '60%' }} // Placeholder - calcular baseado no tempo decorrido
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sessão em andamento...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}