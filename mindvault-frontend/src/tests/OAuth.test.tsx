import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { AlternativeSignIn } from '../components/AlternativeSignIn'
import { AuthCallback } from '../pages/AuthCallback'
import { Signin } from '../pages/Signin'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

function renderRoutes(path: string, element: React.ReactNode, routePath = path.split('?')[0]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/signin" element={<p>Sign in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('AlternativeSignIn', () => {
  it('shows Google and GitHub when both are configured', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { google: true, github: true } })

    renderRoutes('/signin', <AlternativeSignIn />)

    expect(
      await screen.findByRole('link', { name: 'Continue with Google' }),
    ).toHaveAttribute('href', expect.stringMatching(/\/api\/v1\/auth\/google\/start$/))
    expect(
      screen.getByRole('link', { name: 'Continue with GitHub' }),
    ).toHaveAttribute('href', expect.stringMatching(/\/api\/v1\/auth\/github\/start$/))
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeInTheDocument()
  })

  it('shows only the configured providers', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { google: false, github: true } })

    renderRoutes('/signin', <AlternativeSignIn />)

    expect(await screen.findByRole('link', { name: 'Continue with GitHub' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })

  it('falls back to just the guest option when providers cannot be loaded', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('offline'))

    renderRoutes('/signin', <AlternativeSignIn />)

    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeInTheDocument()

    // Let the failed providers request settle before checking.
    await waitFor(() => expect(axios.get).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('link', { name: /Continue with/ })).not.toBeInTheDocument()
  })
})

describe('AuthCallback', () => {
  it('stores the token from the URL fragment, leaves guest mode and opens the dashboard', async () => {
    localStorage.setItem('guestExpiresAt', '2026-11-13T10:00:00.000Z')
    window.history.replaceState(null, '', '/auth/callback#token=abc.def.ghi')

    renderRoutes('/auth/callback', <AuthCallback />)

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('abc.def.ghi')
    expect(localStorage.getItem('guestExpiresAt')).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('goes back to sign-in with an error when there is no token', async () => {
    window.history.replaceState(null, '', '/auth/callback')

    renderRoutes('/auth/callback', <AuthCallback />)

    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('Signin page OAuth errors', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: { google: true, github: true } })
  })

  it.each([
    ['oauth_cancelled', 'Sign-in was cancelled.'],
    ['oauth_failed', "Couldn't sign you in with that account. Please try again."],
  ])('shows a message for ?error=%s', async (code, message) => {
    renderRoutes(`/signin?error=${code}`, <Signin />, '/signin')

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    await screen.findByRole('link', { name: 'Continue with Google' })
  })

  it('ignores unknown error codes', async () => {
    renderRoutes('/signin?error=something_else', <Signin />, '/signin')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await screen.findByRole('link', { name: 'Continue with Google' })
  })
})
