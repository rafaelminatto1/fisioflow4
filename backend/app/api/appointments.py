"""
API routes para sistema de agendamento
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.orm import joinedload
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional

from app import db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.appointment import (
    Appointment, AppointmentReminder, ScheduleTemplate,
    AppointmentStatus, AppointmentType, ReminderType
)
from app.auth.utils import roles_required

appointments_bp = Blueprint('appointments', __name__)


@appointments_bp.route('/', methods=['POST'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def create_appointment():
    """Criar novo agendamento"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['patient_id', 'therapist_id', 'appointment_date', 'start_time', 'end_time']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} é obrigatório'}), 400
        
        # Verificar se paciente existe
        patient = Patient.query.get(data['patient_id'])
        if not patient:
            return jsonify({'error': 'Paciente não encontrado'}), 404
        
        # Verificar se terapeuta existe
        therapist = User.query.get(data['therapist_id'])
        if not therapist:
            return jsonify({'error': 'Terapeuta não encontrado'}), 404
        
        # Validar data
        try:
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
        
        if appointment_date < date.today():
            return jsonify({'error': 'Não é possível agendar para datas passadas'}), 400
        
        # Criar agendamento
        appointment = Appointment(
            patient_id=data['patient_id'],
            therapist_id=data['therapist_id'],
            created_by=current_user_id,
            appointment_date=appointment_date,
            start_time=data['start_time'],
            end_time=data['end_time'],
            duration_minutes=data.get('duration_minutes', 50),
            appointment_type=data.get('appointment_type', AppointmentType.TREATMENT.value),
            title=data.get('title'),
            description=data.get('description'),
            location=data.get('location'),
            room=data.get('room'),
            confirmation_required=data.get('confirmation_required', True),
            notes=data.get('notes'),
        )
        
        # Verificar conflitos
        conflicts = appointment.check_conflicts()
        if conflicts:
            conflict_info = [{
                'id': c.id,
                'patient_name': c.patient.nome_completo,
                'start_time': c.start_time,
                'end_time': c.end_time
            } for c in conflicts]
            return jsonify({
                'error': 'Conflito de horário detectado',
                'conflicts': conflict_info
            }), 409
        
        db.session.add(appointment)
        
        # Configurar recorrência se especificada
        if data.get('is_recurring') and data.get('recurrence_pattern'):
            appointment.is_recurring = True
            appointment.recurrence_pattern = data['recurrence_pattern']
            
            # Criar agendamentos recorrentes
            end_date = None
            count = None
            if data['recurrence_pattern'].get('end_date'):
                end_date = datetime.strptime(data['recurrence_pattern']['end_date'], '%Y-%m-%d').date()
            if data['recurrence_pattern'].get('count'):
                count = data['recurrence_pattern']['count']
            
            recurring_appointments = appointment.create_recurrence(end_date, count)
            
            # Verificar conflitos em agendamentos recorrentes
            all_conflicts = []
            for rec_app in recurring_appointments:
                conflicts = rec_app.check_conflicts()
                if conflicts:
                    all_conflicts.extend(conflicts)
            
            if all_conflicts:
                return jsonify({
                    'error': 'Conflitos detectados em agendamentos recorrentes',
                    'conflict_count': len(all_conflicts)
                }), 409
            
            # Adicionar agendamentos recorrentes
            for rec_app in recurring_appointments:
                db.session.add(rec_app)
        
        db.session.commit()
        
        # Criar lembretes se configurados
        if data.get('reminders'):
            for reminder_data in data['reminders']:
                create_reminder(appointment.id, reminder_data)
        
        return jsonify({
            'message': 'Agendamento criado com sucesso',
            'appointment': appointment.to_dict(),
            'recurring_count': len(recurring_appointments) if 'recurring_appointments' in locals() else 0
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar agendamento: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO, UserRole.PACIENTE)
def list_appointments():
    """Listar agendamentos com filtros"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Parâmetros de filtro
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        therapist_id = request.args.get('therapist_id')
        patient_id = request.args.get('patient_id')
        status = request.args.getlist('status')
        appointment_type = request.args.get('appointment_type')
        
        # Query base
        query = Appointment.query.options(
            joinedload(Appointment.patient),
            joinedload(Appointment.therapist)
        )
        
        # Filtros por role
        if current_user.role == UserRole.PACIENTE:
            # Pacientes só veem seus próprios agendamentos
            patient = Patient.query.filter_by(user_id=current_user_id).first()
            if patient:
                query = query.filter(Appointment.patient_id == patient.id)
            else:
                return jsonify({'appointments': []}), 200
        elif current_user.role == UserRole.FISIOTERAPEUTA:
            # Fisioterapeutas veem agendamentos onde são responsáveis
            query = query.filter(Appointment.therapist_id == current_user_id)
        # ADMIN e ESTAGIARIO veem todos
        
        # Aplicar filtros
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Appointment.appointment_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': 'Formato de start_date inválido'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Appointment.appointment_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': 'Formato de end_date inválido'}), 400
        
        if therapist_id:
            query = query.filter(Appointment.therapist_id == therapist_id)
        
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        
        if status:
            query = query.filter(Appointment.status.in_(status))
        
        if appointment_type:
            query = query.filter(Appointment.appointment_type == appointment_type)
        
        # Ordenação
        query = query.order_by(
            Appointment.appointment_date.asc(),
            Appointment.start_time.asc()
        )
        
        appointments = query.all()
        
        return jsonify({
            'appointments': [apt.to_dict() for apt in appointments]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao listar agendamentos: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/<appointment_id>', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO, UserRole.PACIENTE)
def get_appointment(appointment_id: str):
    """Obter detalhes de um agendamento"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        appointment = Appointment.query.options(
            joinedload(Appointment.patient),
            joinedload(Appointment.therapist),
            joinedload(Appointment.reminders)
        ).get_or_404(appointment_id)
        
        # Verificar permissões
        if current_user.role == UserRole.PACIENTE:
            patient = Patient.query.filter_by(user_id=current_user_id).first()
            if not patient or appointment.patient_id != patient.id:
                return jsonify({'error': 'Acesso negado'}), 403
        elif current_user.role == UserRole.FISIOTERAPEUTA:
            if appointment.therapist_id != current_user_id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        appointment_data = appointment.to_dict()
        appointment_data['reminders'] = [reminder.to_dict() for reminder in appointment.reminders]
        
        return jsonify(appointment_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter agendamento: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/<appointment_id>', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_appointment(appointment_id: str):
    """Atualizar agendamento"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        data = request.get_json()
        
        # Verificar se pode ser alterado
        if appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
            return jsonify({'error': 'Agendamento não pode ser alterado neste status'}), 400
        
        # Validar nova data se fornecida
        if 'appointment_date' in data:
            try:
                new_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
                if new_date < date.today() and new_date != appointment.appointment_date:
                    return jsonify({'error': 'Não é possível agendar para datas passadas'}), 400
                appointment.appointment_date = new_date
            except ValueError:
                return jsonify({'error': 'Formato de data inválido'}), 400
        
        # Campos atualizáveis
        updateable_fields = [
            'start_time', 'end_time', 'duration_minutes', 'appointment_type',
            'title', 'description', 'location', 'room', 'notes'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(appointment, field, data[field])
        
        # Verificar conflitos se horário mudou
        if any(field in data for field in ['start_time', 'end_time', 'appointment_date']):
            conflicts = appointment.check_conflicts()
            if conflicts:
                conflict_info = [{
                    'id': c.id,
                    'patient_name': c.patient.nome_completo,
                    'start_time': c.start_time,
                    'end_time': c.end_time
                } for c in conflicts]
                return jsonify({
                    'error': 'Conflito de horário detectado',
                    'conflicts': conflict_info
                }), 409
        
        appointment.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Agendamento atualizado com sucesso',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar agendamento: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/<appointment_id>/status', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_appointment_status(appointment_id: str):
    """Atualizar status do agendamento"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        data = request.get_json()
        
        new_status = data.get('status')
        if not new_status:
            return jsonify({'error': 'Status é obrigatório'}), 400
        
        try:
            status_enum = AppointmentStatus(new_status)
        except ValueError:
            return jsonify({'error': 'Status inválido'}), 400
        
        old_status = appointment.status
        appointment.status = status_enum
        
        # Lógica específica por status
        if status_enum == AppointmentStatus.CONFIRMED:
            appointment.confirmed_at = datetime.utcnow()
        elif status_enum == AppointmentStatus.CANCELLED:
            appointment.cancelled_at = datetime.utcnow()
            appointment.cancellation_reason = data.get('cancellation_reason')
        
        appointment.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': f'Status alterado de {old_status.value} para {new_status}',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar status: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/<appointment_id>', methods=['DELETE'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA)
def delete_appointment(appointment_id: str):
    """Cancelar agendamento"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        
        if not appointment.can_be_cancelled:
            return jsonify({'error': 'Agendamento não pode ser cancelado'}), 400
        
        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancelled_at = datetime.utcnow()
        appointment.cancellation_reason = request.json.get('reason', 'Cancelado pelo sistema')
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Agendamento cancelado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao cancelar agendamento: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/calendar', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def get_calendar_view():
    """Obter visualização de calendário"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Parâmetros
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        therapist_id = request.args.get('therapist_id')
        
        # Calcular período
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        # Query base
        query = Appointment.query.options(
            joinedload(Appointment.patient),
            joinedload(Appointment.therapist)
        ).filter(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date
        )
        
        # Filtros por role
        if current_user.role == UserRole.FISIOTERAPEUTA:
            query = query.filter(Appointment.therapist_id == current_user_id)
        elif therapist_id and current_user.role in [UserRole.ADMIN, UserRole.ESTAGIARIO]:
            query = query.filter(Appointment.therapist_id == therapist_id)
        
        appointments = query.order_by(
            Appointment.appointment_date.asc(),
            Appointment.start_time.asc()
        ).all()
        
        # Agrupar por data
        calendar_data = {}
        for appointment in appointments:
            date_str = appointment.appointment_date.isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            calendar_data[date_str].append(appointment.to_dict())
        
        # Estatísticas do mês
        total_appointments = len(appointments)
        completed = len([a for a in appointments if a.status == AppointmentStatus.COMPLETED])
        cancelled = len([a for a in appointments if a.status == AppointmentStatus.CANCELLED])
        
        return jsonify({
            'calendar': calendar_data,
            'period': {
                'year': year,
                'month': month,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'statistics': {
                'total': total_appointments,
                'completed': completed,
                'cancelled': cancelled,
                'completion_rate': (completed / total_appointments * 100) if total_appointments > 0 else 0
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter calendário: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@appointments_bp.route('/available-slots', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def get_available_slots():
    """Obter horários disponíveis"""
    try:
        therapist_id = request.args.get('therapist_id', type=str)
        date_str = request.args.get('date', type=str)
        
        if not therapist_id or not date_str:
            return jsonify({'error': 'therapist_id e date são obrigatórios'}), 400
        
        try:
            requested_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data inválido'}), 400
        
        if requested_date < date.today():
            return jsonify({'error': 'Não é possível consultar datas passadas'}), 400
        
        # Buscar template de horário
        day_of_week = requested_date.weekday()  # 0=Monday
        template = ScheduleTemplate.query.filter_by(
            therapist_id=therapist_id,
            day_of_week=day_of_week,
            is_active=True
        ).first()
        
        if not template:
            return jsonify({
                'available_slots': [],
                'message': 'Nenhum horário configurado para este dia'
            }), 200
        
        # Gerar slots teóricos
        available_slots = template.generate_time_slots()
        
        # Verificar agendamentos existentes
        existing_appointments = Appointment.query.filter(
            Appointment.therapist_id == therapist_id,
            Appointment.appointment_date == requested_date,
            Appointment.status.in_([
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS
            ])
        ).all()
        
        # Remover slots ocupados
        occupied_times = set()
        for appointment in existing_appointments:
            occupied_times.add((appointment.start_time, appointment.end_time))
        
        final_slots = []
        for slot in available_slots:
            slot_occupied = False
            for occupied_start, occupied_end in occupied_times:
                if appointment._times_overlap(
                    slot['start_time'], slot['end_time'],
                    occupied_start, occupied_end
                ):
                    slot_occupied = True
                    break
            
            if not slot_occupied:
                final_slots.append(slot)
        
        return jsonify({
            'available_slots': final_slots,
            'date': date_str,
            'therapist_id': therapist_id,
            'total_slots': len(available_slots),
            'available_count': len(final_slots)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter horários disponíveis: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


def create_reminder(appointment_id: str, reminder_data: dict):
    """Criar lembrete para agendamento"""
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return
        
        reminder_type = ReminderType(reminder_data['type'])
        minutes_before = reminder_data.get('minutes_before', 60)
        
        # Calcular quando enviar
        scheduled_for = appointment.start_datetime - timedelta(minutes=minutes_before)
        
        # Template de mensagem
        if reminder_type == ReminderType.EMAIL:
            subject = f"Lembrete: Consulta agendada para {appointment.appointment_date.strftime('%d/%m/%Y')}"
            message = f"""
            Olá {appointment.patient.nome_completo},
            
            Você tem uma consulta agendada para:
            Data: {appointment.appointment_date.strftime('%d/%m/%Y')}
            Horário: {appointment.start_time}
            Profissional: {appointment.therapist.profile.nome_completo if appointment.therapist.profile else appointment.therapist.email}
            Local: {appointment.location or 'Clínica'}
            
            Por favor, chegue 10 minutos antes do horário marcado.
            """
        else:
            subject = None
            message = f"Lembrete: Consulta em {appointment.appointment_date.strftime('%d/%m/%Y')} às {appointment.start_time}"
        
        reminder = AppointmentReminder(
            appointment_id=appointment_id,
            reminder_type=reminder_type,
            minutes_before=minutes_before,
            scheduled_for=scheduled_for,
            subject=subject,
            message=message
        )
        
        db.session.add(reminder)
        
    except Exception as e:
        current_app.logger.error(f"Erro ao criar lembrete: {e}")