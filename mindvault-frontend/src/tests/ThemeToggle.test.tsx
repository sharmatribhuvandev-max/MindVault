import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ThemeToggle } from '../components/ThemeToggle'
import { THEME_STORAGE_KEY, setThemeChoice } from '../theme'

afterEach(() => {
  cleanup()
  setThemeChoice('system')
})

describe('ThemeToggle', () => {
  it('switches to dark, applies it to <html> and remembers it', async () => {
    const user = userEvent.setup()
    setThemeChoice('light')
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument()
  })

  it('offers light, dark and system in the segmented control', async () => {
    const user = userEvent.setup()
    setThemeChoice('dark')
    render(<ThemeToggle variant="segmented" />)

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'System' }))

    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
    // "system" is the default, so nothing is stored.
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
