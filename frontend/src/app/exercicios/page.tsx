'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary'
import { useAuth } from '@/contexts/AuthContext'

export default function ExerciciosPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('library')

  const canCreateExercises = user?.role === 'ADMIN' || user?.role === 'FISIOTERAPEUTA'
  const canManageLibrary = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          {user?.role === 'PACIENTE' && (
            <TabsTrigger value="prescribed">Meus Exercícios</TabsTrigger>
          )}
          {canCreateExercises && (
            <TabsTrigger value="management">Gerenciamento</TabsTrigger>
          )}
        </TabsList>

        {/* Biblioteca de Exercícios */}
        <TabsContent value="library" className="mt-6">
          <ExerciseLibrary 
            showCreateButton={canCreateExercises}
            className="space-y-6"
          />
        </TabsContent>

        {/* Exercícios Prescritos (para pacientes) */}
        {user?.role === 'PACIENTE' && (
          <TabsContent value="prescribed" className="mt-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Meus Exercícios Prescritos</h2>
              <p className="text-muted-foreground mb-6">
                Exercícios que foram prescritos pelos seus terapeutas
              </p>
              {/* TODO: Implementar componente de exercícios prescritos */}
              <div className="text-center py-12 text-muted-foreground">
                <p>Em desenvolvimento...</p>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Gerenciamento (para terapeutas/admins) */}
        {canCreateExercises && (
          <TabsContent value="management" className="mt-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Gerenciar Exercícios</h2>
              <p className="text-muted-foreground mb-6">
                Crie, edite e aprove exercícios da biblioteca
              </p>
              
              <ExerciseLibrary 
                showCreateButton={true}
                className="space-y-6"
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}