"""
API endpoints para sistema de exercícios
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc
from sqlalchemy.orm import joinedload

from ..models.exercise import (
    Exercise, PatientExercise, ExerciseExecution, ExerciseProgram,
    ExerciseCategory, ExerciseDifficulty, BodyRegion
)
from ..models.user import User
from ..models.patient import Patient
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json

exercises_bp = Blueprint('exercises', __name__, url_prefix='/api/exercises')


# =============================================================================
# BIBLIOTECA DE EXERCÍCIOS
# =============================================================================

@exercises_bp.route('', methods=['GET'])
@jwt_required()
def get_exercises():
    """Lista exercícios da biblioteca com filtros"""
    
    query = Exercise.query.filter(Exercise.is_active == True)
    
    # Filtros
    category = request.args.get('category')
    if category:
        query = query.filter(Exercise.category == ExerciseCategory(category))
    
    difficulty = request.args.get('difficulty')
    if difficulty:
        query = query.filter(Exercise.difficulty == ExerciseDifficulty(difficulty))
    
    body_region = request.args.get('body_region')
    if body_region:
        query = query.filter(Exercise.body_regions.contains([body_region]))
    
    # Busca por texto
    search = request.args.get('search', '').strip()
    if search:
        query = query.filter(
            or_(
                Exercise.title.ilike(f'%{search}%'),
                Exercise.description.ilike(f'%{search}%'),
                Exercise.instructions.ilike(f'%{search}%')
            )
        )
    
    # Filtro por aprovação (apenas para admins/terapeutas)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user and user.role in ['ADMIN', 'FISIOTERAPEUTA']:
        approved_only = request.args.get('approved_only', 'true').lower() == 'true'
        if approved_only:
            query = query.filter(Exercise.is_approved == True)
    else:
        # Pacientes só veem exercícios aprovados
        query = query.filter(Exercise.is_approved == True)
    
    # Ordenação
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    if sort_by == 'title':
        order_field = Exercise.title
    elif sort_by == 'difficulty':
        order_field = Exercise.difficulty
    elif sort_by == 'category':
        order_field = Exercise.category
    else:
        order_field = Exercise.created_at
    
    if sort_order == 'desc':
        query = query.order_by(desc(order_field))
    else:
        query = query.order_by(order_field)
    
    # Paginação
    include_stats = request.args.get('include_stats', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda ex: ex.to_dict(include_stats=include_stats)
    )


@exercises_bp.route('/<exercise_id>', methods=['GET'])
@jwt_required()
def get_exercise(exercise_id):
    """Obtém exercício específico"""
    
    exercise = Exercise.query.filter(
        Exercise.id == exercise_id,
        Exercise.is_active == True
    ).first()
    
    if not exercise:
        return jsonify({'error': 'Exercício não encontrado'}), 404
    
    # Verificar permissões
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user and user.role not in ['ADMIN', 'FISIOTERAPEUTA'] and not exercise.is_approved:
        return jsonify({'error': 'Exercício não encontrado'}), 404
    
    include_stats = request.args.get('include_stats', 'false').lower() == 'true'
    
    return jsonify({
        'exercise': exercise.to_dict(include_stats=include_stats)
    })


@exercises_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'title': {'type': 'string', 'required': True, 'maxlength': 200},
    'description': {'type': 'string', 'required': True},
    'instructions': {'type': 'string', 'required': True},
    'category': {'type': 'string', 'required': True, 'enum': [c.value for c in ExerciseCategory]},
    'difficulty': {'type': 'string', 'required': True, 'enum': [d.value for d in ExerciseDifficulty]},
    'body_regions': {'type': 'list', 'required': True, 'minlength': 1},
    'video_url': {'type': 'string', 'required': False, 'maxlength': 500},
    'thumbnail_url': {'type': 'string', 'required': False, 'maxlength': 500},
    'images': {'type': 'list', 'required': False},
    'default_duration_seconds': {'type': 'integer', 'required': False, 'min': 1},
    'default_repetitions': {'type': 'integer', 'required': False, 'min': 1},
    'default_sets': {'type': 'integer', 'required': False, 'min': 1},
    'default_rest_seconds': {'type': 'integer', 'required': False, 'min': 1},
    'equipment_needed': {'type': 'list', 'required': False},
    'contraindications': {'type': 'list', 'required': False},
    'precautions': {'type': 'list', 'required': False},
    'benefits': {'type': 'list', 'required': False},
    'points_value': {'type': 'integer', 'required': False, 'min': 1, 'max': 100}
})
def create_exercise():
    """Cria novo exercício"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Validar regiões corporais
    valid_regions = [r.value for r in BodyRegion]
    for region in data['body_regions']:
        if region not in valid_regions:
            return jsonify({'error': f'Região corporal inválida: {region}'}), 400
    
    exercise = Exercise(
        title=data['title'],
        description=data['description'],
        instructions=data['instructions'],
        category=ExerciseCategory(data['category']),
        difficulty=ExerciseDifficulty(data['difficulty']),
        body_regions=data['body_regions'],
        video_url=data.get('video_url'),
        thumbnail_url=data.get('thumbnail_url'),
        images=data.get('images', []),
        default_duration_seconds=data.get('default_duration_seconds'),
        default_repetitions=data.get('default_repetitions'),
        default_sets=data.get('default_sets'),
        default_rest_seconds=data.get('default_rest_seconds'),
        equipment_needed=data.get('equipment_needed', []),
        contraindications=data.get('contraindications', []),
        precautions=data.get('precautions', []),
        benefits=data.get('benefits', []),
        points_value=data.get('points_value', 10),
        is_approved=user.role == 'ADMIN',  # Admins aprovam automaticamente
        created_by=user_id
    )
    
    db.session.add(exercise)
    db.session.commit()
    
    return jsonify({
        'message': 'Exercício criado com sucesso',
        'exercise': exercise.to_dict()
    }), 201


