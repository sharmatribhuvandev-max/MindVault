import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from '../components/Card'
import { clearGitHubRepoCache } from '../githubRepo'

afterEach(() => {
  cleanup()
})

const defaultProps = {
  id: 'content-123',
  title: 'My Mind Vault Content',
  link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  type: 'youtube' as const,
  onDelete: vi.fn(async () => {}),
  isDeleting: false,
  onEdit: vi.fn(),
}

describe('Card component', () => {
  it('renders the content title', () => {
    render(<Card {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: 'My Mind Vault Content' })
    ).toBeInTheDocument()
  })

  it('renders a valid YouTube embed', () => {
    render(<Card {...defaultProps} />)

    expect(screen.getByTitle('My Mind Vault Content'))
      .toHaveAttribute(
        'src',
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      )
  })

  it('shows an error for an invalid YouTube link', () => {
    render(
      <Card
        {...defaultProps}
        link="not-a-valid-url"
      />
    )

    expect(screen.getByText('Invalid YouTube link.'))
      .toBeInTheDocument()
  })

  it('displays notes when notes are provided', () => {
    render(
      <Card
        {...defaultProps}
        notes="Remember this important point"
      />
    )

    expect(screen.getByRole('heading', { name: 'Notes' }))
      .toBeInTheDocument()

    expect(screen.getByText('Remember this important point'))
      .toBeInTheDocument()
  })

  it('does not display empty notes', () => {
    render(<Card {...defaultProps} notes="   " />)

    expect(screen.queryByRole('heading', { name: 'Notes' }))
      .not.toBeInTheDocument()
  })

  it('hides notes on public cards', () => {
    render(
      <Card
        {...defaultProps}
        notes="Private notes"
        isPublic
      />
    )

    expect(screen.queryByText('Private notes'))
      .not.toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: 'Add to favorites' })
    ).not.toBeInTheDocument()
  })

  it('calls onFavorite with the content ID and updated state', async () => {
    const user = userEvent.setup()
    const onFavorite = vi.fn(async () => {})

    render(
      <Card
        {...defaultProps}
        onFavorite={onFavorite}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Add to favorites' })
    )

    expect(onFavorite).toHaveBeenCalledWith('content-123', true)
  })

  it('calls onPin with the content ID and updated state', async () => {
    const user = userEvent.setup()
    const onPin = vi.fn(async () => {})

    render(
      <Card
        {...defaultProps}
        onPin={onPin}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Pin content' })
    )

    expect(onPin).toHaveBeenCalledWith('content-123', true)
  })

  it('calls onEdit with the content ID', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <Card
        {...defaultProps}
        onEdit={onEdit}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEdit).toHaveBeenCalledWith('content-123')
  })

  it('calls onDelete with the content ID', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn(async () => {})

    render(
      <Card
        {...defaultProps}
        onDelete={onDelete}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('content-123')
  })

  it('disables editing and deletion while deleting', () => {
    render(
      <Card
        {...defaultProps}
        isDeleting
      />
    )

    expect(screen.getByRole('button', { name: 'Edit' }))
      .toBeDisabled()

    expect(screen.getByRole('button', { name: 'Deleting...' }))
      .toBeDisabled()
  })

  it('renders an X profile for a valid profile URL', () => {
    render(
      <Card
        {...defaultProps}
        type="twitter"
        link="https://x.com/openai"
      />
    )

    expect(screen.getByText('X Profile')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Profile' }))
      .toHaveAttribute('href', 'https://x.com/openai')
  })

  it('renders an article with its domain and a link to read it', () => {
    render(
      <Card
        {...defaultProps}
        type="article"
        link="https://www.example.com/posts/hello"
      />,
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Read article/ }),
    ).toHaveAttribute('href', 'https://www.example.com/posts/hello')
  })

  it('renders a note body and hides the open-link button when there is no link', () => {
    render(
      <Card
        {...defaultProps}
        type="note"
        link=""
        body={'First line\nSecond line'}
      />,
    )

    expect(screen.getByText(/First line/)).toHaveTextContent('First line Second line')
    expect(
      screen.queryByRole('link', { name: /Open .* in a new tab/ }),
    ).not.toBeInTheDocument()
  })

  it('collapses long notes behind "Show more"', async () => {
    const user = userEvent.setup()
    const longBody = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n')

    render(<Card {...defaultProps} type="note" link="" body={longBody} />)

    const toggle = screen.getByRole('button', { name: 'Show more' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Show less' }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('does not offer "Show more" for short notes', () => {
    render(<Card {...defaultProps} type="note" link="" body="Short note" />)

    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('shows a note body on public cards', () => {
    render(
      <Card {...defaultProps} type="note" link="" body="Shared idea" isPublic />,
    )

    expect(screen.getByText('Shared idea')).toBeInTheDocument()
  })

  describe('embeds', () => {
    beforeEach(() => {
      clearGitHubRepoCache()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows GitHub repository details from the API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          full_name: 'facebook/react',
          description: 'The library for web and native user interfaces.',
          stargazers_count: 230500,
          language: 'JavaScript',
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      render(
        <Card {...defaultProps} type="github" link="https://github.com/facebook/react" />,
      )

      expect(
        await screen.findByText('The library for web and native user interfaces.'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('230500 stars')).toHaveTextContent('231k')
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/facebook/react',
        expect.anything(),
      )
    })

    it('falls back to owner/repo when the GitHub API fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
      vi.stubGlobal('fetch', fetchMock)

      render(
        <Card {...defaultProps} type="github" link="https://github.com/acme/widget" />,
      )

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(screen.getByText('acme/widget')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /View repository/ }))
        .toHaveAttribute('href', 'https://github.com/acme/widget')
    })

    it('shows a GitHub profile card without calling the API', () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      render(
        <Card {...defaultProps} type="github" link="https://github.com/torvalds" />,
      )

      expect(screen.getByText('torvalds')).toBeInTheDocument()
      expect(screen.getByText(/View GitHub profile/)).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('embeds an Instagram post', () => {
      render(
        <Card
          {...defaultProps}
          type="instagram"
          link="https://www.instagram.com/p/ABC123/"
        />,
      )

      expect(screen.getByTitle(defaultProps.title)).toHaveAttribute(
        'src',
        'https://www.instagram.com/p/ABC123/embed',
      )
      expect(screen.getByText('Not loading? Open on Instagram')).toBeInTheDocument()
    })

    it('shows a link card for an Instagram profile', () => {
      render(
        <Card
          {...defaultProps}
          type="instagram"
          link="https://www.instagram.com/someone/"
        />,
      )

      expect(screen.queryByTitle(defaultProps.title)).not.toBeInTheDocument()
      expect(screen.getByText(/Open on Instagram/)).toBeInTheDocument()
    })

    it('embeds a LinkedIn post', () => {
      render(
        <Card
          {...defaultProps}
          type="linkedin"
          link="https://www.linkedin.com/posts/jane_title-activity-7123456789012345678-AbCd"
        />,
      )

      expect(screen.getByTitle(defaultProps.title)).toHaveAttribute(
        'src',
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7123456789012345678',
      )
    })

    it('shows a link card for a LinkedIn profile', () => {
      render(
        <Card
          {...defaultProps}
          type="linkedin"
          link="https://www.linkedin.com/in/jane-doe"
        />,
      )

      expect(screen.getByText('LinkedIn profile')).toBeInTheDocument()
      expect(screen.getByText(/Open on LinkedIn/)).toBeInTheDocument()
    })
  })

  describe('sharing and selection', () => {
    it('calls onShare from the share button', async () => {
      const user = userEvent.setup()
      const onShare = vi.fn()
      render(<Card {...defaultProps} onShare={onShare} />)

      await user.click(screen.getByRole('button', { name: `Share ${defaultProps.title}` }))

      expect(onShare).toHaveBeenCalledWith(defaultProps.id)
    })

    it('has no share button on public cards', () => {
      render(<Card {...defaultProps} onShare={vi.fn()} isPublic />)

      expect(screen.queryByRole('button', { name: /^Share / })).not.toBeInTheDocument()
    })

    it('shows a checkbox only in selection mode and reports toggles', async () => {
      const user = userEvent.setup()
      const onToggleSelect = vi.fn()
      const { rerender } = render(<Card {...defaultProps} onToggleSelect={onToggleSelect} />)

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

      rerender(<Card {...defaultProps} selectable selected={false} onToggleSelect={onToggleSelect} />)
      await user.click(screen.getByRole('checkbox', { name: `Select ${defaultProps.title}` }))
      expect(onToggleSelect).toHaveBeenCalledWith(defaultProps.id)

      rerender(<Card {...defaultProps} selectable selected onToggleSelect={onToggleSelect} />)
      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })
})
