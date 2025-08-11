"""
Comando para inicializar protocolos base no sistema
"""

import click
from flask.cli import with_appcontext
from flask import current_app
from flask_jwt_extended import get_jwt_identity

from ..models.user import User
from ..data.base_protocols import insert_base_protocols
from ..data.base_interventions import insert_base_interventions
from .. import db


@click.command()
@click.option('--admin-email', default='admin@fisioflow.com', 
              help='Email do usuário admin que criará os protocolos')
@with_appcontext
def init_protocols(admin_email):
    """Inicializa protocolos clínicos base no sistema"""
    
    # Buscar usuário admin
    admin_user = User.query.filter_by(email=admin_email).first()
    if not admin_user:
        click.echo(f'❌ Usuário admin não encontrado: {admin_email}')
        click.echo('💡 Certifique-se de que o usuário admin foi criado primeiro')
        return
    
    if admin_user.role != 'ADMIN':
        click.echo(f'❌ Usuário não é admin: {admin_email}')
        return
    
    click.echo(f'📋 Inicializando protocolos clínicos base...')
    
    try:
        # Inserir protocolos base
        protocols = insert_base_protocols(db, admin_user.id)
        
        click.echo(f'✅ {len(protocols)} protocolos inseridos com sucesso!')
        
        for protocol in protocols:
            click.echo(f'  - {protocol.title} ({protocol.pathology})')
        
        click.echo(f'📋 Inserindo templates de intervenção...')
        
        # Inserir templates de intervenção
        interventions = insert_base_interventions(db, admin_user.id)
        
        click.echo(f'✅ {len(interventions)} templates de intervenção inseridos com sucesso!')
        
        for intervention in interventions:
            click.echo(f'  - {intervention.name} ({intervention.category})')
            
    except Exception as e:
        click.echo(f'❌ Erro ao inserir dados: {str(e)}')
        db.session.rollback()
        raise


def init_app(app):
    """Registra o comando no app Flask"""
    app.cli.add_command(init_protocols)