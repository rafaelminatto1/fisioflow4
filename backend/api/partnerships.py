"""
API endpoints para sistema de parcerias e vouchers
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, or_, desc, func, extract
from sqlalchemy.orm import joinedload

from ..models.partnership import Partner, Voucher, VoucherUsage, Commission, PartnerStatus, VoucherStatus, CommissionStatus
from ..models.user import User
from ..models.appointment import Appointment
from .. import db
from ..utils.decorators import role_required
from ..utils.pagination import paginate
from ..utils.validation import validate_json
from ..utils.encryption import encrypt_data, decrypt_data

partnerships_bp = Blueprint('partnerships', __name__, url_prefix='/api/partnerships')


# =============================================================================
# GESTÃO DE PARCEIROS
# =============================================================================

@partnerships_bp.route('/partners', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def list_partners():
    """Lista parceiros com filtros"""
    
    query = Partner.query
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(Partner.status == status)
    
    partner_type = request.args.get('partner_type')
    if partner_type:
        query = query.filter(Partner.partner_type == partner_type)
    
    search = request.args.get('search')
    if search:
        query = query.filter(or_(
            Partner.business_name.ilike(f'%{search}%'),
            Partner.trade_name.ilike(f'%{search}%'),
            Partner.email.ilike(f'%{search}%')
        ))
    
    # Ordenação
    query = query.order_by(desc(Partner.created_at))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda partner: partner.to_dict()
    )


@partnerships_bp.route('/partners', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def create_partner():
    """Cria novo parceiro"""
    
    data = validate_json(request.json, required_fields=[
        'business_name', 'document_number', 'email', 'partner_type'
    ])
    
    user_id = get_jwt_identity()
    
    # Verificar se já existe parceiro com mesmo documento ou email
    existing_partner = Partner.query.filter(or_(
        Partner.document_number == data['document_number'],
        Partner.email == data['email']
    )).first()
    
    if existing_partner:
        return jsonify({'error': 'Parceiro já existe com esse documento ou email'}), 400
    
    partner = Partner(
        business_name=data['business_name'],
        trade_name=data.get('trade_name'),
        partner_type=data['partner_type'],
        document_number=data['document_number'],
        state_registration=data.get('state_registration'),
        municipal_registration=data.get('municipal_registration'),
        email=data['email'],
        phone=data.get('phone'),
        mobile_phone=data.get('mobile_phone'),
        website=data.get('website'),
        address_street=data.get('address_street'),
        address_number=data.get('address_number'),
        address_complement=data.get('address_complement'),
        address_district=data.get('address_district'),
        address_city=data.get('address_city'),
        address_state=data.get('address_state'),
        address_zipcode=data.get('address_zipcode'),
        commission_percentage=Decimal(str(data.get('commission_percentage', 0))),
        minimum_commission=Decimal(str(data.get('minimum_commission', 0))),
        payment_day=data.get('payment_day', 5),
        default_discount_percentage=Decimal(str(data.get('default_discount_percentage', 0))),
        maximum_discount_percentage=Decimal(str(data.get('maximum_discount_percentage', 0))),
        contract_start_date=datetime.strptime(data['contract_start_date'], '%Y-%m-%d').date() if data.get('contract_start_date') else None,
        contract_end_date=datetime.strptime(data['contract_end_date'], '%Y-%m-%d').date() if data.get('contract_end_date') else None,
        notes=data.get('notes'),
        created_by_id=user_id
    )
    
    # Dados bancários (criptografados)
    banking_data = data.get('banking', {})
    if banking_data:
        partner.bank_name = banking_data.get('bank_name')
        partner.bank_code = banking_data.get('bank_code')
        partner.agency = encrypt_data(banking_data.get('agency', ''))
        partner.account_number = encrypt_data(banking_data.get('account_number', ''))
        partner.account_type = banking_data.get('account_type')
        partner.account_holder_name = banking_data.get('account_holder_name')
        partner.account_holder_document = encrypt_data(banking_data.get('account_holder_document', ''))
    
    db.session.add(partner)
    db.session.commit()
    
    return jsonify({
        'message': 'Parceiro criado com sucesso',
        'partner': partner.to_dict()
    }), 201


@partnerships_bp.route('/partners/<int:partner_id>', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def get_partner(partner_id):
    """Obtém detalhes de um parceiro"""
    
    partner = Partner.query.get_or_404(partner_id)
    
    return jsonify({
        'partner': partner.to_dict(include_sensitive=True)
    })


@partnerships_bp.route('/partners/<int:partner_id>', methods=['PUT'])
@jwt_required()
@role_required(['ADMIN'])
def update_partner(partner_id):
    """Atualiza dados do parceiro"""
    
    partner = Partner.query.get_or_404(partner_id)
    data = request.json
    
    # Atualizar campos básicos
    if 'business_name' in data:
        partner.business_name = data['business_name']
    if 'trade_name' in data:
        partner.trade_name = data['trade_name']
    if 'status' in data:
        partner.status = data['status']
    if 'email' in data:
        partner.email = data['email']
    if 'phone' in data:
        partner.phone = data['phone']
    if 'mobile_phone' in data:
        partner.mobile_phone = data['mobile_phone']
    if 'commission_percentage' in data:
        partner.commission_percentage = Decimal(str(data['commission_percentage']))
    if 'notes' in data:
        partner.notes = data['notes']
    
    # Atualizar dados bancários se fornecidos
    banking_data = data.get('banking')
    if banking_data:
        partner.bank_name = banking_data.get('bank_name', partner.bank_name)
        partner.bank_code = banking_data.get('bank_code', partner.bank_code)
        if 'agency' in banking_data:
            partner.agency = encrypt_data(banking_data['agency'])
        if 'account_number' in banking_data:
            partner.account_number = encrypt_data(banking_data['account_number'])
    
    partner.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Parceiro atualizado com sucesso',
        'partner': partner.to_dict()
    })


# =============================================================================
# GESTÃO DE VOUCHERS
# =============================================================================

@partnerships_bp.route('/vouchers', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def list_vouchers():
    """Lista vouchers com filtros"""
    
    query = Voucher.query.options(joinedload(Voucher.partner))
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(Voucher.status == status)
    
    partner_id = request.args.get('partner_id')
    if partner_id:
        query = query.filter(Voucher.partner_id == partner_id)
    
    search = request.args.get('search')
    if search:
        query = query.filter(or_(
            Voucher.code.ilike(f'%{search}%'),
            Voucher.name.ilike(f'%{search}%')
        ))
    
    # Ordenação
    query = query.order_by(desc(Voucher.created_at))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda voucher: voucher.to_dict()
    )


@partnerships_bp.route('/vouchers', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def create_voucher():
    """Cria novo voucher"""
    
    data = validate_json(request.json, required_fields=[
        'code', 'name', 'partner_id', 'discount_type', 'discount_value',
        'valid_from', 'valid_until'
    ])
    
    user_id = get_jwt_identity()
    
    # Verificar se já existe voucher com mesmo código
    existing_voucher = Voucher.query.filter(Voucher.code == data['code']).first()
    if existing_voucher:
        return jsonify({'error': 'Já existe voucher com esse código'}), 400
    
    # Verificar se o parceiro existe
    partner = Partner.query.get(data['partner_id'])
    if not partner:
        return jsonify({'error': 'Parceiro não encontrado'}), 404
    
    voucher = Voucher(
        code=data['code'].upper(),
        name=data['name'],
        description=data.get('description'),
        partner_id=data['partner_id'],
        discount_type=data['discount_type'],
        discount_value=Decimal(str(data['discount_value'])),
        minimum_amount=Decimal(str(data.get('minimum_amount', 0))),
        maximum_discount=Decimal(str(data['maximum_discount'])) if data.get('maximum_discount') else None,
        usage_limit=data.get('usage_limit'),
        usage_limit_per_user=data.get('usage_limit_per_user'),
        valid_from=datetime.strptime(data['valid_from'], '%Y-%m-%d %H:%M:%S'),
        valid_until=datetime.strptime(data['valid_until'], '%Y-%m-%d %H:%M:%S'),
        first_time_only=data.get('first_time_only', False),
        applicable_services=data.get('applicable_services'),
        excluded_services=data.get('excluded_services'),
        min_appointments=data.get('min_appointments', 1),
        created_by_id=user_id
    )
    
    db.session.add(voucher)
    db.session.commit()
    
    return jsonify({
        'message': 'Voucher criado com sucesso',
        'voucher': voucher.to_dict()
    }), 201


@partnerships_bp.route('/vouchers/<int:voucher_id>', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def get_voucher(voucher_id):
    """Obtém detalhes de um voucher"""
    
    voucher = Voucher.query.options(joinedload(Voucher.partner)).get_or_404(voucher_id)
    
    return jsonify({
        'voucher': voucher.to_dict()
    })


@partnerships_bp.route('/vouchers/validate/<string:code>', methods=['POST'])
@jwt_required()
def validate_voucher(code):
    """Valida um voucher para uso"""
    
    data = request.json or {}
    user_id = get_jwt_identity()
    total_amount = Decimal(str(data.get('total_amount', 0)))
    
    voucher = Voucher.query.filter(Voucher.code == code.upper()).first()
    if not voucher:
        return jsonify({'error': 'Voucher não encontrado'}), 404
    
    # Validar voucher
    is_valid, message = voucher.is_valid(user_id=user_id, total_amount=total_amount)
    
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Calcular desconto
    discount_amount = voucher.calculate_discount(total_amount)
    final_amount = total_amount - Decimal(str(discount_amount))
    
    return jsonify({
        'valid': True,
        'voucher': voucher.to_dict(),
        'discount_amount': float(discount_amount),
        'final_amount': float(final_amount),
        'original_amount': float(total_amount)
    })


@partnerships_bp.route('/vouchers/<int:voucher_id>/use', methods=['POST'])
@jwt_required()
def use_voucher(voucher_id):
    """Registra uso de voucher"""
    
    data = validate_json(request.json, required_fields=['original_amount'])
    user_id = get_jwt_identity()
    
    voucher = Voucher.query.get_or_404(voucher_id)
    original_amount = Decimal(str(data['original_amount']))
    
    # Validar voucher novamente
    is_valid, message = voucher.is_valid(user_id=user_id, total_amount=original_amount)
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Calcular desconto
    discount_amount = voucher.calculate_discount(original_amount)
    final_amount = original_amount - Decimal(str(discount_amount))
    
    # Registrar uso
    usage = VoucherUsage(
        voucher_id=voucher.id,
        user_id=user_id,
        appointment_id=data.get('appointment_id'),
        original_amount=original_amount,
        discount_amount=Decimal(str(discount_amount)),
        final_amount=final_amount,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent', '')[:500]
    )
    
    # Atualizar contador de uso do voucher
    voucher.current_usage_count += 1
    
    # Verificar se voucher deve ser marcado como esgotado
    if voucher.usage_limit and voucher.current_usage_count >= voucher.usage_limit:
        voucher.status = 'USED'
    
    db.session.add(usage)
    db.session.commit()
    
    return jsonify({
        'message': 'Voucher aplicado com sucesso',
        'usage': usage.to_dict(),
        'discount_amount': float(discount_amount),
        'final_amount': float(final_amount)
    })


# =============================================================================
# GESTÃO DE COMISSÕES
# =============================================================================

@partnerships_bp.route('/commissions', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def list_commissions():
    """Lista comissões com filtros"""
    
    query = Commission.query.options(joinedload(Commission.partner))
    
    # Filtros
    status = request.args.get('status')
    if status:
        query = query.filter(Commission.status == status)
    
    partner_id = request.args.get('partner_id')
    if partner_id:
        query = query.filter(Commission.partner_id == partner_id)
    
    year = request.args.get('year')
    if year:
        query = query.filter(Commission.reference_year == int(year))
    
    month = request.args.get('month')
    if month:
        query = query.filter(Commission.reference_month == int(month))
    
    # Ordenação
    query = query.order_by(desc(Commission.reference_year), desc(Commission.reference_month))
    
    return paginate(
        query=query,
        per_page=int(request.args.get('per_page', 20)),
        page=int(request.args.get('page', 1)),
        serialize_fn=lambda commission: commission.to_dict()
    )


@partnerships_bp.route('/commissions/calculate', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def calculate_commissions():
    """Calcula comissões para um período"""
    
    data = validate_json(request.json, required_fields=['year', 'month'])
    year = data['year']
    month = data['month']
    
    # Buscar appointments com parceiros no período
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    appointments = Appointment.query.filter(
        Appointment.appointment_date.between(start_date, end_date),
        Appointment.partner_id.isnot(None),
        Appointment.status == 'CONCLUIDO'
    ).options(joinedload(Appointment.partner)).all()
    
    commissions_created = 0
    
    for appointment in appointments:
        # Verificar se já existe comissão para esta appointment
        existing_commission = Commission.query.filter_by(
            appointment_id=appointment.id
        ).first()
        
        if existing_commission:
            continue
        
        partner = appointment.partner
        if not partner:
            continue
        
        # Calcular valores
        gross_amount = Decimal(str(appointment.price or 0))
        commission_percentage = partner.commission_percentage or Decimal('0')
        commission_amount = gross_amount * (commission_percentage / 100)
        
        # Aplicar comissão mínima se definida
        if partner.minimum_commission and commission_amount < partner.minimum_commission:
            commission_amount = partner.minimum_commission
        
        # Calcular deduções (implementar lógica específica se necessário)
        discount_amount = Decimal('0')  # Valor de desconto aplicado
        fee_amount = Decimal('0')  # Taxa de processamento
        tax_amount = Decimal('0')  # Impostos
        
        net_commission = commission_amount - discount_amount - fee_amount - tax_amount
        
        # Criar comissão
        commission = Commission(
            partner_id=partner.id,
            appointment_id=appointment.id,
            reference_month=month,
            reference_year=year,
            gross_amount=gross_amount,
            commission_percentage=commission_percentage,
            commission_amount=commission_amount,
            discount_amount=discount_amount,
            fee_amount=fee_amount,
            tax_amount=tax_amount,
            net_commission=net_commission,
            status='CALCULATED',
            calculated_at=datetime.utcnow()
        )
        
        db.session.add(commission)
        commissions_created += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'Comissões calculadas com sucesso',
        'period': f"{month:02d}/{year}",
        'commissions_created': commissions_created
    })


@partnerships_bp.route('/commissions/<int:commission_id>/pay', methods=['POST'])
@jwt_required()
@role_required(['ADMIN'])
def mark_commission_paid(commission_id):
    """Marca comissão como paga"""
    
    data = request.json or {}
    commission = Commission.query.get_or_404(commission_id)
    
    commission.status = 'PAID'
    commission.payment_date = datetime.utcnow()
    commission.payment_reference = data.get('payment_reference')
    commission.updated_at = datetime.utcnow()
    
    if data.get('notes'):
        commission.notes = data['notes']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Comissão marcada como paga',
        'commission': commission.to_dict()
    })


# =============================================================================
# DASHBOARDS E RELATÓRIOS
# =============================================================================

@partnerships_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def partnership_dashboard():
    """Dashboard do sistema de parcerias"""
    
    # Estatísticas gerais
    total_partners = Partner.query.count()
    active_partners = Partner.query.filter(Partner.status == 'ACTIVE').count()
    total_vouchers = Voucher.query.count()
    active_vouchers = Voucher.query.filter(Voucher.status == 'ACTIVE').count()
    
    # Comissões pendentes
    pending_commissions = Commission.query.filter(
        Commission.status.in_(['PENDING', 'CALCULATED'])
    ).count()
    
    pending_commission_amount = db.session.query(
        func.sum(Commission.net_commission)
    ).filter(
        Commission.status.in_(['PENDING', 'CALCULATED'])
    ).scalar() or 0
    
    # Uso de vouchers no último mês
    last_month = datetime.utcnow().replace(day=1) - timedelta(days=1)
    voucher_usage_last_month = VoucherUsage.query.filter(
        VoucherUsage.used_at >= last_month.replace(day=1)
    ).count()
    
    total_discount_last_month = db.session.query(
        func.sum(VoucherUsage.discount_amount)
    ).filter(
        VoucherUsage.used_at >= last_month.replace(day=1)
    ).scalar() or 0
    
    # Top parceiros por comissão
    top_partners = db.session.query(
        Partner.business_name,
        func.sum(Commission.net_commission).label('total_commission')
    ).join(Commission).group_by(Partner.id).order_by(
        desc('total_commission')
    ).limit(5).all()
    
    return jsonify({
        'overview': {
            'total_partners': total_partners,
            'active_partners': active_partners,
            'total_vouchers': total_vouchers,
            'active_vouchers': active_vouchers,
            'pending_commissions_count': pending_commissions,
            'pending_commission_amount': float(pending_commission_amount),
            'voucher_usage_last_month': voucher_usage_last_month,
            'total_discount_last_month': float(total_discount_last_month)
        },
        'top_partners': [
            {
                'name': partner.business_name,
                'total_commission': float(partner.total_commission)
            }
            for partner in top_partners
        ]
    })


@partnerships_bp.route('/partners/<int:partner_id>/dashboard', methods=['GET'])
@jwt_required()
@role_required(['ADMIN'])
def partner_dashboard(partner_id):
    """Dashboard específico de um parceiro"""
    
    partner = Partner.query.get_or_404(partner_id)
    
    # Período de análise (últimos 12 meses)
    end_date = date.today()
    start_date = end_date.replace(year=end_date.year - 1)
    
    # Estatísticas de appointments
    total_appointments = Appointment.query.filter(
        Appointment.partner_id == partner_id,
        Appointment.appointment_date.between(start_date, end_date)
    ).count()
    
    # Comissões do parceiro
    total_commissions = db.session.query(
        func.sum(Commission.net_commission)
    ).filter(
        Commission.partner_id == partner_id
    ).scalar() or 0
    
    pending_commissions = db.session.query(
        func.sum(Commission.net_commission)
    ).filter(
        Commission.partner_id == partner_id,
        Commission.status.in_(['PENDING', 'CALCULATED'])
    ).scalar() or 0
    
    # Vouchers ativos do parceiro
    active_vouchers = Voucher.query.filter(
        Voucher.partner_id == partner_id,
        Voucher.status == 'ACTIVE'
    ).count()
    
    total_voucher_usage = VoucherUsage.query.join(Voucher).filter(
        Voucher.partner_id == partner_id
    ).count()
    
    return jsonify({
        'partner': partner.to_dict(),
        'stats': {
            'total_appointments_12m': total_appointments,
            'total_commissions': float(total_commissions),
            'pending_commissions': float(pending_commissions),
            'active_vouchers': active_vouchers,
            'total_voucher_usage': total_voucher_usage
        }
    })


# Registrar blueprint
def init_app(app):
    """Registra o blueprint no app Flask"""
    app.register_blueprint(partnerships_bp)