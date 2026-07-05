import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

class FakeRec {
  static instance: FakeRec | null = null
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  start() { FakeRec.instance = this }
  stop() { this.onend?.() }
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  FakeRec.instance = null
})

describe('VoiceOverlay — typed fallback (no speech support)', () => {
  it('opens straight into review mode and adds a typed prayer', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()

    const box = screen.getByPlaceholderText('What would you like to pray for?')
    await userEvent.type(box, 'Strength for my friend Daniel')

    // 'friend' keyword → Friends chip auto-selected
    expect(screen.getByRole('button', { name: /Friends/, pressed: true })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
    expect(screen.getByText('Strength for my friend Daniel')).toBeInTheDocument()
    expect(screen.getByText('6 Active')).toBeInTheDocument()
  })

  it('discard closes without adding', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('NEW PRAYER REQUEST')).not.toBeInTheDocument()
    expect(screen.getByText('5 Active')).toBeInTheDocument()
  })

  it('manually picking a chip overrides auto-categorization', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), 'hello')
    await userEvent.click(screen.getByRole('button', { name: /Church/ }))
    await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), ' my friend')
    expect(screen.getByRole('button', { name: /Church/, pressed: true })).toBeInTheDocument()
  })
})

describe('VoiceOverlay — listening flow', () => {
  it('transcribes, reviews, and adds the prayer', async () => {
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    expect(screen.getByText('LISTENING…')).toBeInTheDocument()

    act(() => {
      FakeRec.instance!.onresult!({ results: [[{ transcript: 'Please heal my mom' }]] })
    })
    expect(screen.getByText(/Please heal my mom/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Stop listening' }))
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('What would you like to pray for?')).toHaveValue('Please heal my mom')
    // 'heal' → Health
    expect(screen.getByRole('button', { name: /Health/, pressed: true })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
    expect(screen.getByText('Please heal my mom')).toBeInTheDocument()
  })

  it('falls back to review when the mic errors', async () => {
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    act(() => { FakeRec.instance!.onerror!({ error: 'not-allowed' }) })
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()
  })
})
