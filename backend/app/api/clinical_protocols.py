"""
API endpoints para protocolos clínicos baseados em evidência
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload

from ..models.clinical_protocols import (
    ClinicalProtocol, ProtocolApplication, InterventionTemplate,
    EvidenceLevel, ProtocolStatus, InterventionType
)
from ..models.user import User
from ..models.patient import Patient
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json

clinical_protocols_bp = Blueprint('clinical_protocols', __name__, url_prefix='/api/clinical_protocols')


# =============================================================================
# PROTOCOLOS CLÍNICOS
# =============================================================================

@clinical_protocols_bp.route('/protocols', methods=['GET'])
@jwt_required()
def get_protocols():
    """Lista protocolos clínicos"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = ClinicalProtocol.query
    
    # Filtros
    pathology = request.args.get('pathology')
    if pathology:
        query = query.filter(ClinicalProtocol.pathology.ilike(f'%{pathology}%'))
    
    body_region = request.args.get('body_region')
    if body_region:
        query = query.filter(ClinicalProtocol.body_region == body_region)
    
    specialization = request.args.get('specialization')
    if specialization:
        query = query.filter(ClinicalProtocol.specialization_area == specialization)
    
    evidence_level = request.args.get('evidence_level')
    if evidence_level:
        query = query.filter(ClinicalProtocol.evidence_level == EvidenceLevel(evidence_level))
    
    status = request.args.get('status')
    if status:
        query = query.filter(ClinicalProtocol.status == ProtocolStatus(status))
    else:
        # Por padrão, mostrar apenas protocolos ativos
        query = query.filter(ClinicalProtocol.status == ProtocolStatus.ACTIVE)
    
    # Busca por texto
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                ClinicalProtocol.title.ilike(f'%{search}%'),
                ClinicalProtocol.description.ilike(f'%{search}%')
            )
        )
    
    # Ordenação
    sort_by = request.args.get('sort_by', 'updated_at')
    if sort_by == 'usage':
        query = query.order_by(desc(ClinicalProtocol.usage_count))
    elif sort_by == 'evidence':
        query = query.order_by(ClinicalProtocol.evidence_level)
    else:
        query = query.order_by(desc(ClinicalProtocol.updated_at))
    
    # Eager loading
    query = query.options(joinedload(ClinicalProtocol.creator))
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda protocol: protocol.to_dict(include_details=include_details)
    )


@clinical_protocols_bp.route('/protocols/<protocol_id>', methods=['GET'])
@jwt_required()
def get_protocol(protocol_id):
    """Obtém protocolo específico"""
    
    protocol = ClinicalProtocol.query.get(protocol_id)
    if not protocol:
        return jsonify({'error': 'Protocolo não encontrado'}), 404
    
    # Incrementar contador de uso
    protocol.usage_count += 1
    protocol.last_used_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'protocol': protocol.to_dict(include_details=True)
    })


