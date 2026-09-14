import { useEffect, useMemo, useState } from "react"
import type { NextPage } from "next"
import Head from "next/head"
import dynamic from "next/dynamic"
import { useQueries, useQuery } from "@tanstack/react-query"
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, Legend, ResponsiveContainer,
} from "recharts"
import { Download, Layers, ChevronDown, X } from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"
import { useLanguage } from "@/i18n"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, type SortableColumn } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker } from "@/components/ui/calendar"
import api from "@/lib/api"
import type { FeatureCollection } from "@/lib/soil"
import { readSector } from "@/lib/soil"
import {
  aggregateHistory, historyMetricValue, metricColor, metricRange,
  TEMP_LEGEND, RAIN_LEGEND, type WeatherMetric, type SectorHistory, type HistoryRecord,
} from "@/lib/weather"
import type { HistoricalWeatherRecord } from "@/types/weather"
import type { Location } from "@/types/farmer"

const WeatherMap = dynamic(() => import("@/components/WeatherSectorMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

const SERIES_COLORS = ["#147677", "#f59e0b", "#2563eb", "#db2777", "#16a34a", "#7c3aed"]

function useGeo(file: string) {
  return useQuery({
    queryKey: ["soil-geo", file],
    queryFn: async () => {
      const res = await fetch(`/suitability-vs-susceptability/${file}`)
      if (!res.ok) throw new Error(`Failed to load ${file}`)
      return (await res.json()) as FeatureCollection
    },
    staleTime: 60 * 60 * 1000,
  })
}

const Historical: NextPage = () => {
  const { t, locale: lang } = useLanguage()
  const locale = lang === "rw" ? "rw-RW" : "en-US"

  const [metric, setMetric] = useState<WeatherMetric>("temp")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sectorMenuOpen, setSectorMenuOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: `${new Date().getFullYear()}-01-01`,
    end: `${new Date().getFullYear()}-12-31`,
  })
  const [popover, setPopover] = useState<{ x: number; y: number; sector: string } | null>(null)
  const [dockTab, setDockTab] = useState(0)
  const [dockOpen, setDockOpen] = useState(true)

  const sectorsQ = useGeo("Sectors.geojson")
  const districtQ = useGeo("Musanze_District_Boundary.geojson")

  // All sector names, straight from the geojson (authoritative 15 sectors).
  const allSectors = useMemo(
    () => (sectorsQ.data?.features.map((f) => readSector(f.properties)).filter(Boolean).sort() ?? []) as string[],
    [sectorsQ.data]
  )

  // Locations (= sectors) so we can resolve each sector's history endpoint id.
  const locationsQ = useQuery({
    queryKey: ["locations-all"],
    queryFn: async () => {
      const res = await api.get<any>("/api/users/locations/all", { params: { limit: 100 } })
      const data = (res as any)?.data ?? res
      return (data?.locations ?? data ?? []) as Location[]
    },
    staleTime: 30 * 60 * 1000,
  })
  const idBySector = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of locationsQ.data ?? []) if (l.name) m[l.name] = l.id
    return m
  }, [locationsQ.data])

  // Fetch history for EVERY sector that has a location id (drives the choropleth).
  const sectorsWithId = allSectors.filter((s) => idBySector[s] != null)
  const historyQs = useQueries({
    queries: sectorsWithId.map((sector) => ({
      queryKey: ["historical", idBySector[sector], dateRange.start, dateRange.end],
      queryFn: async () => {
        const res = await api.get<any>(`/api/weather/historical/location/${idBySector[sector]}`, {
          params: { startDate: dateRange.start, endDate: dateRange.end, limit: 1000, sortBy: "date", sortOrder: "ASC" },
        })
        const data = (res as any)?.data ?? res
        const records = (data?.records ?? data ?? []) as HistoricalWeatherRecord[]
        return aggregateHistory(sector, records as unknown as HistoryRecord[])
      },
      staleTime: 15 * 60 * 1000,
      enabled: idBySector[sector] != null,
    })),
  })

  const historyBySector = useMemo(() => {
    const m: Record<string, SectorHistory> = {}
    sectorsWithId.forEach((sector, i) => {
      const h = historyQs[i]?.data
      if (h) m[sector] = h
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorsWithId.join(","), historyQs.map((q) => q.dataUpdatedAt).join(",")])

  // Default: select the first two sectors that have data once loaded.
  useEffect(() => {
    if (selected.size > 0) return
    const withData = Object.keys(historyBySector)
    if (withData.length > 0) setSelected(new Set(withData.slice(0, 2)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyBySector])

  const valueBySector = useMemo(() => {
    const m: Record<string, number | null> = {}
    for (const s of allSectors) m[s] = historyMetricValue(historyBySector[s], metric)
    return m
  }, [allSectors, historyBySector, metric])

  const [lo, hi] = useMemo(() => metricRange(Object.values(valueBySector), metric), [valueBySector, metric])

  const isLoading = sectorsQ.isLoading || locationsQ.isLoading || historyQs.some((q) => q.isLoading)
  const legendStops = metric === "temp" ? TEMP_LEGEND : RAIN_LEGEND
  const unit = metric === "temp" ? "°C" : "mm"

  // ---- selected sectors -> comparison series ----
  const selectedList = Array.from(selected)
  const series = selectedList.map((s, i) => ({
    sector: s,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    history: historyBySector[s],
  }))

  const chartData = useMemo(() => {
    const keys: string[] = []
    series.forEach((s) => s.history?.monthly.forEach((r) => { if (!keys.includes(r.key)) keys.push(r.key) }))
    const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    keys.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    return keys.map((key) => {
      const row: Record<string, any> = { key }
      series.forEach((s) => {
        const r = s.history?.monthly.find((x) => x.key === key)
        row[`temp_${s.sector}`] = r ? r.tempAvg : null
        row[`rain_${s.sector}`] = r ? r.rainfall : null
      })
      return row
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList.join(","), historyBySector])

  const toggleSector = (s: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n
  })

  const handleExport = () => {
    if (!chartData.length) return
    const header = ["Month", ...series.flatMap((s) => [`${s.sector} Temp`, `${s.sector} Rain`])]
    const rows = chartData.map((d) => [d.key, ...series.flatMap((s) => [d[`temp_${s.sector}`] ?? "", d[`rain_${s.sector}`] ?? ""])])
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url; a.download = `historical_${metric}_${selectedList.join("-") || "all"}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const recordColumns = useMemo<SortableColumn<Record<string, any>>[]>(() => {
    const cols: SortableColumn<Record<string, any>>[] = [
      { id: "key", header: t("period") || "Month", value: (r) => r.key, cell: (r) => r.key, width: "120px" },
    ]
    series.forEach((s) => {
      cols.push({ id: `temp_${s.sector}`, header: `${s.sector} °C`, numeric: true, width: "120px", value: (r) => r[`temp_${s.sector}`] ?? 0, cell: (r) => r[`temp_${s.sector}`] ?? "-" })
      cols.push({ id: `rain_${s.sector}`, header: `${s.sector} mm`, numeric: true, width: "120px", value: (r) => r[`rain_${s.sector}`] ?? 0, cell: (r) => r[`rain_${s.sector}`] ?? "-" })
    })
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList.join(","), t])

  const dockTabs = [t("summary") || "Summary", t("trends") || "Trends", t("records") || "Records"]
  const recordMinWidth = 120 + series.length * 240

  return (
    <AppLayout>
      <Head><title>{t("historical") || "Historical"} | {t("climateInformationSystem") || "Teganyamuhinzi"}</title></Head>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header — dashboard white-card style */}
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#147677]">{t("historicalWeatherData") || "Historical Weather · Musanze"}</h1>
              <p className="text-sm text-slate-400">{t("historicalMapDesc") || "Sectors shaded by climate over the selected window — pick sectors to compare"}</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#f9fafb]">
              <Download className="h-4 w-4 text-[#147677]" /> {t("exportData") || "Export CSV"}
            </button>
          </div>
        </div>

        {/* One framed unit: left panel + map */}
        <div className="flex h-[640px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm max-lg:h-auto max-lg:flex-col">
          {/* LEFT PANEL */}
          <aside className="w-[310px] shrink-0 overflow-y-auto border-r border-border p-4 max-lg:w-full max-lg:border-b max-lg:border-r-0">
            <Group label={t("metric") || "Metric"}>
              <SegmentedControl
                label="Metric"
                value={metric}
                onValueChange={(v) => setMetric(v as WeatherMetric)}
                className="w-full"
                options={[
                  { value: "temp", label: t("temperature") || "Temperature" },
                  { value: "rainfall", label: t("rainfall") || "Rainfall" },
                ]}
              />
            </Group>

            <Group label={t("timeWindow") || "Time window"}>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                locale={locale}
                label={t("timeWindow") || "Time window"}
                max={new Date()}
              />
            </Group>

            <Group label={t("sector") || "Sectors"} action={selected.size > 0 ? { label: t("clear") || "Clear", onClick: () => setSelected(new Set()) } : undefined}>
              <div className="relative">
                <button onClick={() => setSectorMenuOpen((o) => !o)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm">
                  <span className="flex flex-wrap gap-1">
                    {selected.size === 0 ? <span className="text-muted-foreground">{t("selectSectors") || "Select sectors"}</span>
                      : selectedList.slice(0, 2).map((s) => <span key={s} className="rounded bg-[#147677]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#147677]">{s}</span>)}
                    {selected.size > 2 && <span className="rounded bg-[#147677]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#147677]">+{selected.size - 2}</span>}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {sectorMenuOpen && (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {allSectors.map((s) => {
                      const hasData = historyBySector[s] != null
                      return (
                        <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${hasData ? "" : "opacity-50"}`}>
                          <Checkbox checked={selected.has(s)} onCheckedChange={() => toggleSector(s)} />
                          <span className="flex-1">{s}</span>
                          {!hasData && <span className="text-[10px] text-muted-foreground">{t("noData") || "no data"}</span>}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </Group>

            <Group label={t("comparing") || "Comparing"}>
              {series.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("selectSectorsHint") || "Pick one or more sectors from the map or the dropdown."}</p>
              ) : (
                <div className="space-y-1.5">
                  {series.map((s) => (
                    <div key={s.sector} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 font-medium">{s.sector}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {s.history ? (metric === "temp" ? `${s.history.avgTemp}°` : `${s.history.totalRain}mm`) : "—"}
                      </span>
                      <button onClick={() => toggleSector(s.sector)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </Group>

            <Group label={t("howToRead") || "How to read"}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("historicalReadHint") || "Each sector is shaded by the selected metric aggregated over the time window. Click sectors to compare their trends below."}
              </p>
            </Group>
          </aside>

          {/* MAP STAGE */}
          <div className="relative isolate flex-1 max-lg:h-[62vh]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-2/3 space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : (
              <WeatherMap
                sectors={sectorsQ.data ?? null}
                district={districtQ.data ?? null}
                valueBySector={valueBySector}
                metric={metric}
                lo={lo}
                hi={hi}
                selectedSectors={selected}
                onSectorClick={(sector, x, y) => {
                  if (historyBySector[sector]) { toggleSector(sector); setPopover({ x, y, sector }); setDockOpen(true) }
                }}
              />
            )}

            {/* badge */}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              {metric === "temp" ? (t("temperature") || "Temperature") : (t("rainfall") || "Rainfall")} · <b className="text-foreground">{selected.size === 0 ? (t("allSectors") || "all sectors") : `${selected.size} ${t("sector") || "sectors"}`}</b>
            </div>

            {/* legend */}
            <div className="absolute right-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
              <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {(metric === "temp" ? (t("temperature") || "Temperature") : (t("rainfall") || "Rainfall"))} ({unit})
              </div>
              <div className="flex items-end gap-0">
                {legendStops.map((s, i) => {
                  const val = Math.round(lo + (hi - lo) * s[0])
                  return (
                    <div key={i} className="w-[44px] text-center text-[9px]">
                      <div className="h-[7px]" style={{ backgroundColor: s[1], borderRadius: i === 0 ? "3px 0 0 3px" : i === legendStops.length - 1 ? "0 3px 3px 0" : 0 }} />
                      <div className="mt-1 tabular-nums text-muted-foreground/80">{val}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* popover */}
            {popover && historyBySector[popover.sector] && (
              <div className="absolute z-[600] w-52 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover p-3 text-xs shadow-xl" style={{ left: popover.x, top: popover.y - 8 }}>
                <button onClick={() => setPopover(null)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                <h4 className="mb-1.5 text-sm font-semibold">{popover.sector}</h4>
                <div className="space-y-0.5 text-muted-foreground">
                  <div className="flex justify-between"><span>{t("avgTempLabel") || "Avg temp"}</span><b className="tabular-nums text-foreground">{historyBySector[popover.sector].avgTemp}°C</b></div>
                  <div className="flex justify-between"><span>{t("totalRain") || "Total rain"}</span><b className="tabular-nums text-foreground">{historyBySector[popover.sector].totalRain} mm</b></div>
                  <div className="flex justify-between"><span>{t("records") || "Records"}</span><b className="tabular-nums text-foreground">{historyBySector[popover.sector].count}</b></div>
                </div>
              </div>
            )}

            {/* dock */}
            {series.length > 0 && (
              <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-col overflow-hidden rounded-xl border border-border bg-card/97 shadow-[0_-2px_24px_rgba(20,40,60,0.16)] backdrop-blur" style={{ maxHeight: dockOpen ? "48%" : undefined }}>
                <div className="flex items-center gap-1 border-b border-border bg-white px-3 rounded-t-xl">
                  {dockTabs.map((label, i) => (
                    <button key={i} onClick={() => setDockTab(i)} className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${dockTab === i ? "border-[#147677] text-[#147677]" : "border-transparent text-muted-foreground"}`}>{label}</button>
                  ))}
                  <button onClick={() => setDockOpen((o) => !o)} className="ml-auto flex items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> {dockOpen ? (t("collapse") || "Collapse") : (t("expand") || "Expand")}
                  </button>
                </div>
                {dockOpen && (
                  <div className="overflow-auto p-3">
                    {dockTab === 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {series.map((s) => (
                          <div key={s.sector} className="rounded-xl border border-border p-3">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.sector}</div>
                            <div className="mt-1 text-xl font-bold tabular-nums">{s.history?.avgTemp ?? "—"}°C</div>
                            <div className="text-[11px] text-muted-foreground">{(s.history?.totalRain ?? 0).toLocaleString()} mm {t("rainfall") || "rain"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {dockTab === 1 && (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-3">
                          <div className="mb-2 text-xs font-semibold">{t("temperature") || "Temperature"} · °C</div>
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              {series.map((s) => <Line key={s.sector} type="monotone" dataKey={`temp_${s.sector}`} name={s.sector} stroke={s.color} strokeWidth={2.5} dot={false} connectNulls />)}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3">
                          <div className="mb-2 text-xs font-semibold">{t("rainfall") || "Rainfall"} · mm</div>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              {series.map((s) => <Bar key={s.sector} dataKey={`rain_${s.sector}`} name={s.sector} fill={s.color} radius={[3, 3, 0, 0]} />)}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    {dockTab === 2 && (
                      <div className="overflow-x-auto">
                        <div style={{ minWidth: recordMinWidth }}>
                          <DataTable label="Records" data={chartData} columns={recordColumns} getRowId={(r) => r.key} loading={isLoading} skeletonRows={6} rowHeight={40} emptyState={t("noData") || "No data"} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

export default Historical
