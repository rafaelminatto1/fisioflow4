"""
Utilitários para criptografia de dados sensíveis
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Serviço para criptografia de dados sensíveis"""
    
    def __init__(self):
        self._fernet = None
        self._initialize()
    
    def _initialize(self):
        """Inicializa o serviço de criptografia"""
        try:
            # Obter chave mestra do ambiente
            master_key = os.environ.get('ENCRYPTION_KEY')
            if not master_key:
                # Gerar chave em desenvolvimento (não usar em produção)
                master_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
                logger.warning("ENCRYPTION_KEY não definida. Usando chave temporária.")
            
            # Criar derivação da chave
            salt = b'fisioflow_salt_2024'  # Em produção, usar salt aleatório por instalação
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            
            key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
            self._fernet = Fernet(key)
            
        except Exception as e:
            logger.error(f"Erro ao inicializar serviço de criptografia: {e}")
            raise
    
    def encrypt(self, data: str) -> str:
        """
        Criptografa uma string
        
        Args:
            data: Dados para criptografar
            
        Returns:
            Dados criptografados em base64
        """
        if not data:
            return ""
        
        try:
            encrypted_data = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Erro ao criptografar dados: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Descriptografa uma string
        
        Args:
            encrypted_data: Dados criptografados em base64
            
        Returns:
            Dados descriptografados
        """
        if not encrypted_data:
            return ""
        
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Erro ao descriptografar dados: {e}")
            raise


# Instância global do serviço
_encryption_service = None


def get_encryption_service() -> EncryptionService:
    """Retorna a instância do serviço de criptografia"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service


def encrypt_data(data: str) -> str:
    """
    Função auxiliar para criptografar dados
    
    Args:
        data: Dados para criptografar
        
    Returns:
        Dados criptografados
    """
    if not data:
        return ""
    
    service = get_encryption_service()
    return service.encrypt(data)


def decrypt_data(encrypted_data: str) -> str:
    """
    Função auxiliar para descriptografar dados
    
    Args:
        encrypted_data: Dados criptografados
        
    Returns:
        Dados descriptografados
    """
    if not encrypted_data:
        return ""
    
    service = get_encryption_service()
    return service.decrypt(encrypted_data)


def mask_sensitive_data(data: str, show_chars: int = 4) -> str:
    """
    Mascara dados sensíveis mostrando apenas os últimos caracteres
    
    Args:
        data: Dados para mascarar
        show_chars: Número de caracteres finais para mostrar
        
    Returns:
        Dados mascarados
    """
    if not data or len(data) <= show_chars:
        return "*" * len(data) if data else ""
    
    return "*" * (len(data) - show_chars) + data[-show_chars:]


class DataMasker:
    """Classe para mascarar diferentes tipos de dados sensíveis"""
    
    @staticmethod
    def mask_cpf(cpf: str) -> str:
        """Mascara CPF: 123.456.789-10 -> ***.456.789-**"""
        if not cpf or len(cpf) < 11:
            return cpf
        
        # Remove formatação
        clean_cpf = ''.join(filter(str.isdigit, cpf))
        if len(clean_cpf) != 11:
            return cpf
        
        # Aplica máscara
        masked = f"***.{clean_cpf[3:6]}.{clean_cpf[6:9]}-**"
        return masked
    
    @staticmethod
    def mask_cnpj(cnpj: str) -> str:
        """Mascara CNPJ: 12.345.678/0001-90 -> **.345.678/****-**"""
        if not cnpj or len(cnpj) < 14:
            return cnpj
        
        # Remove formatação
        clean_cnpj = ''.join(filter(str.isdigit, cnpj))
        if len(clean_cnpj) != 14:
            return cnpj
        
        # Aplica máscara
        masked = f"**.{clean_cnpj[2:5]}.{clean_cnpj[5:8]}/****-**"
        return masked
    
    @staticmethod
    def mask_account_number(account: str) -> str:
        """Mascara número da conta: 12345-6 -> ***45-*"""
        if not account or len(account) < 4:
            return "*" * len(account) if account else ""
        
        if '-' in account:
            parts = account.split('-')
            if len(parts) == 2:
                main_part = parts[0]
                check_digit = parts[1]
                masked_main = "*" * (len(main_part) - 2) + main_part[-2:] if len(main_part) > 2 else main_part
                masked_check = "*" * len(check_digit)
                return f"{masked_main}-{masked_check}"
        
        return "*" * (len(account) - 4) + account[-4:]
    
    @staticmethod
    def mask_agency(agency: str) -> str:
        """Mascara agência: 1234 -> **34"""
        return mask_sensitive_data(agency, 2)
    
    @staticmethod
    def mask_email(email: str) -> str:
        """Mascara email: joao@empresa.com -> j***@empresa.com"""
        if not email or '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 1:
            return email
        
        masked_local = local[0] + '*' * (len(local) - 1)
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """Mascara telefone: (11) 99999-9999 -> (11) ****9-****"""
        if not phone:
            return phone
        
        # Remove formatação
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if len(clean_phone) == 11:  # Celular
            return f"({clean_phone[:2]}) ****{clean_phone[6]}-****"
        elif len(clean_phone) == 10:  # Fixo
            return f"({clean_phone[:2]}) ****-****"
        else:
            return mask_sensitive_data(phone, 4)


def validate_encryption_key():
    """Valida se a chave de criptografia está configurada corretamente"""
    try:
        service = get_encryption_service()
        # Testa criptografia/descriptografia
        test_data = "test_encryption_123"
        encrypted = service.encrypt(test_data)
        decrypted = service.decrypt(encrypted)
        
        if decrypted != test_data:
            raise ValueError("Falha na validação da criptografia")
        
        logger.info("Serviço de criptografia validado com sucesso")
        return True
        
    except Exception as e:
        logger.error(f"Falha na validação do serviço de criptografia: {e}")
        return False