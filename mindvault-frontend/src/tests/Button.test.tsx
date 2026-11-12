import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(() => {
  cleanup()
})
import { Button } from '../components/Button'

describe('Button component', () => {
  it('renders the provided text', () => {
    render(<Button variant="primary" text="Create Content" />)

    expect(
      screen.getByRole('button', { name: 'Create Content' })
    ).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button
        variant="primary"
        text="Save"
        onClick={handleClick}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies the primary variant styles', () => {
    render(<Button variant="primary" text="Primary" />)

    expect(screen.getByRole('button', { name: 'Primary' }))
      .toHaveClass('bg-accent', 'text-accent-ink')
  })

  it('applies the secondary variant styles', () => {
    render(<Button variant="secondary" text="Secondary" />)

    expect(screen.getByRole('button', { name: 'Secondary' }))
      .toHaveClass('bg-surface', 'border-line-strong')
  })

  it('uses medium size by default', () => {
    render(<Button variant="primary" text="Default Size" />)

    expect(screen.getByRole('button', { name: 'Default Size' }))
      .toHaveClass('h-9', 'px-3.5')
  })

  it('applies large size styles', () => {
    render(<Button variant="primary" size="lg" text="Large" />)

    expect(screen.getByRole('button', { name: 'Large' }))
      .toHaveClass('h-11', 'px-5')
  })

  it('uses full width when fullWidth is true', () => {
    render(
      <Button variant="primary" text="Full Width" fullWidth />
    )

    expect(screen.getByRole('button', { name: 'Full Width' }))
      .toHaveClass('w-full')
  })

  it('disables the button while loading', () => {
    render(
      <Button variant="primary" text="Loading" loading />
    )

    const button = screen.getByRole('button', { name: 'Loading' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('does not call onClick while loading', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button
        variant="primary"
        text="Loading"
        loading
        onClick={handleClick}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Loading' }))

    expect(handleClick).not.toHaveBeenCalled()
  })
})
