import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { StoreProvider } from '../store/StoreContext'
import { saveCache } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { PrayerDetail, monthGrid } from './PrayerDetail'
import { executeWrite } from '../sync/hydrate'

vi.mock('../sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }), // keeps cached fixture state
  importLegacy: vi.fn(async () => {}),
}))

vi.mock('../auth/useSession', () => ({ useSession: () => ({ user: { id: 'local' } }) }))

// SignIn (imported by App) pulls in the real supabase client, which throws
// in tests without env vars — stub it out even though it's never rendered here.
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn(async () => ({ error: null })) } } }))

function seeded(activePrayerId: string) {
  const s = demoState(Date.now(), todayStr())
  saveCache('local', { ...s, screen: 'prayerDetail', activePrayerId })
  return render(<StoreProvider userId="local"><PrayerDetail /></StoreProvider>)
}

beforeEach(() => localStorage.clear())

describe('PrayerDetail', () => {
  it('shows the prayer, its category, and total days prayed', () => {
    seeded('p1') // fixture: 6 log days
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText(/prayed 6 days/i)).toBeInTheDocument()
  })

  it('renders the current month calendar with prayed days marked', () => {
    seeded('p3') // 12-day run ending today
    const today = new Date()
    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    expect(screen.getByText(monthName)).toBeInTheDocument()
    // today is always marked for p3
    const cell = screen.getByLabelText(new RegExp(`^${today.getDate()}, prayed`))
    expect(cell).toBeInTheDocument()
  })

  it('pages to the previous month', async () => {
    seeded('p3')
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    const prev = new Date()
    prev.setDate(1)
    prev.setMonth(prev.getMonth() - 1)
    expect(screen.getByText(prev.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))).toBeInTheDocument()
  })

  it('shows the answered badge for answered prayers', () => {
    seeded('a1')
    expect(screen.getByText(/answered/i)).toBeInTheDocument()
  })

  it('back returns home', async () => {
    seeded('p1')
    await userEvent.click(screen.getByText('‹ Back'))
    // PrayerDetail renders nothing once screen changes; assert via store side effect:
    expect(screen.queryByText(/prayed 6 days/i)).not.toBeInTheDocument()
  })

  it('pages back across a year boundary and marks follow the cursor', async () => {
    // p4 has no fixture logs — give it exactly one, in December 2025
    const s = demoState(Date.now(), todayStr())
    s.logs.push({ id: 'p4-2025-12-15', prayerId: 'p4', prayedOn: '2025-12-15' })
    saveCache('local', { ...s, screen: 'prayerDetail', activePrayerId: 'p4' })
    render(<StoreProvider userId="local"><PrayerDetail /></StoreProvider>)

    // current month shows no marks for p4
    expect(screen.queryByLabelText(/, prayed$/)).not.toBeInTheDocument()

    const now = new Date()
    const monthsBack = (now.getFullYear() - 2025) * 12 + now.getMonth() - 11
    for (let i = 0; i < monthsBack; i++) {
      await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    }
    expect(screen.getByText('December 2025')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15, prayed — tap to unmark' })).toBeInTheDocument()
  })

  it('back from an answered prayer lands on the Answered screen', async () => {
    const s = demoState(Date.now(), todayStr())
    saveCache('local', { ...s, screen: 'prayerDetail', activePrayerId: 'a1' })
    render(<App />)
    await userEvent.click(screen.getByText('‹ Back'))
    expect(screen.getByText('Looking back with gratitude')).toBeInTheDocument()
  })
})

describe('calendar date toggle', () => {
  it('taps an unmarked past date to mark it, and again to unmark', async () => {
    seeded('p4') // p4 has no logs
    const today = new Date()
    // guaranteed-past cell: use day 1 unless today IS the 1st, then page back a month
    let day = 1
    if (today.getDate() === 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    }
    const before = screen.getByText(/Prayed 0 days/i)
    expect(before).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `${day} — tap to mark prayed` }))
    expect(screen.getByText(/Prayed 1 day$/i)).toBeInTheDocument()
    expect(executeWrite).toHaveBeenCalledWith(expect.objectContaining({ table: 'prayer_logs', op: 'insert' }))
    expect(screen.getByRole('button', { name: `${day}, prayed — tap to unmark` })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `${day}, prayed — tap to unmark` }))
    expect(screen.getByText(/Prayed 0 days/i)).toBeInTheDocument()
  })

  it('future dates are not tappable', async () => {
    seeded('p4')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    // every cell next month is future: no toggle buttons exist
    expect(screen.queryByRole('button', { name: /tap to mark prayed/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tap to unmark/ })).not.toBeInTheDocument()
  })

  it('toggling today on the calendar syncs with prayed state', async () => {
    seeded('p4')
    const dayNum = new Date().getDate()
    await userEvent.click(screen.getByRole('button', { name: `${dayNum} — tap to mark prayed` }))
    expect(screen.getByRole('button', { name: `${dayNum}, prayed — tap to unmark` })).toBeInTheDocument()
  })
})

describe('delete prayer', () => {
  it('confirm flow deletes an active prayer', async () => {
    seeded('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Delete prayer' }))
    expect(screen.getByText(/Delete forever\?/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    // PrayerDetail unmounts (screen changed + prayer gone)
    expect(screen.queryByText(/Grandma Ruth's recovery/)).not.toBeInTheDocument()
    expect(executeWrite).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'prayers', op: 'delete', match: { id: 'p1' } })
    )
  })

  it('cancel restores the quiet button', async () => {
    seeded('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Delete prayer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/Delete forever\?/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete prayer' })).toBeInTheDocument()
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
  })

  it('Escape cancels the confirm', async () => {
    seeded('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Delete prayer' }))
    expect(screen.getByText(/Delete forever\?/)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText(/Delete forever\?/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete prayer' })).toBeInTheDocument()
  })
})

describe('monthGrid', () => {
  it('February 2024 (leap year, starts Thursday): lead 3, 29 day cells, 32 total', () => {
    const cells = monthGrid(2024, 2)
    expect(cells).toHaveLength(32)
    expect(cells.slice(0, 3)).toEqual([null, null, null])
    expect(cells[3]).toBe(1)
    expect(cells.filter(c => c !== null)).toHaveLength(29)
    expect(cells[31]).toBe(29)
  })

  it('January 2023 (starts Sunday): lead 6', () => {
    const cells = monthGrid(2023, 1)
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(cells[6]).toBe(1)
    expect(cells.filter(c => c !== null)).toHaveLength(31)
  })

  it('July 2026 has 31 day cells', () => {
    const cells = monthGrid(2026, 7)
    expect(cells.filter(c => c !== null)).toHaveLength(31)
    expect(cells[cells.length - 1]).toBe(31)
  })
})
