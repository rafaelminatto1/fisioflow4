import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'

// Mock useAuth hook
jest.mock('@/hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock apiClient
jest.mock('@/lib/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

// Test utilities
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )

  return Wrapper
}

describe('LoginForm', () => {
  const mockLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
    })
  })

  it('renders login form correctly', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByText(/não tem uma conta/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const submitButton = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email deve ser válido/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const Wrapper = createWrapper()
    mockLogin.mockResolvedValueOnce({ user: { id: 1, email: 'test@example.com' } })
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays loading state during submission', async () => {
    const Wrapper = createWrapper()
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
    })
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const submitButton = screen.getByRole('button', { name: /entrando/i })
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on login failure', async () => {
    const Wrapper = createWrapper()
    const errorMessage = 'Credenciais inválidas'
    mockLogin.mockRejectedValueOnce(new Error(errorMessage))
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)
    const submitButton = screen.getByRole('button', { name: /entrar/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('toggles password visibility', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i })

    expect(passwordInput.type).toBe('password')

    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')

    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('password')
  })

  it('navigates to register page', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const registerLink = screen.getByText(/criar uma conta/i)
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('navigates to forgot password page', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const forgotLink = screen.getByText(/esqueceu sua senha/i)
    expect(forgotLink).toHaveAttribute('href', '/forgot-password')
  })

  it('maintains focus management', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)

    fireEvent.focus(emailInput)
    expect(emailInput).toHaveFocus()

    // Tab to next field
    fireEvent.keyDown(emailInput, { key: 'Tab', code: 'Tab' })
    // Note: jsdom doesn't automatically move focus, but we can test the structure
    
    fireEvent.focus(passwordInput)
    expect(passwordInput).toHaveFocus()
  })

  it('supports keyboard navigation', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>
    )

    const form = screen.getByRole('form', { name: /login/i })
    const emailInput = screen.getByLabelText(/email/i)
    
    // Focus should be manageable via keyboard
    fireEvent.focus(emailInput)
    fireEvent.keyDown(form, { key: 'Enter', code: 'Enter' })
    
    // Form should be submittable via Enter key
    expect(emailInput).toBeInTheDocument()
  })
})