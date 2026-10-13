import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from '../components/Card'

afterEach(() => {
  cleanup()
})

const defaultProps = {
  id: 'content-123',
  title: 'My Brainly Content',
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
      screen.getByRole('heading', { name: 'My Brainly Content' })
    ).toBeInTheDocument()
  })

  it('renders a valid YouTube embed', () => {
    render(<Card {...defaultProps} />)

    expect(screen.getByTitle('My Brainly Content'))
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
})
