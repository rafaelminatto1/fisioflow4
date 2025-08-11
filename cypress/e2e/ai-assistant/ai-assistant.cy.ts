describe('AI Assistant', () => {
  beforeEach(() => {
    cy.login('professional')
    cy.visit('/ai-assistant')
    cy.waitForPageLoad()
  })

  describe('Chat Interface', () => {
    it('should display chat interface correctly', () => {
      cy.get('[data-cy=chat-container]').should('be.visible')
      cy.get('[data-cy=chat-messages]').should('be.visible')
      cy.get('[data-cy=chat-input]').should('be.visible')
      cy.get('[data-cy=send-button]').should('be.visible')
      
      // Check welcome message
      cy.get('[data-cy=welcome-message]').should('contain', 'Olá! Como posso ajudá-lo hoje?')
    })

    it('should send message successfully', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        statusCode: 200,
        fixture: 'ai/chat-response.json'
      }).as('sendMessage')

      const message = 'Quais são os melhores exercícios para lombalgia?'
      
      cy.get('[data-cy=chat-input]').type(message)
      cy.get('[data-cy=send-button]').click()
      
      // Check user message appears
      cy.get('[data-cy=user-message]').last().should('contain', message)
      
      cy.wait('@sendMessage')
      
      // Check AI response appears
      cy.get('[data-cy=ai-message]').last().should('be.visible')
    })

    it('should handle long messages correctly', () => {
      const longMessage = 'Preciso de uma avaliação detalhada sobre um paciente com lombalgia crônica há 6 meses, que apresenta dor irradiante para membro inferior direito, limitação funcional importante e histórico de hérnia discal L4-L5.'
      
      cy.get('[data-cy=chat-input]').type(longMessage)
      cy.get('[data-cy=send-button]').click()
      
      cy.get('[data-cy=user-message]').last().should('contain', longMessage)
    })

    it('should show typing indicator', () => {
      cy.intercept('POST', '**/api/ai/chat', (req) => {
        req.reply((res) => {
          res.delay(2000)
          res.send({ fixture: 'ai/chat-response.json' })
        })
      }).as('sendMessage')

      cy.get('[data-cy=chat-input]').type('Como tratar tendinite de ombro?')
      cy.get('[data-cy=send-button]').click()
      
      cy.get('[data-cy=typing-indicator]').should('be.visible')
      cy.wait('@sendMessage')
      cy.get('[data-cy=typing-indicator]').should('not.exist')
    })

    it('should send message with Enter key', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        fixture: 'ai/chat-response.json'
      }).as('sendMessage')

      cy.get('[data-cy=chat-input]').type('Teste mensagem{enter}')
      cy.wait('@sendMessage')
      
      cy.get('[data-cy=user-message]').last().should('contain', 'Teste mensagem')
    })

    it('should handle empty messages', () => {
      cy.get('[data-cy=send-button]').click()
      
      // Should not send empty message
      cy.get('[data-cy=user-message]').should('have.length', 0)
    })
  })

  describe('Quick Actions', () => {
    it('should display quick action buttons', () => {
      cy.get('[data-cy=quick-actions]').should('be.visible')
      
      cy.get('[data-cy=action-soap]').should('contain', 'Completar SOAP')
      cy.get('[data-cy=action-exercises]').should('contain', 'Sugerir Exercícios')
      cy.get('[data-cy=action-diagnosis]').should('contain', 'Apoio ao Diagnóstico')
      cy.get('[data-cy=action-protocol]').should('contain', 'Protocolo Clínico')
    })

    it('should trigger SOAP completion', () => {
      cy.intercept('POST', '**/api/ai/soap-complete', {
        fixture: 'ai/soap-completion.json'
      }).as('soapComplete')

      cy.get('[data-cy=action-soap]').click()
      
      // Should open SOAP modal
      cy.get('[data-cy=soap-modal]').should('be.visible')
      
      // Fill partial SOAP data
      cy.get('[data-cy=soap-subjective]').type('Paciente relata dor lombar há 1 semana')
      cy.get('[data-cy=soap-objective]').type('Dor à palpação L4-L5, limitação flexão')
      
      cy.get('[data-cy=complete-soap]').click()
      cy.wait('@soapComplete')
      
      // Should show completed SOAP
      cy.get('[data-cy=soap-assessment]').should('be.visible')
      cy.get('[data-cy=soap-plan]').should('be.visible')
    })

    it('should suggest exercises', () => {
      cy.intercept('POST', '**/api/ai/suggest-exercises', {
        fixture: 'ai/exercise-suggestions.json'
      }).as('suggestExercises')

      cy.get('[data-cy=action-exercises]').click()
      
      // Should open exercise suggestion modal
      cy.get('[data-cy=exercise-modal]').should('be.visible')
      
      // Fill patient condition
      cy.get('[data-cy=condition-input]').type('Lombalgia com irradiação')
      cy.get('[data-cy=pain-level]').select('6')
      cy.get('[data-cy=patient-age]').type('45')
      cy.get('[data-cy=activity-level]').select('moderate')
      
      cy.get('[data-cy=suggest-exercises]').click()
      cy.wait('@suggestExercises')
      
      // Should show exercise suggestions
      cy.get('[data-cy=suggested-exercise]').should('have.length.at.least', 3)
      cy.get('[data-cy=exercise-rationale]').should('be.visible')
    })

    it('should provide diagnostic support', () => {
      cy.intercept('POST', '**/api/ai/diagnostic-support', {
        fixture: 'ai/diagnostic-suggestions.json'
      }).as('diagnosticSupport')

      cy.get('[data-cy=action-diagnosis]').click()
      
      // Should open diagnostic modal
      cy.get('[data-cy=diagnostic-modal]').should('be.visible')
      
      // Fill patient symptoms
      cy.get('[data-cy=symptoms-input]').type('Dor lombar, rigidez matinal, limitação funcional')
      cy.get('[data-cy=patient-history]').type('Sedentário, trabalho de escritório')
      cy.get('[data-cy=physical-exam]').type('Dor à flexão, tensão muscular paravertebral')
      
      cy.get('[data-cy=analyze-symptoms]').click()
      cy.wait('@diagnosticSupport')
      
      // Should show diagnostic suggestions
      cy.get('[data-cy=possible-diagnosis]').should('have.length.at.least', 2)
      cy.get('[data-cy=differential-diagnosis]').should('be.visible')
      cy.get('[data-cy=recommended-tests]').should('be.visible')
    })

    it('should suggest clinical protocols', () => {
      cy.intercept('POST', '**/api/ai/suggest-protocol', {
        fixture: 'ai/protocol-suggestions.json'
      }).as('suggestProtocol')

      cy.get('[data-cy=action-protocol]').click()
      
      // Should open protocol modal
      cy.get('[data-cy=protocol-modal]').should('be.visible')
      
      // Select condition
      cy.get('[data-cy=condition-select]').select('lombalgia')
      cy.get('[data-cy=patient-profile]').select('chronic')
      cy.get('[data-cy=treatment-goals]').type('Redução da dor, melhora funcional')
      
      cy.get('[data-cy=suggest-protocol]').click()
      cy.wait('@suggestProtocol')
      
      // Should show protocol suggestions
      cy.get('[data-cy=protocol-phases]').should('be.visible')
      cy.get('[data-cy=treatment-timeline]').should('be.visible')
    })
  })

  describe('Context Integration', () => {
    it('should integrate with patient context', () => {
      // Navigate from patient page
      cy.visit('/patients/1')
      cy.get('[data-cy=ai-assistant-button]').click()
      
      // Should have patient context
      cy.get('[data-cy=patient-context]').should('contain', 'João Silva')
      
      // Quick action should be pre-filled
      cy.get('[data-cy=action-soap]').click()
      cy.get('[data-cy=patient-name]').should('have.value', 'João Silva')
    })

    it('should maintain conversation context', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        fixture: 'ai/contextual-response.json'
      }).as('sendMessage')

      // First message
      cy.get('[data-cy=chat-input]').type('Meu paciente tem lombalgia')
      cy.get('[data-cy=send-button]').click()
      cy.wait('@sendMessage')
      
      // Follow-up message should maintain context
      cy.get('[data-cy=chat-input]').type('Que exercícios você recomenda?')
      cy.get('[data-cy=send-button]').click()
      cy.wait('@sendMessage')
      
      // Response should reference previous context
      cy.get('[data-cy=ai-message]').last().should('contain', 'lombalgia')
    })

    it('should clear conversation context', () => {
      // Send some messages first
      cy.get('[data-cy=chat-input]').type('Primeira mensagem')
      cy.get('[data-cy=send-button]').click()
      
      cy.get('[data-cy=clear-chat]').click()
      
      // Should confirm clearing
      cy.get('[data-cy=confirm-clear]').click()
      
      // Chat should be cleared
      cy.get('[data-cy=chat-messages]').should('not.contain', 'Primeira mensagem')
      cy.get('[data-cy=welcome-message]').should('be.visible')
    })
  })

  describe('AI Models Selection', () => {
    it('should allow model selection', () => {
      cy.get('[data-cy=model-selector]').click()
      
      cy.get('[data-cy=model-claude]').should('contain', 'Claude 3.5 Sonnet')
      cy.get('[data-cy=model-gpt4]').should('contain', 'GPT-4')
      cy.get('[data-cy=model-gemini]').should('contain', 'Gemini Pro')
      
      cy.get('[data-cy=model-gpt4]').click()
      
      cy.get('[data-cy=current-model]').should('contain', 'GPT-4')
    })

    it('should show model capabilities', () => {
      cy.get('[data-cy=model-selector]').click()
      cy.get('[data-cy=model-info]').click()
      
      cy.get('[data-cy=model-capabilities]').should('be.visible')
      cy.get('[data-cy=model-strengths]').should('be.visible')
      cy.get('[data-cy=model-limitations]').should('be.visible')
    })
  })

  describe('Chat History', () => {
    it('should save chat history', () => {
      cy.intercept('GET', '**/api/ai/chat-history', {
        fixture: 'ai/chat-history.json'
      }).as('getChatHistory')

      cy.get('[data-cy=chat-history]').click()
      cy.wait('@getChatHistory')
      
      cy.get('[data-cy=history-item]').should('have.length.at.least', 3)
      cy.get('[data-cy=history-date]').should('be.visible')
    })

    it('should load previous conversation', () => {
      cy.get('[data-cy=chat-history]').click()
      
      cy.get('[data-cy=history-item]').first().click()
      
      // Should load previous messages
      cy.get('[data-cy=user-message]').should('have.length.at.least', 1)
      cy.get('[data-cy=ai-message]').should('have.length.at.least', 1)
    })

    it('should delete chat history', () => {
      cy.intercept('DELETE', '**/api/ai/chat-history/1', {
        statusCode: 200
      }).as('deleteChatHistory')

      cy.get('[data-cy=chat-history]').click()
      
      cy.get('[data-cy=history-item]').first().within(() => {
        cy.get('[data-cy=delete-history]').click()
      })
      
      cy.get('[data-cy=confirm-delete]').click()
      cy.wait('@deleteChatHistory')
      
      cy.get('[data-cy=success-message]').should('contain', 'Conversa excluída')
    })
  })

  describe('Voice Input', () => {
    it('should enable voice input', () => {
      cy.get('[data-cy=voice-input]').click()
      
      cy.get('[data-cy=recording-indicator]').should('be.visible')
      cy.get('[data-cy=stop-recording]').should('be.visible')
    })

    it('should handle voice recognition', () => {
      cy.intercept('POST', '**/api/ai/speech-to-text', {
        body: { text: 'Como tratar tendinite do ombro?' }
      }).as('speechToText')

      cy.get('[data-cy=voice-input]').click()
      
      // Simulate recording
      cy.wait(1000)
      cy.get('[data-cy=stop-recording]').click()
      
      cy.wait('@speechToText')
      
      cy.get('[data-cy=chat-input]').should('have.value', 'Como tratar tendinite do ombro?')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.get('[data-cy=chat-input]').focus()
      
      // Tab to send button
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-cy', 'send-button')
      
      // Tab to quick actions
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-cy').and('match', /action-/)
    })

    it('should have proper ARIA labels', () => {
      cy.get('[data-cy=chat-input]').should('have.attr', 'aria-label')
      cy.get('[data-cy=send-button]').should('have.attr', 'aria-label')
      cy.get('[data-cy=chat-messages]').should('have.attr', 'role', 'log')
    })

    it('should announce new messages to screen readers', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        fixture: 'ai/chat-response.json'
      }).as('sendMessage')

      cy.get('[data-cy=chat-input]').type('Test message')
      cy.get('[data-cy=send-button]').click()
      
      cy.wait('@sendMessage')
      
      // AI message should have aria-live attribute
      cy.get('[data-cy=ai-message]').last().should('have.attr', 'aria-live', 'polite')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('chatError')

      cy.get('[data-cy=chat-input]').type('Test message')
      cy.get('[data-cy=send-button]').click()
      
      cy.wait('@chatError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro ao processar sua mensagem')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should handle network timeouts', () => {
      cy.intercept('POST', '**/api/ai/chat', (req) => {
        req.reply((res) => {
          res.delay(30000) // 30 second delay
        })
      }).as('chatTimeout')

      cy.get('[data-cy=chat-input]').type('Test message')
      cy.get('[data-cy=send-button]').click()
      
      cy.get('[data-cy=timeout-message]').should('be.visible')
      cy.get('[data-cy=cancel-request]').should('be.visible')
    })

    it('should handle rate limiting', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        statusCode: 429,
        body: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
      }).as('rateLimited')

      cy.get('[data-cy=chat-input]').type('Test message')
      cy.get('[data-cy=send-button]').click()
      
      cy.wait('@rateLimited')
      
      cy.get('[data-cy=rate-limit-message]').should('contain', 'Muitas requisições')
    })

    it('should handle model unavailability', () => {
      cy.intercept('POST', '**/api/ai/chat', {
        statusCode: 503,
        body: { error: 'Modelo temporariamente indisponível' }
      }).as('modelUnavailable')

      cy.get('[data-cy=chat-input]').type('Test message')
      cy.get('[data-cy=send-button]').click()
      
      cy.wait('@modelUnavailable')
      
      cy.get('[data-cy=model-error]').should('contain', 'temporariamente indisponível')
      cy.get('[data-cy=switch-model]').should('be.visible')
    })
  })

  describe('Performance', () => {
    it('should load chat interface quickly', () => {
      const start = performance.now()
      
      cy.visit('/ai-assistant')
      cy.get('[data-cy=chat-container]').should('be.visible')
      
      cy.then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(2000) // 2 seconds max
      })
    })

    it('should handle long conversation history efficiently', () => {
      cy.intercept('GET', '**/api/ai/chat-history', {
        fixture: 'ai/large-chat-history.json'
      }).as('getLargeChatHistory')

      cy.get('[data-cy=chat-history]').click()
      cy.wait('@getLargeChatHistory')
      
      // Should render efficiently
      cy.get('[data-cy=history-item]').should('have.length', 100)
      cy.get('[data-cy=chat-history]').should('be.visible')
    })

    it('should optimize message rendering', () => {
      // Send multiple messages quickly
      for (let i = 0; i < 10; i++) {
        cy.intercept('POST', '**/api/ai/chat', {
          fixture: 'ai/chat-response.json'
        }).as(`sendMessage${i}`)

        cy.get('[data-cy=chat-input]').type(`Message ${i}`)
        cy.get('[data-cy=send-button]').click()
        cy.wait(`@sendMessage${i}`)
      }
      
      // All messages should be visible
      cy.get('[data-cy=user-message]').should('have.length', 10)
      cy.get('[data-cy=ai-message]').should('have.length', 10)
    })
  })
})