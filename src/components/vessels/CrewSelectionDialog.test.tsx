import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CrewSelectionDialog from './CrewSelectionDialog'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockCandidates = [
  {
    id: 'crew-1',
    visitor_no: '1000101',
    name: 'Budi Santoso',
    id_type: 'ktp',
    id_number: '1234567890',
    gender: 'M',
    occupation: 'Chief Engineer',
    nationality: 'INDONESIA',
    certificate: 'ANT III',
    certificate_no: 'CERT-9988',
    seaman_book_no: 'SB-12345',
    is_blacklisted: false,
    blacklist_reason: null,
  },
  {
    id: 'crew-2',
    visitor_no: '1000102',
    name: 'John Bad Sailor',
    id_type: 'passport',
    id_number: 'E1234567',
    gender: 'M',
    occupation: 'Deckhand',
    nationality: 'PHILIPPINES',
    certificate: null,
    certificate_no: null,
    seaman_book_no: 'SB-67890',
    is_blacklisted: true,
    blacklist_reason: 'Pelanggaran zona terlarang dermaga',
  },
  {
    id: 'crew-3',
    visitor_no: '1000103',
    name: 'Ahmad Pelaut',
    id_type: 'ktp',
    id_number: '9876543210',
    gender: 'M',
    occupation: 'Bosun',
    nationality: 'INDONESIA',
    certificate: null,
    certificate_no: null,
    seaman_book_no: 'SB-11223',
    is_blacklisted: false,
    blacklist_reason: null,
  },
]

describe('CrewSelectionDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: mockCandidates,
    })
  })

  it('renders crew candidates list with details from API', async () => {
    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={['crew-1']}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pilih manifest kru kapal/i })).toBeInTheDocument()
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.getByText('Chief Engineer')).toBeInTheDocument()
      expect(screen.getByText(/SB-12345/)).toBeInTheDocument()
      expect(screen.getByText('John Bad Sailor')).toBeInTheDocument()
    })
  })

  it('disables checkbox for blacklisted crew and displays reason', async () => {
    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={[]}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('John Bad Sailor')).toBeInTheDocument()
      expect(screen.getByText(/Pelanggaran zona terlarang dermaga/i)).toBeInTheDocument()
      expect(screen.getAllByText(/BLACKLIST/i).length).toBeGreaterThan(0)
    })

    const blacklistedCheckbox = screen.getByLabelText(/pilih kru John Bad Sailor/i)
    expect(blacklistedCheckbox).toBeDisabled()
  })

  it('toggles crew selection and calls onSave with selected ids', async () => {
    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={['crew-1']}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    // Check Ahmad Pelaut
    const ahmadCheckbox = screen.getByLabelText(/pilih kru Ahmad Pelaut/i)
    fireEvent.click(ahmadCheckbox)

    const applyButton = screen.getByRole('button', { name: /terapkan kru/i })
    fireEvent.click(applyButton)

    expect(mockOnSave).toHaveBeenCalledWith(['crew-1', 'crew-3'], expect.any(Array))
  })

  it('selects all valid crew and skips blacklisted crew when clicking Pilih Semua', async () => {
    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={[]}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const selectAllBtn = screen.getByRole('button', { name: /pilih semua/i })
    fireEvent.click(selectAllBtn)

    const applyButton = screen.getByRole('button', { name: /terapkan kru/i })
    fireEvent.click(applyButton)

    // Should contain crew-1 and crew-3, but NOT crew-2 (blacklisted)
    expect(mockOnSave).toHaveBeenCalledWith(['crew-1', 'crew-3'], expect.any(Array))
  })

  it('adds a new crew member inline and automatically selects them', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 'crew-new-99',
        visitor_no: '1000199',
        name: 'New Sailor Kid',
        id_type: 'ktp',
        id_number: '9988776655',
        company: 'Ocean Star Ltd',
        occupation: 'Cadet Deck',
        visitor_type: 'crew',
        is_blacklisted: false,
      },
    })

    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={[]}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Click "Tambah Kru Baru"
    const addCrewBtn = screen.getByRole('button', { name: /tambah kru baru/i })
    fireEvent.click(addCrewBtn)

    await waitFor(() => {
      expect(screen.getByText('Tambah Kru Baru Langsung')).toBeInTheDocument()
    })

    // Fill the minimal form
    fireEvent.change(screen.getByLabelText(/nama lengkap kru/i), {
      target: { value: 'New Sailor Kid' },
    })
    fireEvent.change(screen.getByLabelText(/nomor identitas/i), {
      target: { value: '9988776655' },
    })

    const saveCrewBtn = screen.getByRole('button', { name: /simpan & pilih kru/i })
    fireEvent.click(saveCrewBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/visitors',
        expect.objectContaining({
          name: 'New Sailor Kid',
          id_number: '9988776655',
          visitor_type: 'crew',
        })
      )
      // Automatically selected
      expect(screen.getAllByText(/1 Terpilih/i).length).toBeGreaterThan(0)
    })
  })

  it('correctly handles backend response structured with visitor wrapper key and applies UUID to manifest', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: 'Visitor registered successfully',
        visitor: {
          id: '019483c0-1234-7000-8000-123456789abc',
          visitor_no: 'VIS-2026-9999',
          name: 'Captain Haddock',
          id_type: 'ktp',
          id_number: '1234123412341234',
          company: 'Marlinspike Shipping',
          occupation: 'Captain',
          visitor_type: 'crew',
          is_blacklisted: false,
        },
      },
    })

    render(
      <CrewSelectionDialog
        open={true}
        onClose={mockOnClose}
        locationId="uuid-vessel-1"
        selectedCrewIds={[]}
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Click "Tambah Kru Baru"
    fireEvent.click(screen.getByRole('button', { name: /tambah kru baru/i }))

    await waitFor(() => {
      expect(screen.getByText('Tambah Kru Baru Langsung')).toBeInTheDocument()
    })

    // Fill the minimal form
    fireEvent.change(screen.getByLabelText(/nama lengkap kru/i), {
      target: { value: 'Captain Haddock' },
    })
    fireEvent.change(screen.getByLabelText(/nomor identitas/i), {
      target: { value: '1234123412341234' },
    })

    fireEvent.click(screen.getByRole('button', { name: /simpan & pilih kru/i }))

    await waitFor(() => {
      // The newly added crew candidate must display their name, not be empty!
      expect(screen.getByText('Captain Haddock')).toBeInTheDocument()
      expect(screen.getAllByText(/1 Terpilih/i).length).toBeGreaterThan(0)
    })

    // Now apply to manifest
    fireEvent.click(screen.getByRole('button', { name: /terapkan kru/i }))

    expect(mockOnSave).toHaveBeenCalledWith(
      ['019483c0-1234-7000-8000-123456789abc'],
      expect.arrayContaining([
        expect.objectContaining({
          id: '019483c0-1234-7000-8000-123456789abc',
          name: 'Captain Haddock',
        }),
      ])
    )
  })
})


