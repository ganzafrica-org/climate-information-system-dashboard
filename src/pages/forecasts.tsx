import { useMemo, useState } from "react"
import type { NextPage } from "next"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { CloudSun, Download, Layers, X, Sprout } from "lucide-react"
import { useLanguage } from "@/i18n"
import { AppLayout } from "@/components/layout/AppLayout"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Skeleton } from "@/components/ui/skeleton"
import type { FeatureCollection } from "@/lib/soil"
import {
  useSectorWeather, metricValue, metricColor, metricRange, TEMP_LEGEND, RAIN_LEGEND,
  type WeatherMetric, type SectorWeather,
} from "@/lib/weather"

const WeatherMap = dynamic(() => import("@/components/WeatherSectorMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

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

const Forecasts: NextPage = () => {
  const { t } = useLanguage()
  const [metric, setMetric] = useState<WeatherMetric>("temp")
  const [dayIndex, setDayIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [popover, setPopover] = useState<{ x: number; y: number; sector: string } | null>(null)
  const [dockTab, setDockTab] = useState(0)
  const [dockOpen, setDockOpen] = useState(true)

  const sectorsQ = useGeo("Sectors.geojson")
  const districtQ = useGeo("Musanze_District_Boundary.geojson")
  const weatherQ = useSectorWeather()

  const weather: SectorWeather[] = weatherQ.data ?? []
  const bySectorName = useMemo(() => {
    const m: Record<string, SectorWeather> = {}
    weather.forEach((w) => (m[w.sector] = w))
    return m
  }, [weather])

  // day options from the sector with the most days (all sectors share the same horizon)
  const maxDays = weather.reduce((n, w) => Math.max(n, w.days?.length || 0), 0)
  const dayList = weather.find((w) => (w.days?.length || 0) === maxDays)?.days ?? []

  const valueBySector = useMemo(() => {
    const m: Record<string, number | null> = {}
    weather.forEach((w) => (m[w.sector] = metricValue(w, metric, dayIndex)))
    return m
  }, [weather, metric, dayIndex])

  const [lo, hi] = useMemo(() => metricRange(Object.values(valueBySector), metric), [valueBySector, metric])

  const selectedWeather = selected ? bySectorName[selected] : null
  const selectedDay = selectedWeather?.days?.[dayIndex]

  const isLoading = sectorsQ.isLoading || districtQ.isLoading || weatherQ.isLoading

  const legendStops = metric === "temp" ? TEMP_LEGEND : RAIN_LEGEND
  const unit = metric === "temp" ? "°C" : "mm"

  const handleExport = () => {
    if (!weather.length) return
    const rows = weather.map((w) => ({
      Sector: w.sector, Temp_C: w.temp ?? "", RainMM: w.rainfall ?? "", RainChance: w.rainChance ?? "",
    }))
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url; a.download = `forecast_sectors_${metric}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const dayLabel = (i: number) => {
    const d = dayList[i]
    if (!d?.dt) return `Day ${i + 1}`
    const date = new Date(d.dt * 1000)
    return i === 0 ? (t("today") || "Today") : date.toLocaleDateString(undefined, { weekday: "short" })
  }

  const dockTabs = [t("details") || "Details", t("farmingOutlook") || "Farming outlook", t("hourly") || "Hourly"]

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] px-5 py-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/15 p-2.5"><CloudSun className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold md:text-xl">{t("weatherForecast") || "Weather Forecast · Musanze"}</h1>
              <p className="text-xs text-white/80">{t("forecastChoroplethDesc") || "Sectors shaded by forecast — click one for detail"}</p>
            </div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20">
            <Download className="h-4 w-4" /> {t("exportData") || "Export CSV"}
          </button>
        </div>

        {weatherQ.isError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("weatherApiNotConfigured") || "Sector weather is unavailable right now. Check that the weather service is configured."}
          </div>
        )}

        <div className="flex h-[640px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm max-lg:h-auto max-lg:flex-col">
          {/* LEFT PANEL */}
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-border p-4 max-lg:w-full max-lg:border-b max-lg:border-r-0">
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

            <Group label={t("forecastDay") || "Forecast day"}>
              {isLoading ? (
                <div className="space-y-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <div className="space-y-1">
                  {dayList.map((d, i) => (
                    <button key={d.dt || i} onClick={() => setDayIndex(i)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${dayIndex === i ? "border border-[#147677] bg-[#147677]/10 font-medium text-[#147677]" : "hover:bg-muted"}`}>
                      <span>{dayLabel(i)}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {metric === "temp" ? `${Math.round(d.tempDay ?? 0)}°` : `${(d.rainfall ?? 0).toFixed(1)}mm`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Group>

            <Group label={t("howToRead") || "How to read"}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("forecastReadHint") || "Each sector is shaded by the selected metric for the chosen day. Click a sector for its full forecast."}
              </p>
            </Group>
          </aside>

          {/* MAP STAGE */}
          <div className="relative flex-1 max-lg:h-[62vh]">
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
                selectedSectors={selected ? new Set([selected]) : new Set()}
                onSectorClick={(sector, x, y) => { setSelected(sector); setPopover({ x, y, sector }); setDockOpen(true) }}
              />
            )}

            {/* badge */}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              {metric === "temp" ? (t("temperature") || "Temperature") : (t("rainfall") || "Rainfall")} · <b className="text-foreground">{dayLabel(dayIndex)}</b>
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
            {popover && selectedWeather && (
              <div className="absolute z-[600] w-52 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover p-3 text-xs shadow-xl" style={{ left: popover.x, top: popover.y - 8 }}>
                <button onClick={() => setPopover(null)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                <h4 className="mb-1.5 text-sm font-semibold">{popover.sector} · {dayLabel(dayIndex)}</h4>
                <div className="space-y-0.5 text-muted-foreground">
                  <div className="flex justify-between"><span>{t("temperature") || "Temp"}</span><b className="tabular-nums text-foreground">{Math.round(selectedDay?.tempMax ?? selectedWeather.tempMax ?? 0)}° / {Math.round(selectedDay?.tempMin ?? selectedWeather.tempMin ?? 0)}°</b></div>
                  <div className="flex justify-between"><span>{t("rainfall") || "Rain"}</span><b className="tabular-nums text-foreground">{(selectedDay?.rainfall ?? selectedWeather.rainfall ?? 0).toFixed(1)} mm</b></div>
                  <div className="flex justify-between"><span>{t("rainChance") || "Rain chance"}</span><b className="tabular-nums text-foreground">{selectedDay?.rainChance ?? selectedWeather.rainChance ?? 0}%</b></div>
                </div>
              </div>
            )}

            {/* dock */}
            {selectedWeather && (
              <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-col overflow-hidden rounded-xl border border-border bg-card/97 shadow-[0_-2px_24px_rgba(20,40,60,0.16)] backdrop-blur" style={{ maxHeight: dockOpen ? "46%" : undefined }}>
                <div className="flex items-center gap-1 border-b border-border px-3">
                  <span className="mr-2 text-xs font-bold">{selectedWeather.sector}</span>
                  {dockTabs.map((label, i) => (
                    <button key={i} onClick={() => setDockTab(i)} className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${dockTab === i ? "border-[#147677] text-[#147677]" : "border-transparent text-muted-foreground"}`}>{label}</button>
                  ))}
                  <button onClick={() => setDockOpen((o) => !o)} className="ml-auto flex items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> {dockOpen ? (t("collapse") || "Collapse") : (t("expand") || "Expand")}
                  </button>
                </div>
                {dockOpen && (
                  <div className="overflow-auto p-4">
                    {dockTab === 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          [t("tempMax") || "High", `${Math.round(selectedDay?.tempMax ?? 0)}°`],
                          [t("tempMin") || "Low", `${Math.round(selectedDay?.tempMin ?? 0)}°`],
                          [t("rainChance") || "Rain", `${selectedDay?.rainChance ?? 0}%`],
                          [t("wind") || "Wind", `${Math.round(selectedDay?.windSpeed ?? selectedWeather.windSpeed ?? 0)} km/h`],
                        ].map(([l, v]) => (
                          <div key={l} className="rounded-xl border border-border bg-muted/40 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div>
                            <div className="mt-1 text-xl font-bold tabular-nums">{v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {dockTab === 1 && (
                      <div className="rounded-xl border border-[#d5e8e8] bg-gradient-to-br from-[#eef6f6] to-[#f7fbfb] p-4 text-sm leading-relaxed">
                        <div className="mb-1.5 flex items-center gap-2 font-bold text-[#147677]"><Sprout className="h-4 w-4" /> {t("farmingOutlook") || "Farming outlook"}</div>
                        {(selectedDay?.rainChance ?? 0) >= 60
                          ? (t("outlookWet") || "High rain probability — hold off on spraying and fertilizer; ensure field drainage.")
                          : (t("outlookDry") || "Low rain probability — good for field work and spraying; irrigate in the evening if soil is dry.")}
                      </div>
                    )}
                    {dockTab === 2 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {selectedWeather.days.slice(0, 7).map((d, i) => (
                          <div key={d.dt || i} className="w-[72px] shrink-0 rounded-xl border border-border bg-muted/40 p-2.5 text-center">
                            <div className="text-[11px] font-semibold">{dayLabel(i)}</div>
                            <div className="my-1 text-lg font-bold tabular-nums">{Math.round(d.tempDay ?? 0)}°</div>
                            <div className="text-[10px] text-muted-foreground">{(d.rainfall ?? 0).toFixed(1)}mm</div>
                          </div>
                        ))}
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

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export default Forecasts
