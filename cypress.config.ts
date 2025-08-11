import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    env: {
      apiUrl: 'http://localhost:5000',
      testUser: {
        email: 'admin@fisioflow.com',
        password: 'admin123',
        role: 'ADMIN'
      },
      testProfessional: {
        email: 'prof@fisioflow.com', 
        password: 'prof123',
        role: 'PROFESSIONAL'
      },
      testPatient: {
        email: 'patient@fisioflow.com',
        password: 'patient123',
        role: 'PATIENT'
      }
    },
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      
      // Task for database seeding
      on('task', {
        seedDatabase() {
          // This would connect to your test database and seed it
          console.log('Seeding test database...')
          return null
        },
        
        clearDatabase() {
          // This would clear your test database
          console.log('Clearing test database...')
          return null
        },

        createTestUser(userData) {
          // This would create a test user via API
          console.log('Creating test user:', userData)
          return null
        }
      })

      // Plugin for cypress-grep
      require('@cypress/grep/src/plugin')(config)

      return config
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
})