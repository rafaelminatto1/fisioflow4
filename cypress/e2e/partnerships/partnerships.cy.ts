describe('Partnerships Management', () => {
  beforeEach(() => {
    cy.login('admin')
    cy.visit('/partnerships')
    cy.waitForPageLoad()
  })

  describe('Partners List', () => {
    it('should display partners list correctly', () => {
      cy.intercept('GET', '**/api/partners*', {
        fixture: 'partnerships/partners-list.json'
      }).as('getPartners')

      cy.visit('/partnerships')
      cy.wait('@getPartners')

      cy.get('[data-cy=partners-table]').should('be.visible')
      cy.get('[data-cy=partner-row]').should('have.length.at.least', 1)
      
      // Check table headers
      cy.contains('Nome').should('be.visible')
      cy.contains('Empresa').should('be.visible')
      cy.contains('Status').should('be.visible')
      cy.contains('Comissão').should('be.visible')
      cy.contains('Total Vendas').should('be.visible')
    })

    it('should search partners correctly', () => {
      cy.intercept('GET', '**/api/partners*search=João*', {
        fixture: 'partnerships/partners-search-results.json'
      }).as('searchPartners')

      cy.get('[data-cy=search-input]').type('João')
      cy.wait('@searchPartners')

      cy.get('[data-cy=partner-row]').should('contain', 'João')
    })

    it('should filter partners by status', () => {
      cy.intercept('GET', '**/api/partners*status=active*', {
        fixture: 'partnerships/active-partners.json'
      }).as('filterPartners')

      cy.get('[data-cy=status-filter]').click()
      cy.get('[data-cy=status-active]').click()
      
      cy.wait('@filterPartners')
      
      cy.get('[data-cy=partner-row]').each(($row) => {
        cy.wrap($row).should('contain', 'Ativo')
      })
    })

    it('should navigate to partner details', () => {
      cy.intercept('GET', '**/api/partners*', {
        fixture: 'partnerships/partners-list.json'
      }).as('getPartners')

      cy.wait('@getPartners')
      
      cy.get('[data-cy=partner-row]').first().click()
      
      cy.url().should('match', /\/partnerships\/\d+/)
    })
  })

  describe('Partner Creation', () => {
    it('should create a new partner successfully', () => {
      cy.intercept('POST', '**/api/partners', {
        statusCode: 201,
        fixture: 'partnerships/new-partner.json'
      }).as('createPartner')

      cy.get('[data-cy=new-partner-button]').click()
      
      // Fill partner form
      cy.get('[data-cy=partner-name]').type('Carlos Silva')
      cy.get('[data-cy=partner-email]').type('carlos@partner.com')
      cy.get('[data-cy=partner-phone]').type('11999887766')
      cy.get('[data-cy=partner-document]').type('12345678901')
      cy.get('[data-cy=partner-company]').type('Clínica Exemplo Ltda')
      cy.get('[data-cy=partner-commission-rate]').type('15')
      
      // Banking information
      cy.get('[data-cy=bank-name]').type('Banco do Brasil')
      cy.get('[data-cy=bank-branch]').type('1234')
      cy.get('[data-cy=bank-account]').type('567890')
      cy.get('[data-cy=bank-account-digit]').type('1')
      cy.get('[data-cy=account-type]').select('corrente')
      
      // Address information
      cy.get('[data-cy=partner-address]').type('Rua Parceria, 456')
      cy.get('[data-cy=partner-city]').type('São Paulo')
      cy.get('[data-cy=partner-state]').select('SP')
      cy.get('[data-cy=partner-zipcode]').type('01234567')
      
      cy.get('[data-cy=submit-button]').click()
      
      cy.wait('@createPartner')
      
      // Should redirect to partner details
      cy.url().should('match', /\/partnerships\/\d+/)
      cy.get('[data-cy=success-message]').should('contain', 'Parceiro criado com sucesso')
    })

    it('should validate required fields', () => {
      cy.get('[data-cy=new-partner-button]').click()
      cy.get('[data-cy=submit-button]').click()
      
      cy.get('[data-cy=name-error]').should('contain', 'Nome é obrigatório')
      cy.get('[data-cy=email-error]').should('contain', 'Email é obrigatório')
      cy.get('[data-cy=document-error]').should('contain', 'CPF/CNPJ é obrigatório')
      cy.get('[data-cy=commission-error]').should('contain', 'Taxa de comissão é obrigatória')
    })

    it('should validate commission rate', () => {
      cy.get('[data-cy=new-partner-button]').click()
      
      cy.get('[data-cy=partner-commission-rate]').type('150')
      cy.get('[data-cy=partner-name]').click() // Trigger validation
      
      cy.get('[data-cy=commission-error]').should('contain', 'Taxa deve estar entre 0 e 100%')
    })

    it('should handle duplicate email error', () => {
      cy.intercept('POST', '**/api/partners', {
        statusCode: 400,
        body: { error: 'Email já está sendo usado por outro parceiro' }
      }).as('createPartner')

      cy.get('[data-cy=new-partner-button]').click()
      
      // Fill form with existing email
      cy.get('[data-cy=partner-name]').type('João Santos')
      cy.get('[data-cy=partner-email]').type('existing@partner.com')
      cy.get('[data-cy=partner-document]').type('12345678901')
      cy.get('[data-cy=partner-commission-rate]').type('10')
      
      cy.get('[data-cy=submit-button]').click()
      cy.wait('@createPartner')
      
      cy.get('[data-cy=error-message]').should('contain', 'Email já está sendo usado')
    })
  })

  describe('Vouchers Management', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/partners/1', {
        fixture: 'partnerships/partner-details.json'
      }).as('getPartnerDetails')

      cy.visit('/partnerships/1')
      cy.wait('@getPartnerDetails')
    })

    it('should display vouchers tab correctly', () => {
      cy.get('[data-cy=vouchers-tab]').click()
      
      cy.intercept('GET', '**/api/partners/1/vouchers', {
        fixture: 'partnerships/partner-vouchers.json'
      }).as('getVouchers')
      
      cy.wait('@getVouchers')
      
      cy.get('[data-cy=vouchers-table]').should('be.visible')
      cy.get('[data-cy=voucher-row]').should('have.length.at.least', 1)
    })

    it('should generate new vouchers successfully', () => {
      cy.intercept('POST', '**/api/partners/1/vouchers/generate', {
        statusCode: 201,
        fixture: 'partnerships/generated-vouchers.json'
      }).as('generateVouchers')

      cy.get('[data-cy=vouchers-tab]').click()
      cy.get('[data-cy=generate-vouchers]').click()
      
      // Fill voucher generation form
      cy.get('[data-cy=voucher-quantity]').type('50')
      cy.get('[data-cy=voucher-value]').type('100.00')
      cy.get('[data-cy=voucher-expiry]').type('2024-12-31')
      cy.get('[data-cy=voucher-description]').type('Desconto Natal 2024')
      
      cy.get('[data-cy=generate-button]').click()
      cy.wait('@generateVouchers')
      
      cy.get('[data-cy=success-message]').should('contain', '50 vouchers gerados com sucesso')
    })

    it('should validate voucher codes', () => {
      cy.visit('/validate-voucher')
      
      cy.intercept('POST', '**/api/vouchers/validate', {
        statusCode: 200,
        fixture: 'partnerships/voucher-validation.json'
      }).as('validateVoucher')

      cy.get('[data-cy=voucher-code]').type('FISIO2024ABC123')
      cy.get('[data-cy=validate-button]').click()
      
      cy.wait('@validateVoucher')
      
      cy.get('[data-cy=voucher-info]').should('be.visible')
      cy.get('[data-cy=voucher-value]').should('contain', 'R$ 100,00')
      cy.get('[data-cy=voucher-status]').should('contain', 'Válido')
    })

    it('should handle invalid voucher codes', () => {
      cy.visit('/validate-voucher')
      
      cy.intercept('POST', '**/api/vouchers/validate', {
        statusCode: 404,
        body: { error: 'Voucher não encontrado ou já utilizado' }
      }).as('validateVoucher')

      cy.get('[data-cy=voucher-code]').type('INVALID123')
      cy.get('[data-cy=validate-button]').click()
      
      cy.wait('@validateVoucher')
      
      cy.get('[data-cy=error-message]').should('contain', 'Voucher não encontrado')
    })

    it('should process voucher usage', () => {
      cy.visit('/validate-voucher')
      
      cy.intercept('POST', '**/api/vouchers/validate', {
        statusCode: 200,
        fixture: 'partnerships/voucher-validation.json'
      }).as('validateVoucher')
      
      cy.intercept('POST', '**/api/vouchers/use', {
        statusCode: 200,
        fixture: 'partnerships/voucher-usage.json'
      }).as('useVoucher')

      cy.get('[data-cy=voucher-code]').type('FISIO2024ABC123')
      cy.get('[data-cy=validate-button]').click()
      cy.wait('@validateVoucher')
      
      cy.get('[data-cy=use-voucher]').click()
      cy.wait('@useVoucher')
      
      cy.get('[data-cy=success-message]').should('contain', 'Voucher utilizado com sucesso')
    })
  })

  describe('Commission Management', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/partners/1', {
        fixture: 'partnerships/partner-details.json'
      }).as('getPartnerDetails')

      cy.visit('/partnerships/1')
      cy.wait('@getPartnerDetails')
    })

    it('should display commission history', () => {
      cy.get('[data-cy=commissions-tab]').click()
      
      cy.intercept('GET', '**/api/partners/1/commissions', {
        fixture: 'partnerships/partner-commissions.json'
      }).as('getCommissions')
      
      cy.wait('@getCommissions')
      
      cy.get('[data-cy=commissions-table]').should('be.visible')
      cy.get('[data-cy=commission-row]').should('have.length.at.least', 1)
    })

    it('should calculate commissions correctly', () => {
      cy.intercept('POST', '**/api/partners/1/commissions/calculate', {
        statusCode: 200,
        fixture: 'partnerships/calculated-commissions.json'
      }).as('calculateCommissions')

      cy.get('[data-cy=commissions-tab]').click()
      cy.get('[data-cy=calculate-commissions]').click()
      
      // Set date range
      cy.get('[data-cy=start-date]').type('2024-01-01')
      cy.get('[data-cy=end-date]').type('2024-01-31')
      
      cy.get('[data-cy=calculate-button]').click()
      cy.wait('@calculateCommissions')
      
      cy.get('[data-cy=calculated-amount]').should('contain', 'R$ 1.250,00')
    })

    it('should process commission payments', () => {
      cy.intercept('POST', '**/api/partners/1/commissions/pay', {
        statusCode: 200,
        fixture: 'partnerships/commission-payment.json'
      }).as('payCommission')

      cy.get('[data-cy=commissions-tab]').click()
      
      cy.get('[data-cy=commission-row]').first().within(() => {
        cy.get('[data-cy=pay-commission]').click()
      })
      
      // Confirm payment
      cy.get('[data-cy=payment-amount]').should('contain', 'R$ 375,00')
      cy.get('[data-cy=confirm-payment]').click()
      
      cy.wait('@payCommission')
      
      cy.get('[data-cy=success-message]').should('contain', 'Comissão paga com sucesso')
    })
  })

  describe('Analytics and Reports', () => {
    it('should display partnership analytics', () => {
      cy.visit('/partnerships/analytics')
      
      cy.intercept('GET', '**/api/partnerships/analytics', {
        fixture: 'partnerships/analytics-data.json'
      }).as('getAnalytics')
      
      cy.wait('@getAnalytics')
      
      // Check key metrics
      cy.get('[data-cy=total-partners]').should('contain', '12')
      cy.get('[data-cy=active-vouchers]').should('contain', '450')
      cy.get('[data-cy=total-commissions]').should('contain', 'R$ 25.430,00')
      cy.get('[data-cy=conversion-rate]').should('contain', '8.5%')
    })

    it('should generate partnership reports', () => {
      cy.visit('/partnerships/reports')
      
      cy.intercept('POST', '**/api/partnerships/reports/generate', {
        statusCode: 200,
        fixture: 'partnerships/report-data.json'
      }).as('generateReport')

      // Select report parameters
      cy.get('[data-cy=report-type]').select('monthly-sales')
      cy.get('[data-cy=start-date]').type('2024-01-01')
      cy.get('[data-cy=end-date]').type('2024-01-31')
      cy.get('[data-cy=partner-filter]').select('all')
      
      cy.get('[data-cy=generate-report]').click()
      cy.wait('@generateReport')
      
      cy.get('[data-cy=report-table]').should('be.visible')
      cy.get('[data-cy=download-pdf]').should('be.visible')
      cy.get('[data-cy=download-excel]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.get('body').tab()
      cy.focused().should('be.visible')
      
      // Navigate through partner list
      cy.get('[data-cy=partner-row]').first().focus()
      cy.focused().type('{enter}')
      
      cy.url().should('match', /\/partnerships\/\d+/)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/partners*', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('getPartnersError')

      cy.visit('/partnerships')
      cy.wait('@getPartnersError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro ao carregar parceiros')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should handle network errors', () => {
      cy.intercept('GET', '**/api/partners*', { forceNetworkError: true }).as('networkError')

      cy.visit('/partnerships')
      cy.wait('@networkError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Erro de conexão')
    })
  })

  describe('Performance', () => {
    it('should load partnerships within acceptable time', () => {
      const start = performance.now()
      
      cy.intercept('GET', '**/api/partners*', {
        fixture: 'partnerships/partners-list.json',
        delay: 100
      }).as('getPartners')

      cy.visit('/partnerships')
      cy.wait('@getPartners')
      
      cy.then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(2000) // 2 seconds max
      })
    })
  })
})