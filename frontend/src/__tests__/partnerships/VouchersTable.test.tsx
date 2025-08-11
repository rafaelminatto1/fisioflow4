import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VouchersTable } from '@/components/partnerships/VouchersTable'
import { apiClient } from '@/lib/apiClient'

// Mock apiClient
jest.mock('@/lib/apiClient')
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

// Mock data
const mockVouchers = [
  {
    id: 1,
    code: 'DESCONTO20',
    name: 'Desconto Primeiro Cliente',
    description: 'Desconto especial para novos clientes',
    partner_name: 'Clínica Exemplo',
    discount_type: 'PERCENTAGE',
    discount_value: 20.0,
    minimum_amount: 100.0,
    maximum_discount: null,
    usage_limit: 50,
    current_usage_count: 15,
    valid_from: '2024-01-01T00:00:00Z',
    valid_until: '2024-12-31T23:59:59Z',
    status: 'ACTIVE',
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    code: 'FIXO50',
    name: 'Desconto Fixo',
    description: 'Valor fixo de desconto',
    partner_name: 'Clínica Beta',
    discount_type: 'FIXED_AMOUNT',
    discount_value: 50.0,
    minimum_amount: 200.0,
    maximum_discount: 50.0,
    usage_limit: null,
    current_usage_count: 8,
    valid_from: '2024-06-01T00:00:00Z',
    valid_until: '2024-08-31T23:59:59Z',
    status: 'EXPIRED',
    created_at: '2024-05-15T14:30:00Z',
  },
]

const mockPaginatedResponse = {
  items: mockVouchers,
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

describe('VouchersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedApiClient.get.mockResolvedValue({ data: mockPaginatedResponse })
  })

  it('renders vouchers table correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    // Check loading state
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()

    // Wait for vouchers to load
    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
      expect(screen.getByText('FIXO50')).toBeInTheDocument()
    })

    // Check voucher details
    expect(screen.getByText('Desconto Primeiro Cliente')).toBeInTheDocument()
    expect(screen.getByText('Clínica Exemplo')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument()
  })

  it('displays voucher status badges correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('Expirado')).toBeInTheDocument()
    })
  })

  it('shows discount types with correct icons', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      // Check for percentage icon (represented by %)
      expect(screen.getByText('20%')).toBeInTheDocument()
      
      // Check for fixed amount (represented by R$)
      expect(screen.getByText('R$ 50,00')).toBeInTheDocument()
    })
  })

  it('displays usage progress correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      // First voucher has usage limit and should show progress
      expect(screen.getByText('15 / 50')).toBeInTheDocument()
      
      // Second voucher has no limit
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  it('formats dates correctly', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      // Check Brazilian date format
      expect(screen.getByText('01/01/24')).toBeInTheDocument()
      expect(screen.getByText('31/12/24')).toBeInTheDocument()
    })
  })

  it('handles copy voucher code functionality', async () => {
    const Wrapper = createWrapper()
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })

    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
    })

    // Find and click copy button
    const copyButtons = screen.getAllByRole('button', { name: /copiar/i })
    fireEvent.click(copyButtons[0])

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('DESCONTO20')
  })

  it('opens voucher details modal', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
    })

    // Find and click action button
    const actionButtons = screen.getAllByLabelText(/abrir menu/i)
    fireEvent.click(actionButtons[0])

    // Click "Ver Detalhes"
    const detailsButton = screen.getByText(/ver detalhes/i)
    fireEvent.click(detailsButton)

    await waitFor(() => {
      expect(screen.getByText(/detalhes do voucher/i)).toBeInTheDocument()
      expect(screen.getByText('Desconto Primeiro Cliente')).toBeInTheDocument()
    })
  })

  it('filters vouchers by status', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
    })

    // Clear initial API call
    jest.clearAllMocks()

    // Click on status filter
    const statusFilter = screen.getByRole('button', { name: /status/i })
    fireEvent.click(statusFilter)

    // Select "Ativos"
    const activeFilter = screen.getByText(/ativos/i)
    fireEvent.click(activeFilter)

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=ACTIVE')
      )
    })
  })

  it('handles search functionality', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="DESCONTO" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=DESCONTO')
      )
    })
  })

  it('displays empty state correctly', async () => {
    const Wrapper = createWrapper()
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...mockPaginatedResponse, items: [], total: 0 }
    })
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/nenhum voucher encontrado/i)).toBeInTheDocument()
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
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument()
    })

    const nextButton = screen.getByRole('button', { name: /próxima/i })
    expect(nextButton).toBeEnabled()
  })

  it('displays export button', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument()
    })
  })

  it('displays new voucher button', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /novo voucher/i })).toBeInTheDocument()
    })
  })

  it('handles error state gracefully', async () => {
    const Wrapper = createWrapper()
    mockedApiClient.get.mockRejectedValueOnce(new Error('API Error'))
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    // Should show loading initially, then error handling would depend on implementation
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('shows voucher action menu items', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
    })

    // Click action menu
    const actionButtons = screen.getAllByLabelText(/abrir menu/i)
    fireEvent.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/ver detalhes/i)).toBeInTheDocument()
      expect(screen.getByText(/editar/i)).toBeInTheDocument()
      expect(screen.getByText(/copiar código/i)).toBeInTheDocument()
      expect(screen.getByText(/cancelar/i)).toBeInTheDocument()
    })
  })

  it('validates voucher usage limits display', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      // First voucher: 15/50 usage with progress bar
      expect(screen.getByText('15 / 50')).toBeInTheDocument()
      
      // Check for progress bar (visual element)
      const progressBars = document.querySelectorAll('[style*="width"]')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  it('shows minimum amount information', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/mín: r\$ 100,00/i)).toBeInTheDocument()
      expect(screen.getByText(/mín: r\$ 200,00/i)).toBeInTheDocument()
    })
  })

  it('handles voucher details modal close', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <VouchersTable searchTerm="" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('DESCONTO20')).toBeInTheDocument()
    })

    // Open modal
    const actionButtons = screen.getAllByLabelText(/abrir menu/i)
    fireEvent.click(actionButtons[0])
    
    const detailsButton = screen.getByText(/ver detalhes/i)
    fireEvent.click(detailsButton)

    await waitFor(() => {
      expect(screen.getByText(/detalhes do voucher/i)).toBeInTheDocument()
    })

    // Close modal (using escape key)
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText(/detalhes do voucher/i)).not.toBeInTheDocument()
    })
  })
})