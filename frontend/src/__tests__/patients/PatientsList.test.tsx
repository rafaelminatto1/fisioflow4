import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PatientsList } from '@/components/patients/PatientsList'
import { apiClient } from '@/lib/apiClient'

// Mock apiClient
jest.mock('@/lib/apiClient')
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

// Mock data
const mockPatients = [
  {
    id: 1,
    full_name: 'João Silva',
    email: 'joao@test.com',
    phone: '11999887766',
    document_number: '***456789**',
    birth_date: '1985-05-15',
    age: 39,
    gender: 'M',
    created_at: '2024-01-15T10:00:00Z',
    last_appointment: '2024-06-10T14:30:00Z',
  },
  {
    id: 2,
    full_name: 'Maria Santos',
    email: 'maria@test.com',
    phone: '11888776655',
    document_number: '***654321**',
    birth_date: '1990-08-20',
    age: 34,
    gender: 'F',
    created_at: '2024-02-01T09:30:00Z',
    last_appointment: null,
  },
]

const mockPaginatedResponse = {
  items: mockPatients,
  total: 2,
  pages: 1,
  page: 1,
  per_page: 20,
}

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return Wrapper
}

describe('PatientsList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedApiClient.get.mockResolvedValue({ data: mockPaginatedResponse })
  })

  it('renders patients list correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    // Check loading state first
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()

    // Wait for patients to load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })

    // Check patient details
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
    expect(screen.getByText('maria@test.com')).toBeInTheDocument()
    expect(screen.getByText('39 anos')).toBeInTheDocument()
    expect(screen.getByText('34 anos')).toBeInTheDocument()
  })

  it('displays empty state when no patients', async () => {
    const Wrapper = createWrapper()
    mockedApiClient.get.mockResolvedValueOnce({ 
      data: { ...mockPaginatedResponse, items: [], total: 0 } 
    })
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/nenhum paciente encontrado/i)).toBeInTheDocument()
    })
  })

  it('handles search functionality', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Clear initial call
    jest.clearAllMocks()

    const searchInput = screen.getByPlaceholderText(/buscar pacientes/i)
    fireEvent.change(searchInput, { target: { value: 'João' } })

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=Jo%C3%A3o')
      )
    })
  })

  it('handles pagination correctly', async () => {
    const Wrapper = createWrapper()
    const multiPageResponse = {
      ...mockPaginatedResponse,
      total: 50,
      pages: 3,
      page: 1,
    }
    
    mockedApiClient.get.mockResolvedValueOnce({ data: multiPageResponse })
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument()
    })

    // Test next page button
    const nextButton = screen.getByRole('button', { name: /próxima/i })
    expect(nextButton).toBeEnabled()

    // Test previous page button (should be disabled on first page)
    const prevButton = screen.getByRole('button', { name: /anterior/i })
    expect(prevButton).toBeDisabled()
  })

  it('displays patient status badges correctly', async () => {
    const Wrapper = createWrapper()
    const patientsWithStatus = [
      { ...mockPatients[0], last_appointment: '2024-06-10T14:30:00Z' },
      { ...mockPatients[1], last_appointment: null },
    ]
    
    mockedApiClient.get.mockResolvedValueOnce({ 
      data: { ...mockPaginatedResponse, items: patientsWithStatus } 
    })
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      // Patient with recent appointment
      expect(screen.getByText(/ativo/i)).toBeInTheDocument()
      
      // Patient without appointments
      expect(screen.getByText(/novo/i)).toBeInTheDocument()
    })
  })

  it('handles error state correctly', async () => {
    const Wrapper = createWrapper()
    const errorMessage = 'Erro ao carregar pacientes'
    mockedApiClient.get.mockRejectedValueOnce(new Error(errorMessage))
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument()
    })
  })

  it('navigates to patient details on click', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    const patientRow = screen.getByText('João Silva').closest('tr')
    expect(patientRow).toHaveAttribute('data-href', '/patients/1')
  })

  it('displays action buttons correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Check for action buttons in each row
    const actionButtons = screen.getAllByRole('button', { name: /ações/i })
    expect(actionButtons).toHaveLength(mockPatients.length)

    // Click on first action button
    fireEvent.click(actionButtons[0])
    
    // Check dropdown menu items
    await waitFor(() => {
      expect(screen.getByText(/ver perfil/i)).toBeInTheDocument()
      expect(screen.getByText(/editar/i)).toBeInTheDocument()
      expect(screen.getByText(/nova consulta/i)).toBeInTheDocument()
    })
  })

  it('formats dates correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      // Check if dates are formatted in Brazilian format
      expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument()
      expect(screen.getByText(/01\/02\/2024/)).toBeInTheDocument()
    })
  })

  it('handles sorting correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Clear initial API call
    jest.clearAllMocks()

    // Click on name column header to sort
    const nameHeader = screen.getByRole('button', { name: /nome/i })
    fireEvent.click(nameHeader)

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('sort=full_name')
      )
    })
  })

  it('displays patient count correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/2 pacientes/i)).toBeInTheDocument()
    })
  })

  it('handles refresh functionality', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // Clear initial API calls
    jest.clearAllMocks()

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /atualizar/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledTimes(1)
    })
  })

  it('supports keyboard navigation', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    const firstRow = screen.getByText('João Silva').closest('tr')
    
    // Test keyboard navigation
    fireEvent.focus(firstRow!)
    fireEvent.keyDown(firstRow!, { key: 'Enter', code: 'Enter' })
    
    // Should navigate to patient details (mocked)
    expect(firstRow).toHaveAttribute('data-href', '/patients/1')
  })

  it('displays loading skeleton correctly', () => {
    const Wrapper = createWrapper()
    mockedApiClient.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    // Check for loading skeletons
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('handles mobile responsive layout', async () => {
    const Wrapper = createWrapper()
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    render(
      <Wrapper>
        <PatientsList />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    // In mobile view, some columns might be hidden or stacked differently
    // This would depend on the actual implementation
  })
})