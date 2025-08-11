describe('Patient Management', () => {
  beforeEach(() => {
    cy.login('professional')
    cy.visit('/patients')
    cy.waitForPageLoad()
  })

  describe('Patient List', () => {
    it('should display patients list correctly', () => {
      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/patients-list.json'
      }).as('getPatients')

      cy.visit('/patients')
      cy.wait('@getPatients')

      cy.get('[data-cy=patients-table]').should('be.visible')
      cy.get('[data-cy=patient-row]').should('have.length.at.least', 1)
      
      // Check table headers
      cy.contains('Nome').should('be.visible')
      cy.contains('Email').should('be.visible') 
      cy.contains('Telefone').should('be.visible')
      cy.contains('Idade').should('be.visible')
      cy.contains('Última consulta').should('be.visible')
    })

    it('should search patients correctly', () => {
      cy.intercept('GET', '**/api/patients*search=João*', {
        fixture: 'patients/patients-search-results.json'
      }).as('searchPatients')

      cy.get('[data-cy=search-input]').type('João')
      cy.wait('@searchPatients')

      cy.get('[data-cy=patient-row]').should('contain', 'João')
    })

    it('should filter patients by status', () => {
      cy.intercept('GET', '**/api/patients*status=active*', {
        fixture: 'patients/active-patients.json'
      }).as('filterPatients')

      cy.get('[data-cy=status-filter]').click()
      cy.get('[data-cy=status-active]').click()
      
      cy.wait('@filterPatients')
      
      cy.get('[data-cy=patient-row]').each(($row) => {
        cy.wrap($row).should('contain', 'Ativo')
      })
    })

    it('should paginate patients correctly', () => {
      cy.intercept('GET', '**/api/patients*page=1*', {
        fixture: 'patients/patients-page-1.json'
      }).as('getPage1')
      
      cy.intercept('GET', '**/api/patients*page=2*', {
        fixture: 'patients/patients-page-2.json'  
      }).as('getPage2')

      cy.wait('@getPage1')
      
      cy.get('[data-cy=pagination-next]').click()
      cy.wait('@getPage2')
      
      cy.url().should('include', 'page=2')
    })

    it('should navigate to patient details', () => {
      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/patients-list.json'
      }).as('getPatients')

      cy.wait('@getPatients')
      
      cy.get('[data-cy=patient-row]').first().click()
      
      cy.url().should('match', /\/patients\/\d+/)
    })
  })

  describe('Patient Creation', () => {
    it('should create a new patient successfully', () => {
      cy.intercept('POST', '**/api/patients', {
        statusCode: 201,
        fixture: 'patients/new-patient.json'
      }).as('createPatient')

      cy.get('[data-cy=new-patient-button]').click()
      
      // Fill patient form
      cy.get('[data-cy=patient-name]').type('Maria Silva')
      cy.get('[data-cy=patient-email]').type('maria@example.com')
      cy.get('[data-cy=patient-phone]').type('11999887766')
      cy.get('[data-cy=patient-document]').type('12345678901')
      cy.get('[data-cy=patient-birthdate]').type('1990-05-15')
      cy.get('[data-cy=patient-gender]').select('F')
      
      // Address information
      cy.get('[data-cy=patient-address]').type('Rua Exemplo, 123')
      cy.get('[data-cy=patient-city]').type('São Paulo')
      cy.get('[data-cy=patient-state]').select('SP')
      cy.get('[data-cy=patient-zipcode]').type('01234567')
      
      cy.get('[data-cy=submit-button]').click()
      
      cy.wait('@createPatient')
      
      // Should redirect to patient details
      cy.url().should('match', /\/patients\/\d+/)
      cy.get('[data-cy=success-message]').should('contain', 'Paciente criado com sucesso')
    })

    it('should validate required fields', () => {
      cy.get('[data-cy=new-patient-button]').click()
      cy.get('[data-cy=submit-button]').click()
      
      cy.get('[data-cy=name-error]').should('contain', 'Nome é obrigatório')
      cy.get('[data-cy=email-error]').should('contain', 'Email é obrigatório')
      cy.get('[data-cy=document-error]').should('contain', 'CPF é obrigatório')
    })

    it('should validate CPF format', () => {
      cy.get('[data-cy=new-patient-button]').click()
      
      cy.get('[data-cy=patient-document]').type('123')
      cy.get('[data-cy=patient-name]').click() // Trigger validation
      
      cy.get('[data-cy=document-error]').should('contain', 'CPF deve ter 11 dígitos')
    })

    it('should handle duplicate CPF error', () => {
      cy.intercept('POST', '**/api/patients', {
        statusCode: 400,
        body: { error: 'Paciente já existe com esse CPF' }
      }).as('createPatient')

      cy.get('[data-cy=new-patient-button]').click()
      
      // Fill form with existing CPF
      cy.get('[data-cy=patient-name]').type('João Santos')
      cy.get('[data-cy=patient-email]').type('joao@example.com')
      cy.get('[data-cy=patient-document]').type('12345678901')
      
      cy.get('[data-cy=submit-button]').click()
      cy.wait('@createPatient')
      
      cy.get('[data-cy=error-message]').should('contain', 'Paciente já existe com esse CPF')
    })
  })

  describe('Patient Details', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/patients/1', {
        fixture: 'patients/patient-details.json'
      }).as('getPatientDetails')

      cy.visit('/patients/1')
      cy.wait('@getPatientDetails')
    })

    it('should display patient information correctly', () => {
      cy.get('[data-cy=patient-name]').should('contain', 'João Silva')
      cy.get('[data-cy=patient-email]').should('contain', 'joao@example.com')
      cy.get('[data-cy=patient-phone]').should('contain', '(11) 99988-7766')
      cy.get('[data-cy=patient-age]').should('contain', '39 anos')
    })

    it('should display medical records tab', () => {
      cy.get('[data-cy=medical-records-tab]').click()
      
      cy.intercept('GET', '**/api/patients/1/medical-records', {
        fixture: 'patients/medical-records.json'
      }).as('getMedicalRecords')
      
      cy.wait('@getMedicalRecords')
      
      cy.get('[data-cy=medical-record-item]').should('have.length.at.least', 1)
    })

    it('should display evolutions tab', () => {
      cy.get('[data-cy=evolutions-tab]').click()
      
      cy.intercept('GET', '**/api/patients/1/evolutions', {
        fixture: 'patients/evolutions.json'
      }).as('getEvolutions')
      
      cy.wait('@getEvolutions')
      
      cy.get('[data-cy=evolution-item]').should('have.length.at.least', 1)
    })

    it('should create new medical record', () => {
      cy.intercept('POST', '**/api/patients/1/medical-records', {
        statusCode: 201,
        fixture: 'patients/new-medical-record.json'
      }).as('createMedicalRecord')

      cy.get('[data-cy=medical-records-tab]').click()
      cy.get('[data-cy=new-medical-record]').click()
      
      // Fill medical record form
      cy.get('[data-cy=chief-complaint]').type('Dor lombar há 2 semanas')
      cy.get('[data-cy=history]').type('Paciente relata início após esforço físico')
      cy.get('[data-cy=examination]').type('Dor à palpação L4-L5')
      cy.get('[data-cy=assessment]').type('Lombalgia mecânica')
      cy.get('[data-cy=plan]').type('Fisioterapia 3x/semana')
      
      cy.get('[data-cy=save-medical-record]').click()
      cy.wait('@createMedicalRecord')
      
      cy.get('[data-cy=success-message]').should('contain', 'Prontuário criado com sucesso')
    })

    it('should create new evolution (SOAP)', () => {
      cy.intercept('POST', '**/api/patients/1/evolutions', {
        statusCode: 201,
        fixture: 'patients/new-evolution.json'
      }).as('createEvolution')

      cy.get('[data-cy=evolutions-tab]').click()
      cy.get('[data-cy=new-evolution]').click()
      
      // Fill SOAP form
      cy.get('[data-cy=subjective]').type('Paciente relata melhora da dor (8→5)')
      cy.get('[data-cy=objective]').type('ADM: flexão 45°, extensão 10°')
      cy.get('[data-cy=assessment]').type('Evolução favorável')
      cy.get('[data-cy=plan]').type('Continuar fisioterapia')
      cy.get('[data-cy=pain-level]').select('5')
      
      cy.get('[data-cy=save-evolution]').click()
      cy.wait('@createEvolution')
      
      cy.get('[data-cy=success-message]').should('contain', 'Evolução criada com sucesso')
    })

    it('should edit patient information', () => {
      cy.intercept('PUT', '**/api/patients/1', {
        statusCode: 200,
        fixture: 'patients/updated-patient.json'
      }).as('updatePatient')

      cy.get('[data-cy=edit-patient]').click()
      
      cy.get('[data-cy=patient-phone]').clear().type('11888776655')
      cy.get('[data-cy=save-changes]').click()
      
      cy.wait('@updatePatient')
      
      cy.get('[data-cy=success-message]').should('contain', 'Paciente atualizado com sucesso')
      cy.get('[data-cy=patient-phone]').should('contain', '11888776655')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.get('body').tab()
      cy.focused().should('be.visible')
      
      // Navigate through patient list
      cy.get('[data-cy=patient-row]').first().focus()
      cy.focused().type('{enter}')
      
      cy.url().should('match', /\/patients\/\d+/)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/patients*', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('getPatientsError')

      cy.visit('/patients')
      cy.wait('@getPatientsError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro ao carregar pacientes')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should handle network errors', () => {
      cy.intercept('GET', '**/api/patients*', { forceNetworkError: true }).as('networkError')

      cy.visit('/patients')
      cy.wait('@networkError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro de conexão')
    })
  })

  describe('Performance', () => {
    it('should load patients list within acceptable time', () => {
      const start = performance.now()
      
      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/patients-list.json',
        delay: 100
      }).as('getPatients')

      cy.visit('/patients')
      cy.wait('@getPatients')
      
      cy.then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(2000) // 2 seconds max
      })
    })

    it('should handle large datasets efficiently', () => {
      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/large-patients-list.json'
      }).as('getLargePatientsList')

      cy.visit('/patients')
      cy.wait('@getLargePatientsList')
      
      // Should render within reasonable time
      cy.get('[data-cy=patients-table]').should('be.visible')
      cy.get('[data-cy=patient-row]').should('have.length', 100)
    })
  })
})