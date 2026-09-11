import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

// Per-sector weather (from GET /api/weather/sectors) for the choropleth pages.

export type SectorDay = {
  dt: number
  tempDay?: number
  tempMin?: number
  tempMax?: number
  rainfall: number
  rainChance: number
  humidity?: number
  windSpeed?: number
  condition?: string
}

export type SectorWeather = {
  sector: string
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

export function useSectorWeather() {
  return useQuery({
    queryKey: ["weather-sectors"],
    queryFn: async () => {
      const res = await api.get<SectorWeatherResponse>("/api/weather/sectors")
      return (res as any)?.data ?? res
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}

export type WeatherMetric = "temp" | "rainfall"

/** Value for a sector on a given day index for the chosen metric. */
export function metricValue(sw: SectorWeather, metric: WeatherMetric, dayIndex = 0): number | null {
  if (dayIndex === 0) {
    return metric === "temp" ? sw.temp : sw.rainfall
  }
  const d = sw.days?.[dayIndex]
  if (!d) return null
  return metric === "temp" ? (d.tempDay ?? null) : (d.rainfall ?? null)
}

// Sequential ramps (metric-appropriate). Temperature: blue→yellow→red.
// Rainfall: light→deep blue.
const TEMP_STOPS: [number, string][] = [
  [0, "#2c7fb8"], [0.25, "#7fcdbb"], [0.5, "#ffffb2"], [0.75, "#fd8d3c"], [1, "#e31a1c"],
]
const RAIN_STOPS: [number, string][] = [
  [0, "#f7fbff"], [0.3, "#c6dbef"], [0.6, "#6baed6"], [0.85, "#2171b5"], [1, "#08306b"],
]

function hex2rgb(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function mix(a: number[], b: number[], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
function ramp(stops: [number, string][], t: number) {
  t = Math.max(0, Math.min(1, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i]
    const [p1, c1] = stops[i + 1]
    if (t <= p1) return mix(hex2rgb(c0), hex2rgb(c1), (t - p0) / (p1 - p0))
  }
  return hex2rgb(stops[stops.length - 1][1])
}

export function metricColor(metric: WeatherMetric, value: number | null, lo: number, hi: number): string {
  if (value == null) return "#e2e8f0"
  const t = hi > lo ? (value - lo) / (hi - lo) : 0.5
  const c = ramp(metric === "temp" ? TEMP_STOPS : RAIN_STOPS, t)
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
}

export function metricRange(values: (number | null)[], metric: WeatherMetric): [number, number] {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return metric === "temp" ? [10, 30] : [0, 20]
  return [Math.floor(Math.min(...nums)), Math.ceil(Math.max(...nums))]
}

export const TEMP_LEGEND = TEMP_STOPS
export const RAIN_LEGEND = RAIN_STOPS

// ---------------------------------------------------------------------------
// Historical aggregation (per-sector choropleth on the Historical page).
// The backend exposes history per *location* (GET /api/weather/historical/
// location/:id). Musanze's seeded locations ARE its sectors, so we map
// sector name -> location id and aggregate that location's records over the
// selected window into the two choropleth metrics + trend series.
// ---------------------------------------------------------------------------

export type HistoryRecord = {
  date: string
  weatherSummary: {
    temperature: { current: number; min: number; max: number }
    precipitation: { rainAmount: number }
  }
}

export type PeriodRow = {
  key: string
  tempAvg: number
  tempMin: number
  tempMax: number
  rainfall: number
}

export type SectorHistory = {
  sector: string
  avgTemp: number | null
  totalRain: number | null
  count: number
  monthly: PeriodRow[]
}

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

/** Aggregate one location's records into monthly rows + window totals. */
export function aggregateHistory(sector: string, records: HistoryRecord[]): SectorHistory {
  if (!records?.length) return { sector, avgTemp: null, totalRain: null, count: 0, monthly: [] }
  const buckets: Record<string, { tAvg: number[]; tMin: number[]; tMax: number[]; rain: number[] }> = {}
  const allTemp: number[] = []
  let allRain = 0
  for (const r of records) {
    const key = new Date(r.date).toLocaleString("en-US", { month: "short" })
    buckets[key] ??= { tAvg: [], tMin: [], tMax: [], rain: [] }
    const s = r.weatherSummary
    buckets[key].tAvg.push(s.temperature.current)
    buckets[key].tMin.push(s.temperature.min)
    buckets[key].tMax.push(s.temperature.max)
    buckets[key].rain.push(s.precipitation.rainAmount)
    allTemp.push(s.temperature.current)
    allRain += s.precipitation.rainAmount
  }
  const monthly: PeriodRow[] = MONTH_ORDER.filter((k) => buckets[k]).map((k) => ({
    key: k,
    tempAvg: +mean(buckets[k].tAvg).toFixed(1),
    tempMin: +mean(buckets[k].tMin).toFixed(1),
    tempMax: +mean(buckets[k].tMax).toFixed(1),
    rainfall: Math.round(buckets[k].rain.reduce((x, y) => x + y, 0)),
  }))
  return {
    sector,
    avgTemp: +mean(allTemp).toFixed(1),
    totalRain: Math.round(allRain),
    count: records.length,
    monthly,
  }
}

/** Choropleth value for a sector history under the selected metric. */
export function historyMetricValue(h: SectorHistory | undefined, metric: WeatherMetric): number | null {
  if (!h) return null
  return metric === "temp" ? h.avgTemp : h.totalRain
}
