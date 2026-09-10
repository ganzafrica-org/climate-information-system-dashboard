import { useEffect, useMemo, useState } from "react"
import { NextPage } from "next"
import Head from "next/head"
import { useQueries, useQuery } from "@tanstack/react-query"
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, Legend, ResponsiveContainer,
} from "recharts"
import { Calendar, Download, Layers, Thermometer, CloudRain } from "lucide-react"
import { toast } from "sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { useLanguage } from "@/i18n"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { DataTable, type SortableColumn } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/lib/api"
import type { HistoricalWeatherRecord } from "@/types/weather"
import type { Location } from "@/types/farmer"

// A palette to distinguish compared locations.
const SERIES_COLORS = ["#147677", "#f59e0b", "#2563eb", "#db2777", "#16a34a"]

// ---- reused processing (period aggregation) ----
type PeriodRow = { key: string; tempAvg: number; tempMin: number; tempMax: number; rainfall: number }

function processMonthly(records: HistoricalWeatherRecord[]): PeriodRow[] {
  if (!records?.length) return []
  const m: Record<string, { tempMin: number[]; tempMax: number[]; tempAvg: number[]; rainfall: number[] }> = {}
  records.forEach((r) => {
    const key = new Date(r.date).toLocaleString("default", { month: "short" })
    m[key] ??= { tempMin: [], tempMax: [], tempAvg: [], rainfall: [] }
    m[key].tempMin.push(r.weatherSummary.temperature.min)
    m[key].tempMax.push(r.weatherSummary.temperature.max)
    m[key].tempAvg.push(r.weatherSummary.temperature.current)
    m[key].rainfall.push(r.weatherSummary.precipitation.rainAmount)
  })
  const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
  return order.filter((k) => m[k]).map((k) => ({
    key: k, tempAvg: avg(m[k].tempAvg), tempMin: avg(m[k].tempMin), tempMax: avg(m[k].tempMax),
    rainfall: m[k].rainfall.reduce((x, y) => x + y, 0),
  }))
}
function processWeekly(records: HistoricalWeatherRecord[]): PeriodRow[] {
  if (!records?.length) return []
  const m: Record<string, { tempMin: number[]; tempMax: number[]; tempAvg: number[]; rainfall: number[] }> = {}
  records.forEach((r) => {
    const d = new Date(r.date)
    const key = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`
    m[key] ??= { tempMin: [], tempMax: [], tempAvg: [], rainfall: [] }
    m[key].tempMin.push(r.weatherSummary.temperature.min)
    m[key].tempMax.push(r.weatherSummary.temperature.max)
    m[key].tempAvg.push(r.weatherSummary.temperature.current)
    m[key].rainfall.push(r.weatherSummary.precipitation.rainAmount)
  })
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
  return Object.entries(m).map(([key, v]) => ({
    key, tempAvg: avg(v.tempAvg), tempMin: avg(v.tempMin), tempMax: avg(v.tempMax), rainfall: v.rainfall.reduce((x, y) => x + y, 0),
  })).sort((a, b) => a.key.localeCompare(b.key))
}
function processSeasonal(records: HistoricalWeatherRecord[]): PeriodRow[] {
  if (!records?.length) return []
  const inSeason = (r: HistoricalWeatherRecord, fn: (mo: number) => boolean) => fn(new Date(r.date).getMonth() + 1)
  const stat = (rows: HistoricalWeatherRecord[], key: string): PeriodRow => {
    if (!rows.length) return { key, tempAvg: 0, tempMin: 0, tempMax: 0, rainfall: 0 }
    return {
      key,
      tempAvg: rows.reduce((s, r) => s + r.weatherSummary.temperature.current, 0) / rows.length,
      tempMin: rows.reduce((s, r) => s + r.weatherSummary.temperature.min, 0) / rows.length,
      tempMax: rows.reduce((s, r) => s + r.weatherSummary.temperature.max, 0) / rows.length,
      rainfall: rows.reduce((s, r) => s + r.weatherSummary.precipitation.rainAmount, 0),
    }
  }
  return [
    stat(records.filter((r) => inSeason(r, (mo) => mo >= 9 || mo <= 1)), "Season A"),
    stat(records.filter((r) => inSeason(r, (mo) => mo >= 2 && mo <= 5)), "Season B"),
    stat(records.filter((r) => inSeason(r, (mo) => mo >= 6 && mo <= 8)), "Season C"),
  ]
}

const Historical: NextPage = () => {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<number[]>([])
  const [viewType, setViewType] = useState<"monthly" | "weekly" | "seasonal">("monthly")
  const [dateRange, setDateRange] = useState({
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  })
  const [dockTab, setDockTab] = useState(0)
  const [dockOpen, setDockOpen] = useState(true)

  const locationsQ = useQuery({
    queryKey: ["locations-all"],
    queryFn: async () => {
      const res = await api.get<any>("/api/users/locations/all", { params: { limit: 100 } })
      const data = (res as any)?.data ?? res
      return (data?.locations ?? data ?? []) as Location[]
    },
    staleTime: 30 * 60 * 1000,
  })
  const locations = locationsQ.data ?? []

  // Default to the first location when list loads.
  useEffect(() => {
    if (selected.length === 0 && locations.length > 0) setSelected([locations[0].id])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations])

  // One historical query per selected location.
  const historyQs = useQueries({
    queries: selected.map((id) => ({
      queryKey: ["historical", id, dateRange.startDate, dateRange.endDate],
      queryFn: async () => {
        const res = await api.get<any>(`/api/weather/historical/location/${id}`, {
          params: { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 1000, sortBy: "date", sortOrder: "ASC" },
        })
        const data = (res as any)?.data ?? res
        return (data?.records ?? data ?? []) as HistoricalWeatherRecord[]
      },
      staleTime: 15 * 60 * 1000,
    })),
  })

  const isLoading = locationsQ.isLoading || historyQs.some((q) => q.isLoading)
  const process = viewType === "monthly" ? processMonthly : viewType === "weekly" ? processWeekly : processSeasonal

  // Per-location processed series.
  const series = selected.map((id, i) => {
    const loc = locations.find((l) => l.id === id)
    const rows = process(historyQs[i]?.data ?? [])
    return { id, name: loc?.name ?? `#${id}`, color: SERIES_COLORS[i % SERIES_COLORS.length], rows }
  })

  // Merge into one chart dataset keyed by period.
  const chartData = useMemo(() => {
    const keys: string[] = []
    series.forEach((s) => s.rows.forEach((r) => { if (!keys.includes(r.key)) keys.push(r.key) }))
    return keys.map((key) => {
      const row: Record<string, any> = { key }
      series.forEach((s) => {
        const r = s.rows.find((x) => x.key === key)
        row[`temp_${s.id}`] = r ? +r.tempAvg.toFixed(1) : null
        row[`rain_${s.id}`] = r ? Math.round(r.rainfall) : null
      })
      return row
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(","), historyQs.map((q) => q.dataUpdatedAt).join(","), viewType])

  const toggleLocation = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // Summary stats per location.
  const summary = series.map((s) => {
    const temps = s.rows.map((r) => r.tempAvg).filter(Boolean)
    const rain = s.rows.reduce((a, r) => a + r.rainfall, 0)
    return { ...s, avgTemp: temps.length ? +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0, totalRain: Math.round(rain) }
  })

  const handleExport = () => {
    if (!chartData.length) return
    const header = ["Period", ...series.flatMap((s) => [`${s.name} Temp`, `${s.name} Rain`])]
    const rows = chartData.map((d) => [d.key, ...series.flatMap((s) => [d[`temp_${s.id}`] ?? "", d[`rain_${s.id}`] ?? ""])])
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url; a.download = `historical_${viewType}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const recordColumns = useMemo<SortableColumn<Record<string, any>>[]>(() => {
    const cols: SortableColumn<Record<string, any>>[] = [
      { id: "key", header: t("period") || "Period", value: (r) => r.key, cell: (r) => r.key },
    ]
    series.forEach((s) => {
      cols.push({ id: `temp_${s.id}`, header: `${s.name} °C`, numeric: true, value: (r) => r[`temp_${s.id}`] ?? 0, cell: (r) => r[`temp_${s.id}`] ?? "-" })
      cols.push({ id: `rain_${s.id}`, header: `${s.name} mm`, numeric: true, value: (r) => r[`rain_${s.id}`] ?? 0, cell: (r) => r[`rain_${s.id}`] ?? "-" })
    })
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(","), locations, t])

  const dockTabs = [t("summary") || "Summary", t("records") || "Records", t("insights") || "Insights"]

  return (
    <AppLayout>
      <Head><title>{t("historical") || "Historical"} | {t("climateInformationSystem") || "Teganyamuhinzi"}</title></Head>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] px-5 py-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/15 p-2.5"><Calendar className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold md:text-xl">{t("historicalWeatherData") || "Historical Weather · Musanze"}</h1>
              <p className="text-xs text-white/80">{t("historicalCompareDesc") || "Tick one or more locations to compare climate over time"}</p>
            </div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20">
            <Download className="h-4 w-4" /> {t("exportData") || "Export"}
          </button>
        </div>

        <div className="flex h-[660px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm max-lg:h-auto max-lg:flex-col">
          {/* LEFT PANEL */}
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-border p-4 max-lg:w-full max-lg:border-b max-lg:border-r-0">
            <Group label={t("locationsCompare") || "Locations · compare"} action={selected.length > 1 ? { label: t("clear") || "Clear", onClick: () => setSelected(locations[0] ? [locations[0].id] : []) } : undefined}>
              {locationsQ.isLoading ? (
                <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <div className="max-h-44 space-y-0.5 overflow-y-auto">
                  {locations.map((l, i) => {
                    const idx = selected.indexOf(l.id)
                    const on = idx >= 0
                    return (
                      <label key={l.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${on ? "bg-[#147677]/5" : "hover:bg-muted"}`}>
                        <input type="checkbox" className="accent-[#147677]" checked={on} onChange={() => toggleLocation(l.id)} />
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? SERIES_COLORS[idx % SERIES_COLORS.length] : "#cbd5e1" }} />
                        <span className="flex-1 truncate font-medium">{l.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </Group>

            <Group label={t("viewType") || "View"}>
              <SegmentedControl label="View" value={viewType} onValueChange={(v) => setViewType(v as any)} className="w-full"
                options={[
                  { value: "monthly", label: t("monthly") || "Monthly" },
                  { value: "weekly", label: t("weekly") || "Weekly" },
                  { value: "seasonal", label: t("seasonal") || "Seasonal" },
                ]} />
            </Group>

            <Group label={t("timeWindow") || "Time window"}>
              <div className="flex gap-2">
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((r) => ({ ...r, startDate: e.target.value }))} className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs" />
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((r) => ({ ...r, endDate: e.target.value }))} className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs" />
              </div>
            </Group>
          </aside>

          {/* MAIN */}
          <div className="relative flex-1 overflow-auto bg-gradient-to-b from-[#fbfdfd] to-[#f4f8f8] p-4 max-lg:h-auto">
            {/* comparing chips */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("comparing") || "Comparing"}:</span>
              {summary.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <ChartCard title={t("monthlyTemperature") || "Temperature"} subtitle="°C" icon={<Thermometer className="h-4 w-4" />} loading={isLoading}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {series.map((s) => <Line key={s.id} type="monotone" dataKey={`temp_${s.id}`} name={s.name} stroke={s.color} strokeWidth={2.5} dot={false} connectNulls />)}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t("monthlyRainfall") || "Rainfall"} subtitle="mm" icon={<CloudRain className="h-4 w-4" />} loading={isLoading}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {series.map((s) => <Bar key={s.id} dataKey={`rain_${s.id}`} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* collapsible dock */}
            <div className="mt-3 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1 border-b border-border px-3">
                {dockTabs.map((label, i) => (
                  <button key={i} onClick={() => setDockTab(i)} className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${dockTab === i ? "border-[#147677] text-[#147677]" : "border-transparent text-muted-foreground"}`}>{label}</button>
                ))}
                <button onClick={() => setDockOpen((o) => !o)} className="ml-auto flex items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> {dockOpen ? (t("collapse") || "Collapse") : (t("expand") || "Expand")}
                </button>
              </div>
              {dockOpen && (
                <div className="p-3">
                  {dockTab === 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {summary.map((s) => (
                        <div key={s.id} className="rounded-xl border border-border p-3">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</div>
                          <div className="mt-1 text-xl font-bold tabular-nums">{s.avgTemp}°C</div>
                          <div className="text-[11px] text-muted-foreground">{s.totalRain.toLocaleString()} mm {t("rainfall") || "rain"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {dockTab === 1 && <DataTable label="Records" data={chartData} columns={recordColumns} getRowId={(r) => r.key} loading={isLoading} skeletonRows={6} rowHeight={40} emptyState={t("noData") || "No data"} />}
                  {dockTab === 2 && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {summary.length < 2 ? (
                        <p>{t("insightPickTwo") || "Select two or more locations to see comparative insights."}</p>
                      ) : (
                        <p>{summary[0].name} {t("avgTemp") || "averages"} {summary[0].avgTemp}°C; {summary[1].name} {summary[1].avgTemp}°C ({(summary[0].avgTemp - summary[1].avgTemp).toFixed(1)}° {t("difference") || "difference"}). {t("rainfall") || "Rainfall"}: {summary[0].totalRain.toLocaleString()} vs {summary[1].totalRain.toLocaleString()} mm.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function Group({ label, action, children }: { label: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {action && <button onClick={action.onClick} className="text-[10.5px] font-semibold text-[#147677] hover:underline">{action.label}</button>}
      </div>
      {children}
    </div>
  )
}

function ChartCard({ title, subtitle, icon, loading, children }: { title: string; subtitle: string; icon: React.ReactNode; loading: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[#147677]">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">· {subtitle}</span>
      </div>
      {loading ? <Skeleton className="h-[200px] w-full" /> : children}
    </div>
  )
}

export default Historical
