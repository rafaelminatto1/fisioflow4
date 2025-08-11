import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Avatar,
  Surface,
  IconButton,
  Chip,
  Divider
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { styles } from '../styles/common';

interface Message {
  id: number;
  content: string;
  sender: {
    id: number;
    name: string;
    role: 'PATIENT' | 'PROFESSIONAL';
    avatar_url?: string;
  };
  sent_at: string;
  read_at?: string;
  message_type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'APPOINTMENT_UPDATE';
  metadata?: any;
}

interface Conversation {
  id: number;
  professional: {
    id: number;
    name: string;
    specialization: string;
    avatar_url?: string;
  };
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

const MessageBubble = ({ message, isOwn }: { message: Message; isOwn: boolean }) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 16,
      }}
    >
      {!isOwn && (
        <Avatar.Text
          size={32}
          label={message.sender.name.substring(0, 2)}
          style={{ marginRight: 8, backgroundColor: '#e3f2fd' }}
        />
      )}
      
      <View
        style={{
          maxWidth: '75%',
          backgroundColor: isOwn ? '#1976d2' : '#f5f5f5',
          padding: 12,
          borderRadius: 16,
          borderBottomRightRadius: isOwn ? 4 : 16,
          borderBottomLeftRadius: isOwn ? 16 : 4,
        }}
      >
        {!isOwn && (
          <Text
            variant="labelSmall"
            style={{
              color: '#666',
              marginBottom: 4,
              fontWeight: 'bold'
            }}
          >
            {message.sender.name}
          </Text>
        )}
        
        <Text
          variant="bodyMedium"
          style={{
            color: isOwn ? 'white' : '#333',
            lineHeight: 18,
          }}
        >
          {message.content}
        </Text>
        
        <Text
          variant="labelSmall"
          style={{
            color: isOwn ? 'rgba(255,255,255,0.7)' : '#999',
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          {format(parseISO(message.sent_at), 'HH:mm', { locale: ptBR })}
        </Text>
      </View>
      
      {isOwn && (
        <Avatar.Text
          size={32}
          label="EU"
          style={{ marginLeft: 8, backgroundColor: '#e8f5e8' }}
        />
      )}
    </View>
  );
};

