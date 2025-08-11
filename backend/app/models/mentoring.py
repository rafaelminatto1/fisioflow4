"""
Modelos para sistema de mentoria e ensino
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from uuid import uuid4
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property

from . import db


class CompetencyLevel(Enum):
    """Níveis de competência"""
    NOVATO = "novato"
    INICIANTE = "iniciante" 
    INTERMEDIARIO = "intermediario"
    AVANCADO = "avancado"
    ESPECIALISTA = "especialista"


class EvaluationStatus(Enum):
    """Status de avaliação"""
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    APROVADA = "aprovada"
    REPROVADA = "reprovada"


class CaseComplexity(Enum):
    """Complexidade dos casos clínicos"""
    BASICO = "basico"
    INTERMEDIARIO = "intermediario"
    AVANCADO = "avancado"
    COMPLEXO = "complexo"


class Intern(db.Model):
    """Modelo para estagiários em mentoria"""
    __tablename__ = 'interns'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False, unique=True)
    mentor_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Informações acadêmicas
    university: Mapped[str] = mapped_column(String(200), nullable=False)
    course_year: Mapped[int] = mapped_column(Integer, nullable=False)  # Ano do curso
    graduation_year: Mapped[int] = mapped_column(Integer, nullable=False)  # Ano de formação previsto
    
    # Período de estágio
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours_required: Mapped[int] = mapped_column(Integer, nullable=False)  # Horas obrigatórias
    hours_completed: Mapped[int] = mapped_column(Integer, default=0)
    
    # Áreas de interesse/especialização
    specialization_areas: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    learning_objectives: Mapped[Optional[str]] = mapped_column(Text)
    
    # Nível atual de competência por área
    competency_levels: Mapped[Dict[str, str]] = mapped_column(JSON, default=dict)  # {area: level}
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id], backref="intern_profile")
    mentor = relationship("User", foreign_keys=[mentor_id], backref="mentored_interns")
    evaluations = relationship("CompetencyEvaluation", back_populates="intern", cascade="all, delete-orphan")
    case_assignments = relationship("EducationalCase", back_populates="assigned_intern")
    learning_activities = relationship("LearningActivity", back_populates="intern")

    @hybrid_property
    def progress_percentage(self):
        """Calcula porcentagem de progresso do estágio"""
        if self.hours_required == 0:
            return 0
        return min((self.hours_completed / self.hours_required) * 100, 100)

    @hybrid_property
    def days_remaining(self):
        """Dias restantes do estágio"""
        today = date.today()
        if today > self.end_date:
            return 0
        return (self.end_date - today).days

    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'mentor_id': self.mentor_id,
            'university': self.university,
            'course_year': self.course_year,
            'graduation_year': self.graduation_year,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'hours_required': self.hours_required,
            'hours_completed': self.hours_completed,
            'specialization_areas': self.specialization_areas,
            'learning_objectives': self.learning_objectives,
            'competency_levels': self.competency_levels,
            'is_active': self.is_active,
            'progress_percentage': self.progress_percentage,
            'days_remaining': self.days_remaining,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_details:
            data.update({
                'user': self.user.to_dict() if self.user else None,
                'mentor': self.mentor.to_dict() if self.mentor else None
            })
        
        return data


class EducationalCase(db.Model):
    """Casos clínicos educacionais"""
    __tablename__ = 'educational_cases'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Classificação do caso
    complexity: Mapped[CaseComplexity] = mapped_column(db.Enum(CaseComplexity), nullable=False, index=True)
    specialization_areas: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    pathologies: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    
    # Conteúdo do caso
    patient_history: Mapped[str] = mapped_column(Text, nullable=False)
    clinical_presentation: Mapped[str] = mapped_column(Text, nullable=False)
    examination_findings: Mapped[Optional[str]] = mapped_column(Text)
    diagnostic_tests: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    images: Mapped[Optional[List[str]]] = mapped_column(JSON)  # URLs das imagens
    
    # Objetivos de aprendizagem
    learning_objectives: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    expected_competencies: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    
    # Questões e respostas
    questions: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False)
    # Formato: [{"question": "...", "options": [...], "correct_answer": 0, "explanation": "..."}]
    
    # Tratamento sugerido
    suggested_treatment: Mapped[Optional[str]] = mapped_column(Text)
    treatment_rationale: Mapped[Optional[str]] = mapped_column(Text)
    
    # Atribuição
    assigned_intern_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('interns.id'), index=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    
    # Controle
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    creator = relationship("User", foreign_keys=[created_by], backref="created_cases")
    assigned_intern = relationship("Intern", back_populates="case_assignments")
    submissions = relationship("CaseSubmission", back_populates="case", cascade="all, delete-orphan")

    @hybrid_property
    def is_overdue(self):
        """Verifica se o caso está em atraso"""
        if not self.due_date:
            return False
        return date.today() > self.due_date

    def to_dict(self, include_details=False, include_answers=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'complexity': self.complexity.value,
            'specialization_areas': self.specialization_areas,
            'pathologies': self.pathologies,
            'patient_history': self.patient_history,
            'clinical_presentation': self.clinical_presentation,
            'examination_findings': self.examination_findings,
            'diagnostic_tests': self.diagnostic_tests,
            'images': self.images or [],
            'learning_objectives': self.learning_objectives,
            'expected_competencies': self.expected_competencies,
            'assigned_intern_id': self.assigned_intern_id,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'is_overdue': self.is_overdue,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Questões (com ou sem respostas)
        if include_answers:
            data['questions'] = self.questions
        else:
            # Remove respostas corretas e explicações
            data['questions'] = [
                {
                    'question': q.get('question'),
                    'options': q.get('options', [])
                }
                for q in self.questions
            ]
        
        if include_details:
            data.update({
                'suggested_treatment': self.suggested_treatment,
                'treatment_rationale': self.treatment_rationale,
                'creator': self.creator.to_dict() if self.creator else None,
                'assigned_intern': self.assigned_intern.to_dict() if self.assigned_intern else None
            })
        
        return data


class CaseSubmission(db.Model):
    """Submissões de casos pelos estagiários"""
    __tablename__ = 'case_submissions'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey('educational_cases.id'), nullable=False)
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey('interns.id'), nullable=False)
    
    # Respostas do estagiário
    answers: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Formato: {"question_0": 2, "question_1": 1, ...}
    
    # Análise clínica do estagiário
    clinical_analysis: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_treatment: Mapped[str] = mapped_column(Text, nullable=False)
    differential_diagnosis: Mapped[Optional[str]] = mapped_column(Text)
    
    # Avaliação automática
    score: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    correct_answers: Mapped[Optional[int]] = mapped_column(Integer)
    total_questions: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Status e timing
    status: Mapped[EvaluationStatus] = mapped_column(db.Enum(EvaluationStatus), default=EvaluationStatus.PENDENTE)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id'))
    
    # Feedback do mentor
    mentor_feedback: Mapped[Optional[str]] = mapped_column(Text)
    mentor_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    improvement_areas: Mapped[Optional[List[str]]] = mapped_column(JSON)
    strengths: Mapped[Optional[List[str]]] = mapped_column(JSON)
    
    # Relacionamentos
    case = relationship("EducationalCase", back_populates="submissions")
    intern = relationship("Intern")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    @hybrid_property
    def final_score(self):
        """Pontuação final considerando avaliação automática e do mentor"""
        if self.mentor_score is not None:
            return self.mentor_score
        return self.score or 0

    @hybrid_property
    def is_passed(self):
        """Verifica se passou na avaliação (>= 70%)"""
        return self.final_score >= 70

    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'case_id': self.case_id,
            'intern_id': self.intern_id,
            'answers': self.answers,
            'clinical_analysis': self.clinical_analysis,
            'proposed_treatment': self.proposed_treatment,
            'differential_diagnosis': self.differential_diagnosis,
            'score': self.score,
            'correct_answers': self.correct_answers,
            'total_questions': self.total_questions,
            'status': self.status.value,
            'submitted_at': self.submitted_at.isoformat(),
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'mentor_feedback': self.mentor_feedback,
            'mentor_score': self.mentor_score,
            'improvement_areas': self.improvement_areas or [],
            'strengths': self.strengths or [],
            'final_score': self.final_score,
            'is_passed': self.is_passed
        }
        
        if include_details:
            data.update({
                'case': self.case.to_dict() if self.case else None,
                'intern': self.intern.to_dict() if self.intern else None,
                'reviewer': self.reviewer.to_dict() if self.reviewer else None
            })
        
        return data


class CompetencyEvaluation(db.Model):
    """Avaliações de competência"""
    __tablename__ = 'competency_evaluations'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey('interns.id'), nullable=False)
    evaluator_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Tipo de avaliação
    evaluation_type: Mapped[str] = mapped_column(String(100), nullable=False)  # "inicial", "mensal", "final", etc.
    period: Mapped[str] = mapped_column(String(100), nullable=False)  # "2024-01", "Semestre 1", etc.
    
    # Competências avaliadas
    competencies: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    # Formato: {"competency_name": {"score": 8, "notes": "...", "level": "intermediario"}}
    
    # Avaliação geral
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-10
    overall_level: Mapped[CompetencyLevel] = mapped_column(db.Enum(CompetencyLevel), nullable=False)
    
    # Feedback detalhado
    strengths: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    weaknesses: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    recommendations: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    development_plan: Mapped[Optional[str]] = mapped_column(Text)
    
    # Objetivos para próxima avaliação
    next_objectives: Mapped[Optional[List[str]]] = mapped_column(JSON)
    
    # Status
    status: Mapped[EvaluationStatus] = mapped_column(db.Enum(EvaluationStatus), default=EvaluationStatus.EM_ANDAMENTO)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relacionamentos
    intern = relationship("Intern", back_populates="evaluations")
    evaluator = relationship("User", backref="conducted_evaluations")

    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'intern_id': self.intern_id,
            'evaluator_id': self.evaluator_id,
            'evaluation_type': self.evaluation_type,
            'period': self.period,
            'competencies': self.competencies,
            'overall_score': self.overall_score,
            'overall_level': self.overall_level.value,
            'strengths': self.strengths,
            'weaknesses': self.weaknesses,
            'recommendations': self.recommendations,
            'development_plan': self.development_plan,
            'next_objectives': self.next_objectives or [],
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
        
        if include_details:
            data.update({
                'intern': self.intern.to_dict() if self.intern else None,
                'evaluator': self.evaluator.to_dict() if self.evaluator else None
            })
        
        return data


class LearningActivity(db.Model):
    """Atividades de aprendizagem"""
    __tablename__ = 'learning_activities'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    intern_id: Mapped[str] = mapped_column(String(36), ForeignKey('interns.id'), nullable=False)
    supervisor_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Detalhes da atividade
    activity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # "atendimento", "observacao", "estudo", etc.
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Duração e data
    date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Paciente (se aplicável)
    patient_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('patients.id'))
    
    # Competências trabalhadas
    competencies_practiced: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    
    # Avaliação da atividade
    intern_reflection: Mapped[Optional[str]] = mapped_column(Text)
    supervisor_feedback: Mapped[Optional[str]] = mapped_column(Text)
    performance_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-10
    
    # Status
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relacionamentos
    intern = relationship("Intern", back_populates="learning_activities")
    supervisor = relationship("User", backref="supervised_activities")
    patient = relationship("Patient", backref="intern_activities")

    def to_dict(self, include_details=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'intern_id': self.intern_id,
            'supervisor_id': self.supervisor_id,
            'activity_type': self.activity_type,
            'title': self.title,
            'description': self.description,
            'date': self.date.isoformat(),
            'duration_hours': self.duration_hours,
            'patient_id': self.patient_id,
            'competencies_practiced': self.competencies_practiced,
            'intern_reflection': self.intern_reflection,
            'supervisor_feedback': self.supervisor_feedback,
            'performance_score': self.performance_score,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat(),
            'approved_at': self.approved_at.isoformat() if self.approved_at else None
        }
        
        if include_details:
            data.update({
                'intern': self.intern.to_dict() if self.intern else None,
                'supervisor': self.supervisor.to_dict() if self.supervisor else None,
                'patient': self.patient.to_dict() if self.patient else None
            })
        
        return data