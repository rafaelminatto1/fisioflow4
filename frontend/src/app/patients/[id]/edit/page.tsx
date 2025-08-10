'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PatientForm } from '@/components/patients/PatientForm';

interface EditPatientPageProps {
  params: {
    id: string;
  };
}

export default function EditPatientPage({ params }: EditPatientPageProps) {
  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO']}>
      <PatientForm mode="edit" patientId={params.id} />
    </PrivateRoute>
  );
}