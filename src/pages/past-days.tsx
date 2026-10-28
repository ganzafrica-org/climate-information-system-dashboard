import { useEffect, useMemo, useRef, useState } from "react"
import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { ArrowLeft, CalendarX, ChevronDown, CloudOff, Droplets, MapPin, Thermometer, Wind } from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"
import { ConditionIcon } from "@/components/weather/ConditionIcon"
import { SectorMenu } from "@/components/weather/SectorMenu"
import { StateCard } from "@/components/weather/StateCard"
import { CalendarRange, type DateRange } from "@/components/ui/calendar"
import { Pagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  addDays, conditionOf, msToKmh, periodStats, rainfallCategory, useSectorHistory,
  type DailyRecord, type RainCat,
} from "@/lib/weather"
import { dayMonth, fromIso, useWx, weekday } from "@/lib/weatherFormat"
import { useAuth } from "@/hooks/useAuth"
import { WEATHER_PLACES, defaultLocationName, isDistrictLocationName } from "@/lib/assignment"

const PAGE_SIZE = 10
const PRESETS = ["past7", "lastMonth", "custom"] as const
type Preset = (typeof PRESETS)[number]
const RAIN_CATS = new Set<string>(["no_rain", "trace", "light_rain", "moderate_rain", "heavy_rain", "very_heavy"])

const kigaliToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali" }).format(new Date())

const fmtMm = (n: number) => {
  const v = Math.round((Number(n) || 0) * 100) / 100
  return String(v)
}

const rainCatOf = (row: DailyRecord): RainCat =>
  row.rainCategory && RAIN_CATS.has(row.rainCategory) ? row.rainCategory as RainCat : rainfallCategory(row.rain)

const dayNote = (row: DailyRecord, line: (key: string, params?: Record<string, string | number>) => string) => {
  const saved = row.overview?.trim() || ""
  if (saved && !/\bundefined\b/i.test(saved)) return saved
  return line("pastDayLine", {
    cat: line(`rainCat.${rainCatOf(row)}`),
    mm: fmtMm(row.rain),
    min: Math.round(row.min),
    max: Math.round(row.max),
  })
}

function periodRange(preset: Preset, today: string, yesterday: string, custom: DateRange): [string, string] {
  const clamp = (start: string, end: string): [string, string] => [start, end < start ? start : end]
  if (preset === "past7") return clamp(addDays(yesterday, -6), yesterday)
  if (preset === "lastMonth") {
    const [year, month] = today.split("-").map(Number)
    const last = new Date(Date.UTC(year, month - 1, 0))
    const first = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1))
    const iso = (date: Date) => date.toISOString().slice(0, 10)
    return clamp(iso(first), iso(last))
  }
  return clamp(custom.start, custom.end > yesterday ? yesterday : custom.end)
}

