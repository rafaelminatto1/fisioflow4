"""initial auth tables

Revision ID: 001
Revises: 
Create Date: 2025-01-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if tables exist before creating them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create users table only if it doesn't exist
    if 'users' not in existing_tables:
        op.create_table('users',
            sa.Column('id', sa.String(36), nullable=False),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('password_hash', sa.String(255), nullable=False),
            sa.Column('role', sa.Enum('ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE', 'PARCEIRO', name='userrole'), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('last_login', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email')
        )
        op.create_index('ix_users_email', 'users', ['email'])

    # Create user_profiles table only if it doesn't exist
    if 'user_profiles' not in existing_tables:
        op.create_table('user_profiles',
            sa.Column('id', sa.String(36), nullable=False),
            sa.Column('user_id', sa.String(36), nullable=False),
            sa.Column('nome_completo', sa.String(255), nullable=False),
            sa.Column('telefone_encrypted', sa.Text(), nullable=True),
            sa.Column('data_nascimento', sa.Date(), nullable=True),
            sa.Column('cpf_encrypted', sa.Text(), nullable=True),
            sa.Column('endereco', sa.JSON(), nullable=True),
            sa.Column('crefito', sa.String(20), nullable=True),
            sa.Column('especialidades', sa.JSON(), nullable=True),
            sa.Column('consentimento_dados', sa.Boolean(), nullable=False, default=False),
            sa.Column('consentimento_imagem', sa.Boolean(), nullable=False, default=False),
            sa.Column('data_consentimento', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # Create login_history table only if it doesn't exist
    if 'login_history' not in existing_tables:
        op.create_table('login_history',
            sa.Column('id', sa.String(36), nullable=False),
            sa.Column('user_id', sa.String(36), nullable=False),
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('success', sa.Boolean(), nullable=False, default=True),
            sa.Column('failure_reason', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # Create password_reset_tokens table only if it doesn't exist
    if 'password_reset_tokens' not in existing_tables:
        op.create_table('password_reset_tokens',
            sa.Column('id', sa.String(36), nullable=False),
            sa.Column('user_id', sa.String(36), nullable=False),
            sa.Column('token', sa.String(255), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('used', sa.Boolean(), nullable=False, default=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('token')
        )


def downgrade() -> None:
    op.drop_table('password_reset_tokens')
    op.drop_table('login_history')
    op.drop_table('user_profiles')
    op.drop_index('ix_users_email', 'users')
    op.drop_table('users')
    op.execute('DROP TYPE userrole')