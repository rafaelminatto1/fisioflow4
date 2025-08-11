import React, { useState, useRef } from 'react';
import { ScrollView, View, RefreshControl, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Surface,
  Text,
  ProgressBar,
  IconButton,
  FAB,
  Searchbar,
  Avatar,
  Dialog,
  Portal,
  TextInput,
  Divider
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, ResizeMode } from 'expo-av';
import { styles } from '../styles/common';

interface Exercise {
  id: number;
  name: string;
  description: string;
  video_url?: string;
  thumbnail_url?: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  equipment?: string;
  instructions: string[];
}

interface PatientExercise {
  id: number;
  exercise: Exercise;
  sets: number;
  repetitions: number;
  duration_seconds?: number;
  frequency: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SKIPPED';
  progress: number;
  notes?: string;
  assigned_date: string;
}

interface ExerciseExecution {
  sets_completed: number;
  duration_completed: number;
  pain_level: number;
  difficulty_level: number;
  notes: string;
}

const DifficultyChip = ({ difficulty }: { difficulty: string }) => {
  const getColor = () => {
    switch (difficulty) {
      case 'BEGINNER': return '#4CAF50';
      case 'INTERMEDIATE': return '#FF9800';
      case 'ADVANCED': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getText = () => {
    switch (difficulty) {
      case 'BEGINNER': return 'Iniciante';
      case 'INTERMEDIATE': return 'Intermediário';
      case 'ADVANCED': return 'Avançado';
      default: return difficulty;
    }
  };

  return (
    <Chip 
      mode="outlined" 
      textStyle={{ color: getColor(), fontSize: 11 }}
      style={{ backgroundColor: `${getColor()}15`, borderColor: getColor() }}
    >
      {getText()}
    </Chip>
  );
};

export default function ExercisesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<PatientExercise | null>(null);
  const [executionDialog, setExecutionDialog] = useState(false);
  const [executionData, setExecutionData] = useState<ExerciseExecution>({
    sets_completed: 0,
    duration_completed: 0,
    pain_level: 0,
    difficulty_level: 5,
    notes: ''
  });

  const queryClient = useQueryClient();
  const videoRef = useRef<Video>(null);

  const { data: patientExercises, isLoading, refetch } = useQuery({
    queryKey: ['patient-exercises'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockExercises: PatientExercise[] = [
        {
          id: 1,
          exercise: {
            id: 1,
            name: 'Alongamento de Quadríceps',
            description: 'Exercício para alongar a musculatura anterior da coxa',
            video_url: 'https://example.com/video1.mp4',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            category: 'Alongamento',
            difficulty: 'BEGINNER',
            duration_minutes: 2,
            equipment: 'Nenhum',
            instructions: [
              'Fique em pé com apoio na parede',
              'Flexione o joelho trazendo o calcanhar ao glúteo',
              'Mantenha por 30 segundos',
              'Repita com a outra perna'
            ]
          },
          sets: 3,
          repetitions: 1,
          duration_seconds: 30,
          frequency: 'Diário',
          status: 'ACTIVE',
          progress: 75,
          assigned_date: '2025-01-10'
        },
        {
          id: 2,
          exercise: {
            id: 2,
            name: 'Fortalecimento de Glúteo',
            description: 'Exercício para fortalecimento da musculatura glútea',
            category: 'Fortalecimento',
            difficulty: 'INTERMEDIATE',
            duration_minutes: 5,
            equipment: 'Faixa elástica',
            instructions: [
              'Deite-se de lado',
              'Coloque a faixa ao redor dos joelhos',
              'Eleve a perna superior mantendo resistência',
              'Retorne controladamente'
            ]
          },
          sets: 2,
          repetitions: 15,
          frequency: '3x por semana',
          status: 'ACTIVE',
          progress: 40,
          assigned_date: '2025-01-12'
        },
        {
          id: 3,
          exercise: {
            id: 3,
            name: 'Caminhada Assistida',
            description: 'Exercício de marcha para reabilitação',
            category: 'Funcional',
            difficulty: 'BEGINNER',
            duration_minutes: 10,
            equipment: 'Barras paralelas',
            instructions: [
              'Posicione-se entre as barras paralelas',
              'Apoie-se conforme necessário',
              'Caminhe de forma controlada',
              'Mantenha postura ereta'
            ]
          },
          sets: 1,
          repetitions: 10,
          frequency: 'Diário',
          status: 'COMPLETED',
          progress: 100,
          assigned_date: '2025-01-08'
        }
      ];
      
      return mockExercises;
    }
  });

  const executionMutation = useMutation({
    mutationFn: async (data: { exerciseId: number; execution: ExerciseExecution }) => {
      // Mock API call
      console.log('Executing exercise:', data);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-exercises'] });
      setExecutionDialog(false);
      setSelectedExercise(null);
      Alert.alert('Sucesso', 'Exercício registrado com sucesso!');
    },
    onError: () => {
      Alert.alert('Erro', 'Falha ao registrar execução do exercício');
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleExecuteExercise = (exercise: PatientExercise) => {
    setSelectedExercise(exercise);
    setExecutionData({
      sets_completed: 0,
      duration_completed: 0,
      pain_level: 0,
      difficulty_level: 5,
      notes: ''
    });
    setExecutionDialog(true);
  };

  const submitExecution = () => {
    if (!selectedExercise) return;
    
    executionMutation.mutate({
      exerciseId: selectedExercise.id,
      execution: executionData
    });
  };

  const filteredExercises = patientExercises?.filter(patientExercise => {
    const matchesSearch = 
      patientExercise.exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientExercise.exercise.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || patientExercise.status === filter;
    
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.title}>Exercícios</Title>
      </Surface>

      {/* Search */}
      <Searchbar
        placeholder="Buscar exercícios..."
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
          Todos
        </Button>
        <Button
          mode={filter === 'ACTIVE' ? 'contained' : 'outlined'}
          onPress={() => setFilter('ACTIVE')}
          style={{ marginRight: 8 }}
          compact
        >
          Ativos
        </Button>
        <Button
          mode={filter === 'COMPLETED' ? 'contained' : 'outlined'}
          onPress={() => setFilter('COMPLETED')}
          style={{ marginRight: 8 }}
          compact
        >
          Concluídos
        </Button>
      </ScrollView>

      {/* Exercises List */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <Card style={{ margin: 8 }}>
            <Card.Content>
              <Text>Carregando exercícios...</Text>
            </Card.Content>
          </Card>
        ) : filteredExercises.length === 0 ? (
          <Card style={{ margin: 8 }}>
            <Card.Content>
              <Text>Nenhum exercício encontrado</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredExercises.map((patientExercise) => (
            <Card key={patientExercise.id} style={styles.card}>
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      {patientExercise.exercise.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
                      {patientExercise.exercise.category}
                    </Text>
                  </View>
                  <DifficultyChip difficulty={patientExercise.exercise.difficulty} />
                </View>

                <Text variant="bodySmall" style={{ marginBottom: 8 }}>
                  {patientExercise.exercise.description}
                </Text>

                <Divider style={{ marginVertical: 8 }} />

                {/* Exercise Parameters */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  <Chip mode="outlined" style={{ marginRight: 8, marginBottom: 4 }} textStyle={{ fontSize: 11 }}>
                    {patientExercise.sets} séries
                  </Chip>
                  {patientExercise.repetitions > 0 && (
                    <Chip mode="outlined" style={{ marginRight: 8, marginBottom: 4 }} textStyle={{ fontSize: 11 }}>
                      {patientExercise.repetitions} repetições
                    </Chip>
                  )}
                  {patientExercise.duration_seconds && (
                    <Chip mode="outlined" style={{ marginRight: 8, marginBottom: 4 }} textStyle={{ fontSize: 11 }}>
                      {patientExercise.duration_seconds}s
                    </Chip>
                  )}
                  <Chip mode="outlined" style={{ marginBottom: 4 }} textStyle={{ fontSize: 11 }}>
                    {patientExercise.frequency}
                  </Chip>
                </View>

                {/* Progress */}
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text variant="bodySmall">Progresso</Text>
                    <Text variant="bodySmall">{patientExercise.progress}%</Text>
                  </View>
                  <ProgressBar 
                    progress={patientExercise.progress / 100} 
                    color="#4CAF50"
                    style={{ height: 6, borderRadius: 3 }}
                  />
                </View>

                {/* Equipment */}
                {patientExercise.exercise.equipment && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Avatar.Icon size={24} icon="dumbbell" style={{ backgroundColor: '#e8f5e8', marginRight: 8 }} />
                    <Text variant="bodySmall">{patientExercise.exercise.equipment}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Button
                    mode="outlined"
                    onPress={() => console.log('View instructions')}
                    icon="text-box-multiple"
                    style={{ flex: 1, marginRight: 8 }}
                    compact
                  >
                    Instruções
                  </Button>
                  
                  {patientExercise.status === 'ACTIVE' && (
                    <Button
                      mode="contained"
                      onPress={() => handleExecuteExercise(patientExercise)}
                      icon="play"
                      style={{ flex: 1 }}
                      compact
                    >
                      Executar
                    </Button>
                  )}
                  
                  {patientExercise.status === 'COMPLETED' && (
                    <Button
                      mode="contained-tonal"
                      icon="check"
                      style={{ flex: 1 }}
                      compact
                      disabled
                    >
                      Concluído
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Execution Dialog */}
      <Portal>
        <Dialog visible={executionDialog} onDismiss={() => setExecutionDialog(false)}>
          <Dialog.Title>Registrar Execução</Dialog.Title>
          <Dialog.Content>
            {selectedExercise && (
              <>
                <Text variant="titleMedium" style={{ marginBottom: 16 }}>
                  {selectedExercise.exercise.name}
                </Text>

                <TextInput
                  label="Séries Completadas"
                  value={executionData.sets_completed.toString()}
                  onChangeText={(text) => setExecutionData(prev => ({
                    ...prev,
                    sets_completed: parseInt(text) || 0
                  }))}
                  keyboardType="numeric"
                  style={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Duração (segundos)"
                  value={executionData.duration_completed.toString()}
                  onChangeText={(text) => setExecutionData(prev => ({
                    ...prev,
                    duration_completed: parseInt(text) || 0
                  }))}
                  keyboardType="numeric"
                  style={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Nível de Dor (0-10)"
                  value={executionData.pain_level.toString()}
                  onChangeText={(text) => setExecutionData(prev => ({
                    ...prev,
                    pain_level: parseInt(text) || 0
                  }))}
                  keyboardType="numeric"
                  style={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Dificuldade Percebida (1-10)"
                  value={executionData.difficulty_level.toString()}
                  onChangeText={(text) => setExecutionData(prev => ({
                    ...prev,
                    difficulty_level: parseInt(text) || 5
                  }))}
                  keyboardType="numeric"
                  style={{ marginBottom: 12 }}
                />

                <TextInput
                  label="Observações"
                  value={executionData.notes}
                  onChangeText={(text) => setExecutionData(prev => ({
                    ...prev,
                    notes: text
                  }))}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExecutionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={submitExecution}
              loading={executionMutation.isPending}
            >
              Registrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* FAB */}
      <FAB
        icon="dumbbell"
        label="Biblioteca"
        onPress={() => console.log('Open exercise library')}
        style={styles.fab}
      />
    </View>
  );
}