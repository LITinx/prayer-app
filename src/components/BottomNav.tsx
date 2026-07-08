import type { ReactNode } from 'react'
import type { Screen } from '../store/types'
import { useStore } from '../store/StoreContext'
import { MicIcon } from './MicIcon'

function NavGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const NAV_ICONS = {
  prayers: (
    <NavGlyph>
      <line x1="4.5" y1="6.5" x2="19.5" y2="6.5" />
      <line x1="4.5" y1="12" x2="19.5" y2="12" />
      <line x1="4.5" y1="17.5" x2="19.5" y2="17.5" />
    </NavGlyph>
  ),
  groups: (
    <NavGlyph>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </NavGlyph>
  ),
  answered: (
    <NavGlyph>
      <polyline points="4.5 12.5 9.5 17.5 19.5 7" />
    </NavGlyph>
  ),
  reminders: (
    <NavGlyph>
      <path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </NavGlyph>
  ),
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-[3px] transition-colors ${
        active ? 'text-[oklch(0.55_0.13_252)]' : 'text-[oklch(0.68_0.02_250)]'
      }`}
    >
      {icon}
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
          <NavItem icon={NAV_ICONS.prayers} label="Prayers" active={state.screen === 'home'} onClick={go('home')} />
          <NavItem icon={NAV_ICONS.groups} label="Groups" active={groupsActive} onClick={go('groups')} />
          <div className="w-[58px] flex-none" />
          <NavItem icon={NAV_ICONS.answered} label="Answered" active={state.screen === 'answered'} onClick={go('answered')} />
          <NavItem icon={NAV_ICONS.reminders} label="Reminders" active={state.screen === 'reminders'} onClick={go('reminders')} />
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
