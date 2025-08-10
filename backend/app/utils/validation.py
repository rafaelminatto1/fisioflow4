"""
Utilitários para validação de dados
"""

import re
from typing import Optional


def validate_cpf(cpf: str) -> bool:
    """
    Valida CPF brasileiro
    
    Args:
        cpf: CPF a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not cpf:
        return False
    
    # Remove caracteres não numéricos
    cpf = re.sub(r'[^0-9]', '', cpf)
    
    # Verifica se tem 11 dígitos
    if len(cpf) != 11:
        return False
    
    # Verifica se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        return False
    
    # Valida primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = soma % 11
    digito1 = 0 if resto < 2 else 11 - resto
    
    if int(cpf[9]) != digito1:
        return False
    
    # Valida segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = soma % 11
    digito2 = 0 if resto < 2 else 11 - resto
    
    return int(cpf[10]) == digito2


def validate_cnpj(cnpj: str) -> bool:
    """
    Valida CNPJ brasileiro
    
    Args:
        cnpj: CNPJ a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not cnpj:
        return False
    
    # Remove caracteres não numéricos
    cnpj = re.sub(r'[^0-9]', '', cnpj)
    
    # Verifica se tem 14 dígitos
    if len(cnpj) != 14:
        return False
    
    # Verifica se todos os dígitos são iguais
    if cnpj == cnpj[0] * 14:
        return False
    
    # Valida primeiro dígito verificador
    multiplicadores = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * multiplicadores[i] for i in range(12))
    resto = soma % 11
    digito1 = 0 if resto < 2 else 11 - resto
    
    if int(cnpj[12]) != digito1:
        return False
    
    # Valida segundo dígito verificador
    multiplicadores = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * multiplicadores[i] for i in range(13))
    resto = soma % 11
    digito2 = 0 if resto < 2 else 11 - resto
    
    return int(cnpj[13]) == digito2


def validate_phone(phone: str) -> bool:
    """
    Valida telefone brasileiro
    
    Args:
        phone: Telefone a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not phone:
        return False
    
    # Remove caracteres não numéricos
    numbers = re.sub(r'[^0-9]', '', phone)
    
    # Verifica formatos válidos
    # Celular: 11 dígitos (com 9 na frente do número)
    # Fixo: 10 dígitos
    if len(numbers) == 11:
        # Celular: (DD) 9xxxx-xxxx
        return numbers[2] == '9' and numbers[:2] in [f'{i:02d}' for i in range(11, 100)]
    elif len(numbers) == 10:
        # Fixo: (DD) xxxx-xxxx
        return numbers[:2] in [f'{i:02d}' for i in range(11, 100)]
    
    return False


def validate_email(email: str) -> bool:
    """
    Valida formato de email
    
    Args:
        email: Email a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_cep(cep: str) -> bool:
    """
    Valida CEP brasileiro
    
    Args:
        cep: CEP a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not cep:
        return False
    
    # Remove caracteres não numéricos
    numbers = re.sub(r'[^0-9]', '', cep)
    
    # Verifica se tem 8 dígitos
    return len(numbers) == 8


def validate_crefito(crefito: str) -> bool:
    """
    Valida número CREFITO
    
    Args:
        crefito: CREFITO a ser validado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not crefito:
        return False
    
    # Remove espaços e caracteres especiais, mantém letras e números
    clean_crefito = re.sub(r'[^A-Za-z0-9]', '', crefito).upper()
    
    # Formato: CREFITO-XX/NNNNN-F
    # Onde XX é o número do regional (1-20)
    # NNNNN é o número sequencial
    # F é o dígito verificador
    
    # Verifica padrão básico
    pattern = r'^CREFITO[0-9]{1,2}[0-9]{4,6}[A-Z]?$'
    if not re.match(pattern, clean_crefito):
        return False
    
    # Extrai o número do regional
    regional_match = re.search(r'CREFITO([0-9]{1,2})', clean_crefito)
    if not regional_match:
        return False
    
    regional = int(regional_match.group(1))
    
    # Verifica se o regional é válido (1-20)
    return 1 <= regional <= 20


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Valida força da senha
    
    Args:
        password: Senha a ser validada
        
    Returns:
        tuple: (válida, mensagem de erro)
    """
    if not password:
        return False, "Senha é obrigatória"
    
    if len(password) < 8:
        return False, "Senha deve ter pelo menos 8 caracteres"
    
    if len(password) > 128:
        return False, "Senha deve ter no máximo 128 caracteres"
    
    # Verifica se tem pelo menos uma letra minúscula
    if not re.search(r'[a-z]', password):
        return False, "Senha deve ter pelo menos uma letra minúscula"
    
    # Verifica se tem pelo menos uma letra maiúscula
    if not re.search(r'[A-Z]', password):
        return False, "Senha deve ter pelo menos uma letra maiúscula"
    
    # Verifica se tem pelo menos um número
    if not re.search(r'[0-9]', password):
        return False, "Senha deve ter pelo menos um número"
    
    # Verifica se tem pelo menos um caractere especial
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Senha deve ter pelo menos um caractere especial"
    
    # Verifica sequências comuns
    common_sequences = [
        '123456', 'abcdef', 'qwerty', 'password', 'admin', 
        '000000', '111111', '123123', 'abc123'
    ]
    
    password_lower = password.lower()
    for sequence in common_sequences:
        if sequence in password_lower:
            return False, "Senha não pode conter sequências comuns"
    
    return True, None


def validate_date_format(date_str: str, format_str: str = '%Y-%m-%d') -> bool:
    """
    Valida formato de data
    
    Args:
        date_str: String da data
        format_str: Formato esperado
        
    Returns:
        bool: True se válido, False caso contrário
    """
    if not date_str:
        return False
    
    try:
        from datetime import datetime
        datetime.strptime(date_str, format_str)
        return True
    except ValueError:
        return False


def validate_age_range(birth_date_str: str, min_age: int = 0, max_age: int = 150) -> tuple[bool, Optional[str]]:
    """
    Valida se a idade está dentro de um range aceitável
    
    Args:
        birth_date_str: Data de nascimento no formato YYYY-MM-DD
        min_age: Idade mínima
        max_age: Idade máxima
        
    Returns:
        tuple: (válida, mensagem de erro)
    """
    if not birth_date_str:
        return False, "Data de nascimento é obrigatória"
    
    try:
        from datetime import datetime, date
        birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
        
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        
        if age < min_age:
            return False, f"Idade mínima é {min_age} anos"
        
        if age > max_age:
            return False, f"Idade máxima é {max_age} anos"
        
        return True, None
        
    except ValueError:
        return False, "Formato de data inválido"


def sanitize_input(text: str, max_length: int = None, allow_html: bool = False) -> str:
    """
    Sanitiza entrada de texto
    
    Args:
        text: Texto a ser sanitizado
        max_length: Comprimento máximo
        allow_html: Se permite tags HTML
        
    Returns:
        str: Texto sanitizado
    """
    if not text:
        return ""
    
    # Remove caracteres de controle
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
    
    # Remove HTML se não permitido
    if not allow_html:
        text = re.sub(r'<[^>]*>', '', text)
    
    # Remove espaços excessivos
    text = ' '.join(text.split())
    
    # Limita comprimento
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()