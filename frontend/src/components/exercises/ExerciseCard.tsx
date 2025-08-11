'use client'

import { useState } from 'react'
import { Play, Clock, Target, Star, Users, Zap, Eye, Heart, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Exercise, exercisesService } from '@/services/exercises'

interface ExerciseCardProps {
  exercise: Exercise
  onClick?: () => void
  showPrescribeButton?: boolean
  showStats?: boolean
  compact?: boolean
  layout?: 'vertical' | 'horizontal'
  className?: string
}

export function ExerciseCard({
  exercise,
  onClick,
  showPrescribeButton = false,
  showStats = true,
  compact = false,
  layout = 'vertical',
  className
}: ExerciseCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const difficultyColor = exercisesService.getDifficultyColor(exercise.difficulty)
  const categoryIcon = exercisesService.getCategoryIcon(exercise.category)

  // Calcular duração total do exercício
  const totalDuration = () => {
    if (!exercise.default_sets || !exercise.default_duration_seconds) return null
    
    const exerciseDuration = exercise.default_sets * exercise.default_duration_seconds
    const restDuration = exercise.default_rest_seconds 
      ? (exercise.default_sets - 1) * exercise.default_rest_seconds 
      : 0
    
    return exerciseDuration + restDuration
  }

  const duration = totalDuration()

  // Componente de estatísticas
  const StatsDisplay = () => (
    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
      {exercise.total_executions !== undefined && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{exercise.total_executions}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Execuções realizadas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {exercise.average_rating !== undefined && exercise.average_rating > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{exercise.average_rating.toFixed(1)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Avaliação média</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>{exercise.points_value}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pontos por execução</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  // Layout horizontal (lista)
  if (layout === 'horizontal') {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          !exercise.is_approved && "opacity-60",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex space-x-4">
            {/* Thumbnail */}
            <div className="relative w-24 h-24 flex-shrink-0">
              {exercise.thumbnail_url && !imageError ? (
                <img
                  src={exercise.thumbnail_url}
                  alt={exercise.title}
                  className={cn(
                    "w-full h-full object-cover rounded-md",
                    isImageLoading && "animate-pulse bg-muted"
                  )}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setImageError(true)
                    setIsImageLoading(false)
                  }}
                />
              ) : (
                <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                  <span className="text-2xl">{categoryIcon}</span>
                </div>
              )}
              
              {exercise.video_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="h-6 w-6 text-white" />
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{exercise.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {exercise.description}
                  </p>
                </div>
                
                {!exercise.is_approved && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-yellow-500 ml-2 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Exercício pendente de aprovação</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Badges e metadados */}
              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="outline" className={`border-${difficultyColor}-200 text-${difficultyColor}-700`}>
                  {exercise.difficulty}
                </Badge>
                
                <Badge variant="secondary">
                  {categoryIcon} {exercise.category.replace('_', ' ')}
                </Badge>

                {duration && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{exercisesService.formatDuration(duration)}</span>
                  </div>
                )}
              </div>

              {/* Regiões corporais */}
              <div className="flex flex-wrap gap-1 mb-3">
                {exercise.body_regions.slice(0, 3).map(region => (
                  <Badge key={region} variant="outline" className="text-xs">
                    {exercisesService.getBodyRegionLabel(region)}
                  </Badge>
                ))}
                {exercise.body_regions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{exercise.body_regions.length - 3}
                  </Badge>
                )}
              </div>

              {/* Parâmetros do exercício */}
              {!compact && (
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                  {exercise.default_repetitions && (
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>{exercise.default_repetitions} reps</span>
                    </div>
                  )}
                  
                  {exercise.default_sets && (
                    <div className="flex items-center space-x-1">
                      <span>{exercise.default_sets} séries</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats e ações */}
              <div className="flex items-center justify-between">
                {showStats && <StatsDisplay />}
                
                <div className="flex items-center space-x-2 ml-auto">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  
                  {showPrescribeButton && (
                    <Button size="sm">
                      <Heart className="h-4 w-4 mr-1" />
                      Prescrever
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Layout vertical (grid)
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md overflow-hidden",
        !exercise.is_approved && "opacity-60",
        className
      )}
      onClick={onClick}
    >
      {/* Header com imagem/vídeo */}
      <div className="relative aspect-video bg-muted">
        {exercise.thumbnail_url && !imageError ? (
          <img
            src={exercise.thumbnail_url}
            alt={exercise.title}
            className={cn(
              "w-full h-full object-cover",
              isImageLoading && "animate-pulse"
            )}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setImageError(true)
              setIsImageLoading(false)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-4xl">{categoryIcon}</span>
          </div>
        )}
        
        {exercise.video_url && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-6 w-6 text-gray-900" />
            </div>
          </div>
        )}

        {/* Badge de aprovação */}
        {!exercise.is_approved && (
          <div className="absolute top-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exercício pendente de aprovação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Duração no canto */}
        {duration && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-black/50 text-white border-0">
              <Clock className="h-3 w-3 mr-1" />
              {exercisesService.formatDuration(duration)}
            </Badge>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <CardHeader className={cn("pb-2", compact && "p-3")}>
        <div className="flex items-start justify-between">
          <h3 className={cn(
            "font-semibold line-clamp-2 flex-1",
            compact ? "text-sm" : "text-base"
          )}>
            {exercise.title}
          </h3>
        </div>
        
        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {exercise.description}
          </p>
        )}
      </CardHeader>

      <CardContent className={cn("pt-0 pb-2", compact && "p-3 pt-0")}>
        {/* Badges principais */}
        <div className="flex items-center space-x-2 mb-3">
          <Badge variant="outline" className={`border-${difficultyColor}-200 text-${difficultyColor}-700`}>
            {exercise.difficulty}
          </Badge>
          
          <Badge variant="secondary" className="text-xs">
            {categoryIcon} {exercise.category}
          </Badge>
        </div>

        {/* Regiões corporais */}
        <div className="flex flex-wrap gap-1 mb-3">
          {exercise.body_regions.slice(0, compact ? 2 : 3).map(region => (
            <Badge key={region} variant="outline" className="text-xs">
              {exercisesService.getBodyRegionLabel(region)}
            </Badge>
          ))}
          {exercise.body_regions.length > (compact ? 2 : 3) && (
            <Badge variant="outline" className="text-xs">
              +{exercise.body_regions.length - (compact ? 2 : 3)}
            </Badge>
          )}
        </div>

        {/* Parâmetros do exercício */}
        {!compact && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center space-x-3">
              {exercise.default_repetitions && (
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span>{exercise.default_repetitions}</span>
                </div>
              )}
              
              {exercise.default_sets && (
                <span>{exercise.default_sets} séries</span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>{exercise.points_value}pts</span>
            </div>
          </div>
        )}

        {/* Equipamentos (se houver) */}
        {!compact && exercise.equipment_needed.length > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">Equipamentos:</span>
            <span className="ml-1">
              {exercise.equipment_needed.slice(0, 2).join(', ')}
              {exercise.equipment_needed.length > 2 && ` +${exercise.equipment_needed.length - 2}`}
            </span>
          </div>
        )}
      </CardContent>

      {/* Footer com ações */}
      <CardFooter className={cn("pt-0 flex items-center justify-between", compact && "p-3 pt-0")}>
        {showStats && <StatsDisplay />}
        
        <div className="flex items-center space-x-2 ml-auto">
          {!compact && (
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {showPrescribeButton && (
            <Button size="sm">
              <Heart className="h-4 w-4 mr-1" />
              {compact ? '' : 'Prescrever'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}