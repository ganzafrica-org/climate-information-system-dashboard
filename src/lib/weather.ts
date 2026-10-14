import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { ApiResponse, WeatherData } from "@/types/weather"

// Shared data + helpers for the Forecast and Historical weather pages.
//   GET /api/weather/sectors              -> all 15 sectors, per-day forecast
//   GET /api/weather/location/:id         -> one sector: overview, advice, 3-hourly, alerts
//   GET /api/weather/historical/sectors   -> all 15 sectors, one row per day

export const SECTORS = [
  "Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza",
  "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro",
] as const

// ---------------------------------------------------------------------------
// Meteo Rwanda wording (numbers from OpenWeatherMap)
// ---------------------------------------------------------------------------

export type ChanceCat = "unlikely" | "possible" | "likely"
export type AmountCat = "dry" | "light" | "moderate" | "heavy"
export type RainCat = "no_rain" | "trace" | "light_rain" | "moderate_rain" | "heavy_rain" | "very_heavy"
export type CloudCat = "few_clouds" | "partly_cloudy" | "mostly_cloudy"

export const RAINY_DAY_MM = 1
export const LIGHT_RAIN_MM = 5
export const HEAVY_DAY_MM = 20
export const VERY_HEAVY_RAIN_MM = 50
export const HOT_DAY_C = 25
export const STRONG_WIND_KMH = 30
export const CHANCE_UNLIKELY_PCT = 30
export const CHANCE_LIKELY_PCT = 60

export const chanceCat = (pct: number): ChanceCat =>
  (pct < CHANCE_UNLIKELY_PCT ? "unlikely" : pct <= CHANCE_LIKELY_PCT ? "possible" : "likely")

/** 24-hour rainfall (mm) → Meteo Rwanda category. Each amount has one label. */
export function rainfallCategory(mm: number): RainCat {
  const amount = Number(mm) || 0
  if (amount <= 0) return "no_rain"
  if (amount < 1) return "trace"
  if (amount < 5) return "light_rain"
  if (amount < 20) return "moderate_rain"
  if (amount <= 50) return "heavy_rain"
  return "very_heavy"
}

/** Sky covered by cloud (0–100). 30% is partly cloudy; 60% is mostly cloudy. */
export function cloudCategory(percent: number): CloudCat {
  const clouds = Number(percent) || 0
  if (clouds < 30) return "few_clouds"
  if (clouds < 60) return "partly_cloudy"
  return "mostly_cloudy"
}

export const amountCat = (mm: number): AmountCat => {
  const r = rainfallCategory(mm)
  if (r === "no_rain" || r === "trace") return "dry"
  if (r === "light_rain") return "light"
  if (r === "moderate_rain") return "moderate"
  return "heavy"
}

/** OpenWeatherMap (metric) reports wind in m/s. */
export const msToKmh = (ms: number | null | undefined) => Math.round((ms ?? 0) * 3.6)

