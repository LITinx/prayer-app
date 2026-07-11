import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { saveCache } from './store/persistence'
import { demoState } from './test/fixtures'
import { todayStr } from './lib/time'

const mockSession = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('./auth/useSession', () => ({ useSession: () => mockSession.current }))

vi.mock('./sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }), // keeps cached fixture state
  importLegacy: vi.fn(async () => {}),
}))

// SignIn (rendered when signed out) imports the real supabase client, which
// throws in tests without env vars — stub it out here too.
vi.mock('./lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))

beforeEach(() => {
  localStorage.clear()
  mockSession.current = { user: { id: 'u-test' } }
  saveCache('u-test', demoState(Date.now(), todayStr()))
})

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

describe('App auth gate', () => {
  it('shows the sign-in screen when signed out', () => {
    mockSession.current = null
    render(<App />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('shows the app when signed in', () => {
    mockSession.current = { user: { id: 'u-test' } }
    saveCache('u-test', demoState(Date.now(), todayStr()))
    render(<App />)
    expect(screen.getByText('Prayer List')).toBeInTheDocument()
  })
})
