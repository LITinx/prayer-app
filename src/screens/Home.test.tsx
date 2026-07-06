import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../store/StoreContext'
import { saveState } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { Home } from './Home'

const ui = () => render(<StoreProvider><Home /></StoreProvider>)

beforeEach(() => {
  localStorage.clear()
  saveState(demoState(Date.now(), todayStr()))
})

describe('Home', () => {
  it('renders greeting, streak card, and seeded prayer list', () => {
    ui()
    expect(screen.getByText(/Good (morning|afternoon|evening), Anna/)).toBeInTheDocument()
    expect(screen.getByText('7-day streak')).toBeInTheDocument()
    expect(screen.getByText('1 of 5 prayers lifted today')).toBeInTheDocument()
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
    expect(screen.getByText('5 Active')).toBeInTheDocument()
  })

  it('toggling a prayer updates the lifted-today count', async () => {
    ui()
    await userEvent.click(screen.getByLabelText(/Mark .*Grandma Ruth.* as prayed/))
    expect(screen.getByText('2 of 5 prayers lifted today')).toBeInTheDocument()
  })

  it('marking answered removes the row and updates the count', async () => {
    ui()
    await userEvent.click(screen.getByRole('button', { name: /Mark .*Grandma Ruth.* as answered/ }))
    expect(screen.queryByText(/Grandma Ruth's recovery/)).not.toBeInTheDocument()
    expect(screen.getByText('4 Active')).toBeInTheDocument()
  })

  it('filters prayers by selected categories and back to all', async () => {
    ui()
    const rowTexts = () =>
      screen.getAllByText(/Grandma Ruth's|Wisdom for|Maya's safe|Tom & Elise|Sarah's visa/).map(e => e.textContent)

    // single category
    await userEvent.click(screen.getByRole('button', { name: 'Health' }))
    expect(rowTexts()).toEqual(["Grandma Ruth's recovery after her surgery"])

    // multi-select adds a second category, original order kept
    await userEvent.click(screen.getByRole('button', { name: 'Guidance' }))
    expect(rowTexts()).toEqual([
      "Grandma Ruth's recovery after her surgery",
      'Wisdom for the job decision this month',
    ])

    // toggling both off shows everything again
    await userEvent.click(screen.getByRole('button', { name: 'Health' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guidance' }))
    expect(rowTexts()).toHaveLength(5)
  })

  it('only offers chips for categories present in the list', () => {
    ui()
    expect(screen.getByRole('button', { name: 'Provision' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Church' })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no prayers', () => {
    localStorage.clear() // fresh seed, no fixture
    ui()
    expect(screen.getByText(/No prayers yet — tap the mic to add one/)).toBeInTheDocument()
    expect(screen.getByText('0 Active')).toBeInTheDocument()
  })

  it('shows streak chip only for prayers with streak > 0', () => {
    ui()
    expect(screen.getByText('· 12D')).toBeInTheDocument()
    expect(screen.queryByText('· 0D')).not.toBeInTheDocument()
  })
})
