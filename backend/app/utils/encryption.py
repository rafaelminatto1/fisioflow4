"""
Utilitários para criptografia de dados sensíveis
"""

import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from flask import current_app


def get_encryption_key() -> bytes:
    """
    Obtém a chave de criptografia das variáveis de ambiente
    """
    key = current_app.config.get('ENCRYPTION_KEY')
    if not key:
        raise ValueError("ENCRYPTION_KEY não definida nas configurações")
    
    # Se a chave está em base64, decodifica
    try:
        return base64.urlsafe_b64decode(key.encode())
    except Exception:
        # Se não conseguir decodificar, assume que já está em bytes
        return key.encode()


def generate_encryption_key() -> str:
    """
    Gera uma nova chave de criptografia
    Usar apenas durante a configuração inicial
    """
    key = Fernet.generate_key()
    return base64.urlsafe_b64encode(key).decode()


def encrypt_data(data: str) -> str:
    """
    Criptografa uma string de dados
    
    Args:
        data: String a ser criptografada
        
    Returns:
        String criptografada em base64
    """
    if not data:
        return ""
    
    try:
        f = Fernet(get_encryption_key())
        encrypted_data = f.encrypt(data.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted_data).decode()
    except Exception as e:
        current_app.logger.error(f"Erro ao criptografar dados: {e}")
        raise


def decrypt_data(encrypted_data: str) -> Optional[str]:
    """
    Descriptografa uma string de dados
    
    Args:
        encrypted_data: String criptografada em base64
        
    Returns:
        String descriptografada ou None se erro
    """
    if not encrypted_data:
        return None
    
    try:
        f = Fernet(get_encryption_key())
        decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted_data = f.decrypt(decoded_data)
        return decrypted_data.decode('utf-8')
    except Exception as e:
        current_app.logger.error(f"Erro ao descriptografar dados: {e}")
        return None


def mask_sensitive_data(data: str, mask_char: str = "*", show_start: int = 2, show_end: int = 2) -> str:
    """
    Mascara dados sensíveis para exibição
    
    Args:
        data: Dados a serem mascarados
        mask_char: Caractere para mascarar
        show_start: Quantos caracteres mostrar no início
        show_end: Quantos caracteres mostrar no final
        
    Returns:
        String mascarada
    """
    if not data or len(data) <= (show_start + show_end):
        return mask_char * len(data) if data else ""
    
    start = data[:show_start]
    end = data[-show_end:] if show_end > 0 else ""
    middle_length = len(data) - show_start - show_end
    middle = mask_char * middle_length
    
    return f"{start}{middle}{end}"


def mask_cpf(cpf: str) -> str:
    """
    Mascara CPF para exibição
    Formato: 123.456.***-**
    """
    if not cpf:
        return ""
    
    # Remove caracteres não numéricos
    numbers = ''.join(filter(str.isdigit, cpf))
    
    if len(numbers) != 11:
        return mask_sensitive_data(cpf)
    
    return f"{numbers[:3]}.{numbers[3:6]}.***-**"


def mask_phone(phone: str) -> str:
    """
    Mascara telefone para exibição
    Formato: (11) 9****-****
    """
    if not phone:
        return ""
    
    # Remove caracteres não numéricos
    numbers = ''.join(filter(str.isdigit, phone))
    
    if len(numbers) == 11:  # Celular
        return f"({numbers[:2]}) {numbers[2]}****-****"
    elif len(numbers) == 10:  # Fixo
        return f"({numbers[:2]}) ****-****"
    else:
        return mask_sensitive_data(phone, show_start=2, show_end=2)


def mask_email(email: str) -> str:
    """
    Mascara email para exibição
    Formato: us***@ex*****.com
    """
    if not email or '@' not in email:
        return mask_sensitive_data(email)
    
    local, domain = email.split('@', 1)
    
    # Mascara parte local
    if len(local) <= 2:
        masked_local = mask_sensitive_data(local)
    else:
        masked_local = f"{local[:2]}***"
    
    # Mascara domínio
    if '.' in domain:
        domain_parts = domain.split('.')
        domain_name = domain_parts[0]
        domain_ext = '.'.join(domain_parts[1:])
        
        if len(domain_name) <= 2:
            masked_domain = f"***{domain_ext}"
        else:
            masked_domain = f"{domain_name[:2]}***.{domain_ext}"
    else:
        masked_domain = mask_sensitive_data(domain, show_end=2)
    
    return f"{masked_local}@{masked_domain}"