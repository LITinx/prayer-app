import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { executeWrite, fetchAll, importLegacy } = vi.hoisted(() => ({
  executeWrite: vi.fn(async (_write: { table: string }) => {}),
  fetchAll: vi.fn(async () => ({
    profile: { name: 'Anna', initials: 'AR' },
    categories: [{ id: 'c1', name: 'Health', hue: 12 }],
    prayers: [{ id: 'p1', text: 'from server', categoryId: 'c1', answeredAt: null, createdAt: 1 }],
    logs: [],
  })),
  importLegacy: vi.fn(async () => {}),
}))
vi.mock('../sync/hydrate', () => ({ executeWrite, fetchAll, importLegacy }))

import { StoreProvider, useStore } from './StoreContext'
import { cacheKey, LEGACY_KEY } from './persistence'

const serverState = () => ({
  profile: { name: 'Anna', initials: 'AR' },
  categories: [{ id: 'c1', name: 'Health', hue: 12 }],
  prayers: [{ id: 'p1', text: 'from server', categoryId: 'c1', answeredAt: null, createdAt: 1 }],
  logs: [],
})

function Probe() {
  const { state, dispatch } = useStore()
  return (
    <div>
      <span data-testid="count">{state.prayers.length}</span>
      <span data-testid="err">{String(state.syncError)}</span>
      <button onClick={() => dispatch({ type: 'ADD_PRAYER', id: 'x1', text: 'new', categoryId: 'c1', now: 5 })}>add</button>
      <button onClick={() => dispatch({ type: 'ADD_CATEGORY', id: 'c9', name: 'Missions', hue: 180 })}>addcat</button>
      <button onClick={() => dispatch({ type: 'ADD_PRAYER', id: 'x2', text: 'p', categoryId: 'c9', now: 6 })}>addprayer</button>
      <button onClick={() => dispatch({ type: 'NAVIGATE', screen: 'answered' })}>nav</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  executeWrite.mockReset().mockImplementation(async () => {})
  fetchAll.mockReset().mockImplementation(async () => serverState())
  importLegacy.mockReset().mockImplementation(async () => {})
})

const ui = () => render(<StoreProvider userId="u1"><Probe /></StoreProvider>)

describe('StoreProvider', () => {
  it('hydrates from the server without importing when no legacy snapshot exists', async () => {
    ui()
    await act(async () => {})
    expect(importLegacy).not.toHaveBeenCalled()
    expect(fetchAll).toHaveBeenCalledWith('u1')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(JSON.parse(localStorage.getItem(cacheKey('u1'))!).prayers).toHaveLength(1)
  })

  it('imports a legacy v1 snapshot with the server categories before hydrating', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ prayers: [], answered: [] }))
    ui()
    await act(async () => {})
    expect(importLegacy).toHaveBeenCalledWith('u1', [{ id: 'c1', name: 'Health', hue: 12 }], expect.any(String))
    expect(fetchAll).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('write-through: data actions call executeWrite, local actions do not', async () => {
    ui()
    await act(async () => {})
    await userEvent.click(screen.getByText('add'))
    expect(executeWrite).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByText('nav'))
    expect(executeWrite).toHaveBeenCalledTimes(1) // unchanged
  })

  it('serializes writes in dispatch order so an insert cannot race its FK parent', async () => {
    const started: string[] = []
    let releaseFirst!: () => void
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve })
    executeWrite.mockImplementation(async (write: { table: string }) => {
      started.push(write.table)
      if (started.length === 1) await firstGate
    })
    ui()
    await act(async () => {})
    await userEvent.click(screen.getByText('addcat'))
    await userEvent.click(screen.getByText('addprayer'))
    // the category write is in flight; the prayer write must not have started yet
    expect(started).toEqual(['categories'])
    await act(async () => { releaseFirst() })
    expect(started).toEqual(['categories', 'prayers'])
  })

  it('sets syncError after a write fails twice, clears on next success', async () => {
    executeWrite.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x'))
    ui()
    await act(async () => {})
    await userEvent.click(screen.getByText('add'))
    await act(async () => {}) // retry settles
    expect(screen.getByTestId('err')).toHaveTextContent('true')
    executeWrite.mockResolvedValue(undefined)
    await userEvent.click(screen.getByText('add'))
    await act(async () => {})
    expect(screen.getByTestId('err')).toHaveTextContent('false')
  })
})
