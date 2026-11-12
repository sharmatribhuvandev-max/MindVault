import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarItem } from '../components/SidebarItem'

afterEach(() => {
  cleanup()
})

describe('SidebarItem component', () => {
  it('renders the provided text', () => {
    render(
      <SidebarItem
        text="All content"
        icon={<span>Icon</span>}
        onClick={() => {}}
      />
    )

    expect(
      screen.getByRole('button', { name: /All content/i })
    ).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <SidebarItem
        text="YouTube"
        icon={<span>Icon</span>}
        onClick={onClick}
      />
    )

    await user.click(screen.getByRole('button', { name: /YouTube/i }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('sets aria-pressed to true when active', () => {
    render(
      <SidebarItem
        text="Favorites"
        icon={<span>Icon</span>}
        active
        onClick={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Favorites/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed to false when inactive', () => {
    render(
      <SidebarItem
        text="Pinned"
        icon={<span>Icon</span>}
        onClick={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Pinned/i }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  it('marks the item as pressed when active', () => {
    render(
      <SidebarItem
        text="Favorites"
        icon={<span>Icon</span>}
        active
        onClick={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Favorites/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('is not pressed by default', () => {
    render(
      <SidebarItem
        text="YouTube"
        icon={<span>Icon</span>}
        onClick={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /YouTube/i }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  it('renders the supplied icon', () => {
    render(
      <SidebarItem
        text="All content"
        icon={<span data-testid="sidebar-icon">Brain icon</span>}
        onClick={() => {}}
      />
    )

    expect(screen.getByTestId('sidebar-icon')).toBeInTheDocument()
  })

  it('renders a button with type button', () => {
    render(
      <SidebarItem
        text="Collections"
        icon={<span>Icon</span>}
        onClick={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Collections/i }))
      .toHaveAttribute('type', 'button')
  })
})
