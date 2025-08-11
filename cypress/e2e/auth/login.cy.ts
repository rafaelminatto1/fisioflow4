describe('Authentication - Login', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should display login form correctly', () => {
    cy.get('[data-cy=login-form]').should('be.visible')
    cy.get('[data-cy=email-input]').should('be.visible')
    cy.get('[data-cy=password-input]').should('be.visible')
    cy.get('[data-cy=login-button]').should('be.visible')
    
    // Check form labels
    cy.contains('Email').should('be.visible')
    cy.contains('Senha').should('be.visible')
    
    // Check links
    cy.contains('Esqueceu sua senha?').should('have.attr', 'href', '/forgot-password')
    cy.contains('Não tem uma conta?').should('be.visible')
    cy.contains('Criar uma conta').should('have.attr', 'href', '/register')
  })

  it('should show validation errors for empty fields', () => {
    cy.get('[data-cy=login-button]').click()
    
    cy.get('[data-cy=email-error]').should('contain', 'Email é obrigatório')
    cy.get('[data-cy=password-error]').should('contain', 'Senha é obrigatória')
  })

  it('should show validation error for invalid email', () => {
    cy.get('[data-cy=email-input]').type('invalid-email')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=login-button]').click()
    
    cy.get('[data-cy=email-error]').should('contain', 'Email deve ser válido')
  })

  it('should successfully login with valid credentials', () => {
    const user = Cypress.env('testUser')
    
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 1,
          email: user.email,
          full_name: 'Admin User',
          role: 'ADMIN'
        }
      }
    }).as('loginRequest')

    cy.get('[data-cy=email-input]').type(user.email)
    cy.get('[data-cy=password-input]').type(user.password)
    cy.get('[data-cy=login-button]').click()

    cy.wait('@loginRequest')
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
    
    // Should store token in localStorage
    cy.window().its('localStorage').should('have.property', 'fisioflow_token')
  })

  it('should show error for invalid credentials', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: {
        error: 'Credenciais inválidas'
      }
    }).as('loginRequest')

    cy.get('[data-cy=email-input]').type('invalid@example.com')
    cy.get('[data-cy=password-input]').type('wrongpassword')
    cy.get('[data-cy=login-button]').click()

    cy.wait('@loginRequest')
    
    cy.get('[data-cy=error-message]').should('contain', 'Credenciais inválidas')
    cy.url().should('include', '/login') // Should stay on login page
  })

  it('should show loading state during login', () => {
    // Delay the response to see loading state
    cy.intercept('POST', '**/api/auth/login', (req) => {
      req.reply((res) => {
        res.delay(1000)
        res.send({
          statusCode: 200,
          body: { access_token: 'token', user: {} }
        })
      })
    }).as('loginRequest')

    cy.get('[data-cy=email-input]').type('test@example.com')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=login-button]').click()

    // Should show loading state
    cy.get('[data-cy=login-button]').should('be.disabled')
    cy.get('[data-cy=login-button]').should('contain', 'Entrando...')
    
    cy.wait('@loginRequest')
  })

  it('should toggle password visibility', () => {
    cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password')
    
    cy.get('[data-cy=toggle-password]').click()
    cy.get('[data-cy=password-input]').should('have.attr', 'type', 'text')
    
    cy.get('[data-cy=toggle-password]').click()
    cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password')
  })

  it('should handle remember me functionality', () => {
    cy.get('[data-cy=remember-me]').should('not.be.checked')
    cy.get('[data-cy=remember-me]').check()
    cy.get('[data-cy=remember-me]').should('be.checked')
  })

  it('should navigate to register page', () => {
    cy.get('[data-cy=register-link]').click()
    cy.url().should('include', '/register')
  })

  it('should navigate to forgot password page', () => {
    cy.get('[data-cy=forgot-password-link]').click()
    cy.url().should('include', '/forgot-password')
  })

  it('should handle keyboard navigation', () => {
    // Tab through form elements
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-cy', 'email-input')
    
    cy.focused().tab()
    cy.focused().should('have.attr', 'data-cy', 'password-input')
    
    cy.focused().tab()
    cy.focused().should('have.attr', 'data-cy', 'remember-me')
    
    cy.focused().tab()
    cy.focused().should('have.attr', 'data-cy', 'login-button')
  })

  it('should submit form on Enter key', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'token',
        user: { id: 1, email: 'test@example.com' }
      }
    }).as('loginRequest')

    cy.get('[data-cy=email-input]').type('test@example.com')
    cy.get('[data-cy=password-input]').type('password123{enter}')
    
    cy.wait('@loginRequest')
  })

  it('should be accessible', () => {
    cy.checkA11y()
    
    // Check specific accessibility requirements
    cy.get('[data-cy=login-form]').should('have.attr', 'role', 'form')
    cy.get('[data-cy=email-input]').should('have.attr', 'aria-required', 'true')
    cy.get('[data-cy=password-input]').should('have.attr', 'aria-required', 'true')
  })

  it('should handle API errors gracefully', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 500,
      body: {
        error: 'Erro interno do servidor'
      }
    }).as('loginRequest')

    cy.get('[data-cy=email-input]').type('test@example.com')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=login-button]').click()

    cy.wait('@loginRequest')
    
    cy.get('[data-cy=error-message]').should('contain', 'Erro interno do servidor')
  })

  it('should redirect authenticated users', () => {
    // Simulate already logged in user
    cy.window().then((win) => {
      win.localStorage.setItem('fisioflow_token', 'valid-token')
    })

    cy.intercept('GET', '**/api/users/profile', {
      statusCode: 200,
      body: {
        user: { id: 1, email: 'test@example.com', role: 'ADMIN' }
      }
    }).as('profileRequest')

    cy.visit('/login')
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
  })

  it('should handle network errors', () => {
    cy.intercept('POST', '**/api/auth/login', { forceNetworkError: true }).as('loginRequest')

    cy.get('[data-cy=email-input]').type('test@example.com')
    cy.get('[data-cy=password-input]').type('password123')
    cy.get('[data-cy=login-button]').click()

    cy.wait('@loginRequest')
    
    cy.get('[data-cy=error-message]').should('contain', 'Erro de conexão')
  })
})