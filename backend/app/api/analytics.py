"""
API endpoints para analytics e dashboard executivo
"""

from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func, extract
from sqlalchemy.orm import joinedload

from ..models.analytics import DashboardMetric, AnalyticsSnapshot, KPICalculator, MetricType, MetricFrequency
from ..models.user import User
from ..models.appointment import Appointment, AppointmentStatus
from ..models.patient import Patient
from ..models.medical_record import MedicalRecord
from ..models.exercise import ExerciseExecution
from ..models.project_management import Project, Task
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


# =============================================================================
# DASHBOARD EXECUTIVO
# =============================================================================

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_executive_dashboard():
    """Dashboard executivo com KPIs principais"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Parâmetros de período
    end_date = datetime.strptime(request.args.get('end_date', date.today().isoformat()), '%Y-%m-%d').date()
    period_days = int(request.args.get('period_days', 30))
    start_date = end_date - timedelta(days=period_days)
    
    # Inicializar calculadora de KPIs
    calculator = KPICalculator(db.session)
    
    # Gerar snapshot do dashboard
    dashboard_data = calculator.generate_dashboard_snapshot(end_date)
    
    # Adicionar dados de comparação com período anterior
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days)
    
    previous_data = calculator.generate_dashboard_snapshot(previous_end)
    
    # Calcular variações
    def calculate_change(current, previous, key):
        if key in current and key in previous and previous[key] != 0:
            return round(((current[key] - previous[key]) / previous[key]) * 100, 1)
        return 0
    
    # Adicionar variações aos dados
    dashboard_data['trends'] = {
        'appointments_change': calculate_change(
            dashboard_data['operational'], 
            previous_data['operational'], 
            'total_appointments'
        ),
        'patients_change': calculate_change(
            dashboard_data['operational'], 
            previous_data['operational'], 
            'active_patients'
        ),
        'completion_rate_change': calculate_change(
            dashboard_data['operational'], 
            previous_data['operational'], 
            'completion_rate'
        ),
        'adherence_change': calculate_change(
            dashboard_data['clinical'], 
            previous_data['clinical'], 
            'exercise_adherence_rate'
        )
    }
    
    return jsonify({
        'dashboard': dashboard_data,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'days': period_days
        }
    })


@analytics_bp.route('/metrics', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def get_metrics():
    """Lista métricas calculadas"""
    
    query = DashboardMetric.query
    
    # Filtros
    metric_type = request.args.get('metric_type')
    if metric_type:
        query = query.filter(DashboardMetric.metric_type == MetricType(metric_type))
    
    frequency = request.args.get('frequency')
    if frequency:
        query = query.filter(DashboardMetric.frequency == MetricFrequency(frequency))
    
    start_date = request.args.get('start_date')
    if start_date:
        query = query.filter(DashboardMetric.period_start >= datetime.strptime(start_date, '%Y-%m-%d').date())
    
    end_date = request.args.get('end_date')
    if end_date:
        query = query.filter(DashboardMetric.period_end <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    # Ordenação
    query = query.order_by(desc(DashboardMetric.calculated_at))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 50)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda metric: metric.to_dict()
    )


@analytics_bp.route('/operational-metrics', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_operational_metrics():
    """Métricas operacionais detalhadas"""
    
    # Parâmetros de período
    end_date = datetime.strptime(request.args.get('end_date', date.today().isoformat()), '%Y-%m-%d').date()
    start_date = datetime.strptime(request.args.get('start_date', (date.today() - timedelta(days=30)).isoformat()), '%Y-%m-%d').date()
    
    calculator = KPICalculator(db.session)
    metrics = calculator.calculate_operational_metrics(start_date, end_date)
    
    # Adicionar séries temporais para gráficos
    time_series = []
    current_date = start_date
    
    while current_date <= end_date:
        daily_appointments = db.session.query(Appointment).filter(
            func.date(Appointment.appointment_date) == current_date
        ).count()
        
        daily_completed = db.session.query(Appointment).filter(
            func.date(Appointment.appointment_date) == current_date,
            Appointment.status == AppointmentStatus.CONCLUIDO
        ).count()
        
        time_series.append({
            'date': current_date.isoformat(),
            'appointments': daily_appointments,
            'completed': daily_completed,
            'completion_rate': (daily_completed / daily_appointments * 100) if daily_appointments > 0 else 0
        })
        
        current_date += timedelta(days=1)
    
    # Métricas por terapeuta
    therapist_metrics = db.session.query(
        User.id,
        User.full_name,
        func.count(Appointment.id).label('total_appointments'),
        func.sum(case((Appointment.status == AppointmentStatus.CONCLUIDO, 1), else_=0)).label('completed'),
        func.sum(case((Appointment.status == AppointmentStatus.CANCELADO, 1), else_=0)).label('cancelled')
    ).join(
        Appointment, User.id == Appointment.therapist_id
    ).filter(
        Appointment.appointment_date.between(start_date, end_date),
        User.role.in_(['FISIOTERAPEUTA', 'ADMIN'])
    ).group_by(User.id, User.full_name).all()
    
    therapist_data = []
    for therapist in therapist_metrics:
        completion_rate = (therapist.completed / therapist.total_appointments * 100) if therapist.total_appointments > 0 else 0
        therapist_data.append({
            'therapist_id': therapist.id,
            'therapist_name': therapist.full_name,
            'total_appointments': therapist.total_appointments,
            'completed_appointments': therapist.completed,
            'cancelled_appointments': therapist.cancelled,
            'completion_rate': round(completion_rate, 1)
        })
    
    return jsonify({
        'metrics': metrics,
        'time_series': time_series,
        'therapist_performance': therapist_data,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    })


@analytics_bp.route('/clinical-metrics', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_clinical_metrics():
    """Métricas clínicas detalhadas"""
    
    end_date = datetime.strptime(request.args.get('end_date', date.today().isoformat()), '%Y-%m-%d').date()
    start_date = datetime.strptime(request.args.get('start_date', (date.today() - timedelta(days=30)).isoformat()), '%Y-%m-%d').date()
    
    calculator = KPICalculator(db.session)
    metrics = calculator.calculate_clinical_metrics(start_date, end_date)
    
    # Análise de aderência por paciente
    patient_adherence = db.session.query(
        Patient.id,
        Patient.full_name,
        func.count(ExerciseExecution.id).label('executions_count'),
        func.count(func.distinct(ExerciseExecution.exercise_id)).label('different_exercises')
    ).outerjoin(
        ExerciseExecution, Patient.id == ExerciseExecution.patient_id
    ).filter(
        or_(
            ExerciseExecution.execution_date.between(start_date, end_date),
            ExerciseExecution.execution_date.is_(None)
        )
    ).group_by(Patient.id, Patient.full_name).limit(10).all()
    
    adherence_data = []
    for patient in patient_adherence:
        adherence_data.append({
            'patient_id': patient.id,
            'patient_name': patient.full_name,
            'total_executions': patient.executions_count or 0,
            'different_exercises': patient.different_exercises or 0,
            'avg_executions_per_exercise': round((patient.executions_count or 0) / max(patient.different_exercises or 1, 1), 1)
        })
    
    # Distribuição por tipo de registro
    record_types = db.session.query(
        MedicalRecord.record_type,
        func.count(MedicalRecord.id).label('count')
    ).filter(
        func.date(MedicalRecord.created_at).between(start_date, end_date)
    ).group_by(MedicalRecord.record_type).all()
    
    record_distribution = [
        {
            'type': record.record_type,
            'count': record.count
        }
        for record in record_types
    ]
    
    return jsonify({
        'metrics': metrics,
        'patient_adherence': adherence_data,
        'record_distribution': record_distribution,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    })


@analytics_bp.route('/patient-analytics', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_patient_analytics():
    """Analytics específicas de pacientes"""
    
    end_date = datetime.strptime(request.args.get('end_date', date.today().isoformat()), '%Y-%m-%d').date()
    start_date = datetime.strptime(request.args.get('start_date', (date.today() - timedelta(days=30)).isoformat()), '%Y-%m-%d').date()
    
    # Demografia de pacientes
    age_groups = db.session.query(
        case(
            (Patient.birth_date > (date.today() - timedelta(days=365*18)), 'Menor de 18'),
            (Patient.birth_date > (date.today() - timedelta(days=365*30)), '18-30'),
            (Patient.birth_date > (date.today() - timedelta(days=365*50)), '31-50'),
            (Patient.birth_date > (date.today() - timedelta(days=365*65)), '51-65'),
            else_='Maior de 65'
        ).label('age_group'),
        func.count(Patient.id).label('count')
    ).filter(
        Patient.birth_date.isnot(None)
    ).group_by('age_group').all()
    
    demographics = [
        {'age_group': group.age_group, 'count': group.count}
        for group in age_groups
    ]
    
    # Distribuição por gênero
    gender_distribution = db.session.query(
        Patient.gender,
        func.count(Patient.id).label('count')
    ).filter(
        Patient.gender.isnot(None)
    ).group_by(Patient.gender).all()
    
    gender_data = [
        {'gender': gender.gender, 'count': gender.count}
        for gender in gender_distribution
    ]
    
    # Top condições tratadas
    conditions_query = db.session.query(
        func.json_each(Patient.conditions).c.value.label('condition'),
        func.count().label('count')
    ).filter(
        Patient.conditions.isnot(None),
        func.json_array_length(Patient.conditions) > 0
    ).group_by('condition').order_by(desc('count')).limit(10).all()
    
    top_conditions = [
        {'condition': condition.condition, 'count': condition.count}
        for condition in conditions_query
    ]
    
    # Taxa de retenção mensal
    monthly_retention = []
    for i in range(6):  # Últimos 6 meses
        month_start = (end_date - timedelta(days=30*i)).replace(day=1)
        month_end = month_start + timedelta(days=31)
        month_end = month_end.replace(day=1) - timedelta(days=1)
        
        new_patients_month = db.session.query(Patient).filter(
            func.date(Patient.created_at).between(month_start, month_end)
        ).count()
        
        returning_patients = db.session.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.appointment_date.between(month_start, month_end),
            Patient.created_at < month_start
        ).join(Patient).scalar() or 0
        
        monthly_retention.append({
            'month': month_start.strftime('%Y-%m'),
            'new_patients': new_patients_month,
            'returning_patients': returning_patients,
            'retention_rate': (returning_patients / max(new_patients_month, 1) * 100) if new_patients_month > 0 else 0
        })
    
    return jsonify({
        'demographics': {
            'age_groups': demographics,
            'gender_distribution': gender_data
        },
        'clinical_data': {
            'top_conditions': top_conditions
        },
        'retention_analysis': monthly_retention,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    })


@analytics_bp.route('/performance-trends', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def get_performance_trends():
    """Tendências de performance ao longo do tempo"""
    
    # Período padrão: último ano
    end_date = date.today()
    start_date = end_date - timedelta(days=365)
    
    # Permitir customização
    if request.args.get('start_date'):
        start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
    if request.args.get('end_date'):
        end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
    
    # Tendências mensais
    monthly_trends = []
    current_month = start_date.replace(day=1)
    
    while current_month <= end_date:
        next_month = (current_month + timedelta(days=32)).replace(day=1)
        month_end = next_month - timedelta(days=1)
        
        # Métricas do mês
        appointments = db.session.query(Appointment).filter(
            Appointment.appointment_date.between(current_month, month_end)
        ).count()
        
        completed = db.session.query(Appointment).filter(
            Appointment.appointment_date.between(current_month, month_end),
            Appointment.status == AppointmentStatus.CONCLUIDO
        ).count()
        
        new_patients = db.session.query(Patient).filter(
            func.date(Patient.created_at).between(current_month, month_end)
        ).count()
        
        records = db.session.query(MedicalRecord).filter(
            func.date(MedicalRecord.created_at).between(current_month, month_end)
        ).count()
        
        monthly_trends.append({
            'month': current_month.isoformat(),
            'appointments': appointments,
            'completed_appointments': completed,
            'completion_rate': (completed / appointments * 100) if appointments > 0 else 0,
            'new_patients': new_patients,
            'medical_records': records,
            'records_per_appointment': (records / appointments) if appointments > 0 else 0
        })
        
        current_month = next_month
    
    # Crescimento year-over-year
    yoy_growth = {}
    if len(monthly_trends) >= 12:
        recent_12_months = monthly_trends[-12:]
        previous_12_months = monthly_trends[-24:-12] if len(monthly_trends) >= 24 else []
        
        if previous_12_months:
            recent_total = sum(m['appointments'] for m in recent_12_months)
            previous_total = sum(m['appointments'] for m in previous_12_months)
            
            yoy_growth = {
                'appointments_growth': ((recent_total - previous_total) / previous_total * 100) if previous_total > 0 else 0,
                'recent_12_months': recent_total,
                'previous_12_months': previous_total
            }
    
    # Sazonalidade (média por mês do ano)
    seasonality = db.session.query(
        extract('month', Appointment.appointment_date).label('month'),
        func.count(Appointment.id).label('avg_appointments')
    ).filter(
        Appointment.appointment_date.between(start_date, end_date)
    ).group_by('month').order_by('month').all()
    
    seasonal_data = [
        {
            'month': int(season.month),
            'month_name': datetime(2024, int(season.month), 1).strftime('%B'),
            'avg_appointments': season.avg_appointments
        }
        for season in seasonality
    ]
    
    return jsonify({
        'monthly_trends': monthly_trends,
        'yoy_growth': yoy_growth,
        'seasonality': seasonal_data,
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
    })


@analytics_bp.route('/real-time-stats', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_real_time_stats():
    """Estatísticas em tempo real para o dashboard"""
    
    today = date.today()
    
    # Estatísticas do dia
    today_appointments = db.session.query(Appointment).filter(
        func.date(Appointment.appointment_date) == today
    ).count()
    
    today_completed = db.session.query(Appointment).filter(
        func.date(Appointment.appointment_date) == today,
        Appointment.status == AppointmentStatus.CONCLUIDO
    ).count()
    
    today_pending = db.session.query(Appointment).filter(
        func.date(Appointment.appointment_date) == today,
        Appointment.status == AppointmentStatus.AGENDADO
    ).count()
    
    # Próximos agendamentos
    next_appointments = db.session.query(Appointment).filter(
        Appointment.appointment_date > datetime.now(),
        Appointment.status == AppointmentStatus.AGENDADO
    ).order_by(Appointment.appointment_date, Appointment.start_time).limit(5).all()
    
    upcoming = [
        {
            'id': apt.id,
            'patient_name': apt.patient.full_name if apt.patient else 'N/A',
            'therapist_name': apt.therapist.full_name if apt.therapist else 'N/A',
            'date': apt.appointment_date.isoformat(),
            'time': apt.start_time.strftime('%H:%M') if apt.start_time else 'N/A',
            'type': apt.appointment_type
        }
        for apt in next_appointments
    ]
    
    # Estatísticas gerais
    total_patients = db.session.query(Patient).count()
    total_therapists = db.session.query(User).filter(
        User.role.in_(['FISIOTERAPEUTA', 'ADMIN'])
    ).count()
    
    # Pacientes ativos (últimos 30 dias)
    active_patients = db.session.query(func.count(func.distinct(Appointment.patient_id))).filter(
        Appointment.appointment_date >= (today - timedelta(days=30))
    ).scalar() or 0
    
    return jsonify({
        'today': {
            'total_appointments': today_appointments,
            'completed_appointments': today_completed,
            'pending_appointments': today_pending,
            'completion_rate': (today_completed / today_appointments * 100) if today_appointments > 0 else 0
        },
        'upcoming_appointments': upcoming,
        'general': {
            'total_patients': total_patients,
            'active_patients_30d': active_patients,
            'total_therapists': total_therapists,
            'patient_activity_rate': (active_patients / total_patients * 100) if total_patients > 0 else 0
        },
        'timestamp': datetime.now().isoformat()
    })


@analytics_bp.route('/snapshots', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def create_analytics_snapshot():
    """Cria snapshot de analytics"""
    
    snapshot_date = date.today()
    if request.json and request.json.get('date'):
        snapshot_date = datetime.strptime(request.json['date'], '%Y-%m-%d').date()
    
    calculator = KPICalculator(db.session)
    snapshot_data = calculator.generate_dashboard_snapshot(snapshot_date)
    
    # Verificar se já existe snapshot para esta data
    existing_snapshot = AnalyticsSnapshot.query.filter_by(
        snapshot_date=snapshot_date,
        snapshot_type='daily'
    ).first()
    
    if existing_snapshot:
        existing_snapshot.metrics_data = snapshot_data
        existing_snapshot.created_at = datetime.utcnow()
    else:
        snapshot = AnalyticsSnapshot(
            snapshot_date=snapshot_date,
            snapshot_type='daily',
            metrics_data=snapshot_data
        )
        db.session.add(snapshot)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Snapshot criado com sucesso',
        'snapshot_date': snapshot_date.isoformat(),
        'data': snapshot_data
    }), 201


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(analytics_bp)