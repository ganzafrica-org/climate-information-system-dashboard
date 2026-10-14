import type { Locale } from "@/i18n"
import { rainfallCategory, type Day, type RainCat } from "@/lib/weather"
import type { DailyWeather } from "@/types/weather"

export type WhenKind = "today" | "tomorrow" | "later"
export type WindKey = "calm" | "light_breeze" | "moderate_breeze" | "strong_breeze" | "very_strong"
export type SkyKey = "clear" | "few_clouds" | "partly_cloudy" | "mostly_cloudy"

export type PlainDayInput = {
  rainCategory?: string | null
  rainAmount?: number | null
  rainfall?: number | null
  rain?: number | null
  rainChance?: number | null
  tempMin?: number | null
  tempMax?: number | null
  clouds?: number | null
  cloudCategory?: string | null
  windStrength?: string | null
  windSpeed?: number | null
  windDirection?: string | null
  humidity?: number | null
  condition?: string | null
  conditionMain?: string | null
}

const RAIN_SENTENCE = {
  en: {
    no_rain: "no rain is expected",
    trace: "only a trace of rain is expected",
    light_rain: "light rain is expected",
    moderate_rain: "moderate rain is expected",
    heavy_rain: "heavy rain is expected",
    very_heavy: "very heavy rain is expected",
  },
  rw: {
    no_rain: "ntamvura iteganijwe",
    trace: "hitezwe akayira gusa",
    light_rain: "hitezwe imvura nke",
    moderate_rain: "hitezwe imvura iringaniye",
    heavy_rain: "hitezwe imvura nyinshi",
    very_heavy: "hitezwe imvura nyinshi cyane",
  },
} as const

export const RAIN_SHORT = {
  en: {
    no_rain: "No rain",
    trace: "Trace",
    light_rain: "Light rain",
    moderate_rain: "Moderate rain",
    heavy_rain: "Heavy rain",
    very_heavy: "Very heavy rain",
  },
  rw: {
    no_rain: "Ntamvura",
    trace: "Akayira",
    light_rain: "Imvura nke",
    moderate_rain: "Imvura iringaniye",
    heavy_rain: "Imvura nyinshi",
    very_heavy: "Imvura nyinshi cyane",
  },
} as const

const SKY_SENTENCE = {
  en: {
    clear: "The sky will be clear.",
    few_clouds: "There will be a few clouds.",
    partly_cloudy: "The sky will be partly cloudy.",
    mostly_cloudy: "The sky will be mostly cloudy.",
  },
  rw: {
    clear: "Ijuru rizaba rimeze neza.",
    few_clouds: "Hazaba ibicu bike.",
    partly_cloudy: "Hazaba ibicu biringaniye.",
    mostly_cloudy: "Hazaba ibicu byinshi.",
  },
} as const

const SKY_SHORT = {
  en: {
    clear: "Clear",
    few_clouds: "A few clouds",
    partly_cloudy: "Partly cloudy",
    mostly_cloudy: "Mostly cloudy",
  },
  rw: {
    clear: "Ijuru rimeze neza",
    few_clouds: "Ibicu bike",
    partly_cloudy: "Ibicu biringaniye",
    mostly_cloudy: "Ibicu byinshi",
  },
} as const

const WIND = {
  en: {
    calm: "The air will be calm",
    light_breeze: "A light breeze",
    moderate_breeze: "A moderate breeze",
    strong_breeze: "A strong wind",
    very_strong: "A very strong wind",
  },
  rw: {
    calm: "Umuyaga ntuzaba mwinshi",
    light_breeze: "umuyaga muke",
    moderate_breeze: "umuyaga uri hagati",
    strong_breeze: "umuyaga mwinshi",
    very_strong: "umuyaga ukaze",
  },
} as const

const DIR = {
  en: {
    north: "the north",
    northeast: "the northeast",
    east: "the east",
    southeast: "the southeast",
    south: "the south",
    southwest: "the southwest",
    west: "the west",
    northwest: "the northwest",
  },
  rw: {
    north: "majyaruguru",
    northeast: "majyaruguru n’iburasirazuba",
    east: "iburasirazuba",
    southeast: "amajyepfo n’iburasirazuba",
    south: "amajyepfo",
    southwest: "amajyepfo n’iburengerazuba",
    west: "iburengerazuba",
    northwest: "majyaruguru n’iburengerazuba",
  },
} as const

const WIND_KEYS: WindKey[] = ["calm", "light_breeze", "moderate_breeze", "strong_breeze", "very_strong"]
const SKY_KEYS: SkyKey[] = ["clear", "few_clouds", "partly_cloudy", "mostly_cloudy"]
const RAIN_KEYS: RainCat[] = ["no_rain", "trace", "light_rain", "moderate_rain", "heavy_rain", "very_heavy"]

