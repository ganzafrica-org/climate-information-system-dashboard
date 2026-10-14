import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { ArrowLeft, Cloud, CloudRain, Clock, ListChecks, MessageSquareText } from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"
import { useLanguage } from "@/i18n"

type RainRow = { when: string; en: string; rw: string }
type Scale = { title: string; text: string }

const RAIN_ROWS: RainRow[] = [
  { when: "0 mm", en: "No rain", rw: "Ntamvura" },
  { when: "> 0 mm and < 1 mm", en: "Trace", rw: "Akayira" },
  { when: "1 mm to under 5 mm", en: "Light rain", rw: "Imvura nke" },
  { when: "5 mm to under 20 mm", en: "Moderate rain", rw: "Imvura iringaniye" },
  { when: "20 mm to 50 mm", en: "Heavy rain", rw: "Imvura nyinshi" },
  { when: "More than 50 mm", en: "Very heavy rain", rw: "Imvura nyinshi cyane" },
]

const CLOUD_ROWS: RainRow[] = [
  { when: "0% to under 30%", en: "Few clouds", rw: "Ibicu bike" },
  { when: "30% to under 60%", en: "Partly cloudy", rw: "Ibicu biringaniye" },
  { when: "60% to 100%", en: "Mostly cloudy", rw: "Ibicu byinshi" },
]

const RULE_ROWS: RainRow[] = [
  { when: "Temperature", en: "Cool, mild, warm, or hot", rw: "Haconje, hifashe, hashyushye gake, cyangwa hashyushye" },
  { when: "Rainfall", en: "Dry, possible light rain, rain expected, or heavy rain expected", rw: "Ntamvura, imvura nke ishoboka, imvura iteganijwe, cyangwa imvura nyinshi iteganijwe" },
  { when: "Wind", en: "Calm, light winds, breezy, or strong winds", rw: "Ntawo, umuyaga muke, umuyaga, cyangwa umuyaga mwinshi" },
  { when: "Soil moisture", en: "Mention only when supported by soil observations or a validated estimate", rw: "Bivugwa gusa iyo hari ibipimo by'ubutaka cyangwa ikigereranyo cyemewe" },
  { when: "Farming advice", en: "Recommend an action only when the forecast and crop-specific guidance justify it", rw: "Tanga igikorwa gusa iyo iteganyagihe n'ubuyobozi bw'igihingwa bibyemera" },
]

const RULE_LABELS_RW: Record<string, string> = {
  Temperature: "Ubushyuhe",
  Rainfall: "Imvura",
  Wind: "Umuyaga",
  "Soil moisture": "Ubuhehere bw'ubutaka",
  "Farming advice": "Inama z'ubuhinzi",
}

const SCALES_EN: Scale[] = [
  { title: "Nowcasting", text: "Current weather from 1 minute to about 2 hours." },
  { title: "Short-range weather forecasting", text: "Weather from 3 hours up to 3 days." },
  { title: "Medium-range weather forecasting", text: "Weather from 3 days to less than 10 days." },
  { title: "Extended-range weather forecasting", text: "Usually averaged as a departure from climate values, for 10 days up to 30 days." },
  { title: "Monthly outlook", text: "Averaged weather for that month, shown as a departure from climate values." },
  { title: "Seasonal forecast", text: "Averaged weather for that 90-day period, shown as a departure from climate values." },
]

const SCALES_RW: Scale[] = [
  { title: "Iteganyagihe ry’ako kanya", text: "Ibisobanuro by’ikirere kiriho, kuva umunota 1 kugeza hafi amasaha 2." },
  { title: "Iteganyagihe rigufi", text: "Ibisobanuro by’ikirere kuva amasaha 3 kugeza iminsi 3." },
  { title: "Iteganyagihe riringaniye", text: "Iteganyagihe kuva iminsi 3 kugeza munsi y’iminsi 10." },
  { title: "Iteganyagihe rirerire", text: "Risanzwe ribarwa nk’itandukaniro n’ikirere gisanzwe, kuva iminsi 10 kugeza iminsi 30." },
  { title: "Iteganyagihe ry’ukwezi", text: "Ibisobanuro by’ikirere gisanzwe, bigaragazwa nk’itandukaniro n’ikirere gisanzwe cy’uko kwezi." },
  { title: "Iteganyagihe ry’igihembwe", text: "Ibisobanuro by’ikirere gisanzwe, bigaragazwa nk’itandukaniro n’ikirere gisanzwe cy’iminsi 90." },
]

