import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Partner {
  id: number;
  business_name: string;
  trade_name?: string;
  partner_type: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  document_number: string;
  email: string;
  phone?: string;
  commission_percentage: number;
  created_at: string;
}

interface PartnersTableProps {
  searchTerm: string;
}

export function PartnersTable({ searchTerm }: PartnersTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['partners', page, statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { partner_type: typeFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await apiClient.get(`/partnerships/partners?${params}`);
      return response.data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pendente' },
      ACTIVE: { variant: 'success', label: 'Ativo' },
      SUSPENDED: { variant: 'warning', label: 'Suspenso' },
      TERMINATED: { variant: 'destructive', label: 'Encerrado' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPartnerType = (type: string) => {
    const types: Record<string, string> = {
      CLINIC: 'Clínica',
      INSURANCE: 'Seguradora',
      CORPORATE: 'Corporativo',
      ACADEMY: 'Academia',
      INDIVIDUAL: 'Individual',
    };

    return types[type] || type;
  };

  const handleViewPartner = (partnerId: number) => {
    console.log('View partner:', partnerId);
    // Navigate to partner detail page
  };

  const handleEditPartner = (partnerId: number) => {
    console.log('Edit partner:', partnerId);
    // Open edit modal or navigate to edit page
  };

  const handleDeletePartner = (partnerId: number) => {
    console.log('Delete partner:', partnerId);
    // Show confirmation dialog and delete
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const partners = data?.items || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Parceiros ({data?.total || 0})
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')}>
                  Ativos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('PENDING')}>
                  Pendentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('SUSPENDED')}>
                  Suspensos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Tipo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('CLINIC')}>
                  Clínicas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('INSURANCE')}>
                  Seguradoras
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('CORPORATE')}>
                  Corporativo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('ACADEMY')}>
                  Academias
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>

            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Parceiro
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-500">Nenhum parceiro encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner: Partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{partner.business_name}</div>
                        {partner.trade_name && (
                          <div className="text-sm text-gray-500">{partner.trade_name}</div>
                        )}
                        <div className="text-xs text-gray-400">{partner.document_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPartnerType(partner.partner_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(partner.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{partner.email}</div>
                        {partner.phone && (
                          <div className="text-gray-500">{partner.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {partner.commission_percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(partner.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewPartner(partner.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPartner(partner.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeletePartner(partner.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-gray-500">
              Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, data.total)} de {data.total} parceiros
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <div className="text-sm">
                Página {page} de {data.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === data.pages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}