import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../store/StoreContext'
import { saveCache } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { PrayerDetail } from './PrayerDetail'

function seeded(activePrayerId: string) {
  const s = demoState(Date.now(), todayStr())
  saveCache('local', { ...s, screen: 'prayerDetail', activePrayerId })
  return render(<StoreProvider><PrayerDetail /></StoreProvider>)
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
})
