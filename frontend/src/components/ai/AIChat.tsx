'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider?: string
  confidence?: number
  processing_time?: number
  error?: string
}

interface AIChatProps {
  context?: Record<string, any>
  placeholder?: string
  maxHeight?: string
  onMessageSent?: (message: ChatMessage) => void
}

export function AIChat({ 
  context, 
  placeholder = "Digite sua pergunta sobre fisioterapia...",
  maxHeight = "600px",
  onMessageSent 
}: AIChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Olá, ${user?.name || 'Doctor'}! Sou seu assistente de IA especializado em fisioterapia. Como posso ajudá-lo hoje?

Posso auxiliar com:
• Análise de casos clínicos
• Sugestões de exercícios
• Protocolos de tratamento
• Interpretação de exames
• Questões sobre diagnóstico
• Orientações baseadas em evidência

O que você gostaria de discutir?`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [user])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Update conversation history
    const newHistory = [...conversationHistory, { role: 'user', content: inputMessage }]
    setConversationHistory(newHistory)

    try {
      const response = await apiClient.post('/ai/chat', {
        message: inputMessage,
        conversation_history: newHistory,
        context: context || {}
      })

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        provider: response.data.provider,
        confidence: response.data.confidence,
        processing_time: response.data.processing_time,
        error: response.data.error
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationHistory(prev => [...prev, { role: 'assistant', content: response.data.response }])
      
      if (onMessageSent) {
        onMessageSent(assistantMessage)
      }

    } catch (error) {
      console.error('Erro no chat:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.',
        timestamp: new Date(),
        error: 'Erro de conexão'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />')
  }

  const clearChat = () => {
    const welcomeMessage = messages.find(m => m.id === 'welcome')
    setMessages(welcomeMessage ? [welcomeMessage] : [])
    setConversationHistory([])
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Assistente IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                Limpar Chat
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 px-4" 
          style={{ maxHeight }}
        >
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.error
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: formatMessageContent(message.content) 
                      }} 
                    />
                    
                    {message.error && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        Erro no processamento
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.provider && (
                      <Badge variant="secondary" className="text-xs">
                        {message.provider}
                      </Badge>
                    )}
                    {message.confidence && (
                      <span className="text-xs">
                        Confiança: {Math.round(message.confidence * 100)}%
                      </span>
                    )}
                    {message.processing_time && (
                      <span className="text-xs">
                        {message.processing_time.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1 order-1">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-[80%]">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Processando com IA...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex-shrink-0 border-t bg-white p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Pressione Enter para enviar</span>
            <span>{messages.length - 1} mensagens</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}