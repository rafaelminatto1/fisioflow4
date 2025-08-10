'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PatientForm } from '@/components/patients/PatientForm';

export default function NewPatientPage() {
  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO']}>
      <PatientForm mode="create" />
    </PrivateRoute>
  );
}