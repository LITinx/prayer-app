import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore } from './StoreContext'
import { cacheKey, saveCache } from './persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'

function Probe() {
  const { state, dispatch } = useStore()
  const active = state.prayers.filter(p => p.answeredAt === null).length
  return (
    <div>
      <span data-testid="count">{active}</span>
      <button onClick={() => dispatch({ type: 'MARK_ANSWERED', id: 'p1', now: 1 })}>answer</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  saveCache('local', demoState(Date.now(), todayStr()))
})

describe('StoreProvider', () => {
  it('hydrates stored state and persists after dispatch', async () => {
    render(<StoreProvider><Probe /></StoreProvider>)
    expect(screen.getByTestId('count')).toHaveTextContent('5')
    await userEvent.click(screen.getByText('answer'))
    expect(screen.getByTestId('count')).toHaveTextContent('4')
    const saved = JSON.parse(localStorage.getItem(cacheKey('local'))!)
    expect(saved.prayers.find((p: { id: string }) => p.id === 'p1').answeredAt).toBe(1)
  })
})
