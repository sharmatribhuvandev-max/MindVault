
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
    }: ComponentProps<typeof Sidebar>) => (
        <aside data-testid="sidebar" data-open={String(isOpen)}>
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
    }: ComponentProps<typeof Card>) => (
        <article data-testid="content-card">
            <h2>{title}</h2>
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

    vi.mocked(axios.get).mockResolvedValue({
        data: { collections: sampleCollections },
    } as never)

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

    it('logs out by removing the token and navigating to signin', async () => {
        const user = userEvent.setup()
        render(<Dashboard />)

        await user.click(screen.getByRole('button', { name: 'Logout' }))

        expect(localStorage.getItem('token')).toBeNull()
        expect(mockNavigate).toHaveBeenCalledWith('/signin')
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
