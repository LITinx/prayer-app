import type { Screen } from '../store/types'
import { useStore } from '../store/StoreContext'
import { MicIcon } from './MicIcon'

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-[3px] transition-colors ${
        active ? 'text-[oklch(0.55_0.13_252)]' : 'text-[oklch(0.68_0.02_250)]'
      }`}
    >
      <span className="text-[19px] leading-none">{icon}</span>{' '}
      <span className="text-[9.5px] font-bold">{label}</span>
    </button>
  )
}

export function BottomNav({ onVoice }: { onVoice: () => void }) {
  const { state, dispatch } = useStore()
  const go = (screen: Screen) => () => dispatch({ type: 'NAVIGATE', screen })
  const groupsActive = state.screen === 'groups' || state.screen === 'groupDetail'
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto max-w-[430px] relative h-[110px] bg-[linear-gradient(180deg,transparent,oklch(0.985_0.008_235)_38%)]">
        <div className="pointer-events-auto absolute left-[18px] right-[18px] bottom-[max(26px,env(safe-area-inset-bottom))] h-[60px] bg-white/80 backdrop-blur-[18px] border border-[oklch(0.9_0.015_240)] rounded-3xl shadow-[0_12px_30px_-12px_oklch(0.5_0.07_250_/_.5)] flex items-center justify-around px-2.5">
          <NavItem icon="☰" label="Prayers" active={state.screen === 'home'} onClick={go('home')} />
          <NavItem icon="◎" label="Groups" active={groupsActive} onClick={go('groups')} />
          <div className="w-[58px] flex-none" />
          <NavItem icon="✓" label="Answered" active={state.screen === 'answered'} onClick={go('answered')} />
          <NavItem icon="☾" label="Reminders" active={state.screen === 'reminders'} onClick={go('reminders')} />
        </div>
        <button
          onClick={onVoice}
          aria-label="Add prayer by voice"
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[max(52px,calc(env(safe-area-inset-bottom)+26px))] w-16 h-16 rounded-full bg-[linear-gradient(140deg,oklch(0.66_0.13_248),oklch(0.58_0.15_264))] flex items-center justify-center shadow-[0_12px_28px_-6px_oklch(0.55_0.15_255_/_.7)] animate-mic-float"
        >
          <MicIcon />
        </button>
      </div>
    </div>
  )
}
