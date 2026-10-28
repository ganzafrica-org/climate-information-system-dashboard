import { useLanguage, type Locale } from "@/i18n"

// Date and list formatting for the weather pages. Kinyarwanda day/month names
// are spelled out here because Intl support for rw-RW varies by browser.

const WD: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  rw: ["Ku Cyumweru", "Kuwa Mbere", "Kuwa Kabiri", "Kuwa Gatatu", "Kuwa Kane", "Kuwa Gatanu", "Kuwa Gatandatu"],
}
const WDL: Record<Locale, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  rw: WD.rw,
}
const MON: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  rw: ["Mut", "Gas", "Wer", "Mat", "Gic", "Kam", "Nya", "Kan", "Nze", "Ukw", "Ugu", "Uku"],
}
const MONL: Record<Locale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  rw: ["Mutarama", "Gashyantare", "Werurwe", "Mata", "Gicurasi", "Kamena", "Nyakanga", "Kanama", "Nzeri", "Ukwakira", "Ugushyingo", "Ukuboza"],
}

export const KIGALI_TZ = "Africa/Kigali"

/** Calendar date in Kigali, as YYYY-MM-DD. */
export function kigaliTodayISO(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KIGALI_TZ }).format(date)
}

/** Hour and month in Kigali, so greetings and seasons do not follow the laptop clock. */
export function kigaliNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: KIGALI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return {
    iso: `${pick("year")}-${pick("month")}-${pick("day")}`,
    month: Number(pick("month")),
    hour: Number(pick("hour")),
  }
}

/** Monday through Sunday of the Kigali week that contains this date. */
export function kigaliWeekDates(todayIso = kigaliTodayISO()) {
  const [year, month, day] = todayIso.split("-").map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return Array.from({ length: 7 }, (_, index) => addISODays(todayIso, mondayOffset + index))
}

export function addISODays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return next.toISOString().slice(0, 10)
}

export const weekday = (d: Date, lang: Locale, long = false) => (long ? WDL : WD)[lang][d.getDay()]
export const monthName = (m: number, lang: Locale, long = false) => (long ? MONL : MON)[lang][m]

/** "1 Oct", "1 October", "1 Oct 2026". */
export function dayMonth(d: Date, lang: Locale, opts: { long?: boolean; year?: boolean } = {}) {
  return `${d.getDate()} ${monthName(d.getMonth(), lang, opts.long)}${opts.year ? ` ${d.getFullYear()}` : ""}`
}
export const fromIso = (iso: string) => new Date(`${iso}T00:00:00`)

/** "A, B and C" / "A, B na C". */
export function joinList(items: string[], lang: Locale) {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join(", ")}${lang === "rw" ? " na " : " and "}${items[items.length - 1]}`
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US")

/** Translator scoped to the `wx` block of the locale files. */
export function useWx() {
  const { t, locale } = useLanguage()
  const w = (key: string, params?: Record<string, string | number>) => t(`wx.${key}`, params)
  const ago = (iso?: string | null) => {
    if (!iso) return ""
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (mins < 2) return w("justNow")
    if (mins < 60) return w("minAgo", { n: mins })
    if (mins < 48 * 60) return w("hAgo", { n: Math.round(mins / 60) })
    return w("dAgo", { n: Math.round(mins / 1440) })
  }
  return { w, t, lang: locale, ago }
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
