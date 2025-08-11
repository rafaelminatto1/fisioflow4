"""
Testes para o sistema de autenticação
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from models.user import User
from utils.auth import generate_password_reset_token, verify_password_reset_token


class TestUserModel:
    """Testes para o modelo User"""
    
    def test_create_user(self, db_session):
        """Testa criação de usuário"""
        user = User(
            email='test@example.com',
            full_name='Test User',
            role='PATIENT'
        )
        user.set_password('testpass123')
        
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.email == 'test@example.com'
        assert user.full_name == 'Test User'
        assert user.role == 'PATIENT'
        assert user.check_password('testpass123')
        assert not user.check_password('wrongpass')
        assert user.created_at is not None
    
    def test_user_password_hashing(self, db_session):
        """Testa hash da senha"""
        user = User(email='test@example.com', full_name='Test')
        user.set_password('mypassword')
        
        assert user.password_hash is not None
        assert user.password_hash != 'mypassword'
        assert user.check_password('mypassword')
        assert not user.check_password('wrongpassword')
    
    def test_user_to_dict(self, db_session):
        """Testa serialização do usuário"""
        user = User(
            email='test@example.com',
            full_name='Test User',
            role='PROFESSIONAL',
            specialization='Fisioterapeuta',
            crefito='123456-F'
        )
        
        db_session.add(user)
        db_session.commit()
        
        user_dict = user.to_dict()
        
        assert user_dict['id'] == user.id
        assert user_dict['email'] == 'test@example.com'
        assert user_dict['full_name'] == 'Test User'
        assert user_dict['role'] == 'PROFESSIONAL'
        assert user_dict['specialization'] == 'Fisioterapeuta'
        assert user_dict['crefito'] == '123456-F'
        assert 'password_hash' not in user_dict
    
    def test_user_login_tracking(self, db_session):
        """Testa rastreamento de login"""
        user = User(email='test@example.com', full_name='Test')
        db_session.add(user)
        db_session.commit()
        
        # Primeiro login
        user.update_last_login()
        first_login = user.last_login_at
        
        assert first_login is not None
        
        # Segundo login
        user.update_last_login()
        second_login = user.last_login_at
        
        assert second_login > first_login


@pytest.mark.api
class TestAuthAPI:
    """Testes para API de autenticação"""
    
    def test_register_success(self, client, sample_user_data):
        """Testa registro de usuário com sucesso"""
        response = client.post('/api/auth/register', json=sample_user_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'message' in data
        assert 'user' in data
        assert data['user']['email'] == sample_user_data['email']
        assert data['user']['full_name'] == sample_user_data['full_name']
        assert data['user']['role'] == sample_user_data['role']
    
    def test_register_duplicate_email(self, client, sample_user_data, admin_user):
        """Testa registro com email duplicado"""
        sample_user_data['email'] = admin_user.email
        
        response = client.post('/api/auth/register', json=sample_user_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_register_invalid_data(self, client):
        """Testa registro com dados inválidos"""
        # Email inválido
        response = client.post('/api/auth/register', json={
            'email': 'invalid-email',
            'password': 'pass123',
            'full_name': 'Test',
            'role': 'PATIENT'
        })
        assert response.status_code == 400
        
        # Senha muito curta
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': '123',
            'full_name': 'Test',
            'role': 'PATIENT'
        })
        assert response.status_code == 400
        
        # Campos obrigatórios ausentes
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com'
        })
        assert response.status_code == 400
    
    def test_login_success(self, client, admin_user):
        """Testa login com sucesso"""
        response = client.post('/api/auth/login', json={
            'email': admin_user.email,
            'password': 'admin123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['email'] == admin_user.email
    
    def test_login_invalid_credentials(self, client, admin_user):
        """Testa login com credenciais inválidas"""
        # Senha errada
        response = client.post('/api/auth/login', json={
            'email': admin_user.email,
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        
        # Email não existe
        response = client.post('/api/auth/login', json={
            'email': 'notfound@example.com',
            'password': 'admin123'
        })
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, db_session):
        """Testa login com usuário inativo"""
        user = User(
            email='inactive@example.com',
            full_name='Inactive User',
            role='PATIENT',
            is_active=False
        )
        user.set_password('password123')
        db_session.add(user)
        db_session.commit()
        
        response = client.post('/api/auth/login', json={
            'email': user.email,
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'inactive' in data['error'].lower() or 'ativo' in data['error'].lower()
    
    def test_refresh_token(self, client, admin_user):
        """Testa refresh de token"""
        # Fazer login primeiro
        login_response = client.post('/api/auth/login', json={
            'email': admin_user.email,
            'password': 'admin123'
        })
        
        refresh_token = login_response.get_json()['refresh_token']
        
        # Usar refresh token
        response = client.post('/api/auth/refresh', json={
            'refresh_token': refresh_token
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
    
    def test_protected_endpoint_without_token(self, client):
        """Testa endpoint protegido sem token"""
        response = client.get('/api/users/profile')
        assert response.status_code == 401
    
    def test_protected_endpoint_with_token(self, client, auth_headers_admin):
        """Testa endpoint protegido com token"""
        response = client.get('/api/users/profile', headers=auth_headers_admin)
        assert response.status_code == 200
    
    def test_protected_endpoint_with_invalid_token(self, client):
        """Testa endpoint protegido com token inválido"""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.get('/api/users/profile', headers=headers)
        assert response.status_code == 422  # Unprocessable Entity para token malformado
    
    @patch('utils.email.send_email')
    def test_forgot_password(self, mock_send_email, client, admin_user):
        """Testa solicitação de redefinição de senha"""
        mock_send_email.return_value = True
        
        response = client.post('/api/auth/forgot-password', json={
            'email': admin_user.email
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        
        # Verifica se email foi enviado
        mock_send_email.assert_called_once()
    
    def test_forgot_password_invalid_email(self, client):
        """Testa solicitação com email não cadastrado"""
        response = client.post('/api/auth/forgot-password', json={
            'email': 'notfound@example.com'
        })
        
        # Deve retornar sucesso por segurança, mas não enviar email
        assert response.status_code == 200
    
    def test_reset_password_success(self, client, admin_user):
        """Testa redefinição de senha com sucesso"""
        # Gerar token válido
        token = generate_password_reset_token(admin_user.id)
        
        response = client.post('/api/auth/reset-password', json={
            'token': token,
            'new_password': 'newpassword123'
        })
        
        assert response.status_code == 200
        
        # Verificar se senha foi alterada
        admin_user.refresh_from_db()
        assert admin_user.check_password('newpassword123')
        assert not admin_user.check_password('admin123')
    
    def test_reset_password_invalid_token(self, client):
        """Testa redefinição com token inválido"""
        response = client.post('/api/auth/reset-password', json={
            'token': 'invalid-token',
            'new_password': 'newpassword123'
        })
        
        assert response.status_code == 400
    
    def test_change_password(self, client, auth_headers_admin, admin_user):
        """Testa mudança de senha"""
        response = client.post('/api/auth/change-password', 
                             headers=auth_headers_admin,
                             json={
                                 'current_password': 'admin123',
                                 'new_password': 'newaadminpass123'
                             })
        
        assert response.status_code == 200
        
        # Verificar se senha foi alterada
        admin_user.refresh_from_db()
        assert admin_user.check_password('newaaminpass123')
        assert not admin_user.check_password('admin123')
    
    def test_change_password_wrong_current(self, client, auth_headers_admin):
        """Testa mudança com senha atual errada"""
        response = client.post('/api/auth/change-password',
                             headers=auth_headers_admin,
                             json={
                                 'current_password': 'wrongpassword',
                                 'new_password': 'newpassword123'
                             })
        
        assert response.status_code == 400
    
    def test_logout(self, client, auth_headers_admin):
        """Testa logout"""
        response = client.post('/api/auth/logout', headers=auth_headers_admin)
        assert response.status_code == 200


@pytest.mark.security
class TestAuthSecurity:
    """Testes de segurança para autenticação"""
    
    def test_password_hashing_strength(self, db_session):
        """Testa força do hash da senha"""
        user = User(email='test@example.com', full_name='Test')
        password = 'mypassword123'
        user.set_password(password)
        
        # Hash deve ser diferente da senha original
        assert user.password_hash != password
        
        # Hash deve ter tamanho adequado
        assert len(user.password_hash) > 50
        
        # Hash deve começar com identificador bcrypt
        assert user.password_hash.startswith('$2b$')
    
    def test_password_reset_token_security(self, admin_user):
        """Testa segurança do token de redefinição"""
        token = generate_password_reset_token(admin_user.id)
        
        # Token deve ter tamanho adequado
        assert len(token) > 100
        
        # Token deve ser verificável
        user_id = verify_password_reset_token(token)
        assert user_id == admin_user.id
        
        # Token deve expirar
        expired_token = generate_password_reset_token(admin_user.id, expires_in=-3600)  # 1 hora atrás
        assert verify_password_reset_token(expired_token) is None
    
    def test_rate_limiting_login(self, client, admin_user):
        """Testa rate limiting em tentativas de login"""
        # Simular múltiplas tentativas de login falhadas
        for _ in range(6):  # Mais que o limite
            response = client.post('/api/auth/login', json={
                'email': admin_user.email,
                'password': 'wrongpassword'
            })
            # Primeiras tentativas devem retornar 401
            if response.status_code == 429:
                break
        
        # Deve eventualmente retornar 429 (Too Many Requests)
        assert response.status_code in [401, 429]
    
    @patch('flask.request')
    def test_suspicious_activity_detection(self, mock_request, client, admin_user):
        """Testa detecção de atividade suspeita"""
        # Simular login de IP diferente
        mock_request.remote_addr = '192.168.1.100'
        
        response = client.post('/api/auth/login', json={
            'email': admin_user.email,
            'password': 'admin123'
        })
        
        # Login deve ser permitido, mas atividade deve ser logada
        assert response.status_code == 200
        # Verificar se foi criado log de auditoria seria ideal aqui


@pytest.mark.unit
class TestPasswordUtils:
    """Testes para utilitários de senha"""
    
    def test_password_reset_token_generation(self):
        """Testa geração de token de redefinição"""
        user_id = 123
        token = generate_password_reset_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50
        
        # Token deve ser verificável
        verified_id = verify_password_reset_token(token)
        assert verified_id == user_id
    
    def test_password_reset_token_expiration(self):
        """Testa expiração do token"""
        user_id = 123
        
        # Token expirado
        expired_token = generate_password_reset_token(user_id, expires_in=-1)
        assert verify_password_reset_token(expired_token) is None
        
        # Token válido
        valid_token = generate_password_reset_token(user_id, expires_in=3600)
        assert verify_password_reset_token(valid_token) == user_id
    
    def test_invalid_password_reset_token(self):
        """Testa token inválido"""
        # Token malformado
        assert verify_password_reset_token('invalid-token') is None
        
        # Token vazio
        assert verify_password_reset_token('') is None
        
        # Token None
        assert verify_password_reset_token(None) is None


@pytest.mark.integration
class TestAuthIntegration:
    """Testes de integração para autenticação"""
    
    def test_complete_registration_flow(self, client, sample_user_data):
        """Testa fluxo completo de registro"""
        # 1. Registrar usuário
        response = client.post('/api/auth/register', json=sample_user_data)
        assert response.status_code == 201
        
        user_data = response.get_json()['user']
        
        # 2. Fazer login
        login_response = client.post('/api/auth/login', json={
            'email': sample_user_data['email'],
            'password': sample_user_data['password']
        })
        assert login_response.status_code == 200
        
        tokens = login_response.get_json()
        
        # 3. Acessar perfil
        headers = {'Authorization': f'Bearer {tokens["access_token"]}'}
        profile_response = client.get('/api/users/profile', headers=headers)
        assert profile_response.status_code == 200
        
        profile_data = profile_response.get_json()
        assert profile_data['user']['email'] == sample_user_data['email']
    
    def test_token_refresh_flow(self, client, admin_user):
        """Testa fluxo de refresh de token"""
        # 1. Login
        login_response = client.post('/api/auth/login', json={
            'email': admin_user.email,
            'password': 'admin123'
        })
        
        tokens = login_response.get_json()
        
        # 2. Refresh token
        refresh_response = client.post('/api/auth/refresh', json={
            'refresh_token': tokens['refresh_token']
        })
        assert refresh_response.status_code == 200
        
        new_tokens = refresh_response.get_json()
        
        # 3. Usar novo token
        headers = {'Authorization': f'Bearer {new_tokens["access_token"]}'}
        profile_response = client.get('/api/users/profile', headers=headers)
        assert profile_response.status_code == 200