const RW_WEEKDAYS = ["ku cyumweru", "ku wa mbere", "ku wa kabiri", "ku wa gatatu", "ku wa kane", "ku wa gatanu", "ku wa gatandatu"]
const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const asKey = (value?: string | null) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_")

export function rainKey(day: PlainDayInput): RainCat {
  const raw = asKey(day.rainCategory)
  if ((RAIN_KEYS as string[]).includes(raw)) return raw as RainCat
  return rainfallCategory(Number(day.rainAmount ?? day.rainfall ?? day.rain) || 0)
}

export function morningWord(min: number | null | undefined, lang: Locale) {
  const t = Number(min)
  if (!Number.isFinite(t)) return ""
  const en = t <= 10 ? "cold" : t <= 15 ? "cool" : t <= 18 ? "mild" : "warm"
  const rw = t <= 10 ? "haconje cyane" : t <= 15 ? "haconje" : t <= 18 ? "hifashe" : "hashyushye"
  return lang === "rw" ? rw : en
}

export function afternoonWord(max: number | null | undefined, lang: Locale) {
  const t = Number(max)
  if (!Number.isFinite(t)) return ""
  const en = t >= 30 ? "very hot" : t >= 26 ? "hot" : t >= 22 ? "warm" : t >= 18 ? "mild" : "cool"
  const rw = t >= 30 ? "hashyushye cyane" : t >= 26 ? "hashyushye" : t >= 22 ? "hashyushye gake" : t >= 18 ? "hifashe" : "haconje"
  return lang === "rw" ? rw : en
}

export function windKey(speedMs: number | null | undefined): WindKey {
  const s = Number(speedMs) || 0
  if (s < 2) return "calm"
  if (s < 4) return "light_breeze"
  if (s < 6) return "moderate_breeze"
  if (s < 9) return "strong_breeze"
  return "very_strong"
}

function resolveWindKey(day: PlainDayInput): WindKey | null {
  const raw = asKey(day.windStrength)
  if ((WIND_KEYS as string[]).includes(raw)) return raw as WindKey
  if (day.windSpeed == null && day.windStrength == null) return null
  return windKey(day.windSpeed)
}

function resolveDirKey(value?: string | null) {
  const raw = asKey(value)
  return (raw in DIR.en ? raw : "") as keyof typeof DIR.en | ""
}

function resolveSkyKey(day: PlainDayInput): SkyKey | null {
  const raw = asKey(day.cloudCategory)
  if ((SKY_KEYS as string[]).includes(raw)) return raw as SkyKey
  const pct = Number(day.clouds)
  if (Number.isFinite(pct)) {
    if (pct <= 0) return "clear"
    if (pct < 30) return "few_clouds"
    if (pct < 60) return "partly_cloudy"
    return "mostly_cloudy"
  }
  const cond = `${day.condition || ""} ${day.conditionMain || ""}`.toLowerCase()
  if (/\b(clear|sun)\b/.test(cond)) return "clear"
  if (/\b(cloud)/.test(cond)) return null
  return null
}

function skySentence(day: PlainDayInput, lang: Locale) {
  const key = resolveSkyKey(day)
  if (!key) return lang === "rw" ? "Hazaba ibicu." : "The sky will be cloudy."
  return SKY_SENTENCE[lang][key]
}

export function skyShort(day: PlainDayInput, lang: Locale) {
  const key = resolveSkyKey(day)
  if (!key) return lang === "rw" ? "Ibicu" : "Cloudy"
  return SKY_SHORT[lang][key]
}

function rainChanceExtra(category: RainCat, chance: number | null | undefined, lang: Locale) {
  if (category !== "no_rain") return ""
  const p = Number(chance) || 0
  if (p < 20) return ""
  if (p < 50) return lang === "rw" ? "Imvura ishoboka." : "Rain is possible."
  if (p < 70) return lang === "rw" ? "Imvura irashoboka." : "Rain is likely."
  return lang === "rw" ? "Imvura irashoboka cyane." : "Rain is very likely."
}

function soilSentence(humidity: number | null | undefined, rainChance: number | null | undefined, lang: Locale) {
  if (humidity == null && rainChance == null) return ""
  const h = Number(humidity) || 0
  const chance = Number(rainChance) || 0
  const wet = h > 80 || chance > 70
  const moist = h > 60 || chance > 30
  if (lang === "rw") {
    if (wet) return "Ubutaka buzaba bwishe."
    if (moist) return "Ubutaka buzaba bufite ubuhehere."
    return "Ubutaka buzaba bumye."
  }
  if (wet) return "The soil will be wet."
  if (moist) return "The soil will be moist."
  return "The soil will be dry."
}

