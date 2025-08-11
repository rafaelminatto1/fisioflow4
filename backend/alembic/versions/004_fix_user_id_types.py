"""Fix user ID types - migrate from INTEGER to VARCHAR(36)

Revision ID: 004
Revises: 003
Create Date: 2025-01-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Fix user ID type mismatch by dropping and recreating tables with correct types.
    This handles cases where users table was created with INTEGER id instead of VARCHAR(36).
    """
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Check if users table exists and get its column info
    if 'users' in existing_tables:
        columns = inspector.get_columns('users')
        id_column = next((col for col in columns if col['name'] == 'id'), None)
        
        if id_column and str(id_column['type']).lower().startswith('integer'):
            print("Found users table with INTEGER id, migrating to VARCHAR(36)...")
            
            # Drop dependent tables first (in reverse dependency order)
            dependent_tables = ['password_reset_tokens', 'login_history', 'user_profiles', 'patients']
            for table in dependent_tables:
                if table in existing_tables:
                    op.drop_table(table)
            
            # Drop and recreate users table with correct type
            op.drop_table('users')
            op.execute('DROP TYPE IF EXISTS userrole CASCADE')
            
            # Recreate enum type
            op.execute("CREATE TYPE userrole AS ENUM ('ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE', 'PARCEIRO')")
            
            # Recreate users table with VARCHAR(36) id
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
            
            # Recreate user_profiles table
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
            
            # Recreate login_history table
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
            
            # Recreate password_reset_tokens table
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
            
            print("Migration completed successfully!")
        else:
            print("Users table already has correct VARCHAR(36) id type, skipping migration.")
    else:
        print("Users table doesn't exist, will be created by migration 001.")


def downgrade() -> None:
    """
    Downgrade is not supported for this migration as it would involve
    converting VARCHAR(36) UUIDs back to INTEGER which could cause data loss.
    """
    raise NotImplementedError("Downgrade not supported for user ID type migration")