function TwoColTable({
  leftLabel, rightLabel, rows,
}: { leftLabel: string; rightLabel: string; rows: { left: string; right: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-slate-600">
            <th className="py-2 pr-4 font-semibold">{leftLabel}</th>
            <th className="py-2 font-semibold">{rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.left} className="border-t border-slate-100">
              <td className="py-2.5 pr-4 text-slate-700">{r.left}</td>
              <td className="py-2.5 font-semibold text-slate-900">{r.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MessageGuide: NextPage = () => {
  const { t, locale } = useLanguage()
  const g = (key: string) => t(`msgGuide.${key}`)
  const isRw = locale === "rw"
  const scales = isRw ? SCALES_RW : SCALES_EN
  const word = (row: RainRow) => (isRw ? row.rw : row.en)
  const rainRows = RAIN_ROWS.map((r) => ({ left: r.when, right: word(r) }))
  const cloudRows = CLOUD_ROWS.map((r) => ({ left: r.when, right: word(r) }))
  const ruleRows = RULE_ROWS.map((r) => ({
    left: isRw ? (RULE_LABELS_RW[r.when] || r.when) : r.when,
    right: word(r),
  }))

  return (
    <AppLayout>
      <Head>
        <title>{`${g("title")} | ${t("training")}`}</title>
      </Head>
      <div className="w-full max-w-none space-y-4 text-sm text-[#171717]">
        <Link href="/training" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#147677] hover:underline">
          <ArrowLeft className="h-4 w-4" />{g("back")}
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-6">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,42%)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#147677]/10 text-[#147677]">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold tracking-tight text-[#147677] md:text-2xl">{g("title")}</h1>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{g("intro")}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{g("source")}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#d5e8e8] bg-[#eef6f6] px-3.5 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#147677]">{g("sourceNumbersLabel")}</div>
                    <div className="mt-0.5 text-[15px] font-semibold text-slate-900">OpenWeatherMap</div>
                  </div>
                  <div className="rounded-xl border border-[#d5e8e8] bg-[#eef6f6] px-3.5 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#147677]">{g("sourceWordsLabel")}</div>
                    <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Meteo Rwanda</div>
                    <div className="text-[13px] text-slate-600">{g("sourceWordsDetail")}</div>
                  </div>
                </div>
              </div>
            </div>
            <img
              src="/images/how_we_translate_weather_illustration.png"
              alt={g("title")}
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-6">
          <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold text-slate-900">
            <CloudRain className="h-[18px] w-[18px] text-[#2f6cbc]" />{g("rainTitle")}
          </h2>
          <p className="mb-4 text-[15px] leading-relaxed text-slate-600">{g("rainNote")}</p>
          <TwoColTable leftLabel={g("colWhen")} rightLabel={g("colHow")} rows={rainRows} />
          <p className="mt-4 rounded-[10px] bg-[#eef6f6] px-3.5 py-3 text-[15px] leading-relaxed text-[#12393a]">{g("rainExample")}</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-6">
          <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold text-slate-900">
            <Cloud className="h-[18px] w-[18px] text-[#8a97a3]" />{g("cloudTitle")}
          </h2>
          <p className="mb-4 text-[15px] leading-relaxed text-slate-600">{g("cloudNote")}</p>
          <TwoColTable leftLabel={g("colWhen")} rightLabel={g("colHow")} rows={cloudRows} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-6">
          <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold text-slate-900">
            <ListChecks className="h-[18px] w-[18px] text-[#147677]" />{g("rulesTitle")}
          </h2>
          <p className="mb-4 text-[15px] leading-relaxed text-slate-600">{g("rulesIntro")}</p>
          <TwoColTable leftLabel={g("colData")} rightLabel={g("colHow")} rows={ruleRows} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-6">
          <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold text-slate-900">
            <Clock className="h-[18px] w-[18px] text-[#147677]" />{g("scaleTitle")}
          </h2>
          <p className="mb-4 text-[15px] leading-relaxed text-slate-600">{g("scaleIntro")}</p>
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {scales.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-gray-200 px-4 py-3">
                <div className="text-[13px] font-semibold text-[#147677]">{i + 1}</div>
                <div className="mt-0.5 text-[15px] font-bold text-slate-900">{s.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppLayout>
  )
}

export default MessageGuide
