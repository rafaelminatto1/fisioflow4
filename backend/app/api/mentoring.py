"""
API endpoints para sistema de mentoria e ensino
"""

from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from ..models.mentoring import (
    Intern, EducationalCase, CaseSubmission, CompetencyEvaluation, LearningActivity,
    CompetencyLevel, EvaluationStatus, CaseComplexity
)
from ..models.user import User
from ..models.patient import Patient
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json

mentoring_bp = Blueprint('mentoring', __name__, url_prefix='/api/mentoring')


# =============================================================================
# GESTÃO DE ESTAGIÁRIOS
# =============================================================================

@mentoring_bp.route('/interns', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_interns():
    """Lista estagiários"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = Intern.query.filter(Intern.is_active == True)
    
    # Fisioterapeutas só veem seus mentoreados
    if user.role == 'FISIOTERAPEUTA':
        query = query.filter(Intern.mentor_id == user_id)
    
    # Filtros
    university = request.args.get('university')
    if university:
        query = query.filter(Intern.university.ilike(f'%{university}%'))
    
    course_year = request.args.get('course_year')
    if course_year:
        query = query.filter(Intern.course_year == int(course_year))
    
    # Ordenação
    query = query.options(joinedload(Intern.user), joinedload(Intern.mentor)).order_by(desc(Intern.created_at))
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda intern: intern.to_dict(include_details=include_details)
    )


@mentoring_bp.route('/interns/<intern_id>', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'])
def get_intern(intern_id):
    """Obtém estagiário específico"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    intern = Intern.query.get(intern_id)
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Verificar permissões
    if user.role == 'ESTAGIARIO' and intern.user_id != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    elif user.role == 'FISIOTERAPEUTA' and intern.mentor_id != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    return jsonify({
        'intern': intern.to_dict(include_details=True)
    })


@mentoring_bp.route('/interns', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'user_id': {'type': 'string', 'required': True},
    'university': {'type': 'string', 'required': True, 'maxlength': 200},
    'course_year': {'type': 'integer', 'required': True, 'min': 1, 'max': 10},
    'graduation_year': {'type': 'integer', 'required': True},
    'start_date': {'type': 'string', 'required': True},
    'end_date': {'type': 'string', 'required': True},
    'hours_required': {'type': 'integer', 'required': True, 'min': 1},
    'specialization_areas': {'type': 'list', 'required': True, 'minlength': 1},
    'learning_objectives': {'type': 'string', 'required': False}
})
def create_intern():
    """Cria novo estagiário"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se o usuário existe e tem o role correto
    target_user = User.query.get(data['user_id'])
    if not target_user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    if target_user.role != 'ESTAGIARIO':
        return jsonify({'error': 'Usuário não é um estagiário'}), 400
    
    # Verificar se já não é estagiário
    existing_intern = Intern.query.filter_by(user_id=data['user_id']).first()
    if existing_intern:
        return jsonify({'error': 'Usuário já é um estagiário cadastrado'}), 400
    
    # Validar datas
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        if end_date <= start_date:
            return jsonify({'error': 'Data de fim deve ser posterior à data de início'}), 400
            
    except ValueError:
        return jsonify({'error': 'Formato de data inválido'}), 400
    
    intern = Intern(
        user_id=data['user_id'],
        mentor_id=user_id,
        university=data['university'],
        course_year=data['course_year'],
        graduation_year=data['graduation_year'],
        start_date=start_date,
        end_date=end_date,
        hours_required=data['hours_required'],
        specialization_areas=data['specialization_areas'],
        learning_objectives=data.get('learning_objectives'),
        competency_levels={area: CompetencyLevel.NOVATO.value for area in data['specialization_areas']}
    )
    
    db.session.add(intern)
    db.session.commit()
    
    return jsonify({
        'message': 'Estagiário cadastrado com sucesso',
        'intern': intern.to_dict(include_details=True)
    }), 201


@mentoring_bp.route('/interns/<intern_id>/hours', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'hours': {'type': 'integer', 'required': True, 'min': 1}
})
def add_intern_hours(intern_id):
    """Adiciona horas ao estagiário"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    intern = Intern.query.get(intern_id)
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Verificar permissões
    user = User.query.get(user_id)
    if user.role == 'FISIOTERAPEUTA' and intern.mentor_id != user_id:
        return jsonify({'error': 'Sem permissão para editar este estagiário'}), 403
    
    intern.hours_completed += data['hours']
    intern.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Horas adicionadas com sucesso',
        'hours_completed': intern.hours_completed,
        'progress_percentage': intern.progress_percentage
    })


# =============================================================================
# CASOS EDUCACIONAIS
# =============================================================================

