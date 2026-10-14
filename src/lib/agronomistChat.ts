import knowledge from "@/data/agronomistChat.json"
import {
  SECTORS,
  amountCat,
  fieldCat,
  rainfallCategory,
  sectorDays,
  type Day,
  type SectorWeather,
} from "@/lib/weather"
import type { Locale } from "@/i18n"

export type ChatKind = "today" | "week" | "spray" | "heavy" | "seasons" | "static"
export type ChatTopic = {
  id: string
  kind: ChatKind
  chip?: boolean
  label: { en: string; rw: string }
  keywords: { en: string[]; rw: string[] }
  answer?: { en: string; rw: string }
}

export const CHAT_TOPICS = knowledge.topics as ChatTopic[]
export const CHAT_CHIPS = CHAT_TOPICS.filter((t) => t.chip)

const rainWord: Record<string, { en: string; rw: string }> = {
  no_rain: { en: "No rain", rw: "Ntamvura" },
  trace: { en: "Trace", rw: "Akayira" },
  light_rain: { en: "Light rain", rw: "Imvura nke" },
  moderate_rain: { en: "Moderate rain", rw: "Imvura iringaniye" },
  heavy_rain: { en: "Heavy rain", rw: "Imvura nyinshi" },
  very_heavy: { en: "Very heavy rain", rw: "Imvura nyinshi cyane" },
}

const fieldWord = {
  good: { en: "better for spraying or field work", rw: "byiza gufuka cyangwa gukora mu murima" },
  maybe: { en: "possible if you finish early", rw: "birashoboka niba urangiza kare" },
  avoid: { en: "poor for spraying — wait for a drier window", rw: "si byiza gufuka — tegereza umunsi wumye" },
}

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sectorInText(q: string): string | undefined {
  const n = fold(q)
  return SECTORS.find((s) => n.includes(fold(s)))
}

export function matchTopic(q: string): ChatTopic | undefined {
  const n = fold(q)
  if (!n) return undefined
  let best: { topic: ChatTopic; score: number } | undefined
  for (const topic of CHAT_TOPICS) {
    const kws = [...topic.keywords.en, ...topic.keywords.rw].map(fold).filter(Boolean)
    const score = kws.reduce((acc, kw) => acc + (n.includes(kw) ? Math.max(1, kw.split(" ").length) : 0), 0)
    if (score > 0 && (!best || score > best.score)) best = { topic, score }
  }
  return best?.topic
}

export function smallTalk(q: string, lang: Locale): string | undefined {
  const n = fold(q)
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|muraho|bite|mwaramutse|mwiriwe|mwiriweho)$/.test(n)) {
    return lang === "rw"
      ? "Muraho. Nshobora kugufasha ku mvura, gufuka, ibihembwe, cyangwa umurenge wa Musanze. Baza uko ushaka."
      : "Hello. I can help with rain, spraying, seasons, or a Musanze sector. Ask in your own words."
  }
  if (/^(thanks|thank you|ty|ok|okay|murakoze|murakoze cyane|yego)$/.test(n)) {
    return lang === "rw" ? "Ni byiza. Iyo ukeneye ikindi, mbaze." : "Glad to help. Ask another question whenever you like."
  }
  if (/^(how are you|how are u|whats up|what is up|amakuru|amakuru yawe)/.test(n)) {
    return lang === "rw"
      ? "Ni meza, murakoze. Ukeneye iki uyu munsi — imvura, gufuka, cyangwa igihembwe?"
      : "I’m well, thank you. What do you need today — rain, spraying, or the season?"
  }
  return undefined
}

export type WeatherSnap = { date: string; rainMm: number | null; chance: number; tMin: number; tMax: number }

export function snapshotFromSector(sw?: SectorWeather): WeatherSnap[] {
  return sectorDays(sw).map((x) => ({
    date: x.iso,
    rainMm: x.rainfall,
    chance: x.rainChance,
    tMin: x.tempMin,
    tMax: x.tempMax,
  }))
}

export function daysFromSnapshot(snap: WeatherSnap[] | undefined): Day[] {
  return (snap ?? []).map((b, index) => ({
    index,
    date: new Date(`${b.date}T12:00:00`),
    iso: b.date,
    condition: "clouds",
    tempMin: b.tMin,
    tempMax: b.tMax,
    rainfall: b.rainMm,
    rainChance: b.chance,
    humidity: null,
    windKmh: 0,
  }))
}

