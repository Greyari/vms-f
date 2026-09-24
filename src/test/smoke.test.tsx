import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Testing Harness Smoke Test', () => {
  it('renders a simple element and asserts via jest-dom', () => {
    render(<div data-testid="smoke">VMS Testing Harness Ready</div>)
    const el = screen.getByTestId('smoke')
    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('VMS Testing Harness Ready')
  })
})
