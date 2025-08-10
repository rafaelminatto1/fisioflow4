'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, Clock, User, RefreshCw, AlertCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Appointment } from './Calendar'

// Schema de validação
const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  therapist_id: z.string().min(1, 'Selecione um terapeuta'),
  appointment_date: z.string().min(1, 'Data é obrigatória'),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  type: z.string().min(1, 'Tipo de atendimento é obrigatório'),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrence_interval: z.number().min(1).max(12).default(1),
  recurrence_days: z.array(z.number()).optional(),
  recurrence_end_date: z.string().optional()
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  selectedTime: string
  appointment?: Appointment
  onSubmit?: (data: AppointmentFormData) => void
  patients?: Array<{ id: string; name: string }>
  therapists?: Array<{ id: string; name: string }>
  conflictingAppointments?: Appointment[]
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  appointment,
  onSubmit,
  patients = [],
  therapists = [],
  conflictingAppointments = []
}: AppointmentFormDialogProps) {
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [conflicts, setConflicts] = useState<Appointment[]>([])

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      therapist_id: appointment?.therapist_id || '',
      appointment_date: appointment?.appointment_date || format(selectedDate, 'yyyy-MM-dd'),
      start_time: appointment?.start_time || selectedTime,
      end_time: appointment?.end_time || calculateEndTime(selectedTime, 60),
      type: appointment?.type || '',
      notes: appointment?.notes || '',
      is_recurring: appointment?.is_recurring || false,
      recurrence_frequency: appointment?.recurrence_pattern?.frequency || 'weekly',
      recurrence_interval: appointment?.recurrence_pattern?.interval || 1,
      recurrence_days: appointment?.recurrence_pattern?.days_of_week || [],
      recurrence_end_date: appointment?.recurrence_pattern?.end_date || ''
    }
  })

  // Calcular horário de fim baseado na duração
  function calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date(2000, 0, 1, hours, minutes)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
  }

  // Tipos de atendimento predefinidos
  const appointmentTypes = [
    'Avaliação Inicial',
    'Fisioterapia Ortopédica',
    'Fisioterapia Neurológica',
    'Fisioterapia Respiratória',
    'RPG',
    'Pilates Terapêutico',
    'Massagem Terapêutica',
    'Drenagem Linfática',
    'Eletroterapia',
    'Reavaliação',
    'Retorno'
  ]

  // Durações predefinidas
  const durations = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 },
    { label: '120 min', value: 120 }
  ]

  // Observar mudanças no formulário para detectar conflitos
  const watchedFields = form.watch(['therapist_id', 'appointment_date', 'start_time', 'end_time'])
  
  useEffect(() => {
    // Verificar conflitos quando os campos relevantes mudarem
    const [therapistId, date, startTime, endTime] = watchedFields
    if (therapistId && date && startTime && endTime) {
      // Simular verificação de conflitos
      const potentialConflicts = conflictingAppointments.filter(apt => 
        apt.therapist_id === therapistId &&
        apt.appointment_date === date &&
        apt.id !== appointment?.id &&
        (
          (startTime >= apt.start_time && startTime < apt.end_time) ||
          (endTime > apt.start_time && endTime <= apt.end_time) ||
          (startTime <= apt.start_time && endTime >= apt.end_time)
        )
      )
      setConflicts(potentialConflicts)
    }
  }, [watchedFields, conflictingAppointments, appointment?.id])

  // Manipular mudança de duração
  const handleDurationChange = (duration: number) => {
    const startTime = form.getValues('start_time')
    const newEndTime = calculateEndTime(startTime, duration)
    form.setValue('end_time', newEndTime)
  }

  // Manipular mudança de horário de início
  const handleStartTimeChange = (startTime: string) => {
    form.setValue('start_time', startTime)
    const endTime = form.getValues('end_time')
    const startDate = new Date(`2000-01-01T${startTime}`)
    const endDate = new Date(`2000-01-01T${endTime}`)
    const currentDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    
    if (currentDuration > 0) {
      const newEndTime = calculateEndTime(startTime, currentDuration)
      form.setValue('end_time', newEndTime)
    }
  }

  // Manipular envio do formulário
  const handleSubmit = (data: AppointmentFormData) => {
    if (conflicts.length > 0) {
      // Mostrar confirmação se houver conflitos
      const confirmed = window.confirm('Há conflitos de horário. Deseja continuar mesmo assim?')
      if (!confirmed) return
    }

    onSubmit?.(data)
    onOpenChange(false)
    form.reset()
  }

  // Dias da semana para recorrência semanal
  const weekDays = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {appointment 
              ? 'Modifique os dados do agendamento'
              : `Criar agendamento para ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Conflitos de horário */}
            {conflicts.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-700 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Conflito de Horário Detectado</span>
                  </div>
                  {conflicts.map(conflict => (
                    <div key={conflict.id} className="text-sm text-red-600">
                      • {conflict.patient_name} das {conflict.start_time} às {conflict.end_time}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Paciente */}
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{patient.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Terapeuta */}
              <FormField
                control={form.control}
                name="therapist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terapeuta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar terapeuta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {therapists.map(therapist => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            {therapist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Data */}
              <FormField
                control={form.control}
                name="appointment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horário início */}
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Horário fim */}
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duração rápida */}
            <div>
              <Label>Duração</Label>
              <div className="flex space-x-2 mt-2">
                {durations.map(duration => (
                  <Button
                    key={duration.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDurationChange(duration.value)}
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tipo de atendimento */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Atendimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appointmentTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o agendamento..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recorrência */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={showRecurrence}
                  onCheckedChange={setShowRecurrence}
                />
                <label htmlFor="recurring" className="text-sm font-medium">
                  Agendamento recorrente
                </label>
              </div>

              {showRecurrence && (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Frequência */}
                    <FormField
                      control={form.control}
                      name="recurrence_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequência</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Intervalo */}
                    <FormField
                      control={form.control}
                      name="recurrence_interval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>A cada</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="12"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Data de término */}
                  <FormField
                    control={form.control}
                    name="recurrence_end_date"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Até (opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {appointment ? 'Atualizar' : 'Criar'} Agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}