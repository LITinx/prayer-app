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

  it('sorts prayers by category and back to recent', async () => {
    ui()
    const rowTexts = () =>
      screen.getAllByText(/Grandma Ruth's|Wisdom for|Maya's safe|Tom & Elise|Sarah's visa/).map(e => e.textContent)

    await userEvent.click(screen.getByRole('button', { name: 'Category' }))
    expect(rowTexts()).toEqual([
      "Tom & Elise's marriage — patience and grace", // Family
      "Thankful for Maya's safe arrival 💙", // Gratitude
      'Wisdom for the job decision this month', // Guidance
      "Grandma Ruth's recovery after her surgery", // Health
      "Sarah's visa application to come through", // Provision
    ])

    await userEvent.click(screen.getByRole('button', { name: 'Recent' }))
    expect(rowTexts()[0]).toBe("Grandma Ruth's recovery after her surgery")
  })

  it('shows streak chip only for prayers with streak > 0', () => {
    ui()
    expect(screen.getByText('· 12D')).toBeInTheDocument()
    expect(screen.queryByText('· 0D')).not.toBeInTheDocument()
  })
})
