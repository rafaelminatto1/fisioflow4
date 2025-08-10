"""
Modelos para sistema de agendamento
"""

import secrets
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, DateTime, Date, Boolean, Text, JSON, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.ext.hybrid import hybrid_property
import enum
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY

from app import db
from app.models.user import User
from app.models.patient import Patient


class AppointmentStatus(enum.Enum):
    """Status do agendamento"""
    SCHEDULED = "AGENDADO"
    CONFIRMED = "CONFIRMADO"
    IN_PROGRESS = "EM_ANDAMENTO"
    COMPLETED = "CONCLUIDO"
    CANCELLED = "CANCELADO"
    NO_SHOW = "FALTOU"
    RESCHEDULED = "REAGENDADO"


class AppointmentType(enum.Enum):
    """Tipo de atendimento"""
    EVALUATION = "AVALIACAO"
    TREATMENT = "TRATAMENTO"
    FOLLOWUP = "RETORNO"
    GROUP = "GRUPO"
    HOME_CARE = "DOMICILIAR"
    TELEHEALTH = "TELEMEDICINA"


class RecurrenceType(enum.Enum):
    """Tipo de recorrência"""
    DAILY = "DIARIA"
    WEEKLY = "SEMANAL"
    MONTHLY = "MENSAL"


class ReminderType(enum.Enum):
    """Tipo de lembrete"""
    EMAIL = "EMAIL"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    PUSH = "PUSH"


class Appointment(db.Model):
    """Modelo de agendamento"""
    __tablename__ = 'appointments'

    # Identificação
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    
    # Relacionamentos
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    # Agendamento básico
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM format
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)    # HH:MM format
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    
    # Tipo e status
    appointment_type: Mapped[AppointmentType] = mapped_column(SQLEnum(AppointmentType), nullable=False, default=AppointmentType.TREATMENT)
    status: Mapped[AppointmentStatus] = mapped_column(SQLEnum(AppointmentStatus), nullable=False, default=AppointmentStatus.SCHEDULED)
    
    # Detalhes
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    room: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Recorrência
    is_recurring: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recurrence_pattern: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    parent_appointment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey('appointments.id', ondelete='CASCADE'), nullable=True)
    
    # Confirmação e lembretes
    confirmation_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    # Observações
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relacionamentos
    patient: Mapped[Patient] = relationship("Patient", back_populates="appointments")
    therapist: Mapped[User] = relationship("User", foreign_keys=[therapist_id])
    created_by_user: Mapped[User] = relationship("User", foreign_keys=[created_by])
    parent_appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", remote_side=[id])
    recurring_appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="parent_appointment")
    reminders: Mapped[List["AppointmentReminder"]] = relationship("AppointmentReminder", back_populates="appointment", cascade="all, delete-orphan")
    
    @hybrid_property
    def start_datetime(self) -> datetime:
        """Combina data e hora de início"""
        hour, minute = map(int, self.start_time.split(':'))
        return datetime.combine(self.appointment_date, datetime.min.time().replace(hour=hour, minute=minute))
    
    @hybrid_property
    def end_datetime(self) -> datetime:
        """Combina data e hora de fim"""
        hour, minute = map(int, self.end_time.split(':'))
        return datetime.combine(self.appointment_date, datetime.min.time().replace(hour=hour, minute=minute))
    
    @property
    def is_past(self) -> bool:
        """Verifica se o agendamento já passou"""
        return self.start_datetime < datetime.now()
    
    @property
    def is_today(self) -> bool:
        """Verifica se o agendamento é hoje"""
        return self.appointment_date == date.today()
    
    @property
    def is_confirmed(self) -> bool:
        """Verifica se está confirmado"""
        return self.status == AppointmentStatus.CONFIRMED or self.confirmed_at is not None
    
    @property
    def can_be_cancelled(self) -> bool:
        """Verifica se pode ser cancelado"""
        return (
            self.status in [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] and
            not self.is_past
        )
    
    @property
    def can_be_rescheduled(self) -> bool:
        """Verifica se pode ser reagendado"""
        return self.can_be_cancelled
    
    def create_recurrence(self, end_date: date, count: Optional[int] = None) -> List["Appointment"]:
        """Cria agendamentos recorrentes"""
        if not self.is_recurring or not self.recurrence_pattern:
            return []
        
        appointments = []
        pattern = self.recurrence_pattern
        
        # Configurar regra de recorrência
        freq_map = {
            RecurrenceType.DAILY.value: DAILY,
            RecurrenceType.WEEKLY.value: WEEKLY,
            RecurrenceType.MONTHLY.value: MONTHLY,
        }
        
        freq = freq_map.get(pattern.get('frequency'), WEEKLY)
        interval = pattern.get('interval', 1)
        
        # Gerar datas
        rule = rrule(
            freq=freq,
            interval=interval,
            dtstart=self.start_datetime,
            until=datetime.combine(end_date, datetime.max.time()) if end_date else None,
            count=count,
        )
        
        for dt in list(rule)[1:]:  # Skip first (original appointment)
            new_appointment = Appointment(
                patient_id=self.patient_id,
                therapist_id=self.therapist_id,
                created_by=self.created_by,
                appointment_date=dt.date(),
                start_time=self.start_time,
                end_time=self.end_time,
                duration_minutes=self.duration_minutes,
                appointment_type=self.appointment_type,
                title=self.title,
                description=self.description,
                location=self.location,
                room=self.room,
                parent_appointment_id=self.id,
                confirmation_required=self.confirmation_required,
                notes=self.notes,
            )
            appointments.append(new_appointment)
        
        return appointments
    
    def check_conflicts(self, exclude_ids: List[str] = None) -> List["Appointment"]:
        """Verifica conflitos de horário"""
        exclude_ids = exclude_ids or []
        
        conflicts = Appointment.query.filter(
            Appointment.therapist_id == self.therapist_id,
            Appointment.appointment_date == self.appointment_date,
            Appointment.status.in_([
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS
            ]),
            ~Appointment.id.in_([self.id] + exclude_ids)
        ).all()
        
        # Verificar sobreposição de horários
        conflicting = []
        for appointment in conflicts:
            if self._times_overlap(
                self.start_time, self.end_time,
                appointment.start_time, appointment.end_time
            ):
                conflicting.append(appointment)
        
        return conflicting
    
    def _times_overlap(self, start1: str, end1: str, start2: str, end2: str) -> bool:
        """Verifica se dois períodos se sobrepõem"""
        def time_to_minutes(time_str: str) -> int:
            hour, minute = map(int, time_str.split(':'))
            return hour * 60 + minute
        
        s1, e1 = time_to_minutes(start1), time_to_minutes(end1)
        s2, e2 = time_to_minutes(start2), time_to_minutes(end2)
        
        return max(s1, s2) < min(e1, e2)
    
    def to_dict(self, include_relationships: bool = True) -> Dict[str, Any]:
        """Converte para dicionário"""
        data = {
            'id': self.id,
            'patient_id': self.patient_id,
            'therapist_id': self.therapist_id,
            'appointment_date': self.appointment_date.isoformat(),
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration_minutes': self.duration_minutes,
            'appointment_type': self.appointment_type.value,
            'status': self.status.value,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'room': self.room,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'confirmation_required': self.confirmation_required,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'reminder_sent': self.reminder_sent,
            'notes': self.notes,
            'cancellation_reason': self.cancellation_reason,
            'is_past': self.is_past,
            'is_today': self.is_today,
            'is_confirmed': self.is_confirmed,
            'can_be_cancelled': self.can_be_cancelled,
            'can_be_rescheduled': self.can_be_rescheduled,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_relationships:
            data.update({
                'patient_name': self.patient.nome_completo if self.patient else None,
                'therapist_name': self.therapist.profile.nome_completo if self.therapist and self.therapist.profile else self.therapist.email if self.therapist else None,
            })
        
        return data


class AppointmentReminder(db.Model):
    """Lembretes de agendamento"""
    __tablename__ = 'appointment_reminders'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False)
    
    # Configuração do lembrete
    reminder_type: Mapped[ReminderType] = mapped_column(SQLEnum(ReminderType), nullable=False)
    minutes_before: Mapped[int] = mapped_column(Integer, nullable=False)  # Minutos antes do agendamento
    
    # Status
    scheduled_for: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Conteúdo
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relacionamentos
    appointment: Mapped[Appointment] = relationship("Appointment", back_populates="reminders")
    
    @property
    def is_sent(self) -> bool:
        """Verifica se foi enviado"""
        return self.sent_at is not None
    
    @property
    def is_failed(self) -> bool:
        """Verifica se falhou"""
        return self.failed_at is not None
    
    @property
    def is_pending(self) -> bool:
        """Verifica se está pendente"""
        return not self.is_sent and not self.is_failed and datetime.now() >= self.scheduled_for
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'reminder_type': self.reminder_type.value,
            'minutes_before': self.minutes_before,
            'scheduled_for': self.scheduled_for.isoformat(),
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'failed_at': self.failed_at.isoformat() if self.failed_at else None,
            'error_message': self.error_message,
            'subject': self.subject,
            'message': self.message,
            'is_sent': self.is_sent,
            'is_failed': self.is_failed,
            'is_pending': self.is_pending,
            'created_at': self.created_at.isoformat(),
        }


