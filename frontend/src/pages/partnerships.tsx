import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { 
  Users,
  DollarSign,
  Receipt,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  MoreVertical
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { PartnershipDashboard } from '@/components/partnerships/PartnershipDashboard';
import { PartnersTable } from '@/components/partnerships/PartnersTable';
import { VouchersTable } from '@/components/partnerships/VouchersTable';
import { CommissionsTable } from '@/components/partnerships/CommissionsTable';

interface PartnershipOverview {
  total_partners: number;
  active_partners: number;
  total_vouchers: number;
  active_vouchers: number;
  pending_commissions_count: number;
  pending_commission_amount: number;
  voucher_usage_last_month: number;
  total_discount_last_month: number;
}

export default function PartnershipsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['partnership-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/partnerships/dashboard');
      return response.data.overview as PartnershipOverview;
    }
  });

  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: string;
    color?: 'blue' | 'green' | 'orange' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      orange: 'bg-orange-50 text-orange-600',
      purple: 'bg-purple-50 text-purple-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <p className="text-sm text-gray-500 mt-1">{trend}</p>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sistema de Parcerias</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Parceiro
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {!overviewLoading && overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Parceiros Ativos"
            value={`${overview.active_partners}/${overview.total_partners}`}
            icon={Users}
            trend="+12% este mês"
            color="blue"
          />
          <StatsCard
            title="Vouchers Ativos"
            value={`${overview.active_vouchers}/${overview.total_vouchers}`}
            icon={Receipt}
            trend="+5% este mês"
            color="green"
          />
          <StatsCard
            title="Comissões Pendentes"
            value={`R$ ${overview.pending_commission_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
            icon={DollarSign}
            trend={`${overview.pending_commissions_count} pendentes`}
            color="orange"
          />
          <StatsCard
            title="Descontos Concedidos"
            value={`R$ ${overview.total_discount_last_month?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
            icon={TrendingUp}
            trend={`${overview.voucher_usage_last_month} usos no mês`}
            color="purple"
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar parceiros, vouchers ou comissões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="partners">Parceiros</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <PartnershipDashboard />
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <PartnersTable searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="vouchers" className="space-y-4">
          <VouchersTable searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <CommissionsTable searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
}