"""
Utilitários para autenticação
"""

from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User, UserRole, LoginHistory
from app import db


def login_required(f):
    """Decorator para rotas que requerem autenticação"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'Invalid or inactive user'}), 401
            
            g.current_user = user
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': 'Authentication required', 'details': str(e)}), 401
    
    return decorated_function


def roles_required(*roles):
    """Decorator para rotas que requerem roles específicos"""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user = g.current_user
            
            # Converte strings para enum se necessário
            required_roles = []
            for role in roles:
                if isinstance(role, str):
                    required_roles.append(UserRole(role))
                else:
                    required_roles.append(role)
            
            if user.role not in required_roles and UserRole.ADMIN not in required_roles:
                # Admin sempre tem acesso, exceto se explicitamente excluído
                if user.role != UserRole.ADMIN:
                    return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def log_login_attempt(user_id, ip_address, user_agent, success=True, failure_reason=None):
    """Registra tentativa de login para auditoria"""
    try:
        login_record = LoginHistory(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )
        db.session.add(login_record)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error logging login attempt: {e}")


def get_client_info():
    """Extrai informações do cliente (IP, User-Agent)"""
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip_address and ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()
    
    user_agent = request.headers.get('User-Agent', '')
    
    return ip_address, user_agent


def validate_password_strength(password):
    """Valida força da senha"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    if len(password) > 128:
        return False, "Password too long"
    
    # Pelo menos uma letra e um número
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    if not (has_letter and has_digit):
        return False, "Password must contain at least one letter and one number"
    
    return True, "Password is valid"


def validate_email_format(email):
    """Valida formato do email"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    return True, "Email format is valid"


def is_role_allowed_for_registration(role):
    """Verifica se o role pode ser usado no registro"""
    # Apenas pacientes e parceiros podem se registrar diretamente
    allowed_roles = [UserRole.PACIENTE, UserRole.PARCEIRO]
    return role in allowed_roles