@clinical_protocols_bp.route('/protocols', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'title': {'type': 'string', 'required': True, 'maxlength': 300},
    'description': {'type': 'string', 'required': True},
    'pathology': {'type': 'string', 'required': True, 'maxlength': 200},
    'icd10_codes': {'type': 'list', 'required': True, 'minlength': 1},
    'body_region': {'type': 'string', 'required': True, 'maxlength': 100},
    'specialization_area': {'type': 'string', 'required': True, 'maxlength': 100},
    'evidence_level': {'type': 'string', 'required': True, 'enum': [e.value for e in EvidenceLevel]},
    'grade_recommendation': {'type': 'string', 'required': True, 'maxlength': 10},
    'references': {'type': 'list', 'required': True, 'minlength': 1},
    'indications': {'type': 'list', 'required': True, 'minlength': 1},
    'contraindications': {'type': 'list', 'required': True},
    'precautions': {'type': 'list', 'required': True},
    'phases': {'type': 'list', 'required': True, 'minlength': 1},
    'assessment_tools': {'type': 'list', 'required': True, 'minlength': 1},
    'outcome_measures': {'type': 'list', 'required': True, 'minlength': 1},
    'frequency_recommendations': {'type': 'dict', 'required': True},
    'inclusion_criteria': {'type': 'list', 'required': True, 'minlength': 1},
    'exclusion_criteria': {'type': 'list', 'required': True}
})
def create_protocol():
    """Cria novo protocolo clínico"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    protocol = ClinicalProtocol(
        title=data['title'],
        description=data['description'],
        pathology=data['pathology'],
        icd10_codes=data['icd10_codes'],
        body_region=data['body_region'],
        specialization_area=data['specialization_area'],
        evidence_level=EvidenceLevel(data['evidence_level']),
        grade_recommendation=data['grade_recommendation'],
        references=data['references'],
        indications=data['indications'],
        contraindications=data['contraindications'],
        precautions=data['precautions'],
        phases=data['phases'],
        assessment_tools=data['assessment_tools'],
        outcome_measures=data['outcome_measures'],
        frequency_recommendations=data['frequency_recommendations'],
        inclusion_criteria=data['inclusion_criteria'],
        exclusion_criteria=data['exclusion_criteria'],
        population_modifications=data.get('population_modifications', {}),
        created_by=user_id
    )
    
    db.session.add(protocol)
    db.session.commit()
    
    return jsonify({
        'message': 'Protocolo criado com sucesso',
        'protocol': protocol.to_dict(include_details=True)
    }), 201


@clinical_protocols_bp.route('/protocols/<protocol_id>', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def update_protocol(protocol_id):
    """Atualiza protocolo clínico"""
    
    protocol = ClinicalProtocol.query.get(protocol_id)
    if not protocol:
        return jsonify({'error': 'Protocolo não encontrado'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'FISIOTERAPEUTA' and protocol.created_by != user_id:
        return jsonify({'error': 'Sem permissão para editar este protocolo'}), 403
    
    data = request.get_json()
    
    # Atualizar campos permitidos
    allowed_fields = [
        'title', 'description', 'indications', 'contraindications', 'precautions',
        'phases', 'assessment_tools', 'outcome_measures', 'frequency_recommendations',
        'inclusion_criteria', 'exclusion_criteria', 'population_modifications'
    ]
    
    for field in allowed_fields:
        if field in data:
            setattr(protocol, field, data[field])
    
    protocol.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Protocolo atualizado com sucesso',
        'protocol': protocol.to_dict(include_details=True)
    })


@clinical_protocols_bp.route('/protocols/<protocol_id>/status', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN'])
@validate_json({
    'status': {'type': 'string', 'required': True, 'enum': [s.value for s in ProtocolStatus]}
})
def update_protocol_status(protocol_id):
    """Atualiza status do protocolo"""
    
    protocol = ClinicalProtocol.query.get(protocol_id)
    if not protocol:
        return jsonify({'error': 'Protocolo não encontrado'}), 404
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    old_status = protocol.status
    new_status = ProtocolStatus(data['status'])
    
    protocol.status = new_status
    protocol.updated_at = datetime.utcnow()
    
    # Registrar aprovação/revisão
    if new_status == ProtocolStatus.APPROVED and old_status != ProtocolStatus.APPROVED:
        protocol.approved_by = user_id
        protocol.approved_at = datetime.utcnow()
    elif new_status == ProtocolStatus.REVIEW and old_status != ProtocolStatus.REVIEW:
        protocol.reviewed_by = user_id
        protocol.reviewed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': f'Status alterado para {new_status.value}',
        'protocol': protocol.to_dict(include_details=True)
    })


# =============================================================================
# APLICAÇÃO DE PROTOCOLOS
# =============================================================================

@clinical_protocols_bp.route('/applications', methods=['GET'])
@jwt_required()
def get_protocol_applications():
    """Lista aplicações de protocolos"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = ProtocolApplication.query
    
    # Fisioterapeutas só veem suas aplicações
    if user.role == 'FISIOTERAPEUTA':
        query = query.filter(ProtocolApplication.therapist_id == user_id)
    
    # Filtros
    patient_id = request.args.get('patient_id')
    if patient_id:
        query = query.filter(ProtocolApplication.patient_id == patient_id)
    
    protocol_id = request.args.get('protocol_id')
    if protocol_id:
        query = query.filter(ProtocolApplication.protocol_id == protocol_id)
    
    is_active = request.args.get('is_active')
    if is_active:
        query = query.filter(ProtocolApplication.is_active == (is_active.lower() == 'true'))
    
    completion_status = request.args.get('completion_status')
    if completion_status:
        query = query.filter(ProtocolApplication.completion_status == completion_status)
    
    # Ordenação
    query = query.options(
        joinedload(ProtocolApplication.protocol),
        joinedload(ProtocolApplication.patient),
        joinedload(ProtocolApplication.therapist)
    ).order_by(desc(ProtocolApplication.updated_at))
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda app: app.to_dict(include_details=include_details)
    )