export function currentSeason(d = new Date()): "A" | "B" | "C" {
  const m = d.getMonth() + 1
  if (m >= 9 || m <= 2) return "A"
  if (m >= 3 && m <= 6) return "B"
  return "C"
}

export function nearestSector(lat: number, lon: number, rows: SectorWeather[]): string {
  let best = { name: "Musanze", d: Infinity }
  for (const s of rows) {
    if (s.lat == null || s.lon == null) continue
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2
    if (d < best.d) best = { name: s.sector, d }
  }
  return best.name
}

function rainLine(x: Day, lang: Locale) {
  const cat = x.rainCategory ?? (x.rainfall != null ? rainfallCategory(x.rainfall) : undefined)
  const word = cat ? rainWord[cat][lang] : lang === "rw" ? "ntabwo imvura yanditswe" : "rain not on this day"
  if (x.rainfall == null) return word
  const mm = Number.isInteger(x.rainfall) ? String(x.rainfall) : String(parseFloat(x.rainfall.toPrecision(12)))
  return `${mm} mm (${word})`
}

function daysOf(sw: SectorWeather | undefined): Day[] {
  return sectorDays(sw)
}

function missing(lang: Locale) {
  return lang === "rw"
    ? "Iteganyagihe ntiriboneka ubu. Kanda ku nsanganyamatsiko cyangwa gerageza nanone."
    : "The forecast is not available right now. Tap a topic or try again."
}

