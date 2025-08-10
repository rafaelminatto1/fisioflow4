"""
FisioFlow - Sistema de Gestão para Clínicas de Fisioterapia
Aplicação Flask principal - Factory Pattern
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Inicialização das extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

def create_app(config_name=None):
    """Factory pattern para criação da aplicação Flask"""
    
    app = Flask(__name__)
    
    # Configurações
    configure_app(app)
    
    # Inicialização das extensões
    initialize_extensions(app)
    
    # Registro de blueprints
    register_blueprints(app)
    
    # Error handlers
    register_error_handlers(app)
    
    # Rotas básicas
    register_basic_routes(app)
    
    return app

def configure_app(app):
    """Configura a aplicação Flask"""
    
    from app.config import get_config
    config = get_config()
    app.config.from_object(config)

def initialize_extensions(app):
    """Inicializa as extensões Flask"""
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    
    # CORS com configuração específica
    CORS(app, 
         origins=app.config.get('CORS_ORIGINS', ['*']), 
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'])

def register_blueprints(app):
    """Registra todos os blueprints da aplicação"""
    
    # Import aqui para evitar circular imports
    from app.auth.routes import auth_bp
    from app.api.routes import api_bp
    from app.api.patients import patients_bp
    from app.api.medical_records import medical_records_bp
    from app.api.appointments import appointments_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(patients_bp, url_prefix='/api/v1/patients')
    app.register_blueprint(medical_records_bp, url_prefix='/api/v1/medical-records')
    app.register_blueprint(appointments_bp, url_prefix='/api/v1/appointments')

def register_basic_routes(app):
    """Registra rotas básicas da aplicação"""
    
    @app.route('/health')
    def health_check():
        """Endpoint para verificação de saúde da aplicação"""
        return jsonify({
            'status': 'healthy',
            'message': 'FisioFlow API is running',
            'version': '1.0.0'
        })
    
    @app.route('/api/v1')
    def api_info():
        """Endpoint com informações da API"""
        return jsonify({
            'name': 'FisioFlow API',
            'version': '1.0.0',
            'description': 'Sistema de gestão para clínicas de fisioterapia',
            'endpoints': {
                'health': '/health',
                'auth': '/api/auth/*',
                'patients': '/api/v1/patients/*',
                'appointments': '/api/v1/appointments/*',
                'exercises': '/api/v1/exercises/*'
            }
        })

def register_error_handlers(app):
    """Registra handlers para erros HTTP comuns"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'Insufficient permissions'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Resource not found'}), 404
    
    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please try again later.'
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500