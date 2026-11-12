
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import Dashboard from '../pages/dashboard'
import { useContent } from '../hooks/useContent'
import type { ComponentProps } from 'react'
import type { Sidebar } from '../components/Sidebar'
import type { Card } from '../components/Card'
import type { CreateContentModal } from '../components/CreateContentModal'

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>(
        'react-router-dom',
    )

    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        isAxiosError: vi.fn(() => false),
    },
}))

vi.mock('../hooks/useContent', () => ({
    useContent: vi.fn(),
}))

vi.mock('../components/Sidebar', () => ({
    Sidebar: ({
        collections,
        onSelectType,
        onSelectCollection,
        selectedCollectionId,
        isOpen,
        onLogout,
        username,
    }: ComponentProps<typeof Sidebar>) => (
        <aside data-testid="sidebar" data-open={String(isOpen)}>
            {username && <p>User: {username}</p>}
            <button onClick={onLogout}>Logout</button>
            <button onClick={() => onSelectType('favorites')}>Sidebar Favorites</button>
            <button onClick={() => onSelectType('pinned')}>Sidebar Pinned</button>
            {collections.map((collection) => (
                <button
                    key={collection._id}
                    aria-pressed={selectedCollectionId === collection._id}
                    onClick={() => onSelectCollection(collection._id)}
                >
                    {collection.name}
                </button>
            ))}
        </aside>
    ),
}))

vi.mock('../components/Card', () => ({
    Card: ({
        id,
        title,
        onFavorite,
        onPin,
        onDelete,
        onEdit,
        isFavorite,
        isPinned,
        onShare,
        selectable,
        selected,
        onToggleSelect,
    }: ComponentProps<typeof Card>) => (
        <article data-testid="content-card">
            <h2>{title}</h2>
            {onShare && <button onClick={() => onShare(id)}>Share {title}</button>}
            {selectable && (
                <input
                    type="checkbox"
                    aria-label={`Select ${title}`}
                    checked={Boolean(selected)}
                    onChange={() => onToggleSelect?.(id)}
                />
            )}
            <button onClick={() => onFavorite?.(id, !isFavorite)}>
                Toggle favorite {title}
            </button>
            <button onClick={() => onPin?.(id, !isPinned)}>
                Toggle pin {title}
            </button>
            <button onClick={() => onEdit(id)}>Edit {title}</button>
            <button onClick={() => onDelete(id)}>Delete {title}</button>
        </article>
    ),
}))

vi.mock('../components/CreateContentModal', () => ({
    CreateContentModal: ({ open, onClose, editContent }: ComponentProps<typeof CreateContentModal>) =>
        open ? (
            <div role="dialog" aria-label={editContent ? 'Edit Content' : 'Add Content'}>
                <span>{editContent?.title ?? 'New content form'}</span>
                <button onClick={onClose}>Close content modal</button>
            </div>
        ) : null,
}))

const sampleContents = [
    {
        _id: 'content-1',
        title: 'React Tutorial',
        link: 'https://www.youtube.com/watch?v=react123',
        type: 'youtube',
        tags: [],
        isFavorite: true,
        isPinned: false,
        notes: 'Learn React hooks',
        collectionId: 'collection-1',
    },
    {
        _id: 'content-2',
        title: 'TypeScript Guide',
        link: 'https://twitter.com/example/status/123',
        type: 'twitter',
        tags: [],
        isFavorite: false,
        isPinned: true,
        notes: 'Type safety notes',
        collectionId: null,
    },
]

const sampleCollections = [
    { _id: 'collection-1', name: 'Learning' },
]

let currentContents = sampleContents
let currentError: string | null = null
let mockRefresh: ReturnType<typeof vi.fn>

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})

beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'test-token')

    currentContents = sampleContents
    currentError = null
    mockRefresh = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useContent).mockReturnValue({
        contents: currentContents,
        refresh: mockRefresh,
        error: currentError,
    } as never)

    vi.mocked(axios.get).mockImplementation((url: string) =>
        Promise.resolve(
            url.endsWith('/api/v1/me')
                ? { data: { username: 'testuser' } }
                : { data: { collections: sampleCollections } },
        ) as never,
    )

    vi.mocked(axios.post).mockResolvedValue({
        data: { hash: 'share123' },
    } as never)

    vi.mocked(axios.patch).mockResolvedValue({ data: {} } as never)
    vi.mocked(axios.delete).mockResolvedValue({ data: {} } as never)

    vi.mocked(axios.isAxiosError).mockReturnValue(false)
})

