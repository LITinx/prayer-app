import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { saveCache } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'

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

beforeEach(() => {
  localStorage.clear()
  saveCache('local', demoState(Date.now(), todayStr()))
})
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

  it('Escape closes the sheet', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    expect(screen.getByRole('dialog', { name: 'Add a prayer request' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('NEW PRAYER REQUEST')).not.toBeInTheDocument()
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

  it('moves to review when recognition ends on its own', async () => {
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    act(() => {
      FakeRec.instance!.onresult!({ results: [[{ transcript: 'Peace for today' }]] })
    })
    act(() => { FakeRec.instance!.onend!() })
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('What would you like to pray for?')).toHaveValue('Peace for today')
  })

  it('creates a custom category inline and selects it', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), 'For the missionaries')
    await userEvent.click(screen.getByRole('button', { name: '+ New' }))
    await userEvent.type(screen.getByPlaceholderText('Category name'), 'Missions')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('button', { name: /Missions/, pressed: true })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
    expect(screen.getByText('For the missionaries')).toBeInTheDocument()
    expect(screen.getAllByText('Missions').length).toBeGreaterThan(0) // filter chip + tag on the new row
  })

  it('creating with an existing name in different case selects it without a duplicate', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add a prayer request' }))
    await userEvent.click(dialog.getByRole('button', { name: '+ New' }))
    await userEvent.type(dialog.getByPlaceholderText('Category name'), 'health')
    await userEvent.click(dialog.getByRole('button', { name: 'Create' }))
    expect(dialog.getByRole('button', { name: /Health/, pressed: true })).toBeInTheDocument()
    expect(dialog.getAllByRole('button', { name: /Health/ })).toHaveLength(1) // no duplicate chip
    expect(dialog.queryByPlaceholderText('Category name')).not.toBeInTheDocument() // editor closed
  })

  it('whitespace-only category name leaves Create disabled', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.click(screen.getByRole('button', { name: '+ New' }))
    await userEvent.type(screen.getByPlaceholderText('Category name'), '   ')
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })
})
