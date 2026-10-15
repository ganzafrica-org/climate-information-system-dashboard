import { SECTORS } from "@/lib/weather";

/** Value sent to the API as districtName. */
export const MUSANZE_DISTRICT = "Musanze";
/** Location picker label — never the Musanze sector. */
export const MUSANZE_DISTRICT_LOCATION = "Musanze District";
export const AGRONOMIST_SECTORS = SECTORS;
export const WEATHER_PLACES = [MUSANZE_DISTRICT_LOCATION, ...SECTORS] as const;

export type AssignmentLevel = "district" | "sector";

export type UserAssignment = {
  role?: string;
  assignmentLevel?: AssignmentLevel | null;
  sectorName?: string | null;
  districtName?: string | null;
};

export function isSectorAgronomist(user?: UserAssignment | null): boolean {
  return (
    user?.role === "agronomist" &&
    user?.assignmentLevel === "sector" &&
    Boolean(user.sectorName)
  );
}

export function canManageFarmers(user?: { role?: string } | null): boolean {
  return user?.role === "admin" || user?.role === "agronomist";
}

export function canImportFarmers(user?: UserAssignment | null): boolean {
  return !isSectorAgronomist(user);
}

export function isDistrictLocationName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  // Exact "Musanze" is the sector — never treat it as the district.
  if (n === "musanze") return false;
  return (
    n === "musanze district" ||
    n === "akarere ka musanze" ||
    (n.includes("musanze") && n.includes("district")) ||
    (n.includes("musanze") && n.includes("akarere"))
  );
}

export function isDistrictLocation(location?: { name?: string; type?: string } | null): boolean {
  if (!location) return false;
  if (isDistrictLocationName(location.name)) return true;
  const type = location.type?.trim().toLowerCase();
  return type === "district" || type === "akarere";
}

/** Label shown in pickers. Keeps Musanze District distinct from Musanze sector. */
export function locationDisplayName(location: { name: string; type?: string }): string {
  if (isDistrictLocation(location)) return MUSANZE_DISTRICT_LOCATION;
  return location.name;
}

export function defaultLocationName(user?: UserAssignment | null): string {
  if (isSectorAgronomist(user) && user?.sectorName) return user.sectorName;
  return MUSANZE_DISTRICT_LOCATION;
}

export function pickDefaultLocation<T extends { name: string; type?: string }>(
  user: UserAssignment | null | undefined,
  locations: T[]
): T | undefined {
  if (!locations.length) return undefined;
  if (isSectorAgronomist(user) && user?.sectorName) {
    return locations.find((location) => location.name === user.sectorName) ?? locations[0];
  }
  return locations.find((location) => isDistrictLocation(location)) ?? locations[0];
}

export function sortLocationsDistrictFirst<T extends { name: string; type?: string }>(locations: T[]): T[] {
  return [...locations].sort((a, b) => {
    const aDistrict = isDistrictLocation(a) ? 0 : 1;
    const bDistrict = isDistrictLocation(b) ? 0 : 1;
    if (aDistrict !== bDistrict) return aDistrict - bDistrict;
    return locationDisplayName(a).localeCompare(locationDisplayName(b));
  });
}

export function farmerLocationsForUser<T extends { name: string; type?: string }>(
  user: UserAssignment | null | undefined,
  locations: T[]
): T[] {
  if (isSectorAgronomist(user) && user?.sectorName) {
    return locations.filter((location) => location.name === user.sectorName);
  }
  return sortLocationsDistrictFirst(locations);
}

export function assignmentPayload(
  role: string,
  assignmentLevel?: AssignmentLevel | "" | null,
  sectorName?: string | null
): Record<string, string> {
  if (role !== "agronomist") return {};
  if (assignmentLevel === "district") {
    return { assignmentLevel: "district", districtName: MUSANZE_DISTRICT };
  }
  if (assignmentLevel === "sector" && sectorName) {
    return {
      assignmentLevel: "sector",
      sectorName,
      districtName: MUSANZE_DISTRICT,
    };
  }
  return {};
}

export function formatCoverage(user: UserAssignment): string {
  if (user.role !== "agronomist") return "—";
  if (user.assignmentLevel === "district") {
    return MUSANZE_DISTRICT_LOCATION;
  }
  if (user.assignmentLevel === "sector") {
    return user.sectorName || "Sector";
  }
  return "Not set";
}

export function validateAgronomistAssignment(
  role: string,
  assignmentLevel?: AssignmentLevel | "" | null,
  sectorName?: string | null
): string | null {
  if (role !== "agronomist") return null;
  if (assignmentLevel !== "district" && assignmentLevel !== "sector") {
    return "Choose whether this agronomist covers the district or one sector.";
  }
  if (assignmentLevel === "sector") {
    if (!sectorName || !AGRONOMIST_SECTORS.includes(sectorName as (typeof AGRONOMIST_SECTORS)[number])) {
      return "Select a sector.";
    }
  }
  return null;
}
