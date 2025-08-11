"""
Modelos para sistema de parcerias e vouchers
"""

from datetime import datetime, date
from enum import Enum
from decimal import Decimal
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from . import db

class PartnerStatus(Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"

class PartnerType(Enum):
    CLINIC = "CLINIC"
    INSURANCE = "INSURANCE"
    CORPORATE = "CORPORATE"
    ACADEMY = "ACADEMY"
    INDIVIDUAL = "INDIVIDUAL"

class VoucherStatus(Enum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class CommissionStatus(Enum):
    PENDING = "PENDING"
    CALCULATED = "CALCULATED"
    PAID = "PAID"
    DISPUTED = "DISPUTED"

class Partner(db.Model):
    """Modelo para parceiros do sistema"""
    __tablename__ = 'partners'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Informações básicas
    business_name = Column(String(200), nullable=False)
    trade_name = Column(String(200))
    partner_type = Column(String(20), nullable=False)  # PartnerType enum
    status = Column(String(20), default='PENDING')  # PartnerStatus enum
    
    # Documentos
    document_number = Column(String(20), unique=True, nullable=False)  # CNPJ/CPF
    state_registration = Column(String(20))
    municipal_registration = Column(String(20))
    
    # Contato
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(20))
    mobile_phone = Column(String(20))
    website = Column(String(255))
    
    # Endereço
    address_street = Column(String(255))
    address_number = Column(String(10))
    address_complement = Column(String(100))
    address_district = Column(String(100))
    address_city = Column(String(100))
    address_state = Column(String(2))
    address_zipcode = Column(String(10))
    
    # Dados bancários (criptografados)
    bank_name = Column(String(100))
    bank_code = Column(String(10))
    agency = Column(String(20))
    account_number = Column(String(30))
    account_type = Column(String(20))
    account_holder_name = Column(String(200))
    account_holder_document = Column(String(20))
    
    # Configurações de comissão
    commission_percentage = Column(Numeric(5, 2), default=0.00)
    minimum_commission = Column(Numeric(10, 2), default=0.00)
    payment_day = Column(Integer, default=5)  # Dia do mês para pagamento
    
    # Configurações de desconto
    default_discount_percentage = Column(Numeric(5, 2), default=0.00)
    maximum_discount_percentage = Column(Numeric(5, 2), default=0.00)
    
    # Metadados
    contract_start_date = Column(Date)
    contract_end_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Relacionamentos
    created_by = relationship("User", foreign_keys=[created_by_id])
    vouchers = relationship("Voucher", back_populates="partner", cascade="all, delete-orphan")
    commissions = relationship("Commission", back_populates="partner", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="partner")

    def __repr__(self):
        return f'<Partner {self.business_name}>'

    def to_dict(self, include_sensitive=False):
        """Converte o objeto Partner para dicionário"""
        data = {
            'id': self.id,
            'business_name': self.business_name,
            'trade_name': self.trade_name,
            'partner_type': self.partner_type,
            'status': self.status,
            'document_number': self.document_number[-4:] + '****' if not include_sensitive else self.document_number,
            'email': self.email,
            'phone': self.phone,
            'mobile_phone': self.mobile_phone,
            'website': self.website,
            'address': {
                'street': self.address_street,
                'number': self.address_number,
                'complement': self.address_complement,
                'district': self.address_district,
                'city': self.address_city,
                'state': self.address_state,
                'zipcode': self.address_zipcode,
            },
            'commission_percentage': float(self.commission_percentage) if self.commission_percentage else 0,
            'minimum_commission': float(self.minimum_commission) if self.minimum_commission else 0,
            'payment_day': self.payment_day,
            'default_discount_percentage': float(self.default_discount_percentage) if self.default_discount_percentage else 0,
            'maximum_discount_percentage': float(self.maximum_discount_percentage) if self.maximum_discount_percentage else 0,
            'contract_start_date': self.contract_start_date.isoformat() if self.contract_start_date else None,
            'contract_end_date': self.contract_end_date.isoformat() if self.contract_end_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data['banking'] = {
                'bank_name': self.bank_name,
                'bank_code': self.bank_code,
                'agency': self.agency,
                'account_number': self.account_number,
                'account_type': self.account_type,
                'account_holder_name': self.account_holder_name,
                'account_holder_document': self.account_holder_document,
            }
        
        return data

class Voucher(db.Model):
    """Modelo para vouchers/cupons de desconto"""
    __tablename__ = 'vouchers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificação
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Parceiro
    partner_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    
    # Configurações do voucher
    discount_type = Column(String(20), nullable=False)  # PERCENTAGE, FIXED_AMOUNT
    discount_value = Column(Numeric(10, 2), nullable=False)
    minimum_amount = Column(Numeric(10, 2), default=0.00)
    maximum_discount = Column(Numeric(10, 2))
    
    # Limites de uso
    usage_limit = Column(Integer)  # Limite total de usos (null = ilimitado)
    usage_limit_per_user = Column(Integer)  # Limite por usuário (null = ilimitado)
    current_usage_count = Column(Integer, default=0)
    
    # Validade
    valid_from = Column(DateTime, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    
    # Status e restrições
    status = Column(String(20), default='ACTIVE')  # VoucherStatus enum
    is_active = Column(Boolean, default=True)
    first_time_only = Column(Boolean, default=False)  # Apenas para novos usuários
    
    # Restrições de aplicação
    applicable_services = Column(JSON)  # Lista de tipos de serviços aplicáveis
    excluded_services = Column(JSON)  # Lista de serviços excluídos
    min_appointments = Column(Integer, default=1)  # Mínimo de consultas necessárias
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    
    # Relacionamentos
    partner = relationship("Partner", back_populates="vouchers")
    created_by = relationship("User", foreign_keys=[created_by_id])
    voucher_usages = relationship("VoucherUsage", back_populates="voucher", cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Voucher {self.code}>'

    def is_valid(self, user_id=None, total_amount=None):
        """Verifica se o voucher é válido para uso"""
        now = datetime.utcnow()
        
        # Verificar status
        if self.status != 'ACTIVE' or not self.is_active:
            return False, "Voucher inativo ou cancelado"
        
        # Verificar validade temporal
        if now < self.valid_from:
            return False, "Voucher ainda não válido"
        
        if now > self.valid_until:
            return False, "Voucher expirado"
        
        # Verificar limite de uso total
        if self.usage_limit and self.current_usage_count >= self.usage_limit:
            return False, "Voucher esgotado"
        
        # Verificar valor mínimo
        if total_amount and self.minimum_amount and total_amount < self.minimum_amount:
            return False, f"Valor mínimo de R$ {self.minimum_amount} não atingido"
        
        # Verificar limite por usuário
        if user_id and self.usage_limit_per_user:
            user_usage_count = VoucherUsage.query.filter_by(
                voucher_id=self.id,
                user_id=user_id
            ).count()
            
            if user_usage_count >= self.usage_limit_per_user:
                return False, "Limite de uso por usuário excedido"
        
        return True, "Voucher válido"

    def calculate_discount(self, total_amount):
        """Calcula o desconto aplicável"""
        if self.discount_type == 'PERCENTAGE':
            discount = total_amount * (self.discount_value / 100)
        else:  # FIXED_AMOUNT
            discount = self.discount_value
        
        # Aplicar desconto máximo se definido
        if self.maximum_discount and discount > self.maximum_discount:
            discount = self.maximum_discount
        
        # Desconto não pode ser maior que o valor total
        if discount > total_amount:
            discount = total_amount
        
        return float(discount)

    def to_dict(self):
        """Converte o objeto Voucher para dicionário"""
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'partner_id': self.partner_id,
            'partner_name': self.partner.business_name if self.partner else None,
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value),
            'minimum_amount': float(self.minimum_amount) if self.minimum_amount else 0,
            'maximum_discount': float(self.maximum_discount) if self.maximum_discount else None,
            'usage_limit': self.usage_limit,
            'usage_limit_per_user': self.usage_limit_per_user,
            'current_usage_count': self.current_usage_count,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'status': self.status,
            'is_active': self.is_active,
            'first_time_only': self.first_time_only,
            'applicable_services': self.applicable_services,
            'excluded_services': self.excluded_services,
            'min_appointments': self.min_appointments,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class VoucherUsage(db.Model):
    """Registro de uso de vouchers"""
    __tablename__ = 'voucher_usages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Referências
    voucher_id = Column(Integer, ForeignKey('vouchers.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'))
    
    # Dados do uso
    original_amount = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), nullable=False)
    final_amount = Column(Numeric(10, 2), nullable=False)
    
    # Metadados
    used_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))  # Para auditoria
    user_agent = Column(String(500))  # Para auditoria
    
    # Relacionamentos
    voucher = relationship("Voucher", back_populates="voucher_usages")
    user = relationship("User")
    appointment = relationship("Appointment")

    def __repr__(self):
        return f'<VoucherUsage {self.voucher.code} by {self.user.email}>'

    def to_dict(self):
        """Converte o objeto VoucherUsage para dicionário"""
        return {
            'id': self.id,
            'voucher_code': self.voucher.code,
            'user_email': self.user.email,
            'appointment_id': self.appointment_id,
            'original_amount': float(self.original_amount),
            'discount_amount': float(self.discount_amount),
            'final_amount': float(self.final_amount),
            'used_at': self.used_at.isoformat() if self.used_at else None,
        }

