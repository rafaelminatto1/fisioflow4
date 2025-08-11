"""
Configuração de testes para o backend FisioFlow
"""

import pytest
import tempfile
import os
from datetime import datetime, date
from decimal import Decimal

from app import create_app
from models import db
from models.user import User
from models.patient import Patient
from models.appointment import Appointment
from models.partnership import Partner, Voucher, Commission
from models.audit import AuditLog
from utils.encryption import validate_encryption_key


@pytest.fixture(scope='session')
def app():
    """Cria aplicação Flask para testes"""
    
    # Configurar arquivo temporário para banco de testes
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'JWT_SECRET_KEY': 'test-secret-key-not-for-production',
        'ENCRYPTION_KEY': 'test-encryption-key-12345678',
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Cliente de teste"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Runner de comandos CLI"""
    return app.test_cli_runner()


@pytest.fixture
def db_session(app):
    """Sessão de banco de dados para testes"""
    with app.app_context():
        db.session.begin()
        yield db.session
        db.session.rollback()


@pytest.fixture
def admin_user(db_session):
    """Usuário administrador para testes"""
    user = User(
        email='admin@fisioflow.com',
        full_name='Admin Test',
        role='ADMIN',
        is_active=True,
        is_verified=True
    )
    user.set_password('admin123')
    
    db_session.add(user)
    db_session.commit()
    
    return user


@pytest.fixture
def professional_user(db_session):
    """Usuário profissional para testes"""
    user = User(
        email='prof@fisioflow.com',
        full_name='Professional Test',
        role='PROFESSIONAL',
        specialization='Fisioterapeuta',
        crefito='123456-F',
        is_active=True,
        is_verified=True
    )
    user.set_password('prof123')
    
    db_session.add(user)
    db_session.commit()
    
    return user


@pytest.fixture
def patient_user(db_session):
    """Usuário paciente para testes"""
    user = User(
        email='patient@test.com',
        full_name='Patient Test',
        role='PATIENT',
        is_active=True,
        is_verified=True
    )
    user.set_password('patient123')
    
    db_session.add(user)
    db_session.commit()
    
    return user


@pytest.fixture
def test_patient(db_session, professional_user):
    """Paciente para testes"""
    patient = Patient(
        full_name='João Silva',
        document_number='12345678901',
        phone='11999887766',
        email='joao@test.com',
        birth_date=date(1990, 5, 15),
        gender='M',
        address_street='Rua Teste, 123',
        address_city='São Paulo',
        address_state='SP',
        address_zipcode='01234567',
        created_by_id=professional_user.id
    )
    
    db_session.add(patient)
    db_session.commit()
    
    return patient


@pytest.fixture
def test_partner(db_session, admin_user):
    """Parceiro para testes"""
    partner = Partner(
        business_name='Clínica Teste LTDA',
        trade_name='Clínica Teste',
        partner_type='CLINIC',
        document_number='12345678000199',
        email='contato@clinicateste.com',
        phone='1133334444',
        commission_percentage=Decimal('15.00'),
        created_by_id=admin_user.id
    )
    
    db_session.add(partner)
    db_session.commit()
    
    return partner


@pytest.fixture
def test_voucher(db_session, test_partner, admin_user):
    """Voucher para testes"""
    voucher = Voucher(
        code='TESTE20',
        name='Desconto de Teste',
        description='Voucher para testes automatizados',
        partner_id=test_partner.id,
        discount_type='PERCENTAGE',
        discount_value=Decimal('20.00'),
        minimum_amount=Decimal('100.00'),
        valid_from=datetime(2024, 1, 1),
        valid_until=datetime(2024, 12, 31),
        usage_limit=100,
        created_by_id=admin_user.id
    )
    
    db_session.add(voucher)
    db_session.commit()
    
    return voucher


@pytest.fixture
def test_appointment(db_session, test_patient, professional_user, test_partner):
    """Appointment para testes"""
    appointment = Appointment(
        patient_id=test_patient.id,
        professional_id=professional_user.id,
        partner_id=test_partner.id,
        appointment_date=date(2024, 6, 15),
        appointment_time='14:00',
        service_type='Consulta',
        price=Decimal('150.00'),
        status='CONCLUIDO'
    )
    
    db_session.add(appointment)
    db_session.commit()
    
    return appointment


@pytest.fixture
def auth_headers_admin(client, admin_user):
    """Headers de autenticação para admin"""
    response = client.post('/api/auth/login', json={
        'email': admin_user.email,
        'password': 'admin123'
    })
    
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def auth_headers_professional(client, professional_user):
    """Headers de autenticação para profissional"""
    response = client.post('/api/auth/login', json={
        'email': professional_user.email,
        'password': 'prof123'
    })
    
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def auth_headers_patient(client, patient_user):
    """Headers de autenticação para paciente"""
    response = client.post('/api/auth/login', json={
        'email': patient_user.email,
        'password': 'patient123'
    })
    
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(autouse=True)
def setup_encryption():
    """Configura criptografia para testes"""
    assert validate_encryption_key(), "Falha na validação da chave de criptografia"


# Fixtures para dados de teste comuns

@pytest.fixture
def sample_user_data():
    """Dados de exemplo para criação de usuário"""
    return {
        'email': 'newuser@test.com',
        'password': 'testpass123',
        'full_name': 'New User',
        'role': 'PROFESSIONAL',
        'specialization': 'Fisioterapeuta',
        'crefito': '654321-F'
    }


@pytest.fixture
def sample_patient_data():
    """Dados de exemplo para criação de paciente"""
    return {
        'full_name': 'Maria Santos',
        'document_number': '98765432100',
        'phone': '11987654321',
        'email': 'maria@test.com',
        'birth_date': '1985-03-20',
        'gender': 'F',
        'address_street': 'Av. Paulista, 1000',
        'address_city': 'São Paulo',
        'address_state': 'SP',
        'address_zipcode': '01310100'
    }


@pytest.fixture
def sample_appointment_data():
    """Dados de exemplo para criação de appointment"""
    return {
        'appointment_date': '2024-07-15',
        'appointment_time': '10:30',
        'service_type': 'Fisioterapia',
        'price': 120.00,
        'notes': 'Primeira sessão de fisioterapia'
    }


@pytest.fixture
def sample_partner_data():
    """Dados de exemplo para criação de parceiro"""
    return {
        'business_name': 'Nova Clínica LTDA',
        'trade_name': 'Nova Clínica',
        'partner_type': 'CLINIC',
        'document_number': '98765432000188',
        'email': 'contato@novaclinica.com',
        'phone': '1144445555',
        'commission_percentage': 12.5,
        'address_street': 'Rua Nova, 456',
        'address_city': 'São Paulo',
        'address_state': 'SP'
    }


@pytest.fixture
def sample_voucher_data():
    """Dados de exemplo para criação de voucher"""
    return {
        'code': 'NOVO30',
        'name': 'Desconto Novo Cliente',
        'description': 'Desconto especial para novos clientes',
        'discount_type': 'PERCENTAGE',
        'discount_value': 30.0,
        'minimum_amount': 200.0,
        'valid_from': '2024-01-01 00:00:00',
        'valid_until': '2024-12-31 23:59:59',
        'usage_limit': 50
    }


# Utilitários de teste

def create_test_user(db_session, **kwargs):
    """Cria usuário de teste com dados customizados"""
    defaults = {
        'email': 'test@example.com',
        'full_name': 'Test User',
        'role': 'PATIENT',
        'is_active': True,
        'is_verified': True
    }
    defaults.update(kwargs)
    
    user = User(**defaults)
    if 'password' not in kwargs:
        user.set_password('testpass123')
    
    db_session.add(user)
    db_session.commit()
    
    return user


def create_test_patient(db_session, created_by_user, **kwargs):
    """Cria paciente de teste com dados customizados"""
    defaults = {
        'full_name': 'Test Patient',
        'document_number': '11111111111',
        'phone': '11999999999',
        'email': 'testpatient@example.com',
        'birth_date': date(1990, 1, 1),
        'gender': 'M',
        'created_by_id': created_by_user.id
    }
    defaults.update(kwargs)
    
    patient = Patient(**defaults)
    db_session.add(patient)
    db_session.commit()
    
    return patient


# Marcadores de teste

def pytest_configure(config):
    """Configuração de marcadores de teste"""
    config.addinivalue_line(
        "markers", "unit: marca testes unitários"
    )
    config.addinivalue_line(
        "markers", "integration: marca testes de integração"
    )
    config.addinivalue_line(
        "markers", "api: marca testes de API"
    )
    config.addinivalue_line(
        "markers", "auth: marca testes de autenticação"
    )
    config.addinivalue_line(
        "markers", "security: marca testes de segurança"
    )
    config.addinivalue_line(
        "markers", "slow: marca testes lentos"
    )


# Configuração de logging para testes

import logging

logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.getLogger('werkzeug').setLevel(logging.WARNING)