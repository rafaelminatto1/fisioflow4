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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MoreVertical, 
  Eye, 
  DollarSign, 
  Plus,
  Filter,
  Download,
  Search,
  Calculator,
  Check,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Commission {
  id: number;
  partner_name: string;
  appointment_id?: number;
  reference_period: string;
  gross_amount: number;
  commission_percentage: number;
  commission_amount: number;
  discount_amount: number;
  fee_amount: number;
  tax_amount: number;
  net_commission: number;
  status: 'PENDING' | 'CALCULATED' | 'PAID' | 'DISPUTED';
  calculated_at?: string;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
}

interface CommissionsTableProps {
  searchTerm: string;
}

export function CommissionsTable({ searchTerm }: CommissionsTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_reference: '',
    notes: ''
  });
  const [calculateDialog, setCalculateDialog] = useState(false);
  const [calculatePeriod, setCalculatePeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['commissions', page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        // Note: backend search would be by partner name or reference
      });

      const response = await apiClient.get(`/partnerships/commissions?${params}`);
      return response.data;
    }
  });

  const calculateCommissionsMutation = useMutation({
    mutationFn: async (data: { year: number; month: number }) => {
      const response = await apiClient.post('/partnerships/commissions/calculate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setCalculateDialog(false);
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (data: { commissionId: number; payment_reference?: string; notes?: string }) => {
      const response = await apiClient.post(`/partnerships/commissions/${data.commissionId}/pay`, {
        payment_reference: data.payment_reference,
        notes: data.notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setPaymentDialog(false);
      setSelectedCommission(null);
      setPaymentData({ payment_reference: '', notes: '' });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      PENDING: { variant: 'secondary', label: 'Pendente', icon: Clock },
      CALCULATED: { variant: 'default', label: 'Calculada', icon: Calculator },
      PAID: { variant: 'success', label: 'Paga', icon: Check },
      DISPUTED: { variant: 'destructive', label: 'Disputada', icon: AlertCircle },
    };

    const config = variants[status] || { variant: 'secondary', label: status, icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleViewCommission = (commission: Commission) => {
    setSelectedCommission(commission);
    setDetailsOpen(true);
  };

  const handleMarkPaid = (commission: Commission) => {
    setSelectedCommission(commission);
    setPaymentDialog(true);
  };

  const submitPayment = () => {
    if (!selectedCommission) return;
    
    markPaidMutation.mutate({
      commissionId: selectedCommission.id,
      payment_reference: paymentData.payment_reference,
      notes: paymentData.notes
    });
  };

  const submitCalculation = () => {
    calculateCommissionsMutation.mutate(calculatePeriod);
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

  const commissions = data?.items || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Comissões ({data?.total || 0})
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
                    Todas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('PENDING')}>
                    Pendentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('CALCULATED')}>
                    Calculadas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('PAID')}>
                    Pagas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('DISPUTED')}>
                    Disputadas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>

              <Button 
                size="sm" 
                onClick={() => setCalculateDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calcular
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
                  <TableHead>Período</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead>% Comissão</TableHead>
                  <TableHead>Comissão Bruta</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-gray-400" />
                        <p className="text-gray-500">Nenhuma comissão encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission: Commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{commission.partner_name}</div>
                          {commission.appointment_id && (
                            <div className="text-sm text-gray-500">
                              Consulta #{commission.appointment_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm">
                            {commission.reference_period}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          R$ {commission.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {commission.commission_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          R$ {commission.commission_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-bold text-green-600">
                            R$ {commission.net_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {(commission.discount_amount + commission.fee_amount + commission.tax_amount) > 0 && (
                            <div className="text-xs text-gray-500">
                              Deduções: R$ {(commission.discount_amount + commission.fee_amount + commission.tax_amount)
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(commission.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCommission(commission)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {(commission.status === 'CALCULATED' || commission.status === 'PENDING') && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(commission)}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Marcar como Pago
                              </DropdownMenuItem>
                            )}
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
                Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, data.total)} de {data.total} comissões
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

      {/* Commission Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Parceiro</label>
                  <p className="text-lg font-medium mt-1">{selectedCommission.partner_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedCommission.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Período de Referência</label>
                  <p className="font-mono mt-1">{selectedCommission.reference_period}</p>
                </div>
                {selectedCommission.appointment_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Consulta</label>
                    <p className="mt-1">#{selectedCommission.appointment_id}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Cálculo da Comissão</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Valor Bruto:</span>
                    <span className="float-right font-medium">
                      R$ {selectedCommission.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">% Comissão:</span>
                    <span className="float-right font-medium">
                      {selectedCommission.commission_percentage}%
                    </span>
                  </div>
                  <div className="col-span-2 border-t pt-2">
                    <span className="text-gray-600">Comissão Bruta:</span>
                    <span className="float-right font-medium text-blue-600">
                      R$ {selectedCommission.commission_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {selectedCommission.discount_amount > 0 && (
                    <div>
                      <span className="text-gray-600">Descontos:</span>
                      <span className="float-right text-red-600">
                        -R$ {selectedCommission.discount_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {selectedCommission.fee_amount > 0 && (
                    <div>
                      <span className="text-gray-600">Taxas:</span>
                      <span className="float-right text-red-600">
                        -R$ {selectedCommission.fee_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {selectedCommission.tax_amount > 0 && (
                    <div>
                      <span className="text-gray-600">Impostos:</span>
                      <span className="float-right text-red-600">
                        -R$ {selectedCommission.tax_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 border-t pt-2 font-bold">
                    <span className="text-gray-900">Valor Líquido:</span>
                    <span className="float-right text-green-600 text-lg">
                      R$ {selectedCommission.net_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCommission.calculated_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Calculado em</label>
                  <p className="mt-1">
                    {format(parseISO(selectedCommission.calculated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              {selectedCommission.payment_date && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data do Pagamento</label>
                    <p className="mt-1">
                      {format(parseISO(selectedCommission.payment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedCommission.payment_reference && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Referência</label>
                      <p className="mt-1 font-mono">{selectedCommission.payment_reference}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedCommission.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="mt-1 text-gray-700">{selectedCommission.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Comissão como Paga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Referência do Pagamento</label>
              <Input
                placeholder="Ex: TED123456, PIX789, DOC321..."
                value={paymentData.payment_reference}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payment_reference: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                placeholder="Informações adicionais sobre o pagamento..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={submitPayment}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate Commissions Dialog */}
      <Dialog open={calculateDialog} onOpenChange={setCalculateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calcular Comissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Calcular comissões para todas as consultas concluídas no período selecionado.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ano</label>
                <Input
                  type="number"
                  min="2020"
                  max="2030"
                  value={calculatePeriod.year}
                  onChange={(e) => setCalculatePeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mês</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={calculatePeriod.month}
                  onChange={(e) => setCalculatePeriod(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalculateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={submitCalculation}
              disabled={calculateCommissionsMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {calculateCommissionsMutation.isPending ? 'Calculando...' : 'Calcular Comissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}