@clinical_protocols_bp.route('/applications', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'protocol_id': {'type': 'string', 'required': True},
    'patient_id': {'type': 'string', 'required': True},
    'start_date': {'type': 'string', 'required': True},
    'expected_end_date': {'type': 'string', 'required': False},
    'customizations': {'type': 'dict', 'required': False},
    'baseline_assessment': {'type': 'dict', 'required': False}
})
def apply_protocol():
    """Aplica protocolo a um paciente"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se protocolo existe
    protocol = ClinicalProtocol.query.get(data['protocol_id'])
    if not protocol:
        return jsonify({'error': 'Protocolo não encontrado'}), 404
    
    if protocol.status != ProtocolStatus.ACTIVE:
        return jsonify({'error': 'Protocolo não está ativo'}), 400
    
    # Verificar se paciente existe
    patient = Patient.query.get(data['patient_id'])
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    # Validar datas
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        expected_end_date = None
        if data.get('expected_end_date'):
            expected_end_date = datetime.strptime(data['expected_end_date'], '%Y-%m-%d').date()
            if expected_end_date <= start_date:
                return jsonify({'error': 'Data de fim deve ser posterior à data de início'}), 400
    except ValueError:
        return jsonify({'error': 'Formato de data inválido'}), 400
    
    # Verificar se já não existe aplicação ativa para o mesmo protocolo/paciente
    existing_application = ProtocolApplication.query.filter_by(
        protocol_id=data['protocol_id'],
        patient_id=data['patient_id'],
        is_active=True
    ).first()
    
    if existing_application:
        return jsonify({'error': 'Já existe uma aplicação ativa deste protocolo para este paciente'}), 400
    
    # Inicializar progresso das fases
    phase_progress = {}
    for i in range(len(protocol.phases)):
        phase_progress[f'phase_{i}'] = {
            'started': None,
            'completed': None,
            'progress': 0
        }
    
    # Iniciar primeira fase
    if phase_progress:
        phase_progress['phase_0']['started'] = datetime.utcnow().isoformat()
    
    application = ProtocolApplication(
        protocol_id=data['protocol_id'],
        patient_id=data['patient_id'],
        therapist_id=user_id,
        start_date=start_date,
        expected_end_date=expected_end_date,
        customizations=data.get('customizations', {}),
        baseline_assessment=data.get('baseline_assessment'),
        phase_progress=phase_progress
    )
    
    db.session.add(application)
    db.session.commit()
    
    return jsonify({
        'message': 'Protocolo aplicado com sucesso',
        'application': application.to_dict(include_details=True)
    }), 201


@clinical_protocols_bp.route('/applications/<application_id>/progress', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'current_phase': {'type': 'integer', 'required': False, 'min': 0},
    'phase_progress': {'type': 'dict', 'required': False},
    'progress_assessment': {'type': 'dict', 'required': False},
    'therapist_notes': {'type': 'string', 'required': False}
})
def update_application_progress(application_id):
    """Atualiza progresso da aplicação"""
    
    application = ProtocolApplication.query.get(application_id)
    if not application:
        return jsonify({'error': 'Aplicação não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'FISIOTERAPEUTA' and application.therapist_id != user_id:
        return jsonify({'error': 'Sem permissão para editar esta aplicação'}), 403
    
    data = request.get_json()
    
    # Atualizar fase atual
    if 'current_phase' in data:
        old_phase = application.current_phase
        new_phase = data['current_phase']
        
        if new_phase >= len(application.protocol.phases):
            return jsonify({'error': 'Fase inválida'}), 400
        
        application.current_phase = new_phase
        
        # Se mudou de fase, atualizar timestamps
        if new_phase != old_phase:
            # Marcar fase anterior como completa
            if f'phase_{old_phase}' in application.phase_progress:
                application.phase_progress[f'phase_{old_phase}']['completed'] = datetime.utcnow().isoformat()
                application.phase_progress[f'phase_{old_phase}']['progress'] = 100
            
            # Iniciar nova fase
            if f'phase_{new_phase}' in application.phase_progress:
                application.phase_progress[f'phase_{new_phase}']['started'] = datetime.utcnow().isoformat()
    
    # Atualizar progresso das fases
    if 'phase_progress' in data:
        for phase_key, progress_data in data['phase_progress'].items():
            if phase_key in application.phase_progress:
                application.phase_progress[phase_key].update(progress_data)
    
    # Adicionar avaliação de progresso
    if 'progress_assessment' in data:
        date_key = datetime.now().strftime('%Y-%m-%d')
        if not application.progress_assessments:
            application.progress_assessments = {}
        application.progress_assessments[date_key] = data['progress_assessment']
    
    # Atualizar notas
    if 'therapist_notes' in data:
        application.therapist_notes = data['therapist_notes']
    
    application.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Progresso atualizado com sucesso',
        'application': application.to_dict(include_details=True)
    })


@clinical_protocols_bp.route('/applications/<application_id>/complete', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'completion_status': {'type': 'string', 'required': True, 'enum': ['concluido', 'interrompido']},
    'completion_reason': {'type': 'string', 'required': False},
    'outcome_achievement': {'type': 'dict', 'required': False},
    'final_assessment': {'type': 'dict', 'required': False}
})
def complete_application(application_id):
    """Completa aplicação do protocolo"""
    
    application = ProtocolApplication.query.get(application_id)
    if not application:
        return jsonify({'error': 'Aplicação não encontrada'}), 404
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Verificar permissões
    if user.role == 'FISIOTERAPEUTA' and application.therapist_id != user_id:
        return jsonify({'error': 'Sem permissão para editar esta aplicação'}), 403
    
    data = request.get_json()
    
    application.completion_status = data['completion_status']
    application.completion_reason = data.get('completion_reason')
    application.is_active = False
    application.actual_end_date = date.today()
    
    if 'outcome_achievement' in data:
        application.outcome_achievement = data['outcome_achievement']
    
    if 'final_assessment' in data:
        date_key = datetime.now().strftime('%Y-%m-%d')
        if not application.progress_assessments:
            application.progress_assessments = {}
        application.progress_assessments[date_key] = data['final_assessment']
    
    application.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': f'Aplicação {data["completion_status"]} com sucesso',
        'application': application.to_dict(include_details=True)
    })


# =============================================================================
# TEMPLATES DE INTERVENÇÃO
# =============================================================================

@clinical_protocols_bp.route('/interventions', methods=['GET'])
@jwt_required()
def get_intervention_templates():
    """Lista templates de intervenção"""
    
    query = InterventionTemplate.query.filter(InterventionTemplate.is_active == True)
    
    # Filtros
    intervention_type = request.args.get('type')
    if intervention_type:
        query = query.filter(InterventionTemplate.intervention_type == InterventionType(intervention_type))
    
    category = request.args.get('category')
    if category:
        query = query.filter(InterventionTemplate.category.ilike(f'%{category}%'))
    
    evidence_level = request.args.get('evidence_level')
    if evidence_level:
        query = query.filter(InterventionTemplate.evidence_level == EvidenceLevel(evidence_level))
    
    # Busca por texto
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                InterventionTemplate.name.ilike(f'%{search}%'),
                InterventionTemplate.description.ilike(f'%{search}%')
            )
        )
    
    # Ordenação
    query = query.options(joinedload(InterventionTemplate.creator)).order_by(InterventionTemplate.name)
    
    include_details = request.args.get('include_details', 'false').lower() == 'true'
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda intervention: intervention.to_dict(include_details=include_details)
    )


@clinical_protocols_bp.route('/interventions', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'name': {'type': 'string', 'required': True, 'maxlength': 200},
    'intervention_type': {'type': 'string', 'required': True, 'enum': [t.value for t in InterventionType]},
    'category': {'type': 'string', 'required': True, 'maxlength': 100},
    'description': {'type': 'string', 'required': True},
    'detailed_instructions': {'type': 'string', 'required': True},
    'default_dosage': {'type': 'dict', 'required': True},
    'progression_criteria': {'type': 'list', 'required': True, 'minlength': 1},
    'evidence_level': {'type': 'string', 'required': True, 'enum': [e.value for e in EvidenceLevel]},
    'equipment_needed': {'type': 'list', 'required': False},
    'contraindications': {'type': 'list', 'required': False},
    'precautions': {'type': 'list', 'required': False},
    'evidence_references': {'type': 'list', 'required': False}
})
def create_intervention_template():
    """Cria template de intervenção"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    intervention = InterventionTemplate(
        name=data['name'],
        intervention_type=InterventionType(data['intervention_type']),
        category=data['category'],
        description=data['description'],
        detailed_instructions=data['detailed_instructions'],
        default_dosage=data['default_dosage'],
        progression_criteria=data['progression_criteria'],
        evidence_level=EvidenceLevel(data['evidence_level']),
        equipment_needed=data.get('equipment_needed', []),
        contraindications=data.get('contraindications', []),
        precautions=data.get('precautions', []),
        evidence_references=data.get('evidence_references', []),
        created_by=user_id
    )
    
    db.session.add(intervention)
    db.session.commit()
    
    return jsonify({
        'message': 'Template de intervenção criado com sucesso',
        'intervention': intervention.to_dict(include_details=True)
    }), 201


