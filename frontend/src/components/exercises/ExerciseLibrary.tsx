'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Play, BookOpen, TrendingUp, Grid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { exercisesService, Exercise, ExerciseFilters } from '@/services/exercises'
import { ExerciseCard } from './ExerciseCard'
import { ExerciseFormDialog } from './ExerciseFormDialog'
import { useAuth } from '@/contexts/AuthContext'

interface ExerciseLibraryProps {
  patientId?: string // Se fornecido, permite prescrever exercícios
  onPrescribe?: (exercise: Exercise) => void
  showCreateButton?: boolean
  className?: string
}

export function ExerciseLibrary({
  patientId,
  onPrescribe,
  showCreateButton = false,
  className
}: ExerciseLibraryProps) {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Estado dos filtros
  const [filters, setFilters] = useState<ExerciseFilters>({
    page: 1,
    per_page: 12,
    sort_by: 'created_at',
    sort_order: 'desc',
    approved_only: true,
    include_stats: true
  })

  // Estado da busca
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>()

  // Estado dos formulários
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Dados auxiliares
  const [categories, setCategories] = useState<Array<{value: string, label: string}>>([])
  const [difficulties, setDifficulties] = useState<Array<{value: string, label: string}>>([])
  const [bodyRegions, setBodyRegions] = useState<Array<{value: string, label: string}>>([])

  // Carregar dados iniciais
  useEffect(() => {
    loadExercises()
    loadAuxiliaryData()
  }, [filters])

  // Busca com debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    setSearchTimeout(
      setTimeout(() => {
        setFilters(prev => ({
          ...prev,
          search: searchTerm || undefined,
          page: 1
        }))
      }, 500)
    )

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTerm])

  const loadExercises = async () => {
    try {
      setIsLoading(true)
      const response = await exercisesService.getExercises(filters)
      setExercises(response.data)
      setTotalPages(response.pages)
      setCurrentPage(response.page)
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAuxiliaryData = async () => {
    try {
      const [categoriesRes, difficultiesRes, regionsRes] = await Promise.all([
        exercisesService.getCategories(),
        exercisesService.getDifficulties(),
        exercisesService.getBodyRegions()
      ])

      setCategories(categoriesRes.categories)
      setDifficulties(difficultiesRes.difficulties)
      setBodyRegions(regionsRes.body_regions)
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error)
    }
  }

  // Handlers
  const handleFilterChange = (key: keyof ExerciseFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleExerciseClick = (exercise: Exercise) => {
    if (patientId && onPrescribe) {
      onPrescribe(exercise)
    }
    // TODO: Abrir modal com detalhes do exercício
  }

  const handleCreateExercise = async (data: any) => {
    try {
      await exercisesService.createExercise(data)
      await loadExercises()
      setShowCreateForm(false)
    } catch (error) {
      console.error('Erro ao criar exercício:', error)
    }
  }

  const clearFilters = () => {
    setFilters({
      page: 1,
      per_page: 12,
      sort_by: 'created_at',
      sort_order: 'desc',
      approved_only: true,
      include_stats: true
    })
    setSearchTerm('')
  }

  // Contadores para badges
  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== undefined && v !== null && v !== '' && v !== 'created_at' && v !== 'desc' && v !== true && v !== 1 && v !== 12
  ).length

  return (
    <div className={cn("space-y-6", className)}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {patientId ? 'Prescrever Exercícios' : 'Biblioteca de Exercícios'}
          </h1>
          <p className="text-muted-foreground">
            {patientId 
              ? 'Selecione exercícios para prescrever ao paciente'
              : 'Explore e gerencie exercícios terapêuticos'
            }
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botões de visualização */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {showCreateButton && (user?.role === 'ADMIN' || user?.role === 'FISIOTERAPEUTA') && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Exercício
            </Button>
          )}
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar exercícios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Ordenação */}
        <Select
          value={`${filters.sort_by}-${filters.sort_order}`}
          onValueChange={(value) => {
            const [sort_by, sort_order] = value.split('-')
            handleFilterChange('sort_by', sort_by)
            handleFilterChange('sort_order', sort_order)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Mais recentes</SelectItem>
            <SelectItem value="created_at-asc">Mais antigos</SelectItem>
            <SelectItem value="title-asc">Título (A-Z)</SelectItem>
            <SelectItem value="title-desc">Título (Z-A)</SelectItem>
            <SelectItem value="difficulty-asc">Dificuldade ↑</SelectItem>
            <SelectItem value="difficulty-desc">Dificuldade ↓</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtros */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros de Exercícios</SheetTitle>
              <SheetDescription>
                Refine sua busca usando os filtros abaixo
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Categoria */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {exercisesService.getCategoryIcon(category.value)} {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dificuldade */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dificuldade</label>
                <Select
                  value={filters.difficulty || 'all'}
                  onValueChange={(value) => handleFilterChange('difficulty', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as dificuldades</SelectItem>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Região corporal */}
              <div>
                <label className="text-sm font-medium mb-2 block">Região Corporal</label>
                <Select
                  value={filters.body_region || 'all'}
                  onValueChange={(value) => handleFilterChange('body_region', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as regiões</SelectItem>
                    {bodyRegions.map(region => (
                      <SelectItem key={region.value} value={region.value}>
                        {exercisesService.getBodyRegionLabel(region.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
                <Button onClick={() => setShowFilters(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Conteúdo principal */}
      <div className="space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Lista de exercícios */}
        {!isLoading && exercises.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exercises.map(exercise => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onClick={() => handleExerciseClick(exercise)}
                    showPrescribeButton={!!patientId}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {exercises.map(exercise => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onClick={() => handleExerciseClick(exercise)}
                    showPrescribeButton={!!patientId}
                    compact={true}
                    layout="horizontal"
                  />
                ))}
              </div>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page = i + 1
                    if (totalPages > 5) {
                      if (currentPage <= 3) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                      } else {
                        page = currentPage - 2 + i
                      }
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            )}
          </>
        )}

        {/* Estado vazio */}
        {!isLoading && exercises.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Nenhum exercício encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || activeFiltersCount > 0
                    ? 'Tente ajustar os filtros ou termos de busca'
                    : 'A biblioteca de exercícios está vazia'
                  }
                </p>
              </div>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para criar exercício */}
      <ExerciseFormDialog
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleCreateExercise}
        categories={categories}
        difficulties={difficulties}
        bodyRegions={bodyRegions}
      />
    </div>
  )
}