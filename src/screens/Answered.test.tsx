import { render, screen } from '@testing-library/react'
import { StoreProvider } from '../store/StoreContext'
import { Answered } from './Answered'

beforeEach(() => localStorage.clear())

describe('Answered', () => {
  it('renders banner count and seeded answered prayers with relative times', () => {
    render(<StoreProvider><Answered /></StoreProvider>)
    expect(screen.getByText('3 prayers answered')).toBeInTheDocument()
    expect(screen.getByText(/Dad's test results came back clear/)).toBeInTheDocument()
    expect(screen.getByText('· answered 3 days ago')).toBeInTheDocument()
    expect(screen.getByText('· answered last week')).toBeInTheDocument()
    expect(screen.getByText('· answered 2 weeks ago')).toBeInTheDocument()
  })
})
