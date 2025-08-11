// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add cypress-grep support
import registerCypressGrep from '@cypress/grep'
registerCypressGrep()

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions from the application under test
  
  // Don't fail on ResizeObserver loop limit exceeded
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  
  // Don't fail on network errors during development
  if (err.message.includes('Loading chunk') || err.message.includes('NetworkError')) {
    return false
  }
  
  return true
})

// Setup hooks for each test
beforeEach(() => {
  // Clear all cookies and localStorage before each test
  cy.clearCookies()
  cy.clearLocalStorage()
  
  // Set common viewport
  cy.viewport(1280, 720)
  
  // Intercept common API calls
  cy.intercept('GET', '**/api/health', { fixture: 'health.json' }).as('healthCheck')
  cy.intercept('GET', '**/api/users/profile', { fixture: 'user-profile.json' }).as('userProfile')
})

after(() => {
  // Cleanup after all tests
  cy.task('clearDatabase')
})