class ScheduleTemplate(db.Model):
    """Template de horários de trabalho"""
    __tablename__ = 'schedule_templates'
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Configuração
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    
    # Configurações de agendamento
    slot_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=50)  # minutos
    break_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=10)  # minutos entre consultas
    max_patients_per_slot: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relacionamentos
    therapist: Mapped[User] = relationship("User")
    
    def generate_time_slots(self) -> List[Dict[str, str]]:
        """Gera os slots de horário disponíveis"""
        slots = []
        
        def time_to_minutes(time_str: str) -> int:
            hour, minute = map(int, time_str.split(':'))
            return hour * 60 + minute
        
        def minutes_to_time(minutes: int) -> str:
            hour, minute = divmod(minutes, 60)
            return f"{hour:02d}:{minute:02d}"
        
        start_minutes = time_to_minutes(self.start_time)
        end_minutes = time_to_minutes(self.end_time)
        slot_with_break = self.slot_duration + self.break_duration
        
        current_time = start_minutes
        while current_time + self.slot_duration <= end_minutes:
            slot_start = minutes_to_time(current_time)
            slot_end = minutes_to_time(current_time + self.slot_duration)
            
            slots.append({
                'start_time': slot_start,
                'end_time': slot_end,
                'duration': self.slot_duration,
            })
            
            current_time += slot_with_break
        
        return slots
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário"""
        return {
            'id': self.id,
            'therapist_id': self.therapist_id,
            'name': self.name,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'slot_duration': self.slot_duration,
            'break_duration': self.break_duration,
            'max_patients_per_slot': self.max_patients_per_slot,
            'is_active': self.is_active,
            'time_slots': self.generate_time_slots(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# Adicionar relacionamento ao modelo Patient
Patient.appointments = relationship("Appointment", back_populates="patient", lazy="dynamic")