import { useCallback, useEffect, useMemo, useState } from "react"
import type { NextPage } from "next"
import Head from "next/head"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import { useQuery } from "@tanstack/react-query"
import {
  Bar, CartesianGrid, ComposedChart, LabelList, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  CalendarX, ChevronDown, ChevronUp, CloudOff, CloudRain, Download, Droplets, Plus, Sun, Thermometer, X, type LucideIcon,
} from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"
import { SectorMenu } from "@/components/weather/SectorMenu"
import { StateCard } from "@/components/weather/StateCard"
import { DateRangePicker, type DateRange } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import type { FeatureCollection } from "@/lib/soil"
import {
  SECTORS, NO_DATA_FILL, addDays, minusYear, periodStats, previousSeason, rainRamp, seasonOf, seasonRange, tempRamp,
  useSectorHistory, type PeriodStats, type Season,
} from "@/lib/weather"
import { dayMonth, downloadCsv, escapeHtml, fmtInt, fromIso, monthName, useWx } from "@/lib/weatherFormat"

const WeatherMap = dynamic(() => import("@/components/WeatherSectorMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[10px] bg-muted" />,
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

const DEFAULT_SECTOR = "Musanze"
const MAX_SECTORS = 3
const SERIES = ["#147677", "#b45309", "#6d28d9"]
const RAIN_BAR = "#3b7dd8"
const LY_BAR = "#c9d9ee"
const TEMP_LINE = "#e0702f"
const BAND: Record<Season, [string, string]> = { A: ["#e8f3f3", "#0f5f60"], B: ["#eef5e7", "#3d6b1f"], C: ["#f8f2e4", "#8a5a00"] }
const PRESETS = ["thisSeason", "lastSeason", "last12", "year", "custom"] as const
type Preset = (typeof PRESETS)[number]

const kigaliToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali" }).format(new Date())

type ChartRow = { ym: string; rain: number | null; ly: number | null; temp: number | null }

const Historical: NextPage = () => {
  const { w, lang } = useWx()
  const router = useRouter()

  const [sectors, setSectorsState] = useState<string[]>([DEFAULT_SECTOR])
  const [preset, setPreset] = useState<Preset>("last12")
  const [custom, setCustom] = useState<DateRange>(() => {
    const y = addDays(kigaliToday(), -1)
    return { start: `${y.slice(0, 4)}-01-01`, end: y }
  })
  const [cmpLastYear, setCmpLastYear] = useState(true)
  const [metric, setMetric] = useState<"rain" | "temp">("rain")
  const [menuOpen, setMenuOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)

  // ?sectors=A,B keeps the comparison shareable
  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.sectors
    if (typeof q === "string") {
      const picked = q.split(",").filter((s) => (SECTORS as readonly string[]).includes(s)).slice(0, MAX_SECTORS)
      if (picked.length) setSectorsState(picked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])
  const setSectors = (next: string[]) => {
    const list = next.slice(0, MAX_SECTORS)
    if (!list.length) return
    setSectorsState(list)
    router.replace({ pathname: router.pathname, query: { ...router.query, sectors: list.join(",") } }, undefined, { shallow: true })
  }
  const addSector = (s: string) => { if (!sectors.includes(s)) setSectors([...sectors, s]); setMenuOpen(false) }
  const removeSector = (s: string) => setSectors(sectors.filter((x) => x !== s))

  // ---- period ----
  const today = kigaliToday()
  const yesterday = addDays(today, -1)
  const [start, end] = useMemo((): [string, string] => {
    const clampEnd = (s: string, e: string): [string, string] => [s, e < s ? s : e]
    switch (preset) {
      case "thisSeason": { const r = seasonRange(today); return clampEnd(r.start, r.end < yesterday ? r.end : yesterday) }
      case "lastSeason": { const r = previousSeason(today); return clampEnd(r.start, r.end) }
      case "year": return clampEnd(`${today.slice(0, 4)}-01-01`, yesterday)
      case "custom": return clampEnd(custom.start, custom.end)
      default: {
        const y = +yesterday.slice(0, 4)
        const m = +yesterday.slice(5, 7) - 1 - 11
        const first = new Date(y, m, 1)
        return clampEnd(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`, yesterday)
      }
    }
  }, [preset, custom, today, yesterday])

  const primary = sectors[0]
  const single = sectors.length === 1
  const wantLY = single && cmpLastYear

  const histQ = useSectorHistory(start, end)
  const lyQ = useSectorHistory(minusYear(start), minusYear(end), wantLY)
  const sectorsGeo = useGeo("Sectors.geojson")
  const districtGeo = useGeo("Musanze_District_Boundary.geojson")

  const allStats = useMemo(() => {
    const m: Record<string, PeriodStats | null> = {}
    SECTORS.forEach((s) => (m[s] = periodStats(histQ.data?.[s]?.records, start, end)))
    return m
  }, [histQ.data, start, end])
  const ly = wantLY ? periodStats(lyQ.data?.[primary]?.records, minusYear(start), minusYear(end)) : null
  const main = allStats[primary]

  const isLoading = histQ.isLoading
  const isDown = histQ.isError
  const isLive = !isLoading && !isDown && !!main
  const noData = !isLoading && !isDown && !main

  // ---- text ----
  const colorOf = (s: string) => SERIES[sectors.indexOf(s)] ?? SERIES[0]
  const dt = (iso: string) => dayMonth(fromIso(iso), lang, { year: true })
  const dts = (iso: string) => dayMonth(fromIso(iso), lang)
  const ymName = (ym: string, long = true) => `${monthName(+ym.slice(5) - 1, lang, long)} ${ym.slice(0, 4)}`
  const daysWord = (n: number) => (n === 1 ? w("day") : w("days"))
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null)

  const periodName = (() => {
    if (preset === "thisSeason" || preset === "lastSeason") {
      const r = preset === "thisSeason" ? seasonRange(today) : previousSeason(today)
      const y = r.season === "A" ? `${r.start.slice(0, 4)}/${r.end.slice(2, 4)}` : r.start.slice(0, 4)
      const months = `${monthName(+r.start.slice(5, 7) - 1, lang)}–${monthName(+r.end.slice(5, 7) - 1, lang)}`
      const name = w("seasonName", { s: r.season, y, months })
      return r.end > end ? `${name}, ${w("soFar")}` : name
    }
    return w(`preset.${preset}`)
  })()
  const periodText = `${w("periodText", { name: periodName, from: dt(start), to: dt(end) })}${main ? ` · ${w("daysOfRecords", { n: main.count })}` : ""}`

  let answer = ""
  if (main) {
    if (single) {
      let cmp = ""
      if (ly) {
        const p = pct(main.total, ly.total)
        cmp = p == null ? "" : Math.abs(p) < 3 ? w("ansSame") : w(p > 0 ? "ansMore" : "ansLess", { p: Math.abs(p) })
      }
      answer = w("ansSingle", { s: primary, mm: fmtInt(main.total), from: dt(start), to: dt(end), cmp })
      if (main.months.length > 1) {
        const wet = main.months.reduce((a, b) => (b.rain > a.rain ? b : a))
        const dry = main.months.reduce((a, b) => (b.rain < a.rain ? b : a))
        answer += ` ${w("ansMonths", { wm: ymName(wet.ym), wmm: wet.rain, dm: ymName(dry.ym), dmm: dry.rain })}`
      }
      if (wantLY && !lyQ.isLoading && !ly) answer += ` ${w("noPrev")}`
    } else {
      const ranked = sectors.map((s) => [s, allStats[s]] as const).filter((x): x is readonly [string, PeriodStats] => !!x[1]).sort((a, b) => b[1].total - a[1].total)
      answer = w("ansMulti", { s: ranked[0][0], mm: fmtInt(ranked[0][1].total), from: dt(start), to: dt(end) })
      const rest = ranked.slice(1).map(([s, x]) => w("ansOther", { s, mm: fmtInt(x.total) }))
      if (rest.length) answer += ` ${rest.join(", ")}.`
    }
  }

  // ---- stat cards ----
  type Row = { name: string; color: string; value: string }
  const rowsFor = (fn: (x: PeriodStats) => string, lyFn: (x: PeriodStats) => string): Row[] => {
    if (!single) return sectors.slice(1).map((s) => ({ name: s, color: colorOf(s), value: allStats[s] ? fn(allStats[s]!) : "–" }))
    if (wantLY) return [{ name: w("cLastYear"), color: LY_BAR, value: ly ? lyFn(ly) : "–" }]
    return []
  }
  const stats: { icon: LucideIcon; iconColor: string; label: string; value: string; unit: string; meaning: string; bg: string; rows: Row[] }[] = main
    ? (() => {
        const heavyMonth = main.months.reduce((a, b) => (b.heavy > a.heavy ? b : a))
        return [
          {
            icon: Droplets, iconColor: "#2f6cbc", label: w("totalRain"), value: fmtInt(main.total), unit: "mm", bg: "#fff",
            meaning: w("rainyMeaning", { n: main.rainyDays, k: Math.round((main.rainyDays / main.count) * 10) }),
            rows: rowsFor((x) => `${fmtInt(x.total)} mm`, (x) => {
              const p = pct(main.total, x.total)
              return `${fmtInt(x.total)} mm${p == null ? "" : ` (${p >= 0 ? "+" : ""}${p}%)`}`
            }),
          },
          {
            icon: Thermometer, iconColor: TEMP_LINE, label: w("avgTemp"), value: `${main.avgMax}° / ${main.avgMin}°`, unit: w("highLow"), bg: "#fff",
            meaning: w("tempMeaning", { hot: Math.round(main.hottest.max), hd: dts(main.hottest.date), cold: Math.round(main.coldest.min), cd: dts(main.coldest.date), n: main.hotDays }),
            rows: rowsFor((x) => `${x.avgMax}° / ${x.avgMin}°`, (x) => `${x.avgMax}° / ${x.avgMin}°`),
          },
          {
            icon: CloudRain, iconColor: "#2f6cbc", label: w("heavyDays"), value: `${main.heavyDays}`, unit: daysWord(main.heavyDays), bg: main.heavyDays >= 5 ? "#f3f7fc" : "#fff",
            meaning: `${w("heavyMeaning")} ${main.heavyDays ? w("heavyMost", { m: monthName(+heavyMonth.ym.slice(5) - 1, lang, true) }) : w("heavyNone")}`,
            rows: rowsFor((x) => `${x.heavyDays}`, (x) => `${x.heavyDays}`),
          },
          {
            icon: Sun, iconColor: "#e39a1c", label: w("drySpell"), value: `${main.longestDry.len}`, unit: daysWord(main.longestDry.len), bg: "#fff",
            meaning: main.longestDry.len && main.longestDry.from && main.longestDry.to ? w("dryMeaning", { from: dts(main.longestDry.from), to: dts(main.longestDry.to) }) : "",
            rows: rowsFor((x) => `${x.longestDry.len} ${daysWord(x.longestDry.len)}`, (x) => `${x.longestDry.len} ${daysWord(x.longestDry.len)}`),
          },
        ]
      })()
    : []

  // ---- charts (one per sector, same scales) ----
  const months = useMemo(() => {
    const set = new Set<string>()
    sectors.forEach((s) => allStats[s]?.months.forEach((m) => set.add(m.ym)))
    return Array.from(set).sort()
  }, [sectors, allStats])
  const lyByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    ly?.months.forEach((x) => (m[x.ym.slice(5)] = x.rain))
    return m
  }, [ly])
  const chartRows = (s: string): ChartRow[] => {
    const byYm = new Map((allStats[s]?.months ?? []).map((m) => [m.ym, m]))
    return months.map((ym) => {
      const m = byYm.get(ym)
      return { ym, rain: m ? m.rain : null, ly: wantLY && ly ? lyByMonth[ym.slice(5)] ?? null : null, temp: m ? m.tavg : null }
    })
  }
  const allRain = sectors.flatMap((s) => allStats[s]?.months.map((m) => m.rain) ?? []).concat(ly?.months.map((m) => m.rain) ?? [])
  const yMax = Math.max(50, Math.ceil(Math.max(0, ...allRain) / 50) * 50)
  const allTemp = sectors.flatMap((s) => allStats[s]?.months.map((m) => m.tavg) ?? [])
  const tDomain: [number, number] = allTemp.length ? [Math.floor(Math.min(...allTemp)) - 2, Math.ceil(Math.max(...allTemp)) + 2] : [5, 25]
  const bands = (() => {
    const out: { season: Season; from: string; to: string; n: number }[] = []
    months.forEach((ym) => {
      const se = seasonOf(+ym.slice(5) - 1)
      const last = out[out.length - 1]
      if (last && last.season === se) { last.to = ym; last.n++ } else out.push({ season: se, from: ym, to: ym, n: 1 })
    })
    return out
  })()
  const tickLabel = (ym: string) => {
    const i = months.indexOf(ym)
    const showYear = months.length <= 6 || ym.endsWith("-01") || i === 0
    return `${monthName(+ym.slice(5) - 1, lang)}${showYear ? ` ${ym.slice(2, 4)}` : ""}`
  }

  // ---- map ----
  const isRain = metric === "rain"
  const mapVal = (x: PeriodStats) => (isRain ? x.total : (x.avgMax + x.avgMin) / 2)
  const vals = SECTORS.map((s) => allStats[s]).filter((x): x is PeriodStats => !!x).map(mapVal)
  const vlo = vals.length ? Math.min(...vals) : 0
  const vhi = vals.length ? Math.max(...vals) : 1
  const { mapFills, mapLabels } = useMemo(() => {
    const fills: Record<string, string> = {}
    const labels: Record<string, string> = {}
    SECTORS.forEach((s) => {
      const x = allStats[s]
      if (!x) { fills[s] = NO_DATA_FILL; labels[s] = "–"; return }
      const v = mapVal(x)
      const t = (v - vlo) / Math.max(1, vhi - vlo)
      fills[s] = isRain ? rainRamp(t) : tempRamp(t)
      labels[s] = isRain ? `${fmtInt(x.total)} mm` : `${Math.round(v)}°`
    })
    return { mapFills: fills, mapLabels: labels }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStats, isRain, vlo, vhi])

  const popupHtml = useCallback(
    (s: string) => {
      const x = allStats[s]
      const row = (k: string, v: string | number) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:3px 0;"><span style="color:#64748b;">${escapeHtml(k)}</span><b style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums;">${escapeHtml(String(v))}</b></div>`
      const inCmp = sectors.includes(s)
      const btn = s === primary
        ? ""
        : inCmp
          ? `<button data-action="remove" data-sector="${escapeHtml(s)}" style="font:inherit;margin-top:8px;width:100%;border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:8px;font-size:14px;font-weight:600;color:#475569;cursor:pointer;">${escapeHtml(w("remove"))}</button>`
          : sectors.length < MAX_SECTORS
            ? `<button data-action="add" data-sector="${escapeHtml(s)}" style="font:inherit;margin-top:8px;width:100%;border:0;background:#147677;border-radius:8px;padding:8px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;">${escapeHtml(w("addToCompare"))}</button>`
            : ""
      if (!x) return `<div style="font-size:15px;font-weight:700;">${escapeHtml(s)}</div><div style="font-size:14px;color:#64748b;margin-top:4px;">${escapeHtml(w("histNoData", { s }))}</div>${btn}`
      return `<div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">${escapeHtml(s)}</div>`
        + row(w("totalRain"), `${fmtInt(x.total)} mm`) + row(w("rainyD"), x.rainyDays) + row(w("heavyD"), x.heavyDays)
        + row(w("avgTemp"), `${x.avgMax}° / ${x.avgMin}°`) + btn
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStats, sectors.join(","), primary, lang]
  )
  const onMapAction = (action: string, s: string) => {
    if (action === "add") addSector(s)
    if (action === "remove") removeSector(s)
  }

  // ---- table + CSV ----
  const tableRows = months.flatMap((ym) => sectors.map((s, j) => {
    const m = allStats[s]?.months.find((x) => x.ym === ym)
    return { ym, first: j === 0, sector: s, rain: m?.rain, ly: wantLY && ly ? lyByMonth[ym.slice(5)] : undefined, rainy: m?.rainyDays, heavy: m?.heavy, hi: m?.tmax, lo: m?.tmin }
  }))
  const showLyCol = wantLY && !!ly
  const exportCsv = () => {
    const header = ["Month", "Sector", "Rain_mm", ...(showLyCol ? ["Rain_last_year_mm"] : []), "RainyDays", "HeavyDays", "AvgHigh_C", "AvgLow_C"]
    const rows = tableRows.map((r) => [r.ym, r.sector, r.rain ?? "", ...(showLyCol ? [r.ly ?? ""] : []), r.rainy ?? "", r.heavy ?? "", r.hi ?? "", r.lo ?? ""])
    downloadCsv(`historical_${sectors.join("-")}_${start}_${end}.csv`, [header, ...rows])
  }

  const firstDate = histQ.data?.[primary]?.firstDate
  const noDataText = firstDate && firstDate > end
    ? w("histNoDataText", { s: primary, d: dt(firstDate) })
    : !firstDate && histQ.data ? w("histNoDataNever", { s: primary }) : undefined

  const segBtn = (on: boolean) => `rounded-md px-3 py-[7px] text-sm font-medium ${on ? "bg-[#147677] text-white" : "text-slate-600 hover:text-slate-900"}`

  return (
    <AppLayout>
      <Head><title>{`${w("histTitle")} | Teganyamuhinzi`}</title></Head>
      <div className="max-w-[1280px] space-y-4 p-3 text-sm text-[#171717] md:p-6">
        {/* Header + filters */}
        <div className="flex flex-col gap-3.5 rounded-lg bg-white px-4 py-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-[#147677]">{w("histTitle")}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{w("histSub")}</p>
            </div>
            <button onClick={exportCsv} disabled={!isLive} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#f9fafb] disabled:opacity-50">
              <Download className="h-4 w-4 text-[#147677]" />{w("exportCsv")}
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{w("sectorsLabel")}</span>
              <div className="relative flex flex-wrap items-center gap-1.5">
                {sectors.map((s) => (
                  <span key={s} className="inline-flex items-center gap-2 rounded-lg border-[1.5px] bg-white py-[7px] pl-3 pr-2 text-[15px] font-semibold text-slate-900" style={{ borderColor: colorOf(s) }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s) }} />{s}
                    {sectors.length > 1 && (
                      <button onClick={() => removeSector(s)} aria-label={`${w("remove")} ${s}`} className="flex p-0.5 text-slate-500 hover:text-slate-800"><X className="h-[15px] w-[15px]" /></button>
                    )}
                  </span>
                ))}
                {sectors.length < MAX_SECTORS && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#9fb3bb] bg-white px-3 py-2 text-sm font-semibold text-[#147677]">
                      <Plus className="h-[15px] w-[15px]" />{w("addSector")}
                    </button>
                    <SectorMenu
                      open={menuOpen}
                      onClose={() => setMenuOpen(false)}
                      onPick={addSector}
                      width={280}
                      searchPlaceholder={w("searchSectors")}
                      noMatch={(q) => w("noMatch", { q })}
                      items={SECTORS.filter((s) => !sectors.includes(s)).map((s) => ({
                        name: s,
                        right: <span className="text-[13px] tabular-nums text-slate-500">{allStats[s] ? `${fmtInt(allStats[s]!.total)} mm` : "–"}</span>,
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">{w("period")}</span>
              <div role="radiogroup" className="flex flex-wrap gap-1 rounded-[9px] border border-gray-200 bg-gray-100 p-[3px]">
                {PRESETS.map((p) => (
                  <button key={p} role="radio" aria-checked={preset === p} onClick={() => setPreset(p)} className={segBtn(preset === p)}>{w(`preset.${p}`)}</button>
                ))}
              </div>
            </div>
            {preset === "custom" && (
              <div className="w-[260px]">
                <DateRangePicker value={custom} onChange={setCustom} locale={lang === "rw" ? "rw-RW" : "en-GB"} label={w("period")} max={fromIso(yesterday)} />
              </div>
            )}
            {single && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-semibold text-slate-700">{w("compareWith")}</span>
                <div role="radiogroup" className="flex flex-wrap gap-1 rounded-[9px] border border-gray-200 bg-gray-100 p-[3px]">
                  <button role="radio" aria-checked={!cmpLastYear} onClick={() => setCmpLastYear(false)} className={segBtn(!cmpLastYear)}>{w("cNone")}</button>
                  <button role="radio" aria-checked={cmpLastYear} onClick={() => setCmpLastYear(true)} className={segBtn(cmpLastYear)}>{w("cLastYear")}</button>
                </div>
              </div>
            )}
          </div>
          <div className="text-sm text-slate-600">{periodText}</div>
        </div>

        {isDown && <StateCard icon={CloudOff} tone="error" title={w("downTitle")} text={w("downHistText")} retryLabel={w("retry")} onRetry={() => histQ.refetch()} />}

        {isLoading && (
          <div className="flex flex-col gap-4" aria-busy>
            <div className="flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-[22px]">
              <Skeleton className="h-[22px] w-[70%]" />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[130px] rounded-xl" />)}</div>
            </div>
            <div className="flex h-[340px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-slate-500">{w("loadingHist")}</div>
          </div>
        )}

        {noData && <StateCard icon={CalendarX} title={w("histNoData", { s: primary })} text={noDataText} />}

        {isLive && main && (
          <>
            {/* Answer + stat cards */}
            <section className="flex flex-col gap-[18px] rounded-2xl border border-gray-200 bg-white px-4 py-[18px] md:px-6 md:py-[22px]">
              <p className="max-w-[900px] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] text-slate-900 md:text-[22px]">{answer}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-1.5 rounded-xl border border-gray-200 p-4" style={{ background: s.bg }}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><s.icon className="h-[17px] w-[17px]" color={s.iconColor} />{s.label}</div>
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-slate-900">{s.value}</span>
                      <span className="text-[15px] text-slate-600">{s.unit}</span>
                    </div>
                    {s.meaning && <p className="text-sm leading-[1.45] text-slate-700">{s.meaning}</p>}
                    {s.rows.length > 0 && (
                      <div className="mt-1 flex flex-col gap-[3px]">
                        {s.rows.map((r) => (
                          <div key={r.name} className="flex justify-between gap-2 border-t border-[#eef1f3] pt-[5px] text-sm text-slate-600">
                            <span className="flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />{r.name}</span>
                            <b className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{r.value}</b>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Monthly chart */}
            <section className="rounded-2xl border border-gray-200 bg-white px-4 py-[18px] md:px-6 md:py-[22px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                <h2 className="text-[17px] font-bold text-slate-900">{w("monthlyTitle")}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: RAIN_BAR }} />{w("bars")}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-sm" style={{ background: TEMP_LINE }} />{w("line")}</span>
                  {showLyCol && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: LY_BAR }} />{w("lastYearBars")}</span>}
                </div>
              </div>
              <div className="mt-2.5 overflow-x-auto">
                <div className="flex min-w-[600px] flex-col gap-3.5">
                  {sectors.filter((s) => allStats[s]).map((s) => (
                    <div key={s}>
                      {!single && (
                        <div className="mb-1 mt-0.5 flex items-center gap-2 text-[15px] font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(s) }} />{s}</div>
                      )}
                      <ResponsiveContainer width="100%" height={single ? 300 : 210}>
                        <ComposedChart data={chartRows(s)} margin={{ top: 26, right: 4, bottom: 0, left: -8 }} barGap={2}>
                          {bands.map((b) => (
                            <ReferenceArea
                              key={b.from}
                              yAxisId="rain"
                              x1={b.from}
                              x2={b.to}
                              y1={0}
                              y2={yMax}
                              fill={BAND[b.season][0]}
                              fillOpacity={1}
                              ifOverflow="extendDomain"
                              label={{ value: b.n >= 2 ? w("seasonShort", { s: b.season }) : b.season, position: "insideTopLeft", fill: BAND[b.season][1], fontSize: 13, fontWeight: 600 }}
                            />
                          ))}
                          <CartesianGrid vertical={false} stroke="#e5e9ec" />
                          <XAxis dataKey="ym" tickFormatter={tickLabel} tick={{ fontSize: 13, fill: "#334155" }} tickLine={false} axisLine={{ stroke: "#e5e9ec" }} interval={0} />
                          <YAxis yAxisId="rain" domain={[0, yMax]} ticks={[0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t))} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
                          <YAxis yAxisId="temp" orientation="right" domain={tDomain} ticks={[0, 0.5, 1].map((t) => Math.round(tDomain[0] + (tDomain[1] - tDomain[0]) * t))} tick={{ fontSize: 12, fill: "#c25a1f" }} tickFormatter={(v) => `${v}°`} tickLine={false} axisLine={false} width={36} />
                          <Tooltip content={<ChartTooltip w={w} ymName={ymName} showLy={showLyCol} />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
                          {showLyCol && <Bar yAxisId="rain" dataKey="ly" fill={LY_BAR} radius={[2, 2, 0, 0]} maxBarSize={30} isAnimationActive={false} />}
                          <Bar yAxisId="rain" dataKey="rain" fill={RAIN_BAR} radius={[2, 2, 0, 0]} maxBarSize={30} isAnimationActive={false}>
                            {months.length <= 13 && <LabelList dataKey="rain" position="top" fontSize={12} fontWeight={600} fill="#1d4f8a" />}
                          </Bar>
                          <Line yAxisId="temp" dataKey="temp" stroke={TEMP_LINE} strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: TEMP_LINE, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Sector map */}
        {!isLoading && !isDown && (
          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white px-5 py-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-bold text-slate-900">{w("mapHist", { m: isRain ? w("totalRainM") : w("avgTempM") })}</h2>
              <div role="radiogroup" className="inline-grid grid-cols-2 rounded-[9px] border border-gray-200 bg-gray-100 p-[3px]">
                {(["rain", "temp"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={metric === m} onClick={() => setMetric(m)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${metric === m ? "bg-[#147677] text-white" : "text-slate-600"}`}>{w(m)}</button>
                ))}
              </div>
            </div>
            <div className="relative isolate mt-3 h-[300px] overflow-hidden rounded-[10px] md:h-[460px]">
              {sectorsGeo.isError ? (
                <div className="flex h-full items-center justify-center bg-[#e9eef2] p-4 text-center text-sm text-slate-500">{w("mapUnavailable")}</div>
              ) : (
                <WeatherMap
                  sectors={sectorsGeo.data ?? null}
                  district={districtGeo.data ?? null}
                  fills={mapFills}
                  labels={mapLabels}
                  selected={primary}
                  compare={sectors.slice(1)}
                  popupHtml={popupHtml}
                  onAction={onMapAction}
                />
              )}
            </div>
            {vals.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2 text-[13px] text-slate-600">
                <span>{isRain ? `${w("drier")} ${fmtInt(vlo)}` : `${w("cooler")} ${Math.round(vlo)}°`}</span>
                <span
                  className="h-2.5 flex-1 rounded-[5px] border border-black/[0.08]"
                  style={{ background: `linear-gradient(90deg,${(isRain ? rainRamp : tempRamp)(0)},${(isRain ? rainRamp : tempRamp)(0.5)},${(isRain ? rainRamp : tempRamp)(1)})` }}
                />
                <span>{isRain ? `${fmtInt(vhi)} mm ${w("wetter")}` : `${Math.round(vhi)}° ${w("warmer")}`}</span>
              </div>
            )}
            <p className="mt-1.5 text-[13px] text-slate-500">{w("mapHintHist")}</p>
          </section>
        )}

        {/* Monthly figures */}
        {isLive && (
          <section className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <button onClick={() => setTableOpen((o) => !o)} aria-expanded={tableOpen} className="flex items-center gap-1.5 text-[15px] font-semibold text-[#147677]">
              {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{tableOpen ? w("hideMonthly") : w("showMonthly")}
            </button>
            {tableOpen && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-gray-200 text-left font-semibold text-slate-600">
                      <th className="p-2 font-semibold">{w("month")}</th>
                      <th className="p-2 font-semibold">{w("sector")}</th>
                      <th className="p-2 text-right font-semibold">{w("rainMm")}</th>
                      {showLyCol && <th className="p-2 text-right font-semibold">{w("lastYear")}</th>}
                      <th className="p-2 text-right font-semibold">{w("rainyD")}</th>
                      <th className="p-2 text-right font-semibold">{w("heavyD")}</th>
                      <th className="p-2 text-right font-semibold">{w("avgHigh")}</th>
                      <th className="p-2 text-right font-semibold">{w("avgLow")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={`${r.ym}-${r.sector}`} className={`border-t ${r.first ? "border-gray-200" : "border-[#f3f5f6]"}`}>
                        <td className="px-2 py-[7px] font-semibold text-slate-900">{r.first ? ymName(r.ym, false) : ""}</td>
                        <td className="px-2 py-[7px] text-slate-700">{r.sector}</td>
                        <td className="px-2 py-[7px] text-right font-semibold">{r.rain ?? "–"}</td>
                        {showLyCol && <td className="px-2 py-[7px] text-right text-slate-500">{r.ly ?? "–"}</td>}
                        <td className="px-2 py-[7px] text-right">{r.rainy ?? "–"}</td>
                        <td className="px-2 py-[7px] text-right">{r.heavy ?? "–"}</td>
                        <td className="px-2 py-[7px] text-right">{r.hi != null ? `${r.hi}°` : "–"}</td>
                        <td className="px-2 py-[7px] text-right">{r.lo != null ? `${r.lo}°` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  )
}

type W = (key: string, params?: Record<string, string | number>) => string

function ChartTooltip({ active, payload, w, ymName, showLy }: { active?: boolean; payload?: { payload: ChartRow }[]; w: W; ymName: (ym: string) => string; showLy: boolean }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-semibold text-slate-900">{ymName(r.ym)}</div>
      <div className="flex justify-between gap-4 text-slate-600"><span>{w("rain")}</span><b className="tabular-nums text-slate-900">{r.rain ?? "–"} mm</b></div>
      {showLy && <div className="flex justify-between gap-4 text-slate-600"><span>{w("lastYear")}</span><b className="tabular-nums text-slate-900">{r.ly ?? "–"} mm</b></div>}
      <div className="flex justify-between gap-4 text-slate-600"><span>{w("avgTemp")}</span><b className="tabular-nums text-slate-900">{r.temp != null ? `${r.temp}°C` : "–"}</b></div>
    </div>
  )
}

export default Historical
