import { TYPING_DURATIONS, type DurationSec } from '#/domain/typing-engine'

type DurationTabsProps = {
  value: DurationSec
  onChange: (duration: DurationSec) => void
}

export function DurationTabs({ value, onChange }: DurationTabsProps) {
  return (
    <div
      className="duration-tabs flex gap-1 rounded-lg p-1"
      role="tablist"
      aria-label="Duration"
    >
      {TYPING_DURATIONS.map((d) => (
        <button
          key={d}
          type="button"
          role="tab"
          aria-selected={value === d}
          className={`duration-tab rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === d ? 'duration-tab-active' : ''
          }`}
          onClick={() => onChange(d)}
        >
          {d}
        </button>
      ))}
    </div>
  )
}