const PastDays: NextPage = () => {
  const { w, lang } = useWx()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const today = kigaliToday()
  const yesterday = addDays(today, -1)

  const [place, setPlace] = useState<string>(WEATHER_PLACES[0])
  const [preset, setPreset] = useState<Preset>("past7")
  const [custom, setCustom] = useState<DateRange>({ start: yesterday, end: yesterday })
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!dateOpen) return
    const onDown = (event: MouseEvent) => {
      if (!dateRef.current?.contains(event.target as Node)) setDateOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [dateOpen])

  useEffect(() => {
    if (!router.isReady || authLoading) return
    const q = router.query.place
    const places = WEATHER_PLACES as readonly string[]
    if (typeof q === "string" && places.includes(q)) setPlace(q)
    else setPlace(defaultLocationName(user))
  }, [router.isReady, authLoading, router.query.place, user])

  const [start, end] = useMemo(() => periodRange(preset, today, yesterday, custom), [preset, today, yesterday, custom])
  const histQ = useSectorHistory(start, end)

  const records = useMemo(() => {
    const direct = histQ.data?.[place]?.records
    const rows = direct
      ?? (isDistrictLocationName(place)
        ? Object.entries(histQ.data ?? {}).find(([name]) => isDistrictLocationName(name))?.[1]?.records
        : undefined)
      ?? []
    return [...rows].filter((row) => row.date >= start && row.date <= end).sort((a, b) => a.date.localeCompare(b.date))
  }, [histQ.data, place, start, end])

  const stats = useMemo(() => periodStats(records, start, end), [records, start, end])
  useEffect(() => { setPage(1) }, [start, end, place])
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const pageSafe = Math.min(page, pageCount)
  const slice = records.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const dt = (iso: string) => dayMonth(fromIso(iso), lang, { year: true })
  const summary = useMemo(() => {
    if (!stats || !records.length) return ""
    if (records.length === 1) {
      const row = records[0]
      return w("pastSumOne", {
        day: dt(row.date),
        place,
        mm: fmtMm(row.rain),
        cat: w(`rainCat.${rainCatOf(row)}`),
        min: Math.round(row.min),
        max: Math.round(row.max),
      })
    }
    const total = records.reduce((sum, row) => sum + (Number(row.rain) || 0), 0)
    const parts = [
      stats.rainyDays === 0
        ? w("pastSumDry", { place, from: dt(start), to: dt(end), n: stats.count })
        : w("pastSumRain", { place, from: dt(start), to: dt(end), mm: fmtMm(total), rainy: stats.rainyDays, n: stats.count }),
    ]
    if (stats.heavyDays === 1) parts.push(w("pastHeavyOne"))
    if (stats.heavyDays > 1) parts.push(w("pastHeavyMany", { heavy: stats.heavyDays }))
    if (stats.rainyDays > 1) {
      const wet = records.reduce((a, b) => (b.rain > a.rain ? b : a))
      parts.push(w("pastWettest", { day: dt(wet.date), mm: fmtMm(wet.rain) }))
    }
    parts.push(w("pastSumTemp", {
      avgMax: stats.avgMax,
      avgMin: stats.avgMin,
      hot: Math.round(stats.hottest.max),
      hotDay: dt(stats.hottest.date),
      cold: Math.round(stats.coldest.min),
      coldDay: dt(stats.coldest.date),
    }))
    if (stats.count < stats.expectedDays) parts.push(w("pastCoverage", { count: stats.count, expected: stats.expectedDays }))
    return parts.join(" ")
  }, [stats, records, place, start, end, lang])

  const segBtn = (on: boolean) => `rounded-md px-3 py-[7px] text-sm font-medium ${on ? "bg-[#147677] text-white" : "text-slate-600 hover:text-slate-900"}`

  return (
    <AppLayout>
      <Head><title>{`${w("pastTitle")} | Teganyamuhinzi`}</title></Head>
      <div className="w-full max-w-[1600px] space-y-4 p-3 text-sm text-[#171717] md:p-6">
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
          <Link href="/historical" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#147677] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {w("pastBack")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#147677]">{w("pastTitle")}</h1>
        </div>

        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg bg-white px-4 py-3.5 shadow-sm">
          <div className="relative flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{w("histPlace")}</span>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              className="flex min-w-[190px] items-center justify-between gap-2 rounded-lg border border-[#cfd6dc] bg-white px-3 py-2 text-[15px] font-semibold text-slate-900"
            >
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#147677]" />{place}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            <SectorMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              onPick={setPlace}
              searchPlaceholder={w("searchSectors")}
              noMatch={(q) => w("noMatch", { q })}
              items={WEATHER_PLACES.map((name) => ({ name, active: name === place }))}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">{w("period")}</span>
            <div role="radiogroup" className="flex flex-nowrap gap-1 rounded-[9px] border border-gray-200 bg-gray-100 p-[3px]">
              {PRESETS.filter((item) => item !== "custom").map((item) => (
                <button key={item} role="radio" aria-checked={preset === item} onClick={() => { setPreset(item); setDateOpen(false) }} className={`${segBtn(preset === item)} whitespace-nowrap`}>
                  {w(`preset.${item}`)}
                </button>
              ))}
              <div ref={dateRef} className="relative">
                <button
                  role="radio"
                  aria-checked={preset === "custom"}
                  aria-expanded={dateOpen}
                  onClick={() => { setPreset("custom"); setDateOpen((open) => preset === "custom" ? !open : true) }}
                  className={`${segBtn(preset === "custom")} whitespace-nowrap`}
                >
                  {w("preset.custom")}
                </button>
                {dateOpen && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                    <CalendarRange value={custom} onChange={setCustom} locale={lang === "rw" ? "rw-RW" : "en-GB"} max={fromIso(yesterday)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {histQ.isError && <StateCard icon={CloudOff} tone="error" title={w("downTitle")} text={w("downHistText")} retryLabel={w("retry")} onRetry={() => histQ.refetch()} />}

        {histQ.isLoading && (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        )}

        {!histQ.isLoading && !histQ.isError && !records.length && (
          <StateCard icon={CalendarX} title={w("histEmpty", { s: place })} text={w("periodText", { name: w(`preset.${preset}`), from: dt(start), to: dt(end) })} />
        )}

        {!histQ.isLoading && !histQ.isError && stats && (
          <>
            <section className="rounded-2xl border border-[#147677]/20 bg-[#f3fafa] px-4 py-4 md:px-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#147677]">{w("pastSummary")}</h2>
              <p className="mt-2 text-[17px] font-medium leading-relaxed text-slate-900">{summary}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
                <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums"><Droplets className="h-4 w-4 text-[#2f6cbc]" />{fmtMm(records.reduce((sum, row) => sum + (Number(row.rain) || 0), 0))} mm</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums"><Thermometer className="h-4 w-4 text-[#e0702f]" />{stats.avgMin}–{stats.avgMax}°</span>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[17px] font-bold text-slate-900">{w("histDaysTitle")}</h2>
              {slice.map((row) => {
                const when = fromIso(row.date)
                return (
                  <article key={row.date} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ConditionIcon cond={conditionOf(row.conditionMain, row.condition)} size={28} />
                        <div>
                          <div className="font-semibold text-slate-900">{weekday(when, lang, true)}</div>
                          <div className="text-sm text-slate-500">{dayMonth(when, lang, { year: true })}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums"><Droplets className="h-4 w-4 text-[#2f6cbc]" />{fmtMm(row.rain)} mm · {w(`rainCat.${rainCatOf(row)}`)}</span>
                        <span className="inline-flex items-center gap-1.5 tabular-nums"><Thermometer className="h-4 w-4 text-[#e0702f]" />{Math.round(row.min)}–{Math.round(row.max)}°</span>
                        {row.humidity != null && <span className="tabular-nums">{w("humidity")} {Math.round(row.humidity)}%</span>}
                        {row.windSpeed != null && <span className="inline-flex items-center gap-1.5 tabular-nums"><Wind className="h-4 w-4" />{msToKmh(row.windSpeed)} km/h</span>}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{dayNote(row, w)}</p>
                  </article>
                )
              })}
              {records.length > PAGE_SIZE && (
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    {w("histPage", {
                      from: (pageSafe - 1) * PAGE_SIZE + 1,
                      to: Math.min(pageSafe * PAGE_SIZE, records.length),
                      n: records.length,
                    })}
                  </p>
                  <Pagination label={w("histDaysTitle")} variant="boxed" showEdges count={pageCount} page={pageSafe} onPageChange={setPage} />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default PastDays
