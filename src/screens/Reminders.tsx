export function Reminders() {
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Reminders</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Gentle nudges to pray</p>
      <div className="flex flex-col items-center text-center mt-14">
        <div className="w-[72px] h-[72px] rounded-3xl bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-4xl">☾</div>
        <div className="mt-5 text-[17px] font-bold text-[oklch(0.28_0.04_255)]">Coming soon</div>
        <p className="mt-2 text-[13px] text-[oklch(0.55_0.03_250)] max-w-[240px] leading-relaxed">
          Daily reminders to return to your prayer list are on the way.
        </p>
      </div>
    </div>
  )
}
