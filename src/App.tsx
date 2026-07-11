import { useState } from 'react'
import { StoreProvider, useStore } from './store/StoreContext'
import { Home } from './screens/Home'
import { Groups } from './screens/Groups'
import { GroupDetail } from './screens/GroupDetail'
import { Answered } from './screens/Answered'
import { Reminders } from './screens/Reminders'
import { PrayerDetail } from './screens/PrayerDetail'
import { BottomNav } from './components/BottomNav'
import { VoiceOverlay } from './voice/VoiceOverlay'

function CurrentScreen() {
  const { state } = useStore()
  switch (state.screen) {
    case 'home': return <Home />
    case 'groups': return <Groups />
    case 'groupDetail': return <GroupDetail />
    case 'answered': return <Answered />
    case 'reminders': return <Reminders />
    case 'prayerDetail': return <PrayerDetail />
  }
}

function Shell() {
  const [voiceOpen, setVoiceOpen] = useState(false)
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-[linear-gradient(180deg,oklch(0.985_0.008_235)_0%,oklch(0.975_0.012_235)_100%)] shadow-[0_0_60px_oklch(0.6_0.08_245_/_.25)] pt-[max(12px,env(safe-area-inset-top))]">
      <CurrentScreen />
      <BottomNav onVoice={() => setVoiceOpen(true)} />
      {voiceOpen && <VoiceOverlay onClose={() => setVoiceOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
