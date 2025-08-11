describe('Exercise Library Management', () => {
  beforeEach(() => {
    cy.login('professional')
    cy.visit('/exercises')
    cy.waitForPageLoad()
  })

  describe('Exercise Catalog', () => {
    it('should display exercise library correctly', () => {
      cy.intercept('GET', '**/api/exercises*', {
        fixture: 'exercises/exercises-list.json'
      }).as('getExercises')

      cy.visit('/exercises')
      cy.wait('@getExercises')

      cy.get('[data-cy=exercises-grid]').should('be.visible')
      cy.get('[data-cy=exercise-card]').should('have.length.at.least', 1)
      
      // Check exercise card elements
      cy.get('[data-cy=exercise-card]').first().within(() => {
        cy.get('[data-cy=exercise-thumbnail]').should('be.visible')
        cy.get('[data-cy=exercise-title]').should('be.visible')
        cy.get('[data-cy=exercise-category]').should('be.visible')
        cy.get('[data-cy=exercise-duration]').should('be.visible')
        cy.get('[data-cy=exercise-difficulty]').should('be.visible')
      })
    })

    it('should search exercises correctly', () => {
      cy.intercept('GET', '**/api/exercises*search=alongamento*', {
        fixture: 'exercises/exercises-search-results.json'
      }).as('searchExercises')

      cy.get('[data-cy=search-input]').type('alongamento')
      cy.wait('@searchExercises')

      cy.get('[data-cy=exercise-card]').should('contain', 'Alongamento')
    })

    it('should filter exercises by category', () => {
      cy.intercept('GET', '**/api/exercises*category=fortalecimento*', {
        fixture: 'exercises/strengthening-exercises.json'
      }).as('filterExercises')

      cy.get('[data-cy=category-filter]').click()
      cy.get('[data-cy=category-strengthening]').click()
      
      cy.wait('@filterExercises')
      
      cy.get('[data-cy=exercise-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=exercise-category]').should('contain', 'Fortalecimento')
      })
    })

    it('should filter exercises by body part', () => {
      cy.intercept('GET', '**/api/exercises*body_part=lombar*', {
        fixture: 'exercises/lumbar-exercises.json'
      }).as('filterByBodyPart')

      cy.get('[data-cy=body-part-filter]').click()
      cy.get('[data-cy=body-part-lombar]').click()
      
      cy.wait('@filterByBodyPart')
      
      cy.get('[data-cy=exercise-card]').should('have.length.at.least', 1)
    })

    it('should filter exercises by difficulty', () => {
      cy.intercept('GET', '**/api/exercises*difficulty=iniciante*', {
        fixture: 'exercises/beginner-exercises.json'
      }).as('filterByDifficulty')

      cy.get('[data-cy=difficulty-filter]').click()
      cy.get('[data-cy=difficulty-beginner]').click()
      
      cy.wait('@filterByDifficulty')
      
      cy.get('[data-cy=exercise-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=exercise-difficulty]').should('contain', 'Iniciante')
      })
    })

    it('should sort exercises correctly', () => {
      cy.intercept('GET', '**/api/exercises*sort=popularity*', {
        fixture: 'exercises/popular-exercises.json'
      }).as('sortExercises')

      cy.get('[data-cy=sort-select]').select('popularity')
      cy.wait('@sortExercises')
      
      // First exercise should be most popular
      cy.get('[data-cy=exercise-card]').first().should('contain', 'Popular')
    })
  })

  describe('Exercise Details', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/exercises/1', {
        fixture: 'exercises/exercise-details.json'
      }).as('getExerciseDetails')
    })

    it('should display exercise details correctly', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      
      cy.wait('@getExerciseDetails')
      
      cy.get('[data-cy=exercise-modal]').should('be.visible')
      cy.get('[data-cy=exercise-video]').should('be.visible')
      cy.get('[data-cy=exercise-title]').should('be.visible')
      cy.get('[data-cy=exercise-description]').should('be.visible')
      cy.get('[data-cy=exercise-instructions]').should('be.visible')
      cy.get('[data-cy=exercise-precautions]').should('be.visible')
    })

    it('should play exercise video', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      cy.wait('@getExerciseDetails')
      
      cy.get('[data-cy=video-player]').should('be.visible')
      cy.get('[data-cy=play-button]').click()
      
      // Video should be playing
      cy.get('[data-cy=video-player]').should('have.attr', 'data-playing', 'true')
    })

    it('should control video playback', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      cy.wait('@getExerciseDetails')
      
      // Test video controls
      cy.get('[data-cy=play-button]').click()
      cy.get('[data-cy=pause-button]').should('be.visible')
      
      cy.get('[data-cy=pause-button]').click()
      cy.get('[data-cy=play-button]').should('be.visible')
      
      // Test speed control
      cy.get('[data-cy=speed-control]').select('0.5x')
      cy.get('[data-cy=video-player]').should('have.attr', 'data-speed', '0.5')
    })

    it('should display exercise variations', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      cy.wait('@getExerciseDetails')
      
      cy.get('[data-cy=variations-tab]').click()
      
      cy.intercept('GET', '**/api/exercises/1/variations', {
        fixture: 'exercises/exercise-variations.json'
      }).as('getVariations')
      
      cy.wait('@getVariations')
      
      cy.get('[data-cy=variation-card]').should('have.length.at.least', 1)
    })

    it('should show exercise progression', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      cy.wait('@getExerciseDetails')
      
      cy.get('[data-cy=progression-tab]').click()
      
      cy.get('[data-cy=progression-level]').should('have.length.at.least', 3)
      cy.get('[data-cy=current-level]').should('be.visible')
      cy.get('[data-cy=next-level]').should('be.visible')
    })
  })

  describe('Patient Exercise Assignment', () => {
    it('should assign exercise to patient successfully', () => {
      cy.intercept('POST', '**/api/patients/1/exercises', {
        statusCode: 201,
        fixture: 'exercises/assigned-exercise.json'
      }).as('assignExercise')

      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/patients-list.json'
      }).as('getPatients')

      cy.get('[data-cy=exercise-card]').first().click()
      cy.get('[data-cy=assign-to-patient]').click()
      
      // Select patient
      cy.get('[data-cy=patient-select]').click()
      cy.wait('@getPatients')
      cy.get('[data-cy=patient-option]').first().click()
      
      // Configure assignment
      cy.get('[data-cy=sets]').type('3')
      cy.get('[data-cy=repetitions]').type('12')
      cy.get('[data-cy=duration]').type('30')
      cy.get('[data-cy=frequency]').select('daily')
      cy.get('[data-cy=start-date]').type('2024-07-15')
      cy.get('[data-cy=end-date]').type('2024-08-15')
      cy.get('[data-cy=notes]').type('Executar devagar, focando na técnica correta')
      
      cy.get('[data-cy=assign-exercise]').click()
      cy.wait('@assignExercise')
      
      cy.get('[data-cy=success-message]').should('contain', 'Exercício atribuído com sucesso')
    })

    it('should create exercise program for patient', () => {
      cy.intercept('POST', '**/api/patients/1/programs', {
        statusCode: 201,
        fixture: 'exercises/created-program.json'
      }).as('createProgram')

      cy.visit('/patients/1/programs')
      cy.get('[data-cy=create-program]').click()
      
      // Program details
      cy.get('[data-cy=program-name]').type('Programa Reabilitação Lombar')
      cy.get('[data-cy=program-description]').type('Programa focado na reabilitação da coluna lombar')
      cy.get('[data-cy=program-duration]').type('8')
      cy.get('[data-cy=program-frequency]').select('3x-week')
      
      // Add exercises to program
      cy.get('[data-cy=add-exercise]').click()
      
      cy.get('[data-cy=exercise-search]').type('alongamento lombar')
      cy.get('[data-cy=exercise-result]').first().click()
      
      // Configure exercise parameters
      cy.get('[data-cy=exercise-sets]').type('2')
      cy.get('[data-cy=exercise-reps]').type('10')
      cy.get('[data-cy=exercise-hold]').type('15')
      
      cy.get('[data-cy=add-to-program]').click()
      
      // Save program
      cy.get('[data-cy=save-program]').click()
      cy.wait('@createProgram')
      
      cy.get('[data-cy=success-message]').should('contain', 'Programa criado com sucesso')
    })

    it('should validate exercise assignment parameters', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      cy.get('[data-cy=assign-to-patient]').click()
      
      cy.get('[data-cy=assign-exercise]').click()
      
      cy.get('[data-cy=patient-error]').should('contain', 'Paciente é obrigatório')
      cy.get('[data-cy=sets-error]').should('contain', 'Número de séries é obrigatório')
      cy.get('[data-cy=repetitions-error]').should('contain', 'Repetições são obrigatórias')
    })
  })

  describe('Exercise Execution Tracking', () => {
    it('should track patient exercise completion', () => {
      cy.login('patient')
      cy.visit('/patient/exercises')
      
      cy.intercept('GET', '**/api/patient/exercises/assigned', {
        fixture: 'exercises/assigned-exercises.json'
      }).as('getAssignedExercises')
      
      cy.wait('@getAssignedExercises')
      
      cy.get('[data-cy=assigned-exercise]').first().click()
      cy.get('[data-cy=start-exercise]').click()
      
      // Exercise execution tracking
      cy.get('[data-cy=exercise-timer]').should('be.visible')
      cy.get('[data-cy=current-set]').should('contain', '1')
      cy.get('[data-cy=current-rep]').should('contain', '1')
      
      // Complete set
      cy.get('[data-cy=complete-set]').click()
      cy.get('[data-cy=current-set]').should('contain', '2')
    })

    it('should record exercise feedback', () => {
      cy.intercept('POST', '**/api/patient/exercises/1/feedback', {
        statusCode: 200,
        fixture: 'exercises/exercise-feedback.json'
      }).as('submitFeedback')

      cy.login('patient')
      cy.visit('/patient/exercises')
      
      cy.get('[data-cy=assigned-exercise]').first().click()
      cy.get('[data-cy=complete-exercise]').click()
      
      // Provide feedback
      cy.get('[data-cy=difficulty-rating]').click() // Rate difficulty
      cy.get('[data-cy=pain-level]').type('3')
      cy.get('[data-cy=completion-notes]').type('Exercício executado conforme orientação')
      
      cy.get('[data-cy=submit-feedback]').click()
      cy.wait('@submitFeedback')
      
      cy.get('[data-cy=success-message]').should('contain', 'Feedback registrado')
    })

    it('should display exercise progress', () => {
      cy.login('patient')
      cy.visit('/patient/exercises/progress')
      
      cy.intercept('GET', '**/api/patient/exercises/progress', {
        fixture: 'exercises/exercise-progress.json'
      }).as('getProgress')
      
      cy.wait('@getProgress')
      
      cy.get('[data-cy=progress-chart]').should('be.visible')
      cy.get('[data-cy=completion-rate]').should('contain', '87%')
      cy.get('[data-cy=streak-counter]').should('contain', '5 dias')
    })
  })

  describe('Exercise Creation and Management', () => {
    it('should create new exercise successfully', () => {
      cy.login('admin')
      
      cy.intercept('POST', '**/api/exercises', {
        statusCode: 201,
        fixture: 'exercises/new-exercise.json'
      }).as('createExercise')

      cy.visit('/exercises/manage')
      cy.get('[data-cy=create-exercise]').click()
      
      // Fill exercise details
      cy.get('[data-cy=exercise-name]').type('Flexão de Quadril Ativo')
      cy.get('[data-cy=exercise-description]').type('Exercício para fortalecimento do quadril')
      cy.get('[data-cy=exercise-category]').select('fortalecimento')
      cy.get('[data-cy=body-parts]').select(['quadril', 'lombar'])
      cy.get('[data-cy=difficulty-level]').select('intermediario')
      cy.get('[data-cy=duration]').type('30')
      
      // Instructions
      cy.get('[data-cy=instructions]').type('1. Deite-se de costas\n2. Flexione o quadril até 90°\n3. Mantenha por 5 segundos')
      cy.get('[data-cy=precautions]').type('Não force além do limite de dor')
      
      // Upload video
      cy.get('[data-cy=video-upload]').attachFile('sample-video.mp4')
      
      // Upload thumbnail
      cy.get('[data-cy=thumbnail-upload]').attachFile('sample-thumbnail.jpg')
      
      cy.get('[data-cy=save-exercise]').click()
      cy.wait('@createExercise')
      
      cy.get('[data-cy=success-message]').should('contain', 'Exercício criado com sucesso')
    })

    it('should edit existing exercise', () => {
      cy.login('admin')
      
      cy.intercept('PUT', '**/api/exercises/1', {
        statusCode: 200,
        fixture: 'exercises/updated-exercise.json'
      }).as('updateExercise')

      cy.visit('/exercises/manage')
      
      cy.get('[data-cy=exercise-row]').first().within(() => {
        cy.get('[data-cy=edit-exercise]').click()
      })
      
      // Update exercise details
      cy.get('[data-cy=exercise-description]').clear().type('Descrição atualizada do exercício')
      cy.get('[data-cy=difficulty-level]').select('avancado')
      
      cy.get('[data-cy=save-changes]').click()
      cy.wait('@updateExercise')
      
      cy.get('[data-cy=success-message]').should('contain', 'Exercício atualizado')
    })

    it('should validate exercise form', () => {
      cy.login('admin')
      
      cy.visit('/exercises/manage')
      cy.get('[data-cy=create-exercise]').click()
      
      cy.get('[data-cy=save-exercise]').click()
      
      cy.get('[data-cy=name-error]').should('contain', 'Nome é obrigatório')
      cy.get('[data-cy=description-error]').should('contain', 'Descrição é obrigatória')
      cy.get('[data-cy=category-error]').should('contain', 'Categoria é obrigatória')
    })
  })

  describe('Exercise Analytics', () => {
    it('should display exercise usage statistics', () => {
      cy.login('admin')
      cy.visit('/exercises/analytics')
      
      cy.intercept('GET', '**/api/exercises/analytics', {
        fixture: 'exercises/analytics-data.json'
      }).as('getAnalytics')
      
      cy.wait('@getAnalytics')
      
      // Check key metrics
      cy.get('[data-cy=total-exercises]').should('contain', '156')
      cy.get('[data-cy=most-used-exercise]').should('be.visible')
      cy.get('[data-cy=completion-rate]').should('contain', '78%')
      cy.get('[data-cy=patient-satisfaction]').should('contain', '4.2/5')
    })

    it('should generate exercise reports', () => {
      cy.login('admin')
      cy.visit('/exercises/reports')
      
      cy.intercept('POST', '**/api/exercises/reports/generate', {
        statusCode: 200,
        fixture: 'exercises/report-data.json'
      }).as('generateReport')

      // Select report parameters
      cy.get('[data-cy=report-type]').select('usage-statistics')
      cy.get('[data-cy=date-range]').select('last-month')
      cy.get('[data-cy=category-filter]').select('all')
      
      cy.get('[data-cy=generate-report]').click()
      cy.wait('@generateReport')
      
      cy.get('[data-cy=report-table]').should('be.visible')
      cy.get('[data-cy=download-excel]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.get('[data-cy=exercises-grid]').focus()
      
      // Navigate through exercise cards
      cy.get('[data-cy=exercise-card]').first().focus()
      cy.focused().type('{rightarrow}')
      cy.focused().should('have.attr', 'data-cy', 'exercise-card')
      
      // Select exercise with Enter
      cy.focused().type('{enter}')
      cy.get('[data-cy=exercise-modal]').should('be.visible')
    })

    it('should provide proper video accessibility', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      
      // Video should have proper accessibility attributes
      cy.get('[data-cy=video-player]').should('have.attr', 'aria-label')
      cy.get('[data-cy=play-button]').should('have.attr', 'aria-label', 'Reproduzir vídeo')
      cy.get('[data-cy=video-transcript]').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/exercises*', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('getExercisesError')

      cy.visit('/exercises')
      cy.wait('@getExercisesError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro ao carregar exercícios')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should handle video loading errors', () => {
      cy.get('[data-cy=exercise-card]').first().click()
      
      // Simulate video loading error
      cy.get('[data-cy=video-player]').trigger('error')
      
      cy.get('[data-cy=video-error]').should('contain', 'Erro ao carregar vídeo')
      cy.get('[data-cy=reload-video]').should('be.visible')
    })
  })

  describe('Performance', () => {
    it('should load exercises within acceptable time', () => {
      const start = performance.now()
      
      cy.intercept('GET', '**/api/exercises*', {
        fixture: 'exercises/exercises-list.json',
        delay: 100
      }).as('getExercises')

      cy.visit('/exercises')
      cy.wait('@getExercises')
      
      cy.then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(2000) // 2 seconds max
      })
    })

    it('should handle large exercise library efficiently', () => {
      cy.intercept('GET', '**/api/exercises*', {
        fixture: 'exercises/large-exercises-list.json'
      }).as('getLargeExercisesList')

      cy.visit('/exercises')
      cy.wait('@getLargeExercisesList')
      
      // Should render within reasonable time
      cy.get('[data-cy=exercises-grid]').should('be.visible')
      cy.get('[data-cy=exercise-card]').should('have.length.greaterThan', 100)
    })

    it('should lazy load exercise videos', () => {
      cy.visit('/exercises')
      
      // Videos should not load until exercise is opened
      cy.get('[data-cy=exercise-card]').should('not.have.descendant', 'video')
      
      cy.get('[data-cy=exercise-card]').first().click()
      
      // Video should load when modal is opened
      cy.get('[data-cy=video-player]').should('be.visible')
    })
  })
})