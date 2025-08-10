"""patient tables

Revision ID: 002
Revises: 001
Create Date: 2025-01-10 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE bloodtype AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'DESCONHECIDO')")
    op.execute("CREATE TYPE maritalstatus AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'OUTRO')")
    op.execute("CREATE TYPE gender AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO')")
    op.execute("CREATE TYPE educationlevel AS ENUM ('FUNDAMENTAL', 'MEDIO', 'TECNICO', 'SUPERIOR', 'POS_GRADUACAO', 'OUTRO')")
    op.execute("CREATE TYPE emergencycontacttype AS ENUM ('FAMILIAR', 'AMIGO', 'COLEGA', 'CUIDADOR', 'OUTRO')")

    # Create patients table
    op.create_table('patients',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('nome_completo', sa.String(255), nullable=False),
        sa.Column('nome_social', sa.String(255), nullable=True),
        sa.Column('cpf_encrypted', sa.Text(), nullable=True),
        sa.Column('rg_encrypted', sa.Text(), nullable=True),
        sa.Column('data_nascimento', sa.Date(), nullable=True),
        sa.Column('genero', sa.Enum('MASCULINO', 'FEMININO', 'OUTRO', 'NAO_INFORMADO', name='gender'), nullable=True),
        sa.Column('tipo_sanguineo', sa.Enum('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'DESCONHECIDO', name='bloodtype'), nullable=True),
        sa.Column('estado_civil', sa.Enum('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'OUTRO', name='maritalstatus'), nullable=True),
        sa.Column('escolaridade', sa.Enum('FUNDAMENTAL', 'MEDIO', 'TECNICO', 'SUPERIOR', 'POS_GRADUACAO', 'OUTRO', name='educationlevel'), nullable=True),
        sa.Column('profissao', sa.String(255), nullable=True),
        sa.Column('telefone_encrypted', sa.Text(), nullable=True),
        sa.Column('telefone_alternativo_encrypted', sa.Text(), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('endereco', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('consentimento_dados', sa.Boolean(), nullable=False, default=False),
        sa.Column('consentimento_imagem', sa.Boolean(), nullable=False, default=False),
        sa.Column('data_consentimento', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_patients_nome_completo', 'patients', ['nome_completo'])
    op.create_index('ix_patients_email', 'patients', ['email'])
    op.create_index('ix_patients_is_active', 'patients', ['is_active'])

    # Create emergency_contacts table
    op.create_table('emergency_contacts',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('patient_id', sa.String(36), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('tipo_contato', sa.Enum('FAMILIAR', 'AMIGO', 'COLEGA', 'CUIDADOR', 'OUTRO', name='emergencycontacttype'), nullable=False),
        sa.Column('parentesco', sa.String(100), nullable=True),
        sa.Column('telefone_encrypted', sa.Text(), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('endereco', sa.JSON(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create medical_records table
    op.create_table('medical_records',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('patient_id', sa.String(36), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('queixa_principal', sa.Text(), nullable=True),
        sa.Column('historia_doenca_atual', sa.Text(), nullable=True),
        sa.Column('historia_patologica_pregressa', sa.Text(), nullable=True),
        sa.Column('historia_familiar', sa.Text(), nullable=True),
        sa.Column('medicamentos_uso', sa.Text(), nullable=True),
        sa.Column('alergias', sa.Text(), nullable=True),
        sa.Column('inspecao', sa.Text(), nullable=True),
        sa.Column('palpacao', sa.Text(), nullable=True),
        sa.Column('amplitude_movimento', sa.JSON(), nullable=True),
        sa.Column('forca_muscular', sa.JSON(), nullable=True),
        sa.Column('testes_especiais', sa.JSON(), nullable=True),
        sa.Column('escalas_funcionais', sa.JSON(), nullable=True),
        sa.Column('objetivos_tratamento', sa.Text(), nullable=True),
        sa.Column('diagnostico_fisioterapeutico', sa.Text(), nullable=True),
        sa.Column('cid10', sa.String(10), nullable=True),
        sa.Column('plano_tratamento', sa.Text(), nullable=True),
        sa.Column('prognostico', sa.Text(), nullable=True),
        sa.Column('data_avaliacao', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_medical_records_data_avaliacao', 'medical_records', ['data_avaliacao'])
    op.create_index('ix_medical_records_cid10', 'medical_records', ['cid10'])

    # Create evolutions table
    op.create_table('evolutions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('medical_record_id', sa.String(36), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('subjetivo', sa.Text(), nullable=True),
        sa.Column('objetivo', sa.Text(), nullable=True),
        sa.Column('avaliacao', sa.Text(), nullable=True),
        sa.Column('plano', sa.Text(), nullable=True),
        sa.Column('data_atendimento', sa.Date(), nullable=False),
        sa.Column('duracao_minutos', sa.Integer(), nullable=True),
        sa.Column('tecnicas_utilizadas', sa.JSON(), nullable=True),
        sa.Column('exercicios_realizados', sa.JSON(), nullable=True),
        sa.Column('escala_dor', sa.Integer(), nullable=True),
        sa.Column('observacoes_clinicas', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['medical_record_id'], ['medical_records.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_evolutions_data_atendimento', 'evolutions', ['data_atendimento'])


def downgrade() -> None:
    op.drop_index('ix_evolutions_data_atendimento', 'evolutions')
    op.drop_table('evolutions')
    
    op.drop_index('ix_medical_records_cid10', 'medical_records')
    op.drop_index('ix_medical_records_data_avaliacao', 'medical_records')
    op.drop_table('medical_records')
    
    op.drop_table('emergency_contacts')
    
    op.drop_index('ix_patients_is_active', 'patients')
    op.drop_index('ix_patients_email', 'patients')
    op.drop_index('ix_patients_nome_completo', 'patients')
    op.drop_table('patients')
    
    op.execute('DROP TYPE emergencycontacttype')
    op.execute('DROP TYPE educationlevel')
    op.execute('DROP TYPE gender')
    op.execute('DROP TYPE maritalstatus')
    op.execute('DROP TYPE bloodtype')