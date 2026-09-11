"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import {
  type Mode,
  type FeatureCollection,
  suitabilityColor,
  susceptibilityColor,
  readSector,
  readArea,
  normalizeSusceptibilityClass,
} from "@/lib/soil"

// Musanze district center + a tight zoom that frames the district.
const MUSANZE_CENTER: [number, number] = [-1.4923, 29.6076]
const MUSANZE_ZOOM = 11

export type SoilPopover = {
  x: number
  y: number
  sector: string
  suitabilityClass?: string
  riskClass?: string
  area: number
  crop?: string
}

type Props = {
  mode: Mode
  suitability: FeatureCollection | null
  susceptibility: FeatureCollection | null
  sectors: FeatureCollection | null
  district: FeatureCollection | null
  restricted: FeatureCollection | null
  selectedSectors: Set<string>
  onToggleSector: (sector: string) => void
  overlays: { district: boolean; sectors: boolean; restricted: boolean }
  onFeaturePopover: (p: SoilPopover | null) => void
}

/** Fits the map to the district bounds once it is available. */
function FitDistrict({ district }: { district: FeatureCollection | null }) {
  const map = useMap()
  useEffect(() => {
    if (!district) return
    try {
      const layer = L.geoJSON(district as any)
      // Extra bottom padding so the district frames above the floating dock,
      // and a touch on the left where the panel sits.
      map.fitBounds(layer.getBounds(), {
        paddingTopLeft: [24, 24],
        paddingBottomRight: [24, 220],
      })
    } catch {
      /* keep default view */
    }
  }, [district, map])
  return null
}

export default function SoilSuitabilityMap({
  mode,
  suitability,
  susceptibility,
  sectors,
  district,
  restricted,
  selectedSectors,
  onToggleSector,
  overlays,
  onFeaturePopover,
}: Props) {
  // Bump this whenever the *data* (crop/hazard/mode/sector filter) changes so the
  // fill layers re-render with new styles. We DON'T key on selection alone — the
  // sector outline layer restyles imperatively via setStyle (no remount flicker).
  const suitKey = `suit-${mode}-${suitability?.features.length ?? 0}`
  const riskKey = `risk-${mode}-${susceptibility?.features.length ?? 0}`

  const showSuit = mode === "suitability" || mode === "combined"
  const showRisk = mode === "risk" || mode === "combined"

  const fillStyle = (color: string, opacity: number) => ({
    fillColor: color,
    weight: 0,
    opacity: 0,
    color: "transparent",
    fillOpacity: opacity,
  })

  // ---- sector outline layer: restyle in place, never remount ----
  const sectorLayerRef = useRef<L.GeoJSON | null>(null)
  const sectorStyle = (sector: string): L.PathOptions => {
    const active = selectedSectors.has(sector)
    return {
      fillColor: active ? "#147677" : "transparent",
      fillOpacity: active ? 0.12 : 0,
      weight: active ? 2.5 : 0.75,
      color: active ? "#0f5f5f" : "#334155",
      opacity: active ? 1 : 0.6,
    }
  }
  useEffect(() => {
    const layer = sectorLayerRef.current
    if (!layer) return
    layer.eachLayer((l: any) => {
      const s = readSector(l.feature?.properties || {})
      l.setStyle(sectorStyle(s))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectors])

  return (
    <MapContainer
      center={MUSANZE_CENTER}
      zoom={MUSANZE_ZOOM}
      minZoom={9}
      maxZoom={16}
      zoomControl={false}
      style={{ height: "100%", width: "100%", background: "#e9eef2" }}
    >
      <TileLayer
        attribution='Boundaries RLMUA/RNRA &middot; &copy; OpenStreetMap contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        opacity={0.9}
      />
      <FitDistrict district={district} />

      {/* Suitability fill */}
      {showSuit && suitability && (
        <GeoJSON
          key={suitKey}
          data={suitability as any}
          style={(f: any) => fillStyle(suitabilityColor(f.properties?.Suitability_Class), mode === "combined" ? 0.7 : 0.8)}
        />
      )}

      {/* Risk fill (hatched-feel via lower opacity when combined) */}
      {showRisk && susceptibility && (
        <GeoJSON
          key={riskKey}
          data={susceptibility as any}
          style={(f: any) => fillStyle(susceptibilityColor(f.properties?.Susceptibility_Class), mode === "combined" ? 0.45 : 0.75)}
        />
      )}

      {/* District boundary */}
      {overlays.district && district && (
        <GeoJSON
          key="district"
          data={district as any}
          style={{ fillColor: "transparent", weight: 2.5, color: "#1b2532", opacity: 0.9, fillOpacity: 0 } as L.PathOptions}
          interactive={false}
        />
      )}

      {/* Sectors: clickable, restyled imperatively */}
      {overlays.sectors && sectors && (
        <GeoJSON
          key="sectors"
          data={sectors as any}
          ref={sectorLayerRef as any}
          style={(f: any) => sectorStyle(readSector(f.properties)) as any}
          onEachFeature={(feature: any, layer: L.Layer) => {
            const sector = readSector(feature.properties)
            layer.on({
              click: (e: L.LeafletMouseEvent) => {
                onToggleSector(sector)
                // Build popover content from the fills under this sector
                const suitFeat = suitability?.features.find(
                  (x) => readSector(x.properties) === sector
                )
                const riskFeat = susceptibility?.features.find(
                  (x) => readSector(x.properties) === sector
                )
                const container = (e.target as any)._map.getContainer() as HTMLElement
                const rect = container.getBoundingClientRect()
                onFeaturePopover({
                  x: e.originalEvent.clientX - rect.left,
                  y: e.originalEvent.clientY - rect.top,
                  sector,
                  suitabilityClass: suitFeat?.properties?.Suitability_Class,
                  riskClass: riskFeat ? normalizeSusceptibilityClass(riskFeat.properties?.Susceptibility_Class) : undefined,
                  area: suitFeat ? readArea(suitFeat.properties) : riskFeat ? readArea(riskFeat.properties) : 0,
                })
              },
              mouseover: () => (layer as any).setStyle({ weight: 2.5, color: "#0f5f5f", opacity: 1 }),
              mouseout: () => (layer as any).setStyle(sectorStyle(sector)),
            })
          }}
        />
      )}

      {/* Restricted areas */}
      {overlays.restricted && restricted && (
        <GeoJSON
          key="restricted"
          data={restricted as any}
          style={{ fillColor: "#334155", weight: 1.5, color: "#1b2532", opacity: 0.8, fillOpacity: 0.18 } as L.PathOptions}
          onEachFeature={(feature: any, layer: L.Layer) => {
            const name = feature.properties?.NAME
            if (name) layer.bindTooltip(name, { sticky: true })
          }}
        />
      )}
    </MapContainer>
  )
}