# =============================================================================
# ESTATÍSTICAS E RELATÓRIOS
# =============================================================================

@clinical_protocols_bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
def get_protocol_stats():
    """Estatísticas dos protocolos"""
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Estatísticas gerais
    total_protocols = ClinicalProtocol.query.filter(ClinicalProtocol.status == ProtocolStatus.ACTIVE).count()
    
    # Protocolos por especialização
    specializations = db.session.query(
        ClinicalProtocol.specialization_area,
        func.count(ClinicalProtocol.id)
    ).filter(ClinicalProtocol.status == ProtocolStatus.ACTIVE).group_by(
        ClinicalProtocol.specialization_area
    ).all()
    
    # Protocolos mais utilizados
    most_used = ClinicalProtocol.query.filter(
        ClinicalProtocol.status == ProtocolStatus.ACTIVE
    ).order_by(desc(ClinicalProtocol.usage_count)).limit(10).all()
    
    # Aplicações ativas
    active_applications_query = ProtocolApplication.query.filter(ProtocolApplication.is_active == True)
    
    if user.role == 'FISIOTERAPEUTA':
        active_applications_query = active_applications_query.filter(ProtocolApplication.therapist_id == user_id)
    
    active_applications = active_applications_query.count()
    
    # Taxa de conclusão
    completed_applications = ProtocolApplication.query.filter(
        ProtocolApplication.completion_status == 'concluido'
    )
    
    if user.role == 'FISIOTERAPEUTA':
        completed_applications = completed_applications.filter(ProtocolApplication.therapist_id == user_id)
    
    completed_count = completed_applications.count()
    total_applications = ProtocolApplication.query
    
    if user.role == 'FISIOTERAPEUTA':
        total_applications = total_applications.filter(ProtocolApplication.therapist_id == user_id)
    
    total_app_count = total_applications.count()
    completion_rate = (completed_count / total_app_count * 100) if total_app_count > 0 else 0
    
    return jsonify({
        'total_protocols': total_protocols,
        'active_applications': active_applications,
        'completion_rate': round(completion_rate, 1),
        'specializations': [
            {'name': spec, 'count': count} 
            for spec, count in specializations
        ],
        'most_used_protocols': [
            {
                'id': protocol.id,
                'title': protocol.title,
                'usage_count': protocol.usage_count,
                'pathology': protocol.pathology
            }
            for protocol in most_used
        ]
    })


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(clinical_protocols_bp)