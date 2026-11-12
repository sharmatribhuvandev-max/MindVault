import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { CreateContentModal } from '../components/CreateContentModal'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    isAxiosError: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

beforeEach(() => {
  vi.clearAllMocks()

  localStorage.setItem('token', 'test-token')

  vi.mocked(axios.get).mockResolvedValue({
    data: {
      tags: [],
      collections: [],
    },
  } as never)

  vi.mocked(axios.post).mockResolvedValue({
    data: {},
  } as never)

  vi.mocked(axios.put).mockResolvedValue({
    data: {},
  } as never)
})

describe('CreateContentModal component', () => {
  it('does not display the dialog when closed', () => {
    render(
      <CreateContentModal
        open={false}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('renders the Add Content dialog when open', async () => {
    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
      />
    )

    expect(
      screen.getByRole('dialog', { name: 'Add Content' })
    ).toBeInTheDocument()

    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Paste a link')).toBeInTheDocument()

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
    })
  })

  it('loads tags and collections using the authentication token', async () => {
    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
    })

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/tags$/),
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/collections$/),
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )
  })

  it('keeps typed edits when the parent re-renders with an equal editContent object', async () => {
    const makeEdit = () => ({
      id: 'content-1',
      title: 'Original title',
      link: 'https://youtu.be/abc',
      type: 'youtube' as const,
      tags: [],
      notes: '',
      collectionId: null,
    })

    const { rerender } = render(
      <CreateContentModal open onClose={vi.fn()} editContent={makeEdit()} />
    )

    const titleInput = screen.getByPlaceholderText('Title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Edited title')

    // Dashboard builds a new editContent object on every render.
    rerender(
      <CreateContentModal open onClose={vi.fn()} editContent={makeEdit()} />
    )

    expect(screen.getByPlaceholderText('Title')).toHaveValue('Edited title')
  })

  it('starts from a blank form after closing and reopening', async () => {
    const { rerender } = render(
      <CreateContentModal open onClose={vi.fn()} />
    )

    await userEvent.type(screen.getByPlaceholderText('Title'), 'Draft')

    rerender(<CreateContentModal open={false} onClose={vi.fn()} />)
    rerender(<CreateContentModal open onClose={vi.fn()} />)

    expect(screen.getByPlaceholderText('Title')).toHaveValue('')
  })

  it('shows a validation error when title and link are empty', async () => {
    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
      />
    )

    fireEvent.submit(
      screen.getByRole('dialog').querySelector('form')!
    )

    expect(
      await screen.findByText('Title and link are required.')
    ).toBeInTheDocument()

    expect(axios.post).not.toHaveBeenCalled()
  })

  it('rejects an invalid URL', async () => {
    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Test video' },
    })

    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: { value: 'not-a-valid-url' },
    })

    fireEvent.submit(
      screen.getByRole('dialog').querySelector('form')!
    )

    expect(
      await screen.findByText(
        'Please enter a valid URL, including https:// or http://.'
      )
    ).toBeInTheDocument()

    expect(axios.post).not.toHaveBeenCalled()
  })

  it('creates content with trimmed values and the authentication token', async () => {
    const onClose = vi.fn()

    render(
      <CreateContentModal
        open
        onClose={onClose}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: '  Test video  ' },
    })

    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: {
        value: ' https://www.youtube.com/watch?v=dQw4w9WgXcQ ',
      },
    })

    fireEvent.change(
      screen.getByPlaceholderText('Only you can see these (optional)'),
      {
        target: { value: '  Important notes  ' },
      },
    )

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Add content' })
    )

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1)
    })

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/content$/),
      {
        title: 'Test video',
        link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'youtube',
        tags: [],
        collectionId: null,
        notes: 'Important notes',
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches the content type to Twitter', async () => {
    const user = userEvent.setup()

    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
      />
    )

    const twitterButton = screen.getByRole('button', {
      name: 'Twitter / X',
    })

    await user.click(twitterButton)

    expect(twitterButton).toHaveClass('bg-[var(--purple-600)]')
  })

  it('closes the dialog when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <CreateContentModal
        open
        onClose={onClose}
      />
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('prefills fields and updates existing content in edit mode', async () => {
    const onClose = vi.fn()
    const onUpdated = vi.fn()

    render(
      <CreateContentModal
        open
        onClose={onClose}
        onUpdated={onUpdated}
        editContent={{
          id: 'content-123',
          title: 'Existing video',
          link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          type: 'youtube',
          tags: [],
          notes: 'Existing notes',
          collectionId: null,
        }}
      />
    )

    expect(
      screen.getByRole('dialog', { name: 'Edit Content' })
    ).toBeInTheDocument()

    expect(screen.getByPlaceholderText('Title'))
      .toHaveValue('Existing video')

    expect(screen.getByPlaceholderText('Paste a link'))
      .toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(
      screen.getByPlaceholderText('Only you can see these (optional)')
    ).toHaveValue('Existing notes')

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Save changes' })
    )

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledTimes(1)
    })

    expect(axios.put).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/content\/content-123$/),
      {
        title: 'Existing video',
        link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'youtube',
        tags: [],
        notes: 'Existing notes',
        collectionId: null,
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      },
    )

    expect(onUpdated).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  function typeButton(name: string) {
    return screen.getByRole('button', { name })
  }

  const SELECTED = 'bg-[var(--purple-600)]'

  it.each([
    ['https://youtu.be/dQw4w9WgXcQ', 'YouTube'],
    ['https://x.com/someone/status/123', 'Twitter / X'],
    ['https://blog.example.com/post', 'Article'],
  ])('detects the type from %s', (url, label) => {
    render(<CreateContentModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: { value: url },
    })

    expect(typeButton(label)).toHaveClass(SELECTED)
    expect(
      screen.getByText(`Detected ${label} from the link.`),
    ).toBeInTheDocument()
  })

  it('does not override a type the user picked', async () => {
    const user = userEvent.setup()
    render(<CreateContentModal open onClose={vi.fn()} />)

    await user.click(typeButton('Article'))

    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
    })

    expect(typeButton('Article')).toHaveClass(SELECTED)
    expect(typeButton('YouTube')).not.toHaveClass(SELECTED)
  })

  it('does not change the type of an item being edited', () => {
    render(
      <CreateContentModal
        open
        onClose={vi.fn()}
        editContent={{
          id: 'content-1',
          title: 'Saved as article',
          link: 'https://example.com',
          type: 'article',
          tags: [],
          notes: '',
          collectionId: null,
        }}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
    })

    expect(typeButton('Article')).toHaveClass(SELECTED)
  })

  it('creates a note without a link', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CreateContentModal open onClose={onClose} />)

    await user.click(typeButton('Note'))

    expect(screen.getByText('Link (optional)')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Idea' },
    })
    fireEvent.change(screen.getByLabelText(/^Note/), {
      target: { value: '  Build a reading list  ' },
    })

    await user.click(screen.getByRole('button', { name: 'Add content' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/content$/),
        expect.objectContaining({
          title: 'Idea',
          type: 'note',
          link: '',
          body: 'Build a reading list',
        }),
        expect.anything(),
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('requires text in a note', async () => {
    const user = userEvent.setup()
    render(<CreateContentModal open onClose={vi.fn()} />)

    await user.click(typeButton('Note'))
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Empty idea' },
    })

    fireEvent.submit(
      screen.getByRole('button', { name: 'Add content' }).closest('form')!,
    )

    expect(
      await screen.findByText('Write something in your note.'),
    ).toBeInTheDocument()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('does not send a body for non-note types', async () => {
    const user = userEvent.setup()
    render(<CreateContentModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'Post' },
    })
    fireEvent.change(screen.getByPlaceholderText('Paste a link'), {
      target: { value: 'https://blog.example.com/post' },
    })

    await user.click(screen.getByRole('button', { name: 'Add content' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled()
    })
    const payload = vi.mocked(axios.post).mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload.type).toBe('article')
    expect(payload).not.toHaveProperty('body')
  })
})
