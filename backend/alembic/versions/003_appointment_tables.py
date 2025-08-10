"""appointment tables

Revision ID: 003
Revises: 002
Create Date: 2025-01-10 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE appointmentstatus AS ENUM ('AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU', 'REAGENDADO')")
    op.execute("CREATE TYPE appointmenttype AS ENUM ('AVALIACAO', 'TRATAMENTO', 'RETORNO', 'GRUPO', 'DOMICILIAR', 'TELEMEDICINA')")
    op.execute("CREATE TYPE recurrencetype AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL')")
    op.execute("CREATE TYPE remindertype AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH')")

    # Create appointments table
    op.create_table('appointments',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('patient_id', sa.String(36), nullable=False),
        sa.Column('therapist_id', sa.String(36), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('appointment_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, default=50),
        sa.Column('appointment_type', sa.Enum('AVALIACAO', 'TRATAMENTO', 'RETORNO', 'GRUPO', 'DOMICILIAR', 'TELEMEDICINA', name='appointmenttype'), nullable=False, default='TRATAMENTO'),
        sa.Column('status', sa.Enum('AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU', 'REAGENDADO', name='appointmentstatus'), nullable=False, default='AGENDADO'),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('room', sa.String(50), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, default=False),
        sa.Column('recurrence_pattern', sa.JSON(), nullable=True),
        sa.Column('parent_appointment_id', sa.String(36), nullable=True),
        sa.Column('confirmation_required', sa.Boolean(), nullable=False, default=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('reminder_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('cancellation_reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['therapist_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['parent_appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_appointments_date', 'appointments', ['appointment_date'])
    op.create_index('ix_appointments_therapist_date', 'appointments', ['therapist_id', 'appointment_date'])
    op.create_index('ix_appointments_patient', 'appointments', ['patient_id'])
    op.create_index('ix_appointments_status', 'appointments', ['status'])

    # Create appointment_reminders table
    op.create_table('appointment_reminders',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('appointment_id', sa.String(36), nullable=False),
        sa.Column('reminder_type', sa.Enum('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', name='remindertype'), nullable=False),
        sa.Column('minutes_before', sa.Integer(), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_reminders_scheduled', 'appointment_reminders', ['scheduled_for'])
    op.create_index('ix_reminders_pending', 'appointment_reminders', ['sent_at', 'failed_at'])

    # Create schedule_templates table
    op.create_table('schedule_templates',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('therapist_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(5), nullable=False),
        sa.Column('end_time', sa.String(5), nullable=False),
        sa.Column('slot_duration', sa.Integer(), nullable=False, default=50),
        sa.Column('break_duration', sa.Integer(), nullable=False, default=10),
        sa.Column('max_patients_per_slot', sa.Integer(), nullable=False, default=1),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['therapist_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_templates_therapist', 'schedule_templates', ['therapist_id'])
    op.create_index('ix_templates_day', 'schedule_templates', ['day_of_week'])


def downgrade() -> None:
    op.drop_index('ix_templates_day', 'schedule_templates')
    op.drop_index('ix_templates_therapist', 'schedule_templates')
    op.drop_table('schedule_templates')
    
    op.drop_index('ix_reminders_pending', 'appointment_reminders')
    op.drop_index('ix_reminders_scheduled', 'appointment_reminders')
    op.drop_table('appointment_reminders')
    
    op.drop_index('ix_appointments_status', 'appointments')
    op.drop_index('ix_appointments_patient', 'appointments')
    op.drop_index('ix_appointments_therapist_date', 'appointments')
    op.drop_index('ix_appointments_date', 'appointments')
    op.drop_table('appointments')
    
    op.execute('DROP TYPE remindertype')
    op.execute('DROP TYPE recurrencetype')
    op.execute('DROP TYPE appointmenttype')
    op.execute('DROP TYPE appointmentstatus')