"""
Utilitários para auditoria e logs de segurança
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from flask import request, g, current_app
from flask_jwt_extended import get_jwt_identity, get_current_user
from sqlalchemy.exc import SQLAlchemyError

from ..models.audit import AuditLog, SecurityAlert, DataAccess, ComplianceLog, AuditAction, AuditSeverity
from ..models.user import User
from .. import db

logger = logging.getLogger(__name__)


class AuditService:
    """Serviço de auditoria e logs de segurança"""
    
    @staticmethod
    def log_action(
        action: str,
        description: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        severity: str = 'MEDIUM',
        details: Optional[Dict] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        risk_score: int = 0,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> Optional[AuditLog]:
        """
        Registra uma ação no log de auditoria
        
        Args:
            action: Ação realizada (enum AuditAction)
            description: Descrição da ação
            resource_type: Tipo do recurso afetado
            resource_id: ID do recurso afetado
            severity: Severidade do evento
            details: Detalhes adicionais
            old_values: Valores anteriores (para updates)
            new_values: Valores novos (para updates)
            risk_score: Score de risco 0-100
            user_id: ID do usuário (obtido automaticamente se None)
            ip_address: IP do cliente (obtido automaticamente se None)
            
        Returns:
            AuditLog criado ou None se houve erro
        """
        try:
            # Obter informações do contexto atual
            current_user_id = user_id or AuditService._get_current_user_id()
            current_ip = ip_address or AuditService._get_client_ip()
            user_agent = AuditService._get_user_agent()
            session_id = AuditService._get_session_id()
            
            # Obter email do usuário
            user_email = None
            if current_user_id:
                user = User.query.get(current_user_id)
                if user:
                    user_email = user.email
            
            # Calcular score de risco baseado na ação
            if risk_score == 0:
                risk_score = AuditService._calculate_risk_score(action, severity, details)
            
            # Criar log de auditoria
            audit_log = AuditLog(
                action=action,
                severity=severity,
                resource_type=resource_type,
                resource_id=resource_id,
                user_id=current_user_id,
                user_email=user_email,
                description=description,
                details=details,
                ip_address=current_ip,
                user_agent=user_agent,
                session_id=session_id,
                old_values=old_values,
                new_values=new_values,
                risk_score=risk_score,
                requires_investigation=risk_score >= 80,
                server_name=os.environ.get('SERVER_NAME', 'unknown'),
                application_version=os.environ.get('APP_VERSION', '1.0.0')
            )
            
            db.session.add(audit_log)
            db.session.commit()
            
            # Verificar se deve gerar alerta de segurança
            if risk_score >= 70 or severity in ['HIGH', 'CRITICAL']:
                AuditService._create_security_alert(audit_log)
            
            return audit_log
            
        except SQLAlchemyError as e:
            logger.error(f"Erro ao salvar log de auditoria: {e}")
            db.session.rollback()
            return None
        except Exception as e:
            logger.error(f"Erro inesperado no log de auditoria: {e}")
            return None
    
    @staticmethod
    def log_data_access(
        resource_type: str,
        resource_id: int,
        data_type: str,
        field_names: Optional[List[str]] = None,
        access_reason: Optional[str] = None,
        access_method: str = 'WEB',
        authorized: bool = True,
        authorization_method: Optional[str] = None,
        duration_seconds: Optional[int] = None
    ) -> Optional[DataAccess]:
        """
        Registra acesso a dados sensíveis
        
        Args:
            resource_type: Tipo do recurso (Partner, Patient, etc.)
            resource_id: ID do recurso
            data_type: Tipo de dados (BANKING_INFO, MEDICAL_RECORD, etc.)
            field_names: Campos específicos acessados
            access_reason: Motivo do acesso
            access_method: Método de acesso (WEB, API, MOBILE)
            authorized: Se o acesso foi autorizado
            authorization_method: Como foi autorizado
            duration_seconds: Duração do acesso
            
        Returns:
            DataAccess criado ou None se houve erro
        """
        try:
            current_user_id = AuditService._get_current_user_id()
            if not current_user_id:
                return None
            
            data_access = DataAccess(
                user_id=current_user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                data_type=data_type,
                field_names=field_names,
                access_reason=access_reason,
                access_method=access_method,
                ip_address=AuditService._get_client_ip(),
                user_agent=AuditService._get_user_agent(),
                session_id=AuditService._get_session_id(),
                authorized=authorized,
                authorization_method=authorization_method,
                duration_seconds=duration_seconds
            )
            
            db.session.add(data_access)
            db.session.commit()
            
            # Log adicional de auditoria para dados sensíveis
            if data_type in ['BANKING_INFO', 'MEDICAL_RECORD', 'PII']:
                AuditService.log_action(
                    action='BANKING_DATA_ACCESSED' if data_type == 'BANKING_INFO' else 'READ',
                    description=f"Acesso a {data_type} do {resource_type} ID {resource_id}",
                    resource_type=resource_type,
                    resource_id=resource_id,
                    severity='HIGH' if data_type == 'BANKING_INFO' else 'MEDIUM',
                    details={
                        'data_type': data_type,
                        'field_names': field_names,
                        'access_reason': access_reason,
                        'authorized': authorized
                    },
                    risk_score=60 if data_type == 'BANKING_INFO' else 30
                )
            
            return data_access
            
        except SQLAlchemyError as e:
            logger.error(f"Erro ao salvar log de acesso a dados: {e}")
            db.session.rollback()
            return None
        except Exception as e:
            logger.error(f"Erro inesperado no log de acesso: {e}")
            return None
    
    @staticmethod
    def log_compliance_action(
        regulation_type: str,
        compliance_action: str,
        description: str,
        patient_id: Optional[int] = None,
        legal_basis: Optional[str] = None,
        data_categories: Optional[List[str]] = None,
        consent_given: Optional[bool] = None,
        consent_withdrawn: Optional[bool] = None,
        consent_details: Optional[Dict] = None,
        retention_period: Optional[int] = None,
        deletion_scheduled_at: Optional[datetime] = None
    ) -> Optional[ComplianceLog]:
        """
        Registra ação de compliance
        
        Args:
            regulation_type: Tipo de regulamentação (LGPD, HIPAA, etc.)
            compliance_action: Ação de compliance
            description: Descrição da ação
            patient_id: ID do paciente (se aplicável)
            legal_basis: Base legal para o tratamento
            data_categories: Categorias de dados envolvidas
            consent_given: Se o consentimento foi dado
            consent_withdrawn: Se o consentimento foi retirado
            consent_details: Detalhes do consentimento
            retention_period: Período de retenção em dias
            deletion_scheduled_at: Data agendada para exclusão
            
        Returns:
            ComplianceLog criado ou None se houve erro
        """
        try:
            compliance_log = ComplianceLog(
                regulation_type=regulation_type,
                compliance_action=compliance_action,
                user_id=AuditService._get_current_user_id(),
                patient_id=patient_id,
                description=description,
                legal_basis=legal_basis,
                data_categories=data_categories,
                consent_given=consent_given,
                consent_withdrawn=consent_withdrawn,
                consent_details=consent_details,
                retention_period=retention_period,
                deletion_scheduled_at=deletion_scheduled_at,
                ip_address=AuditService._get_client_ip()
            )
            
            db.session.add(compliance_log)
            db.session.commit()
            
            return compliance_log
            
        except SQLAlchemyError as e:
            logger.error(f"Erro ao salvar log de compliance: {e}")
            db.session.rollback()
            return None
        except Exception as e:
            logger.error(f"Erro inesperado no log de compliance: {e}")
            return None
    
    @staticmethod
    def _get_current_user_id() -> Optional[int]:
        """Obtém o ID do usuário atual"""
        try:
            return get_jwt_identity()
        except:
            return None
    
    @staticmethod
    def _get_client_ip() -> str:
        """Obtém o IP do cliente"""
        if request:
            # Verificar headers de proxy
            if request.headers.get('X-Forwarded-For'):
                return request.headers.get('X-Forwarded-For').split(',')[0].strip()
            elif request.headers.get('X-Real-IP'):
                return request.headers.get('X-Real-IP')
            else:
                return request.remote_addr or 'unknown'
        return 'unknown'
    
    @staticmethod
    def _get_user_agent() -> str:
        """Obtém o user agent do cliente"""
        if request:
            return request.headers.get('User-Agent', 'unknown')[:500]
        return 'unknown'
    
    @staticmethod
    def _get_session_id() -> Optional[str]:
        """Obtém o ID da sessão"""
        # Implementar lógica de sessão se necessário
        return None
    
    @staticmethod
    def _calculate_risk_score(action: str, severity: str, details: Optional[Dict] = None) -> int:
        """Calcula score de risco baseado na ação"""
        base_scores = {
            'LOGIN_FAILED': 40,
            'PERMISSION_DENIED': 60,
            'DATA_EXPORT': 50,
            'BANKING_DATA_ACCESSED': 70,
            'BANKING_DATA_MODIFIED': 80,
            'DELETE': 60,
            'PASSWORD_CHANGE': 30,
            'VOUCHER_CREATED': 20,
            'VOUCHER_USED': 10,
            'PARTNER_COMMISSION_CALCULATED': 40,
            'PARTNER_COMMISSION_PAID': 50,
        }
        
        severity_multipliers = {
            'LOW': 0.5,
            'MEDIUM': 1.0,
            'HIGH': 1.5,
            'CRITICAL': 2.0
        }
        
        base_score = base_scores.get(action, 20)
        multiplier = severity_multipliers.get(severity, 1.0)
        
        risk_score = int(base_score * multiplier)
        
        # Ajustes baseados em detalhes
        if details:
            # Múltiplas tentativas de login falharam
            if action == 'LOGIN_FAILED' and details.get('consecutive_failures', 0) > 3:
                risk_score += 20
            
            # Acesso fora do horário comercial
            current_hour = datetime.now().hour
            if current_hour < 7 or current_hour > 19:
                risk_score += 10
            
            # IP não reconhecido
            if details.get('unknown_ip', False):
                risk_score += 15
        
        return min(risk_score, 100)
    
    @staticmethod
    def _create_security_alert(audit_log: AuditLog) -> Optional[SecurityAlert]:
        """Cria alerta de segurança baseado no log de auditoria"""
        try:
            alert_types = {
                'LOGIN_FAILED': 'FAILED_LOGIN_ATTEMPT',
                'PERMISSION_DENIED': 'UNAUTHORIZED_ACCESS',
                'BANKING_DATA_ACCESSED': 'SENSITIVE_DATA_ACCESS',
                'BANKING_DATA_MODIFIED': 'SENSITIVE_DATA_MODIFICATION',
                'DATA_EXPORT': 'DATA_EXPORT_ALERT'
            }
            
            alert_type = alert_types.get(audit_log.action, 'GENERAL_SECURITY_ALERT')
            
            alert = SecurityAlert(
                alert_type=alert_type,
                severity=audit_log.severity,
                title=f"Alerta de Segurança: {audit_log.action}",
                description=audit_log.description,
                user_id=audit_log.user_id,
                ip_address=audit_log.ip_address,
                resource_type=audit_log.resource_type,
                resource_id=audit_log.resource_id,
                event_data={
                    'audit_log_id': audit_log.id,
                    'details': audit_log.details,
                    'timestamp': audit_log.timestamp.isoformat()
                },
                risk_score=audit_log.risk_score
            )
            
            db.session.add(alert)
            db.session.commit()
            
            return alert
            
        except SQLAlchemyError as e:
            logger.error(f"Erro ao criar alerta de segurança: {e}")
            db.session.rollback()
            return None


# Decoradores para auditoria automática

def audit_action(action: str, resource_type: Optional[str] = None, severity: str = 'MEDIUM'):
    """
    Decorator para auditoria automática de ações
    
    Args:
        action: Ação a ser auditada
        resource_type: Tipo do recurso
        severity: Severidade do evento
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                
                # Extrair informações do contexto
                description = f"Executou {func.__name__}"
                details = {
                    'function': func.__name__,
                    'module': func.__module__,
                    'args_count': len(args),
                    'kwargs_keys': list(kwargs.keys())
                }
                
                AuditService.log_action(
                    action=action,
                    description=description,
                    resource_type=resource_type,
                    severity=severity,
                    details=details
                )
                
                return result
                
            except Exception as e:
                # Log de erro também
                AuditService.log_action(
                    action=f"{action}_ERROR",
                    description=f"Erro ao executar {func.__name__}: {str(e)}",
                    resource_type=resource_type,
                    severity='HIGH',
                    details={
                        'function': func.__name__,
                        'error': str(e),
                        'error_type': type(e).__name__
                    },
                    risk_score=70
                )
                raise
        
        return wrapper
    return decorator


