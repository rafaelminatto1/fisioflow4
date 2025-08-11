"""
Modelos para auditoria e logs de segurança
"""

from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from . import db


class AuditAction(Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    DATA_EXPORT = "DATA_EXPORT"
    DATA_IMPORT = "DATA_IMPORT"
    BACKUP_CREATED = "BACKUP_CREATED"
    BACKUP_RESTORED = "BACKUP_RESTORED"
    ENCRYPTION_KEY_ROTATION = "ENCRYPTION_KEY_ROTATION"
    PARTNER_COMMISSION_CALCULATED = "PARTNER_COMMISSION_CALCULATED"
    PARTNER_COMMISSION_PAID = "PARTNER_COMMISSION_PAID"
    VOUCHER_CREATED = "VOUCHER_CREATED"
    VOUCHER_USED = "VOUCHER_USED"
    VOUCHER_CANCELLED = "VOUCHER_CANCELLED"
    BANKING_DATA_ACCESSED = "BANKING_DATA_ACCESSED"
    BANKING_DATA_MODIFIED = "BANKING_DATA_MODIFIED"


class AuditSeverity(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditLog(db.Model):
    """Modelo para logs de auditoria"""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação da ação
    action = Column(String(50), nullable=False)  # AuditAction enum
    severity = Column(String(20), default='MEDIUM')  # AuditSeverity enum
    resource_type = Column(String(50))  # Tipo do recurso (Patient, User, Partner, etc.)
    resource_id = Column(Integer)  # ID do recurso
    
    # Usuário responsável
    user_id = Column(Integer, ForeignKey('users.id'))
    user_email = Column(String(255))  # Cache do email para auditoria
    
    # Contexto da ação
    description = Column(Text, nullable=False)
    details = Column(JSON)  # Detalhes adicionais em JSON
    
    # Informações da sessão
    ip_address = Column(String(45))  # IPv4 ou IPv6
    user_agent = Column(String(500))
    session_id = Column(String(255))
    
    # Dados antes/depois (para mudanças)
    old_values = Column(JSON)  # Valores anteriores
    new_values = Column(JSON)  # Valores novos
    
    # Contexto de segurança
    risk_score = Column(Integer, default=0)  # Score de risco 0-100
    requires_investigation = Column(Boolean, default=False)
    investigation_notes = Column(Text)
    
    # Metadados
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    server_name = Column(String(100))  # Nome do servidor
    application_version = Column(String(50))
    
    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f'<AuditLog {self.action} by {self.user_email} at {self.timestamp}>'

    def to_dict(self):
        """Converte o log de auditoria para dicionário"""
        return {
            'id': self.id,
            'action': self.action,
            'severity': self.severity,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'description': self.description,
            'details': self.details,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'session_id': self.session_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'risk_score': self.risk_score,
            'requires_investigation': self.requires_investigation,
            'investigation_notes': self.investigation_notes,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'server_name': self.server_name,
            'application_version': self.application_version,
        }


class SecurityAlert(db.Model):
    """Modelo para alertas de segurança"""
    __tablename__ = 'security_alerts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação do alerta
    alert_type = Column(String(50), nullable=False)  # Tipo do alerta
    severity = Column(String(20), nullable=False)  # AuditSeverity enum
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Contexto
    user_id = Column(Integer, ForeignKey('users.id'))
    ip_address = Column(String(45))
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    
    # Detalhes do evento
    event_data = Column(JSON)  # Dados do evento que gerou o alerta
    risk_score = Column(Integer, nullable=False)  # Score de risco 0-100
    
    # Status do alerta
    status = Column(String(20), default='OPEN')  # OPEN, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    assigned_to_id = Column(Integer, ForeignKey('users.id'))
    resolution_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    def __repr__(self):
        return f'<SecurityAlert {self.alert_type} - {self.severity}>'

    def to_dict(self):
        """Converte o alerta para dicionário"""
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'ip_address': self.ip_address,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'event_data': self.event_data,
            'risk_score': self.risk_score,
            'status': self.status,
            'assigned_to_id': self.assigned_to_id,
            'assigned_to_email': self.assigned_to.email if self.assigned_to else None,
            'resolution_notes': self.resolution_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }


class DataAccess(db.Model):
    """Modelo para rastreamento de acesso a dados sensíveis"""
    __tablename__ = 'data_access_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação do acesso
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    resource_type = Column(String(50), nullable=False)  # Partner, Patient, etc.
    resource_id = Column(Integer, nullable=False)
    
    # Tipo de dados acessados
    data_type = Column(String(50), nullable=False)  # BANKING_INFO, MEDICAL_RECORD, PII, etc.
    field_names = Column(JSON)  # Campos específicos acessados
    
    # Contexto do acesso
    access_reason = Column(String(200))  # Motivo do acesso
    access_method = Column(String(50))  # WEB, API, MOBILE, etc.
    
    # Informações da sessão
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    session_id = Column(String(255))
    
    # Autorização
    authorized = Column(Boolean, default=True)
    authorization_method = Column(String(100))  # Como foi autorizado
    
    # Metadados
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_seconds = Column(Integer)  # Duração do acesso
    
    # Relacionamentos
    user = relationship("User")

    def __repr__(self):
        return f'<DataAccess {self.data_type} by {self.user.email} at {self.timestamp}>'

    def to_dict(self):
        """Converte o log de acesso para dicionário"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'data_type': self.data_type,
            'field_names': self.field_names,
            'access_reason': self.access_reason,
            'access_method': self.access_method,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'session_id': self.session_id,
            'authorized': self.authorized,
            'authorization_method': self.authorization_method,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'duration_seconds': self.duration_seconds,
        }


class ComplianceLog(db.Model):
    """Modelo para logs de compliance e regulamentações"""
    __tablename__ = 'compliance_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação da ação de compliance
    regulation_type = Column(String(50), nullable=False)  # LGPD, HIPAA, etc.
    compliance_action = Column(String(100), nullable=False)  # CONSENT_GIVEN, DATA_DELETED, etc.
    
    # Contexto
    user_id = Column(Integer, ForeignKey('users.id'))
    patient_id = Column(Integer, ForeignKey('patients.id'))
    
    # Detalhes da ação
    description = Column(Text, nullable=False)
    legal_basis = Column(String(100))  # Base legal para o tratamento
    data_categories = Column(JSON)  # Categorias de dados envolvidas
    
    # Consentimento
    consent_given = Column(Boolean)
    consent_withdrawn = Column(Boolean)
    consent_details = Column(JSON)
    
    # Retenção de dados
    retention_period = Column(Integer)  # Período de retenção em dias
    deletion_scheduled_at = Column(DateTime)  # Quando deve ser deletado
    
    # Metadados
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45))
    
    # Relacionamentos
    user = relationship("User")
    patient = relationship("Patient")

    def __repr__(self):
        return f'<ComplianceLog {self.regulation_type} - {self.compliance_action}>'

    def to_dict(self):
        """Converte o log de compliance para dicionário"""
        return {
            'id': self.id,
            'regulation_type': self.regulation_type,
            'compliance_action': self.compliance_action,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'patient_id': self.patient_id,
            'description': self.description,
            'legal_basis': self.legal_basis,
            'data_categories': self.data_categories,
            'consent_given': self.consent_given,
            'consent_withdrawn': self.consent_withdrawn,
            'consent_details': self.consent_details,
            'retention_period': self.retention_period,
            'deletion_scheduled_at': self.deletion_scheduled_at.isoformat() if self.deletion_scheduled_at else None,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
        }