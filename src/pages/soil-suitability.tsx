import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { Map as MapIcon, Download, ChevronDown, Layers, X } from "lucide-react"
import { useLanguage } from "@/i18n"
import { AppLayout } from "@/components/layout/AppLayout"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { DataTable, type SortableColumn } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { SoilPopover } from "@/components/SoilSuitabilityMap"
import {
  CROPS, HAZARDS, SECTORS, SUITABILITY_CLASSES, SUSCEPTIBILITY_CLASSES,
  SUITABILITY_COLORS, SUSCEPTIBILITY_COLORS, type Mode, type FeatureCollection,
  filterBySectors, areaByClass, suitableAreaBySector, readArea, readSector,
  normalizeSusceptibilityClass,
} from "@/lib/soil"

const SoilMap = dynamic(() => import("@/components/SoilSuitabilityMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
})

async function loadGeo(file: string): Promise<FeatureCollection> {
  const res = await fetch(`/suitability-vs-susceptability/${file}`)
  if (!res.ok) throw new Error(`Failed to load ${file}`)
  return res.json()
}

function useGeo(file: string | null) {
  return useQuery({
    queryKey: ["soil-geo", file],
    queryFn: () => loadGeo(file as string),
    enabled: !!file,
    staleTime: 60 * 60 * 1000,
  })
}

