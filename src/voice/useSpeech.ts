import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function teardown(rec: SpeechRecognitionLike | null) {
  if (!rec) return
  rec.onresult = null
  rec.onerror = null
  rec.onend = null
  rec.stop()
}

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const supported = typeof window !== 'undefined' && !!getCtor()

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('unsupported')
      return
    }
    teardown(recRef.current)
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    rec.onresult = e => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setTranscript(t)
    }
    rec.onerror = e => {
      setError(e.error ?? 'error')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setTranscript('')
    setError(null)
    setListening(true)
    rec.start()
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  // release the microphone and detach handlers if unmounted mid-listen
  useEffect(() => () => teardown(recRef.current), [])

  return { supported, listening, transcript, error, start, stop }
}
