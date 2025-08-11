describe('Appointments Management', () => {
  beforeEach(() => {
    cy.login('professional')
    cy.visit('/appointments')
    cy.waitForPageLoad()
  })

  describe('Calendar View', () => {
    it('should display calendar correctly', () => {
      cy.intercept('GET', '**/api/appointments*', {
        fixture: 'appointments/appointments-list.json'
      }).as('getAppointments')

      cy.visit('/appointments')
      cy.wait('@getAppointments')

      cy.get('[data-cy=calendar-view]').should('be.visible')
      cy.get('[data-cy=appointment-card]').should('have.length.at.least', 1)
      
      // Check calendar navigation
      cy.get('[data-cy=calendar-nav]').should('be.visible')
      cy.get('[data-cy=prev-week]').should('be.visible')
      cy.get('[data-cy=next-week]').should('be.visible')
      cy.get('[data-cy=today-button]').should('be.visible')
    })

    it('should switch between calendar views', () => {
      cy.get('[data-cy=view-selector]').should('be.visible')
      
      // Switch to monthly view
      cy.get('[data-cy=month-view]').click()
      cy.get('[data-cy=calendar-month]').should('be.visible')
      
      // Switch to weekly view
      cy.get('[data-cy=week-view]').click()
      cy.get('[data-cy=calendar-week]').should('be.visible')
      
      // Switch to daily view
      cy.get('[data-cy=day-view]').click()
      cy.get('[data-cy=calendar-day]').should('be.visible')
    })

    it('should navigate calendar dates', () => {
      // Navigate to next week
      cy.get('[data-cy=next-week]').click()
      cy.get('[data-cy=calendar-title]').should('not.contain', 'Hoje')
      
      // Navigate to previous week
      cy.get('[data-cy=prev-week]').click()
      
      // Return to today
      cy.get('[data-cy=today-button]').click()
      cy.get('[data-cy=calendar-title]').should('contain', 'Hoje')
    })

    it('should display appointment details on hover', () => {
      cy.intercept('GET', '**/api/appointments*', {
        fixture: 'appointments/appointments-list.json'
      }).as('getAppointments')

      cy.wait('@getAppointments')
      
      cy.get('[data-cy=appointment-card]').first().trigger('mouseover')
      
      cy.get('[data-cy=appointment-tooltip]').should('be.visible')
      cy.get('[data-cy=patient-name]').should('be.visible')
      cy.get('[data-cy=appointment-time]').should('be.visible')
      cy.get('[data-cy=appointment-status]').should('be.visible')
    })
  })

  describe('Appointment Creation', () => {
    it('should create a new appointment successfully', () => {
      cy.intercept('POST', '**/api/appointments', {
        statusCode: 201,
        fixture: 'appointments/new-appointment.json'
      }).as('createAppointment')

      cy.intercept('GET', '**/api/patients*', {
        fixture: 'patients/patients-list.json'
      }).as('getPatients')

      cy.get('[data-cy=new-appointment]').click()
      
      // Fill appointment form
      cy.get('[data-cy=patient-select]').click()
      cy.wait('@getPatients')
      cy.get('[data-cy=patient-option]').first().click()
      
      cy.get('[data-cy=appointment-date]').type('2024-07-15')
      cy.get('[data-cy=appointment-time]').type('14:30')
      cy.get('[data-cy=appointment-duration]').select('60')
      cy.get('[data-cy=appointment-type]').select('consultation')
      cy.get('[data-cy=appointment-notes]').type('Consulta de retorno - avaliação lombalgia')
      
      cy.get('[data-cy=save-appointment]').click()
      
      cy.wait('@createAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta agendada com sucesso')
      
      // Should see new appointment in calendar
      cy.get('[data-cy=appointment-card]').should('contain', '14:30')
    })

    it('should validate appointment conflicts', () => {
      cy.intercept('POST', '**/api/appointments/check-conflicts', {
        statusCode: 409,
        body: { error: 'Já existe uma consulta agendada para este horário' }
      }).as('checkConflicts')

      cy.get('[data-cy=new-appointment]').click()
      
      cy.get('[data-cy=patient-select]').click()
      cy.get('[data-cy=patient-option]').first().click()
      
      cy.get('[data-cy=appointment-date]').type('2024-07-15')
      cy.get('[data-cy=appointment-time]').type('10:00')
      
      // Trigger conflict check
      cy.get('[data-cy=appointment-duration]').select('60')
      cy.wait('@checkConflicts')
      
      cy.get('[data-cy=conflict-warning]').should('contain', 'Já existe uma consulta agendada')
    })

    it('should handle recurring appointments', () => {
      cy.intercept('POST', '**/api/appointments/recurring', {
        statusCode: 201,
        fixture: 'appointments/recurring-appointments.json'
      }).as('createRecurringAppointment')

      cy.get('[data-cy=new-appointment]').click()
      
      // Fill basic appointment info
      cy.get('[data-cy=patient-select]').click()
      cy.get('[data-cy=patient-option]').first().click()
      
      cy.get('[data-cy=appointment-date]').type('2024-07-15')
      cy.get('[data-cy=appointment-time]').type('14:30')
      cy.get('[data-cy=appointment-duration]').select('60')
      
      // Configure recurrence
      cy.get('[data-cy=recurring-checkbox]').check()
      cy.get('[data-cy=recurring-frequency]').select('weekly')
      cy.get('[data-cy=recurring-count]').type('8')
      cy.get('[data-cy=recurring-days]').within(() => {
        cy.get('[data-cy=monday]').check()
        cy.get('[data-cy=wednesday]').check()
        cy.get('[data-cy=friday]').check()
      })
      
      cy.get('[data-cy=save-appointment]').click()
      
      cy.wait('@createRecurringAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', '8 consultas recorrentes agendadas')
    })

    it('should validate required fields', () => {
      cy.get('[data-cy=new-appointment]').click()
      cy.get('[data-cy=save-appointment]').click()
      
      cy.get('[data-cy=patient-error]').should('contain', 'Paciente é obrigatório')
      cy.get('[data-cy=date-error]').should('contain', 'Data é obrigatória')
      cy.get('[data-cy=time-error]').should('contain', 'Horário é obrigatório')
    })

    it('should validate business hours', () => {
      cy.get('[data-cy=new-appointment]').click()
      
      cy.get('[data-cy=appointment-date]').type('2024-07-15')
      cy.get('[data-cy=appointment-time]').type('23:00')
      cy.get('[data-cy=appointment-duration]').select('60')
      
      cy.get('[data-cy=time-error]').should('contain', 'Horário fora do funcionamento')
    })
  })

  describe('Appointment Management', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/appointments/1', {
        fixture: 'appointments/appointment-details.json'
      }).as('getAppointmentDetails')
    })

    it('should view appointment details', () => {
      cy.get('[data-cy=appointment-card]').first().click()
      
      cy.wait('@getAppointmentDetails')
      
      cy.get('[data-cy=appointment-modal]').should('be.visible')
      cy.get('[data-cy=patient-info]').should('be.visible')
      cy.get('[data-cy=appointment-info]').should('be.visible')
      cy.get('[data-cy=appointment-notes]').should('be.visible')
    })

    it('should edit appointment successfully', () => {
      cy.intercept('PUT', '**/api/appointments/1', {
        statusCode: 200,
        fixture: 'appointments/updated-appointment.json'
      }).as('updateAppointment')

      cy.get('[data-cy=appointment-card]').first().click()
      cy.wait('@getAppointmentDetails')
      
      cy.get('[data-cy=edit-appointment]').click()
      
      // Update appointment details
      cy.get('[data-cy=appointment-time]').clear().type('15:00')
      cy.get('[data-cy=appointment-notes]').clear().type('Horário alterado conforme solicitação do paciente')
      
      cy.get('[data-cy=save-changes]').click()
      cy.wait('@updateAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta atualizada com sucesso')
    })

    it('should cancel appointment with reason', () => {
      cy.intercept('PATCH', '**/api/appointments/1/cancel', {
        statusCode: 200,
        fixture: 'appointments/cancelled-appointment.json'
      }).as('cancelAppointment')

      cy.get('[data-cy=appointment-card]').first().click()
      cy.wait('@getAppointmentDetails')
      
      cy.get('[data-cy=cancel-appointment]').click()
      
      // Provide cancellation reason
      cy.get('[data-cy=cancellation-reason]').select('patient-request')
      cy.get('[data-cy=cancellation-notes]').type('Paciente solicitou reagendamento')
      
      cy.get('[data-cy=confirm-cancellation]').click()
      cy.wait('@cancelAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta cancelada')
    })

    it('should reschedule appointment', () => {
      cy.intercept('PATCH', '**/api/appointments/1/reschedule', {
        statusCode: 200,
        fixture: 'appointments/rescheduled-appointment.json'
      }).as('rescheduleAppointment')

      cy.get('[data-cy=appointment-card]').first().click()
      cy.wait('@getAppointmentDetails')
      
      cy.get('[data-cy=reschedule-appointment]').click()
      
      // Select new date/time
      cy.get('[data-cy=new-date]').type('2024-07-17')
      cy.get('[data-cy=new-time]').type('16:00')
      cy.get('[data-cy=reschedule-reason]').type('Conflito de horário')
      
      cy.get('[data-cy=confirm-reschedule]').click()
      cy.wait('@rescheduleAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta reagendada')
    })

    it('should mark appointment as completed', () => {
      cy.intercept('PATCH', '**/api/appointments/1/complete', {
        statusCode: 200,
        fixture: 'appointments/completed-appointment.json'
      }).as('completeAppointment')

      cy.get('[data-cy=appointment-card]').first().click()
      cy.wait('@getAppointmentDetails')
      
      cy.get('[data-cy=complete-appointment]').click()
      
      // Add completion notes
      cy.get('[data-cy=completion-notes]').type('Sessão realizada conforme planejado')
      
      cy.get('[data-cy=confirm-completion]').click()
      cy.wait('@completeAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta finalizada')
    })
  })

  describe('Drag and Drop', () => {
    it('should reschedule appointment via drag and drop', () => {
      cy.intercept('PATCH', '**/api/appointments/1/reschedule', {
        statusCode: 200,
        fixture: 'appointments/rescheduled-appointment.json'
      }).as('rescheduleAppointment')

      // Drag appointment to different time slot
      cy.dragAndDrop('[data-cy=appointment-card]:first', '[data-cy=time-slot-15-00]')
      
      cy.wait('@rescheduleAppointment')
      
      cy.get('[data-cy=success-message]').should('contain', 'Consulta reagendada')
    })

    it('should prevent drag and drop conflicts', () => {
      // Attempt to drag to occupied slot
      cy.dragAndDrop('[data-cy=appointment-card]:first', '[data-cy=occupied-slot]')
      
      cy.get('[data-cy=conflict-message]').should('contain', 'Horário já ocupado')
    })
  })

  describe('Appointment Status', () => {
    it('should display different appointment statuses', () => {
      cy.intercept('GET', '**/api/appointments*', {
        fixture: 'appointments/appointments-mixed-status.json'
      }).as('getAppointments')

      cy.visit('/appointments')
      cy.wait('@getAppointments')

      // Check different status badges
      cy.get('[data-cy=status-confirmed]').should('be.visible')
      cy.get('[data-cy=status-pending]').should('be.visible')
      cy.get('[data-cy=status-completed]').should('be.visible')
      cy.get('[data-cy=status-cancelled]').should('be.visible')
    })

    it('should filter appointments by status', () => {
      cy.intercept('GET', '**/api/appointments*status=confirmed*', {
        fixture: 'appointments/confirmed-appointments.json'
      }).as('getConfirmedAppointments')

      cy.get('[data-cy=status-filter]').select('confirmed')
      cy.wait('@getConfirmedAppointments')
      
      cy.get('[data-cy=appointment-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=status-badge]').should('contain', 'Confirmada')
      })
    })
  })

  describe('Notifications and Reminders', () => {
    it('should send appointment reminders', () => {
      cy.intercept('POST', '**/api/appointments/1/send-reminder', {
        statusCode: 200,
        body: { message: 'Lembrete enviado com sucesso' }
      }).as('sendReminder')

      cy.get('[data-cy=appointment-card]').first().click()
      cy.get('[data-cy=send-reminder]').click()
      
      cy.wait('@sendReminder')
      
      cy.get('[data-cy=success-message]').should('contain', 'Lembrete enviado')
    })

    it('should display upcoming appointments notifications', () => {
      cy.intercept('GET', '**/api/appointments/upcoming', {
        fixture: 'appointments/upcoming-appointments.json'
      }).as('getUpcomingAppointments')

      cy.visit('/appointments')
      cy.wait('@getUpcomingAppointments')
      
      cy.get('[data-cy=notifications-panel]').should('be.visible')
      cy.get('[data-cy=upcoming-appointment]').should('have.length.at.least', 1)
    })
  })

  describe('Reports and Analytics', () => {
    it('should display appointment statistics', () => {
      cy.visit('/appointments/reports')
      
      cy.intercept('GET', '**/api/appointments/statistics', {
        fixture: 'appointments/statistics.json'
      }).as('getStatistics')
      
      cy.wait('@getStatistics')
      
      cy.get('[data-cy=total-appointments]').should('contain', '142')
      cy.get('[data-cy=confirmed-rate]').should('contain', '87%')
      cy.get('[data-cy=no-show-rate]').should('contain', '5%')
      cy.get('[data-cy=cancellation-rate]').should('contain', '8%')
    })

    it('should generate appointment reports', () => {
      cy.visit('/appointments/reports')
      
      cy.intercept('POST', '**/api/appointments/reports/generate', {
        statusCode: 200,
        fixture: 'appointments/report-data.json'
      }).as('generateReport')

      // Select report parameters
      cy.get('[data-cy=report-period]').select('monthly')
      cy.get('[data-cy=start-date]').type('2024-01-01')
      cy.get('[data-cy=end-date]').type('2024-01-31')
      cy.get('[data-cy=include-cancelled]').check()
      
      cy.get('[data-cy=generate-report]').click()
      cy.wait('@generateReport')
      
      cy.get('[data-cy=report-table]').should('be.visible')
      cy.get('[data-cy=download-pdf]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.checkA11y()
    })

    it('should support keyboard navigation in calendar', () => {
      cy.get('[data-cy=calendar-view]').focus()
      
      // Navigate with arrow keys
      cy.focused().type('{rightarrow}')
      cy.focused().should('have.attr', 'data-cy').and('match', /appointment-card|time-slot/)
      
      // Select with Enter
      cy.focused().type('{enter}')
      cy.get('[data-cy=appointment-modal]').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/appointments*', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('getAppointmentsError')

      cy.visit('/appointments')
      cy.wait('@getAppointmentsError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro ao carregar consultas')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should handle network errors', () => {
      cy.intercept('GET', '**/api/appointments*', { forceNetworkError: true }).as('networkError')

      cy.visit('/appointments')
      cy.wait('@networkError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro de conexão')
    })
  })

  describe('Performance', () => {
    it('should load appointments within acceptable time', () => {
      const start = performance.now()
      
      cy.intercept('GET', '**/api/appointments*', {
        fixture: 'appointments/appointments-list.json',
        delay: 100
      }).as('getAppointments')

      cy.visit('/appointments')
      cy.wait('@getAppointments')
      
      cy.then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(2000) // 2 seconds max
      })
    })

    it('should handle large appointment datasets efficiently', () => {
      cy.intercept('GET', '**/api/appointments*', {
        fixture: 'appointments/large-appointments-list.json'
      }).as('getLargeAppointmentsList')

      cy.visit('/appointments')
      cy.wait('@getLargeAppointmentsList')
      
      // Should render within reasonable time
      cy.get('[data-cy=calendar-view]').should('be.visible')
      cy.get('[data-cy=appointment-card]').should('have.length.greaterThan', 50)
    })
  })
})