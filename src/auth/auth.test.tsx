import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { listeners, mockAuth } = vi.hoisted(() => {
  const listeners: ((event: string, session: unknown) => void)[] = []
  const mockAuth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.push(cb)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
  }
  return { listeners, mockAuth }
})
vi.mock('../lib/supabase', () => ({ supabase: { auth: mockAuth } }))

import { useSession } from './useSession'
import { SignIn } from './SignIn'

function Probe() {
  const session = useSession()
  return <div data-testid="s">{session === undefined ? 'loading' : session ? 'in' : 'out'}</div>
}

beforeEach(() => {
  listeners.length = 0
  vi.clearAllMocks()
})

describe('useSession', () => {
  it('loading → signed out → signed in on auth event', async () => {
    render(<Probe />)
    expect(screen.getByTestId('s')).toHaveTextContent('loading')
    await act(async () => {}) // getSession resolves
    expect(screen.getByTestId('s')).toHaveTextContent('out')
    await act(async () => {
      listeners.forEach(l => l('SIGNED_IN', { user: { id: 'u1' } }))
    })
    expect(screen.getByTestId('s')).toHaveTextContent('in')
  })
})

describe('SignIn', () => {
  it('starts the Google OAuth flow', async () => {
    render(<SignIn />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    )
  })
})
