import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore } from './StoreContext'
import { STORAGE_KEY } from './persistence'

function Probe() {
  const { state, dispatch } = useStore()
  return (
    <div>
      <span data-testid="count">{state.prayers.length}</span>
      <button onClick={() => dispatch({ type: 'MARK_ANSWERED', id: 'p1', now: 1 })}>answer</button>
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('StoreProvider', () => {
  it('hydrates seeded state and persists after dispatch', async () => {
    render(<StoreProvider><Probe /></StoreProvider>)
    expect(screen.getByTestId('count')).toHaveTextContent('5')
    await userEvent.click(screen.getByText('answer'))
    expect(screen.getByTestId('count')).toHaveTextContent('4')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.prayers).toHaveLength(4)
  })
})
