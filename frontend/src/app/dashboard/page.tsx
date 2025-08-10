'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Settings, Calendar, Users, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  return (
    <PrivateRoute>
      <DashboardContent />
    </PrivateRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'FISIOTERAPEUTA': return 'bg-blue-100 text-blue-800';
      case 'ESTAGIARIO': return 'bg-green-100 text-green-800';
      case 'PACIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'PARCEIRO': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'FISIOTERAPEUTA': return 'Fisioterapeuta';
      case 'ESTAGIARIO': return 'Estagiário';
      case 'PACIENTE': return 'Paciente';
      case 'PARCEIRO': return 'Parceiro';
      default: return role;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">FisioFlow</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.profile?.nome_completo || user?.email}
                </span>
                <Badge className={getRoleColor(user?.role || '')}>
                  {getRoleDisplay(user?.role || '')}
                </Badge>
              </div>
              
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Bem-vindo, {user?.profile?.nome_completo || user?.email.split('@')[0]}!
          </h2>
          <p className="text-gray-600 mt-1">
            Aqui está o resumo das suas atividades no FisioFlow
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exercícios</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ativo</div>
              <p className="text-xs text-muted-foreground">Sistema operacional</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {(user?.role === 'ADMIN' || user?.role === 'FISIOTERAPEUTA' || user?.role === 'ESTAGIARIO') && (
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Acesse rapidamente as principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => window.location.href = '/patients'}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <Users className="h-6 w-6" />
                  Gerenciar Pacientes
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/patients/new'}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                >
                  <User className="h-6 w-6" />
                  Novo Paciente
                </Button>
                
                <Button
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  variant="outline"
                  disabled
                >
                  <Calendar className="h-6 w-6" />
                  Agenda (Em breve)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Sistema em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Parabéns! Você fez login com sucesso no FisioFlow. O sistema de gestão de pacientes
              está operacional e pronto para uso!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Funcionalidades Disponíveis:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Gestão completa de pacientes</li>
                  <li>✅ Sistema de autenticação</li>
                  <li>✅ Controle de permissões por role</li>
                  <li>✅ Criptografia de dados sensíveis</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Em Desenvolvimento:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sistema de agendamento</li>
                  <li>• Biblioteca de exercícios</li>
                  <li>• Dashboard analítico</li>
                  <li>• App mobile</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Suas informações:</strong> {user?.email} | {getRoleDisplay(user?.role || '')} | 
                {user?.is_active ? ' Ativo' : ' Inativo'}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}