@mentoring_bp.route('/cases', methods=['GET'])
@jwt_required()
def get_educational_cases():
    """Lista casos educacionais"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = EducationalCase.query.filter(EducationalCase.is_active == True)
    
    # Filtros
    complexity = request.args.get('complexity')
    if complexity:
        query = query.filter(EducationalCase.complexity == CaseComplexity(complexity))
    
    specialization = request.args.get('specialization')
    if specialization:
        query = query.filter(EducationalCase.specialization_areas.contains([specialization]))
    
    assigned_to_me = request.args.get('assigned_to_me', 'false').lower() == 'true'
    if assigned_to_me and user.role == 'ESTAGIARIO':
        # Encontrar perfil de estagiário
        intern = Intern.query.filter_by(user_id=user_id).first()
        if intern:
            query = query.filter(EducationalCase.assigned_intern_id == intern.id)
    
    # Ordenação
    query = query.options(
        joinedload(EducationalCase.creator),
        joinedload(EducationalCase.assigned_intern)
    ).order_by(desc(EducationalCase.created_at))
    
    include_answers = user.role in ['ADMIN', 'FISIOTERAPEUTA']
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda case: case.to_dict(include_details=True, include_answers=include_answers)
    )


@mentoring_bp.route('/cases', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'title': {'type': 'string', 'required': True, 'maxlength': 300},
    'description': {'type': 'string', 'required': True},
    'complexity': {'type': 'string', 'required': True, 'enum': [c.value for c in CaseComplexity]},
    'specialization_areas': {'type': 'list', 'required': True, 'minlength': 1},
    'pathologies': {'type': 'list', 'required': True, 'minlength': 1},
    'patient_history': {'type': 'string', 'required': True},
    'clinical_presentation': {'type': 'string', 'required': True},
    'examination_findings': {'type': 'string', 'required': False},
    'learning_objectives': {'type': 'list', 'required': True, 'minlength': 1},
    'expected_competencies': {'type': 'list', 'required': True, 'minlength': 1},
    'questions': {'type': 'list', 'required': True, 'minlength': 1},
    'suggested_treatment': {'type': 'string', 'required': False},
    'treatment_rationale': {'type': 'string', 'required': False}
})
def create_case():
    """Cria novo caso educacional"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    case = EducationalCase(
        title=data['title'],
        description=data['description'],
        complexity=CaseComplexity(data['complexity']),
        specialization_areas=data['specialization_areas'],
        pathologies=data['pathologies'],
        patient_history=data['patient_history'],
        clinical_presentation=data['clinical_presentation'],
        examination_findings=data.get('examination_findings'),
        learning_objectives=data['learning_objectives'],
        expected_competencies=data['expected_competencies'],
        questions=data['questions'],
        suggested_treatment=data.get('suggested_treatment'),
        treatment_rationale=data.get('treatment_rationale'),
        created_by=user_id
    )
    
    db.session.add(case)
    db.session.commit()
    
    return jsonify({
        'message': 'Caso criado com sucesso',
        'case': case.to_dict(include_details=True, include_answers=True)
    }), 201


