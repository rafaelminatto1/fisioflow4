import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface TopPartner {
  name: string;
  total_commission: number;
}

interface DashboardData {
  overview: {
    total_partners: number;
    active_partners: number;
    total_vouchers: number;
    active_vouchers: number;
    pending_commissions_count: number;
    pending_commission_amount: number;
    voucher_usage_last_month: number;
    total_discount_last_month: number;
  };
  top_partners: TopPartner[];
}

export function PartnershipDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['partnership-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/partnerships/dashboard');
      return response.data as DashboardData;
    }
  });

  // Mock data for charts
  const monthlyCommissions = [
    { month: 'Jan', value: 12400 },
    { month: 'Fev', value: 15600 },
    { month: 'Mar', value: 18900 },
    { month: 'Abr', value: 16200 },
    { month: 'Mai', value: 21300 },
    { month: 'Jun', value: 19800 },
  ];

  const voucherUsage = [
    { month: 'Jan', used: 45, created: 12 },
    { month: 'Fev', used: 62, created: 18 },
    { month: 'Mar', used: 78, created: 15 },
    { month: 'Abr', used: 55, created: 22 },
    { month: 'Mai', used: 89, created: 25 },
    { month: 'Jun', used: 72, created: 20 },
  ];

  const partnerTypes = [
    { name: 'Clínicas', value: 12, color: '#3b82f6' },
    { name: 'Seguradoras', value: 8, color: '#ef4444' },
    { name: 'Corporativo', value: 15, color: '#10b981' },
    { name: 'Academia', value: 6, color: '#f59e0b' },
    { name: 'Individual', value: 4, color: '#8b5cf6' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const overview = data?.overview;
  const topPartners = data?.top_partners || [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold">R$ 45.231</p>
                <div className="flex items-center text-green-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Parceiros Ativos</p>
                <p className="text-2xl font-bold">{overview?.active_partners || 0}</p>
                <div className="flex items-center text-blue-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span>+8.1%</span>
                </div>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vouchers Usados</p>
                <p className="text-2xl font-bold">{overview?.voucher_usage_last_month || 0}</p>
                <div className="flex items-center text-orange-600 text-sm">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  <span>-3.2%</span>
                </div>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa Conversão</p>
                <p className="text-2xl font-bold">18.5%</p>
                <div className="flex items-center text-purple-600 text-sm">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span>+5.4%</span>
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Commissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Comissões Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyCommissions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString()}`} />
                <Tooltip 
                  formatter={(value) => [`R$ ${Number(value).toLocaleString()}`, 'Comissão']}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Voucher Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Uso de Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={voucherUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="used" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Usados"
                />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name="Criados"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Parceiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPartners.map((partner, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">{partner.name}</span>
                  </div>
                  <Badge variant="outline">
                    R$ {partner.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              ))}
              {topPartners.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Partner Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tipos de Parceiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={partnerTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                >
                  {partnerTypes.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {partnerTypes.map((type, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: type.color }}
                  />
                  <span>{type.name}: {type.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo parceiro cadastrado</p>
                  <p className="text-xs text-gray-500">Clínica São Paulo - há 2 horas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Voucher utilizado</p>
                  <p className="text-xs text-gray-500">DESCONTO20 - R$ 150,00 - há 4 horas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Comissão processada</p>
                  <p className="text-xs text-gray-500">FisioCenter - R$ 2.340,00 - há 6 horas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Voucher criado</p>
                  <p className="text-xs text-gray-500">PROMO30 - 30% desconto - ontem</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" size="sm">
              Ver Todas Atividades
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}