import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../components/Input'

afterEach(() => {
  cleanup()
})

describe('Input component', () => {
  it('renders the input with its placeholder', () => {
    render(<Input placeholder="Enter username" />)

    expect(
      screen.getByPlaceholderText('Enter username')
    ).toBeInTheDocument()
  })

  it('renders the label and required indicator', () => {
    render(
      <Input
        id="username"
        label="Username"
        required
      />
    )

    expect(screen.getByLabelText('Username *')).toBeInTheDocument()
  })

  it('uses text as the default input type', () => {
    render(<Input placeholder="Username" />)

    expect(screen.getByPlaceholderText('Username'))
      .toHaveAttribute('type', 'text')
  })

  it('supports password input type', () => {
    render(<Input type="password" placeholder="Password" />)

    expect(screen.getByPlaceholderText('Password'))
      .toHaveAttribute('type', 'password')
  })

  it('supports URL input type', () => {
    render(<Input type="url" placeholder="Content URL" />)

    expect(screen.getByPlaceholderText('Content URL'))
      .toHaveAttribute('type', 'url')
  })

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Input
        placeholder="Enter username"
        value=""
        onChange={handleChange}
      />
    )

    await user.type(
      screen.getByPlaceholderText('Enter username'),
      'brainly'
    )

    expect(handleChange).toHaveBeenCalled()
  })

  it('displays the supplied value', () => {
    render(
      <Input
        placeholder="Username"
        value="brainly-user"
        onChange={() => {}}
      />
    )

    expect(screen.getByPlaceholderText('Username'))
      .toHaveValue('brainly-user')
  })

  it('disables the input when disabled is true', () => {
    render(<Input placeholder="Disabled input" disabled />)

    expect(screen.getByPlaceholderText('Disabled input'))
      .toBeDisabled()
  })

  it('passes the autoComplete value to the input', () => {
    render(
      <Input
        placeholder="Email"
        autoComplete="email"
      />
    )

    expect(screen.getByPlaceholderText('Email'))
      .toHaveAttribute('autoComplete', 'email')
  })

  it('marks the input as required', () => {
    render(
      <Input
        id="website"
        label="Website"
        required
      />
    )

    expect(screen.getByLabelText('Website *'))
      .toBeRequired()
  })
})
