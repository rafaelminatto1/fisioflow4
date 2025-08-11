'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, X, Clock, Target, Zap, AlertCircle } from 'lucide-react'

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
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Exercise, CreateExerciseData } from '@/services/exercises'

// Schema de validação
const exerciseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  instructions: z.string().min(1, 'Instruções são obrigatórias'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  difficulty: z.string().min(1, 'Dificuldade é obrigatória'),
  body_regions: z.array(z.string()).min(1, 'Selecione pelo menos uma região corporal'),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  images: z.array(z.string()).optional(),
  default_duration_seconds: z.number().min(1).optional(),
  default_repetitions: z.number().min(1).optional(),
  default_sets: z.number().min(1).optional(),
  default_rest_seconds: z.number().min(1).optional(),
  equipment_needed: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  points_value: z.number().min(1).max(100).optional()
})

type ExerciseFormData = z.infer<typeof exerciseSchema>

interface ExerciseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise?: Exercise
  onSubmit: (data: CreateExerciseData) => void
  categories: Array<{ value: string; label: string }>
  difficulties: Array<{ value: string; label: string }>
  bodyRegions: Array<{ value: string; label: string }>
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise,
  onSubmit,
  categories,
  difficulties,
  bodyRegions
}: ExerciseFormDialogProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [equipmentList, setEquipmentList] = useState<string[]>([])
  const [contraindicationsList, setContraindicationsList] = useState<string[]>([])
  const [precautionsList, setPrecautionsList] = useState<string[]>([])
  const [benefitsList, setBenefitsList] = useState<string[]>([])

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      title: exercise?.title || '',
      description: exercise?.description || '',
      instructions: exercise?.instructions || '',
      category: exercise?.category || '',
      difficulty: exercise?.difficulty || '',
      body_regions: exercise?.body_regions || [],
      video_url: exercise?.video_url || '',
      thumbnail_url: exercise?.thumbnail_url || '',
      images: exercise?.images || [],
      default_duration_seconds: exercise?.default_duration_seconds || undefined,
      default_repetitions: exercise?.default_repetitions || undefined,
      default_sets: exercise?.default_sets || undefined,
      default_rest_seconds: exercise?.default_rest_seconds || undefined,
      equipment_needed: exercise?.equipment_needed || [],
      contraindications: exercise?.contraindications || [],
      precautions: exercise?.precautions || [],
      benefits: exercise?.benefits || [],
      points_value: exercise?.points_value || 10
    }
  })

  // Inicializar listas quando exercício é fornecido
  useEffect(() => {
    if (exercise) {
      setImageUrls(exercise.images || [])
      setEquipmentList(exercise.equipment_needed || [])
      setContraindicationsList(exercise.contraindications || [])
      setPrecautionsList(exercise.precautions || [])
      setBenefitsList(exercise.benefits || [])
    }
  }, [exercise])

  // Helper para adicionar itens a listas
  const addToList = (
    list: string[],
    setList: (list: string[]) => void,
    formField: keyof ExerciseFormData,
    value: string
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      const newList = [...list, value.trim()]
      setList(newList)
      form.setValue(formField as any, newList)
    }
  }

  // Helper para remover itens de listas
  const removeFromList = (
    list: string[],
    setList: (list: string[]) => void,
    formField: keyof ExerciseFormData,
    index: number
  ) => {
    const newList = list.filter((_, i) => i !== index)
    setList(newList)
    form.setValue(formField as any, newList)
  }

  // Componente para listas editáveis
  const EditableList = ({
    title,
    list,
    setList,
    formField,
    placeholder
  }: {
    title: string
    list: string[]
    setList: (list: string[]) => void
    formField: keyof ExerciseFormData
    placeholder: string
  }) => {
    const [inputValue, setInputValue] = useState('')

    const handleAdd = () => {
      addToList(list, setList, formField, inputValue)
      setInputValue('')
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    }

    return (
      <div>
        <Label className="text-sm font-medium">{title}</Label>
        <div className="flex space-x-2 mt-2 mb-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={handleKeyPress}
          />
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map((item, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeFromList(list, setList, formField, index)}
                className="ml-1 hover:bg-red-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  // Calcular duração total estimada
  const calculateTotalDuration = () => {
    const sets = form.watch('default_sets') || 0
    const duration = form.watch('default_duration_seconds') || 0
    const rest = form.watch('default_rest_seconds') || 0
    
    if (sets && duration) {
      const exerciseDuration = sets * duration
      const restDuration = rest ? (sets - 1) * rest : 0
      return exerciseDuration + restDuration
    }
    
    return 0
  }

  const handleSubmit = (data: ExerciseFormData) => {
    // Limpar campos vazios e converter strings vazias para undefined
    const cleanedData: CreateExerciseData = {
      ...data,
      video_url: data.video_url || undefined,
      thumbnail_url: data.thumbnail_url || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      equipment_needed: equipmentList.length > 0 ? equipmentList : undefined,
      contraindications: contraindicationsList.length > 0 ? contraindicationsList : undefined,
      precautions: precautionsList.length > 0 ? precautionsList : undefined,
      benefits: benefitsList.length > 0 ? benefitsList : undefined
    }

    onSubmit(cleanedData)
  }

  const totalDuration = calculateTotalDuration()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exercise ? 'Editar Exercício' : 'Novo Exercício'}
          </DialogTitle>
          <DialogDescription>
            {exercise 
              ? 'Modifique os dados do exercício'
              : 'Crie um novo exercício para a biblioteca'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="parameters">Parâmetros</TabsTrigger>
                <TabsTrigger value="media">Mídia</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              {/* Aba Básico */}
              <TabsContent value="basic" className="space-y-4">
                {/* Título */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do exercício" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descrição */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição breve do exercício e seus objetivos..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instruções */}
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções de Execução *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Passo a passo detalhado de como executar o exercício..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dificuldade */}
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dificuldade *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a dificuldade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {difficulties.map(difficulty => (
                              <SelectItem key={difficulty.value} value={difficulty.value}>
                                {difficulty.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Regiões corporais */}
                <FormField
                  control={form.control}
                  name="body_regions"
                  render={() => (
                    <FormItem>
                      <FormLabel>Regiões Corporais *</FormLabel>
                      <FormDescription>
                        Selecione as regiões do corpo que este exercício trabalha
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {bodyRegions.map((region) => (
                          <FormField
                            key={region.value}
                            control={form.control}
                            name="body_regions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={region.value}
                                  className="flex items-center space-x-2"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(region.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, region.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== region.value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {region.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba Parâmetros */}
              <TabsContent value="parameters" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Duração */}
                  <FormField
                    control={form.control}
                    name="default_duration_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (segundos)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="60"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Repetições */}
                  <FormField
                    control={form.control}
                    name="default_repetitions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repetições</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Séries */}
                  <FormField
                    control={form.control}
                    name="default_sets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Séries</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="3"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Descanso */}
                  <FormField
                    control={form.control}
                    name="default_rest_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descanso (segundos)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resumo da duração */}
                {totalDuration > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Duração total estimada:</span>
                        <Badge variant="outline">
                          {Math.floor(totalDuration / 60)}min {totalDuration % 60}s
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pontos de gamificação */}
                <FormField
                  control={form.control}
                  name="points_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pontos por Execução</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4" />
                          <Input 
                            type="number"
                            min="1"
                            max="100"
                            placeholder="10"
                            className="w-24"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 10)}
                            value={field.value || 10}
                          />
                          <span className="text-sm text-muted-foreground">pontos</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Pontos que o paciente ganha ao executar este exercício
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba Mídia */}
              <TabsContent value="media" className="space-y-4">
                {/* URL do vídeo */}
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Vídeo Demonstrativo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://youtube.com/watch?v=..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link para vídeo no YouTube, Vimeo ou outro serviço
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* URL da thumbnail */}
                <FormField
                  control={form.control}
                  name="thumbnail_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Imagem de Capa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/imagem.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Imagem que aparecerá como capa do exercício
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* URLs de imagens adicionais */}
                <EditableList
                  title="Imagens Adicionais"
                  list={imageUrls}
                  setList={setImageUrls}
                  formField="images"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </TabsContent>

              {/* Aba Detalhes */}
              <TabsContent value="details" className="space-y-4">
                <EditableList
                  title="Equipamentos Necessários"
                  list={equipmentList}
                  setList={setEquipmentList}
                  formField="equipment_needed"
                  placeholder="Ex: Halteres, colchonete, theraband..."
                />

                <EditableList
                  title="Contraindicações"
                  list={contraindicationsList}
                  setList={setContraindicationsList}
                  formField="contraindications"
                  placeholder="Ex: Lesão aguda no ombro..."
                />

                <EditableList
                  title="Precauções"
                  list={precautionsList}
                  setList={setPrecautionsList}
                  formField="precautions"
                  placeholder="Ex: Evitar movimentos bruscos..."
                />

                <EditableList
                  title="Benefícios"
                  list={benefitsList}
                  setList={setBenefitsList}
                  formField="benefits"
                  placeholder="Ex: Melhora força, flexibilidade..."
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {exercise ? 'Atualizar' : 'Criar'} Exercício
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}