export default function MessagesScreen() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockConversations: Conversation[] = [
        {
          id: 1,
          professional: {
            id: 1,
            name: 'Dr. Ana Silva',
            specialization: 'Fisioterapeuta',
          },
          last_message: {
            id: 1,
            content: 'Como foi a execução dos exercícios hoje?',
            sender: {
              id: 1,
              name: 'Dr. Ana Silva',
              role: 'PROFESSIONAL'
            },
            sent_at: '2025-01-10T14:30:00Z',
            message_type: 'TEXT'
          },
          unread_count: 2,
          updated_at: '2025-01-10T14:30:00Z'
        },
        {
          id: 2,
          professional: {
            id: 2,
            name: 'Dr. Carlos Lima',
            specialization: 'Fisioterapeuta',
          },
          last_message: {
            id: 2,
            content: 'Sua próxima consulta foi reagendada para sexta-feira às 10h',
            sender: {
              id: 2,
              name: 'Dr. Carlos Lima',
              role: 'PROFESSIONAL'
            },
            sent_at: '2025-01-09T16:15:00Z',
            message_type: 'APPOINTMENT_UPDATE'
          },
          unread_count: 0,
          updated_at: '2025-01-09T16:15:00Z'
        }
      ];
      
      return mockConversations;
    }
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      // Mock data - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: 1,
          content: 'Boa tarde! Como você está se sentindo hoje?',
          sender: {
            id: 1,
            name: 'Dr. Ana Silva',
            role: 'PROFESSIONAL'
          },
          sent_at: '2025-01-10T13:00:00Z',
          message_type: 'TEXT'
        },
        {
          id: 2,
          content: 'Olá doutora! Estou me sentindo melhor. As dores diminuíram bastante.',
          sender: {
            id: 100,
            name: 'Você',
            role: 'PATIENT'
          },
          sent_at: '2025-01-10T13:05:00Z',
          message_type: 'TEXT'
        },
        {
          id: 3,
          content: 'Que ótima notícia! Continue fazendo os exercícios que passamos.',
          sender: {
            id: 1,
            name: 'Dr. Ana Silva',
            role: 'PROFESSIONAL'
          },
          sent_at: '2025-01-10T13:10:00Z',
          message_type: 'TEXT'
        },
        {
          id: 4,
          content: 'Como foi a execução dos exercícios hoje?',
          sender: {
            id: 1,
            name: 'Dr. Ana Silva',
            role: 'PROFESSIONAL'
          },
          sent_at: '2025-01-10T14:30:00Z',
          message_type: 'TEXT'
        }
      ];
      
      return mockMessages;
    },
    enabled: !!selectedConversation
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: number; content: string }) => {
      // Mock API call
      console.log('Sending message:', data);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
    }
  });

  const handleSendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim()
    });
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <Surface style={styles.header}>
          <Title style={styles.title}>Mensagens</Title>
        </Surface>

        {/* Conversations List */}
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {conversations?.map((conversation) => (
            <Card
              key={conversation.id}
              style={[styles.card, { marginBottom: 12 }]}
              onPress={() => setSelectedConversation(conversation.id)}
            >
              <Card.Content style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar.Text
                    size={48}
                    label={conversation.professional.name.substring(0, 2)}
                    style={{ backgroundColor: '#e3f2fd', marginRight: 16 }}
                  />
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {conversation.professional.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: '#666', marginTop: 2 }}>
                          {conversation.professional.specialization}
                        </Text>
                      </View>
                      
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="labelSmall" style={{ color: '#999' }}>
                          {format(parseISO(conversation.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </Text>
                        {conversation.unread_count > 0 && (
                          <Chip
                            mode="flat"
                            style={{
                              backgroundColor: '#1976d2',
                              marginTop: 4,
                              height: 20,
                              minWidth: 20
                            }}
                            textStyle={{ color: 'white', fontSize: 11 }}
                          >
                            {conversation.unread_count}
                          </Chip>
                        )}
                      </View>
                    </View>
                    
                    {conversation.last_message && (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: '#666',
                          marginTop: 8,
                          fontStyle: conversation.last_message.message_type === 'APPOINTMENT_UPDATE' ? 'italic' : 'normal'
                        }}
                        numberOfLines={2}
                      >
                        {conversation.last_message.message_type === 'APPOINTMENT_UPDATE' && '📅 '}
                        {conversation.last_message.content}
                      </Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </View>
    );
  }

  const currentConversation = conversations?.find(c => c.id === selectedConversation);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <IconButton
          icon="arrow-left"
          onPress={() => setSelectedConversation(null)}
          style={{ marginRight: 8 }}
        />
        <Avatar.Text
          size={40}
          label={currentConversation?.professional.name.substring(0, 2) || ''}
          style={{ backgroundColor: '#e3f2fd', marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Title style={[styles.title, { fontSize: 18 }]}>
            {currentConversation?.professional.name}
          </Title>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            {currentConversation?.professional.specialization}
          </Text>
        </View>
      </Surface>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingVertical: 16 }}>
            {messages?.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender.role === 'PATIENT'}
              />
            ))}
          </View>
        </ScrollView>

        {/* Input */}
        <Surface style={{ 
          padding: 16, 
          flexDirection: 'row', 
          alignItems: 'flex-end',
          elevation: 4
        }}>
          <TextInput
            style={{ flex: 1, marginRight: 8 }}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            right={
              <TextInput.Icon
                icon="microphone"
                onPress={() => console.log('Voice message')}
              />
            }
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            loading={sendMessageMutation.isPending}
          />
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
}