@mentoring_bp.route('/cases/<case_id>/assign', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'intern_id': {'type': 'string', 'required': True},
    'due_date': {'type': 'string', 'required': False}
})
def assign_case(case_id):
    """Atribui caso a um estagiário"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    case = EducationalCase.query.get(case_id)
    if not case:
        return jsonify({'error': 'Caso não encontrado'}), 404
    
    intern = Intern.query.get(data['intern_id'])
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Verificar permissões
    user = User.query.get(user_id)
    if user.role == 'FISIOTERAPEUTA' and intern.mentor_id != user_id:
        return jsonify({'error': 'Sem permissão para atribuir caso a este estagiário'}), 403
    
    # Atribuir caso
    case.assigned_intern_id = data['intern_id']
    case.assigned_at = datetime.utcnow()
    
    if data.get('due_date'):
        try:
            case.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data inválido'}), 400
    
    db.session.commit()
    
    return jsonify({
        'message': 'Caso atribuído com sucesso',
        'case': case.to_dict(include_details=True)
    })


# =============================================================================
# SUBMISSÕES DE CASOS
# =============================================================================

@mentoring_bp.route('/cases/<case_id>/submit', methods=['POST'])
@jwt_required()
@role_required(['ESTAGIARIO'])
@validate_json({
    'answers': {'type': 'dict', 'required': True},
    'clinical_analysis': {'type': 'string', 'required': True},
    'proposed_treatment': {'type': 'string', 'required': True},
    'differential_diagnosis': {'type': 'string', 'required': False}
})
def submit_case(case_id):
    """Submete resolução de caso"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Encontrar perfil de estagiário
    intern = Intern.query.filter_by(user_id=user_id).first()
    if not intern:
        return jsonify({'error': 'Perfil de estagiário não encontrado'}), 404
    
    case = EducationalCase.query.get(case_id)
    if not case:
        return jsonify({'error': 'Caso não encontrado'}), 404
    
    # Verificar se o caso está atribuído ao estagiário
    if case.assigned_intern_id != intern.id:
        return jsonify({'error': 'Caso não atribuído a você'}), 403
    
    # Verificar se já não foi submetido
    existing_submission = CaseSubmission.query.filter_by(
        case_id=case_id,
        intern_id=intern.id
    ).first()
    if existing_submission:
        return jsonify({'error': 'Caso já foi submetido'}), 400
    
    # Calcular pontuação automática
    correct_answers = 0
    total_questions = len(case.questions)
    
    for i, question in enumerate(case.questions):
        user_answer = data['answers'].get(f'question_{i}')
        correct_answer = question.get('correct_answer')
        
        if user_answer is not None and user_answer == correct_answer:
            correct_answers += 1
    
    score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    
    submission = CaseSubmission(
        case_id=case_id,
        intern_id=intern.id,
        answers=data['answers'],
        clinical_analysis=data['clinical_analysis'],
        proposed_treatment=data['proposed_treatment'],
        differential_diagnosis=data.get('differential_diagnosis'),
        score=score,
        correct_answers=correct_answers,
        total_questions=total_questions
    )
    
    db.session.add(submission)
    db.session.commit()
    
    return jsonify({
        'message': 'Caso submetido com sucesso',
        'submission': submission.to_dict(include_details=True),
        'score': score,
        'correct_answers': correct_answers,
        'total_questions': total_questions
    }), 201


@mentoring_bp.route('/submissions/<submission_id>/review', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'mentor_feedback': {'type': 'string', 'required': True},
    'mentor_score': {'type': 'number', 'required': True, 'min': 0, 'max': 100},
    'improvement_areas': {'type': 'list', 'required': False},
    'strengths': {'type': 'list', 'required': False}
})
def review_submission(submission_id):
    """Revisa submissão de caso"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    submission = CaseSubmission.query.get(submission_id)
    if not submission:
        return jsonify({'error': 'Submissão não encontrada'}), 404
    
    # Verificar permissões
    user = User.query.get(user_id)
    if user.role == 'FISIOTERAPEUTA':
        intern = submission.intern
        if intern.mentor_id != user_id:
            return jsonify({'error': 'Sem permissão para revisar esta submissão'}), 403
    
    submission.mentor_feedback = data['mentor_feedback']
    submission.mentor_score = data['mentor_score']
    submission.improvement_areas = data.get('improvement_areas', [])
    submission.strengths = data.get('strengths', [])
    submission.reviewed_by = user_id
    submission.reviewed_at = datetime.utcnow()
    submission.status = EvaluationStatus.CONCLUIDA
    
    db.session.commit()
    
    return jsonify({
        'message': 'Submissão revisada com sucesso',
        'submission': submission.to_dict(include_details=True)
    })


# =============================================================================
# AVALIAÇÕES DE COMPETÊNCIA
# =============================================================================

@mentoring_bp.route('/evaluations', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'intern_id': {'type': 'string', 'required': True},
    'evaluation_type': {'type': 'string', 'required': True},
    'period': {'type': 'string', 'required': True},
    'competencies': {'type': 'dict', 'required': True},
    'overall_score': {'type': 'number', 'required': True, 'min': 0, 'max': 10},
    'overall_level': {'type': 'string', 'required': True, 'enum': [l.value for l in CompetencyLevel]},
    'strengths': {'type': 'list', 'required': True},
    'weaknesses': {'type': 'list', 'required': True},
    'recommendations': {'type': 'list', 'required': True},
    'development_plan': {'type': 'string', 'required': False},
    'next_objectives': {'type': 'list', 'required': False}
})
def create_evaluation():
    """Cria avaliação de competência"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    intern = Intern.query.get(data['intern_id'])
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Verificar permissões
    user = User.query.get(user_id)
    if user.role == 'FISIOTERAPEUTA' and intern.mentor_id != user_id:
        return jsonify({'error': 'Sem permissão para avaliar este estagiário'}), 403
    
    evaluation = CompetencyEvaluation(
        intern_id=data['intern_id'],
        evaluator_id=user_id,
        evaluation_type=data['evaluation_type'],
        period=data['period'],
        competencies=data['competencies'],
        overall_score=data['overall_score'],
        overall_level=CompetencyLevel(data['overall_level']),
        strengths=data['strengths'],
        weaknesses=data['weaknesses'],
        recommendations=data['recommendations'],
        development_plan=data.get('development_plan'),
        next_objectives=data.get('next_objectives', []),
        status=EvaluationStatus.CONCLUIDA,
        completed_at=datetime.utcnow()
    )
    
    # Atualizar níveis de competência do estagiário
    for competency, details in data['competencies'].items():
        if 'level' in details:
            intern.competency_levels[competency] = details['level']
    
    intern.updated_at = datetime.utcnow()
    
    db.session.add(evaluation)
    db.session.commit()
    
    return jsonify({
        'message': 'Avaliação criada com sucesso',
        'evaluation': evaluation.to_dict(include_details=True)
    }), 201


