import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { SharedLinks } from '../pages/SharedLinks'
import { SharedBrain } from '../pages/SharedBrain'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

vi.mock('../components/Card', () => ({
  Card: ({ title, body }: { title: string; body?: string }) => (
    <article>
      {title}
      {body}
    </article>
  ),
}))

const links = [
  {
    id: 'l1',
    hash: 'SelHash12345',
    kind: 'selection',
    title: 'React resources',
    itemCount: 3,
    createdAt: '2026-11-10T10:00:00.000Z',
    preview: ['Thinking in React', 'React docs', 'Hooks talk'],
  },
  {
    id: 'l2',
    hash: 'ItemHash1234',
    kind: 'item',
    title: '',
    itemCount: 1,
    createdAt: '2026-11-11T10:00:00.000Z',
    preview: ['Steve Jobs speech'],
  },
]

function renderAt(path: string, routePath: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/signin" element={<p>Sign in page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('token', 'test-token')
  document.title = 'Mind Vault'
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('Shared links page', () => {
  it('lists shared links with their titles, counts and previews', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { shareLinks: links } })

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    const selection = (await screen.findByRole('heading', { name: 'React resources' })).closest('li')!
    expect(selection).toHaveTextContent('3 items')
    expect(selection).toHaveTextContent('Thinking in React · React docs · Hooks talk')

    // A single item without a title is named after the item.
    const item = screen.getByRole('heading', { name: 'Steve Jobs speech' }).closest('li')!
    expect(item).toHaveTextContent('Single item')
    expect(within(item).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      `${window.location.origin}/s/ItemHash1234`,
    )

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/share-links$/),
      { headers: { Authorization: 'Bearer test-token' } },
    )
  })

  it('copies a link', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { shareLinks: links } })
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    const selection = (await screen.findByRole('heading', { name: 'React resources' })).closest('li')!
    await user.click(within(selection).getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/SelHash12345`)
    expect(within(selection).getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('stops sharing after confirmation and removes the row', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { shareLinks: links } })
    vi.mocked(axios.delete).mockResolvedValue({ data: {} })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    const selection = (await screen.findByRole('heading', { name: 'React resources' })).closest('li')!
    await user.click(within(selection).getByRole('button', { name: 'Stop sharing' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'React resources' })).not.toBeInTheDocument()
    })
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/share-links\/l1$/),
      { headers: { Authorization: 'Bearer test-token' } },
    )
  })

  it('keeps the link when stopping is not confirmed', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { shareLinks: links } })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    const selection = (await screen.findByRole('heading', { name: 'React resources' })).closest('li')!
    await user.click(within(selection).getByRole('button', { name: 'Stop sharing' }))

    expect(axios.delete).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'React resources' })).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { shareLinks: [] } })

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    expect(await screen.findByText('Nothing shared yet')).toBeInTheDocument()
  })

  it('sends the user to sign in when their session has expired', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 401 } })

    renderAt('/shared-links', '/shared-links', <SharedLinks />)

    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('Public shared items page', () => {
  it('shows a titled selection from the item-sharing endpoint', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        username: 'tribhuvan',
        title: 'React resources',
        kind: 'selection',
        content: [
          { _id: '1', title: 'Thinking in React', link: 'https://react.dev', type: 'article' },
          { _id: '2', title: 'An idea', link: '', type: 'note', body: 'Build it' },
        ],
      },
    })

    renderAt('/s/SelHash12345', '/s/:hash', <SharedBrain variant="items" />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'React resources' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Shared by/)).toHaveTextContent('Shared by tribhuvan · 2 items')
    expect(screen.getByText('Build it', { exact: false })).toBeInTheDocument()
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/shared\/SelHash12345$/))
    await waitFor(() => expect(document.title).toBe('React resources · Mind Vault'))
  })

  it("uses the item's own title for an untitled single item", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        username: 'tribhuvan',
        title: '',
        kind: 'item',
        content: [{ _id: '1', title: 'Steve Jobs speech', link: 'https://youtu.be/x', type: 'youtube' }],
      },
    })

    renderAt('/s/ItemHash1234', '/s/:hash', <SharedBrain variant="items" />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Steve Jobs speech' }),
    ).toBeInTheDocument()
  })

  it('explains when every shared item has been deleted', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { username: 'tribhuvan', title: 'Old picks', kind: 'selection', content: [] },
    })

    renderAt('/s/SelHash12345', '/s/:hash', <SharedBrain variant="items" />)

    expect(await screen.findByText('These items are no longer available.')).toBeInTheDocument()
  })

  it('shows a not-found message for a stopped link', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 404 } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderAt('/s/Gone12345678', '/s/:hash', <SharedBrain variant="items" />)

    expect(
      await screen.findByRole('heading', { name: 'Shared link not found' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('its owner stopped sharing it')
  })
})
