"""
Modelos para sistema de exercícios e biblioteca terapêutica
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from uuid import uuid4
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property

from . import db


class ExerciseCategory(Enum):
    """Categorias de exercícios"""
    FORTALECIMENTO = "fortalecimento"
    ALONGAMENTO = "alongamento"
    MOBILIDADE = "mobilidade"
    EQUILIBRIO = "equilibrio"
    COORDENACAO = "coordenacao"
    CARDIO = "cardio"
    RESPIRATORIO = "respiratorio"
    PROPRIOCEPCAO = "propriocepcao"
    RELAXAMENTO = "relaxamento"
    FUNCIONAL = "funcional"


class ExerciseDifficulty(Enum):
    """Níveis de dificuldade"""
    INICIANTE = "iniciante"
    INTERMEDIARIO = "intermediario"
    AVANCADO = "avancado"
    ESPECIALISTA = "especialista"


class BodyRegion(Enum):
    """Regiões corporais"""
    CERVICAL = "cervical"
    TORACICA = "toracica"
    LOMBAR = "lombar"
    OMBRO = "ombro"
    COTOVELO = "cotovelo"
    PUNHO_MAO = "punho_mao"
    QUADRIL = "quadril"
    JOELHO = "joelho"
    TORNOZELO_PE = "tornozelo_pe"
    CORPO_TODO = "corpo_todo"
    CORE = "core"


class Exercise(db.Model):
    """Modelo para exercícios da biblioteca"""
    __tablename__ = 'exercises'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Categorização
    category: Mapped[ExerciseCategory] = mapped_column(db.Enum(ExerciseCategory), nullable=False, index=True)
    difficulty: Mapped[ExerciseDifficulty] = mapped_column(db.Enum(ExerciseDifficulty), nullable=False, index=True)
    body_regions: Mapped[List[str]] = mapped_column(JSON, nullable=False)  # Lista de BodyRegion
    
    # Mídia
    video_url: Mapped[Optional[str]] = mapped_column(String(500))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    images: Mapped[Optional[List[str]]] = mapped_column(JSON)  # URLs das imagens
    
    # Parâmetros do exercício
    default_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)  # Duração padrão
    default_repetitions: Mapped[Optional[int]] = mapped_column(Integer)  # Repetições padrão
    default_sets: Mapped[Optional[int]] = mapped_column(Integer)  # Séries padrão
    default_rest_seconds: Mapped[Optional[int]] = mapped_column(Integer)  # Descanso entre séries
    
    # Metadados
    equipment_needed: Mapped[Optional[List[str]]] = mapped_column(JSON)  # Equipamentos necessários
    contraindications: Mapped[Optional[List[str]]] = mapped_column(JSON)  # Contraindicações
    precautions: Mapped[Optional[List[str]]] = mapped_column(JSON)  # Precauções
    benefits: Mapped[Optional[List[str]]] = mapped_column(JSON)  # Benefícios
    
    # Gamificação
    points_value: Mapped[int] = mapped_column(Integer, default=10)  # Pontos por execução
    
    # Controle
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    creator = relationship("User", foreign_keys=[created_by], backref="created_exercises")
    patient_exercises = relationship("PatientExercise", back_populates="exercise", cascade="all, delete-orphan")
    executions = relationship("ExerciseExecution", back_populates="exercise", cascade="all, delete-orphan")

    @hybrid_property
    def average_rating(self):
        """Calcula avaliação média baseada nas execuções"""
        if not self.executions:
            return 0.0
        
        ratings = [e.patient_rating for e in self.executions if e.patient_rating is not None]
        return sum(ratings) / len(ratings) if ratings else 0.0

    @hybrid_property
    def total_executions(self):
        """Conta total de execuções"""
        return len(self.executions)

    def to_dict(self, include_stats=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'instructions': self.instructions,
            'category': self.category.value,
            'difficulty': self.difficulty.value,
            'body_regions': self.body_regions,
            'video_url': self.video_url,
            'thumbnail_url': self.thumbnail_url,
            'images': self.images or [],
            'default_duration_seconds': self.default_duration_seconds,
            'default_repetitions': self.default_repetitions,
            'default_sets': self.default_sets,
            'default_rest_seconds': self.default_rest_seconds,
            'equipment_needed': self.equipment_needed or [],
            'contraindications': self.contraindications or [],
            'precautions': self.precautions or [],
            'benefits': self.benefits or [],
            'points_value': self.points_value,
            'is_active': self.is_active,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_stats:
            data.update({
                'average_rating': self.average_rating,
                'total_executions': self.total_executions
            })
        
        return data


class PatientExercise(db.Model):
    """Exercícios prescritos para pacientes específicos"""
    __tablename__ = 'patient_exercises'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id'), nullable=False, index=True)
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey('exercises.id'), nullable=False, index=True)
    prescribed_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    
    # Parâmetros personalizados
    custom_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    custom_repetitions: Mapped[Optional[int]] = mapped_column(Integer)
    custom_sets: Mapped[Optional[int]] = mapped_column(Integer)
    custom_rest_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Instruções personalizadas
    therapist_notes: Mapped[Optional[str]] = mapped_column(Text)
    patient_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Cronograma
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, index=True)
    frequency_per_week: Mapped[int] = mapped_column(Integer, default=3)  # Vezes por semana
    days_of_week: Mapped[Optional[List[int]]] = mapped_column(JSON)  # [0,1,2,3,4,5,6] = Dom-Sáb
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Controle
    prescribed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    patient = relationship("Patient", backref="prescribed_exercises")
    exercise = relationship("Exercise", back_populates="patient_exercises")
    prescriber = relationship("User", foreign_keys=[prescribed_by], backref="prescribed_exercises")
    executions = relationship("ExerciseExecution", back_populates="patient_exercise", cascade="all, delete-orphan")

    @hybrid_property
    def completion_rate(self):
        """Taxa de conclusão baseada em execuções"""
        if not self.start_date:
            return 0.0
            
        # Calcular dias esperados de execução
        from datetime import datetime, timedelta
        
        end_date = self.end_date or datetime.now().date()
        days_in_period = (end_date - self.start_date).days + 1
        weeks_in_period = days_in_period / 7
        expected_executions = int(weeks_in_period * self.frequency_per_week)
        
        if expected_executions == 0:
            return 0.0
            
        actual_executions = len([e for e in self.executions if e.completed_at is not None])
        return min((actual_executions / expected_executions) * 100, 100.0)

    @property
    def effective_parameters(self):
        """Retorna parâmetros efetivos (customizados ou padrão)"""
        return {
            'duration_seconds': self.custom_duration_seconds or self.exercise.default_duration_seconds,
            'repetitions': self.custom_repetitions or self.exercise.default_repetitions,
            'sets': self.custom_sets or self.exercise.default_sets,
            'rest_seconds': self.custom_rest_seconds or self.exercise.default_rest_seconds
        }

    def to_dict(self, include_exercise=True, include_stats=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'patient_id': self.patient_id,
            'exercise_id': self.exercise_id,
            'prescribed_by': self.prescribed_by,
            'custom_duration_seconds': self.custom_duration_seconds,
            'custom_repetitions': self.custom_repetitions,
            'custom_sets': self.custom_sets,
            'custom_rest_seconds': self.custom_rest_seconds,
            'therapist_notes': self.therapist_notes,
            'patient_notes': self.patient_notes,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'frequency_per_week': self.frequency_per_week,
            'days_of_week': self.days_of_week,
            'is_active': self.is_active,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'prescribed_at': self.prescribed_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'effective_parameters': self.effective_parameters
        }
        
        if include_exercise and self.exercise:
            data['exercise'] = self.exercise.to_dict(include_stats=include_stats)
        
        if include_stats:
            data['completion_rate'] = self.completion_rate
        
        return data


class ExerciseExecution(db.Model):
    """Registro de execução de exercícios pelos pacientes"""
    __tablename__ = 'exercise_executions'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey('patient_exercises.id'), nullable=False, index=True)
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey('exercises.id'), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id'), nullable=False, index=True)
    
    # Dados da execução
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    
    # Parâmetros executados
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    repetitions_completed: Mapped[Optional[int]] = mapped_column(Integer)
    sets_completed: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Feedback do paciente
    patient_rating: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5 estrelas
    difficulty_felt: Mapped[Optional[int]] = mapped_column(Integer)  # 1-10 escala
    pain_level: Mapped[Optional[int]] = mapped_column(Integer)  # 0-10 escala de dor
    effort_level: Mapped[Optional[int]] = mapped_column(Integer)  # 1-10 escala de esforço
    patient_comments: Mapped[Optional[str]] = mapped_column(Text)
    
    # Gamificação
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    bonus_points: Mapped[int] = mapped_column(Integer, default=0)
    
    # Dados técnicos (se disponível)
    execution_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)  # Dados de sensores, etc.
    
    # Localização (opcional)
    location: Mapped[Optional[str]] = mapped_column(String(100))  # "casa", "clinica", etc.
    
    # Relacionamentos
    patient_exercise = relationship("PatientExercise", back_populates="executions")
    exercise = relationship("Exercise", back_populates="executions")
    patient = relationship("Patient", backref="exercise_executions")

    @hybrid_property
    def is_completed(self):
        """Verifica se a execução foi completada"""
        return self.completed_at is not None

    @hybrid_property
    def duration_minutes(self):
        """Duração da execução em minutos"""
        if not self.completed_at:
            return None
        return (self.completed_at - self.started_at).total_seconds() / 60

    @hybrid_property
    def completion_percentage(self):
        """Porcentagem de conclusão baseada nos parâmetros"""
        if not self.patient_exercise:
            return 0.0
            
        params = self.patient_exercise.effective_parameters
        total_score = 0
        completed_score = 0
        
        # Verificar repetições
        if params.get('repetitions'):
            total_score += 1
            if self.repetitions_completed and self.repetitions_completed >= params['repetitions']:
                completed_score += 1
        
        # Verificar séries
        if params.get('sets'):
            total_score += 1
            if self.sets_completed and self.sets_completed >= params['sets']:
                completed_score += 1
        
        # Verificar duração
        if params.get('duration_seconds'):
            total_score += 1
            if self.duration_seconds and self.duration_seconds >= params['duration_seconds']:
                completed_score += 1
        
        return (completed_score / total_score) * 100 if total_score > 0 else 0.0

    def to_dict(self, include_relations=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'patient_exercise_id': self.patient_exercise_id,
            'exercise_id': self.exercise_id,
            'patient_id': self.patient_id,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'repetitions_completed': self.repetitions_completed,
            'sets_completed': self.sets_completed,
            'patient_rating': self.patient_rating,
            'difficulty_felt': self.difficulty_felt,
            'pain_level': self.pain_level,
            'effort_level': self.effort_level,
            'patient_comments': self.patient_comments,
            'points_earned': self.points_earned,
            'bonus_points': self.bonus_points,
            'location': self.location,
            'is_completed': self.is_completed,
            'duration_minutes': self.duration_minutes,
            'completion_percentage': self.completion_percentage
        }
        
        if include_relations:
            if self.exercise:
                data['exercise'] = self.exercise.to_dict()
            if self.patient_exercise:
                data['patient_exercise'] = self.patient_exercise.to_dict(include_exercise=False)
        
        return data


class ExerciseProgram(db.Model):
    """Programas de exercícios (coleções organizadas)"""
    __tablename__ = 'exercise_programs'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Público-alvo
    target_conditions: Mapped[List[str]] = mapped_column(JSON)  # Condições/patologias
    target_body_regions: Mapped[List[str]] = mapped_column(JSON)  # Regiões corporais
    difficulty_level: Mapped[ExerciseDifficulty] = mapped_column(db.Enum(ExerciseDifficulty), nullable=False)
    
    # Duração e estrutura
    estimated_duration_weeks: Mapped[Optional[int]] = mapped_column(Integer)
    sessions_per_week: Mapped[int] = mapped_column(Integer, default=3)
    
    # Exercícios do programa (ordenados)
    exercise_sequence: Mapped[List[Dict[str, Any]]] = mapped_column(JSON)  # [{exercise_id, week, order, custom_params}]
    
    # Controle
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    creator = relationship("User", foreign_keys=[created_by], backref="created_programs")

    def to_dict(self, include_exercises=False):
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'target_conditions': self.target_conditions,
            'target_body_regions': self.target_body_regions,
            'difficulty_level': self.difficulty_level.value,
            'estimated_duration_weeks': self.estimated_duration_weeks,
            'sessions_per_week': self.sessions_per_week,
            'exercise_sequence': self.exercise_sequence,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_exercises:
            # Adicionar detalhes dos exercícios
            exercise_ids = [item['exercise_id'] for item in self.exercise_sequence]
            exercises = Exercise.query.filter(Exercise.id.in_(exercise_ids)).all()
            exercise_dict = {ex.id: ex.to_dict() for ex in exercises}
            
            data['exercises'] = []
            for item in self.exercise_sequence:
                exercise_data = exercise_dict.get(item['exercise_id'])
                if exercise_data:
                    data['exercises'].append({
                        **exercise_data,
                        'program_week': item.get('week', 1),
                        'program_order': item.get('order', 0),
                        'custom_params': item.get('custom_params', {})
                    })
        
        return data