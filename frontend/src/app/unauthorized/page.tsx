'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Negado</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
          
          {user && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Usuário atual: <strong>{user.email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Nível de acesso: <strong>{user.role}</strong>
              </p>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Link href="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
            
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                Fazer Login com Outra Conta
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}