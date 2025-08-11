"""
Modelos para protocolos clínicos baseados em evidência
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from uuid import uuid4
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property

from . import db


class EvidenceLevel(Enum):
    """Níveis de evidência científica"""
    NIVEL_1A = "1a"  # Revisão sistemática de RCTs
    NIVEL_1B = "1b"  # RCT individual
    NIVEL_2A = "2a"  # Revisão sistemática de estudos de coorte
    NIVEL_2B = "2b"  # Estudo de coorte individual
    NIVEL_3A = "3a"  # Revisão sistemática de caso-controle
    NIVEL_3B = "3b"  # Estudo caso-controle individual
    NIVEL_4 = "4"    # Série de casos
    NIVEL_5 = "5"    # Opinião de especialista


class ProtocolStatus(Enum):
    """Status dos protocolos"""
    DRAFT = "rascunho"
    REVIEW = "revisao"
    APPROVED = "aprovado"
    ACTIVE = "ativo"
    ARCHIVED = "arquivado"
    DEPRECATED = "descontinuado"


class InterventionType(Enum):
    """Tipos de intervenção"""
    EXERCISE = "exercicio"
    MANUAL_THERAPY = "terapia_manual"
    ELECTROTHERAPY = "eletroterapia"
    EDUCATION = "educacao"
    MODALITY = "modalidade"
    PHARMACOLOGICAL = "farmacologica"
    PSYCHOLOGICAL = "psicologica"
    LIFESTYLE = "estilo_vida"


class ClinicalProtocol(db.Model):
    """Protocolos clínicos baseados em evidência"""
    __tablename__ = 'clinical_protocols'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Classificação
    pathology: Mapped[str] = mapped_column(String(200), nullable=False, index=True)  # ex: "Lombalgia"
    icd10_codes: Mapped[List[str]] = mapped_column(JSON, nullable=False)  # Códigos CID-10
    body_region: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex: "coluna_lombar"
    specialization_area: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex: "ortopedia"
    
    # Evidência científica
    evidence_level: Mapped[EvidenceLevel] = mapped_column(db.Enum(EvidenceLevel), nullable=False, index=True)
    grade_recommendation: Mapped[str] = mapped_column(String(10), nullable=False)  # A, B, C, D
    references: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False)  # Referências bibliográficas
    
    # Conteúdo do protocolo
    indications: Mapped[List[str]] = mapped_column(JSON, nullable=False)  # Indicações
    contraindications: Mapped[List[str]] = mapped_column(JSON, nullable=False)  # Contraindicações
    precautions: Mapped[List[str]] = mapped_column(JSON, nullable=False)  # Precauções
    
    # Fases do protocolo
    phases: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Formato: [{
    #   "name": "Fase Aguda",
    #   "duration": "0-72 horas", 
    #   "objectives": [...],
    #   "interventions": [...],
    #   "progression_criteria": [...]
    # }]
    
    # Avaliação e outcomes
    assessment_tools: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Formato: [{
    #   "name": "Escala Visual Analógica",
    #   "abbreviation": "EVA",
    #   "description": "Avaliação da dor",
    #   "frequency": "diária"
    # }]
    
    outcome_measures: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Formato: [{
    #   "measure": "Redução da dor",
    #   "target": "> 50%",
    #   "timeframe": "4 semanas"
    # }]
    
    # Parâmetros de dosagem
    frequency_recommendations: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Formato: {
    #   "sessions_per_week": "2-3",
    #   "session_duration": "45-60 minutos",
    #   "total_duration": "4-6 semanas"
    # }
    
    # Critérios de inclusão/exclusão
    inclusion_criteria: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    exclusion_criteria: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    
    # Modificações por população
    population_modifications: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "elderly": {"modifications": [...], "precautions": [...]},
    #   "athletes": {"modifications": [...], "considerations": [...]}
    # }
    
    # Status e controle
    status: Mapped[ProtocolStatus] = mapped_column(db.Enum(ProtocolStatus), default=ProtocolStatus.DRAFT, index=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id'))
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id'))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Uso e estatísticas
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relacionamentos
    creator = relationship("User", foreign_keys=[created_by], backref="created_protocols")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reviewed_protocols")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_protocols")
    applications = relationship("ProtocolApplication", back_populates="protocol", cascade="all, delete-orphan")
    
    @hybrid_property
    def is_current(self):
        """Verifica se é a versão atual do protocolo"""
        return self.status == ProtocolStatus.ACTIVE
    
    @hybrid_property
    def total_references(self):
        """Número total de referências"""
        return len(self.references) if self.references else 0
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'pathology': self.pathology,
            'icd10_codes': self.icd10_codes,
            'body_region': self.body_region,
            'specialization_area': self.specialization_area,
            'evidence_level': self.evidence_level.value,
            'grade_recommendation': self.grade_recommendation,
            'indications': self.indications,
            'contraindications': self.contraindications,
            'precautions': self.precautions,
            'status': self.status.value,
            'version': self.version,
            'usage_count': self.usage_count,
            'total_references': self.total_references,
            'is_current': self.is_current,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'phases': self.phases,
                'assessment_tools': self.assessment_tools,
                'outcome_measures': self.outcome_measures,
                'frequency_recommendations': self.frequency_recommendations,
                'inclusion_criteria': self.inclusion_criteria,
                'exclusion_criteria': self.exclusion_criteria,
                'population_modifications': self.population_modifications,
                'references': self.references,
                'creator': self.creator.to_dict() if self.creator else None,
                'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
                'approved_at': self.approved_at.isoformat() if self.approved_at else None,
                'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
            })
        
        return data


class ProtocolApplication(db.Model):
    """Aplicação de protocolos a pacientes específicos"""
    __tablename__ = 'protocol_applications'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    protocol_id: Mapped[str] = mapped_column(String(36), ForeignKey('clinical_protocols.id'), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id'), nullable=False)
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Dados da aplicação
    start_date: Mapped[date] = mapped_column(db.Date, nullable=False)
    expected_end_date: Mapped[Optional[date]] = mapped_column(db.Date)
    actual_end_date: Mapped[Optional[date]] = mapped_column(db.Date)
    
    # Personalização
    customizations: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "modified_phases": [...],
    #   "excluded_interventions": [...],
    #   "additional_precautions": [...],
    #   "dosage_modifications": {...}
    # }
    
    # Progresso atual
    current_phase: Mapped[int] = mapped_column(Integer, default=0)  # Índice da fase atual
    phase_progress: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "phase_0": {"started": "2024-01-01", "completed": null, "progress": 75},
    #   "phase_1": {"started": null, "completed": null, "progress": 0}
    # }
    
    # Avaliações e outcomes
    baseline_assessment: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    progress_assessments: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "2024-01-01": {"eva_dor": 8, "rom_flexao": 45, "forca_quadriceps": 3},
    #   "2024-01-15": {"eva_dor": 5, "rom_flexao": 60, "forca_quadriceps": 4}
    # }
    
    outcome_achievement: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    # Formato: {
    #   "dor_reducao": {"target": ">50%", "achieved": "62%", "status": "met"},
    #   "funcao_melhora": {"target": ">25%", "achieved": "15%", "status": "partial"}
    # }
    
    # Status e notas
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    completion_status: Mapped[str] = mapped_column(String(50), default="em_andamento")  # em_andamento, concluido, interrompido
    completion_reason: Mapped[Optional[str]] = mapped_column(Text)
    therapist_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    protocol = relationship("ClinicalProtocol", back_populates="applications")
    patient = relationship("Patient", backref="protocol_applications")
    therapist = relationship("User", backref="applied_protocols")
    
    @hybrid_property
    def duration_days(self):
        """Duração em dias da aplicação"""
        end_date = self.actual_end_date or date.today()
        return (end_date - self.start_date).days
    
    @hybrid_property
    def overall_progress_percentage(self):
        """Progresso geral em porcentagem"""
        if not self.phase_progress:
            return 0
        
        total_phases = len(self.protocol.phases) if self.protocol else 1
        completed_phases = sum(1 for phase_data in self.phase_progress.values() 
                             if phase_data.get('progress', 0) == 100)
        current_phase_progress = self.phase_progress.get(f'phase_{self.current_phase}', {}).get('progress', 0)
        
        return ((completed_phases + (current_phase_progress / 100)) / total_phases) * 100
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'protocol_id': self.protocol_id,
            'patient_id': self.patient_id,
            'therapist_id': self.therapist_id,
            'start_date': self.start_date.isoformat(),
            'expected_end_date': self.expected_end_date.isoformat() if self.expected_end_date else None,
            'actual_end_date': self.actual_end_date.isoformat() if self.actual_end_date else None,
            'current_phase': self.current_phase,
            'is_active': self.is_active,
            'completion_status': self.completion_status,
            'duration_days': self.duration_days,
            'overall_progress_percentage': round(self.overall_progress_percentage, 1),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'customizations': self.customizations,
                'phase_progress': self.phase_progress,
                'baseline_assessment': self.baseline_assessment,
                'progress_assessments': self.progress_assessments,
                'outcome_achievement': self.outcome_achievement,
                'completion_reason': self.completion_reason,
                'therapist_notes': self.therapist_notes,
                'protocol': self.protocol.to_dict() if self.protocol else None,
                'patient': self.patient.to_dict() if self.patient else None,
                'therapist': self.therapist.to_dict() if self.therapist else None
            })
        
        return data


class InterventionTemplate(db.Model):
    """Templates de intervenções para protocolos"""
    __tablename__ = 'intervention_templates'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    intervention_type: Mapped[InterventionType] = mapped_column(db.Enum(InterventionType), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex: "fortalecimento", "mobilidade"
    
    # Descrição da intervenção
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detailed_instructions: Mapped[str] = mapped_column(Text, nullable=False)
    equipment_needed: Mapped[List[str]] = mapped_column(JSON, default=list)
    
    # Parâmetros de dosagem
    default_dosage: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Formato: {
    #   "sets": "3",
    #   "repetitions": "10-15",
    #   "hold_time": "30s",
    #   "rest": "60s",
    #   "frequency": "3x/semana",
    #   "intensity": "moderada"
    # }
    
    # Progressão
    progression_criteria: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    progression_modifications: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    # Formato: [{
    #   "level": "iniciante",
    #   "modifications": {"repetitions": "8-12", "intensity": "leve"}
    # }]
    
    # Segurança
    contraindications: Mapped[List[str]] = mapped_column(JSON, default=list)
    precautions: Mapped[List[str]] = mapped_column(JSON, default=list)
    red_flags: Mapped[List[str]] = mapped_column(JSON, default=list)  # Sinais de alerta
    
    # Evidência científica
    evidence_references: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    evidence_level: Mapped[EvidenceLevel] = mapped_column(db.Enum(EvidenceLevel), nullable=False)
    
    # Recursos multimídia
    images: Mapped[List[str]] = mapped_column(JSON, default=list)  # URLs das imagens
    videos: Mapped[List[str]] = mapped_column(JSON, default=list)  # URLs dos vídeos
    
    # Controle
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    creator = relationship("User", backref="created_interventions")
    
    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'name': self.name,
            'intervention_type': self.intervention_type.value,
            'category': self.category,
            'description': self.description,
            'equipment_needed': self.equipment_needed,
            'evidence_level': self.evidence_level.value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'detailed_instructions': self.detailed_instructions,
                'default_dosage': self.default_dosage,
                'progression_criteria': self.progression_criteria,
                'progression_modifications': self.progression_modifications,
                'contraindications': self.contraindications,
                'precautions': self.precautions,
                'red_flags': self.red_flags,
                'evidence_references': self.evidence_references,
                'images': self.images,
                'videos': self.videos,
                'creator': self.creator.to_dict() if self.creator else None
            })
        
        return data