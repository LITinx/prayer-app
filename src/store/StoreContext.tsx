import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { AppState } from './types'
import { reducer } from './reducer'
import type { Action } from './reducer'
import { loadCache, saveCache, emptyState } from './persistence'

const StoreCtx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadCache('local') ?? emptyState())

  useEffect(() => {
    saveCache('local', state)
  }, [state])

  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
