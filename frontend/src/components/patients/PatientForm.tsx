'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  ArrowLeft, 
  User, 
  Contact, 
  MapPin, 
  Shield,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { patientService, Patient, CreatePatientData, CreateEmergencyContactData } from '@/services/patients';

interface PatientFormProps {
  patientId?: string;
  mode: 'create' | 'edit';
}

export const PatientForm: React.FC<PatientFormProps> = ({ patientId, mode }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState<CreatePatientData>({
    nome_completo: '',
    nome_social: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    genero: '',
    tipo_sanguineo: '',
    estado_civil: '',
    escolaridade: '',
    profissao: '',
    telefone: '',
    telefone_alternativo: '',
    email: '',
    endereco: {},
    observacoes: '',
    consentimento_dados: false,
    consentimento_imagem: false,
    emergency_contacts: [],
  });

  const [address, setAddress] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });

  // Load patient data if editing
  useEffect(() => {
    if (mode === 'edit' && patientId) {
      loadPatient();
    }
  }, [mode, patientId]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const patient: Patient = await patientService.getPatient(patientId!);
      
      setFormData({
        nome_completo: patient.nome_completo,
        nome_social: patient.nome_social || '',
        data_nascimento: patient.data_nascimento || '',
        genero: patient.genero || '',
        tipo_sanguineo: patient.tipo_sanguineo || '',
        estado_civil: patient.estado_civil || '',
        escolaridade: patient.escolaridade || '',
        profissao: patient.profissao || '',
        email: patient.email || '',
        observacoes: patient.observacoes || '',
        consentimento_dados: patient.consentimento_dados,
        consentimento_imagem: patient.consentimento_imagem,
        endereco: patient.endereco || {},
        emergency_contacts: patient.emergency_contacts || [],
      });

      // Set address if exists
      if (patient.endereco) {
        setAddress(patient.endereco);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do paciente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreatePatientData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const addEmergencyContact = () => {
    const newContact: CreateEmergencyContactData = {
      nome: '',
      tipo_contato: 'FAMILIAR',
      parentesco: '',
      telefone: '',
      email: '',
      observacoes: '',
    };
    
    setFormData(prev => ({
      ...prev,
      emergency_contacts: [...(prev.emergency_contacts || []), newContact]
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts?.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ) || []
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts?.filter((_, i) => i !== index) || []
    }));
  };

  const validateForm = () => {
    if (!formData.nome_completo.trim()) {
      return 'Nome completo é obrigatório';
    }

    if (!formData.consentimento_dados) {
      return 'É necessário consentir com o tratamento de dados pessoais';
    }

    // Validar CPF se fornecido
    if (formData.cpf && formData.cpf.replace(/\D/g, '').length !== 11) {
      return 'CPF deve ter 11 dígitos';
    }

    // Validar email se fornecido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Email inválido';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      // Prepare data
      const submitData = {
        ...formData,
        endereco: Object.keys(address).length > 0 ? address : undefined,
      };

      if (mode === 'create') {
        await patientService.createPatient(submitData);
        setSuccess('Paciente criado com sucesso!');
        setTimeout(() => router.push('/patients'), 2000);
      } else if (patientId) {
        await patientService.updatePatient(patientId, submitData);
        setSuccess('Paciente atualizado com sucesso!');
        setTimeout(() => router.push(`/patients/${patientId}`), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar paciente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
            {mode === 'create' ? 'Novo Paciente' : 'Editar Paciente'}
          </h1>
          <p className="text-gray-600 mt-1">
            {mode === 'create' ? 'Cadastre um novo paciente no sistema' : 'Atualize os dados do paciente'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
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
          </TabsList>

          {/* Personal Data */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Dados básicos do paciente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome_completo">
                      Nome Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nome_completo"
                      value={formData.nome_completo}
                      onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                      placeholder="Nome completo do paciente"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nome_social">Nome Social</Label>
                    <Input
                      id="nome_social"
                      value={formData.nome_social}
                      onChange={(e) => handleInputChange('nome_social', e.target.value)}
                      placeholder="Nome social (opcional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => handleInputChange('rg', e.target.value)}
                      placeholder="00.000.000-0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="genero">Gênero</Label>
                    <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MASCULINO">Masculino</SelectItem>
                        <SelectItem value="FEMININO">Feminino</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                        <SelectItem value="NAO_INFORMADO">Não informado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tipo_sanguineo">Tipo Sanguíneo</Label>
                    <Select value={formData.tipo_sanguineo} onValueChange={(value) => handleInputChange('tipo_sanguineo', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo sanguíneo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="DESCONHECIDO">Desconhecido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Select value={formData.estado_civil} onValueChange={(value) => handleInputChange('estado_civil', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado civil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                        <SelectItem value="CASADO">Casado(a)</SelectItem>
                        <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                        <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                        <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="escolaridade">Escolaridade</Label>
                    <Select value={formData.escolaridade} onValueChange={(value) => handleInputChange('escolaridade', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a escolaridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FUNDAMENTAL">Ensino Fundamental</SelectItem>
                        <SelectItem value="MEDIO">Ensino Médio</SelectItem>
                        <SelectItem value="TECNICO">Técnico</SelectItem>
                        <SelectItem value="SUPERIOR">Superior</SelectItem>
                        <SelectItem value="POS_GRADUACAO">Pós-graduação</SelectItem>
                        <SelectItem value="OUTRO">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input
                      id="profissao"
                      value={formData.profissao}
                      onChange={(e) => handleInputChange('profissao', e.target.value)}
                      placeholder="Profissão do paciente"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Observações gerais sobre o paciente"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
                <CardDescription>
                  Dados para comunicação com o paciente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone Principal</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone_alternativo">Telefone Alternativo</Label>
                    <Input
                      id="telefone_alternativo"
                      value={formData.telefone_alternativo}
                      onChange={(e) => handleInputChange('telefone_alternativo', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address */}
          <TabsContent value="address">
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                  Endereço residencial do paciente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={address.cep}
                      onChange={(e) => handleAddressChange('cep', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={address.logradouro}
                      onChange={(e) => handleAddressChange('logradouro', e.target.value)}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={address.numero}
                      onChange={(e) => handleAddressChange('numero', e.target.value)}
                      placeholder="123"
                    />
                  </div>

                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={address.complemento}
                      onChange={(e) => handleAddressChange('complemento', e.target.value)}
                      placeholder="Apt, Sala, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={address.bairro}
                      onChange={(e) => handleAddressChange('bairro', e.target.value)}
                      placeholder="Nome do bairro"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={address.cidade}
                      onChange={(e) => handleAddressChange('cidade', e.target.value)}
                      placeholder="Nome da cidade"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={address.estado}
                      onChange={(e) => handleAddressChange('estado', e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contacts */}
          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Contatos de Emergência</CardTitle>
                    <CardDescription>
                      Pessoas para contatar em caso de emergência
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={addEmergencyContact}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.emergency_contacts && formData.emergency_contacts.length > 0 ? (
                  <div className="space-y-6">
                    {formData.emergency_contacts.map((contact, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium">Contato {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmergencyContact(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              value={contact.nome}
                              onChange={(e) => updateEmergencyContact(index, 'nome', e.target.value)}
                              placeholder="Nome do contato"
                            />
                          </div>

                          <div>
                            <Label>Tipo de Contato</Label>
                            <Select 
                              value={contact.tipo_contato} 
                              onValueChange={(value) => updateEmergencyContact(index, 'tipo_contato', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FAMILIAR">Familiar</SelectItem>
                                <SelectItem value="AMIGO">Amigo</SelectItem>
                                <SelectItem value="COLEGA">Colega</SelectItem>
                                <SelectItem value="CUIDADOR">Cuidador</SelectItem>
                                <SelectItem value="OUTRO">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Parentesco</Label>
                            <Input
                              value={contact.parentesco}
                              onChange={(e) => updateEmergencyContact(index, 'parentesco', e.target.value)}
                              placeholder="Ex: Pai, Mãe, Filho..."
                            />
                          </div>

                          <div>
                            <Label>Telefone</Label>
                            <Input
                              value={contact.telefone}
                              onChange={(e) => updateEmergencyContact(index, 'telefone', e.target.value)}
                              placeholder="(11) 99999-9999"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
                              placeholder="email@exemplo.com"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="mx-auto h-12 w-12 mb-4" />
                    <p>Nenhum contato de emergência adicionado</p>
                    <p className="text-sm">Clique em "Adicionar" para incluir um contato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* LGPD Consent */}
        <Card>
          <CardHeader>
            <CardTitle>Consentimentos LGPD</CardTitle>
            <CardDescription>
              Consentimentos obrigatórios para tratamento dos dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consentimento_dados"
                checked={formData.consentimento_dados}
                onCheckedChange={(checked) => handleInputChange('consentimento_dados', checked)}
                required
              />
              <Label htmlFor="consentimento_dados" className="text-sm">
                Aceito o tratamento dos meus dados pessoais conforme a LGPD <span className="text-red-500">*</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consentimento_imagem"
                checked={formData.consentimento_imagem}
                onCheckedChange={(checked) => handleInputChange('consentimento_imagem', checked)}
              />
              <Label htmlFor="consentimento_imagem" className="text-sm">
                Autorizo o uso da minha imagem para fins terapêuticos e educacionais
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Criar Paciente' : 'Salvar Alterações'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};