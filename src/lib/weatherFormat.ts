import { useLanguage, type Locale } from "@/i18n"

// Date and list formatting for the weather pages. Kinyarwanda day/month names
// are spelled out here because Intl support for rw-RW varies by browser.

const WD: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  rw: ["Ku cyumweru", "Kuwa mbere", "Kuwa kabiri", "Kuwa gatatu", "Kuwa kane", "Kuwa gatanu", "Kuwa gatandatu"],
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
