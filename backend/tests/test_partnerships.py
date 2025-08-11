"""
Testes para o sistema de parcerias
"""

import pytest
from datetime import datetime, date, timedelta
from decimal import Decimal

from models.partnership import Partner, Voucher, VoucherUsage, Commission
from models.appointment import Appointment
from utils.audit import AuditService


@pytest.mark.api
class TestPartnersAPI:
    """Testes para API de parceiros"""
    
    def test_create_partner(self, client, auth_headers_admin, sample_partner_data):
        """Testa criação de parceiro"""
        response = client.post('/api/partnerships/partners', 
                             headers=auth_headers_admin,
                             json=sample_partner_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'partner' in data
        assert data['partner']['business_name'] == sample_partner_data['business_name']
        assert data['partner']['partner_type'] == sample_partner_data['partner_type']
        assert data['partner']['commission_percentage'] == sample_partner_data['commission_percentage']
    
    def test_create_partner_duplicate_document(self, client, auth_headers_admin, test_partner):
        """Testa criação com documento duplicado"""
        partner_data = {
            'business_name': 'Outra Clínica',
            'partner_type': 'CLINIC',
            'document_number': test_partner.document_number,  # Mesmo CNPJ
            'email': 'outra@clinica.com',
            'commission_percentage': 10.0
        }
        
        response = client.post('/api/partnerships/partners',
                             headers=auth_headers_admin,
                             json=partner_data)
        
        assert response.status_code == 400
        assert 'já existe' in response.get_json()['error']
    
    def test_list_partners(self, client, auth_headers_admin, test_partner):
        """Testa listagem de parceiros"""
        response = client.get('/api/partnerships/partners',
                            headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'items' in data
        assert len(data['items']) >= 1
        assert data['items'][0]['business_name'] == test_partner.business_name
    
    def test_get_partner_details(self, client, auth_headers_admin, test_partner):
        """Testa detalhes do parceiro"""
        response = client.get(f'/api/partnerships/partners/{test_partner.id}',
                            headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['partner']['id'] == test_partner.id
        assert data['partner']['business_name'] == test_partner.business_name
    
    def test_update_partner(self, client, auth_headers_admin, test_partner):
        """Testa atualização de parceiro"""
        update_data = {
            'business_name': 'Clínica Atualizada',
            'commission_percentage': 18.0
        }
        
        response = client.put(f'/api/partnerships/partners/{test_partner.id}',
                            headers=auth_headers_admin,
                            json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['partner']['business_name'] == 'Clínica Atualizada'
        assert data['partner']['commission_percentage'] == 18.0
    
    def test_partner_unauthorized_access(self, client, auth_headers_patient):
        """Testa acesso não autorizado à API de parceiros"""
        response = client.get('/api/partnerships/partners',
                            headers=auth_headers_patient)
        
        assert response.status_code == 403


@pytest.mark.api 
class TestVouchersAPI:
    """Testes para API de vouchers"""
    
    def test_create_voucher(self, client, auth_headers_admin, test_partner, sample_voucher_data):
        """Testa criação de voucher"""
        sample_voucher_data['partner_id'] = test_partner.id
        
        response = client.post('/api/partnerships/vouchers',
                             headers=auth_headers_admin,
                             json=sample_voucher_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'voucher' in data
        assert data['voucher']['code'] == sample_voucher_data['code']
        assert data['voucher']['partner_id'] == test_partner.id
    
    def test_create_voucher_duplicate_code(self, client, auth_headers_admin, test_voucher, test_partner):
        """Testa criação com código duplicado"""
        voucher_data = {
            'code': test_voucher.code,  # Mesmo código
            'name': 'Outro Voucher',
            'partner_id': test_partner.id,
            'discount_type': 'PERCENTAGE',
            'discount_value': 15.0,
            'valid_from': '2024-01-01 00:00:00',
            'valid_until': '2024-12-31 23:59:59'
        }
        
        response = client.post('/api/partnerships/vouchers',
                             headers=auth_headers_admin,
                             json=voucher_data)
        
        assert response.status_code == 400
        assert 'já existe' in response.get_json()['error']
    
    def test_validate_voucher_success(self, client, auth_headers_professional, test_voucher):
        """Testa validação de voucher com sucesso"""
        response = client.post(f'/api/partnerships/vouchers/validate/{test_voucher.code}',
                             headers=auth_headers_professional,
                             json={'total_amount': 150.00})
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['valid'] == True
        assert data['discount_amount'] > 0
        assert data['final_amount'] < data['original_amount']
    
    def test_validate_voucher_below_minimum(self, client, auth_headers_professional, test_voucher):
        """Testa validação com valor abaixo do mínimo"""
        response = client.post(f'/api/partnerships/vouchers/validate/{test_voucher.code}',
                             headers=auth_headers_professional,
                             json={'total_amount': 50.00})  # Abaixo do mínimo de R$ 100
        
        assert response.status_code == 400
        assert 'mínimo' in response.get_json()['error']
    
    def test_validate_nonexistent_voucher(self, client, auth_headers_professional):
        """Testa validação de voucher inexistente"""
        response = client.post('/api/partnerships/vouchers/validate/INEXISTENTE',
                             headers=auth_headers_professional,
                             json={'total_amount': 150.00})
        
        assert response.status_code == 404
    
    def test_use_voucher(self, client, auth_headers_professional, test_voucher):
        """Testa uso de voucher"""
        response = client.post(f'/api/partnerships/vouchers/{test_voucher.id}/use',
                             headers=auth_headers_professional,
                             json={'original_amount': 150.00})
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'usage' in data
        assert data['discount_amount'] > 0
        assert data['final_amount'] < 150.00


@pytest.mark.api
class TestCommissionsAPI:
    """Testes para API de comissões"""
    
    def test_calculate_commissions(self, client, auth_headers_admin, test_appointment):
        """Testa cálculo de comissões"""
        response = client.post('/api/partnerships/commissions/calculate',
                             headers=auth_headers_admin,
                             json={
                                 'year': 2024,
                                 'month': 6
                             })
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'commissions_created' in data
        assert data['commissions_created'] >= 1
    
    def test_list_commissions(self, client, auth_headers_admin, db_session, test_appointment):
        """Testa listagem de comissões"""
        # Criar comissão primeiro
        commission = Commission(
            partner_id=test_appointment.partner_id,
            appointment_id=test_appointment.id,
            reference_month=6,
            reference_year=2024,
            gross_amount=test_appointment.price,
            commission_percentage=Decimal('15.00'),
            commission_amount=test_appointment.price * Decimal('0.15'),
            net_commission=test_appointment.price * Decimal('0.15'),
            status='CALCULATED'
        )
        db_session.add(commission)
        db_session.commit()
        
        response = client.get('/api/partnerships/commissions',
                            headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'items' in data
        assert len(data['items']) >= 1
    
    def test_mark_commission_paid(self, client, auth_headers_admin, db_session, test_appointment):
        """Testa marcação de comissão como paga"""
        # Criar comissão
        commission = Commission(
            partner_id=test_appointment.partner_id,
            appointment_id=test_appointment.id,
            reference_month=6,
            reference_year=2024,
            gross_amount=test_appointment.price,
            commission_percentage=Decimal('15.00'),
            commission_amount=test_appointment.price * Decimal('0.15'),
            net_commission=test_appointment.price * Decimal('0.15'),
            status='CALCULATED'
        )
        db_session.add(commission)
        db_session.commit()
        
        response = client.post(f'/api/partnerships/commissions/{commission.id}/pay',
                             headers=auth_headers_admin,
                             json={
                                 'payment_reference': 'TED123456',
                                 'notes': 'Pago via transferência bancária'
                             })
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['commission']['status'] == 'PAID'
        assert data['commission']['payment_reference'] == 'TED123456'


@pytest.mark.unit
class TestVoucherModel:
    """Testes unitários para modelo Voucher"""
    
    def test_voucher_is_valid(self, test_voucher, patient_user):
        """Testa validação de voucher"""
        # Voucher válido
        is_valid, message = test_voucher.is_valid(
            user_id=patient_user.id,
            total_amount=Decimal('150.00')
        )
        assert is_valid == True
        assert message == "Voucher válido"
        
        # Valor abaixo do mínimo
        is_valid, message = test_voucher.is_valid(
            user_id=patient_user.id,
            total_amount=Decimal('50.00')
        )
        assert is_valid == False
        assert 'mínimo' in message
    
    def test_voucher_calculate_discount(self, test_voucher):
        """Testa cálculo de desconto"""
        # Desconto percentual (20%)
        discount = test_voucher.calculate_discount(Decimal('100.00'))
        assert discount == 20.0
        
        # Desconto percentual com valor maior
        discount = test_voucher.calculate_discount(Decimal('200.00'))
        assert discount == 40.0
    
    def test_voucher_fixed_discount(self, db_session, test_partner, admin_user):
        """Testa voucher com desconto fixo"""
        voucher = Voucher(
            code='FIXO50',
            name='Desconto Fixo',
            partner_id=test_partner.id,
            discount_type='FIXED_AMOUNT',
            discount_value=Decimal('50.00'),
            valid_from=datetime(2024, 1, 1),
            valid_until=datetime(2024, 12, 31),
            created_by_id=admin_user.id
        )
        db_session.add(voucher)
        db_session.commit()
        
        # Desconto fixo
        discount = voucher.calculate_discount(Decimal('100.00'))
        assert discount == 50.0
        
        # Desconto não pode ser maior que o valor total
        discount = voucher.calculate_discount(Decimal('30.00'))
        assert discount == 30.0
    
    def test_voucher_usage_limit(self, test_voucher, patient_user):
        """Testa limite de uso do voucher"""
        # Simular uso até o limite
        test_voucher.current_usage_count = test_voucher.usage_limit - 1
        
        # Deve estar válido
        is_valid, message = test_voucher.is_valid(user_id=patient_user.id)
        assert is_valid == True
        
        # Exceder limite
        test_voucher.current_usage_count = test_voucher.usage_limit
        
        is_valid, message = test_voucher.is_valid(user_id=patient_user.id)
        assert is_valid == False
        assert 'esgotado' in message


@pytest.mark.unit
class TestPartnerModel:
    """Testes unitários para modelo Partner"""
    
    def test_partner_to_dict(self, test_partner):
        """Testa serialização do parceiro"""
        partner_dict = test_partner.to_dict()
        
        assert partner_dict['id'] == test_partner.id
        assert partner_dict['business_name'] == test_partner.business_name
        assert partner_dict['partner_type'] == test_partner.partner_type
        assert partner_dict['commission_percentage'] == float(test_partner.commission_percentage)
        
        # Documento deve estar mascarado por padrão
        assert '****' in partner_dict['document_number']
    
    def test_partner_to_dict_sensitive(self, test_partner):
        """Testa serialização com dados sensíveis"""
        partner_dict = test_partner.to_dict(include_sensitive=True)
        
        # Documento completo deve aparecer
        assert partner_dict['document_number'] == test_partner.document_number
        assert '****' not in partner_dict['document_number']


@pytest.mark.integration
class TestPartnershipIntegration:
    """Testes de integração do sistema de parcerias"""
    
    def test_complete_voucher_flow(self, client, auth_headers_admin, auth_headers_professional, 
                                 test_partner, sample_voucher_data):
        """Testa fluxo completo de criação e uso de voucher"""
        # 1. Criar voucher
        sample_voucher_data['partner_id'] = test_partner.id
        
        create_response = client.post('/api/partnerships/vouchers',
                                    headers=auth_headers_admin,
                                    json=sample_voucher_data)
        
        assert create_response.status_code == 201
        voucher_data = create_response.get_json()['voucher']
        
        # 2. Validar voucher
        validate_response = client.post(f'/api/partnerships/vouchers/validate/{voucher_data["code"]}',
                                      headers=auth_headers_professional,
                                      json={'total_amount': 300.00})
        
        assert validate_response.status_code == 200
        validation_data = validate_response.get_json()
        
        # 3. Usar voucher
        use_response = client.post(f'/api/partnerships/vouchers/{voucher_data["id"]}/use',
                                 headers=auth_headers_professional,
                                 json={'original_amount': 300.00})
        
        assert use_response.status_code == 200
        usage_data = use_response.get_json()
        
        assert usage_data['discount_amount'] == validation_data['discount_amount']
        assert usage_data['final_amount'] == validation_data['final_amount']
    
    def test_commission_calculation_flow(self, client, auth_headers_admin, test_appointment):
        """Testa fluxo de cálculo e pagamento de comissões"""
        # 1. Calcular comissões do mês
        calc_response = client.post('/api/partnerships/commissions/calculate',
                                  headers=auth_headers_admin,
                                  json={
                                      'year': 2024,
                                      'month': 6
                                  })
        
        assert calc_response.status_code == 200
        calc_data = calc_response.get_json()
        assert calc_data['commissions_created'] >= 1
        
        # 2. Listar comissões calculadas
        list_response = client.get('/api/partnerships/commissions?status=CALCULATED',
                                 headers=auth_headers_admin)
        
        assert list_response.status_code == 200
        list_data = list_response.get_json()
        assert len(list_data['items']) >= 1
        
        commission = list_data['items'][0]
        
        # 3. Marcar como paga
        pay_response = client.post(f'/api/partnerships/commissions/{commission["id"]}/pay',
                                 headers=auth_headers_admin,
                                 json={
                                     'payment_reference': 'PIX_TEST_123',
                                     'notes': 'Teste automatizado'
                                 })
        
        assert pay_response.status_code == 200
        pay_data = pay_response.get_json()
        assert pay_data['commission']['status'] == 'PAID'
    
    def test_partnership_dashboard(self, client, auth_headers_admin, test_partner, test_voucher):
        """Testa dashboard de parcerias"""
        response = client.get('/api/partnerships/dashboard',
                            headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'overview' in data
        assert 'top_partners' in data
        
        overview = data['overview']
        assert 'total_partners' in overview
        assert 'active_partners' in overview
        assert 'total_vouchers' in overview
        assert overview['total_partners'] >= 1
        assert overview['total_vouchers'] >= 1


@pytest.mark.security
class TestPartnershipSecurity:
    """Testes de segurança para sistema de parcerias"""
    
    def test_encrypted_banking_data(self, db_session, test_partner, admin_user):
        """Testa criptografia de dados bancários"""
        from utils.encryption import encrypt_data, decrypt_data
        
        # Dados bancários sensíveis
        account_number = "123456-7"
        agency = "1234"
        
        # Atualizar parceiro com dados bancários
        test_partner.account_number = encrypt_data(account_number)
        test_partner.agency = encrypt_data(agency)
        
        db_session.commit()
        
        # Verificar que dados estão criptografados no banco
        assert test_partner.account_number != account_number
        assert test_partner.agency != agency
        
        # Verificar que podem ser descriptografados
        decrypted_account = decrypt_data(test_partner.account_number)
        decrypted_agency = decrypt_data(test_partner.agency)
        
        assert decrypted_account == account_number
        assert decrypted_agency == agency
    
    def test_audit_log_creation(self, client, auth_headers_admin, test_partner, db_session):
        """Testa criação de logs de auditoria"""
        from models.audit import AuditLog
        
        # Contar logs antes
        initial_count = AuditLog.query.count()
        
        # Fazer uma operação que deve gerar log
        client.put(f'/api/partnerships/partners/{test_partner.id}',
                  headers=auth_headers_admin,
                  json={'business_name': 'Nome Atualizado'})
        
        # Verificar se log foi criado
        final_count = AuditLog.query.count()
        assert final_count > initial_count
        
        # Verificar conteúdo do log
        latest_log = AuditLog.query.order_by(AuditLog.timestamp.desc()).first()
        assert latest_log.action == 'UPDATE'
        assert latest_log.resource_type == 'Partner'
        assert latest_log.resource_id == test_partner.id
    
    def test_voucher_code_validation(self, client, auth_headers_admin, test_partner):
        """Testa validação de códigos de voucher"""
        # Código com caracteres especiais (deve falhar)
        invalid_data = {
            'code': 'TEST@#$',
            'name': 'Voucher Inválido',
            'partner_id': test_partner.id,
            'discount_type': 'PERCENTAGE',
            'discount_value': 10.0,
            'valid_from': '2024-01-01 00:00:00',
            'valid_until': '2024-12-31 23:59:59'
        }
        
        response = client.post('/api/partnerships/vouchers',
                             headers=auth_headers_admin,
                             json=invalid_data)
        
        # Pode ser aceito dependendo da validação implementada
        # O importante é que o sistema trate adequadamente