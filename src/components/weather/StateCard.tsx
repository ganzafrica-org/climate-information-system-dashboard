import type { LucideIcon } from "lucide-react"
import { RefreshCw } from "lucide-react"

type Props = {
  icon: LucideIcon
  tone?: "neutral" | "error"
  title: string
  text?: string
  retryLabel?: string
  onRetry?: () => void
}

/** Centered card for the empty and error states of the weather pages. */
export function StateCard({ icon: Icon, tone = "neutral", title, text, retryLabel, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
      <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${tone === "error" ? "bg-[#fdecec] text-[#b42318]" : "bg-[#eef2f5] text-slate-500"}`}>
        <Icon className="h-[26px] w-[26px]" />
      </div>
      <div className="text-xl font-bold text-slate-900">{title}</div>
      {text && <p className="max-w-[480px] text-[15px] leading-normal text-slate-600">{text}</p>}
      {onRetry && retryLabel && (
        <button onClick={onRetry} className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#147677] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f5f60]">
          <RefreshCw className="h-4 w-4" /> {retryLabel}
        </button>
      )}
    </div>
  )
}
