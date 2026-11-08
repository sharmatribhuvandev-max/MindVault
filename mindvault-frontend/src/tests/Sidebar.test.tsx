import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../components/Sidebar'

afterEach(() => {
  cleanup()
})

const defaultProps = {
  selectedType: 'all' as const,
  onSelectType: vi.fn(),
  collections: [],
  selectedCollectionId: null,
  onSelectCollection: vi.fn(),
  onDeleteCollection: vi.fn(),
  deletingCollectionId: null,
}

describe('Sidebar component', () => {
  it('renders the Mind Vault brand and main navigation', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByText('Mind Vault')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Content navigation' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /All content/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Twitter \/ X/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /YouTube/i })
    ).toBeInTheDocument()
  })

  it('selects all content and clears the collection filter', async () => {
    const user = userEvent.setup()
    const onSelectType = vi.fn()
    const onSelectCollection = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        selectedType="youtube"
        selectedCollectionId="collection-1"
        onSelectType={onSelectType}
        onSelectCollection={onSelectCollection}
      />
    )

    await user.click(screen.getByRole('button', { name: /All content/i }))

    expect(onSelectType).toHaveBeenCalledWith('all')
    expect(onSelectCollection).toHaveBeenCalledWith(null)
  })

  it('selects the Twitter filter', async () => {
    const user = userEvent.setup()
    const onSelectType = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        onSelectType={onSelectType}
      />
    )

    await user.click(screen.getByRole('button', { name: /Twitter \/ X/i }))

    expect(onSelectType).toHaveBeenCalledWith('twitter')
  })

  it('selects the YouTube filter', async () => {
    const user = userEvent.setup()
    const onSelectType = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        onSelectType={onSelectType}
      />
    )

    await user.click(screen.getByRole('button', { name: /YouTube/i }))

    expect(onSelectType).toHaveBeenCalledWith('youtube')
  })

  it('renders collections when available', () => {
    render(
      <Sidebar
        {...defaultProps}
        collections={[
          { _id: 'collection-1', name: 'Learning' },
          { _id: 'collection-2', name: 'Work' },
        ]}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Collections' })
    ).toBeInTheDocument()

    expect(
  screen.getByRole('button', { name: 'Learning' })
).toBeInTheDocument()

expect(
  screen.getByRole('button', { name: 'Work' })
).toBeInTheDocument()
  })

  it('does not render the collections section when empty', () => {
    render(<Sidebar {...defaultProps} />)

    expect(
      screen.queryByRole('heading', { name: 'Collections' })
    ).not.toBeInTheDocument()
  })

  it('selects a collection and calls the collection callback', async () => {
    const user = userEvent.setup()
    const onSelectCollection = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        collections={[{ _id: 'collection-1', name: 'Learning' }]}
        onSelectCollection={onSelectCollection}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Learning' }))

    expect(onSelectCollection).toHaveBeenCalledWith('collection-1')
  })

  it('calls the delete callback for a collection', async () => {
    const user = userEvent.setup()
    const onDeleteCollection = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        collections={[{ _id: 'collection-1', name: 'Learning' }]}
        onDeleteCollection={onDeleteCollection}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Delete collection Learning',
      })
    )

    expect(onDeleteCollection).toHaveBeenCalledWith('collection-1')
  })

  it('disables collection deletion while that collection is deleting', () => {
    render(
      <Sidebar
        {...defaultProps}
        collections={[{ _id: 'collection-1', name: 'Learning' }]}
        deletingCollectionId="collection-1"
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'Delete collection Learning',
      })
    ).toBeDisabled()
  })

  it('closes the open menu when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        isOpen
        onClose={onClose}
      />
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes the open menu when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Sidebar
        {...defaultProps}
        isOpen
        onClose={onClose}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Close navigation menu' })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
