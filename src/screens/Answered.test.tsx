import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../store/StoreContext'
import { saveState } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { Answered } from './Answered'

beforeEach(() => {
  localStorage.clear()
  saveState(demoState(Date.now(), todayStr()))
})

describe('Answered', () => {
  it('renders banner count and answered prayers with relative times', () => {
    render(<StoreProvider><Answered /></StoreProvider>)
    expect(screen.getByText('3 prayers answered')).toBeInTheDocument()
    expect(screen.getByText(/Dad's test results came back clear/)).toBeInTheDocument()
    expect(screen.getByText('· answered 3 days ago')).toBeInTheDocument()
    expect(screen.getByText('· answered last week')).toBeInTheDocument()
    expect(screen.getByText('· answered 2 weeks ago')).toBeInTheDocument()
  })

  it('undo returns the prayer to the active list', async () => {
    render(<StoreProvider><Answered /></StoreProvider>)
    await userEvent.click(screen.getByRole('button', { name: /Undo .*Dad's test results/ }))
    expect(screen.queryByText(/Dad's test results came back clear/)).not.toBeInTheDocument()
    expect(screen.getByText('2 prayers answered')).toBeInTheDocument()
  })
})