def audit_data_access(resource_type: str, data_type: str, access_method: str = 'WEB'):
    """
    Decorator para auditoria de acesso a dados
    
    Args:
        resource_type: Tipo do recurso
        data_type: Tipo de dados
        access_method: Método de acesso
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            
            try:
                result = func(*args, **kwargs)
                
                # Calcular duração
                duration = (datetime.now() - start_time).total_seconds()
                
                # Tentar extrair resource_id dos argumentos
                resource_id = None
                if args:
                    if isinstance(args[0], int):
                        resource_id = args[0]
                    elif hasattr(args[0], 'id'):
                        resource_id = args[0].id
                
                AuditService.log_data_access(
                    resource_type=resource_type,
                    resource_id=resource_id or 0,
                    data_type=data_type,
                    access_method=access_method,
                    access_reason=f"Function: {func.__name__}",
                    duration_seconds=int(duration)
                )
                
                return result
                
            except Exception as e:
                # Log acesso não autorizado em caso de erro
                duration = (datetime.now() - start_time).total_seconds()
                
                AuditService.log_data_access(
                    resource_type=resource_type,
                    resource_id=0,
                    data_type=data_type,
                    access_method=access_method,
                    access_reason=f"Failed function: {func.__name__}",
                    authorized=False,
                    duration_seconds=int(duration)
                )
                raise
        
        return wrapper
    return decorator