export interface Location {
    id: number;
    name: string;
    lat?: number;
    lon?: number;
    isDefault?: boolean;
    userId?: number;
    createdAt?: string;
    updatedAt?: string;
    user?: {
        id: number;
        username: string;
    };
    geocoded?: boolean;  // Indicates if location was auto-geocoded
}

export interface LocationValidation {
    providedName: string;
    suggestedName: string;
    exactMatch: boolean;
    partialMatch: boolean;
    note: string;
}

export interface CreateLocationResponse {
    location: Location;
    validation?: LocationValidation;  // Optional - only present when there's a mismatch
}

export interface Farmer {
    id: number;
    name: string;
    phone: string;
    locationIds: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    locationId?: number | null;
    locations: Location[];
}

export interface CreateFarmerData {
    name: string;
    phone: string;
    locationIds: number[];
    isActive: boolean;
}

export interface UpdateFarmerData {
    name?: string;
    phone?: string;
    locationIds?: number[];
    isActive?: boolean;
}

export interface ApiResponse<T> {
    status: string;
    data: T;
    message?: string;
}

export interface FarmersResponse {
    count: number;
    farmers: Farmer[];
}

export interface LocationsResponse {
    locations: Location[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        pages: number;
    };
}

export interface FarmersByLocationResponse {
    location: Location;
    count: number;
    farmers: Farmer[];
}

export interface FarmerFilters {
    locationId?: number;
    limit?: number;
    offset?: number;
    search?: string;
}

export interface LocationFilters {
    limit?: number;
    offset?: number;
    search?: string;
}