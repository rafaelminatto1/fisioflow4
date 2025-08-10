'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { SOAPForm } from '@/components/medical/SOAPForm';

interface MedicalRecordPageProps {
  params: {
    id: string;
  };
}

export default function MedicalRecordPage({ params }: MedicalRecordPageProps) {
  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE']}>
      <div className="container mx-auto p-6">
        <SOAPForm
          medicalRecordId=""
          evolutionId={params.id}
          readonly={true}
        />
      </div>
    </PrivateRoute>
  );
}