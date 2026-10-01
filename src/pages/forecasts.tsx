import { useCallback, useEffect, useMemo, useState } from "react"
import type { NextPage } from "next"
import Head from "next/head"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import { useQuery } from "@tanstack/react-query"
import {
  Check, ChevronDown, ChevronUp, CloudAlert, CloudOff, Copy, Download, Droplet, Droplets, MapPin,
  MessageSquareText, Sprout, TriangleAlert, Umbrella, Wind, X, type LucideIcon,
} from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"
import { ConditionIcon, conditionIcon } from "@/components/weather/ConditionIcon"
import { SectorMenu } from "@/components/weather/SectorMenu"
import { StateCard } from "@/components/weather/StateCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { FeatureCollection } from "@/lib/soil"
import type { DailyWeather, HourlyForecast, WeatherAlert } from "@/types/weather"
import {
  SECTORS, HEAVY_DAY_MM, NO_DATA_FILL, RAIN_FILL, STRONG_WIND_KMH, amountCat, chanceCat, conditionOf, fieldCat,
  sectorDays, tempRamp, useLocationWeather, useSectorWeather, warmRamp, type Day, type FieldCat,
} from "@/lib/weather"
import { dayMonth, downloadCsv, escapeHtml, joinList, useWx, weekday } from "@/lib/weatherFormat"

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
const LIST_DAYS = 8
const FIELD_STYLE: Record<FieldCat, { bg: string; border: string; color: string; cond: "clear" | "clouds" | "rain" }> = {
  good: { bg: "#e7f3ea", border: "#c6e3cd", color: "#0c5b2f", cond: "clear" },
  maybe: { bg: "#f5f7f8", border: "#e3e8ec", color: "#334155", cond: "clouds" },
  avoid: { bg: "#e6eef8", border: "#c9daf0", color: "#1d4f8a", cond: "rain" },
}
const ALERT_CATEGORIES = ["rainfall", "flooding", "temperature"]

const kigaliHour = (dt: number) =>
  +new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Kigali" }).format(new Date(dt * 1000)) % 24
const kigaliTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Kigali" }).format(d)
const kigaliDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali" }).format(d)
const partOfDay = (h: number) => (h >= 5 && h < 11 ? "morning" : h >= 11 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night")

type Banner = { key: string; title: string; text: string; cta?: { label: string; onClick: () => void } }

const Forecasts: NextPage = () => {
  const { w, lang, ago } = useWx()
  const router = useRouter()

  const [sector, setSectorState] = useState(DEFAULT_SECTOR)
  const [dayState, setDayIdx] = useState(0)
  const [metric, setMetric] = useState<"rain" | "temp">("rain")
  const [allDays, setAllDays] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  // ?sector= keeps the selection shareable and survives reloads
  useEffect(() => {
    if (!router.isReady) return
    const q = router.query.sector
    if (typeof q === "string" && (SECTORS as readonly string[]).includes(q)) setSectorState(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])
  const setSector = (s: string) => {
    setSectorState(s)
    setMenuOpen(false)
    router.replace({ pathname: router.pathname, query: { ...router.query, sector: s } }, undefined, { shallow: true })
  }

  const weatherQ = useSectorWeather()
  const sectorsGeo = useGeo("Sectors.geojson")
  const districtGeo = useGeo("Musanze_District_Boundary.geojson")

  const all = useMemo(() => weatherQ.data?.sectors ?? [], [weatherQ.data])
  const daysBySector = useMemo(() => {
    const m: Record<string, Day[]> = {}
    all.forEach((s) => (m[s.sector] = sectorDays(s)))
    return m
  }, [all])
  const sw = all.find((s) => s.sector === sector)
  const days = daysBySector[sector] ?? []
  const nDays = days.length
  const dayIdx = Math.min(dayState, Math.max(0, nDays - 1))
  const d: Day | undefined = days[dayIdx]
  const isToday = dayIdx === 0

  // Overview, farming advice, soil, confidence, 3-hourly and alerts for the selected sector
  const locQ = useLocationWeather(sw?.locationId)
  const loc = locQ.data
  const utcIso = (dt: Date) => dt.toISOString().slice(0, 10)
  const locDay: DailyWeather | undefined = d
    ? loc?.weather?.daily?.find((x) => x.date === utcIso(d.date)) ?? (isToday ? loc?.weather?.daily?.[0] : undefined)
    : undefined
  const hourly = useMemo<HourlyForecast[]>(() => loc?.weather?.daily?.find((x) => x.hourly?.length)?.hourly ?? [], [loc])

  const isLoading = weatherQ.isLoading
  const isDown = weatherQ.isError
  const noData = !isLoading && !isDown && nDays === 0

  // ---- text helpers ----
  const catWord = (k: string) => w(k)
  const dayName = (x: Day) => (x.index === 0 ? w("today") : x.index === 1 ? w("tomorrow") : weekday(x.date, lang))
  const dayNameLower = (x: Day) => (x.index <= 1 ? dayName(x).toLowerCase() : `${weekday(x.date, lang, true)} ${x.date.getDate()}`)
  const longDate = (x: Day) => `${weekday(x.date, lang, true)}, ${dayMonth(x.date, lang, { long: true })}`
  const rainText = (x: Day) => {
    const a = amountCat(x.rainfall)
    if (a === "dry") return x.rainfall > 0 ? `${w("dry")} · <1 mm` : w("dry")
    return `${w(a)} · ${Math.round(x.rainfall)} mm`
  }
  // Day list: the category word is dropped on phones so the row stays on one line
  const rainCell = (x: Day) => {
    const a = amountCat(x.rainfall)
    if (a === "dry") return x.rainfall > 0 ? <><span className="hidden sm:inline">{w("dry")} · </span>{"<1 mm"}</> : w("dry")
    return <><span className="hidden sm:inline">{w(a)} · </span>{Math.round(x.rainfall)} mm</>
  }
  const condLabel = (x: Day) => w(`cond.${x.condition}`)

  // Part of the day with the highest chance of rain today (from the 3-hourly slots)
  const todayTiming = useMemo(() => {
    const today = kigaliDate(new Date())
    const slots = hourly.filter((h) => kigaliDate(new Date(h.dt * 1000)) === today && (h.pop ?? 0) >= 0.3)
    if (!slots.length) return ""
    const top = slots.reduce((a, b) => ((b.pop ?? 0) > (a.pop ?? 0) ? b : a))
    return partOfDay(kigaliHour(top.dt))
  }, [hourly])

  const rainSentence = (x: Day) => {
    let c = chanceCat(x.rainChance)
    const a = amountCat(x.rainfall)
    if (c === "unlikely" && a !== "dry") c = "possible"
    const when = x.index === 0 && todayTiming ? w(`when.${todayTiming}`) : ""
    const at = when ? "At" : ""
    const mm = x.rainfall >= 1 ? w("mmAbout", { mm: Math.round(x.rainfall) }) : w("mmUnder1")
    if (c === "likely") {
      const key = x.condition === "thunderstorm" ? (a === "heavy" ? "thunderHeavy" : "thunder") : "rain"
      return w(`sentence.${key}${at}`, { when, mm })
    }
    if (c === "possible") return w(`sentence.possible${at}`, { when, mm })
    return w(x.condition === "clear" ? "sentence.dryClear" : "sentence.dryCloud")
  }
  const fallbackAdvice = (x: Day) => {
    const a = amountCat(x.rainfall)
    const c = chanceCat(x.rainChance)
    const k = a === "heavy" ? "heavy" : c === "likely" || a === "moderate" ? "wet" : c === "possible" || a === "light" ? "light" : "dry"
    return w(`advice.${k}`)
  }
  const humWord = (h: number) => w(`humWord.${h < 40 ? "dry" : h < 70 ? "ok" : h < 85 ? "humid" : "veryHumid"}`)
  const windWord = (k: number) => w(`windWord.${k < 12 ? "light" : k < 20 ? "moderate" : k < STRONG_WIND_KMH ? "fresh" : "strong"}`)

  // ---- coming days ----
  const tMin = days.length ? Math.min(...days.map((x) => x.tempMin)) : 0
  const tMax = days.length ? Math.max(...days.map((x) => x.tempMax)) : 1
  const span = Math.max(1, tMax - tMin)
  const shownDays = allDays ? days : days.slice(0, LIST_DAYS)

  // ---- field work ----
  const fieldDays = days.slice(0, 7).map((x) => ({ x, k: fieldCat(x.rainChance, x.rainfall) }))
  const goods = fieldDays.filter((f) => f.k === "good")
  const fieldSentence = goods.length
    ? w("bestDays", { s: sector, days: joinList(goods.map((f) => dayNameLower(f.x)), lang) })
    : fieldDays.length
      ? (() => {
          const least = fieldDays.reduce((a, b) => (b.x.rainChance < a.x.rainChance ? b : a))
          return w("noDry", { s: sector, day: dayNameLower(least.x), pct: least.x.rainChance })
        })()
      : ""

  // ---- sector map ----
  const isRain = metric === "rain"
  const sectorRows = useMemo(
    () => SECTORS.map((s) => ({ s, x: daysBySector[s]?.[dayIdx] as Day | undefined })),
    [daysBySector, dayIdx]
  )
  const withData = sectorRows.filter((r): r is { s: (typeof SECTORS)[number]; x: Day } => !!r.x)
  const sMin = withData.length ? Math.min(...withData.map((r) => r.x.tempMax)) : 0
  const sMax = withData.length ? Math.max(...withData.map((r) => r.x.tempMax)) : 1
  const tT = (x: Day) => (x.tempMax - sMin) / Math.max(1, sMax - sMin)
  const mmLabel = (mm: number) => `${mm < 1 ? "<1" : Math.round(mm)} mm`
  const { mapFills, mapLabels } = useMemo(() => {
    const fills: Record<string, string> = {}
    const labels: Record<string, string> = {}
    sectorRows.forEach(({ s, x }) => {
      if (!x) { fills[s] = NO_DATA_FILL; labels[s] = "–"; return }
      fills[s] = isRain ? RAIN_FILL[amountCat(x.rainfall)] : tempRamp(tT(x))
      labels[s] = isRain ? mmLabel(x.rainfall) : `${x.tempMax}°`
    })
    return { mapFills: fills, mapLabels: labels }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorRows, isRain, sMin, sMax])
  const ranked = [...withData].sort((a, b) => (isRain ? b.x.rainfall - a.x.rainfall : b.x.tempMax - a.x.tempMax))
  const whenWord = d ? (dayIdx <= 1 ? dayName(d).toLowerCase() : weekday(d.date, lang, true)) : ""
  const rankSentence = ranked.length
    ? (() => {
        const top3 = ranked.slice(0, 3).map(({ s, x }) => (isRain ? `${s} ${Math.round(x.rainfall)} mm` : `${s} ${x.tempMax}°`)).join(", ")
        const last = ranked[ranked.length - 1]
        return isRain
          ? w("wettest", { when: whenWord, list: top3, last: `${last.s} ${mmLabel(last.x.rainfall)}` })
          : w("warmest", { when: whenWord, list: top3, last: `${last.s} ${last.x.tempMax}°` })
      })()
    : ""
  const legend = isRain
    ? ([["dry", "<1 mm"], ["light", "1–10"], ["moderate", "10–30"], ["heavy", "30+ mm"]] as const).map(([k, r]) => ({ color: RAIN_FILL[k], label: `${w(k)} ${r}` }))
    : ([[0, w("cooler")], [0.5, ""], [1, w("warmer")]] as const).map(([t, word]) => ({ color: tempRamp(t), label: `${word} ${Math.round(sMin + (sMax - sMin) * t)}°`.trim() }))

  const popupHtml = useCallback(
    (s: string) => {
      const x = daysBySector[s]?.[dayIdx]
      if (!x) return `<div style="font-size:15px;font-weight:700;">${escapeHtml(s)}</div><div style="font-size:14px;color:#64748b;margin-top:4px;">${escapeHtml(w("noFcTitle", { s }))}</div>`
      const row = (k: string, v: string) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:3px 0;"><span style="color:#64748b;">${escapeHtml(k)}</span><b style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums;">${escapeHtml(v)}</b></div>`
      return `<div style="margin-bottom:6px;"><div style="font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(s)}</div><div style="font-size:13px;color:#64748b;">${escapeHtml(`${dayName(x)} · ${condLabel(x)}`)}</div></div>`
        + row(w("rain"), rainText(x))
        + row(w("popupChance"), `${x.rainChance}% · ${catWord(chanceCat(x.rainChance))}`)
        + row(w("popupTemp"), `${x.tempMax}° / ${x.tempMin}°`)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daysBySector, dayIdx, lang]
  )

  // ---- alerts ----
  const heavy = useMemo(() => {
    for (const i of [0, 1]) {
      const hit = SECTORS.filter((s) => (daysBySector[s]?.[i]?.rainfall ?? 0) >= HEAVY_DAY_MM)
      if (hit.length) {
        const mms = hit.map((s) => daysBySector[s][i].rainfall)
        return { dayIndex: i, sectors: hit as string[], lo: Math.floor(Math.min(...mms)), hi: Math.ceil(Math.max(...mms)) }
      }
    }
    return null
  }, [daysBySector])
  const serverAlerts: WeatherAlert[] = (loc?.intelligentAlerts ?? loc?.weather?.intelligentAlerts ?? []).filter(
    (a) => ["high", "critical"].includes(String(a.level || a.priority)) && ALERT_CATEGORIES.includes(String(a.category))
  )
  const banners: Banner[] = []
  serverAlerts.forEach((a) => {
    const key = `srv-${sector}-${a.category}`
    if (!dismissed.includes(key)) banners.push({ key, title: w(`alertCat.${a.category}.title`), text: w(`alertCat.${a.category}.text`) })
  })
  const heavyDayWord = heavy ? (heavy.dayIndex === 0 ? w("today") : w("tomorrow")).toLowerCase() : ""
  const heavyKey = heavy ? `heavy-${heavy.dayIndex}-${heavy.sectors.join(",")}` : ""
  const heavyAffected = !!heavy && heavy.sectors.includes(sector)
  const coveredByServer = heavy?.dayIndex === 0 && serverAlerts.some((a) => a.category === "rainfall" || a.category === "flooding")
  if (heavy && heavyAffected && !coveredByServer && !dismissed.includes(heavyKey)) {
    banners.push({
      key: heavyKey,
      title: w("heavyAlertTitle", { day: heavyDayWord }),
      text: w("heavyAlertText", { lo: heavy.lo, hi: heavy.hi, list: joinList(heavy.sectors, lang) }),
      cta: dayIdx !== heavy.dayIndex ? { label: w("seeDay", { day: heavyDayWord }), onClick: () => setDayIdx(heavy.dayIndex) } : undefined,
    })
  }
  const strip = heavy && !heavyAffected && !dismissed.includes(heavyKey) ? heavy : null

  // ---- SMS ----
  const advice = locDay?.farmingRecommendation || (d ? fallbackAdvice(d) : "")
  const smsText = d
    ? `${sector}, ${dayName(d).toLowerCase()}: ${rainSentence(d)} ${d.tempMin}–${d.tempMax}°C. ${advice.split(/(?<=[.:;])\s/)[0]}`
    : ""
  const copySms = () => {
    navigator.clipboard?.writeText(smsText).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCsv = () => {
    const rows: (string | number)[][] = [["Sector", "Date", "Condition", "High_C", "Low_C", "RainChance_pct", "Rain_mm", "Humidity_pct", "Wind_kmh"]]
    SECTORS.forEach((s) => (daysBySector[s] ?? []).forEach((x) =>
      rows.push([s, x.iso, x.condition, x.tempMax, x.tempMin, x.rainChance, x.rainfall, x.humidity ?? "", x.windKmh])
    ))
    downloadCsv(`musanze_forecast_${days[0]?.iso ?? "export"}.csv`, rows)
  }

  const generatedAt = weatherQ.data?.generatedAt
  const subtitle = [w("district"), generatedAt ? `${w("updated", { ago: ago(generatedAt) })} (${kigaliTime(new Date(generatedAt))})` : ""].filter(Boolean).join(" · ")

  return (
    <AppLayout>
      <Head><title>{`${w("fcTitle")} | Teganyamuhinzi`}</title></Head>
      <div className="max-w-[1280px] space-y-4 p-3 text-sm text-[#171717] md:p-6">
        {banners.map((b) => (
          <div key={b.key} role="alert" className="flex flex-wrap items-start gap-x-3.5 gap-y-3 rounded-xl border border-[#fbc98e] bg-[#fff7ed] px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fde3c3] text-[#b45309]"><TriangleAlert className="h-5 w-5" /></div>
            <div className="min-w-0 flex-[1_1_300px]">
              <div className="text-base font-bold text-[#7c2d12]">{b.title}</div>
              <div className="mt-0.5 text-sm leading-normal text-[#7c2d12]">{b.text}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {b.cta && (
                <button onClick={b.cta.onClick} className="whitespace-nowrap rounded-lg bg-[#b45309] px-3 py-2 text-sm font-semibold text-white hover:bg-[#9a4508]">{b.cta.label}</button>
              )}
              <button onClick={() => setDismissed((x) => [...x, b.key])} aria-label={w("dismiss")} className="flex p-1.5 text-[#9a3412]"><X className="h-[18px] w-[18px]" /></button>
            </div>
          </div>
        ))}
        {strip && (
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#f3d3a8] bg-white px-3 py-2 text-sm text-[#7c2d12]">
            <TriangleAlert className="h-4 w-4 text-[#b45309]" />
            <span className="flex-[1_1_240px]">{w("heavyAlertStrip", { day: heavyDayWord, list: joinList(strip.sectors, lang) })}</span>
            <button onClick={() => { setSector(strip.sectors[0]); setDayIdx(strip.dayIndex) }} className="font-semibold text-[#b45309] hover:underline">{strip.sectors[0]} →</button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#147677]">{w("fcTitle")}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { setMenuOpen((o) => !o); setShareOpen(false) }}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                className="flex min-w-[190px] items-center justify-between gap-2 rounded-lg border border-[#cfd6dc] bg-white px-3 py-2 text-[15px] font-semibold text-slate-900"
              >
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#147677]" />{sector}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              <SectorMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onPick={setSector}
                searchPlaceholder={w("searchSectors")}
                noMatch={(q) => w("noMatch", { q })}
                items={SECTORS.map((s) => {
                  const x = daysBySector[s]?.[0]
                  return {
                    name: s,
                    active: s === sector,
                    right: x ? (
                      <span className="grid grid-cols-[24px_64px] items-center gap-2">
                        <ConditionIcon cond={x.condition} size={18} />
                        <span className="text-right text-sm tabular-nums text-slate-600">{x.tempMin}–{x.tempMax}°</span>
                      </span>
                    ) : undefined,
                  }
                })}
              />
            </div>
            <button onClick={exportCsv} disabled={!all.length} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#f9fafb] disabled:opacity-50">
              <Download className="h-4 w-4 text-[#147677]" />{w("export")}
            </button>
            <div className="relative">
              <button
                onClick={() => { setShareOpen((o) => !o); setMenuOpen(false); setCopied(false) }}
                disabled={!d}
                className="flex items-center gap-2 rounded-lg bg-[#147677] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f5f60] disabled:opacity-50"
              >
                <MessageSquareText className="h-4 w-4" />{w("shareSms")}
              </button>
              {shareOpen && d && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[1100] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-600">{w("smsFor", { s: sector })}</span>
                    <button onClick={() => setShareOpen(false)} aria-label={w("dismiss")} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="rounded-[10px] bg-[#f1f5f4] p-3 text-sm leading-normal text-slate-900">{smsText}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-slate-500">{w("chars", { n: smsText.length, k: Math.ceil(smsText.length / 160) })}</span>
                    <button onClick={copySms} className="flex items-center gap-1.5 rounded-lg bg-[#147677] px-3 py-2 text-sm font-semibold text-white">
                      {copied ? <Check className="h-[15px] w-[15px]" /> : <Copy className="h-[15px] w-[15px]" />}{copied ? w("copied") : w("copy")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isDown && (
          <StateCard icon={CloudOff} tone="error" title={w("downTitle")} text={w("downFcText")} retryLabel={w("retry")} onRetry={() => weatherQ.refetch()} />
        )}

        {isLoading && <LoadingGrid label={w("loadingFc")} />}

        {noData && <StateCard icon={CloudAlert} title={w("noFcTitle", { s: sector })} text={w("noFcText")} />}

        {!isLoading && !isDown && (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {d && (
              <>
                {/* Hero */}
                <section className="flex min-w-0 flex-col gap-[18px] rounded-2xl border border-gray-200 bg-white px-4 py-[18px] md:px-6 md:py-[22px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-base font-semibold text-slate-900">
                      {sector} <span className="font-medium text-slate-500">· {isToday ? `${w("today")}, ${dayMonth(d.date, lang, { long: true })}` : longDate(d)}</span>
                    </div>
                    {!isToday && <button onClick={() => setDayIdx(0)} className="text-sm font-semibold text-[#147677] hover:underline">{w("backToday")}</button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
                    <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
                      <ConditionIcon cond={d.condition} size={76} strokeWidth={1.6} className="h-[60px] w-[60px] md:h-[76px] md:w-[76px]" />
                      <div>
                        <div className="flex items-baseline gap-1.5 tabular-nums">
                          <span className="text-5xl font-semibold leading-none tracking-[-0.03em] text-slate-900 md:text-[56px]">{d.tempMax}°</span>
                          <span className="text-[28px] font-medium text-slate-500">/ {d.tempMin}°</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{condLabel(d)} · {w("highLow")}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-[1_1_240px]">
                      <p className="text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] text-slate-900">{rainSentence(d)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <HeroChips d={d} w={w} />
                      </div>
                    </div>
                  </div>

                  {locQ.isLoading ? (
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                  ) : locDay?.overview ? (
                    <p className="text-[15px] leading-relaxed text-slate-700">{locDay.overview}</p>
                  ) : null}

                  <div className="flex gap-3.5 rounded-xl border border-[#d5e8e8] bg-[#eef6f6] px-[18px] py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#147677] text-white"><Sprout className="h-[19px] w-[19px]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-[#0f5f60]">{w("farming")}</div>
                      {locQ.isLoading ? (
                        <div className="mt-2 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
                      ) : (
                        <p className="mt-1 text-[15px] leading-[1.55] text-[#12393a]">{advice}</p>
                      )}
                      {locDay && (
                        <div className="mt-2.5 flex flex-wrap gap-x-[18px] gap-y-1.5 text-sm text-[#3f6667]">
                          {locDay.soilCondition && <span>{w("soil")}: <b className="font-semibold text-[#12393a]">{locDay.soilCondition}</b></span>}
                          {locDay.rainPrediction?.confidence && (
                            <span>{w("confidence")}: <b className="font-semibold text-[#12393a]">{w(`conf.${String(locDay.rainPrediction.confidence).toLowerCase()}`)}</b></span>
                          )}
                        </div>
                      )}
                      {locQ.isError && <p className="mt-2 text-[13px] text-[#3f6667]">{w("detailUnavailable")}</p>}
                    </div>
                  </div>

                  <div>
                    <button onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen} className="flex items-center gap-1.5 text-left text-sm font-semibold text-[#147677]">
                      {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{detailsOpen ? w("hideDetails") : w("moreDetails")}
                    </button>
                    {detailsOpen && (
                      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
                        {d.humidity != null && <DetailTile icon={Droplet} label={w("humidity")} value={`${Math.round(d.humidity)}%`} word={humWord(d.humidity)} />}
                        <DetailTile icon={Wind} label={w("wind")} value={`${d.windKmh} km/h`} word={windWord(d.windKmh)} />
                      </div>
                    )}
                  </div>
                </section>

                {/* Coming days */}
                <section className="min-w-0 rounded-2xl border border-gray-200 bg-white px-2 pb-2.5 pt-[18px] md:px-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 px-1">
                    <h2 className="text-[17px] font-bold text-slate-900">{w("nextDays", { n: nDays })}</h2>
                    <span className="text-sm text-slate-500">{w("clickDay")}</span>
                  </div>
                  <div className="mt-2 flex flex-col">
                    {shownDays.map((x) => {
                      const sel = x.index === dayIdx
                      return (
                        <button
                          key={x.iso}
                          onClick={() => setDayIdx(x.index)}
                          aria-pressed={sel}
                          className={`grid items-center gap-2.5 rounded-[10px] border-t px-2.5 py-2 text-left text-slate-900 ${sel ? "bg-[#eef6f6] shadow-[inset_0_0_0_1.5px_#147677]" : "hover:bg-slate-50"} ${x.index === 0 || sel || x.index === dayIdx + 1 ? "border-transparent" : "border-slate-100"} ${lang === "rw" ? "grid-cols-[96px_40px_minmax(0,1fr)_26px_minmax(36px,0.8fr)_28px] md:grid-cols-[116px_44px_minmax(84px,1fr)_30px_minmax(60px,1.1fr)_30px]" : "grid-cols-[84px_40px_minmax(0,1fr)_26px_minmax(36px,0.8fr)_28px] md:grid-cols-[84px_44px_minmax(84px,1fr)_30px_minmax(60px,1.1fr)_30px]"}`}
                        >
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span className="text-[15px] font-semibold">{dayName(x)}</span>
                            <span className="text-[13px] text-slate-500">{dayMonth(x.date, lang)}</span>
                          </span>
                          <span className="flex flex-col items-center gap-px">
                            <ConditionIcon cond={x.condition} size={24} />
                            <span className="min-h-[14px] text-xs font-bold text-[#2563a8]">{x.rainChance >= 30 ? `${x.rainChance}%` : ""}</span>
                          </span>
                          <span className={`min-w-0 whitespace-nowrap text-sm font-medium ${amountCat(x.rainfall) === "dry" ? "text-slate-500" : "text-[#1d4f8a]"}`}>{rainCell(x)}</span>
                          <span className="text-right text-[15px] tabular-nums text-slate-500">{x.tempMin}°</span>
                          <span className="relative h-1.5 rounded-[3px] bg-[#eef1f3]">
                            <span
                              className="absolute inset-y-0 rounded-[3px]"
                              style={{
                                left: `${((x.tempMin - tMin) / span) * 100}%`,
                                width: `${Math.max(6, ((x.tempMax - x.tempMin) / span) * 100)}%`,
                                background: `linear-gradient(90deg,${warmRamp((x.tempMin - tMin) / span)},${warmRamp((x.tempMax - tMin) / span)})`,
                              }}
                            />
                          </span>
                          <span className="text-[15px] font-semibold tabular-nums">{x.tempMax}°</span>
                        </button>
                      )
                    })}
                  </div>
                  {nDays > LIST_DAYS && (
                    <button onClick={() => setAllDays((a) => !a)} className="mt-1 w-full border-t border-slate-100 p-2.5 text-sm font-semibold text-[#147677]">
                      {allDays ? w("showFewer") : w("showAll", { n: nDays })}
                    </button>
                  )}
                </section>

                {/* Next 24 hours */}
                <section className="min-w-0 rounded-2xl border border-gray-200 bg-white px-5 py-[18px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <h2 className="text-[17px] font-bold text-slate-900">{w("next24", { s: sector })}, {w("every3")}</h2>
                    <span className="text-sm text-slate-500">{w("bluePct")}</span>
                  </div>
                  {locQ.isLoading ? (
                    <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
                  ) : hourly.length ? (
                    <div className="mt-3.5 grid gap-1 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${hourly.length}, minmax(68px, 1fr))` }}>
                      {hourly.map((h) => <HourSlot key={h.dt} h={h} w={w} />)}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">{w("hourlyUnavailable")}</p>
                  )}
                </section>

                {/* Field work */}
                <section className="min-w-0 rounded-2xl border border-gray-200 bg-white px-5 py-[18px]">
                  <h2 className="text-[17px] font-bold text-slate-900">{w("fieldTitle")}</h2>
                  <p className="mt-1.5 text-[15px] leading-normal text-slate-700">{fieldSentence}</p>
                  <div className={`mt-3.5 grid gap-1.5 ${lang === "rw" ? "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(64px,1fr))]"}`}>
                    {fieldDays.map(({ x, k }) => {
                      const st = FIELD_STYLE[k]
                      const { Icon } = conditionIcon(st.cond)
                      return (
                        <button
                          key={x.iso}
                          onClick={() => setDayIdx(x.index)}
                          title={`${x.rainChance}% · ${x.rainfall} mm`}
                          className="flex min-w-0 flex-col items-center gap-1 rounded-[10px] border-[1.5px] px-1 py-2.5 text-center"
                          style={{ background: st.bg, borderColor: x.index === dayIdx ? "#147677" : st.border, color: st.color }}
                        >
                          <span className="text-sm font-semibold leading-tight">{x.index === 0 ? w("today") : weekday(x.date, lang)}</span>
                          <Icon className="h-[18px] w-[18px]" />
                          <span className="text-[13px] font-bold">{w(k)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] leading-snug text-slate-600">
                    <span><b className="text-[#0c5b2f]">{w("good")}</b> {w("goodDef")}</span>
                    <span><b className="text-slate-700">{w("maybe")}</b> {w("maybeDef")}</span>
                    <span><b className="text-[#1d4f8a]">{w("avoid")}</b> {w("avoidDef")}</span>
                  </div>
                </section>
              </>
            )}

            {/* Sector map */}
            <section className="min-w-0 rounded-2xl border border-gray-200 bg-white px-5 py-[18px] xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="text-[17px] font-bold text-slate-900">{w("allSectors", { d: d ? (isToday ? w("today") : longDate(d)) : "" })}</h2>
                <div role="radiogroup" className="inline-grid grid-cols-2 rounded-[9px] border border-gray-200 bg-gray-100 p-[3px]">
                  {(["rain", "temp"] as const).map((m) => (
                    <button key={m} role="radio" aria-checked={metric === m} onClick={() => setMetric(m)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${metric === m ? "bg-[#147677] text-white" : "text-slate-600"}`}>
                      {w(m)}
                    </button>
                  ))}
                </div>
              </div>
              {rankSentence && <p className="mb-3 mt-1.5 text-[15px] leading-normal text-slate-700">{rankSentence}</p>}
              <div className="relative isolate h-[300px] overflow-hidden rounded-[10px] md:h-[380px]">
                {sectorsGeo.isError ? (
                  <div className="flex h-full items-center justify-center bg-[#e9eef2] p-4 text-center text-sm text-slate-500">{w("mapUnavailable")}</div>
                ) : (
                  <WeatherMap
                    sectors={sectorsGeo.data ?? null}
                    district={districtGeo.data ?? null}
                    fills={mapFills}
                    labels={mapLabels}
                    selected={sector}
                    onSelect={setSector}
                    popupHtml={popupHtml}
                  />
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-slate-600">
                {legend.map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className="h-[11px] w-4 rounded-sm border border-black/10" style={{ background: l.color }} />{l.label}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[13px] text-slate-500">{w("clickMap")} {w("thresholdsNote")}</p>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

type W = (key: string, params?: Record<string, string | number>) => string

function HeroChips({ d, w }: { d: Day; w: W }) {
  const cc = chanceCat(d.rainChance)
  const ac = amountCat(d.rainfall)
  const chips: { icon: LucideIcon; text: string; bg: string; color: string }[] = [
    { icon: Umbrella, text: w("chanceChip", { p: d.rainChance, w: w(cc) }), bg: cc === "likely" ? "#dde9f7" : "#eef3f8", color: "#1d4f8a" },
    {
      icon: Droplets,
      text: ac === "dry" ? w("dryChip") : w("mmChip", { mm: Math.round(d.rainfall), w: w(ac).toLowerCase() }),
      bg: ac === "heavy" ? "#2f6cbc" : "#eef3f8",
      color: ac === "heavy" ? "#fff" : "#1d4f8a",
    },
  ]
  if (d.windKmh >= STRONG_WIND_KMH) chips.push({ icon: Wind, text: w("windChip", { k: d.windKmh }), bg: "#fff1dc", color: "#8a4b00" })
  return (
    <>
      {chips.map((c) => (
        <span key={c.text} className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-1.5 text-sm font-semibold" style={{ background: c.bg, color: c.color }}>
          <c.icon className="h-[15px] w-[15px]" />{c.text}
        </span>
      ))}
    </>
  )
}

function DetailTile({ icon: Icon, label, value, word }: { icon: LucideIcon; label: string; value: string; word: string }) {
  return (
    <div className="rounded-[10px] border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 text-sm text-slate-500"><Icon className="h-[15px] w-[15px]" />{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{word}</div>
    </div>
  )
}

function HourSlot({ h, w }: { h: HourlyForecast; w: W }) {
  const hour = kigaliHour(h.dt)
  const pop = Math.round((h.pop ?? 0) * 100)
  const sub = hour === 6 ? w("morning") : hour === 12 ? w("midday") : hour === 18 ? w("evening") : hour === 0 ? w("night") : ""
  const night = hour >= 18 || hour < 6
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-[10px] px-1 py-2.5 text-center ${pop > 60 ? "bg-[#f0f5fb]" : ""}`}>
      <span className="text-sm font-semibold text-slate-600">{`${String(hour).padStart(2, "0")}:00`}</span>
      <span className="min-h-[15px] text-xs text-slate-500">{sub}</span>
      <ConditionIcon cond={conditionOf(h.weather?.[0]?.main, h.weather?.[0]?.description)} night={night} size={26} />
      <span className={`text-sm font-semibold tabular-nums ${pop >= 30 ? "text-[#2563a8]" : "text-slate-400"}`}>{pop}%</span>
      <span className="text-[19px] font-semibold tabular-nums text-slate-900">{Math.round(h.temp)}°</span>
    </div>
  )
}

function LoadingGrid({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" aria-busy>
      <div className="flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-6">
        <Skeleton className="h-4 w-2/5" />
        <div className="flex items-center gap-4"><Skeleton className="h-[76px] w-[76px] rounded-full" /><Skeleton className="h-[52px] w-36" /></div>
        <Skeleton className="h-[22px] w-[85%]" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5">
        <Skeleton className="h-4 w-1/3" />
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
      <Skeleton className="h-[170px] rounded-2xl" />
      <Skeleton className="h-[170px] rounded-2xl" />
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-slate-500 xl:col-span-2">{label}</div>
    </div>
  )
}

export default Forecasts
