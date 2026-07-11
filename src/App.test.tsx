import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('./sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }), // keeps cached fixture state
  importLegacy: vi.fn(async () => {}),
}))

beforeEach(() => localStorage.clear())

describe('App navigation', () => {
  it('starts on home', () => {
    render(<App />)
    expect(screen.getByText('Prayer List')).toBeInTheDocument()
  })

  it('navigates to groups, answered, reminders, and back home', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Groups' }))
    expect(screen.getByText('Pray together, in one place')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Answered' }))
    expect(screen.getByText('Looking back with gratitude')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reminders' }))
    expect(screen.getByText('Coming soon')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Prayers' }))
    expect(screen.getByText('Prayer List')).toBeInTheDocument()
  })

  it('shows the voice FAB', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Add prayer by voice' })).toBeInTheDocument()
  })
})
