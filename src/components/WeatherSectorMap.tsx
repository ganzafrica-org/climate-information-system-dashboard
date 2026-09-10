"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { readSector, type FeatureCollection } from "@/lib/soil"
import { metricColor, type WeatherMetric, type SectorWeather } from "@/lib/weather"

const MUSANZE_CENTER: [number, number] = [-1.4923, 29.6076]
const MUSANZE_ZOOM = 11

type Props = {
  sectors: FeatureCollection | null
  district: FeatureCollection | null
  valueBySector: Record<string, number | null>
  metric: WeatherMetric
  lo: number
  hi: number
  selectedSectors: Set<string>
  onSectorClick: (sector: string, clientX: number, clientY: number) => void
  showLabels?: boolean
}

function FitDistrict({ district }: { district: FeatureCollection | null }) {
  const map = useMap()
  useEffect(() => {
    if (!district) return
    try {
      map.fitBounds(L.geoJSON(district as any).getBounds(), { padding: [16, 16] })
    } catch {}
  }, [district, map])
  return null
}

export default function WeatherSectorMap({
  sectors, district, valueBySector, metric, lo, hi, selectedSectors, onSectorClick,
}: Props) {
  const layerRef = useRef<L.GeoJSON | null>(null)

  const styleFor = (sector: string): L.PathOptions => {
    const v = valueBySector[sector] ?? null
    const selected = selectedSectors.has(sector)
    return {
      fillColor: metricColor(metric, v, lo, hi),
      fillOpacity: 0.82,
      weight: selected ? 3 : 1,
      color: selected ? "#0f5f5f" : "#ffffff",
      opacity: 1,
    }
  }

  // restyle in place when data/selection changes (no remount)
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.eachLayer((l: any) => {
      const s = readSector(l.feature?.properties || {})
      l.setStyle(styleFor(s))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueBySector, metric, lo, hi, selectedSectors])

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
        attribution='&copy; OpenStreetMap, &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        opacity={0.85}
      />
      <FitDistrict district={district} />

      {sectors && (
        <GeoJSON
          key="wsectors"
          data={sectors as any}
          ref={layerRef as any}
          style={(f: any) => styleFor(readSector(f.properties)) as any}
          onEachFeature={(feature: any, layer: L.Layer) => {
            const sector = readSector(feature.properties)
            layer.on({
              click: (e: L.LeafletMouseEvent) => {
                const container = (e.target as any)._map.getContainer() as HTMLElement
                const rect = container.getBoundingClientRect()
                onSectorClick(sector, e.originalEvent.clientX - rect.left, e.originalEvent.clientY - rect.top)
              },
              mouseover: () => (layer as any).setStyle({ weight: 2.5, color: "#0f5f5f" }),
              mouseout: () => (layer as any).setStyle(styleFor(sector)),
            })
            layer.bindTooltip(sector, { sticky: true, opacity: 0.9 })
          }}
        />
      )}

      {district && (
        <GeoJSON
          key="wdistrict"
          data={district as any}
          style={{ fillColor: "transparent", weight: 2.5, color: "#1b2532", opacity: 0.9, fillOpacity: 0 } as L.PathOptions}
          interactive={false}
        />
      )}
    </MapContainer>
  )
}
