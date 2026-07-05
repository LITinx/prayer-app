export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  return <button aria-label="Close" onClick={onClose} className="hidden" />
}