@exercises_bp.route('/<exercise_id>', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def update_exercise(exercise_id):
    """Atualiza exercício existente"""
    
    exercise = Exercise.query.get(exercise_id)
    if not exercise:
        return jsonify({'error': 'Exercício não encontrado'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role != 'ADMIN' and exercise.created_by != user_id:
        return jsonify({'error': 'Sem permissão para editar este exercício'}), 403
    
    data = request.get_json()
    
    # Atualizar campos permitidos
    if 'title' in data:
        exercise.title = data['title']
    if 'description' in data:
        exercise.description = data['description']
    if 'instructions' in data:
        exercise.instructions = data['instructions']
    if 'category' in data:
        exercise.category = ExerciseCategory(data['category'])
    if 'difficulty' in data:
        exercise.difficulty = ExerciseDifficulty(data['difficulty'])
    if 'body_regions' in data:
        exercise.body_regions = data['body_regions']
    if 'video_url' in data:
        exercise.video_url = data['video_url']
    if 'thumbnail_url' in data:
        exercise.thumbnail_url = data['thumbnail_url']
    if 'images' in data:
        exercise.images = data['images']
    
    # Parâmetros padrão
    for param in ['default_duration_seconds', 'default_repetitions', 'default_sets', 'default_rest_seconds']:
        if param in data:
            setattr(exercise, param, data[param])
    
    # Metadados
    for field in ['equipment_needed', 'contraindications', 'precautions', 'benefits']:
        if field in data:
            setattr(exercise, field, data[field])
    
    if 'points_value' in data:
        exercise.points_value = data['points_value']
    
    # Aprovação (apenas admins)
    if user.role == 'ADMIN' and 'is_approved' in data:
        exercise.is_approved = data['is_approved']
    
    exercise.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Exercício atualizado com sucesso',
        'exercise': exercise.to_dict()
    })


@exercises_bp.route('/<exercise_id>/approve', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def approve_exercise(exercise_id):
    """Aprova exercício para uso público"""
    
    exercise = Exercise.query.get(exercise_id)
    if not exercise:
        return jsonify({'error': 'Exercício não encontrado'}), 404
    
    exercise.is_approved = True
    exercise.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Exercício aprovado com sucesso'})


@exercises_bp.route('/<exercise_id>', methods=['DELETE'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def delete_exercise(exercise_id):
    """Remove exercício (soft delete)"""
    
    exercise = Exercise.query.get(exercise_id)
    if not exercise:
        return jsonify({'error': 'Exercício não encontrado'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role != 'ADMIN' and exercise.created_by != user_id:
        return jsonify({'error': 'Sem permissão para excluir este exercício'}), 403
    
    exercise.is_active = False
    exercise.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Exercício removido com sucesso'})


# =============================================================================
# PRESCRIÇÃO DE EXERCÍCIOS PARA PACIENTES
# =============================================================================

@exercises_bp.route('/patient/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient_exercises(patient_id):
    """Lista exercícios prescritos para um paciente"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'PACIENTE' and user_id != patient_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    query = PatientExercise.query.filter(PatientExercise.patient_id == patient_id)
    
    # Filtros
    is_active = request.args.get('is_active', 'true').lower() == 'true'
    if is_active:
        query = query.filter(PatientExercise.is_active == True)
    
    is_completed = request.args.get('is_completed')
    if is_completed is not None:
        query = query.filter(PatientExercise.is_completed == (is_completed.lower() == 'true'))
    
    # Data de início
    start_date = request.args.get('start_date')
    if start_date:
        query = query.filter(PatientExercise.start_date >= start_date)
    
    end_date = request.args.get('end_date')
    if end_date:
        query = query.filter(PatientExercise.end_date <= end_date)
    
    # Ordenação
    query = query.options(joinedload(PatientExercise.exercise)).order_by(desc(PatientExercise.prescribed_at))
    
    # Paginação
    include_stats = request.args.get('include_stats', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda pe: pe.to_dict(include_exercise=True, include_stats=include_stats)
    )


@exercises_bp.route('/prescribe', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'patient_id': {'type': 'string', 'required': True},
    'exercise_id': {'type': 'string', 'required': True},
    'start_date': {'type': 'string', 'required': True},
    'end_date': {'type': 'string', 'required': False},
    'frequency_per_week': {'type': 'integer', 'required': False, 'min': 1, 'max': 7},
    'days_of_week': {'type': 'list', 'required': False},
    'custom_duration_seconds': {'type': 'integer', 'required': False, 'min': 1},
    'custom_repetitions': {'type': 'integer', 'required': False, 'min': 1},
    'custom_sets': {'type': 'integer', 'required': False, 'min': 1},
    'custom_rest_seconds': {'type': 'integer', 'required': False, 'min': 1},
    'therapist_notes': {'type': 'string', 'required': False}
})
def prescribe_exercise():
    """Prescreve exercício para um paciente"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se paciente existe
    patient = Patient.query.get(data['patient_id'])
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    # Verificar se exercício existe e está aprovado
    exercise = Exercise.query.filter(
        Exercise.id == data['exercise_id'],
        Exercise.is_approved == True,
        Exercise.is_active == True
    ).first()
    if not exercise:
        return jsonify({'error': 'Exercício não encontrado ou não aprovado'}), 404
    
    # Verificar se já existe prescrição ativa
    existing = PatientExercise.query.filter(
        PatientExercise.patient_id == data['patient_id'],
        PatientExercise.exercise_id == data['exercise_id'],
        PatientExercise.is_active == True,
        PatientExercise.is_completed == False
    ).first()
    
    if existing:
        return jsonify({'error': 'Exercício já prescrito e ativo para este paciente'}), 400
    
    # Validar data
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = None
        if data.get('end_date'):
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            if end_date <= start_date:
                return jsonify({'error': 'Data de fim deve ser posterior à data de início'}), 400
    except ValueError:
        return jsonify({'error': 'Formato de data inválido'}), 400
    
    patient_exercise = PatientExercise(
        patient_id=data['patient_id'],
        exercise_id=data['exercise_id'],
        prescribed_by=user_id,
        start_date=start_date,
        end_date=end_date,
        frequency_per_week=data.get('frequency_per_week', 3),
        days_of_week=data.get('days_of_week'),
        custom_duration_seconds=data.get('custom_duration_seconds'),
        custom_repetitions=data.get('custom_repetitions'),
        custom_sets=data.get('custom_sets'),
        custom_rest_seconds=data.get('custom_rest_seconds'),
        therapist_notes=data.get('therapist_notes')
    )
    
    db.session.add(patient_exercise)
    db.session.commit()
    
    return jsonify({
        'message': 'Exercício prescrito com sucesso',
        'patient_exercise': patient_exercise.to_dict(include_exercise=True)
    }), 201


@exercises_bp.route('/patient-exercise/<patient_exercise_id>', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA', 'PACIENTE'])
def update_patient_exercise(patient_exercise_id):
    """Atualiza prescrição de exercício"""
    
    patient_exercise = PatientExercise.query.get(patient_exercise_id)
    if not patient_exercise:
        return jsonify({'error': 'Prescrição não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if (user.role == 'PACIENTE' and patient_exercise.patient_id != user_id) or \
       (user.role == 'FISIOTERAPEUTA' and patient_exercise.prescribed_by != user_id and user.role != 'ADMIN'):
        return jsonify({'error': 'Sem permissão para editar esta prescrição'}), 403
    
    data = request.get_json()
    
    # Terapeutas podem editar parâmetros da prescrição
    if user.role in ['ADMIN', 'FISIOTERAPEUTA']:
        for field in ['custom_duration_seconds', 'custom_repetitions', 'custom_sets', 
                     'custom_rest_seconds', 'therapist_notes', 'frequency_per_week', 
                     'days_of_week', 'end_date']:
            if field in data:
                setattr(patient_exercise, field, data[field])
        
        if 'is_active' in data:
            patient_exercise.is_active = data['is_active']
        
        if 'is_completed' in data and data['is_completed']:
            patient_exercise.is_completed = True
            patient_exercise.completed_at = datetime.utcnow()
    
    # Pacientes podem adicionar notas
    if user.role == 'PACIENTE' and 'patient_notes' in data:
        patient_exercise.patient_notes = data['patient_notes']
    
    patient_exercise.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Prescrição atualizada com sucesso',
        'patient_exercise': patient_exercise.to_dict(include_exercise=True)
    })


# =============================================================================
# EXECUÇÕES DE EXERCÍCIOS
# =============================================================================

@exercises_bp.route('/execution', methods=['POST'])
@jwt_required()
@validate_json({
    'patient_exercise_id': {'type': 'string', 'required': True},
    'duration_seconds': {'type': 'integer', 'required': False, 'min': 1},
    'repetitions_completed': {'type': 'integer', 'required': False, 'min': 0},
    'sets_completed': {'type': 'integer', 'required': False, 'min': 0},
    'patient_rating': {'type': 'integer', 'required': False, 'min': 1, 'max': 5},
    'difficulty_felt': {'type': 'integer', 'required': False, 'min': 1, 'max': 10},
    'pain_level': {'type': 'integer', 'required': False, 'min': 0, 'max': 10},
    'effort_level': {'type': 'integer', 'required': False, 'min': 1, 'max': 10},
    'patient_comments': {'type': 'string', 'required': False},
    'location': {'type': 'string', 'required': False}
})
def create_execution():
    """Registra execução de exercício"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    patient_exercise = PatientExercise.query.get(data['patient_exercise_id'])
    if not patient_exercise:
        return jsonify({'error': 'Prescrição não encontrada'}), 404
    
    # Verificar permissões (paciente ou terapeuta do paciente)
    if user.role == 'PACIENTE' and patient_exercise.patient_id != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    elif user.role == 'FISIOTERAPEUTA' and patient_exercise.prescribed_by != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    # Verificar se prescrição está ativa
    if not patient_exercise.is_active:
        return jsonify({'error': 'Prescrição não está ativa'}), 400
    
    # Calcular pontos
    points_earned = patient_exercise.exercise.points_value
    bonus_points = 0
    
    # Bonus por completar todos os parâmetros
    params = patient_exercise.effective_parameters
    completion_bonus = True
    
    if params.get('repetitions') and data.get('repetitions_completed', 0) < params['repetitions']:
        completion_bonus = False
    if params.get('sets') and data.get('sets_completed', 0) < params['sets']:
        completion_bonus = False
    if params.get('duration_seconds') and data.get('duration_seconds', 0) < params['duration_seconds']:
        completion_bonus = False
    
    if completion_bonus:
        bonus_points = int(points_earned * 0.5)  # 50% bonus
    
    execution = ExerciseExecution(
        patient_exercise_id=data['patient_exercise_id'],
        exercise_id=patient_exercise.exercise_id,
        patient_id=patient_exercise.patient_id,
        duration_seconds=data.get('duration_seconds'),
        repetitions_completed=data.get('repetitions_completed'),
        sets_completed=data.get('sets_completed'),
        patient_rating=data.get('patient_rating'),
        difficulty_felt=data.get('difficulty_felt'),
        pain_level=data.get('pain_level'),
        effort_level=data.get('effort_level'),
        patient_comments=data.get('patient_comments'),
        location=data.get('location'),
        points_earned=points_earned,
        bonus_points=bonus_points,
        completed_at=datetime.utcnow()
    )
    
    db.session.add(execution)
    db.session.commit()
    
    return jsonify({
        'message': 'Execução registrada com sucesso',
        'execution': execution.to_dict(include_relations=True),
        'points_earned': points_earned + bonus_points
    }), 201


@exercises_bp.route('/executions/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient_executions(patient_id):
    """Lista execuções de exercícios do paciente"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'PACIENTE' and user_id != patient_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    query = ExerciseExecution.query.filter(ExerciseExecution.patient_id == patient_id)
    
    # Filtros
    exercise_id = request.args.get('exercise_id')
    if exercise_id:
        query = query.filter(ExerciseExecution.exercise_id == exercise_id)
    
    start_date = request.args.get('start_date')
    if start_date:
        query = query.filter(ExerciseExecution.started_at >= start_date)
    
    end_date = request.args.get('end_date')
    if end_date:
        query = query.filter(ExerciseExecution.started_at <= end_date)
    
    # Ordenação
    query = query.options(
        joinedload(ExerciseExecution.exercise),
        joinedload(ExerciseExecution.patient_exercise)
    ).order_by(desc(ExerciseExecution.started_at))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda ex: ex.to_dict(include_relations=True)
    )


# =============================================================================
# ESTATÍSTICAS E RELATÓRIOS
# =============================================================================

@exercises_bp.route('/stats/library', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_library_stats():
    """Estatísticas da biblioteca de exercícios"""
    
    # Contadores básicos
    total_exercises = Exercise.query.filter(Exercise.is_active == True).count()
    approved_exercises = Exercise.query.filter(
        Exercise.is_active == True,
        Exercise.is_approved == True
    ).count()
    
    # Por categoria
    category_stats = {}
    for category in ExerciseCategory:
        count = Exercise.query.filter(
            Exercise.is_active == True,
            Exercise.is_approved == True,
            Exercise.category == category
        ).count()
        category_stats[category.value] = count
    
    # Por dificuldade
    difficulty_stats = {}
    for difficulty in ExerciseDifficulty:
        count = Exercise.query.filter(
            Exercise.is_active == True,
            Exercise.is_approved == True,
            Exercise.difficulty == difficulty
        ).count()
        difficulty_stats[difficulty.value] = count
    
    # Exercícios mais executados
    most_executed = db.session.query(
        Exercise.id,
        Exercise.title,
        db.func.count(ExerciseExecution.id).label('execution_count')
    ).join(ExerciseExecution).filter(
        Exercise.is_active == True,
        Exercise.is_approved == True
    ).group_by(Exercise.id, Exercise.title).order_by(
        desc('execution_count')
    ).limit(10).all()
    
    return jsonify({
        'total_exercises': total_exercises,
        'approved_exercises': approved_exercises,
        'pending_approval': total_exercises - approved_exercises,
        'category_distribution': category_stats,
        'difficulty_distribution': difficulty_stats,
        'most_executed': [
            {
                'exercise_id': ex.id,
                'title': ex.title,
                'execution_count': ex.execution_count
            }
            for ex in most_executed
        ]
    })


@exercises_bp.route('/stats/patient/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient_stats(patient_id):
    """Estatísticas de exercícios do paciente"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'PACIENTE' and user_id != patient_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    # Contadores básicos
    total_prescribed = PatientExercise.query.filter(
        PatientExercise.patient_id == patient_id,
        PatientExercise.is_active == True
    ).count()
    
    completed_prescriptions = PatientExercise.query.filter(
        PatientExercise.patient_id == patient_id,
        PatientExercise.is_completed == True
    ).count()
    
    total_executions = ExerciseExecution.query.filter(
        ExerciseExecution.patient_id == patient_id,
        ExerciseExecution.completed_at.isnot(None)
    ).count()
    
    # Pontos totais
    total_points = db.session.query(
        db.func.sum(ExerciseExecution.points_earned + ExerciseExecution.bonus_points)
    ).filter(
        ExerciseExecution.patient_id == patient_id,
        ExerciseExecution.completed_at.isnot(None)
    ).scalar() or 0
    
    # Execuções por semana (últimas 8 semanas)
    from datetime import timedelta
    weekly_executions = []
    for week in range(8):
        week_start = datetime.now() - timedelta(weeks=week+1)
        week_end = datetime.now() - timedelta(weeks=week)
        
        count = ExerciseExecution.query.filter(
            ExerciseExecution.patient_id == patient_id,
            ExerciseExecution.completed_at >= week_start,
            ExerciseExecution.completed_at < week_end
        ).count()
        
        weekly_executions.insert(0, {
            'week': week_start.strftime('%Y-%m-%d'),
            'executions': count
        })
    
    return jsonify({
        'total_prescribed': total_prescribed,
        'completed_prescriptions': completed_prescriptions,
        'completion_rate': (completed_prescriptions / total_prescribed * 100) if total_prescribed > 0 else 0,
        'total_executions': total_executions,
        'total_points': total_points,
        'weekly_executions': weekly_executions
    })


# =============================================================================
# UTILITÁRIOS
# =============================================================================

@exercises_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Lista categorias de exercícios disponíveis"""
    return jsonify({
        'categories': [
            {
                'value': category.value,
                'label': category.value.replace('_', ' ').title()
            }
            for category in ExerciseCategory
        ]
    })


@exercises_bp.route('/difficulties', methods=['GET'])
@jwt_required()
def get_difficulties():
    """Lista níveis de dificuldade disponíveis"""
    return jsonify({
        'difficulties': [
            {
                'value': difficulty.value,
                'label': difficulty.value.replace('_', ' ').title()
            }
            for difficulty in ExerciseDifficulty
        ]
    })


@exercises_bp.route('/body-regions', methods=['GET'])
@jwt_required()
def get_body_regions():
    """Lista regiões corporais disponíveis"""
    return jsonify({
        'body_regions': [
            {
                'value': region.value,
                'label': region.value.replace('_', ' ').title()
            }
            for region in BodyRegion
        ]
    })


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(exercises_bp)