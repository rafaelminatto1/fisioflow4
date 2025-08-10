"""
Modelos para gestão de pacientes e prontuários
"""

import secrets
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, DateTime, Date, Boolean, Text, JSON, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.hybrid import hybrid_property
import enum

from app import db
from app.utils.encryption import encrypt_data, decrypt_data
from app.models.user import User


class BloodType(enum.Enum):
    """Tipos sanguíneos"""
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "DESCONHECIDO"


class MaritalStatus(enum.Enum):
    """Estado civil"""
    SINGLE = "SOLTEIRO"
    MARRIED = "CASADO"
    DIVORCED = "DIVORCIADO"
    WIDOWED = "VIUVO"
    STABLE_UNION = "UNIAO_ESTAVEL"
    OTHER = "OUTRO"


class Gender(enum.Enum):
    """Gênero"""
    MALE = "MASCULINO"
    FEMALE = "FEMININO"
    OTHER = "OUTRO"
    NOT_INFORMED = "NAO_INFORMADO"


class EducationLevel(enum.Enum):
    """Nível de escolaridade"""
    ELEMENTARY = "FUNDAMENTAL"
    HIGH_SCHOOL = "MEDIO"
    TECHNICAL = "TECNICO"
    UNDERGRADUATE = "SUPERIOR"
    GRADUATE = "POS_GRADUACAO"
    OTHER = "OUTRO"


class EmergencyContactType(enum.Enum):
    """Tipo de contato de emergência"""
    FAMILY = "FAMILIAR"
    FRIEND = "AMIGO"
    COLLEAGUE = "COLEGA"
    CAREGIVER = "CUIDADOR"
    OTHER = "OUTRO"


