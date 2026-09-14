// Shared soil-suitability / susceptibility data model + helpers for the Musanze
// analysis. Ground truth from public/suitability-vs-susceptability/:
// - suitability layers: props Suitability_Class, Sector, Area_ha (Maize: Area)
// - susceptibility layers: props Susceptibility_Class, Sector, Area_ha
//   (class strings have trailing spaces + "Moderate" vs "Moderately" variants)
// - Sectors.geojson: 15 sectors, key `Sector`
// - Restricted_Areas.geojson: key `NAME`

export type Mode = "suitability" | "risk" | "combined";

export const CROPS = [
  { value: "beans", label: "Beans", file: "Beans_Suitability_Layer.geojson" },
  { value: "irish_potatoes", label: "Irish Potatoes", file: "Irish_Potatoes_Suitability_Layer.geojson" },
  { value: "maize", label: "Maize", file: "Maize_Suitability_Layer.geojson" },
] as const;

export const HAZARDS = [
  { value: "flooding", label: "Flooding", file: "Rev_Flooding__Susceptibility.geojson" },
  { value: "landslide", label: "Landslide", file: "Rev_Landslide__Susceptibility.geojson" },
  { value: "soil_erosion", label: "Soil Erosion", file: "Rev_SoilErosion__Susceptibility.geojson" },
] as const;

export type CropValue = (typeof CROPS)[number]["value"];
export type HazardValue = (typeof HAZARDS)[number]["value"];

// Canonical suitability classes (ordered best -> worst) + colors (per mapping_guidance.md)
export const SUITABILITY_CLASSES = [
  "Very Suitable",
  "Suitable",
  "Moderate Suitable",
  "Less Suitable",
  "Not Suitable",
] as const;

export const SUITABILITY_COLORS: Record<string, string> = {
  "Very Suitable": "#38A800",
  Suitable: "#98E600",
  "Moderate Suitable": "#E9FFBE",
  "Less Suitable": "#FFEBAF",
  "Not Suitable": "#FF5500",
};

export const SUSCEPTIBILITY_CLASSES = [
  "Extremely Susceptible",
  "Highly Susceptible",
  "Moderately Susceptible",
  "Slightly Susceptible",
] as const;

export const SUSCEPTIBILITY_COLORS: Record<string, string> = {
  "Extremely Susceptible": "#A80000",
  "Highly Susceptible": "#FF5500",
  "Moderately Susceptible": "#F5CA7A",
  "Slightly Susceptible": "#E1E1E1",
};

// The 15 Musanze sectors (from Sectors.geojson)
export const SECTORS = [
  "Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi",
  "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro",
];

/** Normalize a susceptibility class string: trim + unify "Moderate"->"Moderately". */
export function normalizeSusceptibilityClass(raw: string | undefined | null): string {
  if (!raw) return "";
  let c = raw.trim();
  if (c === "Moderate Susceptible") c = "Moderately Susceptible";
  return c;
}

/** Read Area_ha, falling back to `Area` (Maize layer uses `Area`). */
export function readArea(props: Record<string, any>): number {
  const v = props.Area_ha ?? props.Area ?? 0;
  return typeof v === "number" ? v : Number(v) || 0;
}

/** Read the sector for a feature (suitability/susceptibility layers use `Sector`). */
export function readSector(props: Record<string, any>): string {
  return props.Sector ?? props.SECTOR ?? props.sector ?? "";
}

export function suitabilityColor(cls: string | undefined): string {
  return (cls && SUITABILITY_COLORS[cls]) || "#CCCCCC";
}

export function susceptibilityColor(cls: string | undefined): string {
  const c = normalizeSusceptibilityClass(cls);
  return (c && SUSCEPTIBILITY_COLORS[c]) || "#CCCCCC";
}

export type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; properties: Record<string, any>; geometry: any }>;
};

/** Filter a collection to the selected sectors (empty set = all). */
export function filterBySectors(fc: FeatureCollection | null, sectors: Set<string>): FeatureCollection | null {
  if (!fc) return null;
  if (sectors.size === 0) return fc;
  return {
    ...fc,
    features: fc.features.filter((f) => sectors.has(readSector(f.properties))),
  };
}

/** Aggregate area (ha) by class for a suitability/susceptibility collection. */
export function areaByClass(
  fc: FeatureCollection | null,
  kind: "suitability" | "susceptibility"
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!fc) return out;
  for (const f of fc.features) {
    const cls =
      kind === "suitability"
        ? f.properties.Suitability_Class
        : normalizeSusceptibilityClass(f.properties.Susceptibility_Class);
    if (!cls) continue;
    out[cls] = (out[cls] || 0) + readArea(f.properties);
  }
  return out;
}

/** Total "suitable" area (Very + Suitable + Moderate) per sector, for ranking. */
export function suitableAreaBySector(fc: FeatureCollection | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!fc) return out;
  const good = new Set(["Very Suitable", "Suitable", "Moderate Suitable"]);
  for (const f of fc.features) {
    if (!good.has(f.properties.Suitability_Class)) continue;
    const s = readSector(f.properties);
    if (!s) continue;
    out[s] = (out[s] || 0) + readArea(f.properties);
  }
  return out;
}
