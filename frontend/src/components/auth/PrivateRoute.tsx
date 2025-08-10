'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  roles = [],
  redirectTo = '/auth/login',
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (!isLoading && isAuthenticated && roles.length > 0) {
      if (!user || !roles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, roles, router, redirectTo]);

  // Mostra loading enquanto carrega auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não renderiza nada se não autenticado (redirecionamento está acontecendo)
  if (!isAuthenticated) {
    return null;
  }

  // Verifica permissões por role
  if (roles.length > 0 && (!user || !roles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
};

// Hook para usar roles específicos
export const useRequireAuth = (roles?: string[]) => {
  const { user, isAuthenticated } = useAuth();
  
  const hasPermission = () => {
    if (!isAuthenticated || !user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.role);
  };

  return {
    user,
    isAuthenticated,
    hasPermission: hasPermission(),
  };
};