class Patient(db.Model):
    """Modelo principal de pacientes"""
    __tablename__ = 'patients'

    # Identificação
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Dados básicos (alguns criptografados)
    nome_completo: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_social: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cpf_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rg_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Informações pessoais
    genero: Mapped[Optional[Gender]] = mapped_column(SQLEnum(Gender), nullable=True)
    tipo_sanguineo: Mapped[Optional[BloodType]] = mapped_column(SQLEnum(BloodType), nullable=True)
    estado_civil: Mapped[Optional[MaritalStatus]] = mapped_column(SQLEnum(MaritalStatus), nullable=True)
    escolaridade: Mapped[Optional[EducationLevel]] = mapped_column(SQLEnum(EducationLevel), nullable=True)
    profissao: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Contato (criptografado)
    telefone_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    telefone_alternativo_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Endereço (JSON com dados possivelmente sensíveis)
    endereco: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Status e controle
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # LGPD
    consentimento_dados: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consentimento_imagem: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    data_consentimento: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user: Mapped[Optional[User]] = relationship("User", back_populates="patient_profile")
    medical_records: Mapped[List["MedicalRecord"]] = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", lazy="dynamic")
    
    @hybrid_property
    def cpf(self) -> Optional[str]:
        """Desencripta e retorna o CPF"""
        if self.cpf_encrypted:
            return decrypt_data(self.cpf_encrypted)
        return None
    
    @cpf.setter
    def cpf(self, value: Optional[str]) -> None:
        """Encripta e armazena o CPF"""
        if value:
            self.cpf_encrypted = encrypt_data(value)
        else:
            self.cpf_encrypted = None
    
    @hybrid_property
    def rg(self) -> Optional[str]:
        """Desencripta e retorna o RG"""
        if self.rg_encrypted:
            return decrypt_data(self.rg_encrypted)
        return None
    
    @rg.setter
    def rg(self, value: Optional[str]) -> None:
        """Encripta e armazena o RG"""
        if value:
            self.rg_encrypted = encrypt_data(value)
        else:
            self.rg_encrypted = None
    
    @hybrid_property
    def telefone(self) -> Optional[str]:
        """Desencripta e retorna o telefone"""
        if self.telefone_encrypted:
            return decrypt_data(self.telefone_encrypted)
        return None
    
    @telefone.setter
    def telefone(self, value: Optional[str]) -> None:
        """Encripta e armazena o telefone"""
        if value:
            self.telefone_encrypted = encrypt_data(value)
        else:
            self.telefone_encrypted = None
    
    @hybrid_property
    def telefone_alternativo(self) -> Optional[str]:
        """Desencripta e retorna o telefone alternativo"""
        if self.telefone_alternativo_encrypted:
            return decrypt_data(self.telefone_alternativo_encrypted)
        return None
    
    @telefone_alternativo.setter
    def telefone_alternativo(self, value: Optional[str]) -> None:
        """Encripta e armazena o telefone alternativo"""
        if value:
            self.telefone_alternativo_encrypted = encrypt_data(value)
        else:
            self.telefone_alternativo_encrypted = None
    
    @property
    def cpf_masked(self) -> Optional[str]:
        """Retorna CPF mascarado para exibição"""
        cpf = self.cpf
        if cpf and len(cpf) == 11:
            return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        return cpf
    
    @property
    def telefone_masked(self) -> Optional[str]:
        """Retorna telefone mascarado para exibição"""
        telefone = self.telefone
        if telefone:
            # Remove caracteres não numéricos
            numbers = ''.join(filter(str.isdigit, telefone))
            if len(numbers) == 11:  # Celular
                return f"({numbers[:2]}) {numbers[2:7]}-{numbers[7:]}"
            elif len(numbers) == 10:  # Fixo
                return f"({numbers[:2]}) {numbers[2:6]}-{numbers[6:]}"
        return telefone
    
    @property
    def age(self) -> Optional[int]:
        """Calcula e retorna a idade"""
        if self.data_nascimento:
            today = date.today()
            return today.year - self.data_nascimento.year - (
                (today.month, today.day) < (self.data_nascimento.month, self.data_nascimento.day)
            )
        return None
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'nome_completo': self.nome_completo,
            'nome_social': self.nome_social,
            'data_nascimento': self.data_nascimento.isoformat() if self.data_nascimento else None,
            'genero': self.genero.value if self.genero else None,
            'tipo_sanguineo': self.tipo_sanguineo.value if self.tipo_sanguineo else None,
            'estado_civil': self.estado_civil.value if self.estado_civil else None,
            'escolaridade': self.escolaridade.value if self.escolaridade else None,
            'profissao': self.profissao,
            'email': self.email,
            'endereco': self.endereco,
            'is_active': self.is_active,
            'observacoes': self.observacoes,
            'consentimento_dados': self.consentimento_dados,
            'consentimento_imagem': self.consentimento_imagem,
            'data_consentimento': self.data_consentimento.isoformat() if self.data_consentimento else None,
            'age': self.age,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data.update({
                'cpf': self.cpf,
                'rg': self.rg,
                'telefone': self.telefone,
                'telefone_alternativo': self.telefone_alternativo,
            })
        else:
            data.update({
                'cpf_masked': self.cpf_masked,
                'telefone_masked': self.telefone_masked,
            })
        
        return data


class EmergencyContact(db.Model):
    """Contatos de emergência do paciente"""
    __tablename__ = 'emergency_contacts'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_contato: Mapped[EmergencyContactType] = mapped_column(SQLEnum(EmergencyContactType), nullable=False)
    parentesco: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Dados de contato (criptografados)
    telefone_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    endereco: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relacionamentos
    patient: Mapped[Patient] = relationship("Patient", back_populates="emergency_contacts")
    
    @hybrid_property
    def telefone(self) -> Optional[str]:
        if self.telefone_encrypted:
            return decrypt_data(self.telefone_encrypted)
        return None
    
    @telefone.setter
    def telefone(self, value: Optional[str]) -> None:
        if value:
            self.telefone_encrypted = encrypt_data(value)
        else:
            self.telefone_encrypted = None
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'nome': self.nome,
            'tipo_contato': self.tipo_contato.value,
            'parentesco': self.parentesco,
            'email': self.email,
            'endereco': self.endereco,
            'observacoes': self.observacoes,
            'created_at': self.created_at.isoformat(),
        }
        
        if include_sensitive:
            data['telefone'] = self.telefone
        else:
            telefone = self.telefone
            if telefone:
                numbers = ''.join(filter(str.isdigit, telefone))
                if len(numbers) >= 10:
                    data['telefone_masked'] = f"({numbers[:2]}) ****-{numbers[-4:]}"
                else:
                    data['telefone_masked'] = "****-****"
            else:
                data['telefone_masked'] = None
        
        return data


