'use client';

import { apiService } from './api';

// Types for Patient Management
export interface Patient {
  id: string;
  user_id?: string;
  nome_completo: string;
  nome_social?: string;
  cpf_masked?: string;
  telefone_masked?: string;
  data_nascimento?: string;
  genero?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';
  tipo_sanguineo?: string;
  estado_civil?: string;
  escolaridade?: string;
  profissao?: string;
  email?: string;
  endereco?: any;
  is_active: boolean;
  observacoes?: string;
  consentimento_dados: boolean;
  consentimento_imagem: boolean;
  data_consentimento?: string;
  age?: number;
  created_at: string;
  updated_at?: string;
  emergency_contacts?: EmergencyContact[];
  medical_records?: MedicalRecord[];
}

export interface EmergencyContact {
  id: string;
  nome: string;
  tipo_contato: 'FAMILIAR' | 'AMIGO' | 'COLEGA' | 'CUIDADOR' | 'OUTRO';
  parentesco?: string;
  telefone_masked?: string;
  email?: string;
  endereco?: any;
  observacoes?: string;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  created_by: string;
  queixa_principal?: string;
  historia_doenca_atual?: string;
  historia_patologica_pregressa?: string;
  historia_familiar?: string;
  medicamentos_uso?: string;
  alergias?: string;
  inspecao?: string;
  palpacao?: string;
  amplitude_movimento?: any;
  forca_muscular?: any;
  testes_especiais?: any;
  escalas_funcionais?: any;
  objetivos_tratamento?: string;
  diagnostico_fisioterapeutico?: string;
  cid10?: string;
  plano_tratamento?: string;
  prognostico?: string;
  data_avaliacao: string;
  created_at: string;
  updated_at?: string;
  evolutions?: Evolution[];
}

export interface Evolution {
  id: string;
  medical_record_id: string;
  created_by: string;
  subjetivo?: string;
  objetivo?: string;
  avaliacao?: string;
  plano?: string;
  data_atendimento: string;
  duracao_minutos?: number;
  tecnicas_utilizadas?: any;
  exercicios_realizados?: any;
  escala_dor?: number;
  observacoes_clinicas?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreatePatientData {
  nome_completo: string;
  nome_social?: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  genero?: string;
  tipo_sanguineo?: string;
  estado_civil?: string;
  escolaridade?: string;
  profissao?: string;
  telefone?: string;
  telefone_alternativo?: string;
  email?: string;
  endereco?: any;
  observacoes?: string;
  consentimento_dados: boolean;
  consentimento_imagem?: boolean;
  emergency_contacts?: CreateEmergencyContactData[];
}

export interface CreateEmergencyContactData {
  nome: string;
  tipo_contato: string;
  parentesco?: string;
  telefone?: string;
  email?: string;
  endereco?: any;
  observacoes?: string;
}

export interface PaginatedPatientsResponse {
  patients: Patient[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
    has_prev: boolean;
    has_next: boolean;
  };
}

export interface PatientStats {
  patient_name: string;
  total_records: number;
  total_evolutions: number;
  latest_evaluation?: string;
  pain_evolution: Array<{
    date: string;
    pain_level: number;
  }>;
  treatment_duration_days: number;
  average_session_duration: number;
}

class PatientService {
  // Patient CRUD
  async createPatient(data: CreatePatientData): Promise<{ message: string; patient: Patient }> {
    return await apiService.request({
      method: 'POST',
      url: '/api/v1/patients/',
      data,
    });
  }

  async getPatients(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<PaginatedPatientsResponse> {
    return await apiService.request({
      method: 'GET',
      url: '/api/v1/patients/',
      params,
    });
  }

  async getPatient(patientId: string): Promise<Patient> {
    return await apiService.request({
      method: 'GET',
      url: `/api/v1/patients/${patientId}`,
    });
  }

  async updatePatient(patientId: string, data: Partial<CreatePatientData>): Promise<{ message: string; patient: Patient }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/patients/${patientId}`,
      data,
    });
  }

  async deletePatient(patientId: string): Promise<{ message: string }> {
    return await apiService.request({
      method: 'DELETE',
      url: `/api/v1/patients/${patientId}`,
    });
  }

  // Emergency Contacts
  async addEmergencyContact(patientId: string, data: CreateEmergencyContactData): Promise<{ message: string; contact: EmergencyContact }> {
    return await apiService.request({
      method: 'POST',
      url: `/api/v1/patients/${patientId}/emergency-contacts`,
      data,
    });
  }

  async updateEmergencyContact(contactId: string, data: Partial<CreateEmergencyContactData>): Promise<{ message: string; contact: EmergencyContact }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/patients/emergency-contacts/${contactId}`,
      data,
    });
  }

  async deleteEmergencyContact(contactId: string): Promise<{ message: string }> {
    return await apiService.request({
      method: 'DELETE',
      url: `/api/v1/patients/emergency-contacts/${contactId}`,
    });
  }

  // Medical Records
  async createMedicalRecord(data: any): Promise<{ message: string; medical_record: MedicalRecord }> {
    return await apiService.request({
      method: 'POST',
      url: '/api/v1/medical-records/',
      data,
    });
  }

  async getMedicalRecord(recordId: string): Promise<MedicalRecord> {
    return await apiService.request({
      method: 'GET',
      url: `/api/v1/medical-records/${recordId}`,
    });
  }

  async updateMedicalRecord(recordId: string, data: any): Promise<{ message: string; medical_record: MedicalRecord }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/medical-records/${recordId}`,
      data,
    });
  }

  async getPatientMedicalRecords(patientId: string): Promise<{ medical_records: MedicalRecord[]; patient_name: string }> {
    return await apiService.request({
      method: 'GET',
      url: `/api/v1/medical-records/patient/${patientId}`,
    });
  }

  // Evolutions
  async createEvolution(recordId: string, data: any): Promise<{ message: string; evolution: Evolution }> {
    return await apiService.request({
      method: 'POST',
      url: `/api/v1/medical-records/${recordId}/evolutions`,
      data,
    });
  }

  async updateEvolution(evolutionId: string, data: any): Promise<{ message: string; evolution: Evolution }> {
    return await apiService.request({
      method: 'PUT',
      url: `/api/v1/medical-records/evolutions/${evolutionId}`,
      data,
    });
  }

  async deleteEvolution(evolutionId: string): Promise<{ message: string }> {
    return await apiService.request({
      method: 'DELETE',
      url: `/api/v1/medical-records/evolutions/${evolutionId}`,
    });
  }

  // Stats
  async getPatientStats(patientId: string): Promise<PatientStats> {
    return await apiService.request({
      method: 'GET',
      url: `/api/v1/medical-records/stats/${patientId}`,
    });
  }
}

export const patientService = new PatientService();
export default patientService;