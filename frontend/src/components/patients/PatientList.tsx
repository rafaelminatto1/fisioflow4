'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  UserX, 
  Users,
  Calendar,
  Phone,
  Mail,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { patientService, Patient, PaginatedPatientsResponse } from '@/services/patients';
import { useAuth } from '@/contexts/AuthContext';

export const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0,
    has_prev: false,
    has_next: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { user } = useAuth();
  const router = useRouter();

  const loadPatients = async (page: number = 1) => {
    try {
      setLoading(true);
      setError('');

      const params: any = {
        page,
        per_page: pagination.per_page,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }

      const response: PaginatedPatientsResponse = await patientService.getPatients(params);
      
      setPatients(response.patients);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
  }, [search, statusFilter]);

  const handlePageChange = (newPage: number) => {
    loadPatients(newPage);
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/patients/${patientId}`);
  };

  const handleEditPatient = (patientId: string) => {
    router.push(`/patients/${patientId}/edit`);
  };

  const handleDeactivatePatient = async (patientId: string) => {
    if (!window.confirm('Tem certeza que deseja desativar este paciente?')) return;

    try {
      await patientService.updatePatient(patientId, { is_active: false });
      await loadPatients(pagination.page);
    } catch (err: any) {
      setError(err.message || 'Erro ao desativar paciente');
    }
  };

  const formatAge = (age?: number) => {
    if (!age) return '-';
    return `${age} anos`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getGenderDisplay = (gender?: string) => {
    const genderMap: Record<string, string> = {
      'MASCULINO': 'Masculino',
      'FEMININO': 'Feminino',
      'OUTRO': 'Outro',
      'NAO_INFORMADO': 'Não informado',
    };
    return genderMap[gender || ''] || '-';
  };

  // Verificar permissões
  const canCreatePatient = user?.role && ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'].includes(user.role);
  const canEditPatient = user?.role && ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'].includes(user.role);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os pacientes da clínica
          </p>
        </div>
        
        {canCreatePatient && (
          <Button 
            onClick={() => router.push('/patients/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pacientes ({pagination.total})
              </CardTitle>
              <CardDescription>
                {loading ? 'Carregando...' : `Página ${pagination.page} de ${pagination.pages}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-gray-500 mt-2">Nenhum paciente encontrado</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{patient.nome_completo}</div>
                          {patient.nome_social && (
                            <div className="text-sm text-gray-500">
                              Nome social: {patient.nome_social}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.telefone_masked && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {patient.telefone_masked}
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatAge(patient.age)}</TableCell>
                      <TableCell>{getGenderDisplay(patient.genero)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={patient.is_active ? 'default' : 'secondary'}
                          className={patient.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                        >
                          {patient.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(patient.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPatient(patient.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {canEditPatient && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPatient(patient.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {patient.is_active && user?.role === 'ADMIN' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeactivatePatient(patient.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Mostrando {((pagination.page - 1) * pagination.per_page) + 1} a {Math.min(pagination.page * pagination.per_page, pagination.total)} de {pagination.total} resultados
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.has_prev}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.has_next}
                      className="flex items-center gap-1"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};