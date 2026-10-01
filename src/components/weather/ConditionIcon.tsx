import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Moon, Sun, type LucideIcon } from "lucide-react"
import type { Condition } from "@/lib/weather"

const DAY: Record<Condition, LucideIcon> = {
  clear: Sun, clouds: CloudSun, drizzle: CloudDrizzle, rain: CloudRain, thunderstorm: CloudLightning, fog: CloudFog,
}
const NIGHT: Partial<Record<Condition, LucideIcon>> = { clear: Moon, clouds: CloudMoon }

export const CONDITION_COLOR: Record<Condition, string> = {
  clear: "#e39a1c", clouds: "#8a97a3", drizzle: "#4a8fd6", rain: "#2f6fc0", thunderstorm: "#3a55b0", fog: "#8a97a3",
}
const NIGHT_COLOR = "#6b7a99"

export function conditionIcon(cond: Condition, night = false): { Icon: LucideIcon; color: string } {
  const nightIcon = night ? NIGHT[cond] : undefined
  return { Icon: nightIcon ?? DAY[cond] ?? Cloud, color: nightIcon ? NIGHT_COLOR : CONDITION_COLOR[cond] }
}

type Props = { cond: Condition; night?: boolean; size?: number; strokeWidth?: number; className?: string }

export function ConditionIcon({ cond, night = false, size = 20, strokeWidth = 2, className }: Props) {
  const { Icon, color } = conditionIcon(cond, night)
  return <Icon aria-hidden size={size} strokeWidth={strokeWidth} color={color} className={className} />
}
