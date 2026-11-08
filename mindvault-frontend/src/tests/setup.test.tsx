import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

function TestComponent() {
  return <h1>Mind Vault Testing Works</h1>
}

describe('Frontend testing setup', () => {
  it('renders a React component successfully', () => {
    render(<TestComponent />)

    expect(
      screen.getByRole('heading', { name: 'Mind Vault Testing Works' })
    ).toBeInTheDocument()
  })
})
