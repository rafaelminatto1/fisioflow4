"""
Modelo de Prontuário Médico
"""

from datetime import datetime
import uuid
from app import db
from sqlalchemy.dialects.postgresql import UUID, JSON


class MedicalRecord(db.Model):
    """Modelo do prontuário médico"""
    __tablename__ = 'medical_records'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = db.Column(UUID(as_uuid=True), db.ForeignKey('patients.id'), nullable=False)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    # SOAP Notes
    subjective = db.Column(db.Text)  # Subjetivo - queixa do paciente
    objective = db.Column(db.Text)   # Objetivo - observações clínicas
    assessment = db.Column(db.Text)  # Avaliação - diagnóstico/análise
    plan = db.Column(db.Text)        # Plano - tratamento proposto
    
    # Dados vitais
    vital_signs = db.Column(JSON)  # pressão, frequência cardíaca, etc.
    
    # Avaliação física
    physical_exam = db.Column(JSON)  # exame físico detalhado
    
    # Exames complementares
    lab_results = db.Column(JSON)    # resultados de exames
    imaging = db.Column(JSON)        # imagens/radiografias
    
    # Histórico e evolução
    medical_history = db.Column(JSON)  # histórico médico
    medications = db.Column(JSON)      # medicamentos
    allergies = db.Column(JSON)        # alergias
    
    # Status e controle
    status = db.Column(db.String(20), default='active')  # active, archived, etc.
    is_confidential = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    # Relacionamentos
    patient = db.relationship('Patient', back_populates='medical_records')
    created_by_user = db.relationship('User', backref='created_medical_records')
    
    def __repr__(self):
        return f'<MedicalRecord {self.id} - Patient {self.patient_id}>'
    
    def to_dict(self):
        """Serializa o prontuário para dict"""
        return {
            'id': str(self.id),
            'patient_id': str(self.patient_id),
            'created_by': str(self.created_by),
            'subjective': self.subjective,
            'objective': self.objective,
            'assessment': self.assessment,
            'plan': self.plan,
            'vital_signs': self.vital_signs,
            'physical_exam': self.physical_exam,
            'lab_results': self.lab_results,
            'imaging': self.imaging,
            'medical_history': self.medical_history,
            'medications': self.medications,
            'allergies': self.allergies,
            'status': self.status,
            'is_confidential': self.is_confidential,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }