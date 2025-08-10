"""
Rotas da API principal
"""

from flask import Blueprint, jsonify
from app.auth.utils import login_required, roles_required
from app.models.user import UserRole

api_bp = Blueprint('api', __name__)


@api_bp.route('/')
def api_root():
    """Endpoint raiz da API"""
    return jsonify({
        'name': 'FisioFlow API',
        'version': '1.0.0',
        'description': 'Sistema de gestão para clínicas de fisioterapia',
        'status': 'active'
    })


@api_bp.route('/admin/users')
@roles_required(UserRole.ADMIN)
def admin_users():
    """Endpoint administrativo - listar usuários"""
    # TODO: Implementar listagem de usuários
    return jsonify({
        'message': 'Admin users endpoint',
        'status': 'coming soon'
    })


@api_bp.route('/dashboard')
@login_required
def dashboard():
    """Dashboard básico do usuário"""
    # TODO: Implementar dashboard personalizado por role
    return jsonify({
        'message': 'Dashboard data',
        'status': 'coming soon'
    })