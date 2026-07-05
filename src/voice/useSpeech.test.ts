import { renderHook, act } from '@testing-library/react'
import { useSpeech } from './useSpeech'

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

afterEach(() => {
  delete (window as Record<string, unknown>).SpeechRecognition
  FakeRec.instance = null
})

describe('useSpeech', () => {
  it('reports unsupported when no SpeechRecognition exists', () => {
    const { result } = renderHook(() => useSpeech())
    expect(result.current.supported).toBe(false)
  })

  it('accumulates transcript from results and stops cleanly', () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    const { result } = renderHook(() => useSpeech())
    expect(result.current.supported).toBe(true)

    act(() => result.current.start())
    expect(result.current.listening).toBe(true)

    act(() => {
      FakeRec.instance!.onresult!({ results: [[{ transcript: 'heal my ' }], [{ transcript: 'friend' }]] })
    })
    expect(result.current.transcript).toBe('heal my friend')

    act(() => result.current.stop())
    expect(result.current.listening).toBe(false)
  })

  it('surfaces errors and stops listening', () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    const { result } = renderHook(() => useSpeech())
    act(() => result.current.start())
    act(() => { FakeRec.instance!.onerror!({ error: 'not-allowed' }) })
    expect(result.current.error).toBe('not-allowed')
    expect(result.current.listening).toBe(false)
  })
})
