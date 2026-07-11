import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { AppState } from './types'
import { reducer } from './reducer'
import type { Action, HydrateData } from './reducer'
import { emptyState, loadCache, saveCache, readLegacyState } from './persistence'
import { writeForAction } from '../sync/mapper'
import { executeWrite, fetchAll, importLegacy } from '../sync/hydrate'
import { todayStr } from '../lib/time'

const StoreCtx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

/**
 * Must be remounted when the user changes (render with key={userId}) — the
 * reducer initializer, write chain, and refs assume a single user per mount.
 */
export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadCache(userId) ?? emptyState())
  const stateRef = useRef(state)
  stateRef.current = state
  // serializes background writes so a child insert can never overtake the
  // parent row it references (e.g. a prayer's category_id FK).
  const writeChain = useRef<Promise<void>>(Promise.resolve())
  // set when an optimistic write is queued; the hydration loop uses it to
  // detect writes that landed mid-fetch and would be wiped by a stale HYDRATE
  const dirtyRef = useRef(false)

  // hydrate: import a pre-account snapshot (needs the seeded categories to
  // resolve names) → fetch → HYDRATE. No snapshot means a single fetch.
  // If a write is dispatched while a fetch is in flight, wait for the queued
  // writes to land and refetch (bounded) so the snapshot reflects them.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (readLegacyState()) {
          const pre = await fetchAll(userId)
          await importLegacy(userId, pre.categories, todayStr())
        }
        let data: HydrateData | undefined
        for (let attempt = 0; attempt < 3; attempt++) {
          dirtyRef.current = false
          data = await fetchAll(userId)
          if (!dirtyRef.current) break
          await writeChain.current // let queued writes land, then refetch
        }
        if (!cancelled) dispatch({ type: 'HYDRATE', data: data! })
      } catch {
        if (!cancelled) dispatch({ type: 'SYNC_ERROR', failed: true })
      }
    })()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    saveCache(userId, state)
  }, [userId, state])

  // write-through dispatch: local state updates synchronously, the matching
  // Supabase write is queued behind prior writes and fires with one retry.
  const syncDispatch: Dispatch<Action> = action => {
    const hadLogToday =
      action.type === 'TOGGLE_PRAYED' &&
      stateRef.current.logs.some(l => l.prayerId === action.id && l.prayedOn === action.today)
    dispatch(action)
    const write = writeForAction(action, userId, { hadLogToday })
    if (!write) return
    dirtyRef.current = true
    writeChain.current = writeChain.current.then(() =>
      executeWrite(write)
        .catch(() => executeWrite(write))
        .then(() => dispatch({ type: 'SYNC_ERROR', failed: false }))
        .catch(() => dispatch({ type: 'SYNC_ERROR', failed: true }))
    )
  }

  return <StoreCtx.Provider value={{ state, dispatch: syncDispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
