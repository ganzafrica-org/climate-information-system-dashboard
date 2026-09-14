"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover } from "@/components/ui/popover"

// A dependency-free month calendar in the interior/shadcn aesthetic. Supports
// single-date and range selection. No react-day-picker / date-fns — the project
// keeps its dependency surface minimal (see soil/weather pages).

const MS_DAY = 86_400_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function isSameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtISO(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

type BaseProps = {
  /** Earliest selectable day (inclusive). */
  min?: Date
  /** Latest selectable day (inclusive). */
  max?: Date
  /** Locale used for month + weekday names. */
  locale?: string
  className?: string
}

function buildGrid(view: Date) {
  const year = view.getFullYear()
  const month = view.getMonth()
  const first = new Date(year, month, 1)
  // Monday-first week (Rwanda convention): shift so Mon = 0.
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function MonthView({
  view,
  onNav,
  isSelected,
  isInRange,
  isRangeEnd,
  isDisabled,
  onPick,
  locale,
}: {
  view: Date
  onNav: (delta: number) => void
  isSelected: (d: Date) => boolean
  isInRange: (d: Date) => boolean
  isRangeEnd: (d: Date) => boolean
  isDisabled: (d: Date) => boolean
  onPick: (d: Date) => void
  locale?: string
}) {
  const cells = useMemo(() => buildGrid(view), [view])
  const today = startOfDay(new Date())
  const weekdays = useMemo(() => {
    // Monday-first short weekday labels.
    const base = new Date(2024, 0, 1) // a Monday
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getTime() + i * MS_DAY).toLocaleDateString(locale, { weekday: "short" }).slice(0, 2)
    )
  }, [locale])

  return (
    <div className="w-[248px]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => onNav(-1)} aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {view.toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => onNav(1)} aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {weekdays.map((w, i) => (
          <span key={i} className="text-center text-[10px] font-medium uppercase text-muted-foreground">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const sel = isSelected(d)
          const inRange = isInRange(d)
          const end = isRangeEnd(d)
          const disabled = isDisabled(d)
          const isToday = isSameDay(d, today)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors",
                disabled && "cursor-not-allowed opacity-30",
                !disabled && !sel && !inRange && "hover:bg-muted",
                inRange && !end && "rounded-none bg-[#147677]/10 text-[#147677]",
                (sel || end) && "bg-[#147677] font-semibold text-white hover:bg-[#0f5f5f]",
                isToday && !sel && !end && "font-semibold text-[#147677]"
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---- Single date ----
export type CalendarProps = BaseProps & {
  value: string | null
  onChange: (iso: string) => void
}

export function Calendar({ value, onChange, min, max, locale, className }: CalendarProps) {
  const selected = value ? parseISO(value) : null
  const [view, setView] = useState<Date>(() => selected ?? startOfDay(new Date()))
  const disabled = (d: Date) => (min && d < startOfDay(min)) || (max && d > startOfDay(max)) || false
  return (
    <div className={className}>
      <MonthView
        view={view}
        onNav={(delta) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))}
        isSelected={(d) => isSameDay(d, selected)}
        isInRange={() => false}
        isRangeEnd={() => false}
        isDisabled={disabled}
        onPick={(d) => onChange(fmtISO(d))}
        locale={locale}
      />
    </div>
  )
}

// ---- Date range ----
export type DateRange = { start: string; end: string }

export type CalendarRangeProps = BaseProps & {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function CalendarRange({ value, onChange, min, max, locale, className }: CalendarRangeProps) {
  const start = value.start ? parseISO(value.start) : null
  const end = value.end ? parseISO(value.end) : null
  // While picking, we hold the first click until a second completes the range.
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [view, setView] = useState<Date>(() => start ?? startOfDay(new Date()))

  const lo = anchor ?? start
  const hi = anchor ? null : end

  const disabled = (d: Date) => (min && d < startOfDay(min)) || (max && d > startOfDay(max)) || false

  const pick = (d: Date) => {
    if (!anchor) {
      // begin a fresh range
      setAnchor(d)
      onChange({ start: fmtISO(d), end: fmtISO(d) })
      return
    }
    // complete the range (order the two clicks)
    const a = anchor < d ? anchor : d
    const b = anchor < d ? d : anchor
    onChange({ start: fmtISO(a), end: fmtISO(b) })
    setAnchor(null)
  }

  const inRange = (d: Date) => {
    if (!lo) return false
    const day = startOfDay(d).getTime()
    const s = startOfDay(lo).getTime()
    const e = hi ? startOfDay(hi).getTime() : s
    return day >= Math.min(s, e) && day <= Math.max(s, e)
  }

  return (
    <div className={className}>
      <MonthView
        view={view}
        onNav={(delta) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))}
        isSelected={(d) => isSameDay(d, lo) || isSameDay(d, hi)}
        isInRange={inRange}
        isRangeEnd={(d) => isSameDay(d, lo) || isSameDay(d, hi)}
        isDisabled={disabled}
        onPick={pick}
        locale={locale}
      />
    </div>
  )
}

// ---- Range picker with popover trigger ----
export function DateRangePicker({
  value,
  onChange,
  min,
  max,
  locale,
  label = "Date range",
  className = "",
}: CalendarRangeProps & { label?: string }) {
  const [open, setOpen] = useState(false)
  const fmt = (iso: string) => (iso ? parseISO(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—")
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={label}
      side="bottom"
      align="start"
      triggerClassName={cn("w-full justify-between", className)}
      trigger={
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-left">{fmt(value.start)} – {fmt(value.end)}</span>
        </span>
      }
    >
      <CalendarRange value={value} onChange={onChange} min={min} max={max} locale={locale} />
    </Popover>
  )
}
