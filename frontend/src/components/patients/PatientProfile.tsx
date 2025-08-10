'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Contact, 
  MapPin, 
  Shield,
  FileText,
  Phone,
  Mail,
  Calendar,
  Heart,
  GraduationCap,
  Briefcase,
  UserCheck,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { patientService, Patient, PatientStats } from '@/services/patients';
import { useAuth } from '@/contexts/AuthContext';

interface PatientProfileProps {
  patientId: string;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({ patientId }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError('');

      const [patientData, statsData] = await Promise.all([
        patientService.getPatient(patientId),
        user?.role && ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'].includes(user.role) 
          ? patientService.getPatientStats(patientId) 
          : Promise.resolve(null)
      ]);
      
      setPatient(patientData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do paciente');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatAge = (age?: number) => {
    if (!age) return '-';
    return `${age} anos`;
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

  const getBloodTypeDisplay = (bloodType?: string) => {
    return bloodType === 'DESCONHECIDO' ? 'Desconhecido' : bloodType || '-';
  };

  const getMaritalStatusDisplay = (status?: string) => {
    const statusMap: Record<string, string> = {
      'SOLTEIRO': 'Solteiro(a)',
      'CASADO': 'Casado(a)',
      'DIVORCIADO': 'Divorciado(a)',
      'VIUVO': 'Viúvo(a)',
      'UNIAO_ESTAVEL': 'União Estável',
      'OUTRO': 'Outro',
    };
    return statusMap[status || ''] || '-';
  };

  const getEducationDisplay = (education?: string) => {
    const educationMap: Record<string, string> = {
      'FUNDAMENTAL': 'Ensino Fundamental',
      'MEDIO': 'Ensino Médio',
      'TECNICO': 'Técnico',
      'SUPERIOR': 'Superior',
      'POS_GRADUACAO': 'Pós-graduação',
      'OUTRO': 'Outro',
    };
    return educationMap[education || ''] || '-';
  };

  const canEdit = user?.role && ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'].includes(user.role);
  const canViewMedical = user?.role && ['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'].includes(user.role);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>Paciente não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.nome_completo}
            </h1>
            {patient.nome_social && (
              <p className="text-gray-600 mt-1">
                Nome social: {patient.nome_social}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant={patient.is_active ? 'default' : 'secondary'}
            className={patient.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
          >
            {patient.is_active ? 'Ativo' : 'Inativo'}
          </Badge>

          {canEdit && (
            <Button
              onClick={() => router.push(`/patients/${patientId}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards (only for professionals) */}
      {canViewMedical && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prontuários</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_records}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_evolutions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duração</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.treatment_duration_days}</div>
              <p className="text-xs text-muted-foreground">dias de tratamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessão Média</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.average_session_duration)}</div>
              <p className="text-xs text-muted-foreground">minutos por sessão</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Contact className="h-4 w-4" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Emergência
          </TabsTrigger>
          {canViewMedical && (
            <TabsTrigger value="medical" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Prontuários
            </TabsTrigger>
          )}
        </TabsList>

        {/* Personal Data */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </div>
                  <div className="font-medium">
                    {formatDate(patient.data_nascimento)}
                    {patient.age && (
                      <span className="text-gray-500 ml-2">({formatAge(patient.age)})</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <User className="h-4 w-4" />
                    Gênero
                  </div>
                  <div className="font-medium">{getGenderDisplay(patient.genero)}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Heart className="h-4 w-4" />
                    Tipo Sanguíneo
                  </div>
                  <div className="font-medium">{getBloodTypeDisplay(patient.tipo_sanguineo)}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Estado Civil</div>
                  <div className="font-medium">{getMaritalStatusDisplay(patient.estado_civil)}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <GraduationCap className="h-4 w-4" />
                    Escolaridade
                  </div>
                  <div className="font-medium">{getEducationDisplay(patient.escolaridade)}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Briefcase className="h-4 w-4" />
                    Profissão
                  </div>
                  <div className="font-medium">{patient.profissao || '-'}</div>
                </div>
              </div>

              {patient.observacoes && (
                <div className="mt-6">
                  <div className="text-sm text-gray-500 mb-1">Observações</div>
                  <div className="font-medium bg-gray-50 p-3 rounded-md">
                    {patient.observacoes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patient.telefone_masked && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Phone className="h-4 w-4" />
                      Telefone Principal
                    </div>
                    <div className="font-medium">{patient.telefone_masked}</div>
                  </div>
                )}

                {patient.email && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <div className="font-medium">{patient.email}</div>
                  </div>
                )}

                {(!patient.telefone_masked && !patient.email) && (
                  <div className="text-center py-8 text-gray-500">
                    <Contact className="mx-auto h-12 w-12 mb-4" />
                    <p>Nenhuma informação de contato cadastrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.endereco && Object.keys(patient.endereco).length > 0 ? (
                <div className="space-y-2">
                  {patient.endereco.logradouro && (
                    <div>
                      <span className="font-medium">{patient.endereco.logradouro}</span>
                      {patient.endereco.numero && <span>, {patient.endereco.numero}</span>}
                      {patient.endereco.complemento && <span> - {patient.endereco.complemento}</span>}
                    </div>
                  )}
                  {patient.endereco.bairro && (
                    <div>Bairro: {patient.endereco.bairro}</div>
                  )}
                  {(patient.endereco.cidade || patient.endereco.estado) && (
                    <div>
                      {patient.endereco.cidade}{patient.endereco.cidade && patient.endereco.estado && ' - '}{patient.endereco.estado}
                    </div>
                  )}
                  {patient.endereco.cep && (
                    <div>CEP: {patient.endereco.cep}</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="mx-auto h-12 w-12 mb-4" />
                  <p>Nenhum endereço cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Contatos de Emergência</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.emergency_contacts && patient.emergency_contacts.length > 0 ? (
                <div className="space-y-4">
                  {patient.emergency_contacts.map((contact, index) => (
                    <div key={contact.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{contact.nome}</h4>
                        <Badge variant="outline">
                          {contact.tipo_contato.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {contact.parentesco && (
                        <p className="text-sm text-gray-600 mb-2">
                          Parentesco: {contact.parentesco}
                        </p>
                      )}
                      
                      <div className="space-y-1">
                        {contact.telefone_masked && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3" />
                            {contact.telefone_masked}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="mx-auto h-12 w-12 mb-4" />
                  <p>Nenhum contato de emergência cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Records (only for professionals) */}
        {canViewMedical && (
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Prontuários Médicos</CardTitle>
                    <CardDescription>
                      Histórico médico e acompanhamento
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push(`/patients/${patientId}/medical-records/new`)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Novo Prontuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {patient.medical_records && patient.medical_records.length > 0 ? (
                  <div className="space-y-4">
                    {patient.medical_records.map((record) => (
                      <div
                        key={record.id}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/medical-records/${record.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">
                            Avaliação de {formatDate(record.data_avaliacao)}
                          </h4>
                          {record.cid10 && (
                            <Badge variant="outline">CID: {record.cid10}</Badge>
                          )}
                        </div>
                        
                        {record.queixa_principal && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Queixa Principal:</span> {record.queixa_principal}
                          </p>
                        )}
                        
                        {record.diagnostico_fisioterapeutico && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Diagnóstico:</span> {record.diagnostico_fisioterapeutico}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>Nenhum prontuário médico cadastrado</p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push(`/patients/${patientId}/medical-records/new`)}
                    >
                      Criar Primeiro Prontuário
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* LGPD Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Informações de Consentimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant={patient.consentimento_dados ? 'default' : 'secondary'}
                className={patient.consentimento_dados ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {patient.consentimento_dados ? 'Consentiu' : 'Não consentiu'}
              </Badge>
              <span className="text-sm">Tratamento de dados pessoais</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={patient.consentimento_imagem ? 'default' : 'secondary'}
                className={patient.consentimento_imagem ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {patient.consentimento_imagem ? 'Consentiu' : 'Não consentiu'}
              </Badge>
              <span className="text-sm">Uso de imagem</span>
            </div>
            
            {patient.data_consentimento && (
              <p className="text-sm text-gray-500 mt-2">
                Data do consentimento: {formatDate(patient.data_consentimento)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};