import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore } from '../store/StoreContext'
import { saveCache } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { Groups } from './Groups'
import { GroupDetail } from './GroupDetail'

function GroupsFlow() {
  const { state } = useStore()
  return state.screen === 'groupDetail' ? <GroupDetail /> : <Groups />
}

vi.mock('../sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }), // keeps cached fixture state
  importLegacy: vi.fn(async () => {}),
}))

const ui = () => render(<StoreProvider userId="local"><GroupsFlow /></StoreProvider>)

beforeEach(() => {
  localStorage.clear()
  saveCache('local', demoState(Date.now(), todayStr()))
})

describe('Groups', () => {
  it('lists groups', () => {
    ui()
    expect(screen.getByText('Morning Grace')).toBeInTheDocument()
    expect(screen.getByText('6 members · 8 requests')).toBeInTheDocument()
    expect(screen.getByText('4 praying now')).toBeInTheDocument()
    expect(screen.getByText('Riverside Small Group')).toBeInTheDocument()
  })

  it('opens group detail with its feed', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    expect(screen.getByText('Shared requests')).toBeInTheDocument()
    expect(screen.getByText(/Traveling mercies/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pray · 12/ })).toBeInTheDocument()
  })

  it('toggles praying on a feed item and persists count', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    await userEvent.click(screen.getByRole('button', { name: /Pray · 12/ }))
    expect(screen.getByRole('button', { name: /🙏 Praying · 13/ })).toBeInTheDocument()
  })

  it('filters the shared requests feed by selected categories', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    const feedTexts = () =>
      screen.getAllByText(/Traveling mercies|biopsy results|sister said yes/).map(e => e.textContent)

    expect(feedTexts()).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Health' }))
    expect(feedTexts()).toEqual(["My mom's biopsy results come in Thursday. Peace for the whole family."])

    await userEvent.click(screen.getByRole('button', { name: 'Health' }))
    expect(feedTexts()).toHaveLength(3)
  })

  it('back link returns to groups list', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    await userEvent.click(screen.getByText('‹ Groups'))
    expect(screen.getByText('Pray together, in one place')).toBeInTheDocument()
  })
})