# =============================================================================
# ATIVIDADES DE APRENDIZAGEM
# =============================================================================

@mentoring_bp.route('/activities', methods=['POST'])
@jwt_required()
@validate_json({
    'intern_id': {'type': 'string', 'required': True},
    'activity_type': {'type': 'string', 'required': True},
    'title': {'type': 'string', 'required': True, 'maxlength': 200},
    'description': {'type': 'string', 'required': True},
    'date': {'type': 'string', 'required': True},
    'duration_hours': {'type': 'number', 'required': True, 'min': 0.5},
    'patient_id': {'type': 'string', 'required': False},
    'competencies_practiced': {'type': 'list', 'required': True, 'minlength': 1},
    'intern_reflection': {'type': 'string', 'required': False}
})
def create_learning_activity():
    """Cria atividade de aprendizagem"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    intern = Intern.query.get(data['intern_id'])
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Validar data
    try:
        activity_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data inválido'}), 400
    
    activity = LearningActivity(
        intern_id=data['intern_id'],
        supervisor_id=user_id,
        activity_type=data['activity_type'],
        title=data['title'],
        description=data['description'],
        date=activity_date,
        duration_hours=data['duration_hours'],
        patient_id=data.get('patient_id'),
        competencies_practiced=data['competencies_practiced'],
        intern_reflection=data.get('intern_reflection')
    )
    
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'message': 'Atividade registrada com sucesso',
        'activity': activity.to_dict(include_details=True)
    }), 201


# =============================================================================
# ESTATÍSTICAS E RELATÓRIOS
# =============================================================================

@mentoring_bp.route('/stats/intern/<intern_id>', methods=['GET'])
@jwt_required()
def get_intern_stats(intern_id):
    """Estatísticas do estagiário"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    intern = Intern.query.get(intern_id)
    if not intern:
        return jsonify({'error': 'Estagiário não encontrado'}), 404
    
    # Verificar permissões
    if user.role == 'ESTAGIARIO' and intern.user_id != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    elif user.role == 'FISIOTERAPEUTA' and intern.mentor_id != user_id:
        return jsonify({'error': 'Acesso não autorizado'}), 403
    
    # Estatísticas de casos
    total_cases = CaseSubmission.query.filter_by(intern_id=intern_id).count()
    completed_cases = CaseSubmission.query.filter_by(
        intern_id=intern_id,
        status=EvaluationStatus.CONCLUIDA
    ).count()
    
    # Pontuação média
    avg_score = db.session.query(func.avg(CaseSubmission.mentor_score)).filter(
        CaseSubmission.intern_id == intern_id,
        CaseSubmission.mentor_score.isnot(None)
    ).scalar() or 0
    
    # Atividades de aprendizagem
    total_activities = LearningActivity.query.filter_by(intern_id=intern_id).count()
    approved_activities = LearningActivity.query.filter_by(
        intern_id=intern_id,
        is_approved=True
    ).count()
    
    # Total de horas de atividades
    total_activity_hours = db.session.query(func.sum(LearningActivity.duration_hours)).filter(
        LearningActivity.intern_id == intern_id,
        LearningActivity.is_approved == True
    ).scalar() or 0
    
    # Última avaliação
    latest_evaluation = CompetencyEvaluation.query.filter_by(
        intern_id=intern_id
    ).order_by(desc(CompetencyEvaluation.completed_at)).first()
    
    return jsonify({
        'intern_profile': intern.to_dict(include_details=True),
        'case_stats': {
            'total_cases': total_cases,
            'completed_cases': completed_cases,
            'completion_rate': (completed_cases / total_cases * 100) if total_cases > 0 else 0,
            'average_score': round(avg_score, 1)
        },
        'activity_stats': {
            'total_activities': total_activities,
            'approved_activities': approved_activities,
            'total_hours': float(total_activity_hours),
            'approval_rate': (approved_activities / total_activities * 100) if total_activities > 0 else 0
        },
        'latest_evaluation': latest_evaluation.to_dict() if latest_evaluation else None,
        'competency_levels': intern.competency_levels
    })


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(mentoring_bp)