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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Filter,
  Download,
  Search,
  Copy,
  Calendar,
  Percent,
  DollarSign
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Voucher {
  id: number;
  code: string;
  name: string;
  description?: string;
  partner_name: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  minimum_amount: number;
  maximum_discount?: number;
  usage_limit?: number;
  current_usage_count: number;
  valid_from: string;
  valid_until: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  created_at: string;
}

interface VouchersTableProps {
  searchTerm: string;
}

export function VouchersTable({ searchTerm }: VouchersTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['vouchers', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await apiClient.get(`/partnerships/vouchers?${params}`);
      return response.data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'success', label: 'Ativo' },
      USED: { variant: 'secondary', label: 'Usado' },
      EXPIRED: { variant: 'destructive', label: 'Expirado' },
      CANCELLED: { variant: 'outline', label: 'Cancelado' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDiscountValue = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}%`;
    }
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // Show toast notification
  };

  const handleViewVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setDetailsOpen(true);
  };

  const handleEditVoucher = (voucherId: number) => {
    console.log('Edit voucher:', voucherId);
    // Open edit modal or navigate to edit page
  };

  const handleDeleteVoucher = (voucherId: number) => {
    console.log('Delete voucher:', voucherId);
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

  const vouchers = data?.items || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Vouchers ({data?.total || 0})
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
                  <DropdownMenuItem onClick={() => setStatusFilter('USED')}>
                    Usados
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('EXPIRED')}>
                    Expirados
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('CANCELLED')}>
                    Cancelados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>

              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Voucher
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-400" />
                        <p className="text-gray-500">Nenhum voucher encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((voucher: Voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {voucher.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyVoucherCode(voucher.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{voucher.name}</div>
                          {voucher.description && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                              {voucher.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{voucher.partner_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {voucher.discount_type === 'PERCENTAGE' ? (
                            <Percent className="h-4 w-4 text-green-600" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium">
                            {formatDiscountValue(voucher.discount_type, voucher.discount_value)}
                          </span>
                        </div>
                        {voucher.minimum_amount > 0 && (
                          <div className="text-xs text-gray-500">
                            Mín: R$ {voucher.minimum_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {voucher.current_usage_count}
                            {voucher.usage_limit && ` / ${voucher.usage_limit}`}
                          </div>
                          {voucher.usage_limit && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((voucher.current_usage_count / voucher.usage_limit) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(voucher.valid_from), 'dd/MM/yy', { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(voucher.valid_until), 'dd/MM/yy', { locale: ptBR })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(voucher.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewVoucher(voucher)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditVoucher(voucher.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyVoucherCode(voucher.code)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Código
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVoucher(voucher.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancelar
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
                Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, data.total)} de {data.total} vouchers
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

      {/* Voucher Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Voucher</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Código</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-3 py-2 rounded font-mono text-lg">
                      {selectedVoucher.code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyVoucherCode(selectedVoucher.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedVoucher.status)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="text-lg font-medium mt-1">{selectedVoucher.name}</p>
                {selectedVoucher.description && (
                  <p className="text-gray-600 mt-1">{selectedVoucher.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Parceiro</label>
                  <p className="mt-1">{selectedVoucher.partner_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Desconto</label>
                  <p className="mt-1">
                    {selectedVoucher.discount_type === 'PERCENTAGE' ? 'Percentual' : 'Valor Fixo'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Desconto</label>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    {formatDiscountValue(selectedVoucher.discount_type, selectedVoucher.discount_value)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor Mínimo</label>
                  <p className="mt-1">
                    R$ {selectedVoucher.minimum_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {selectedVoucher.maximum_discount && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Desconto Máximo</label>
                    <p className="mt-1">
                      R$ {selectedVoucher.maximum_discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Válido de</label>
                  <p className="mt-1">
                    {format(parseISO(selectedVoucher.valid_from), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Válido até</label>
                  <p className="mt-1">
                    {format(parseISO(selectedVoucher.valid_until), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Uso</label>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Usos: {selectedVoucher.current_usage_count}</span>
                    {selectedVoucher.usage_limit && (
                      <span>Limite: {selectedVoucher.usage_limit}</span>
                    )}
                  </div>
                  {selectedVoucher.usage_limit && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((selectedVoucher.current_usage_count / selectedVoucher.usage_limit) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}