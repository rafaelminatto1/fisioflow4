'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { PatientList } from '@/components/patients/PatientList';

export default function PatientsPage() {
  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO']}>
      <PatientList />
    </PrivateRoute>
  );
}