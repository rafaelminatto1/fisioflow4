"""
API routes para prontuários médicos
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, desc
from datetime import datetime, date
from typing import Dict, Any

from app import db
from app.models.user import User, UserRole
from app.models.patient import Patient, MedicalRecord, Evolution
from app.auth.utils import roles_required

medical_records_bp = Blueprint('medical_records', __name__)


@medical_records_bp.route('/', methods=['POST'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def create_medical_record():
    """Criar prontuário médico para um paciente"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validações básicas
        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'Patient ID é obrigatório'}), 400
        
        # Verificar se paciente existe
        patient = Patient.query.get_or_404(patient_id)
        
        # Criar prontuário
        medical_record = MedicalRecord(
            patient_id=patient_id,
            created_by=current_user_id,
            queixa_principal=data.get('queixa_principal'),
            historia_doenca_atual=data.get('historia_doenca_atual'),
            historia_patologica_pregressa=data.get('historia_patologica_pregressa'),
            historia_familiar=data.get('historia_familiar'),
            medicamentos_uso=data.get('medicamentos_uso'),
            alergias=data.get('alergias'),
            inspecao=data.get('inspecao'),
            palpacao=data.get('palpacao'),
            amplitude_movimento=data.get('amplitude_movimento'),
            forca_muscular=data.get('forca_muscular'),
            testes_especiais=data.get('testes_especiais'),
            escalas_funcionais=data.get('escalas_funcionais'),
            objetivos_tratamento=data.get('objetivos_tratamento'),
            diagnostico_fisioterapeutico=data.get('diagnostico_fisioterapeutico'),
            cid10=data.get('cid10'),
            plano_tratamento=data.get('plano_tratamento'),
            prognostico=data.get('prognostico'),
            data_avaliacao=datetime.strptime(data['data_avaliacao'], '%Y-%m-%d').date() if data.get('data_avaliacao') else date.today(),
        )
        
        db.session.add(medical_record)
        db.session.commit()
        
        return jsonify({
            'message': 'Prontuário criado com sucesso',
            'medical_record': medical_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar prontuário: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/<record_id>', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO, UserRole.PACIENTE)
def get_medical_record(record_id: str):
    """Obter detalhes de um prontuário"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        medical_record = MedicalRecord.query.get_or_404(record_id)
        patient = medical_record.patient
        
        # Verificar se usuário pode acessar este prontuário
        if current_user.role == UserRole.PACIENTE:
            if not patient.user_id or patient.user_id != current_user_id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        # Carregar evoluções
        evolutions = Evolution.query.filter_by(medical_record_id=record_id).order_by(
            Evolution.data_atendimento.desc()
        ).all()
        
        record_data = medical_record.to_dict()
        record_data['evolutions'] = [evolution.to_dict() for evolution in evolutions]
        record_data['patient_name'] = patient.nome_completo
        
        return jsonify(record_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter prontuário: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/<record_id>', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_medical_record(record_id: str):
    """Atualizar prontuário médico"""
    try:
        medical_record = MedicalRecord.query.get_or_404(record_id)
        data = request.get_json()
        
        # Campos atualizáveis
        updateable_fields = [
            'queixa_principal', 'historia_doenca_atual', 'historia_patologica_pregressa',
            'historia_familiar', 'medicamentos_uso', 'alergias', 'inspecao', 'palpacao',
            'amplitude_movimento', 'forca_muscular', 'testes_especiais', 'escalas_funcionais',
            'objetivos_tratamento', 'diagnostico_fisioterapeutico', 'cid10', 
            'plano_tratamento', 'prognostico'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(medical_record, field, data[field])
        
        # Campo especial
        if 'data_avaliacao' in data and data['data_avaliacao']:
            medical_record.data_avaliacao = datetime.strptime(data['data_avaliacao'], '%Y-%m-%d').date()
        
        medical_record.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Prontuário atualizado com sucesso',
            'medical_record': medical_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar prontuário: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/patient/<patient_id>', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO, UserRole.PACIENTE)
def list_patient_medical_records(patient_id: str):
    """Listar prontuários de um paciente"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Verificar se paciente existe
        patient = Patient.query.get_or_404(patient_id)
        
        # Verificar se usuário pode acessar este paciente
        if current_user.role == UserRole.PACIENTE:
            if not patient.user_id or patient.user_id != current_user_id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar prontuários
        medical_records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
            MedicalRecord.data_avaliacao.desc()
        ).all()
        
        records_data = []
        for record in medical_records:
            record_data = record.to_dict()
            record_data['created_by_name'] = record.created_by_user.profile.nome_completo if record.created_by_user.profile else record.created_by_user.email
            records_data.append(record_data)
        
        return jsonify({
            'medical_records': records_data,
            'patient_name': patient.nome_completo
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao listar prontuários: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/<record_id>/evolutions', methods=['POST'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def create_evolution(record_id: str):
    """Criar nova evolução/acompanhamento"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verificar se prontuário existe
        medical_record = MedicalRecord.query.get_or_404(record_id)
        
        # Criar evolução
        evolution = Evolution(
            medical_record_id=record_id,
            created_by=current_user_id,
            subjetivo=data.get('subjetivo'),
            objetivo=data.get('objetivo'),
            avaliacao=data.get('avaliacao'),
            plano=data.get('plano'),
            data_atendimento=datetime.strptime(data['data_atendimento'], '%Y-%m-%d').date() if data.get('data_atendimento') else date.today(),
            duracao_minutos=data.get('duracao_minutos'),
            tecnicas_utilizadas=data.get('tecnicas_utilizadas'),
            exercicios_realizados=data.get('exercicios_realizados'),
            escala_dor=data.get('escala_dor'),
            observacoes_clinicas=data.get('observacoes_clinicas'),
        )
        
        # Validar escala de dor
        if evolution.escala_dor is not None:
            if not (0 <= evolution.escala_dor <= 10):
                return jsonify({'error': 'Escala de dor deve estar entre 0 e 10'}), 400
        
        db.session.add(evolution)
        db.session.commit()
        
        return jsonify({
            'message': 'Evolução criada com sucesso',
            'evolution': evolution.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar evolução: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/evolutions/<evolution_id>', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_evolution(evolution_id: str):
    """Atualizar evolução"""
    try:
        evolution = Evolution.query.get_or_404(evolution_id)
        data = request.get_json()
        
        # Campos atualizáveis
        updateable_fields = [
            'subjetivo', 'objetivo', 'avaliacao', 'plano', 'duracao_minutos',
            'tecnicas_utilizadas', 'exercicios_realizados', 'escala_dor', 'observacoes_clinicas'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(evolution, field, data[field])
        
        # Campo especial
        if 'data_atendimento' in data and data['data_atendimento']:
            evolution.data_atendimento = datetime.strptime(data['data_atendimento'], '%Y-%m-%d').date()
        
        # Validar escala de dor
        if evolution.escala_dor is not None:
            if not (0 <= evolution.escala_dor <= 10):
                return jsonify({'error': 'Escala de dor deve estar entre 0 e 10'}), 400
        
        evolution.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Evolução atualizada com sucesso',
            'evolution': evolution.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar evolução: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/evolutions/<evolution_id>', methods=['DELETE'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA)
def delete_evolution(evolution_id: str):
    """Excluir evolução (apenas admin e fisioterapeuta)"""
    try:
        evolution = Evolution.query.get_or_404(evolution_id)
        
        db.session.delete(evolution)
        db.session.commit()
        
        return jsonify({'message': 'Evolução removida com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao remover evolução: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@medical_records_bp.route('/stats/<patient_id>', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def get_patient_stats(patient_id: str):
    """Obter estatísticas do paciente"""
    try:
        # Verificar se paciente existe
        patient = Patient.query.get_or_404(patient_id)
        
        # Buscar dados para estatísticas
        medical_records = MedicalRecord.query.filter_by(patient_id=patient_id).all()
        
        if not medical_records:
            return jsonify({
                'total_records': 0,
                'total_evolutions': 0,
                'latest_evaluation': None,
                'pain_evolution': [],
                'treatment_duration_days': 0
            }), 200
        
        # Estatísticas básicas
        total_records = len(medical_records)
        
        # Buscar todas as evoluções
        all_evolutions = []
        for record in medical_records:
            evolutions = Evolution.query.filter_by(medical_record_id=record.id).all()
            all_evolutions.extend(evolutions)
        
        total_evolutions = len(all_evolutions)
        
        # Última avaliação
        latest_record = max(medical_records, key=lambda x: x.data_avaliacao) if medical_records else None
        latest_evaluation = latest_record.data_avaliacao.isoformat() if latest_record else None
        
        # Evolução da dor
        pain_evolution = []
        for evolution in sorted(all_evolutions, key=lambda x: x.data_atendimento):
            if evolution.escala_dor is not None:
                pain_evolution.append({
                    'date': evolution.data_atendimento.isoformat(),
                    'pain_level': evolution.escala_dor
                })
        
        # Duração do tratamento
        treatment_duration_days = 0
        if all_evolutions:
            first_session = min(all_evolutions, key=lambda x: x.data_atendimento)
            last_session = max(all_evolutions, key=lambda x: x.data_atendimento)
            treatment_duration_days = (last_session.data_atendimento - first_session.data_atendimento).days
        
        return jsonify({
            'patient_name': patient.nome_completo,
            'total_records': total_records,
            'total_evolutions': total_evolutions,
            'latest_evaluation': latest_evaluation,
            'pain_evolution': pain_evolution,
            'treatment_duration_days': treatment_duration_days,
            'average_session_duration': sum(e.duracao_minutos for e in all_evolutions if e.duracao_minutos) / len([e for e in all_evolutions if e.duracao_minutos]) if any(e.duracao_minutos for e in all_evolutions) else 0
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter estatísticas: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500