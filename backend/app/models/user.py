"""
Modelos relacionados a usuários e autenticação
"""

from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import generate_password_hash, check_password_hash
from sqlalchemy.orm import validates
from cryptography.fernet import Fernet
import secrets
import os
import enum

from app import db


class UserRole(enum.Enum):
    """Enum para roles de usuário"""
    ADMIN = 'ADMIN'
    FISIOTERAPEUTA = 'FISIOTERAPEUTA'
    ESTAGIARIO = 'ESTAGIARIO'
    PACIENTE = 'PACIENTE'
    PARCEIRO = 'PARCEIRO'


class User(db.Model):
    """Modelo base para usuários do sistema"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.PACIENTE)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    profile = db.relationship('UserProfile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    login_history = db.relationship('LoginHistory', back_populates='user', cascade='all, delete-orphan')
    password_resets = db.relationship('PasswordResetToken', back_populates='user', cascade='all, delete-orphan')
    
    def __init__(self, email, password, role=UserRole.PACIENTE, **kwargs):
        self.email = email.lower().strip()
        self.set_password(password)
        self.role = role
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def set_password(self, password):
        """Define a senha do usuário com hash bcrypt"""
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        self.password_hash = generate_password_hash(password, 12).decode('utf-8')
    
    def check_password(self, password):
        """Verifica se a senha está correta"""
        return check_password_hash(self.password_hash, password)
    
    def has_role(self, role):
        """Verifica se o usuário tem um role específico"""
        if isinstance(role, str):
            role = UserRole(role)
        return self.role == role
    
    def has_permission(self, permission):
        """Verifica se o usuário tem uma permissão específica baseada no role"""
        permissions = {
            UserRole.ADMIN: ['all'],
            UserRole.FISIOTERAPEUTA: ['patients', 'appointments', 'exercises', 'protocols', 'mentoria'],
            UserRole.ESTAGIARIO: ['patients_read', 'appointments_read', 'exercises_read'],
            UserRole.PACIENTE: ['self_appointments', 'self_exercises', 'self_profile'],
            UserRole.PARCEIRO: ['vouchers', 'services']
        }
        
        user_permissions = permissions.get(self.role, [])
        return 'all' in user_permissions or permission in user_permissions
    
    @validates('email')
    def validate_email(self, key, email):
        """Valida formato do email"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        return email.lower().strip()
    
    def to_dict(self, include_sensitive=False):
        """Converte o modelo para dicionário"""
        data = {
            'id': self.id,
            'email': self.email,
            'role': self.role.value,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None
        
        return data
    
    def __repr__(self):
        return f'<User {self.email} ({self.role.value})>'


class UserProfile(db.Model):
    """Perfil detalhado do usuário com informações pessoais"""
    
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    
    # Informações pessoais
    nome_completo = db.Column(db.String(255), nullable=False)
    telefone_encrypted = db.Column(db.Text)  # Criptografado
    data_nascimento = db.Column(db.Date)
    cpf_encrypted = db.Column(db.Text)  # Criptografado
    
    # Endereço
    endereco = db.Column(db.JSON)  # {"logradouro", "numero", "bairro", "cidade", "estado", "cep"}
    
    # Informações profissionais (para fisioterapeutas)
    crefito = db.Column(db.String(20))
    especialidades = db.Column(db.JSON)  # Lista de especialidades
    
    # Consentimentos LGPD
    consentimento_dados = db.Column(db.Boolean, default=False, nullable=False)
    consentimento_imagem = db.Column(db.Boolean, default=False, nullable=False)
    data_consentimento = db.Column(db.DateTime)
    
    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='profile')
    
    def __init__(self, user_id, nome_completo, **kwargs):
        self.user_id = user_id
        self.nome_completo = nome_completo
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def _get_encryption_key(self):
        """Obtém a chave de criptografia do ambiente"""
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            # Em produção, isso deve vir do ambiente
            key = Fernet.generate_key()
        return key
    
    def set_telefone(self, telefone):
        """Define o telefone de forma criptografada"""
        if telefone:
            f = Fernet(self._get_encryption_key())
            self.telefone_encrypted = f.encrypt(telefone.encode()).decode()
    
    def get_telefone(self):
        """Recupera o telefone descriptografado"""
        if self.telefone_encrypted:
            f = Fernet(self._get_encryption_key())
            return f.decrypt(self.telefone_encrypted.encode()).decode()
        return None
    
    def set_cpf(self, cpf):
        """Define o CPF de forma criptografada"""
        if cpf:
            # Remove formatação
            cpf_digits = ''.join(filter(str.isdigit, cpf))
            if len(cpf_digits) != 11:
                raise ValueError("CPF deve ter 11 dígitos")
            
            f = Fernet(self._get_encryption_key())
            self.cpf_encrypted = f.encrypt(cpf_digits.encode()).decode()
    
    def get_cpf(self):
        """Recupera o CPF descriptografado"""
        if self.cpf_encrypted:
            f = Fernet(self._get_encryption_key())
            return f.decrypt(self.cpf_encrypted.encode()).decode()
        return None
    
    def get_cpf_masked(self):
        """Retorna CPF mascarado para exibição"""
        cpf = self.get_cpf()
        if cpf and len(cpf) == 11:
            return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        return None
    
    def to_dict(self, include_sensitive=False):
        """Converte o modelo para dicionário"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'nome_completo': self.nome_completo,
            'data_nascimento': self.data_nascimento.isoformat() if self.data_nascimento else None,
            'endereco': self.endereco,
            'crefito': self.crefito,
            'especialidades': self.especialidades,
            'consentimento_dados': self.consentimento_dados,
            'consentimento_imagem': self.consentimento_imagem,
            'data_consentimento': self.data_consentimento.isoformat() if self.data_consentimento else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_sensitive:
            data['telefone'] = self.get_telefone()
            data['cpf'] = self.get_cpf()
        else:
            data['cpf_masked'] = self.get_cpf_masked()
            # Telefone parcialmente mascarado
            telefone = self.get_telefone()
            if telefone and len(telefone) >= 8:
                data['telefone_masked'] = f"({telefone[:2]}) {'*' * (len(telefone) - 6)}{telefone[-4:]}"
        
        return data
    
    def __repr__(self):
        return f'<UserProfile {self.nome_completo}>'


class LoginHistory(db.Model):
    """Histórico de logins para auditoria"""
    
    __tablename__ = 'login_history'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    ip_address = db.Column(db.String(45))  # IPv6 support
    user_agent = db.Column(db.Text)
    success = db.Column(db.Boolean, default=True, nullable=False)
    failure_reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', back_populates='login_history')
    
    def __init__(self, user_id, ip_address=None, user_agent=None, success=True, failure_reason=None):
        self.user_id = user_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.success = success
        self.failure_reason = failure_reason
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'success': self.success,
            'failure_reason': self.failure_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        status = "SUCCESS" if self.success else "FAILED"
        return f'<LoginHistory {self.user_id} {status} {self.created_at}>'


class PasswordResetToken(db.Model):
    """Tokens para reset de senha"""
    
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(secrets.token_urlsafe(27)))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', back_populates='password_resets')
    
    def __init__(self, user_id, expires_in_hours=1):
        self.user_id = user_id
        self.token = secrets.token_urlsafe(32)
        self.expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    def is_expired(self):
        """Verifica se o token está expirado"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Verifica se o token é válido (não usado e não expirado)"""
        return not self.used and not self.is_expired()
    
    def use(self):
        """Marca o token como usado"""
        self.used = True
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used': self.used,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<PasswordResetToken {self.user_id} {"USED" if self.used else "VALID"}>'