import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareDialog } from '../components/ShareDialog'
import { buildShareTargets } from '../shareLinks'

const URL_TO_SHARE = 'https://mindvault.example/share/abc123'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('buildShareTargets', () => {
  const targets = Object.fromEntries(
    buildShareTargets(URL_TO_SHARE, 'Hi & welcome').map((t) => [t.id, t.href]),
  )

  it('encodes the link and message for every target', () => {
    const encodedUrl = encodeURIComponent(URL_TO_SHARE)

    expect(targets.whatsapp).toBe(
      `https://wa.me/?text=${encodeURIComponent(`Hi & welcome: ${URL_TO_SHARE}`)}`,
    )
    expect(targets.email).toBe(
      `mailto:?subject=Hi%20%26%20welcome&body=${encodeURIComponent(`Hi & welcome: ${URL_TO_SHARE}`)}`,
    )
    expect(targets.telegram).toBe(
      `https://t.me/share/url?url=${encodedUrl}&text=Hi%20%26%20welcome`,
    )
    expect(targets.x).toBe(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=Hi%20%26%20welcome`,
    )
    expect(targets.linkedin).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    )
    expect(targets.facebook).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    )
  })
})

describe('ShareDialog', () => {
  it('shows the link and a share option for each app', () => {
    render(<ShareDialog url={URL_TO_SHARE} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Share your Brain' })).toBeInTheDocument()
    expect(screen.getByLabelText('Share link')).toHaveValue(URL_TO_SHARE)

    for (const name of ['WhatsApp', 'Email', 'Telegram', 'X', 'LinkedIn', 'Facebook']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Email' })).not.toHaveAttribute('target')
  })

  it('copies the link to the clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<ShareDialog url={URL_TO_SHARE} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE)
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    expect(screen.getByText('Link copied to clipboard.')).toBeInTheDocument()
  })

  it('explains how to copy manually when the clipboard is blocked', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })

    render(<ShareDialog url={URL_TO_SHARE} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(screen.getByText(/Couldn't copy automatically/)).toBeInTheDocument()
  })

  it('offers the device share sheet when available', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    render(<ShareDialog url={URL_TO_SHARE} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'More options…' }))

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: URL_TO_SHARE }),
    )

    delete (navigator as { share?: unknown }).share
  })

  it('hides the device share option when the browser has none', () => {
    render(<ShareDialog url={URL_TO_SHARE} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'More options…' })).not.toBeInTheDocument()
  })

  it('closes with Escape, the close button, or a backdrop click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<ShareDialog url={URL_TO_SHARE} onClose={onClose} />)

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Close share dialog' }))
    await user.click(screen.getByRole('dialog').parentElement!)

    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
