import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StrictMode } from 'react'
import axios from 'axios'
import { GuestLogin } from '../pages/GuestLogin'
import { GuestButton } from '../components/GuestButton'
import { clearGuestSession, isGuestSession } from '../guestSession'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
          <Route path="/signin" element={<p>Sign in page</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(axios.post).mockResolvedValue({
    data: {
      token: 'guest-token',
      guest: true,
      expiresAt: '2026-11-13T10:00:00.000Z',
    },
  })
})

afterEach(() => {
  cleanup()
})

describe('/guest page', () => {
  it('creates exactly one guest account and opens the dashboard', async () => {
    renderAt('/guest', <GuestLogin />)

    expect(screen.getByText('Setting up your demo…')).toBeInTheDocument()
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()

    // StrictMode runs effects twice; only one account should be created.
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/guest$/))
    expect(localStorage.getItem('token')).toBe('guest-token')
    expect(isGuestSession()).toBe(true)
  })

  it('shows the server message and a way out when it fails', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 429, data: { message: 'Too many guest sessions from this network.' } },
    })

    renderAt('/guest', <GuestLogin />)

    expect(
      await screen.findByText('Too many guest sessions from this network.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('GuestButton', () => {
  it('starts a guest session when clicked', async () => {
    const user = userEvent.setup()
    renderAt('/signin', <GuestButton />)

    await user.click(screen.getByRole('button', { name: 'Continue as guest' }))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('guest-token')
  })

  it('reports a connection problem', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(axios.post).mockRejectedValue({ request: {} })
    const user = userEvent.setup()
    renderAt('/signin', <GuestButton />)

    await user.click(screen.getByRole('button', { name: 'Continue as guest' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Cannot connect to the server')
    })
  })
})

describe('guest session flag', () => {
  it('is cleared by clearGuestSession', () => {
    localStorage.setItem('guestExpiresAt', '2026-11-13T10:00:00.000Z')
    expect(isGuestSession()).toBe(true)

    clearGuestSession()

    expect(isGuestSession()).toBe(false)
  })
})