describe('Dashboard component', () => {
    it('renders the dashboard and saved content', async () => {
        render(<Dashboard />)

        expect(screen.getByRole('heading', { name: 'My Brain' })).toBeInTheDocument()
        expect(screen.getByText('React Tutorial')).toBeInTheDocument()
        expect(screen.getByText('TypeScript Guide')).toBeInTheDocument()

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringMatching(/\/api\/v1\/collections$/),
                { headers: { Authorization: 'Bearer test-token' } },
            )
        })

        expect(mockRefresh).toHaveBeenCalled()
    })

    it('filters content by the search query', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.type(
            screen.getByRole('textbox', { name: 'Search saved content' }),
            'hooks',
        )

        expect(screen.getByText('React Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
    })

    it('filters content by YouTube type', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'YouTube' }))

        expect(screen.getByText('React Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
    })

    it('filters favorite content', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: /^Favorites$/ }))
        expect(screen.getByText('React Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
    })

    it('filters pinned content', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: /^Pinned$/ }))
        expect(screen.getByText('TypeScript Guide')).toBeInTheDocument()
        expect(screen.queryByText('React Tutorial')).not.toBeInTheDocument()
    })

    it('filters content by collection', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(await screen.findByRole('button', { name: 'Learning' }))

        expect(screen.getByText('React Tutorial')).toBeInTheDocument()
        expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
    })

    it('shows the empty state and Add Content action when no content exists', () => {
        currentContents = []

        vi.mocked(useContent).mockReturnValue({
            contents: [],
            refresh: mockRefresh,
            error: null,
        } as never)

        render(<Dashboard />)

        expect(screen.getByText('Your Brain is empty.')).toBeInTheDocument()
        expect(
            screen.getAllByRole('button', { name: 'Add Content' }),
        ).toHaveLength(2)
    })

    it('opens and closes the Add Content modal', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Add Content' }))
        expect(screen.getByRole('dialog', { name: 'Add Content' })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Close content modal' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens the share dialog with the public link and keeps Share Brain available', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Share Brain' }))

        const dialog = await screen.findByRole('dialog', { name: 'Share your Brain' })
        expect(screen.getByLabelText('Share link')).toHaveValue(
            `${window.location.origin}/share/share123`,
        )
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/brain\/share$/),
            { share: true },
            { headers: { Authorization: 'Bearer test-token' } },
        )

        await user.click(screen.getByRole('button', { name: 'Close share dialog' }))
        expect(dialog).not.toBeInTheDocument()

        expect(screen.getByRole('button', { name: 'Share Brain' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Disable Sharing' })).toBeInTheDocument()
    })

    it('shows pinned items first, then newest, and remembers the chosen sort', async () => {
        localStorage.removeItem('contentSort')
        const dated = [
            { ...sampleContents[0], _id: 'a', title: 'Alpha', isPinned: false, createdAt: '2026-01-01T00:00:00Z' },
            { ...sampleContents[0], _id: 'b', title: 'Beta', isPinned: false, createdAt: '2026-03-01T00:00:00Z' },
            { ...sampleContents[0], _id: 'z', title: 'Zebra', isPinned: true, createdAt: '2025-01-01T00:00:00Z' },
        ]
        vi.mocked(useContent).mockReturnValue({
            contents: dated,
            refresh: mockRefresh,
            error: null,
        } as never)
        const user = userEvent.setup()

        const { unmount } = render(<Dashboard />)

        const cardTitles = () =>
            screen.getAllByTestId('content-card').map((card) => card.querySelector('h2')?.textContent)

        expect(cardTitles()).toEqual(['Zebra', 'Beta', 'Alpha'])

        await user.selectOptions(screen.getByLabelText('Sort saved content'), 'title')
        expect(cardTitles()).toEqual(['Zebra', 'Alpha', 'Beta'])
        expect(localStorage.getItem('contentSort')).toBe('title')

        unmount()
        render(<Dashboard />)
        expect(screen.getByLabelText('Sort saved content')).toHaveValue('title')
        expect(cardTitles()).toEqual(['Zebra', 'Alpha', 'Beta'])
    })

    it('shares a single item from its card', async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
            data: { shareLink: { id: 'l1', hash: 'ItemHash1234', kind: 'item', title: '', itemCount: 1 } },
        })
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Share React Tutorial' }))

        expect(await screen.findByRole('dialog', { name: 'Share this item' })).toBeInTheDocument()
        expect(screen.getByLabelText('Share link')).toHaveValue(
            `${window.location.origin}/s/ItemHash1234`,
        )
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/share-links$/),
            { contentIds: ['content-1'] },
            { headers: { Authorization: 'Bearer test-token' } },
        )
    })

    it('selects several items and shares them with a title', async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
            data: { shareLink: { id: 'l2', hash: 'SelHash12345', kind: 'selection', title: 'Picks', itemCount: 2 } },
        })
        const user = userEvent.setup()
        render(<Dashboard />)

        expect(screen.queryByLabelText('Select React Tutorial')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Select' }))
        const bar = screen.getByRole('region', { name: 'Share selected items' })
        expect(bar).toHaveTextContent('Select items to share')

        await user.click(screen.getByLabelText('Select TypeScript Guide'))
        await user.click(screen.getByLabelText('Select React Tutorial'))
        expect(bar).toHaveTextContent('2 selected')

        await user.type(screen.getByLabelText('Title for the shared items'), 'Picks')
        await user.click(screen.getByRole('button', { name: 'Share 2' }))

        expect(await screen.findByRole('dialog', { name: 'Share 2 items' })).toBeInTheDocument()
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/share-links$/),
            { contentIds: ['content-2', 'content-1'], title: 'Picks' },
            expect.anything(),
        )
        // Selection mode ends once the link is created.
        expect(screen.queryByRole('region', { name: 'Share selected items' })).not.toBeInTheDocument()
    })

    it('cannot share an empty selection, and Cancel leaves selection mode', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Select' }))
        expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(screen.queryByRole('region', { name: 'Share selected items' })).not.toBeInTheDocument()
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('shows an error when creating an item link fails', async () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true)
        vi.mocked(axios.post).mockRejectedValueOnce({
            response: { status: 404, data: { message: 'One or more items were not found' } },
        })
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Share React Tutorial' }))

        expect(await screen.findByText('One or more items were not found')).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('logs out by revoking the token on the server, removing it, and navigating to signin', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: { message: 'Logged out' } })
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Logout' }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/signin', { replace: true })
        })
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/logout$/),
            {},
            expect.objectContaining({
                headers: { Authorization: 'Bearer test-token' },
            }),
        )
        expect(localStorage.getItem('token')).toBeNull()
    })

    it('still logs out locally when the server logout request fails', async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'))
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Logout' }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/signin', { replace: true })
        })
        expect(localStorage.getItem('token')).toBeNull()
        consoleError.mockRestore()
    })

    it('loads the signed-in username into the sidebar', async () => {
        render(<Dashboard />)

        expect(await screen.findByText('User: testuser')).toBeInTheDocument()
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/v1\/me$/),
            { headers: { Authorization: 'Bearer test-token' } },
        )
    })

    it('shows no demo banner for a normal account', () => {
        localStorage.removeItem('guestExpiresAt')
        render(<Dashboard />)

        expect(screen.queryByText(/exploring a demo account/)).not.toBeInTheDocument()
    })

    it('shows a demo banner for guests and clears guest mode on logout', async () => {
        localStorage.setItem('guestExpiresAt', '2026-11-13T10:00:00.000Z')
        const user = userEvent.setup()
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        )

        expect(screen.getByText(/exploring a demo account/)).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: /Create your own account/ }),
        ).toHaveAttribute('href', '/signup')

        await user.click(screen.getByRole('button', { name: 'Logout' }))

        // Logout waits for the server call before clearing local state.
        await waitFor(() => {
            expect(localStorage.getItem('guestExpiresAt')).toBeNull()
        })
    })

    it('sends the favorite update with the authentication token', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(
            screen.getByRole('button', { name: 'Toggle favorite React Tutorial' }),
        )

        await waitFor(() => {
            expect(axios.patch).toHaveBeenCalledWith(
                expect.stringMatching(/\/api\/v1\/content\/content-1\/favorite$/),
                { isFavorite: false },
                { headers: { Authorization: 'Bearer test-token' } },
            )
        })

        expect(mockRefresh).toHaveBeenCalled()
    })

    it('sends the pin update with the authentication token', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(
            screen.getByRole('button', { name: 'Toggle pin React Tutorial' }),
        )

        await waitFor(() => {
            expect(axios.patch).toHaveBeenCalledWith(
                expect.stringMatching(/\/api\/v1\/content\/content-1\/pin$/),
                { isPinned: true },
                { headers: { Authorization: 'Bearer test-token' } },
            )
        })
    })

    it('deletes content after confirmation', async () => {
        const user = userEvent.setup()
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        render(<Dashboard />)

        await user.click(
            screen.getByRole('button', { name: 'Delete React Tutorial' }),
        )

        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith(
                expect.stringMatching(/\/api\/v1\/content$/),
                {
                    headers: { Authorization: 'Bearer test-token' },
                    data: { contentId: 'content-1' },
                },
            )
        })

        expect(mockRefresh).toHaveBeenCalled()
    })

    it('does not delete content when confirmation is cancelled', async () => {
        const user = userEvent.setup()
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(<Dashboard />)

        await user.click(
            screen.getByRole('button', { name: 'Delete React Tutorial' }),
        )

        expect(axios.delete).not.toHaveBeenCalled()
    })
})
