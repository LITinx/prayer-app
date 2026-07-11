import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { listeners, mockAuth, unsubscribe } = vi.hoisted(() => {
  const listeners: ((event: string, session: unknown) => void)[] = []
  const unsubscribe = vi.fn()
  const mockAuth = {
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      listeners.push(cb)
      return { data: { subscription: { unsubscribe } } }
    }),
    signInWithOAuth: vi.fn(async () => ({ error: null as unknown })),
  }
  return { listeners, mockAuth, unsubscribe }
})
vi.mock('../lib/supabase', () => ({ supabase: { auth: mockAuth } }))

import { useSession } from './useSession'
import { SignIn } from './SignIn'

function Probe() {
  const session = useSession()
  return <div data-testid="s">{session === undefined ? 'loading' : session ? 'in' : 'out'}</div>
}

function emit(event: string, session: unknown) {
  listeners.forEach(l => l(event, session))
}

beforeEach(() => {
  listeners.length = 0
  vi.clearAllMocks()
})

describe('useSession', () => {
  it('loading → signed out → signed in on auth events', async () => {
    render(<Probe />)
    expect(screen.getByTestId('s')).toHaveTextContent('loading')
    await act(async () => {
      emit('INITIAL_SESSION', null)
    })
    expect(screen.getByTestId('s')).toHaveTextContent('out')
    await act(async () => {
      emit('SIGNED_IN', { user: { id: 'u1' } })
    })
    expect(screen.getByTestId('s')).toHaveTextContent('in')
  })

  it('returns to signed out when a SIGNED_OUT event arrives', async () => {
    render(<Probe />)
    await act(async () => {
      emit('SIGNED_IN', { user: { id: 'u1' } })
    })
    expect(screen.getByTestId('s')).toHaveTextContent('in')
    await act(async () => {
      emit('SIGNED_OUT', null)
    })
    expect(screen.getByTestId('s')).toHaveTextContent('out')
  })

  it('hydrates a stored session when INITIAL_SESSION carries one', async () => {
    render(<Probe />)
    expect(screen.getByTestId('s')).toHaveTextContent('loading')
    await act(async () => {
      emit('INITIAL_SESSION', { user: { id: 'u1' } })
    })
    expect(screen.getByTestId('s')).toHaveTextContent('in')
  })

  it('unsubscribes from auth changes on unmount', () => {
    const { unmount } = render(<Probe />)
    expect(unsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('SignIn', () => {
  it('starts the Google OAuth flow and stays pending for the redirect', async () => {
    render(<SignIn />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({ redirectTo: window.location.origin }),
      })
    )
    // success ends in a full-page redirect, so the button never un-pends
    expect(screen.getByRole('button', { name: /redirecting/i })).toBeDisabled()
  })

  it('shows a retry message and re-enables the button when sign-in fails', async () => {
    mockAuth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'nope' } })
    render(<SignIn />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(screen.getByText(/didn’t complete — please try again/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeEnabled()
  })
})
