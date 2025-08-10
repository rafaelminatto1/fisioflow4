'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, Database, Cloud, Smartphone, Brain, Users, FileText, BarChart3, Shield, Zap, Settings } from 'lucide-react';

const todoItems = [
  { id: '1', title: 'FASE 1: Configurar estrutura base do monorepo', status: 'completed', category: 'setup', icon: Settings },
  { id: '2', title: 'FASE 1: Configurar ambiente de desenvolvimento', status: 'completed', category: 'setup', icon: Settings },
  { id: '3', title: 'FASE 2: Sistema de autenticação completo', status: 'pending', category: 'auth', icon: Shield },
  { id: '4', title: 'FASE 2: Componentes de autenticação frontend', status: 'pending', category: 'auth', icon: Shield },
  { id: '5', title: 'FASE 3A: Modelos de pacientes e prontuários', status: 'pending', category: 'patients', icon: Users },
  { id: '6', title: 'FASE 3A: APIs REST para gestão de pacientes', status: 'pending', category: 'patients', icon: Users },
  { id: '7', title: 'FASE 3A: Interface React para gestão de pacientes', status: 'pending', category: 'patients', icon: Users },
  { id: '8', title: 'FASE 3A: Componente BodyMap e formulário SOAP', status: 'pending', category: 'patients', icon: Users },
  { id: '9', title: 'FASE 3B: Sistema de agenda com detecção de conflitos', status: 'pending', category: 'schedule', icon: Clock },
  { id: '10', title: 'FASE 3B: Sistema de lembretes e integração', status: 'pending', category: 'schedule', icon: Clock },
  { id: '11', title: 'FASE 3B: Frontend da agenda com calendário', status: 'pending', category: 'schedule', icon: Clock },
  { id: '12', title: 'FASE 3C: Biblioteca de exercícios', status: 'pending', category: 'exercises', icon: Zap },
  { id: '13', title: 'FASE 3C: UI/UX da biblioteca de exercícios', status: 'pending', category: 'exercises', icon: Zap },
  { id: '14', title: 'FASE 4A: Módulo Mentoria e Ensino', status: 'pending', category: 'education', icon: FileText },
  { id: '15', title: 'FASE 4B: Sistema de protocolos clínicos', status: 'pending', category: 'protocols', icon: FileText },
  { id: '16', title: 'FASE 4B: Protocolos base para condições comuns', status: 'pending', category: 'protocols', icon: FileText },
  { id: '17', title: 'FASE 4C: Sistema Kanban para projetos', status: 'pending', category: 'projects', icon: BarChart3 },
  { id: '18', title: 'FASE 4D: Dashboard operacional executivo', status: 'pending', category: 'analytics', icon: BarChart3 },
  { id: '19', title: 'FASE 5: Sistema de IA integrado', status: 'pending', category: 'ai', icon: Brain },
  { id: '20', title: 'FASE 5: Chat integrado e funcionalidades de IA', status: 'pending', category: 'ai', icon: Brain },
  { id: '21', title: 'FASE 6: Portal web para pacientes', status: 'pending', category: 'portal', icon: Users },
  { id: '22', title: 'FASE 6: App mobile React Native', status: 'pending', category: 'mobile', icon: Smartphone },
  { id: '27', title: 'NEON DB: Configurar banco PostgreSQL', status: 'pending', category: 'deploy', icon: Database },
  { id: '28', title: 'RAILWAY BACKEND: Deploy serviço Flask', status: 'pending', category: 'deploy', icon: Cloud },
  { id: '29', title: 'RAILWAY FRONTEND: Deploy Next.js SSR', status: 'pending', category: 'deploy', icon: Cloud },
];

const categories = {
  setup: { name: 'Setup Inicial', color: 'bg-blue-500', count: 2 },
  auth: { name: 'Autenticação', color: 'bg-green-500', count: 2 },
  patients: { name: 'Pacientes', color: 'bg-purple-500', count: 4 },
  schedule: { name: 'Agenda', color: 'bg-orange-500', count: 3 },
  exercises: { name: 'Exercícios', color: 'bg-teal-500', count: 2 },
  education: { name: 'Mentoria', color: 'bg-indigo-500', count: 1 },
  protocols: { name: 'Protocolos', color: 'bg-pink-500', count: 2 },
  projects: { name: 'Projetos', color: 'bg-yellow-500', count: 1 },
  analytics: { name: 'Analytics', color: 'bg-red-500', count: 1 },
  ai: { name: 'Inteligência Artificial', color: 'bg-violet-500', count: 2 },
  portal: { name: 'Portal Paciente', color: 'bg-cyan-500', count: 1 },
  mobile: { name: 'Mobile App', color: 'bg-emerald-500', count: 1 },
  deploy: { name: 'Deploy & Infraestrutura', color: 'bg-slate-500', count: 3 },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="w-5 h-5 text-blue-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500">Concluído</Badge>;
    case 'in_progress':
      return <Badge variant="default" className="bg-blue-500">Em Progresso</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
};

export default function FisioFlowProgress() {
  const completedTasks = todoItems.filter(item => item.status === 'completed').length;
  const totalTasks = todoItems.length;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            FisioFlow - Sistema de Gestão para Clínicas
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Desenvolvimento completo com monorepo, IA integrada e deploy automatizado
          </p>
          
          <div className="max-w-md mx-auto mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso Geral</span>
              <span>{completedTasks}/{totalTasks} tarefas</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-sm text-gray-500 mt-1">
              {progressPercentage.toFixed(1)}% concluído
            </p>
          </div>
        </div>

        {/* Categories Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(categories).map(([key, category]) => {
            const categoryTasks = todoItems.filter(item => item.category === key);
            const completedInCategory = categoryTasks.filter(item => item.status === 'completed').length;
            
            return (
              <Card key={key} className="text-center">
                <CardContent className="p-4">
                  <div className={`w-12 h-12 ${category.color} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                    <div className="text-white font-bold text-sm">
                      {completedInCategory}/{category.count}
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-gray-900">{category.name}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tasks by Category */}
        {Object.entries(categories).map(([categoryKey, category]) => {
          const categoryTasks = todoItems.filter(item => item.category === categoryKey);
          
          return (
            <Card key={categoryKey} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center`}>
                    {categoryTasks[0] && <categoryTasks[0].icon className="w-4 h-4 text-white" />}
                  </div>
                  {category.name}
                  <Badge variant="outline">
                    {categoryTasks.filter(t => t.status === 'completed').length}/{categoryTasks.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Tarefas relacionadas a {category.name.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <span className={`${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Next Steps */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Próximos Passos</CardTitle>
            <CardDescription className="text-blue-700">
              Continue o desenvolvimento seguindo a sequência planejada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <Shield className="w-5 h-5 text-blue-500" />
                <span className="font-medium">1. Implementar sistema de autenticação</span>
                <Badge className="bg-blue-500">Próximo</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="font-medium">2. Desenvolver módulo de pacientes</span>
                <Badge variant="outline">Em breve</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="font-medium">3. Criar sistema de agendamentos</span>
                <Badge variant="outline">Em breve</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}