export function answerTopic(
  topic: ChatTopic,
  lang: Locale,
  opts: { sector: string; sw?: SectorWeather; days?: Day[] },
): string {
  const { sector, sw } = opts
  const days = opts.days?.length ? opts.days : daysOf(sw)
  const today = days[0]

  if (topic.kind === "static") {
    return topic.answer?.[lang] || topic.answer?.en || ""
  }

  if (topic.kind === "seasons") {
    const s = currentSeason()
    const name =
      s === "A"
        ? lang === "rw" ? "Igihembwe A (Nzeri–Gashyantare)" : "Season A (September–February)"
        : s === "B"
          ? lang === "rw" ? "Igihembwe B (Werurwe–Kamena)" : "Season B (March–June)"
          : lang === "rw" ? "Igihembwe C (Nyakanga–Kanama)" : "Season C (July–August)"
    const body =
      lang === "rw"
        ? `Ibihembwe by'ubuhinzi i Musanze:\n• A — Nzeri kugeza Gashyantare. Imvura nyamukuru. Ibigori, ibishyimbo, ibirayi mu misozi.\n• B — Werurwe kugeza Kamena. Imvura ya kabiri.\n• C — Nyakanga kugeza Kanama. Hahumye kurushaho; ibihingwa by'ibishanga n'amahira.\nUbu ni ${name}. Igihe cyo gutera gikurikiza iteganyagihe ry'umurenge n'ubutaka.`
        : `Crop seasons in Musanze:\n• A — September to February. Main rains. Maize, beans, potatoes in the highlands.\n• B — March to June. Second rains.\n• C — July to August. Drier; marshland crops and irrigation.\nIt is currently ${name}. Planting dates still follow the local forecast and the soil.`
    return body
  }

  if (!today) return missing(lang)

  if (topic.kind === "today") {
    const body =
      lang === "rw"
        ? `${sector}, uyu munsi: ${rainLine(today, lang)}, amahirwe y'imvura ${today.rainChance}%, hejuru ${today.tempMax}° / hasi ${today.tempMin}°. Amagambo y'imvura akurikiza ibyiciro bya Meteo Rwanda by'amasaha 24.`
        : `${sector}, today: ${rainLine(today, lang)}, rain chance ${today.rainChance}%, high ${today.tempMax}° / low ${today.tempMin}°. Rain words follow Meteo Rwanda 24-hour bands.`
    return body
  }

  if (topic.kind === "week") {
    const lines = days.slice(0, 8).map((x) => {
      const when = x.index === 0 ? (lang === "rw" ? "Uyu munsi" : "Today") : `${x.date.getDate()} ${x.date.toLocaleString("en", { month: "short" })}`
      return `• ${when}: ${rainLine(x, lang)} (${x.rainChance}%)`
    })
    const head = lang === "rw" ? `Imvura iteganyijwe i ${sector}:` : `Rain forecast for ${sector}:`
    return `${head}\n${lines.join("\n")}`
  }

  if (topic.kind === "spray") {
    const rows = days.slice(0, 3).map((x) => {
      const mm = x.rainfall ?? 0
      const cat = fieldCat(x.rainChance, mm)
      const when = x.index === 0 ? (lang === "rw" ? "Uyu munsi" : "Today") : `${x.date.getDate()} ${x.date.toLocaleString("en", { month: "short" })}`
      const extra = amountCat(mm) === "heavy" || amountCat(mm) === "moderate"
      const note = extra
        ? lang === "rw" ? "imvura iringaniye cyangwa nyinshi" : "moderate or heavy rain in the forecast"
        : fieldWord[cat][lang]
      return `• ${when}: ${note}`
    })
    const head =
      lang === "rw"
        ? `Gufuka / umurima i ${sector} (iminsi 3):`
        : `Spray / field work in ${sector} (next 3 days):`
    const tip =
      lang === "rw"
        ? "Imiti n'ifumbire ntibikoreshwa n'umuyaga mwinshi cyangwa imvura iri hafi. Reba iteganyagihe ry'umurenge."
        : "Do not spray in strong wind or with rain close. Check the sector forecast."
    return `${head}\n${rows.join("\n")}\n${tip}`
  }

  if (topic.kind === "heavy") {
    const hits = days.filter((x) => {
      const mm = x.rainfall
      const cat = x.rainCategory ?? (mm != null ? rainfallCategory(mm) : undefined)
      return cat === "heavy_rain" || cat === "very_heavy" || (mm != null && mm >= 20)
    })
    if (!hits.length) {
      const body =
        lang === "rw"
          ? `Nta munsi ufite imvura nyinshi (mm 20+) mu iteganyagihe rya ${sector} riri hano.`
          : `No day in the ${sector} forecast here has heavy rain (20 mm+).`
      return body
    }
    const lines = hits.map((x) => `• ${x.index === 0 ? (lang === "rw" ? "Uyu munsi" : "Today") : `${x.date.getDate()} ${x.date.toLocaleString("en", { month: "short" })}`}: ${rainLine(x, lang)}`)
    const head =
      lang === "rw"
        ? `Iminsi ifite imvura nyinshi i ${sector}:`
        : `Heavy-rain days in ${sector}:`
    const tip =
      lang === "rw"
        ? "Kurinda isuri n'inkangu: ntutere ku nkomo, reba imigende y'amazi."
        : "Watch erosion and runoff: avoid planting on bare slopes; check drainage."
    return `${head}\n${lines.join("\n")}\n${tip}`
  }

  return missing(lang)
}

export function topicById(id: string) {
  return CHAT_TOPICS.find((t) => t.id === id)
}

export type ChatDoc = { name: string; text: string }

export function searchDocs(q: string, docs: ChatDoc[], limit = 2): ChatDoc[] {
  const words = fold(q).split(" ").filter((w) => w.length > 2)
  if (!words.length || !docs.length) return []
  return docs
    .filter((d) => !/voice-and-role|readme/i.test(d.name))
    .map((d) => {
      const hay = fold(`${d.name} ${d.text}`)
      const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0)
      return { d, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.d)
}

function formatDocClip(text: string, max = 900) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max)
}

export function replyWithoutAi(
  q: string,
  lang: Locale,
  opts: { sector: string; weather?: WeatherSnap[]; docs?: ChatDoc[] },
): string {
  const talk = smallTalk(q, lang)
  if (talk) return talk
  const topic = matchTopic(q)
  if (topic) {
    return answerTopic(topic, lang, { sector: opts.sector, days: daysFromSnapshot(opts.weather) })
  }
  const hits = searchDocs(q, opts.docs ?? [])
  if (hits[0]) return formatDocClip(hits[0].text)
  return lang === "rw"
    ? "Sinabyumvise neza. Gerageza: «imvura y'uyu munsi», «gufuka», «igihembwe», cyangwa izina ry'umurenge."
    : "I didn’t quite catch that. Try “rain today”, “can we spray”, “what season is this”, or a sector name."
}
