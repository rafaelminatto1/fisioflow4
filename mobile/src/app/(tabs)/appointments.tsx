import React, { useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Surface,
  Text,
  Avatar,
  FAB,
  Searchbar,
  IconButton,
  Divider
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { styles } from '../styles/common';

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  professional: {
    name: string;
    specialization: string;
  };
  status: 'AGENDADA' | 'CONFIRMADA' | 'CONCLUIDA' | 'CANCELADA';
  service_type: string;
  notes?: string;
}

const StatusChip = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'AGENDADA':
        return { color: '#FFA726', text: 'Agendada' };
      case 'CONFIRMADA':
        return { color: '#66BB6A', text: 'Confirmada' };
      case 'CONCLUIDA':
        return { color: '#42A5F5', text: 'Concluída' };
      case 'CANCELADA':
        return { color: '#EF5350', text: 'Cancelada' };
      default:
        return { color: '#9E9E9E', text: status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip 
      mode="outlined" 
      textStyle={{ color: config.color, fontSize: 12 }}
      style={{ backgroundColor: `${config.color}15`, borderColor: config.color }}
    >
      {config.text}
    </Chip>
  );
};

export default function AppointmentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockAppointments: Appointment[] = [
        {
          id: 1,
          appointment_date: '2025-01-15',
          appointment_time: '14:00',
          professional: {
            name: 'Dr. Ana Silva',
            specialization: 'Fisioterapeuta'
          },
          status: 'CONFIRMADA',
          service_type: 'Consulta Inicial',
          notes: 'Primeira consulta para avaliação completa'
        },
        {
          id: 2,
          appointment_date: '2025-01-18',
          appointment_time: '10:30',
          professional: {
            name: 'Dr. Carlos Lima',
            specialization: 'Fisioterapeuta'
          },
          status: 'AGENDADA',
          service_type: 'Sessão de Fisioterapia'
        },
        {
          id: 3,
          appointment_date: '2025-01-12',
          appointment_time: '16:15',
          professional: {
            name: 'Dr. Ana Silva',
            specialization: 'Fisioterapeuta'
          },
          status: 'CONCLUIDA',
          service_type: 'Reavaliação'
        }
      ];
      
      return mockAppointments;
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredAppointments = appointments?.filter(appointment => {
    const matchesSearch = 
      appointment.professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || appointment.status === filter;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = new Date(`${a.appointment_date} ${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date} ${b.appointment_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.title}>Consultas</Title>
      </Surface>

      {/* Search */}
      <Searchbar
        placeholder="Buscar consultas..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ margin: 16, marginBottom: 8 }}
      />

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: 16, marginBottom: 8 }}
      >
        <Button
          mode={filter === 'all' ? 'contained' : 'outlined'}
          onPress={() => setFilter('all')}
          style={{ marginRight: 8 }}
          compact
        >
          Todas
        </Button>
        <Button
          mode={filter === 'AGENDADA' ? 'contained' : 'outlined'}
          onPress={() => setFilter('AGENDADA')}
          style={{ marginRight: 8 }}
          compact
        >
          Agendadas
        </Button>
        <Button
          mode={filter === 'CONFIRMADA' ? 'contained' : 'outlined'}
          onPress={() => setFilter('CONFIRMADA')}
          style={{ marginRight: 8 }}
          compact
        >
          Confirmadas
        </Button>
        <Button
          mode={filter === 'CONCLUIDA' ? 'contained' : 'outlined'}
          onPress={() => setFilter('CONCLUIDA')}
          style={{ marginRight: 8 }}
          compact
        >
          Concluídas
        </Button>
      </ScrollView>

      {/* Appointments List */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <Card style={{ margin: 8 }}>
            <Card.Content>
              <Text>Carregando consultas...</Text>
            </Card.Content>
          </Card>
        ) : sortedAppointments.length === 0 ? (
          <Card style={{ margin: 8 }}>
            <Card.Content>
              <Text>Nenhuma consulta encontrada</Text>
            </Card.Content>
          </Card>
        ) : (
          sortedAppointments.map((appointment) => (
            <Card key={appointment.id} style={styles.card}>
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLarge" style={{ color: '#1976d2' }}>
                      {format(parseISO(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 2 }}>
                      {appointment.appointment_time}
                    </Text>
                  </View>
                  <StatusChip status={appointment.status} />
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Avatar.Icon size={40} icon="doctor" style={{ backgroundColor: '#e3f2fd', marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      {appointment.professional.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#666' }}>
                      {appointment.professional.specialization}
                    </Text>
                  </View>
                </View>

                <Text variant="bodyMedium" style={{ marginBottom: 4, fontWeight: '500' }}>
                  {appointment.service_type}
                </Text>

                {appointment.notes && (
                  <Text variant="bodySmall" style={{ color: '#666', fontStyle: 'italic' }}>
                    {appointment.notes}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  {appointment.status === 'AGENDADA' && (
                    <>
                      <Button
                        mode="outlined"
                        onPress={() => console.log('Cancel appointment')}
                        style={{ flex: 1, marginRight: 8 }}
                        compact
                      >
                        Cancelar
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => console.log('Confirm appointment')}
                        style={{ flex: 1 }}
                        compact
                      >
                        Confirmar
                      </Button>
                    </>
                  )}
                  
                  {(appointment.status === 'CONFIRMADA' || appointment.status === 'CONCLUIDA') && (
                    <Button
                      mode="outlined"
                      onPress={() => console.log('View details')}
                      icon="eye"
                      compact
                    >
                      Ver Detalhes
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        label="Nova Consulta"
        onPress={() => console.log('Schedule new appointment')}
        style={styles.fab}
      />
    </View>
  );
}