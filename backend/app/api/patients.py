"""
API routes para gestão de pacientes
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload
from datetime import datetime, date
from typing import Dict, Any, List, Optional

from app import db
from app.models.user import User, UserRole
from app.models.patient import Patient, MedicalRecord, Evolution, EmergencyContact
from app.auth.utils import roles_required
from app.utils.validation import validate_cpf, validate_phone, validate_email

patients_bp = Blueprint('patients', __name__)


@patients_bp.route('/', methods=['POST'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def create_patient():
    """Criar novo paciente"""
    try:
        data = request.get_json()
        
        # Validações básicas
        if not data.get('nome_completo'):
            return jsonify({'error': 'Nome completo é obrigatório'}), 400
        
        # Validar CPF se fornecido
        if data.get('cpf') and not validate_cpf(data['cpf']):
            return jsonify({'error': 'CPF inválido'}), 400
        
        # Validar telefone se fornecido
        if data.get('telefone') and not validate_phone(data['telefone']):
            return jsonify({'error': 'Telefone inválido'}), 400
        
        # Validar email se fornecido
        if data.get('email') and not validate_email(data['email']):
            return jsonify({'error': 'Email inválido'}), 400
        
        # Verificar se CPF já existe (se fornecido)
        if data.get('cpf'):
            existing_patient = Patient.query.filter(
                Patient.cpf_encrypted.isnot(None)
            ).all()
            
            for patient in existing_patient:
                if patient.cpf == data['cpf']:
                    return jsonify({'error': 'Paciente com este CPF já existe'}), 409
        
        # Criar paciente
        patient = Patient(
            nome_completo=data['nome_completo'],
            nome_social=data.get('nome_social'),
            data_nascimento=datetime.strptime(data['data_nascimento'], '%Y-%m-%d').date() if data.get('data_nascimento') else None,
            genero=data.get('genero'),
            tipo_sanguineo=data.get('tipo_sanguineo'),
            estado_civil=data.get('estado_civil'),
            escolaridade=data.get('escolaridade'),
            profissao=data.get('profissao'),
            email=data.get('email'),
            endereco=data.get('endereco'),
            observacoes=data.get('observacoes'),
            consentimento_dados=data.get('consentimento_dados', False),
            consentimento_imagem=data.get('consentimento_imagem', False),
            data_consentimento=datetime.utcnow() if data.get('consentimento_dados') else None,
        )
        
        # Dados criptografados
        if data.get('cpf'):
            patient.cpf = data['cpf']
        if data.get('rg'):
            patient.rg = data['rg']
        if data.get('telefone'):
            patient.telefone = data['telefone']
        if data.get('telefone_alternativo'):
            patient.telefone_alternativo = data['telefone_alternativo']
        
        db.session.add(patient)
        db.session.commit()
        
        # Adicionar contatos de emergência se fornecidos
        if data.get('emergency_contacts'):
            for contact_data in data['emergency_contacts']:
                contact = EmergencyContact(
                    patient_id=patient.id,
                    nome=contact_data['nome'],
                    tipo_contato=contact_data['tipo_contato'],
                    parentesco=contact_data.get('parentesco'),
                    email=contact_data.get('email'),
                    endereco=contact_data.get('endereco'),
                    observacoes=contact_data.get('observacoes'),
                )
                
                if contact_data.get('telefone'):
                    contact.telefone = contact_data['telefone']
                
                db.session.add(contact)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Paciente criado com sucesso',
            'patient': patient.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar paciente: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def list_patients():
    """Listar pacientes com paginação e filtros"""
    try:
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Filtros
        search = request.args.get('search', '').strip()
        is_active = request.args.get('is_active', type=bool)
        
        # Query base
        query = Patient.query
        
        # Aplicar filtros
        if search:
            query = query.filter(
                or_(
                    Patient.nome_completo.ilike(f'%{search}%'),
                    Patient.nome_social.ilike(f'%{search}%'),
                    Patient.email.ilike(f'%{search}%'),
                )
            )
        
        if is_active is not None:
            query = query.filter(Patient.is_active == is_active)
        
        # Ordenação
        query = query.order_by(Patient.nome_completo.asc())
        
        # Paginação
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        patients = [patient.to_dict() for patient in pagination.items]
        
        return jsonify({
            'patients': patients,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next,
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao listar pacientes: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/<patient_id>', methods=['GET'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO, UserRole.PACIENTE)
def get_patient(patient_id: str):
    """Obter detalhes de um paciente"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Verificar se usuário pode acessar este paciente
        patient = Patient.query.get_or_404(patient_id)
        
        # Pacientes só podem ver seus próprios dados
        if current_user.role == UserRole.PACIENTE:
            if not patient.user_id or patient.user_id != current_user_id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        # Incluir dados sensíveis apenas para profissionais
        include_sensitive = current_user.role in [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO]
        
        # Carregar relacionamentos
        patient_data = patient.to_dict(include_sensitive=include_sensitive)
        
        # Adicionar contatos de emergência
        emergency_contacts = EmergencyContact.query.filter_by(patient_id=patient_id).all()
        patient_data['emergency_contacts'] = [
            contact.to_dict(include_sensitive=include_sensitive) 
            for contact in emergency_contacts
        ]
        
        # Adicionar histórico médico (apenas para profissionais)
        if include_sensitive:
            medical_records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
                MedicalRecord.data_avaliacao.desc()
            ).all()
            patient_data['medical_records'] = [record.to_dict() for record in medical_records]
        
        return jsonify(patient_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Erro ao obter paciente: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/<patient_id>', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_patient(patient_id: str):
    """Atualizar dados do paciente"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        # Validações
        if data.get('cpf') and not validate_cpf(data['cpf']):
            return jsonify({'error': 'CPF inválido'}), 400
        
        if data.get('telefone') and not validate_phone(data['telefone']):
            return jsonify({'error': 'Telefone inválido'}), 400
        
        if data.get('email') and not validate_email(data['email']):
            return jsonify({'error': 'Email inválido'}), 400
        
        # Verificar CPF duplicado se mudou
        if data.get('cpf') and data['cpf'] != patient.cpf:
            existing_patient = Patient.query.filter(
                and_(
                    Patient.id != patient_id,
                    Patient.cpf_encrypted.isnot(None)
                )
            ).all()
            
            for existing in existing_patient:
                if existing.cpf == data['cpf']:
                    return jsonify({'error': 'Paciente com este CPF já existe'}), 409
        
        # Atualizar campos
        updateable_fields = [
            'nome_completo', 'nome_social', 'genero', 'tipo_sanguineo',
            'estado_civil', 'escolaridade', 'profissao', 'email',
            'endereco', 'observacoes', 'is_active'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(patient, field, data[field])
        
        # Campos com tratamento especial
        if 'data_nascimento' in data and data['data_nascimento']:
            patient.data_nascimento = datetime.strptime(data['data_nascimento'], '%Y-%m-%d').date()
        
        # Campos criptografados
        if 'cpf' in data:
            patient.cpf = data['cpf']
        if 'rg' in data:
            patient.rg = data['rg']
        if 'telefone' in data:
            patient.telefone = data['telefone']
        if 'telefone_alternativo' in data:
            patient.telefone_alternativo = data['telefone_alternativo']
        
        # Atualizar consentimentos
        if 'consentimento_dados' in data:
            patient.consentimento_dados = data['consentimento_dados']
            if data['consentimento_dados'] and not patient.data_consentimento:
                patient.data_consentimento = datetime.utcnow()
        
        if 'consentimento_imagem' in data:
            patient.consentimento_imagem = data['consentimento_imagem']
        
        patient.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Paciente atualizado com sucesso',
            'patient': patient.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar paciente: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/<patient_id>', methods=['DELETE'])
@roles_required(UserRole.ADMIN)
def delete_patient(patient_id: str):
    """Excluir paciente (soft delete)"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Soft delete - apenas desativa o paciente
        patient.is_active = False
        patient.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Paciente desativado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir paciente: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/<patient_id>/emergency-contacts', methods=['POST'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def add_emergency_contact(patient_id: str):
    """Adicionar contato de emergência"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        if not data.get('nome'):
            return jsonify({'error': 'Nome é obrigatório'}), 400
        
        if not data.get('tipo_contato'):
            return jsonify({'error': 'Tipo de contato é obrigatório'}), 400
        
        contact = EmergencyContact(
            patient_id=patient_id,
            nome=data['nome'],
            tipo_contato=data['tipo_contato'],
            parentesco=data.get('parentesco'),
            email=data.get('email'),
            endereco=data.get('endereco'),
            observacoes=data.get('observacoes'),
        )
        
        if data.get('telefone'):
            contact.telefone = data['telefone']
        
        db.session.add(contact)
        db.session.commit()
        
        return jsonify({
            'message': 'Contato de emergência adicionado com sucesso',
            'contact': contact.to_dict(include_sensitive=True)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao adicionar contato: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/emergency-contacts/<contact_id>', methods=['PUT'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def update_emergency_contact(contact_id: str):
    """Atualizar contato de emergência"""
    try:
        contact = EmergencyContact.query.get_or_404(contact_id)
        data = request.get_json()
        
        # Atualizar campos
        updateable_fields = [
            'nome', 'tipo_contato', 'parentesco', 'email', 
            'endereco', 'observacoes'
        ]
        
        for field in updateable_fields:
            if field in data:
                setattr(contact, field, data[field])
        
        if 'telefone' in data:
            contact.telefone = data['telefone']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Contato atualizado com sucesso',
            'contact': contact.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar contato: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@patients_bp.route('/emergency-contacts/<contact_id>', methods=['DELETE'])
@roles_required(UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO)
def delete_emergency_contact(contact_id: str):
    """Excluir contato de emergência"""
    try:
        contact = EmergencyContact.query.get_or_404(contact_id)
        
        db.session.delete(contact)
        db.session.commit()
        
        return jsonify({'message': 'Contato removido com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao remover contato: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500