function whenLabel(kind: WhenKind, date: Date, lang: Locale) {
  if (lang === "rw") {
    if (kind === "today") return "Uyu munsi"
    if (kind === "tomorrow") return "Ejo"
    return RW_WEEKDAYS[date.getDay()]
  }
  if (kind === "today") return "Today"
  if (kind === "tomorrow") return "Tomorrow"
  return `On ${EN_WEEKDAYS[date.getDay()]}`
}

export function whenKindOf(index: number): WhenKind {
  if (index === 0) return "today"
  if (index === 1) return "tomorrow"
  return "later"
}

export function isPlainAdvice(text?: string | null) {
  const s = (text || "").trim()
  if (!s) return false
  return !/(mm|°\s*c|km\/h|kmh)/i.test(s) && !/_/.test(s)
}

export function plainInputFrom(d: Day, loc?: DailyWeather | null): PlainDayInput {
  const extra = loc as (DailyWeather & { rainCategory?: string; cloudCategory?: string; clouds?: number }) | null | undefined
  const hourly = loc?.hourly
  const hourlyClouds = hourly?.length
    ? hourly.reduce((sum, h) => sum + (Number(h.clouds) || 0), 0) / hourly.length
    : undefined
  return {
    rainCategory: extra?.rainCategory ?? d.rainCategory,
    rainAmount: extra?.rainAmount ?? d.rainfall,
    rainfall: d.rainfall,
    rainChance: extra?.rainChance ?? d.rainChance,
    tempMin: extra?.tempMin ?? d.tempMin,
    tempMax: extra?.tempMax ?? d.tempMax,
    clouds: extra?.clouds ?? hourlyClouds ?? d.clouds,
    cloudCategory: extra?.cloudCategory ?? d.cloudCategory,
    windStrength: extra?.windStrength ?? d.windStrength,
    windSpeed: extra?.windSpeed ?? d.windSpeedMs,
    windDirection: extra?.windDirection ?? d.windDirection,
    humidity: extra?.humidity ?? d.humidity,
    condition: extra?.condition ?? d.condition,
    conditionMain: extra?.conditionMain,
  }
}

export function describeSelectedDay(day: PlainDayInput, lang: Locale, kind: WhenKind, date: Date) {
  const category = rainKey(day)
  const when = whenLabel(kind, date, lang)
  const rain = RAIN_SENTENCE[lang][category]
  const rainLine = lang === "rw" ? `${when} ${rain}.` : `${when}, ${rain}.`
  const chanceLine = rainChanceExtra(category, day.rainChance, lang)

  const morning = morningWord(day.tempMin, lang)
  const afternoon = afternoonWord(day.tempMax, lang)
  const tempLine = morning && afternoon
    ? lang === "rw"
      ? `Mu gitondo hazaba ${morning}, mu gicamunsi hazaba ${afternoon}.`
      : `The morning will be ${morning} and the afternoon will be ${afternoon}.`
    : ""

  const key = resolveWindKey(day)
  let windLine = ""
  if (key) {
    let phrase = WIND[lang][key]
    if (key !== "calm") {
      const dir = resolveDirKey(day.windDirection)
      const dirText = dir ? DIR[lang][dir] : ""
      windLine = lang === "rw"
        ? (dirText ? `Hazaba ${phrase} uva mu ${dirText}.` : `Hazaba ${phrase}.`)
        : (dirText ? `${phrase} will come from ${dirText}.` : `${phrase}.`)
    } else {
      windLine = `${phrase}.`
    }
  }

  const summary = [rainLine, chanceLine, skySentence(day, lang), tempLine, windLine, soilSentence(day.humidity, day.rainChance, lang)]
    .filter(Boolean)
    .join(" ")

  const rainShort = RAIN_SHORT[lang][category]
  const listLine = lang === "rw"
    ? `${when} · ${rainShort} · gitondo ${morning}, gicamunsi ${afternoon}`
    : `${when} · ${rainShort} · ${morning} morning, ${afternoon} afternoon`

  const headline = lang === "rw"
    ? `${skyShort(day, lang)} · gitondo ${morning}, gicamunsi ${afternoon}`
    : `${skyShort(day, lang)} · ${morning} morning, ${afternoon} afternoon`

  return { summary, listLine, headline, rainShort, morning, afternoon, sky: skyShort(day, lang) }
}

export function rainShortOf(day: PlainDayInput, lang: Locale) {
  return RAIN_SHORT[lang][rainKey(day)]
}
