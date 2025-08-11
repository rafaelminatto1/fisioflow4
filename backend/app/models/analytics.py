"""
Modelos para analytics e dashboard executivo
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from uuid import uuid4
from enum import Enum
import json

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import func, case, extract

from . import db
from .appointment import Appointment, AppointmentStatus
from .patient import Patient
from .user import User
from .medical_record import MedicalRecord
from .exercise import Exercise, PatientExercise, ExerciseExecution
from .project_management import Project, Task, TaskStatus
from .clinical_protocols import ClinicalProtocol, ProtocolApplication


class MetricType(Enum):
    """Tipos de métricas"""
    OPERATIONAL = "operacional"
    FINANCIAL = "financeiro"
    CLINICAL = "clinico"
    ENGAGEMENT = "engajamento"
    QUALITY = "qualidade"


class MetricFrequency(Enum):
    """Frequência de cálculo das métricas"""
    DAILY = "diario"
    WEEKLY = "semanal"
    MONTHLY = "mensal"
    QUARTERLY = "trimestral"
    YEARLY = "anual"


class DashboardMetric(db.Model):
    """Métricas calculadas para dashboard"""
    __tablename__ = 'dashboard_metrics'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Identificação da métrica
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # ex: "revenue_monthly"
    metric_name: Mapped[str] = mapped_column(String(200), nullable=False)
    metric_type: Mapped[MetricType] = mapped_column(db.Enum(MetricType), nullable=False, index=True)
    
    # Valor e metadados
    value: Mapped[float] = mapped_column(Float, nullable=False)
    previous_value: Mapped[Optional[float]] = mapped_column(Float)
    target_value: Mapped[Optional[float]] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="")  # ex: "R$", "%", "hrs"
    
    # Período de referência
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    frequency: Mapped[MetricFrequency] = mapped_column(db.Enum(MetricFrequency), nullable=False)
    
    # Contexto adicional
    dimensions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # Filtros aplicados
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # Dados auxiliares
    
    # Timestamps
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    @hybrid_property
    def change_percentage(self):
        """Variação percentual em relação ao período anterior"""
        if not self.previous_value or self.previous_value == 0:
            return None
        return ((self.value - self.previous_value) / self.previous_value) * 100
    
    @hybrid_property
    def target_achievement(self):
        """Percentual de atingimento da meta"""
        if not self.target_value or self.target_value == 0:
            return None
        return (self.value / self.target_value) * 100
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'id': self.id,
            'metric_key': self.metric_key,
            'metric_name': self.metric_name,
            'metric_type': self.metric_type.value,
            'value': self.value,
            'previous_value': self.previous_value,
            'target_value': self.target_value,
            'unit': self.unit,
            'change_percentage': round(self.change_percentage, 2) if self.change_percentage is not None else None,
            'target_achievement': round(self.target_achievement, 2) if self.target_achievement is not None else None,
            'period_start': self.period_start.isoformat(),
            'period_end': self.period_end.isoformat(),
            'frequency': self.frequency.value,
            'dimensions': self.dimensions,
            'metadata': self.metadata,
            'calculated_at': self.calculated_at.isoformat()
        }


class AnalyticsSnapshot(db.Model):
    """Snapshots de analytics para histórico"""
    __tablename__ = 'analytics_snapshots'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    snapshot_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # ex: "daily", "weekly"
    
    # Dados do snapshot
    metrics_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    # Metadados
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'id': self.id,
            'snapshot_date': self.snapshot_date.isoformat(),
            'snapshot_type': self.snapshot_type,
            'metrics_data': self.metrics_data,
            'created_at': self.created_at.isoformat()
        }


class KPICalculator:
    """Classe para cálculo de KPIs e métricas"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    def calculate_operational_metrics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calcula métricas operacionais"""
        
        # Agendamentos
        total_appointments = self.db.query(Appointment).filter(
            Appointment.appointment_date.between(start_date, end_date)
        ).count()
        
        completed_appointments = self.db.query(Appointment).filter(
            Appointment.appointment_date.between(start_date, end_date),
            Appointment.status == AppointmentStatus.CONCLUIDO
        ).count()
        
        cancelled_appointments = self.db.query(Appointment).filter(
            Appointment.appointment_date.between(start_date, end_date),
            Appointment.status == AppointmentStatus.CANCELADO
        ).count()
        
        no_show_appointments = self.db.query(Appointment).filter(
            Appointment.appointment_date.between(start_date, end_date),
            Appointment.status == AppointmentStatus.FALTA
        ).count()
        
        # Taxa de ocupação (assumindo 8h/dia, 5 dias/semana)
        working_days = self._count_working_days(start_date, end_date)
        available_slots = working_days * 16  # 16 slots de 30min por dia
        occupation_rate = (total_appointments / available_slots * 100) if available_slots > 0 else 0
        
        # Novos pacientes
        new_patients = self.db.query(Patient).filter(
            func.date(Patient.created_at).between(start_date, end_date)
        ).count()
        
        # Pacientes ativos (com agendamento no período)
        active_patients = self.db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.appointment_date.between(start_date, end_date),
            Appointment.status.in_([AppointmentStatus.AGENDADO, AppointmentStatus.CONCLUIDO])
        ).scalar()
        
        return {
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'no_show_appointments': no_show_appointments,
            'completion_rate': (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0,
            'cancellation_rate': (cancelled_appointments / total_appointments * 100) if total_appointments > 0 else 0,
            'no_show_rate': (no_show_appointments / total_appointments * 100) if total_appointments > 0 else 0,
            'occupation_rate': round(occupation_rate, 2),
            'new_patients': new_patients,
            'active_patients': active_patients or 0,
            'available_slots': available_slots,
            'working_days': working_days
        }
    
    def calculate_clinical_metrics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calcula métricas clínicas"""
        
        # Evoluções médicas
        total_records = self.db.query(MedicalRecord).filter(
            func.date(MedicalRecord.created_at).between(start_date, end_date)
        ).count()
        
        # Protocolos aplicados
        protocols_applied = self.db.query(ProtocolApplication).filter(
            ProtocolApplication.start_date.between(start_date, end_date)
        ).count()
        
        protocols_completed = self.db.query(ProtocolApplication).filter(
            ProtocolApplication.start_date.between(start_date, end_date),
            ProtocolApplication.completion_status == 'concluido'
        ).count()
        
        # Exercícios prescritos e executados
        exercises_prescribed = self.db.query(PatientExercise).filter(
            func.date(PatientExercise.created_at).between(start_date, end_date)
        ).count()
        
        exercises_executed = self.db.query(ExerciseExecution).filter(
            func.date(ExerciseExecution.execution_date).between(start_date, end_date)
        ).count()
        
        # Aderência aos exercícios
        if exercises_prescribed > 0:
            # Calcular execuções esperadas vs realizadas
            expected_executions = self.db.query(func.sum(PatientExercise.frequency_per_week * 4)).filter(
                func.date(PatientExercise.created_at).between(start_date, end_date)
            ).scalar() or 0
            
            adherence_rate = (exercises_executed / expected_executions * 100) if expected_executions > 0 else 0
        else:
            adherence_rate = 0
        
        return {
            'total_medical_records': total_records,
            'protocols_applied': protocols_applied,
            'protocols_completed': protocols_completed,
            'protocol_completion_rate': (protocols_completed / protocols_applied * 100) if protocols_applied > 0 else 0,
            'exercises_prescribed': exercises_prescribed,
            'exercises_executed': exercises_executed,
            'exercise_adherence_rate': round(adherence_rate, 2)
        }
    
    def calculate_engagement_metrics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calcula métricas de engajamento"""
        
        # Usuários ativos (com login no período) - assumindo que temos um campo last_login
        # Como não temos esse campo, vamos usar criação de registros como proxy
        active_therapists = self.db.query(func.count(func.distinct(MedicalRecord.created_by))).filter(
            func.date(MedicalRecord.created_at).between(start_date, end_date)
        ).scalar() or 0
        
        # Pacientes com execução de exercícios
        engaged_patients = self.db.query(func.count(func.distinct(ExerciseExecution.patient_id))).filter(
            func.date(ExerciseExecution.execution_date).between(start_date, end_date)
        ).scalar() or 0
        
        # Taxa de retorno (pacientes que voltaram após primeira consulta)
        # Simplificado: pacientes com mais de 1 agendamento
        returning_patients = self.db.query(Appointment.patient_id).filter(
            Appointment.appointment_date.between(start_date, end_date)
        ).group_by(Appointment.patient_id).having(func.count(Appointment.id) > 1).count()
        
        total_patients_period = self.db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.appointment_date.between(start_date, end_date)
        ).scalar() or 0
        
        return {
            'active_therapists': active_therapists,
            'engaged_patients': engaged_patients,
            'returning_patients': returning_patients,
            'patient_retention_rate': (returning_patients / total_patients_period * 100) if total_patients_period > 0 else 0,
            'total_unique_patients': total_patients_period
        }
    
    def calculate_quality_metrics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calcula métricas de qualidade"""
        
        # Tempo médio entre agendamento e atendimento
        avg_waiting_time_query = self.db.query(
            func.avg(func.julianday(Appointment.appointment_date) - func.julianday(Appointment.created_at))
        ).filter(
            Appointment.appointment_date.between(start_date, end_date),
            Appointment.status == AppointmentStatus.CONCLUIDO
        ).scalar()
        
        avg_waiting_days = avg_waiting_time_query or 0
        
        # Protocolos baseados em evidência (nível A)
        evidence_based_protocols = self.db.query(ClinicalProtocol).filter(
            ClinicalProtocol.grade_recommendation == 'A',
            ClinicalProtocol.status == 'ativo'
        ).count()
        
        total_protocols = self.db.query(ClinicalProtocol).filter(
            ClinicalProtocol.status == 'ativo'
        ).count()
        
        # Documentação completa (evoluções com todos os campos SOAP preenchidos)
        complete_records = self.db.query(MedicalRecord).filter(
            func.date(MedicalRecord.created_at).between(start_date, end_date),
            MedicalRecord.subjective.isnot(None),
            MedicalRecord.objective.isnot(None),
            MedicalRecord.assessment.isnot(None),
            MedicalRecord.plan.isnot(None),
            MedicalRecord.subjective != '',
            MedicalRecord.objective != '',
            MedicalRecord.assessment != '',
            MedicalRecord.plan != ''
        ).count()
        
        total_records = self.db.query(MedicalRecord).filter(
            func.date(MedicalRecord.created_at).between(start_date, end_date)
        ).count()
        
        return {
            'avg_waiting_days': round(avg_waiting_days, 1),
            'evidence_based_protocols': evidence_based_protocols,
            'total_protocols': total_protocols,
            'evidence_based_percentage': (evidence_based_protocols / total_protocols * 100) if total_protocols > 0 else 0,
            'complete_documentation_rate': (complete_records / total_records * 100) if total_records > 0 else 0,
            'total_records': total_records,
            'complete_records': complete_records
        }
    
    def calculate_project_metrics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calcula métricas de projetos"""
        
        # Projetos ativos
        active_projects = self.db.query(Project).filter(
            Project.status == 'ativo',
            Project.is_archived == False
        ).count()
        
        # Tarefas por status
        total_tasks = self.db.query(Task).filter(
            func.date(Task.created_at) <= end_date,
            Task.is_archived == False
        ).count()
        
        completed_tasks_period = self.db.query(Task).filter(
            func.date(Task.updated_at).between(start_date, end_date),
            Task.status == TaskStatus.DONE
        ).count()
        
        overdue_tasks = self.db.query(Task).filter(
            Task.due_date < end_date,
            Task.status != TaskStatus.DONE,
            Task.is_archived == False
        ).count()
        
        # Velocity (story points concluídos no período)
        velocity = self.db.query(func.sum(Task.story_points)).filter(
            func.date(Task.updated_at).between(start_date, end_date),
            Task.status == TaskStatus.DONE,
            Task.story_points.isnot(None)
        ).scalar() or 0
        
        return {
            'active_projects': active_projects,
            'total_tasks': total_tasks,
            'completed_tasks_period': completed_tasks_period,
            'overdue_tasks': overdue_tasks,
            'velocity': velocity,
            'on_time_delivery_rate': ((total_tasks - overdue_tasks) / total_tasks * 100) if total_tasks > 0 else 100
        }
    
    def _count_working_days(self, start_date: date, end_date: date) -> int:
        """Conta dias úteis no período (segunda a sexta)"""
        current_date = start_date
        working_days = 0
        
        while current_date <= end_date:
            if current_date.weekday() < 5:  # 0-4 são seg-sex
                working_days += 1
            current_date += timedelta(days=1)
        
        return working_days
    
    def generate_dashboard_snapshot(self, reference_date: date = None) -> Dict[str, Any]:
        """Gera snapshot completo do dashboard"""
        
        if not reference_date:
            reference_date = date.today()
        
        # Períodos de análise
        start_of_month = reference_date.replace(day=1)
        start_of_week = reference_date - timedelta(days=reference_date.weekday())
        
        # Calcular métricas
        operational = self.calculate_operational_metrics(start_of_month, reference_date)
        clinical = self.calculate_clinical_metrics(start_of_month, reference_date)
        engagement = self.calculate_engagement_metrics(start_of_month, reference_date)
        quality = self.calculate_quality_metrics(start_of_month, reference_date)
        project = self.calculate_project_metrics(start_of_month, reference_date)
        
        return {
            'snapshot_date': reference_date.isoformat(),
            'period': {
                'start': start_of_month.isoformat(),
                'end': reference_date.isoformat(),
                'type': 'monthly'
            },
            'operational': operational,
            'clinical': clinical,
            'engagement': engagement,
            'quality': quality,
            'project': project,
            'summary': {
                'total_patients_treated': operational['active_patients'],
                'total_sessions_completed': operational['completed_appointments'],
                'overall_efficiency': round((operational['completion_rate'] + quality['complete_documentation_rate']) / 2, 1),
                'patient_satisfaction_proxy': round(100 - operational['no_show_rate'], 1)  # Proxy usando taxa de faltas
            }
        }