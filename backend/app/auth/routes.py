"""
Rotas de autenticação
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import (
    create_access_token, create_refresh_token, 
    jwt_required, get_jwt_identity, get_jwt
)
from app import db, limiter
from app.models.user import User, UserProfile, UserRole, LoginHistory, PasswordResetToken
from app.auth.utils import (
    login_required, roles_required, log_login_attempt, 
    get_client_info, validate_password_strength, 
    validate_email_format, is_role_allowed_for_registration
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """Registra um novo usuário"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validação dos campos obrigatórios
        required_fields = ['email', 'password', 'nome_completo']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Field {field} is required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        nome_completo = data['nome_completo'].strip()
        role = data.get('role', 'PACIENTE')
        
        # Validações
        is_valid_email, email_msg = validate_email_format(email)
        if not is_valid_email:
            return jsonify({'error': email_msg}), 400
        
        is_valid_password, password_msg = validate_password_strength(password)
        if not is_valid_password:
            return jsonify({'error': password_msg}), 400
        
        # Converte role para enum
        try:
            user_role = UserRole(role)
        except ValueError:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Verifica se o role pode se registrar
        if not is_role_allowed_for_registration(user_role):
            return jsonify({'error': 'Registration not allowed for this role'}), 400
        
        # Verifica se o usuário já existe
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'User already exists'}), 409
        
        # Cria o usuário
        user = User(email=email, password=password, role=user_role)
        db.session.add(user)
        db.session.flush()  # Para obter o ID
        
        # Cria o perfil
        profile = UserProfile(
            user_id=user.id,
            nome_completo=nome_completo,
            consentimento_dados=data.get('consentimento_dados', False),
            consentimento_imagem=data.get('consentimento_imagem', False),
            data_consentimento=datetime.utcnow() if data.get('consentimento_dados') else None
        )
        
        # Dados adicionais do perfil
        if data.get('telefone'):
            profile.set_telefone(data['telefone'])
        
        if data.get('data_nascimento'):
            try:
                profile.data_nascimento = datetime.strptime(
                    data['data_nascimento'], '%Y-%m-%d'
                ).date()
            except ValueError:
                return jsonify({'error': 'Invalid birth date format (YYYY-MM-DD)'}), 400
        
        if data.get('endereco'):
            profile.endereco = data['endereco']
        
        db.session.add(profile)
        db.session.commit()
        
        # Log da criação
        ip_address, user_agent = get_client_info()
        log_login_attempt(user.id, ip_address, user_agent, True, "Registration")
        
        # Gera tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    """Autentica um usuário"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Busca o usuário
        user = User.query.filter_by(email=email).first()
        
        ip_address, user_agent = get_client_info()
        
        if not user or not user.check_password(password):
            # Log da tentativa falhada
            if user:
                log_login_attempt(user.id, ip_address, user_agent, False, "Invalid password")
            
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            log_login_attempt(user.id, ip_address, user_agent, False, "User inactive")
            return jsonify({'error': 'Account is inactive'}), 401
        
        # Atualiza último login
        user.last_login = datetime.utcnow()
        
        # Log do login bem-sucedido
        log_login_attempt(user.id, ip_address, user_agent, True)
        
        db.session.commit()
        
        # Gera tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Atualiza o access token usando refresh token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid or inactive user'}), 401
        
        # Gera novo access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Token refresh failed', 'details': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout do usuário (invalidar token no frontend)"""
    try:
        # Em uma implementação completa, você adicionaria o token a uma blacklist
        # Por simplicidade, retornamos sucesso e deixamos o frontend limpar
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Logout failed', 'details': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Retorna informações do usuário atual"""
    try:
        user = g.current_user
        user_data = user.to_dict()
        
        # Inclui informações do perfil se existir
        if user.profile:
            user_data['profile'] = user.profile.to_dict()
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get user info', 'details': str(e)}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    """Solicita reset de senha"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].lower().strip()
        user = User.query.filter_by(email=email).first()
        
        # Sempre retorna sucesso por segurança (não vaza se email existe)
        if user:
            # Remove tokens anteriores não utilizados
            PasswordResetToken.query.filter_by(
                user_id=user.id, 
                used=False
            ).delete()
            
            # Cria novo token
            reset_token = PasswordResetToken(user.id)
            db.session.add(reset_token)
            db.session.commit()
            
            # Em produção, enviar email aqui
            # send_password_reset_email(user.email, reset_token.token)
            
            print(f"Reset token for {email}: {reset_token.token}")  # Debug - remover em prod
        
        return jsonify({
            'message': 'If the email exists, a reset link has been sent'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password reset failed', 'details': str(e)}), 500


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    """Reset da senha com token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400
        
        # Valida senha
        is_valid_password, password_msg = validate_password_strength(new_password)
        if not is_valid_password:
            return jsonify({'error': password_msg}), 400
        
        # Busca o token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or not reset_token.is_valid():
            return jsonify({'error': 'Invalid or expired token'}), 400
        
        # Busca o usuário
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Atualiza a senha
        user.set_password(new_password)
        reset_token.use()
        
        db.session.commit()
        
        # Log da alteração
        ip_address, user_agent = get_client_info()
        log_login_attempt(user.id, ip_address, user_agent, True, "Password reset")
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password reset failed', 'details': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Altera senha do usuário logado"""
    try:
        data = request.get_json()
        user = g.current_user
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        # Verifica senha atual
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Valida nova senha
        is_valid_password, password_msg = validate_password_strength(new_password)
        if not is_valid_password:
            return jsonify({'error': password_msg}), 400
        
        # Atualiza senha
        user.set_password(new_password)
        db.session.commit()
        
        # Log da alteração
        ip_address, user_agent = get_client_info()
        log_login_attempt(user.id, ip_address, user_agent, True, "Password changed")
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password change failed', 'details': str(e)}), 500


@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Atualiza perfil do usuário"""
    try:
        data = request.get_json()
        user = g.current_user
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Busca ou cria perfil
        if not user.profile:
            if not data.get('nome_completo'):
                return jsonify({'error': 'Nome completo is required for new profile'}), 400
            
            profile = UserProfile(
                user_id=user.id,
                nome_completo=data['nome_completo']
            )
            db.session.add(profile)
        else:
            profile = user.profile
        
        # Atualiza campos permitidos
        allowed_fields = [
            'nome_completo', 'data_nascimento', 'endereco',
            'consentimento_dados', 'consentimento_imagem'
        ]
        
        for field in allowed_fields:
            if field in data:
                if field == 'data_nascimento' and data[field]:
                    try:
                        profile.data_nascimento = datetime.strptime(
                            data[field], '%Y-%m-%d'
                        ).date()
                    except ValueError:
                        return jsonify({'error': 'Invalid birth date format (YYYY-MM-DD)'}), 400
                else:
                    setattr(profile, field, data[field])
        
        # Campos criptografados
        if 'telefone' in data:
            profile.set_telefone(data['telefone'])
        
        if 'cpf' in data:
            try:
                profile.set_cpf(data['cpf'])
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        
        # Atualiza consentimento
        if data.get('consentimento_dados') and not profile.data_consentimento:
            profile.data_consentimento = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'profile': profile.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Profile update failed', 'details': str(e)}), 500