import type { NextApiRequest, NextApiResponse } from "next"
import { docsPrompt, loadChatResources } from "@/lib/chatResources"
import { replyWithoutAi, type WeatherSnap } from "@/lib/agronomistChat"
import type { Locale } from "@/i18n"

type Body = {
  message?: string
  locale?: Locale
  sector?: string
  weather?: WeatherSnap[]
  history?: { role: "bot" | "user"; text: string }[]
}

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"]

type GeminiPart = { text?: string; thought?: boolean }
type GeminiRes = {
  candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[]
}

function visibleText(json: GeminiRes) {
  return (json.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text || "")
    .join("")
    .trim()
}

async function geminiReply(apiKey: string, prompt: string): Promise<string | null> {
  const key = apiKey.trim()
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) continue
      const json = (await res.json()) as GeminiRes
      const text = visibleText(json)
      if (text) return text
    } catch {
      continue
    }
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const body = (req.body || {}) as Body
  const message = String(body.message || "").trim()
  const locale: Locale = body.locale === "rw" ? "rw" : "en"
  const sector = String(body.sector || "Musanze")
  if (!message) return res.status(400).json({ error: "Missing message" })

  const docs = loadChatResources()
  const weather = Array.isArray(body.weather) ? body.weather : []
  const history = (body.history || []).slice(-8)

  const fallback = () => replyWithoutAi(message, locale, { sector, weather, docs })

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim()
  if (!apiKey) return res.status(200).json({ reply: fallback(), source: "rules" })

  const langLine = locale === "rw" ? "Reply in Kinyarwanda." : "Reply in English."
  const hist = history.map((m) => `${m.role === "user" ? "User" : "Helper"}: ${m.text}`).join("\n")
  const wx = weather.length
    ? weather
        .slice(0, 16)
        .map((d) => `${d.date}: ${d.rainMm == null ? "rain not sent" : `${d.rainMm} mm`}, chance ${d.chance}%, ${d.tMin}–${d.tMax}°C`)
        .join("\n")
    : "No live forecast snapshot."

  const prompt = `You help agronomists in Musanze District, Rwanda, on Teganyamuhinzi.
${langLine}
Be a colleague: short, warm, clear. Use short paragraphs and line breaks. Answer the question first.
Always finish every sentence. Do not stop mid-thought. Keep the whole reply under 160 words.
LIVE numbers (mm, %, °C, wind) come from OpenWeatherMap via our backend. Never say Meteo Rwanda supplied those numbers.
Rain words such as light / moderate / heavy are labels we apply to OpenWeather millimetres.
Use ONLY millimetres from LIVE FORECAST below. Never invent rain amounts.
If data is missing, say so. Decision support only.
If the person greets you, greet back and offer help.

LIVE OPENWEATHER FORECAST for ${sector}:
${wx}

YOUR DOCUMENTS:
${docsPrompt(docs)}

RECENT CHAT:
${hist || "(start)"}

USER: ${message}`

  try {
    const reply = await geminiReply(apiKey, prompt)
    if (reply) return res.status(200).json({ reply, source: "gemini" })
  } catch {
    // fall through to rules
  }
  return res.status(200).json({ reply: fallback(), source: "rules" })
}
