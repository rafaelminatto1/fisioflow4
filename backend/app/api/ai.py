"""
API endpoints para sistema de IA
"""

import asyncio
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.ai_orchestrator import ai_service, AIProvider, AITaskType
from ..models.user import User
from ..models.patient import Patient
from ..models.medical_record import MedicalRecord
from .. import db
from ..utils.decorators import role_required
from ..utils.validation import validate_json

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


# =============================================================================
# SOAP AUTO-COMPLETAR
# =============================================================================

@ai_bp.route('/soap/complete', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'])
@validate_json({
    'patient_id': {'type': 'string', 'required': True},
    'subjective': {'type': 'string', 'required': False},
    'objective': {'type': 'string', 'required': False},
    'assessment': {'type': 'string', 'required': False},
    'plan': {'type': 'string', 'required': False}
})
async def complete_soap():
    """Auto-completa evolução SOAP"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se paciente existe
    patient = Patient.query.get(data['patient_id'])
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    # Preparar dados parciais
    partial_data = {
        'subjective': data.get('subjective', ''),
        'objective': data.get('objective', ''),
        'assessment': data.get('assessment', ''),
        'plan': data.get('plan', '')
    }
    
    try:
        # Processar com IA
        response = await ai_service.complete_soap_evolution(
            patient_id=data['patient_id'],
            partial_data=partial_data,
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'suggestions': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'tokens_used': response.tokens_used,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# SUGESTÃO DE EXERCÍCIOS
# =============================================================================

@ai_bp.route('/exercises/suggest', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'])
@validate_json({
    'patient_id': {'type': 'string', 'required': True},
    'condition': {'type': 'string', 'required': True},
    'goals': {'type': 'list', 'required': True, 'minlength': 1},
    'limitations': {'type': 'list', 'required': False}
})
async def suggest_exercises():
    """Sugere exercícios personalizados"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se paciente existe
    patient = Patient.query.get(data['patient_id'])
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    try:
        response = await ai_service.suggest_exercises(
            patient_id=data['patient_id'],
            condition=data['condition'],
            goals=data['goals'],
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'suggestions': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# APOIO DIAGNÓSTICO
# =============================================================================

@ai_bp.route('/diagnosis/support', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'symptoms': {'type': 'list', 'required': True, 'minlength': 1},
    'examination_findings': {'type': 'dict', 'required': True},
    'patient_history': {'type': 'dict', 'required': False}
})
async def diagnosis_support():
    """Apoio ao diagnóstico diferencial"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    try:
        response = await ai_service.support_diagnosis(
            symptoms=data['symptoms'],
            examination_findings=data['examination_findings'],
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'analysis': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# PLANO DE TRATAMENTO
# =============================================================================

@ai_bp.route('/treatment/plan', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'patient_id': {'type': 'string', 'required': True},
    'diagnosis': {'type': 'string', 'required': True},
    'patient_profile': {'type': 'dict', 'required': True}
})
async def generate_treatment_plan():
    """Gera plano de tratamento"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar se paciente existe
    patient = Patient.query.get(data['patient_id'])
    if not patient:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    
    try:
        response = await ai_service.generate_treatment_plan(
            diagnosis=data['diagnosis'],
            patient_profile=data['patient_profile'],
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'treatment_plan': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# CHAT INTELIGENTE
# =============================================================================

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
@validate_json({
    'message': {'type': 'string', 'required': True, 'minlength': 1},
    'conversation_history': {'type': 'list', 'required': False},
    'context': {'type': 'dict', 'required': False}
})
async def chat():
    """Chat inteligente com IA"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    conversation_history = data.get('conversation_history', [])
    
    try:
        response = await ai_service.chat_response(
            message=data['message'],
            conversation_history=conversation_history,
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'response': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# ANÁLISE DE DOCUMENTOS
# =============================================================================

@ai_bp.route('/documents/analyze', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO'])
@validate_json({
    'content': {'type': 'string', 'required': True, 'minlength': 10},
    'document_type': {'type': 'string', 'required': True},
    'patient_id': {'type': 'string', 'required': False}
})
async def analyze_document():
    """Analisa documentos médicos"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # Verificar tamanho do documento
    if len(data['content']) > 50000:  # Limite de 50KB
        return jsonify({
            'error': 'Documento muito grande. Limite: 50KB'
        }), 400
    
    try:
        response = await ai_service.analyze_document(
            document_content=data['content'],
            document_type=data['document_type'],
            user_id=user_id
        )
        
        return jsonify({
            'success': response.success,
            'analysis': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# GERAÇÃO DE CASOS CLÍNICOS
# =============================================================================

@ai_bp.route('/cases/generate', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'specialty_area': {'type': 'string', 'required': True},
    'complexity_level': {'type': 'string', 'required': True, 'enum': ['basico', 'intermediario', 'avancado', 'complexo']},
    'learning_objectives': {'type': 'list', 'required': True, 'minlength': 1},
    'include_images': {'type': 'boolean', 'required': False}
})
async def generate_case_study():
    """Gera casos clínicos educacionais"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    prompt = f"""
Crie um caso clínico educacional detalhado:

Área de especialização: {data['specialty_area']}
Nível de complexidade: {data['complexity_level']}
Objetivos de aprendizagem: {', '.join(data['learning_objectives'])}

O caso deve incluir:
1. História clínica completa
2. Apresentação dos sintomas
3. Achados do exame físico
4. Exames complementares (se aplicável)
5. 3-5 questões de múltipla escolha com explicações
6. Diagnóstico sugerido com justificativa
7. Plano de tratamento recomendado

Mantenha realismo clínico e base as informações em evidência científica.
"""
    
    from ..services.ai_orchestrator import AIRequest
    
    request_obj = AIRequest(
        task_type=AITaskType.CASE_STUDY_GENERATION,
        prompt=prompt,
        context=data,
        user_id=user_id,
        temperature=0.8  # Criatividade para casos diversos
    )
    
    try:
        response = await ai_service.orchestrator.process_request(request_obj)
        
        return jsonify({
            'success': response.success,
            'case_study': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# AVALIAÇÃO DE COMPETÊNCIAS
# =============================================================================

@ai_bp.route('/competency/evaluate', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'FISIOTERAPEUTA'])
@validate_json({
    'intern_performance': {'type': 'dict', 'required': True},
    'evaluation_criteria': {'type': 'list', 'required': True},
    'performance_examples': {'type': 'list', 'required': False}
})
async def evaluate_competency():
    """Avalia competências de estagiários"""
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    prompt = f"""
Avalie as competências do estagiário baseado nos seguintes dados:

Desempenho do estagiário:
{str(data['intern_performance'])}

Critérios de avaliação:
{', '.join(data['evaluation_criteria'])}

Exemplos de desempenho (se disponíveis):
{str(data.get('performance_examples', []))}

Forneça:
1. Avaliação detalhada por competência
2. Pontos fortes identificados
3. Áreas que necessitam desenvolvimento
4. Sugestões específicas de melhoria
5. Plano de desenvolvimento personalizado
6. Pontuação sugerida (0-10) por área avaliada
"""
    
    from ..services.ai_orchestrator import AIRequest
    
    request_obj = AIRequest(
        task_type=AITaskType.COMPETENCY_EVALUATION,
        prompt=prompt,
        context=data,
        user_id=user_id,
        temperature=0.3  # Baixa para consistência avaliativa
    )
    
    try:
        response = await ai_service.orchestrator.process_request(request_obj)
        
        return jsonify({
            'success': response.success,
            'evaluation': response.content,
            'provider': response.provider.value,
            'confidence': response.confidence,
            'processing_time': response.processing_time,
            'error': response.error
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Erro no processamento: {str(e)}'
        }), 500


# =============================================================================
# UTILITÁRIOS E STATUS
# =============================================================================

@ai_bp.route('/status', methods=['GET'])
@jwt_required()
def ai_status():
    """Status dos provedores de IA"""
    
    available_providers = []
    
    # Verificar cada provedor
    orchestrator = ai_service.orchestrator
    
    for provider in AIProvider:
        is_available = provider in orchestrator.providers
        available_providers.append({
            'name': provider.value,
            'available': is_available,
            'description': _get_provider_description(provider)
        })
    
    return jsonify({
        'providers': available_providers,
        'total_available': len(orchestrator.providers),
        'default_provider': 'claude' if AIProvider.CLAUDE in orchestrator.providers else 'gpt4',
        'supported_tasks': [task.value for task in AITaskType]
    })


@ai_bp.route('/usage/stats', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def ai_usage_stats():
    """Estatísticas de uso da IA (placeholder)"""
    
    # Implementar coleta de métricas em produção
    return jsonify({
        'total_requests': 0,
        'requests_by_provider': {
            'claude': 0,
            'gpt4': 0,
            'gemini': 0
        },
        'requests_by_task': {
            task.value: 0 for task in AITaskType
        },
        'average_response_time': 0.0,
        'success_rate': 0.0,
        'tokens_used': {
            'total': 0,
            'by_provider': {
                'claude': 0,
                'gpt4': 0,
                'gemini': 0
            }
        }
    })


def _get_provider_description(provider: AIProvider) -> str:
    """Retorna descrição do provedor"""
    
    descriptions = {
        AIProvider.CLAUDE: "Anthropic Claude - Especialista em análise médica e texto científico",
        AIProvider.GPT4: "OpenAI GPT-4 - Modelo versátil com ampla base de conhecimento",
        AIProvider.GEMINI: "Google Gemini - Excelente para conversação e análise multimodal"
    }
    
    return descriptions.get(provider, "Provedor de IA")


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(ai_bp)