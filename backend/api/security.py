"""
API endpoints para monitoramento de segurança e auditoria
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func, extract
from sqlalchemy.orm import joinedload

from ..models.audit import AuditLog, SecurityAlert, DataAccess, ComplianceLog, AuditSeverity
from ..models.user import User
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json
from ..utils.audit import AuditService

security_bp = Blueprint('security', __name__, url_prefix='/api/security')


# =============================================================================
# LOGS DE AUDITORIA
# =============================================================================

@security_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def list_audit_logs():
    """Lista logs de auditoria com filtros"""
    
    query = AuditLog.query.options(joinedload(AuditLog.user))
    
    # Filtros
    action = request.args.get('action')
    if action:
        query = query.filter(AuditLog.action == action)
    
    severity = request.args.get('severity')
    if severity:
        query = query.filter(AuditLog.severity == severity)
    
    resource_type = request.args.get('resource_type')
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    user_id = request.args.get('user_id')
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    # Filtro de data
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.timestamp >= start_dt)
        except ValueError:
            return jsonify({'error': 'Formato de data inválido para start_date'}), 400
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AuditLog.timestamp <= end_dt)
        except ValueError:
            return jsonify({'error': 'Formato de data inválido para end_date'}), 400
    
    # Filtro de risco
    min_risk_score = request.args.get('min_risk_score')
    if min_risk_score:
        query = query.filter(AuditLog.risk_score >= int(min_risk_score))
    
    # Apenas logs que requerem investigação
    investigation_required = request.args.get('investigation_required')
    if investigation_required == 'true':
        query = query.filter(AuditLog.requires_investigation == True)
    
    # Busca por texto
    search = request.args.get('search')
    if search:
        query = query.filter(or_(
            AuditLog.description.ilike(f'%{search}%'),
            AuditLog.user_email.ilike(f'%{search}%'),
            AuditLog.ip_address.ilike(f'%{search}%')
        ))
    
    # Ordenação
    query = query.order_by(desc(AuditLog.timestamp))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 50)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda log: log.to_dict()
    )


@security_bp.route('/audit-logs/<int:log_id>', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def get_audit_log(log_id):
    """Obtém detalhes de um log de auditoria"""
    
    audit_log = AuditLog.query.options(joinedload(AuditLog.user)).get_or_404(log_id)
    
    return jsonify({
        'audit_log': audit_log.to_dict()
    })


@security_bp.route('/audit-logs/<int:log_id>/investigate', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def update_investigation_notes(log_id):
    """Atualiza notas de investigação do log"""
    
    data = request.json or {}
    audit_log = AuditLog.query.get_or_404(log_id)
    
    audit_log.investigation_notes = data.get('investigation_notes', '')
    audit_log.requires_investigation = data.get('requires_investigation', audit_log.requires_investigation)
    
    db.session.commit()
    
    # Log da ação de investigação
    AuditService.log_action(
        action='UPDATE',
        description=f'Notas de investigação atualizadas para log {log_id}',
        resource_type='AuditLog',
        resource_id=log_id,
        severity='MEDIUM'
    )
    
    return jsonify({
        'message': 'Notas de investigação atualizadas',
        'audit_log': audit_log.to_dict()
    })


# =============================================================================
# ALERTAS DE SEGURANÇA
# =============================================================================

@security_bp.route('/security-alerts', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def list_security_alerts():
    """Lista alertas de segurança"""
    
    query = SecurityAlert.query.options(
        joinedload(SecurityAlert.user),
        joinedload(SecurityAlert.assigned_to)
    )
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(SecurityAlert.status == status)
    
    severity = request.args.get('severity')
    if severity:
        query = query.filter(SecurityAlert.severity == severity)
    
    alert_type = request.args.get('alert_type')
    if alert_type:
        query = query.filter(SecurityAlert.alert_type == alert_type)
    
    assigned_to = request.args.get('assigned_to')
    if assigned_to:
        query = query.filter(SecurityAlert.assigned_to_id == assigned_to)
    
    # Filtro de risco
    min_risk_score = request.args.get('min_risk_score')
    if min_risk_score:
        query = query.filter(SecurityAlert.risk_score >= int(min_risk_score))
    
    # Ordenação por risco e data
    query = query.order_by(desc(SecurityAlert.risk_score), desc(SecurityAlert.created_at))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda alert: alert.to_dict()
    )


@security_bp.route('/security-alerts/<int:alert_id>', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def update_security_alert(alert_id):
    """Atualiza status de alerta de segurança"""
    
    data = validate_json(request.json, required_fields=['status'])
    alert = SecurityAlert.query.get_or_404(alert_id)
    user_id = get_jwt_identity()
    
    old_status = alert.status
    alert.status = data['status']
    alert.updated_at = datetime.utcnow()
    
    if 'assigned_to_id' in data:
        alert.assigned_to_id = data['assigned_to_id']
    
    if 'resolution_notes' in data:
        alert.resolution_notes = data['resolution_notes']
    
    if data['status'] == 'RESOLVED':
        alert.resolved_at = datetime.utcnow()
    
    db.session.commit()
    
    # Log da ação
    AuditService.log_action(
        action='UPDATE',
        description=f'Alerta de segurança {alert_id} alterado de {old_status} para {data["status"]}',
        resource_type='SecurityAlert',
        resource_id=alert_id,
        severity='MEDIUM'
    )
    
    return jsonify({
        'message': 'Alerta de segurança atualizado',
        'alert': alert.to_dict()
    })


# =============================================================================
# ACESSO A DADOS SENSÍVEIS
# =============================================================================

@security_bp.route('/data-access-logs', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def list_data_access_logs():
    """Lista logs de acesso a dados sensíveis"""
    
    query = DataAccess.query.options(joinedload(DataAccess.user))
    
    # Filtros
    data_type = request.args.get('data_type')
    if data_type:
        query = query.filter(DataAccess.data_type == data_type)
    
    resource_type = request.args.get('resource_type')
    if resource_type:
        query = query.filter(DataAccess.resource_type == resource_type)
    
    user_id = request.args.get('user_id')
    if user_id:
        query = query.filter(DataAccess.user_id == user_id)
    
    authorized = request.args.get('authorized')
    if authorized:
        query = query.filter(DataAccess.authorized == (authorized.lower() == 'true'))
    
    # Filtro de data
    start_date = request.args.get('start_date')
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(DataAccess.timestamp >= start_dt)
        except ValueError:
            return jsonify({'error': 'Formato de data inválido'}), 400
    
    # Ordenação
    query = query.order_by(desc(DataAccess.timestamp))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 30)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda access: access.to_dict()
    )


# =============================================================================
# COMPLIANCE E LGPD
# =============================================================================

@security_bp.route('/compliance-logs', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def list_compliance_logs():
    """Lista logs de compliance"""
    
    query = ComplianceLog.query.options(
        joinedload(ComplianceLog.user),
        joinedload(ComplianceLog.patient)
    )
    
    # Filtros
    regulation_type = request.args.get('regulation_type')
    if regulation_type:
        query = query.filter(ComplianceLog.regulation_type == regulation_type)
    
    compliance_action = request.args.get('compliance_action')
    if compliance_action:
        query = query.filter(ComplianceLog.compliance_action == compliance_action)
    
    patient_id = request.args.get('patient_id')
    if patient_id:
        query = query.filter(ComplianceLog.patient_id == patient_id)
    
    # Ordenação
    query = query.order_by(desc(ComplianceLog.timestamp))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda log: log.to_dict()
    )


# =============================================================================
# RELATÓRIOS E ESTATÍSTICAS
# =============================================================================

@security_bp.route('/security-dashboard', methods=['GET'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def security_dashboard():
    """Dashboard de segurança com estatísticas"""
    
    # Período para análise (últimos 30 dias por padrão)
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Estatísticas de logs de auditoria
    total_audit_logs = AuditLog.query.filter(AuditLog.timestamp >= start_date).count()
    
    high_risk_logs = AuditLog.query.filter(
        AuditLog.timestamp >= start_date,
        AuditLog.risk_score >= 70
    ).count()
    
    investigation_required = AuditLog.query.filter(
        AuditLog.requires_investigation == True,
        AuditLog.investigation_notes.is_(None)
    ).count()
    
    # Alertas de segurança
    open_alerts = SecurityAlert.query.filter(
        SecurityAlert.status.in_(['OPEN', 'INVESTIGATING'])
    ).count()
    
    critical_alerts = SecurityAlert.query.filter(
        SecurityAlert.severity == 'CRITICAL',
        SecurityAlert.status != 'RESOLVED'
    ).count()
    
    # Acesso a dados sensíveis
    banking_data_access = DataAccess.query.filter(
        DataAccess.timestamp >= start_date,
        DataAccess.data_type == 'BANKING_INFO'
    ).count()
    
    unauthorized_access = DataAccess.query.filter(
        DataAccess.timestamp >= start_date,
        DataAccess.authorized == False
    ).count()
    
    # Top ações por frequência
    top_actions = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.action).order_by(desc('count')).limit(10).all()
    
    # Top usuários por atividade
    top_users = db.session.query(
        AuditLog.user_email,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date,
        AuditLog.user_email.isnot(None)
    ).group_by(AuditLog.user_email).order_by(desc('count')).limit(10).all()
    
    # Distribuição de severidade
    severity_distribution = db.session.query(
        AuditLog.severity,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.severity).all()
    
    # Atividade por hora do dia
    hourly_activity = db.session.query(
        extract('hour', AuditLog.timestamp).label('hour'),
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by('hour').order_by('hour').all()
    
    return jsonify({
        'period_days': days,
        'overview': {
            'total_audit_logs': total_audit_logs,
            'high_risk_logs': high_risk_logs,
            'investigation_required': investigation_required,
            'open_alerts': open_alerts,
            'critical_alerts': critical_alerts,
            'banking_data_access': banking_data_access,
            'unauthorized_access': unauthorized_access
        },
        'top_actions': [
            {'action': action, 'count': count} for action, count in top_actions
        ],
        'top_users': [
            {'user_email': email, 'count': count} for email, count in top_users
        ],
        'severity_distribution': [
            {'severity': severity, 'count': count} for severity, count in severity_distribution
        ],
        'hourly_activity': [
            {'hour': int(hour), 'count': count} for hour, count in hourly_activity
        ]
    })


@security_bp.route('/security-report', methods=['POST'])
@jwt_required()
@role_required(['ADMIN', 'SECURITY_ADMIN'])
def generate_security_report():
    """Gera relatório de segurança personalizado"""
    
    data = validate_json(request.json, required_fields=['start_date', 'end_date'])
    
    try:
        start_date = datetime.fromisoformat(data['start_date'])
        end_date = datetime.fromisoformat(data['end_date'])
    except ValueError:
        return jsonify({'error': 'Formato de data inválido'}), 400
    
    if end_date <= start_date:
        return jsonify({'error': 'Data final deve ser posterior à data inicial'}), 400
    
    # Incluir diferentes tipos de dados no relatório
    include_audit_logs = data.get('include_audit_logs', True)
    include_data_access = data.get('include_data_access', True)
    include_compliance = data.get('include_compliance', False)
    include_alerts = data.get('include_alerts', True)
    
    report_data = {
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'generated_at': datetime.utcnow().isoformat(),
        'generated_by': get_jwt_identity()
    }
    
    if include_audit_logs:
        audit_logs = AuditLog.query.filter(
            AuditLog.timestamp.between(start_date, end_date)
        ).order_by(desc(AuditLog.timestamp)).all()
        
        report_data['audit_logs'] = {
            'total_count': len(audit_logs),
            'logs': [log.to_dict() for log in audit_logs]
        }
    
    if include_data_access:
        data_access_logs = DataAccess.query.filter(
            DataAccess.timestamp.between(start_date, end_date)
        ).order_by(desc(DataAccess.timestamp)).all()
        
        report_data['data_access'] = {
            'total_count': len(data_access_logs),
            'logs': [access.to_dict() for access in data_access_logs]
        }
    
    if include_compliance:
        compliance_logs = ComplianceLog.query.filter(
            ComplianceLog.timestamp.between(start_date, end_date)
        ).order_by(desc(ComplianceLog.timestamp)).all()
        
        report_data['compliance'] = {
            'total_count': len(compliance_logs),
            'logs': [log.to_dict() for log in compliance_logs]
        }
    
    if include_alerts:
        security_alerts = SecurityAlert.query.filter(
            SecurityAlert.created_at.between(start_date, end_date)
        ).order_by(desc(SecurityAlert.created_at)).all()
        
        report_data['security_alerts'] = {
            'total_count': len(security_alerts),
            'alerts': [alert.to_dict() for alert in security_alerts]
        }
    
    # Log da geração do relatório
    AuditService.log_action(
        action='DATA_EXPORT',
        description=f'Relatório de segurança gerado para período {start_date} a {end_date}',
        severity='HIGH',
        details={
            'report_type': 'security_report',
            'period_days': (end_date - start_date).days,
            'include_audit_logs': include_audit_logs,
            'include_data_access': include_data_access,
            'include_compliance': include_compliance,
            'include_alerts': include_alerts
        },
        risk_score=60
    )
    
    return jsonify(report_data)


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(security_bp)