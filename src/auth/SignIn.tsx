import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  async function signIn() {
    setError(false)
    setPending(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(true)
      setPending(false)
    }
    // on success the browser navigates away, so pending stays on until then
  }
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-[linear-gradient(180deg,oklch(0.985_0.008_235)_0%,oklch(0.975_0.012_235)_100%)] flex flex-col items-center justify-center px-8 text-center">
      <div className="text-5xl mb-5">🕊️</div>
      <h1 className="text-[26px] font-medium text-[oklch(0.28_0.04_255)] mb-2">Prayer</h1>
      <p className="text-[14px] text-[oklch(0.55_0.03_250)] mb-9">
        Keep your prayers, streaks, and answered moments — on every device.
      </p>
      <button
        onClick={signIn}
        disabled={pending}
        className="w-full py-3.5 rounded-2xl bg-[linear-gradient(140deg,oklch(0.64_0.13_250),oklch(0.58_0.15_264))] text-white font-bold text-[15px] shadow-[0_10px_22px_-8px_oklch(0.55_0.15_255_/_.7)] disabled:opacity-60"
      >
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {error && (
        <p className="text-[13px] text-[oklch(0.55_0.18_25)] mt-4">
          Sign-in didn’t complete — please try again.
        </p>
      )}
    </div>
  )
}
