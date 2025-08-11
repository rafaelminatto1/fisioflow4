'use client'

import React, { useState, useEffect } from 'react'
import { Send, Paperclip, Search, Phone, Video, MoreVertical, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import PatientLayout from '@/components/patient/PatientLayout'
import { apiClient } from '@/lib/api'

interface Message {
  id: string
  content: string
  timestamp: string
  sender_id: string
  sender_name: string
  sender_type: 'PATIENT' | 'THERAPIST' | 'SYSTEM'
  is_read: boolean
  message_type: 'TEXT' | 'IMAGE' | 'FILE' | 'APPOINTMENT_REMINDER' | 'EXERCISE_REMINDER'
  attachment_url?: string
  attachment_name?: string
}

interface Conversation {
  id: string
  therapist_id: string
  therapist_name: string
  therapist_specialty: string
  therapist_avatar?: string
  last_message?: Message
  unread_count: number
  is_online: boolean
  last_seen?: string
}

export default function PatientMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/patient-portal/messages/conversations')
      setConversations(response.data.conversations)
      if (response.data.conversations.length > 0 && !selectedConversation) {
        setSelectedConversation(response.data.conversations[0])
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiClient.get(`/patient-portal/messages/conversations/${conversationId}/messages`)
      setMessages(response.data.messages)
      
      // Mark messages as read
      await apiClient.post(`/patient-portal/messages/conversations/${conversationId}/mark-read`)
      
      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      )
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const response = await apiClient.post('/patient-portal/messages/send', {
        conversation_id: selectedConversation.id,
        content: newMessage,
        message_type: 'TEXT'
      })

      setMessages(prev => [...prev, response.data.message])
      setNewMessage('')
      
      // Update conversation last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message: response.data.message }
            : conv
        )
      )
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
        return '📅'
      case 'EXERCISE_REMINDER':
        return '💪'
      case 'FILE':
        return '📎'
      case 'IMAGE':
        return '🖼️'
      default:
        return null
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.therapist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.therapist_specialty.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <PatientLayout currentPage="messages">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando mensagens...</p>
          </div>
        </div>
      </PatientLayout>
    )
  }

  return (
    <PatientLayout currentPage="messages">
      <div className="flex-1 flex h-full">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Mensagens</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={conversation.therapist_avatar} />
                          <AvatarFallback>
                            {conversation.therapist_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm truncate">{conversation.therapist_name}</h3>
                          {conversation.last_message && (
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(conversation.last_message.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1">{conversation.therapist_specialty}</p>
                        
                        {conversation.last_message && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 truncate">
                              {getMessageIcon(conversation.last_message.message_type)}
                              {conversation.last_message.content}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="default" className="ml-2 bg-blue-600 text-xs px-2 py-0.5">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {!conversation.is_online && conversation.last_seen && (
                          <p className="text-xs text-gray-400 mt-1">
                            Visto por último {formatMessageTime(conversation.last_seen)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.therapist_avatar} />
                    <AvatarFallback>
                      {selectedConversation.therapist_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedConversation.therapist_name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.is_online ? (
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Online
                        </span>
                      ) : (
                        `${selectedConversation.therapist_specialty}`
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'PATIENT' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'PATIENT'
                        ? 'bg-blue-600 text-white'
                        : message.sender_type === 'SYSTEM'
                        ? 'bg-gray-100 text-gray-700 text-center'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {message.sender_type !== 'PATIENT' && message.sender_type !== 'SYSTEM' && (
                      <p className="text-xs text-gray-500 mb-1">{message.sender_name}</p>
                    )}
                    
                    <div className="flex items-start gap-2">
                      {getMessageIcon(message.message_type) && (
                        <span className="text-lg">{getMessageIcon(message.message_type)}</span>
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{message.content}</p>
                        
                        {message.attachment_url && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{message.attachment_name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        message.sender_type === 'PATIENT'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                      
                      {message.sender_type === 'PATIENT' && (
                        <CheckCircle2 className={`h-3 w-3 ${
                          message.is_read ? 'text-blue-200' : 'text-blue-300'
                        }`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <div className="flex-1">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-0 resize-none"
                    rows={1}
                  />
                </div>
                
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
              <p className="text-gray-600">Escolha uma conversa para começar a trocar mensagens</p>
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  )
}