import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Avatar, Chip, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface DashboardStats {
  appointments_this_month: number;
  completed_sessions: number;
  exercises_completed: number;
  adherence_rate: number;
  next_appointment?: {
    id: string;
    date: string;
    time: string;
    therapist_name: string;
    type: string;
  };
}

interface ExerciseProgress {
  exercise_name: string;
  completed_sessions: number;
  total_sessions: number;
  progress_percentage: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, exercisesResponse] = await Promise.all([
        apiClient.get('/patient-portal/stats'),
        apiClient.get('/patient-portal/exercises/progress')
      ]);

      setStats(statsResponse.data);
      setExercises(exercisesResponse.data.exercises.slice(0, 3)); // Apenas os 3 primeiros
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    onPress 
  }: { 
    title: string; 
    value: string | number; 
    icon: string; 
    color: string; 
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <Ionicons name={icon as any} size={24} color={color} />
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Avatar.Text 
              size={48} 
              label={user?.full_name?.charAt(0) || 'U'} 
              style={{ backgroundColor: Colors.primary }}
            />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>
                Olá, {user?.full_name?.split(' ')[0] || 'Usuário'}!
              </Text>
              <Text style={styles.welcomeSubtitle}>Como está se sentindo hoje?</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Next Appointment */}
        {stats?.next_appointment && (
          <Card style={styles.appointmentCard}>
            <Card.Content>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIcon}>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.appointmentTitle}>Próxima Consulta</Text>
              </View>
              
              <View style={styles.appointmentDetails}>
                <Text style={styles.appointmentDate}>
                  {new Date(stats.next_appointment.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </Text>
                <Text style={styles.appointmentTime}>
                  {stats.next_appointment.time} • {stats.next_appointment.therapist_name}
                </Text>
                <Chip mode="outlined" style={styles.appointmentType}>
                  {stats.next_appointment.type}
                </Chip>
              </View>
              
              <View style={styles.appointmentActions}>
                <Button 
                  mode="outlined" 
                  compact
                  onPress={() => router.push('/(tabs)/appointments')}
                >
                  Ver Detalhes
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Consultas este Mês"
            value={stats?.appointments_this_month || 0}
            icon="calendar"
            color={Colors.primary}
            onPress={() => router.push('/(tabs)/appointments')}
          />
          <StatCard
            title="Sessões Concluídas"
            value={stats?.completed_sessions || 0}
            icon="checkmark-circle"
            color="#10B981"
          />
          <StatCard
            title="Exercícios Feitos"
            value={stats?.exercises_completed || 0}
            icon="fitness"
            color="#8B5CF6"
            onPress={() => router.push('/(tabs)/exercises')}
          />
          <StatCard
            title="Taxa de Aderência"
            value={`${Math.round(stats?.adherence_rate || 0)}%`}
            icon="trending-up"
            color="#F59E0B"
          />
        </View>

        {/* Exercise Progress */}
        <Card style={styles.progressCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Progresso dos Exercícios</Text>
              <Button 
                mode="text" 
                compact
                onPress={() => router.push('/(tabs)/exercises')}
              >
                Ver Todos
              </Button>
            </View>
            
            <View style={styles.exercisesList}>
              {exercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                    <Text style={styles.exerciseStats}>
                      {exercise.completed_sessions}/{exercise.total_sessions} sessões
                    </Text>
                  </View>
                  <View style={styles.exerciseProgress}>
                    <ProgressBar
                      progress={exercise.progress_percentage / 100}
                      color={Colors.primary}
                      style={styles.progressBar}
                    />
                    <Text style={styles.progressText}>
                      {Math.round(exercise.progress_percentage)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            
            {exercises.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="fitness" size={48} color="#CBD5E0" />
                <Text style={styles.emptyText}>Nenhum exercício em andamento</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Ações Rápidas</Text>
            
            <View style={styles.actionsList}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push('/(tabs)/exercises')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EDE7F6' }]}>
                  <Ionicons name="fitness" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionText}>Fazer Exercícios</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push('/(tabs)/appointments')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.actionText}>Agendar Consulta</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push('/(tabs)/messages')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E8F5E8' }]}>
                  <Ionicons name="chatbubble-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.actionText}>Enviar Mensagem</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push('/medical-records')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.actionText}>Meu Prontuário</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    marginLeft: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  appointmentCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.primary,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  appointmentDate: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  appointmentType: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  appointmentActions: {
    flexDirection: 'row',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 10,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'left',
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  exercisesList: {
    gap: 16,
  },
  exerciseItem: {
    flexDirection: 'column',
    gap: 8,
  },
  exerciseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  exerciseStats: {
    fontSize: 12,
    color: '#64748B',
  },
  exerciseProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    minWidth: 35,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  actionsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  actionItem: {
    alignItems: 'center',
    width: (width - 80) / 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
});