export default function SoilSuitabilityPage() {
  const { t } = useLanguage()
  const [mode, setMode] = useState<Mode>("suitability")
  const [crops, setCrops] = useState<Set<string>>(new Set(["beans"]))
  const [hazard, setHazard] = useState<string>("flooding")
  const [sectors, setSectors] = useState<Set<string>>(new Set())
  const [overlays, setOverlays] = useState({ district: true, sectors: true, restricted: false })
  const [popover, setPopover] = useState<SoilPopover | null>(null)
  const [dockTab, setDockTab] = useState(0)
  const [dockOpen, setDockOpen] = useState(true)
  const [sectorMenuOpen, setSectorMenuOpen] = useState(false)

  // ---- data ----
  const districtQ = useGeo("Musanze_District_Boundary.geojson")
  const sectorsQ = useGeo("Sectors.geojson")
  const restrictedQ = useGeo("Restricted_Areas.geojson")

  // Load each selected crop layer (hooks must be stable → load all three, use selected)
  const beansQ = useGeo(CROPS[0].file)
  const potatoQ = useGeo(CROPS[1].file)
  const maizeQ = useGeo(CROPS[2].file)
  const cropData: Record<string, FeatureCollection | undefined> = {
    beans: beansQ.data, irish_potatoes: potatoQ.data, maize: maizeQ.data,
  }
  const hazardFile = HAZARDS.find((h) => h.value === hazard)?.file ?? null
  const hazardQ = useGeo(hazardFile)

  const showSuit = mode === "suitability" || mode === "combined"
  const showRisk = mode === "risk" || mode === "combined"

  // Merge selected crops into one suitability collection (for the map fill + stats).
  // When multiple crops are picked we keep the best (highest) class per parcel is
  // out of scope; we simply overlay — the map shows the union, tables show per-crop.
  const mergedSuitability = useMemo<FeatureCollection | null>(() => {
    if (!showSuit) return null
    const picked = Array.from(crops).map((c) => cropData[c]).filter(Boolean) as FeatureCollection[]
    if (picked.length === 0) return null
    const features = picked.flatMap((fc) => fc.features)
    return filterBySectors({ type: "FeatureCollection", features }, sectors)
  }, [crops, cropData, sectors, showSuit])

  const filteredRisk = useMemo<FeatureCollection | null>(() => {
    if (!showRisk) return null
    return filterBySectors(hazardQ.data ?? null, sectors)
  }, [hazardQ.data, sectors, showRisk])

  // legend + ranking (based on suitability of the FIRST selected crop for clarity)
  const primaryCrop = Array.from(crops)[0]
  const primarySuit = useMemo(
    () => filterBySectors(cropData[primaryCrop] ?? null, sectors),
    [cropData, primaryCrop, sectors]
  )
  const suitTotals = useMemo(() => areaByClass(mergedSuitability, "suitability"), [mergedSuitability])
  const riskTotals = useMemo(() => areaByClass(filteredRisk, "susceptibility"), [filteredRisk])
  const ranking = useMemo(() => {
    const bySector = suitableAreaBySector(primarySuit)
    return Object.entries(bySector).sort((a, b) => b[1] - a[1])
  }, [primarySuit])
  const rankMax = ranking.length ? ranking[0][1] : 1

  const isLoading =
    districtQ.isLoading || sectorsQ.isLoading ||
    (showSuit && (beansQ.isLoading || potatoQ.isLoading || maizeQ.isLoading)) ||
    (showRisk && hazardQ.isLoading)

  // ---- dock table: area by class (one column per selected crop) ----
  const selectedCropList = CROPS.filter((c) => crops.has(c.value))
  const classRows = (showRisk && mode === "risk" ? SUSCEPTIBILITY_CLASSES : SUITABILITY_CLASSES).map((cls) => ({ cls }))
  const areaTableColumns = useMemo<SortableColumn<{ cls: string }>[]>(() => {
    const colorMap = mode === "risk" ? SUSCEPTIBILITY_COLORS : SUITABILITY_COLORS
    const cols: SortableColumn<{ cls: string }>[] = [
      {
        id: "class", header: t("class") || "Class", value: (r) => r.cls,
        cell: (r) => (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colorMap[r.cls] || "#ccc" }} />
            {r.cls}
          </span>
        ),
      },
    ]
    if (mode === "risk") {
      cols.push({
        id: "area", header: `${t("area") || "Area"} (ha)`, numeric: true,
        value: (r) => Math.round(riskTotals[r.cls] || 0),
        cell: (r) => Math.round(riskTotals[r.cls] || 0).toLocaleString(),
      })
    } else {
      for (const c of selectedCropList) {
        const data = filterBySectors(cropData[c.value] ?? null, sectors)
        const totals = areaByClass(data, "suitability")
        cols.push({
          id: c.value, header: `${c.label} (ha)`, numeric: true,
          value: (r) => Math.round(totals[r.cls] || 0),
          cell: (r) => Math.round(totals[r.cls] || 0).toLocaleString(),
        })
      }
    }
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCropList.map((c) => c.value).join(","), sectors, cropData, riskTotals, t])

  const bySectorColumns = useMemo<SortableColumn<[string, number]>[]>(() => [
    { id: "sector", header: t("sector") || "Sector", value: (r) => r[0], cell: (r) => r[0] },
    { id: "area", header: `${t("suitable") || "Suitable"} (ha)`, numeric: true, value: (r) => Math.round(r[1]), cell: (r) => Math.round(r[1]).toLocaleString() },
  ], [t])

  const restrictedRows = restrictedQ.data?.features.map((f) => ({ name: f.properties?.NAME as string, area: readArea(f.properties) })) ?? []
  const restrictedColumns = useMemo<SortableColumn<{ name: string; area: number }>[]>(() => [
    { id: "name", header: t("name") || "Restricted area", value: (r) => r.name, cell: (r) => r.name },
    { id: "area", header: `${t("area") || "Area"} (ha)`, numeric: true, value: (r) => Math.round(r.area), cell: (r) => Math.round(r.area).toLocaleString() },
  ], [t])

  const toggleCrop = (v: string) => setCrops((prev) => {
    const n = new Set(prev)
    if (n.has(v)) { if (n.size > 1) n.delete(v) } else n.add(v)
    return n
  })
  const toggleSector = (s: string) => setSectors((prev) => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n
  })

  const handleExport = () => {
    const rows: any[] = []
    if (mode === "risk") {
      Object.entries(riskTotals).forEach(([cls, area]) => rows.push({ Metric: hazard, Class: cls, Area_ha: Math.round(area) }))
    } else {
      selectedCropList.forEach((c) => {
        const totals = areaByClass(filterBySectors(cropData[c.value] ?? null, sectors), "suitability")
        Object.entries(totals).forEach(([cls, area]) => rows.push({ Crop: c.label, Class: cls, Area_ha: Math.round(area) }))
      })
    }
    if (!rows.length) return
    const csv = [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url; a.download = `soil_${mode}_${Array.from(sectors).join("-") || "all"}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const legendClasses = mode === "risk" ? SUSCEPTIBILITY_CLASSES : SUITABILITY_CLASSES
  const legendColors = mode === "risk" ? SUSCEPTIBILITY_COLORS : SUITABILITY_COLORS
  const legendTotals = mode === "risk" ? riskTotals : suitTotals
  const legendShort: Record<string, string> = {
    "Very Suitable": "Very", "Suitable": "Suitable", "Moderate Suitable": "Moderate",
    "Less Suitable": "Less", "Not Suitable": "Not",
    "Extremely Susceptible": "Extreme", "Highly Susceptible": "High",
    "Moderately Susceptible": "Moderate", "Slightly Susceptible": "Slight",
  }

  const dockTabs = [t("areaByClass") || "Area by class", t("bySector") || "By sector", t("restricted") || "Restricted"]

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] px-5 py-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/15 p-2.5"><MapIcon className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold md:text-xl">{t("soilSuitabilityAnalysis") || "Soil Suitability & Risk · Musanze"}</h1>
              <p className="text-xs text-white/80">{t("soilAnalysisDescription") || "Crop suitability & hazard susceptibility across 15 sectors"}</p>
            </div>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20">
            <Download className="h-4 w-4" /> {t("exportData") || "Export CSV"}
          </button>
        </div>

        {/* One framed unit: left panel + map */}
        <div className="flex h-[640px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm max-lg:h-auto max-lg:flex-col">
          {/* LEFT PANEL */}
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-border p-4 max-lg:w-full max-lg:border-b max-lg:border-r-0">
            <Group label={t("analysis") || "Analysis"}>
              <SegmentedControl
                label="Analysis mode"
                value={mode}
                onValueChange={(v) => setMode(v as Mode)}
                className="w-full"
                options={[
                  { value: "suitability", label: t("suitability") || "Suitability" },
                  { value: "risk", label: t("risk") || "Risk" },
                  { value: "combined", label: t("combined") || "Combined" },
                ]}
              />
            </Group>

            {showSuit && (
              <Group label={t("crops") || "Crops"}>
                <div className="flex flex-wrap gap-2">
                  {CROPS.map((c) => {
                    const on = crops.has(c.value)
                    return (
                      <button key={c.value} onClick={() => toggleCrop(c.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-[#147677] bg-[#147677]/10 text-[#147677]" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                        <span className={`h-2 w-2 rounded-full ${on ? "bg-[#147677]" : "bg-muted-foreground/40"}`} />
                        {t(c.value === "irish_potatoes" ? "irishPotatoes" : c.value) || c.label}
                      </button>
                    )
                  })}
                </div>
              </Group>
            )}

            {showRisk && mode !== "combined" && (
              <Group label={t("hazardType") || "Hazard"}>
                <select value={hazard} onChange={(e) => setHazard(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  {HAZARDS.map((h) => <option key={h.value} value={h.value}>{t(h.value === "soil_erosion" ? "soilErosion" : h.value) || h.label}</option>)}
                </select>
              </Group>
            )}

            <Group label={t("sector") || "Sectors"} action={sectors.size > 0 ? { label: t("clear") || "Clear", onClick: () => setSectors(new Set()) } : undefined}>
              <div className="relative">
                <button onClick={() => setSectorMenuOpen((o) => !o)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm">
                  <span className="flex flex-wrap gap-1">
                    {sectors.size === 0 ? <span className="text-muted-foreground">{t("allSectors") || "All sectors"}</span>
                      : Array.from(sectors).slice(0, 2).map((s) => <span key={s} className="rounded bg-[#147677]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#147677]">{s}</span>)}
                    {sectors.size > 2 && <span className="rounded bg-[#147677]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#147677]">+{sectors.size - 2}</span>}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {sectorMenuOpen && (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {SECTORS.map((s) => (
                      <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        <input type="checkbox" className="accent-[#147677]" checked={sectors.has(s)} onChange={() => toggleSector(s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </Group>

            <Group label={`${t("sectorsRanked") || "Sectors ranked · suitable area"}`}>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
              ) : ranking.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noData") || "No data"}</p>
              ) : (
                <div className="max-h-[150px] space-y-0.5 overflow-y-auto">
                  {ranking.map(([s, area]) => (
                    <button key={s} onClick={() => toggleSector(s)} className={`grid w-full grid-cols-[64px_1fr_40px] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-[#147677]/5 ${sectors.has(s) ? "bg-[#147677]/5" : ""}`}>
                      <span className="truncate">{s}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[#147677]" style={{ width: `${Math.max(4, (area / rankMax) * 100)}%` }} /></span>
                      <span className="text-right tabular-nums text-muted-foreground">{Math.round(area / 1000)}k</span>
                    </button>
                  ))}
                </div>
              )}
              {sectors.size > 0 && <p className="mt-1.5 text-[11px] text-muted-foreground">{sectors.size} {t("selected") || "selected"} · {t("clearToRankAll") || "clear to rank all 15"}</p>}
            </Group>

            <Group label={t("overlays") || "Overlays"}>
              <div className="space-y-0.5">
                {([["district", t("districtBoundary") || "District boundary", ""], ["sectors", t("sector") || "Sectors", "15"], ["restricted", t("restrictedAreas") || "Restricted areas", "lakes, parks"]] as const).map(([key, label, hint]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted">
                    <input type="checkbox" className="accent-[#147677]" checked={overlays[key]} onChange={() => setOverlays((o) => ({ ...o, [key]: !o[key] }))} />
                    <span className="font-medium">{label}</span>
                    {hint && <span className="ml-auto text-[11px] text-muted-foreground">{hint}</span>}
                  </label>
                ))}
              </div>
            </Group>
          </aside>

          {/* MAP STAGE */}
          <div className="relative flex-1 max-lg:h-[62vh]">
            <SoilMap
              mode={mode}
              suitability={mergedSuitability}
              susceptibility={filteredRisk}
              sectors={sectorsQ.data ?? null}
              district={districtQ.data ?? null}
              restricted={restrictedQ.data ?? null}
              selectedSectors={sectors}
              onToggleSector={toggleSector}
              overlays={overlays}
              onFeaturePopover={setPopover}
            />

            {/* badge (top-left area, beside zoom which map hides — we add our own) */}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              {mode === "risk"
                ? <>{t(hazard === "soil_erosion" ? "soilErosion" : hazard)} · </>
                : <>{selectedCropList.map((c) => c.label).join(" + ")} · </>}
              <b className="text-foreground">{sectors.size === 0 ? (t("allSectors") || "all sectors") : `${sectors.size} ${t("sector") || "sectors"}`}</b>
            </div>

            {/* horizontal legend, top-right */}
            <div className="absolute right-3 top-3 z-[500] rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
              <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {(mode === "risk" ? (t("risk") || "Risk") : (t("suitability") || "Suitability"))} · {t("area") || "area"} (ha)
              </div>
              <div className="flex">
                {legendClasses.map((cls, i) => (
                  <div key={cls} className="w-[52px] text-center text-[9px]">
                    <div className="mb-1 truncate text-muted-foreground">{legendShort[cls] || cls}</div>
                    <div className="h-[7px]" style={{ backgroundColor: legendColors[cls], borderRadius: i === 0 ? "3px 0 0 3px" : i === legendClasses.length - 1 ? "0 3px 3px 0" : 0 }} />
                    <div className="mt-1 tabular-nums text-muted-foreground/80">{Math.round((legendTotals[cls] || 0) / 1000)}k</div>
                  </div>
                ))}
              </div>
            </div>

            {/* on-map popover */}
            {popover && (
              <div className="absolute z-[600] w-52 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover p-3 text-xs shadow-xl"
                style={{ left: popover.x, top: popover.y - 8 }}>
                <button onClick={() => setPopover(null)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                <h4 className="mb-1.5 text-sm font-semibold">{popover.sector}</h4>
                {popover.suitabilityClass && <span className="mb-1 mr-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: SUITABILITY_COLORS[popover.suitabilityClass] || "#888" }}>{popover.suitabilityClass}</span>}
                {popover.riskClass && <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: SUSCEPTIBILITY_COLORS[popover.riskClass] || "#888" }}>{popover.riskClass}</span>}
                <div className="mt-1 space-y-0.5 text-muted-foreground">
                  <div className="flex justify-between"><span>{t("area") || "Area"}</span><b className="tabular-nums text-foreground">{Math.round(popover.area).toLocaleString()} ha</b></div>
                  <div className="flex justify-between"><span>{t("sector") || "Sector"}</span><b className="text-foreground">{popover.sector}</b></div>
                </div>
              </div>
            )}

            {/* collapsible bottom dock */}
            <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-col overflow-hidden rounded-xl border border-border bg-card/97 shadow-[0_-2px_24px_rgba(20,40,60,0.16)] backdrop-blur" style={{ maxHeight: dockOpen ? "44%" : undefined }}>
              <div className="flex items-center gap-1 border-b border-border px-3">
                {dockTabs.map((label, i) => (
                  <button key={i} onClick={() => setDockTab(i)} className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${dockTab === i ? "border-[#147677] text-[#147677]" : "border-transparent text-muted-foreground"}`}>{label}</button>
                ))}
                <button onClick={() => setDockOpen((o) => !o)} className="ml-auto flex items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> {dockOpen ? (t("collapse") || "Collapse") : (t("expand") || "Expand")}
                </button>
              </div>
              {dockOpen && (
                <div className="overflow-auto p-3">
                  {dockTab === 0 && <DataTable label="Area by class" data={classRows} columns={areaTableColumns} getRowId={(r) => r.cls} loading={isLoading} skeletonRows={5} rowHeight={40} />}
                  {dockTab === 1 && <DataTable label="By sector" data={ranking} columns={bySectorColumns} getRowId={(r) => r[0]} loading={isLoading} skeletonRows={5} rowHeight={40} emptyState={t("noData") || "No data"} />}
                  {dockTab === 2 && <DataTable label="Restricted areas" data={restrictedRows} columns={restrictedColumns} getRowId={(r) => r.name} loading={restrictedQ.isLoading} skeletonRows={2} rowHeight={40} />}
                </div>
              )}
            </div>
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