class Commission(db.Model):
    """Modelo para comissões de parceiros"""
    __tablename__ = 'commissions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Referências
    partner_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'))
    
    # Período de referência
    reference_month = Column(Integer, nullable=False)
    reference_year = Column(Integer, nullable=False)
    
    # Valores
    gross_amount = Column(Numeric(10, 2), nullable=False)  # Valor bruto dos serviços
    commission_percentage = Column(Numeric(5, 2), nullable=False)  # % da comissão aplicada
    commission_amount = Column(Numeric(10, 2), nullable=False)  # Valor da comissão
    
    # Deduções
    discount_amount = Column(Numeric(10, 2), default=0.00)  # Desconto aplicado
    fee_amount = Column(Numeric(10, 2), default=0.00)  # Taxas de processamento
    tax_amount = Column(Numeric(10, 2), default=0.00)  # Impostos retidos
    
    # Valor final
    net_commission = Column(Numeric(10, 2), nullable=False)  # Comissão líquida
    
    # Status e pagamento
    status = Column(String(20), default='PENDING')  # CommissionStatus enum
    calculated_at = Column(DateTime)
    payment_date = Column(DateTime)
    payment_reference = Column(String(100))  # Referência do pagamento
    
    # Observações
    notes = Column(Text)
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    partner = relationship("Partner", back_populates="commissions")
    appointment = relationship("Appointment")

    def __repr__(self):
        return f'<Commission {self.partner.business_name} {self.reference_month}/{self.reference_year}>'

    def to_dict(self):
        """Converte o objeto Commission para dicionário"""
        return {
            'id': self.id,
            'partner_id': self.partner_id,
            'partner_name': self.partner.business_name if self.partner else None,
            'appointment_id': self.appointment_id,
            'reference_period': f"{self.reference_month:02d}/{self.reference_year}",
            'gross_amount': float(self.gross_amount),
            'commission_percentage': float(self.commission_percentage),
            'commission_amount': float(self.commission_amount),
            'discount_amount': float(self.discount_amount),
            'fee_amount': float(self.fee_amount),
            'tax_amount': float(self.tax_amount),
            'net_commission': float(self.net_commission),
            'status': self.status,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_reference': self.payment_reference,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }