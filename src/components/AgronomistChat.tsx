import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import { MessageCircle, Send, X, MapPin } from "lucide-react"
import { useLanguage, type Locale } from "@/i18n"
import { useSectorWeather, type SectorWeather } from "@/lib/weather"
import {
  CHAT_CHIPS,
  nearestSector,
  sectorInText,
  snapshotFromSector,
  topicById,
} from "@/lib/agronomistChat"
import { useAuth } from "@/hooks/useAuth"
import { WEATHER_PLACES, defaultLocationName, isDistrictLocationName } from "@/lib/assignment"

type Msg = { id: number; role: "bot" | "user"; text: string }

let msgSeq = 0
const nextId = () => ++msgSeq

export function AgronomistChat() {
  const { t, locale } = useLanguage()
  const lang = locale as Locale
  const router = useRouter()
  const weatherQ = useSectorWeather()
  const sectors = weatherQ.data?.sectors ?? []

  const { user } = useAuth()
  const qSector = typeof router.query.sector === "string" ? router.query.sector : ""
  const defaultSector = (WEATHER_PLACES as readonly string[]).includes(qSector) ? qSector : defaultLocationName(user)

  const [open, setOpen] = useState(false)
  const [sector, setSector] = useState(defaultSector)
  const [input, setInput] = useState("")
  const [gpsBusy, setGpsBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSector(defaultSector)
  }, [defaultSector])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [msgs, open, busy])

  const sw: SectorWeather | undefined = useMemo(
    () =>
      sectors.find((s) => s.sector === sector)
      ?? (isDistrictLocationName(sector) ? sectors.find((s) => isDistrictLocationName(s.sector)) : undefined)
      ?? sectors[0],
    [sectors, sector],
  )

  const welcome = () => {
    setMsgs([{ id: nextId(), role: "bot", text: t("chat.welcome", { s: sector }) }])
  }

  const openChat = () => {
    setOpen(true)
    setMsgs((cur) => (cur.length ? cur : [{ id: nextId(), role: "bot", text: t("chat.welcome", { s: sector }) }]))
  }

  const ask = async (raw: string, place = sector) => {
    const q = raw.trim()
    if (!q || busy) return
    const named = sectorInText(q)
    const used = named || place
    if (named && named !== sector) setSector(named)
    const history = [...msgs, { id: 0, role: "user" as const, text: q }].slice(-8).map(({ role, text }) => ({ role, text }))
    setMsgs((cur) => [...cur, { id: nextId(), role: "user", text: q }])
    setBusy(true)
    try {
      const row = sectors.find((s) => s.sector === used) ?? sw
      const res = await fetch("/api/agronomist-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          locale: lang,
          sector: used,
          weather: snapshotFromSector(row),
          history,
        }),
      })
      const data = (await res.json()) as { reply?: string }
      setMsgs((cur) => [...cur, { id: nextId(), role: "bot", text: data.reply || t("chat.fallback") }])
    } catch {
      setMsgs((cur) => [...cur, { id: nextId(), role: "bot", text: t("chat.fallback") }])
    } finally {
      setBusy(false)
    }
  }

  const pickTopic = (id: string) => {
    const topic = topicById(id)
    if (!topic) return
    void ask(topic.label[lang])
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = input
    setInput("")
    void ask(q)
  }

  const useGps = () => {
    if (!navigator.geolocation) {
      setMsgs((cur) => [...cur, { id: nextId(), role: "bot", text: t("chat.noGps") }])
      return
    }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const name = nearestSector(pos.coords.latitude, pos.coords.longitude, sectors)
        setSector(name)
        setGpsBusy(false)
        void ask(t("chat.todayAsk"), name)
      },
      () => {
        setGpsBusy(false)
        setMsgs((cur) => [...cur, { id: nextId(), role: "bot", text: t("chat.gpsDenied") }])
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
      {open && (
        <section
          className="pointer-events-auto flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
          role="dialog"
          aria-label={t("chat.title")}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 bg-[#147677] px-3.5 py-3 text-white">
            <div className="min-w-0 text-[15px] font-bold leading-tight">{t("chat.title")}</div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-white/90 hover:bg-white/10" aria-label={t("chat.close")}>
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scroller} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#f7faf9] px-3 py-3">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "rounded-br-md bg-[#147677] text-white" : "rounded-bl-md border border-gray-200 bg-white text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-[13px] text-slate-500">
                  <span className="inline-flex items-center gap-[3px]" aria-hidden>
                    <span className="animate-chat-dot h-1.5 w-1.5 rounded-full bg-[#147677]" />
                    <span className="animate-chat-dot h-1.5 w-1.5 rounded-full bg-[#147677]" style={{ animationDelay: "0.15s" }} />
                    <span className="animate-chat-dot h-1.5 w-1.5 rounded-full bg-[#147677]" style={{ animationDelay: "0.3s" }} />
                  </span>
                  {t("chat.thinking")}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-gray-200 bg-white p-2.5">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CHAT_CHIPS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  disabled={busy}
                  onClick={() => pickTopic(topic.id)}
                  className="rounded-full border border-[#cfe3e3] bg-[#f7faf9] px-2.5 py-1 text-[11px] font-semibold text-[#0f5f60] hover:bg-[#eef6f6] disabled:opacity-50"
                >
                  {topic.label[lang]}
                </button>
              ))}
            </div>
            <div className="mb-2 flex gap-1.5">
              <button
                type="button"
                onClick={useGps}
                disabled={gpsBusy || weatherQ.isLoading || busy}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <MapPin className="h-3 w-3 text-[#147677]" />
                {gpsBusy ? t("chat.locating") : t("chat.useLocation")}
              </button>
              <button type="button" onClick={welcome} className="text-[11px] font-semibold text-[#147677] hover:underline">
                {t("chat.reset")}
              </button>
            </div>
            <div className="flex items-end gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder")}
                disabled={busy}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] outline-none focus:border-[#147677] disabled:opacity-60"
              />
              <button type="submit" disabled={busy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#147677] text-white hover:bg-[#0f5f60] disabled:opacity-50" aria-label={t("chat.send")}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openChat())}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#147677] text-white shadow-[0_8px_24px_rgba(20,118,119,0.45)] hover:bg-[#0f5f60]"
        aria-expanded={open}
        aria-label={open ? t("chat.close") : t("chat.open")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  )
}
