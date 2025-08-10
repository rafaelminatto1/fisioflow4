'use client';

import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { SOAPForm } from '@/components/medical/SOAPForm';
import { useRouter } from 'next/navigation';

interface NewMedicalRecordPageProps {
  params: {
    id: string;
  };
}

export default function NewMedicalRecordPage({ params }: NewMedicalRecordPageProps) {
  const router = useRouter();

  const handleSave = () => {
    router.push(`/patients/${params.id}?tab=medical`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PrivateRoute roles={['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO']}>
      <div className="container mx-auto p-6">
        <SOAPForm
          medicalRecordId={params.id}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </PrivateRoute>
  );
}