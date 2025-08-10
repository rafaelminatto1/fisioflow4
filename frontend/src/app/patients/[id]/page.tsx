'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PatientProfile } from '@/components/patients/PatientProfile';

interface PatientProfilePageProps {
  params: {
    id: string;
  };
}

export default function PatientProfilePage({ params }: PatientProfilePageProps) {
  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE']}>
      <PatientProfile patientId={params.id} />
    </PrivateRoute>
  );
}