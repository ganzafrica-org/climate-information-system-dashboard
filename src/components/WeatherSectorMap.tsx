"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { readSector, type FeatureCollection } from "@/lib/soil"
import { escapeHtml } from "@/lib/weatherFormat"

// Compact sector map shared by the Forecast and Historical pages.
// Fills and labels come from the page; nothing is drawn on top of the map
// except Leaflet's own popup (legend and hints sit under the card).

const MUSANZE_CENTER: [number, number] = [-1.4923, 29.6076]

type Props = {
  sectors: FeatureCollection | null
  district: FeatureCollection | null
  fills: Record<string, string>
  labels?: Record<string, string>
  selected?: string | null
  /** Sectors outlined as "also compared" (dashed amber). */
  compare?: string[]
  onSelect?: (sector: string) => void
  /** HTML for the popup opened when a sector is clicked. Escape any text you put in it. */
  popupHtml?: (sector: string) => string
  /** Clicks on `[data-action][data-sector]` elements inside the popup. */
  onAction?: (action: string, sector: string) => void
  small?: boolean
}

export default function WeatherSectorMap(props: Props) {
  return (
    <MapContainer
      center={MUSANZE_CENTER}
      zoom={11}
      minZoom={9}
      maxZoom={16}
      zoomControl={false}
      scrollWheelZoom={false}
      zoomSnap={0.25}
      style={{ height: "100%", width: "100%", background: "#e9eef2" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        opacity={0.75}
      />
      <SectorLayers {...props} />
    </MapContainer>
  )
}

function SectorLayers({ sectors, district, fills, labels = {}, selected, compare = [], onSelect, popupHtml, onAction, small }: Props) {
  const map = useMap()
  const layers = useRef<Record<string, L.Path>>({})
  const markers = useRef<Record<string, L.Marker>>({})
  const sectorGroup = useRef<L.GeoJSON | null>(null)
  const popupSector = useRef<string | null>(null)
  const popup = useRef<L.Popup | null>(null)

  // Latest props for Leaflet event handlers registered once.
  const live = useRef({ fills, labels, selected, compare, onSelect, popupHtml, onAction, small })
  live.current = { fills, labels, selected, compare, onSelect, popupHtml, onAction, small }

  const styleFor = (s: string): L.PathOptions => {
    const p = live.current
    const sel = s === p.selected
    const cmp = p.compare.includes(s)
    return {
      fillColor: p.fills[s] || "#e2e8f0",
      fillOpacity: 0.85,
      weight: sel ? 3.2 : cmp ? 2.6 : 1,
      color: sel ? "#0b3f40" : cmp ? "#b45309" : "#ffffff",
      dashArray: cmp && !sel ? "5 4" : undefined,
      opacity: 1,
    }
  }

  const labelIcon = (s: string) => {
    const p = live.current
    const v = p.labels[s] || ""
    const sel = s === p.selected
    const small = p.small ?? map.getContainer().clientWidth < 520
    const halo = "text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff;"
    const html = `<div style="transform:translate(-50%,-50%);white-space:nowrap;text-align:center;line-height:1.15;pointer-events:none;${halo}">
      <div style="font-size:${small ? 10 : 12}px;font-weight:${sel ? 700 : 600};color:#142024;">${escapeHtml(s)}</div>
      ${v ? `<div style="font-size:${small ? 9.5 : 11.5}px;font-weight:500;color:#2b3d42;font-variant-numeric:tabular-nums;">${escapeHtml(v)}</div>` : ""}</div>`
    return L.divIcon({ className: "", iconSize: [0, 0], html })
  }

  // Build layers once the geometry is loaded.
  useEffect(() => {
    if (!sectors) return
    const group = L.geoJSON(sectors as any, {
      style: (f: any) => styleFor(readSector(f.properties)),
      onEachFeature: (f: any, layer: L.Layer) => {
        const s = readSector(f.properties)
        const path = layer as L.Path
        layers.current[s] = path
        path.on("click", (e: L.LeafletMouseEvent) => {
          live.current.onSelect?.(s)
          const html = live.current.popupHtml?.(s)
          if (!html) return
          popupSector.current = s
          popup.current = L.popup({ maxWidth: 260, minWidth: 200, autoPanPadding: [12, 12] }).setLatLng(e.latlng).setContent(html).openOn(map)
        })
        path.on("mouseover", () => path.setStyle({ weight: 2.6, color: "#0f5f5f" }))
        path.on("mouseout", () => path.setStyle(styleFor(s)))
      },
    }).addTo(map)
    sectorGroup.current = group

    Object.entries(layers.current).forEach(([s, l]) => {
      const center = (l as any).getBounds().getCenter()
      markers.current[s] = L.marker(center, { interactive: false, keyboard: false, icon: labelIcon(s) }).addTo(map)
    })

    const outline = district
      ? L.geoJSON(district as any, { style: { fill: false, weight: 2.4, color: "#1b2532", opacity: 0.9 }, interactive: false }).addTo(map)
      : null

    const fit = () => {
      map.invalidateSize()
      try { map.fitBounds(group.getBounds(), { padding: [10, 10] }) } catch {}
    }
    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(map.getContainer())

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-action]")
      if (!el) return
      live.current.onAction?.(el.getAttribute("data-action") || "", el.getAttribute("data-sector") || "")
      map.closePopup()
    }
    const container = map.getContainer()
    container.addEventListener("click", onClick)

    return () => {
      ro.disconnect()
      container.removeEventListener("click", onClick)
      group.remove()
      outline?.remove()
      Object.values(markers.current).forEach((m) => m.remove())
      layers.current = {}
      markers.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectors, district, map])

  // Restyle in place when fills, labels or selection change.
  useEffect(() => {
    Object.entries(layers.current).forEach(([s, l]) => {
      l.setStyle(styleFor(s))
      if (s === selected) l.bringToFront()
    })
    Object.entries(markers.current).forEach(([s, m]) => m.setIcon(labelIcon(s)))
    if (popup.current && map.hasLayer(popup.current) && popupSector.current && popupHtml) {
      popup.current.setContent(popupHtml(popupSector.current))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fills, labels, selected, compare.join(","), small, popupHtml])

  return null
}