export type FieldCat = "good" | "maybe" | "avoid"
export function fieldCat(rainChance: number, rainfall: number): FieldCat {
  const c = chanceCat(rainChance)
  const a = amountCat(rainfall)
  if (c === "unlikely" && a === "dry") return "good"
  if (c === "likely" || a === "moderate" || a === "heavy") return "avoid"
  return "maybe"
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export type Condition = "clear" | "clouds" | "drizzle" | "rain" | "thunderstorm" | "fog"

/** Map OpenWeatherMap `main` (or a description) onto the icon set used by both pages. */
export function conditionOf(main?: string | null, description?: string | null): Condition {
  const s = `${main || ""} ${description || ""}`.toLowerCase()
  if (s.includes("thunder")) return "thunderstorm"
  if (s.includes("drizzle")) return "drizzle"
  if (s.includes("rain") || s.includes("shower")) return "rain"
  if (s.includes("clear") || s.includes("sun")) return "clear"
  if (/(mist|fog|haze|smoke|dust|sand|ash)/.test(s)) return "fog"
  return "clouds"
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const RAIN_FILL: Record<AmountCat, string> = {
  dry: "#eef1f3", light: "#c9def3", moderate: "#7fb0e2", heavy: "#2f6cbc",
}
export const RAIN_CAT_FILL: Record<RainCat, string> = {
  no_rain: "#eef1f3",
  trace: "#e4eef6",
  light_rain: "#c9def3",
  moderate_rain: "#7fb0e2",
  heavy_rain: "#2f6cbc",
  very_heavy: "#163a6e",
}
export const NO_DATA_FILL = "#d9dee2"

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
function mixc(a: number[], b: number[], t: number) {
  const k = clamp01(t)
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",")})`
}

/** Cool blue -> pale -> warm orange/red. */
export function tempRamp(t: number) {
  t = clamp01(t)
  return t < 0.5 ? mixc([120, 170, 220], [250, 240, 215], t / 0.5) : mixc([250, 240, 215], [226, 96, 52], (t - 0.5) / 0.5)
}
/** Very light -> deep blue. */
export function rainRamp(t: number) {
  t = clamp01(t)
  return t < 0.5 ? mixc([238, 244, 250], [134, 182, 230], t / 0.5) : mixc([134, 182, 230], [23, 72, 150], (t - 0.5) / 0.5)
}
/** Day-list temperature bar (pale yellow -> orange). */
export const warmRamp = (t: number) => mixc([247, 214, 120], [236, 116, 58], t)

// ---------------------------------------------------------------------------
// Forecast: all sectors
// ---------------------------------------------------------------------------

export type SectorDay = {
  dt: number
  tempDay?: number
  tempMin?: number
  tempMax?: number
  rainfall: number
  rainAmount?: number
  rain?: number
  rainCategory?: string | null
  rainChance: number
  humidity?: number
  windSpeed?: number
  condition?: string
  conditionMain?: string
  icon?: string | null
  overview?: string | null
  farmingRecommendation?: string | null
  farmingAdvice?: string | null
  soilCondition?: string | null
  rainPrediction?: { willRain?: boolean; timing?: string; confidence?: string } | null
}

export type SectorWeather = {
  sector: string
  locationId?: number | null
  lat: number
  lon: number
  temp: number | null
  tempMin: number | null
  tempMax: number | null
  rainfall: number | null
  rainChance: number | null
  humidity: number | null
  windSpeed: number | null
  condition: string
  conditionMain?: string
  overview?: string | null
  farmingRecommendation?: string | null
  farmingAdvice?: string | null
  soilCondition?: string | null
  rainPrediction?: { willRain?: boolean; timing?: string; confidence?: string } | null
  days: SectorDay[]
  error?: boolean
}

type SectorWeatherResponse = {
  status: string
  cached: boolean
  generatedAt: string
  count: number
  data: SectorWeather[]
}

function asSectorList(res: unknown): SectorWeather[] {
  const body = res as Record<string, unknown> | unknown[] | null
  const nested = body && !Array.isArray(body) ? (body as Record<string, unknown>).data : undefined
  const raw = Array.isArray(body)
    ? body
    : Array.isArray(nested)
      ? nested
      : Array.isArray((nested as { sectors?: unknown } | undefined)?.sectors)
        ? (nested as { sectors: SectorWeather[] }).sectors
        : Array.isArray((body as { sectors?: unknown } | null)?.sectors)
          ? (body as { sectors: SectorWeather[] }).sectors
          : []
  return raw.map((row) => {
    const s = row as SectorWeather & { name?: string; locationName?: string }
    const name = String(s.sector || s.name || s.locationName || "").trim()
    const match = SECTORS.find((x) => x.toLowerCase() === name.toLowerCase())
    return { ...s, sector: match || name }
  })
}

export function useSectorWeather() {
  return useQuery({
    queryKey: ["weather-sectors"],
    queryFn: async () => {
      const res = await api.get<SectorWeatherResponse>("/api/weather/sectors")
      const body = res as SectorWeatherResponse & { generatedAt?: string }
      const inner = (body as unknown as { data?: { generatedAt?: string } }).data
      return {
        sectors: asSectorList(res),
        generatedAt: body.generatedAt || inner?.generatedAt,
      }
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}

/** One forecast day, normalised for display (°C, mm, %, km/h). */
export type Day = {
  index: number
  date: Date
  iso: string
  condition: Condition
  tempMin: number
  tempMax: number
  rainfall: number | null
  rainCategory?: RainCat | null
  rainChance: number
  humidity: number | null
  windKmh: number
}

export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const RAIN_CATS: RainCat[] = ["no_rain", "trace", "light_rain", "moderate_rain", "heavy_rain", "very_heavy"]

export function asRainCat(value?: string | null): RainCat | undefined {
  const k = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  return (RAIN_CATS as string[]).includes(k) ? (k as RainCat) : undefined
}

/** Millimetres as sent on this API day. Null if that day has no rain field. */
export function rainMmFromApi(d: { rainfall?: number | null; rainAmount?: number | null; rain?: number | null } | undefined) {
  if (!d) return null
  const hasOwn =
    Object.prototype.hasOwnProperty.call(d, "rainfall") ||
    Object.prototype.hasOwnProperty.call(d, "rainAmount") ||
    Object.prototype.hasOwnProperty.call(d, "rain")
  if (!hasOwn) return null
  const v = d.rainfall ?? d.rainAmount ?? d.rain
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function rainCatFromApi(
  d: { rainCategory?: string | null; rainfall?: number | null; rainAmount?: number | null; rain?: number | null } | undefined,
) {
  return asRainCat(d?.rainCategory) ?? rainfallCategory(rainMmFromApi(d) ?? 0)
}

function dayDate(d: { dt?: number | string; date?: string }, fallback = new Date()) {
  if (d?.date) {
    const parsed = new Date(d.date)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const n = Number(d?.dt)
  if (Number.isFinite(n) && n > 0) return new Date(n > 1e12 ? n : n * 1000)
  return fallback
}

function toDay(index: number, d: SectorDay, sw: SectorWeather): Day {
  const date = dayDate(d)
  const tDay = d.tempDay ?? sw.temp ?? 0
  return {
    index,
    date,
    iso: isoDay(date),
    condition: conditionOf(d.conditionMain || sw.conditionMain, d.condition || sw.condition),
    tempMin: Math.round(d.tempMin ?? sw.tempMin ?? tDay ?? 0),
    tempMax: Math.round(d.tempMax ?? sw.tempMax ?? tDay ?? 0),
    rainfall: rainMmFromApi(d),
    rainCategory: asRainCat(d.rainCategory),
    rainChance: Math.round(d.rainChance ?? sw.rainChance ?? 0),
    humidity: d.humidity ?? sw.humidity ?? null,
    windKmh: msToKmh(d.windSpeed ?? sw.windSpeed),
  }
}

export function sectorDays(sw: SectorWeather | undefined): Day[] {
  if (!sw || sw.error) return []
  if (sw.days?.length) return sw.days.map((d, index) => toDay(index, d, sw))
  // Some `/sectors` payloads only send today's totals on the sector (no `days[]`).
  if (sw.rainfall != null || sw.temp != null || sw.tempMax != null || sw.tempMin != null) {
    return [toDay(0, {
      dt: Math.floor(Date.now() / 1000),
      tempMin: sw.tempMin ?? undefined,
      tempMax: sw.tempMax ?? undefined,
      rainfall: sw.rainfall as number,
      rainChance: sw.rainChance ?? 0,
      humidity: sw.humidity ?? undefined,
      windSpeed: sw.windSpeed ?? undefined,
      condition: sw.condition,
      conditionMain: sw.conditionMain,
    }, sw)]
  }
  return []
}

// ---------------------------------------------------------------------------
// Forecast: one sector (overview, farming advice, 3-hourly, alerts)
// ---------------------------------------------------------------------------

export function useLocationWeather(locationId: number | null | undefined) {
  return useQuery({
    queryKey: ["weather-location", locationId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WeatherData>>(`/api/weather/location/${locationId}`, {
        params: { type: "daily", createAlert: false },
      })
      return res.data
    },
    enabled: locationId != null,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}

// ---------------------------------------------------------------------------
// History: all sectors, one row per day
// ---------------------------------------------------------------------------

export type DailyRecord = { date: string; min: number; max: number; avg: number; rain: number; rainChance: number | null }

export type SectorHistoryRows = {
  sector: string
  locationId: number | null
  firstDate: string | null
  lastDate: string | null
  records: DailyRecord[]
}

type SectorHistoryResponse = {
  status: string
  data: { startDate: string; endDate: string; sectors: SectorHistoryRows[] }
}

export function useSectorHistory(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ["weather-history-sectors", startDate, endDate],
    queryFn: async () => {
      const res = await api.get<SectorHistoryResponse>("/api/weather/historical/sectors", { params: { startDate, endDate } })
      const bySector: Record<string, SectorHistoryRows> = {}
      for (const s of res.data?.sectors ?? []) bySector[s.sector] = s
      return bySector
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })
}

export type MonthStats = {
  ym: string // YYYY-MM
  rain: number
  rainyDays: number
  heavy: number
  tmax: number
  tmin: number
  tavg: number
  /** Days with a record vs calendar days of this month inside the period. */
  days: number
  expectedDays: number
}

export type PeriodStats = {
  /** Days with a record vs calendar days in the period; history only has days someone saved. */
  count: number
  expectedDays: number
  coverage: number
  /** Average rain per recorded day, for fair comparisons when coverage differs. */
  perDay: number
  total: number
  rainyDays: number
  heavyDays: number
  hotDays: number
  avgMax: number
  avgMin: number
  longestDry: { len: number; from?: string; to?: string }
  hottest: DailyRecord
  coldest: DailyRecord
  months: MonthStats[]
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

/** Totals, extremes and monthly rows for one sector's records inside [start, end]. */
export function periodStats(records: DailyRecord[] | undefined, start: string, end: string): PeriodStats | null {
  const recs = (records ?? []).filter((r) => r.date >= start && r.date <= end).sort((a, b) => a.date.localeCompare(b.date))
  if (!recs.length) return null

  const byMonth = new Map<string, DailyRecord[]>()
  for (const r of recs) {
    const k = r.date.slice(0, 7)
    if (!byMonth.has(k)) byMonth.set(k, [])
    byMonth.get(k)!.push(r)
  }
  const months: MonthStats[] = Array.from(byMonth.entries()).map(([ym, rs]) => ({
    ym,
    rain: Math.round(rs.reduce((s, r) => s + r.rain, 0)),
    rainyDays: rs.filter((r) => r.rain >= RAINY_DAY_MM).length,
    heavy: rs.filter((r) => r.rain >= HEAVY_DAY_MM).length,
    tmax: Math.round(mean(rs.map((r) => r.max))),
    tmin: Math.round(mean(rs.map((r) => r.min))),
    tavg: Math.round(mean(rs.map((r) => r.avg)) * 10) / 10,
    days: rs.length,
    expectedDays: daysInMonthWithin(ym, start, end),
  }))

  // Longest run of consecutive calendar days under 1 mm (a missing day breaks the run).
  let best: PeriodStats["longestDry"] = { len: 0 }
  let cur = 0
  let curStart = ""
  let prev = ""
  for (const r of recs) {
    const consecutive = prev && dayDiff(prev, r.date) === 1
    if (r.rain < RAINY_DAY_MM) {
      if (!cur || !consecutive) { cur = 0; curStart = r.date }
      cur++
      if (cur > best.len) best = { len: cur, from: curStart, to: r.date }
    } else cur = 0
    prev = r.date
  }

  const expectedDays = dayDiff(start, end) + 1
  const rawTotal = recs.reduce((s, r) => s + r.rain, 0)
  return {
    count: recs.length,
    expectedDays,
    coverage: recs.length / Math.max(1, expectedDays),
    perDay: Math.round((rawTotal / recs.length) * 10) / 10,
    total: Math.round(rawTotal),
    rainyDays: recs.filter((r) => r.rain >= RAINY_DAY_MM).length,
    heavyDays: recs.filter((r) => r.rain >= HEAVY_DAY_MM).length,
    hotDays: recs.filter((r) => r.max >= HOT_DAY_C).length,
    avgMax: Math.round(mean(recs.map((r) => r.max))),
    avgMin: Math.round(mean(recs.map((r) => r.min))),
    longestDry: best,
    hottest: recs.reduce((a, b) => (b.max > a.max ? b : a)),
    coldest: recs.reduce((a, b) => (b.min < a.min ? b : a)),
    months,
  }
}

const parseDay = (iso: string) => new Date(`${iso}T00:00:00`)
export function dayDiff(a: string, b: string) {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5)
}
function daysInMonthWithin(ym: string, start: string, end: string) {
  const first = `${ym}-01`
  const last = isoDay(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0))
  const from = first > start ? first : start
  const to = last < end ? last : end
  return to < from ? 0 : dayDiff(from, to) + 1
}

/** Coverage differs enough that totals can't be compared fairly (10 percentage points). */
export const coverageDiffers = (a: PeriodStats, b: PeriodStats) => Math.abs(a.coverage - b.coverage) > 0.1

export function addDays(iso: string, n: number) {
  const d = parseDay(iso)
  d.setDate(d.getDate() + n)
  return isoDay(d)
}
export const minusYear = (iso: string) => `${+iso.slice(0, 4) - 1}${iso.slice(4)}`.replace(/-02-29$/, "-02-28")

/** Rwanda's farming seasons: A Sep–Jan, B Feb–May, C Jun–Aug (month index 0–11). */
export type Season = "A" | "B" | "C"
export const seasonOf = (m: number): Season => (m >= 8 || m === 0 ? "A" : m <= 4 ? "B" : "C")

/** Start/end of the season containing `iso`, plus the season before it. */
export function seasonRange(iso: string): { season: Season; start: string; end: string } {
  const y = +iso.slice(0, 4)
  const m = +iso.slice(5, 7) - 1
  const s = seasonOf(m)
  if (s === "A") {
    const startYear = m === 0 ? y - 1 : y
    return { season: "A", start: `${startYear}-09-01`, end: `${startYear + 1}-01-31` }
  }
  if (s === "B") return { season: "B", start: `${y}-02-01`, end: `${y}-05-31` }
  return { season: "C", start: `${y}-06-01`, end: `${y}-08-31` }
}
export function previousSeason(iso: string) {
  return seasonRange(addDays(seasonRange(iso).start, -1))
}
