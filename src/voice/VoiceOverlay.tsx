import { useEffect, useRef, useState } from 'react'
import type { Category } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CATEGORIES, catColor } from '../store/categories'
import { useSpeech } from './useSpeech'
import { categorize } from './categorize'

const EQ_BARS = [
  { delay: 0, color: 'oklch(0.65 0.12 248)' },
  { delay: 0.12, color: 'oklch(0.62 0.13 254)' },
  { delay: 0.24, color: 'oklch(0.6 0.14 260)' },
  { delay: 0.36, color: 'oklch(0.62 0.13 254)' },
  { delay: 0.48, color: 'oklch(0.65 0.12 248)' },
]

export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  const speech = useSpeech()
  const [stage, setStage] = useState<'listening' | 'review'>(speech.supported ? 'listening' : 'review')
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>('Guidance')
  const [picked, setPicked] = useState(false)
  const startedRef = useRef(false)

  // start listening once on mount (guarded for StrictMode double-invoke)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (speech.supported) speech.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // mic error while listening → drop to review with whatever transcript we have
  useEffect(() => {
    if (stage === 'listening' && speech.error) {
      setText(speech.transcript.trim())
      setStage('review')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error])

  // auto-categorize until the user picks a chip manually
  useEffect(() => {
    if (!picked) setCategory(categorize(text))
  }, [text, picked])

  function finishListening() {
    speech.stop()
    setText(speech.transcript.trim())
    setStage('review')
  }

  function add() {
    const t = text.trim()
    if (!t) return
    dispatch({ type: 'ADD_PRAYER', id: crypto.randomUUID(), text: t, category })
    onClose()
  }

  function close() {
    speech.stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[430px] bg-[oklch(0.22_0.05_258_/_.55)] backdrop-blur-[6px] flex items-end animate-fade-up">
      <button aria-label="Close" onClick={close} className="absolute inset-0 cursor-default" />
      <div className="relative w-full bg-[oklch(0.99_0.006_235)] rounded-t-[32px] px-[22px] pt-[22px] pb-[max(30px,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_oklch(0.3_0.08_258_/_.4)] animate-fade-up">
        <div className="w-10 h-1 rounded bg-[oklch(0.86_0.02_245)] mx-auto mb-5" />

        {stage === 'listening' ? (
          <>
            <div className="text-center text-[13px] font-bold text-[oklch(0.58_0.1_248)] tracking-[.03em] mb-1.5">
              LISTENING…
            </div>
            <div className="text-center text-base text-[oklch(0.35_0.03_255)] min-h-12 leading-[1.4] px-1.5">
              {speech.transcript}
              <span className="animate-caret text-[oklch(0.6_0.12_248)] font-bold">|</span>
            </div>
            <div className="flex items-center justify-center gap-[5px] h-14 mt-3.5 mb-5">
              {EQ_BARS.map((b, i) => (
                <span
                  key={i}
                  className="w-1.5 h-full rounded-md animate-eq"
                  style={{ background: b.color, animationDelay: `${b.delay}s` }}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={finishListening}
                aria-label="Stop listening"
                className="relative w-[74px] h-[74px] rounded-full bg-[oklch(0.62_0.14_255)] flex items-center justify-center shadow-[0_10px_26px_-6px_oklch(0.55_0.15_255_/_.7)]"
              >
                <span className="absolute inset-0 rounded-full bg-[oklch(0.62_0.14_255)] animate-pulse-ring" />
                <span className="relative w-[22px] h-[22px] bg-white rounded-md" />
              </button>
            </div>
            <div className="text-center text-[12.5px] text-[oklch(0.58_0.03_250)] mt-3.5">Tap to stop</div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-[oklch(0.58_0.1_248)] tracking-[.04em] mb-2.5">
              NEW PRAYER REQUEST
            </div>
            <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-4 mb-4">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What would you like to pray for?"
                rows={3}
                autoFocus
                className="w-full resize-none outline-none text-[19px] leading-[1.35] text-[oklch(0.28_0.04_255)] placeholder:text-[oklch(0.7_0.02_250)] bg-transparent"
              />
            </div>
            <div className="text-[12.5px] font-bold text-[oklch(0.5_0.03_255)] mb-2.5">Suggested category</div>
            <div className="flex flex-wrap gap-2 mb-[22px]">
              {CATEGORIES.map(name => {
                const active = name === category
                const c = catColor(name)
                return (
                  <button
                    key={name}
                    aria-pressed={active}
                    onClick={() => { setCategory(name); setPicked(true) }}
                    className="inline-flex items-center text-[13px] font-bold px-[13px] py-2 rounded-md transition-all"
                    style={active ? { background: c.fg, color: '#fff' } : { background: c.bg, color: c.fg }}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full mr-[7px] inline-block"
                      style={{ background: active ? '#fff' : c.dot }}
                    />
                    {name}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={close}
                className="flex-none px-5 py-3.5 rounded-2xl bg-[oklch(0.95_0.01_245)] text-[oklch(0.5_0.03_255)] font-bold text-sm"
              >
                Discard
              </button>
              <button
                onClick={add}
                disabled={!text.trim()}
                className="flex-1 text-center py-3.5 rounded-2xl bg-[linear-gradient(140deg,oklch(0.64_0.13_250),oklch(0.58_0.15_264))] text-white font-bold text-sm shadow-[0_10px_22px_-8px_oklch(0.55_0.15_255_/_.7)] disabled:opacity-50"
              >
                Add to prayer list
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
