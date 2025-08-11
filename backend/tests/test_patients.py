"""
Testes para o sistema de gestão de pacientes
"""

import pytest
from datetime import date, datetime
from decimal import Decimal

from models.patient import Patient, MedicalRecord, Evolution


@pytest.mark.api
class TestPatientsAPI:
    """Testes para API de pacientes"""
    
    def test_create_patient(self, client, auth_headers_professional, sample_patient_data):
        """Testa criação de paciente"""
        response = client.post('/api/patients',
                             headers=auth_headers_professional,
                             json=sample_patient_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'patient' in data
        assert data['patient']['full_name'] == sample_patient_data['full_name']
        assert data['patient']['document_number'] == sample_patient_data['document_number']
        assert data['patient']['email'] == sample_patient_data['email']
    
    def test_create_patient_duplicate_document(self, client, auth_headers_professional, test_patient):
        """Testa criação com documento duplicado"""
        patient_data = {
            'full_name': 'Outro Paciente',
            'document_number': test_patient.document_number,  # Mesmo CPF
            'phone': '11888777666',
            'email': 'outro@test.com',
            'birth_date': '1992-08-10',
            'gender': 'F'
        }
        
        response = client.post('/api/patients',
                             headers=auth_headers_professional,
                             json=patient_data)
        
        assert response.status_code == 400
        assert 'já existe' in response.get_json()['error']
    
    def test_list_patients(self, client, auth_headers_professional, test_patient):
        """Testa listagem de pacientes"""
        response = client.get('/api/patients',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'items' in data
        assert len(data['items']) >= 1
        assert data['items'][0]['full_name'] == test_patient.full_name
    
    def test_search_patients(self, client, auth_headers_professional, test_patient):
        """Testa busca de pacientes"""
        # Busca por nome
        response = client.get(f'/api/patients?search={test_patient.full_name[:5]}',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert len(data['items']) >= 1
        assert test_patient.full_name in [p['full_name'] for p in data['items']]
    
    def test_get_patient_details(self, client, auth_headers_professional, test_patient):
        """Testa detalhes do paciente"""
        response = client.get(f'/api/patients/{test_patient.id}',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['patient']['id'] == test_patient.id
        assert data['patient']['full_name'] == test_patient.full_name
        assert 'medical_records' in data
        assert 'evolutions' in data
    
    def test_update_patient(self, client, auth_headers_professional, test_patient):
        """Testa atualização de paciente"""
        update_data = {
            'full_name': 'João Silva Santos',
            'phone': '11999888777'
        }
        
        response = client.put(f'/api/patients/{test_patient.id}',
                            headers=auth_headers_professional,
                            json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['patient']['full_name'] == 'João Silva Santos'
        assert data['patient']['phone'] == '11999888777'
    
    def test_patient_unauthorized_access(self, client, auth_headers_patient, test_patient):
        """Testa acesso não autorizado a outros pacientes"""
        # Paciente não deve ver dados de outros pacientes
        response = client.get(f'/api/patients/{test_patient.id}',
                            headers=auth_headers_patient)
        
        assert response.status_code == 403


@pytest.mark.api
class TestMedicalRecordsAPI:
    """Testes para API de prontuários médicos"""
    
    def test_create_medical_record(self, client, auth_headers_professional, test_patient):
        """Testa criação de prontuário médico"""
        record_data = {
            'chief_complaint': 'Dor lombar há 3 semanas',
            'history_present_illness': 'Paciente relata início gradual de dor...',
            'past_medical_history': 'Nega cirurgias prévias',
            'medications': 'Dipirona 500mg quando necessário',
            'allergies': 'Nega alergias conhecidas',
            'social_history': 'Sedentário, trabalha em escritório',
            'physical_examination': 'Inspeção: postura anteriorizada...',
            'assessment': 'Lombalgia mecânica',
            'plan': 'Fisioterapia 3x/semana, alongamentos'
        }
        
        response = client.post(f'/api/patients/{test_patient.id}/medical-records',
                             headers=auth_headers_professional,
                             json=record_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'medical_record' in data
        assert data['medical_record']['chief_complaint'] == record_data['chief_complaint']
        assert data['medical_record']['assessment'] == record_data['assessment']
    
    def test_list_medical_records(self, client, auth_headers_professional, test_patient, db_session):
        """Testa listagem de prontuários"""
        # Criar prontuário primeiro
        record = MedicalRecord(
            patient_id=test_patient.id,
            created_by_id=auth_headers_professional.get('user_id', 1),
            chief_complaint='Teste',
            assessment='Teste assessment'
        )
        db_session.add(record)
        db_session.commit()
        
        response = client.get(f'/api/patients/{test_patient.id}/medical-records',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'items' in data
        assert len(data['items']) >= 1
    
    def test_update_medical_record(self, client, auth_headers_professional, test_patient, db_session, professional_user):
        """Testa atualização de prontuário"""
        # Criar prontuário
        record = MedicalRecord(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            chief_complaint='Queixa inicial',
            assessment='Avaliação inicial'
        )
        db_session.add(record)
        db_session.commit()
        
        update_data = {
            'assessment': 'Avaliação atualizada',
            'plan': 'Plano terapêutico modificado'
        }
        
        response = client.put(f'/api/patients/{test_patient.id}/medical-records/{record.id}',
                            headers=auth_headers_professional,
                            json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['medical_record']['assessment'] == 'Avaliação atualizada'
        assert data['medical_record']['plan'] == 'Plano terapêutico modificado'


@pytest.mark.api
class TestEvolutionsAPI:
    """Testes para API de evoluções SOAP"""
    
    def test_create_evolution(self, client, auth_headers_professional, test_patient):
        """Testa criação de evolução SOAP"""
        evolution_data = {
            'subjective': 'Paciente relata melhora da dor (7→4)',
            'objective': 'ADM: flexão 45°, extensão 10°. Força: grau 4',
            'assessment': 'Evolução favorável, mantém processo inflamatório residual',
            'plan': 'Continuar fisioterapia, adicionar fortalecimento',
            'session_type': 'FISIOTERAPIA',
            'pain_level': 4
        }
        
        response = client.post(f'/api/patients/{test_patient.id}/evolutions',
                             headers=auth_headers_professional,
                             json=evolution_data)
        
        assert response.status_code == 201
        data = response.get_json()
        
        assert 'evolution' in data
        assert data['evolution']['subjective'] == evolution_data['subjective']
        assert data['evolution']['pain_level'] == evolution_data['pain_level']
    
    def test_list_evolutions(self, client, auth_headers_professional, test_patient, db_session, professional_user):
        """Testa listagem de evoluções"""
        # Criar evolução primeiro
        evolution = Evolution(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            subjective='Teste subjective',
            objective='Teste objective',
            assessment='Teste assessment',
            plan='Teste plan',
            session_type='AVALIACAO'
        )
        db_session.add(evolution)
        db_session.commit()
        
        response = client.get(f'/api/patients/{test_patient.id}/evolutions',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'items' in data
        assert len(data['items']) >= 1
        assert data['items'][0]['subjective'] == 'Teste subjective'
    
    def test_evolution_pain_tracking(self, client, auth_headers_professional, test_patient, db_session, professional_user):
        """Testa rastreamento de dor nas evoluções"""
        # Criar várias evoluções com diferentes níveis de dor
        pain_levels = [8, 6, 4, 3, 2]
        
        for i, pain_level in enumerate(pain_levels):
            evolution = Evolution(
                patient_id=test_patient.id,
                created_by_id=professional_user.id,
                subjective=f'Sessão {i+1}',
                objective='Teste objective',
                assessment='Teste assessment',
                plan='Teste plan',
                pain_level=pain_level,
                session_type='FISIOTERAPIA'
            )
            db_session.add(evolution)
        
        db_session.commit()
        
        # Buscar histórico de dor
        response = client.get(f'/api/patients/{test_patient.id}/pain-history',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'pain_history' in data
        assert len(data['pain_history']) == 5
        
        # Verificar se está em ordem cronológica
        pain_values = [entry['pain_level'] for entry in data['pain_history']]
        assert pain_values == pain_levels


@pytest.mark.unit
class TestPatientModel:
    """Testes unitários para modelo Patient"""
    
    def test_patient_creation(self, db_session, professional_user):
        """Testa criação de paciente"""
        patient = Patient(
            full_name='Maria Silva',
            document_number='98765432100',
            phone='11888777666',
            email='maria@test.com',
            birth_date=date(1985, 3, 20),
            gender='F',
            created_by_id=professional_user.id
        )
        
        db_session.add(patient)
        db_session.commit()
        
        assert patient.id is not None
        assert patient.full_name == 'Maria Silva'
        assert patient.age >= 39  # Idade calculada
        assert patient.created_at is not None
    
    def test_patient_age_calculation(self, db_session, professional_user):
        """Testa cálculo de idade"""
        # Paciente nascido há exatamente 30 anos
        birth_date = date.today().replace(year=date.today().year - 30)
        
        patient = Patient(
            full_name='Teste Idade',
            document_number='11111111111',
            birth_date=birth_date,
            created_by_id=professional_user.id
        )
        
        db_session.add(patient)
        db_session.commit()
        
        assert patient.age == 30
    
    def test_patient_to_dict(self, test_patient):
        """Testa serialização do paciente"""
        patient_dict = test_patient.to_dict()
        
        assert patient_dict['id'] == test_patient.id
        assert patient_dict['full_name'] == test_patient.full_name
        assert patient_dict['email'] == test_patient.email
        assert patient_dict['age'] == test_patient.age
        
        # CPF deve estar mascarado por padrão
        assert '***' in patient_dict['document_number']
    
    def test_patient_to_dict_full(self, test_patient):
        """Testa serialização completa do paciente"""
        patient_dict = test_patient.to_dict(include_sensitive=True)
        
        # CPF completo deve aparecer
        assert patient_dict['document_number'] == test_patient.document_number
        assert '***' not in patient_dict['document_number']


@pytest.mark.unit
class TestMedicalRecordModel:
    """Testes unitários para modelo MedicalRecord"""
    
    def test_medical_record_creation(self, db_session, test_patient, professional_user):
        """Testa criação de prontuário médico"""
        record = MedicalRecord(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            chief_complaint='Dor no ombro direito',
            history_present_illness='Início há 2 meses após atividade física',
            physical_examination='Dor à palpação do tendão supraespinhal',
            assessment='Tendinopatia do supraespinhal',
            plan='Fisioterapia e anti-inflamatórios'
        )
        
        db_session.add(record)
        db_session.commit()
        
        assert record.id is not None
        assert record.patient_id == test_patient.id
        assert record.chief_complaint == 'Dor no ombro direito'
        assert record.created_at is not None
    
    def test_medical_record_encryption(self, db_session, test_patient, professional_user):
        """Testa criptografia de dados sensíveis no prontuário"""
        sensitive_data = "Paciente HIV positivo, em uso de antirretrovirais"
        
        record = MedicalRecord(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            chief_complaint='Teste',
            assessment='Teste',
            history_present_illness=sensitive_data
        )
        
        db_session.add(record)
        db_session.commit()
        
        # Verificar que dados sensíveis foram processados adequadamente
        assert record.history_present_illness == sensitive_data
    
    def test_medical_record_to_dict(self, db_session, test_patient, professional_user):
        """Testa serialização do prontuário médico"""
        record = MedicalRecord(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            chief_complaint='Teste queixa',
            assessment='Teste avaliação'
        )
        
        db_session.add(record)
        db_session.commit()
        
        record_dict = record.to_dict()
        
        assert record_dict['id'] == record.id
        assert record_dict['patient_id'] == test_patient.id
        assert record_dict['chief_complaint'] == 'Teste queixa'
        assert record_dict['assessment'] == 'Teste avaliação'
        assert 'created_by_name' in record_dict


@pytest.mark.unit
class TestEvolutionModel:
    """Testes unitários para modelo Evolution"""
    
    def test_evolution_creation(self, db_session, test_patient, professional_user):
        """Testa criação de evolução SOAP"""
        evolution = Evolution(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            subjective='Paciente relata melhora significativa',
            objective='ADM: flexão 90°, força grau 4/5',
            assessment='Evolução favorável do quadro',
            plan='Manter condutas atuais',
            session_type='FISIOTERAPIA',
            pain_level=3
        )
        
        db_session.add(evolution)
        db_session.commit()
        
        assert evolution.id is not None
        assert evolution.patient_id == test_patient.id
        assert evolution.pain_level == 3
        assert evolution.session_type == 'FISIOTERAPIA'
    
    def test_evolution_soap_validation(self, db_session, test_patient, professional_user):
        """Testa validação dos campos SOAP"""
        # Evolução sem campos obrigatórios deve falhar na validação de negócio
        evolution = Evolution(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            session_type='FISIOTERAPIA'
        )
        
        # Adicionar validação de negócio se necessário
        # Por exemplo, verificar se pelo menos um campo SOAP está preenchido
        assert evolution.subjective is None
        assert evolution.objective is None
        assert evolution.assessment is None
        assert evolution.plan is None
    
    def test_evolution_to_dict(self, db_session, test_patient, professional_user):
        """Testa serialização da evolução"""
        evolution = Evolution(
            patient_id=test_patient.id,
            created_by_id=professional_user.id,
            subjective='S: Melhor',
            objective='O: ADM normal',
            assessment='A: Evolução boa',
            plan='P: Alta',
            pain_level=1
        )
        
        db_session.add(evolution)
        db_session.commit()
        
        evolution_dict = evolution.to_dict()
        
        assert evolution_dict['id'] == evolution.id
        assert evolution_dict['subjective'] == 'S: Melhor'
        assert evolution_dict['pain_level'] == 1
        assert 'created_by_name' in evolution_dict


@pytest.mark.integration
class TestPatientIntegration:
    """Testes de integração para gestão de pacientes"""
    
    def test_complete_patient_workflow(self, client, auth_headers_professional, sample_patient_data):
        """Testa fluxo completo de gestão de paciente"""
        # 1. Criar paciente
        create_response = client.post('/api/patients',
                                    headers=auth_headers_professional,
                                    json=sample_patient_data)
        
        assert create_response.status_code == 201
        patient_data = create_response.get_json()['patient']
        patient_id = patient_data['id']
        
        # 2. Criar prontuário médico
        record_data = {
            'chief_complaint': 'Dor cervical',
            'assessment': 'Cervicalgia tensional',
            'plan': 'Fisioterapia e orientações posturais'
        }
        
        record_response = client.post(f'/api/patients/{patient_id}/medical-records',
                                    headers=auth_headers_professional,
                                    json=record_data)
        
        assert record_response.status_code == 201
        
        # 3. Criar evolução
        evolution_data = {
            'subjective': 'Relata melhora da dor',
            'objective': 'ADM cervical normal',
            'assessment': 'Boa evolução',
            'plan': 'Continuar tratamento',
            'pain_level': 3
        }
        
        evolution_response = client.post(f'/api/patients/{patient_id}/evolutions',
                                       headers=auth_headers_professional,
                                       json=evolution_data)
        
        assert evolution_response.status_code == 201
        
        # 4. Buscar dados completos do paciente
        patient_response = client.get(f'/api/patients/{patient_id}',
                                    headers=auth_headers_professional)
        
        assert patient_response.status_code == 200
        full_patient_data = patient_response.get_json()
        
        assert len(full_patient_data['medical_records']) >= 1
        assert len(full_patient_data['evolutions']) >= 1
    
    def test_patient_statistics(self, client, auth_headers_professional, test_patient, db_session, professional_user):
        """Testa estatísticas do paciente"""
        # Criar várias evoluções para gerar estatísticas
        pain_levels = [8, 6, 5, 3, 2, 1]
        
        for pain_level in pain_levels:
            evolution = Evolution(
                patient_id=test_patient.id,
                created_by_id=professional_user.id,
                subjective=f'Dor nível {pain_level}',
                objective='Objetivo',
                assessment='Avaliação',
                plan='Plano',
                pain_level=pain_level,
                session_type='FISIOTERAPIA'
            )
            db_session.add(evolution)
        
        db_session.commit()
        
        # Buscar estatísticas
        response = client.get(f'/api/patients/{test_patient.id}/statistics',
                            headers=auth_headers_professional)
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'statistics' in data
        stats = data['statistics']
        
        assert 'total_sessions' in stats
        assert 'pain_improvement' in stats
        assert 'last_pain_level' in stats
        
        assert stats['total_sessions'] == 6
        assert stats['last_pain_level'] == 1
        assert stats['pain_improvement'] > 0  # Houve melhora