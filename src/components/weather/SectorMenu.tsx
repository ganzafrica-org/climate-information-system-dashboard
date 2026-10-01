import { useEffect, useRef, useState, type ReactNode } from "react"
import { Search } from "lucide-react"

export type SectorMenuItem = { name: string; right?: ReactNode; active?: boolean }

type Props = {
  open: boolean
  onClose: () => void
  items: SectorMenuItem[]
  onPick: (name: string) => void
  searchPlaceholder: string
  noMatch: (q: string) => string
  align?: "left" | "right"
  width?: number
}

/** Searchable sector list shown under a trigger button. Closes on outside click or Escape. */
export function SectorMenu({ open, onClose, items, onPick, searchPlaceholder, noMatch, align = "left", width = 300 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    setQuery("")
    const onDown = (e: MouseEvent) => {
      const trigger = ref.current?.parentElement
      if (trigger && !trigger.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null
  const q = query.trim().toLowerCase()
  const shown = items.filter((i) => !q || i.name.toLowerCase().includes(q))

  return (
    <div
      ref={ref}
      className={`absolute top-[calc(100%+6px)] z-[1100] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.14)] ${align === "right" ? "right-0" : "left-0"}`}
      style={{ width }}
    >
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-slate-500">
        <Search className="h-4 w-4 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && shown[0]) onPick(shown[0].name) }}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none"
        />
      </label>
      <div role="listbox" className="mt-1.5 flex max-h-80 flex-col overflow-auto">
        {shown.map((i) => (
          <button
            key={i.name}
            role="option"
            aria-selected={!!i.active}
            onClick={() => onPick(i.name)}
            className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-900 hover:bg-slate-50 ${i.active ? "bg-[#eef6f6] font-bold" : "font-medium"}`}
          >
            <span className="min-w-0">{i.name}</span>
            {i.right}
          </button>
        ))}
        {shown.length === 0 && <div className="p-2.5 text-sm text-slate-500">{noMatch(query)}</div>}
      </div>
    </div>
  )
}
