/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with different user types
       * @example cy.login('admin')
       * @example cy.login('professional')  
       * @example cy.login('patient')
       */
      login(userType: 'admin' | 'professional' | 'patient'): Chainable<void>

      /**
       * Custom command to login with specific credentials
       * @example cy.loginWithCredentials('user@example.com', 'password')
       */
      loginWithCredentials(email: string, password: string): Chainable<void>

      /**
       * Custom command to seed test data
       * @example cy.seedTestData()
       */
      seedTestData(): Chainable<void>

      /**
       * Custom command to create a test patient
       * @example cy.createTestPatient({ name: 'João Silva', email: 'joao@test.com' })
       */
      createTestPatient(patientData: any): Chainable<any>

      /**
       * Custom command to create a test appointment
       * @example cy.createTestAppointment({ patientId: 1, date: '2024-07-15' })
       */
      createTestAppointment(appointmentData: any): Chainable<any>

      /**
       * Custom command to wait for page load
       * @example cy.waitForPageLoad()
       */
      waitForPageLoad(): Chainable<void>

      /**
       * Custom command to check accessibility
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>

      /**
       * Custom command to drag and drop
       * @example cy.dragAndDrop('[data-cy=source]', '[data-cy=target]')
       */
      dragAndDrop(source: string, target: string): Chainable<void>
    }
  }
}

// Login command
Cypress.Commands.add('login', (userType: 'admin' | 'professional' | 'patient') => {
  const users = {
    admin: Cypress.env('testUser'),
    professional: Cypress.env('testProfessional'),
    patient: Cypress.env('testPatient'),
  }

  const user = users[userType]
  
  cy.session([userType], () => {
    cy.visit('/login')
    cy.get('[data-cy=email-input]').type(user.email)
    cy.get('[data-cy=password-input]').type(user.password)
    cy.get('[data-cy=login-button]').click()
    
    // Wait for successful login
    cy.url().should('not.include', '/login')
    cy.window().its('localStorage').should('have.property', 'fisioflow_token')
  })
})

// Login with credentials command
Cypress.Commands.add('loginWithCredentials', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login')
    cy.get('[data-cy=email-input]').type(email)
    cy.get('[data-cy=password-input]').type(password)
    cy.get('[data-cy=login-button]').click()
    
    // Wait for successful login or error
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=error-message]').length > 0) {
        // Login failed - that's ok for some tests
        return
      }
      // Login successful
      cy.url().should('not.include', '/login')
    })
  })
})

// Seed test data command
Cypress.Commands.add('seedTestData', () => {
  cy.task('seedDatabase')
})

// Create test patient command
Cypress.Commands.add('createTestPatient', (patientData) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/patients`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('fisioflow_token')}`,
      'Content-Type': 'application/json',
    },
    body: patientData,
  }).then((response) => {
    expect(response.status).to.eq(201)
    return response.body.patient
  })
})

// Create test appointment command
Cypress.Commands.add('createTestAppointment', (appointmentData) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/appointments`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('fisioflow_token')}`,
      'Content-Type': 'application/json',
    },
    body: appointmentData,
  }).then((response) => {
    expect(response.status).to.eq(201)
    return response.body.appointment
  })
})

// Wait for page load command
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-cy=loading]', { timeout: 1000 }).should('not.exist')
  cy.get('[data-cy=page-content]').should('be.visible')
})

// Accessibility check command
Cypress.Commands.add('checkA11y', () => {
  // This would integrate with cypress-axe for accessibility testing
  // cy.injectAxe()
  // cy.checkA11y()
  
  // Basic accessibility checks
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt')
  })
  
  cy.get('input').each(($input) => {
    const inputType = $input.attr('type')
    if (inputType !== 'hidden' && inputType !== 'submit') {
      cy.wrap($input).should('have.attr', 'aria-label').or('have.attr', 'placeholder')
    }
  })
})

// Drag and drop command
Cypress.Commands.add('dragAndDrop', (source: string, target: string) => {
  const dataTransfer = new DataTransfer()

  cy.get(source).trigger('mousedown', { which: 1 })
  cy.get(source).trigger('dragstart', { dataTransfer })
  cy.get(target).trigger('dragover', { dataTransfer })
  cy.get(target).trigger('drop', { dataTransfer })
  cy.get(source).trigger('dragend')
})

// Custom command to handle file uploads
Cypress.Commands.add('uploadFile', (selector: string, fileName: string) => {
  cy.fixture(fileName).then((fileContent) => {
    cy.get(selector).attachFile({
      fileContent: fileContent.toString(),
      fileName,
      mimeType: 'application/octet-stream',
    })
  })
})

// Custom command to handle API mocking
Cypress.Commands.add('mockApi', (endpoint: string, response: any, statusCode = 200) => {
  cy.intercept('**/api/' + endpoint, {
    statusCode,
    body: response,
  }).as(endpoint.replace('/', '_'))
})

// Custom command to wait for all API calls to complete
Cypress.Commands.add('waitForApiCalls', () => {
  // Wait for any pending requests to complete
  cy.wait(100) // Small delay to allow requests to start
  cy.window().then((win) => {
    // This assumes you're using a global request counter or similar
    // Implementation depends on your API client setup
  })
})

// Custom command to clear all data
Cypress.Commands.add('clearAllData', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.clearAllSessionStorage()
  cy.task('clearDatabase')
})

// Export commands for TypeScript support
export {}

// Add cypress-file-upload commands
import 'cypress-file-upload'