class MedicalRecord(db.Model):
    """Prontuário médico do paciente"""
    __tablename__ = 'medical_records'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    # Anamnese
    queixa_principal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    historia_doenca_atual: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    historia_patologica_pregressa: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    historia_familiar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medicamentos_uso: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alergias: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Exame físico inicial
    inspecao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    palpacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amplitude_movimento: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    forca_muscular: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    testes_especiais: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Avaliação funcional
    escalas_funcionais: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    objetivos_tratamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Diagnóstico e plano
    diagnostico_fisioterapeutico: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cid10: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    plano_tratamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prognostico: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Controle
    data_avaliacao: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relacionamentos
    patient: Mapped[Patient] = relationship("Patient", back_populates="medical_records")
    created_by_user: Mapped[User] = relationship("User")
    evolutions: Mapped[List["Evolution"]] = relationship("Evolution", back_populates="medical_record", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'created_by': self.created_by,
            'queixa_principal': self.queixa_principal,
            'historia_doenca_atual': self.historia_doenca_atual,
            'historia_patologica_pregressa': self.historia_patologica_pregressa,
            'historia_familiar': self.historia_familiar,
            'medicamentos_uso': self.medicamentos_uso,
            'alergias': self.alergias,
            'inspecao': self.inspecao,
            'palpacao': self.palpacao,
            'amplitude_movimento': self.amplitude_movimento,
            'forca_muscular': self.forca_muscular,
            'testes_especiais': self.testes_especiais,
            'escalas_funcionais': self.escalas_funcionais,
            'objetivos_tratamento': self.objetivos_tratamento,
            'diagnostico_fisioterapeutico': self.diagnostico_fisioterapeutico,
            'cid10': self.cid10,
            'plano_tratamento': self.plano_tratamento,
            'prognostico': self.prognostico,
            'data_avaliacao': self.data_avaliacao.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Evolution(db.Model):
    """Evolução/acompanhamento do tratamento"""
    __tablename__ = 'evolutions'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    medical_record_id: Mapped[str] = mapped_column(String(36), ForeignKey('medical_records.id', ondelete='CASCADE'), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    # SOAP Notes
    subjetivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # S - Subjetivo
    objetivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # O - Objetivo
    avaliacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # A - Avaliação
    plano: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # P - Plano
    
    # Dados específicos da sessão
    data_atendimento: Mapped[date] = mapped_column(Date, nullable=False)
    duracao_minutos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Técnicas e recursos utilizados
    tecnicas_utilizadas: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    exercicios_realizados: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Evolução clínica
    escala_dor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0-10
    observacoes_clinicas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Controle
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relacionamentos
    medical_record: Mapped[MedicalRecord] = relationship("MedicalRecord", back_populates="evolutions")
    created_by_user: Mapped[User] = relationship("User")
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            'id': self.id,
            'medical_record_id': self.medical_record_id,
            'created_by': self.created_by,
            'subjetivo': self.subjetivo,
            'objetivo': self.objetivo,
            'avaliacao': self.avaliacao,
            'plano': self.plano,
            'data_atendimento': self.data_atendimento.isoformat(),
            'duracao_minutos': self.duracao_minutos,
            'tecnicas_utilizadas': self.tecnicas_utilizadas,
            'exercicios_realizados': self.exercicios_realizados,
            'escala_dor': self.escala_dor,
            'observacoes_clinicas': self.observacoes_clinicas,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# Atualizar relacionamento no modelo User
User.patient_profile = relationship("Patient", back_populates="user", uselist=False)