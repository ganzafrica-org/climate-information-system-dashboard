export interface WeatherLocation {
    id: number;
    name: string;
    coordinates: {
        lat: number;
        lon: number;
    };
}

export interface CurrentWeather {
    temp: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    uvIndex: number;
    windSpeed: number;
    windDirection: string;
    windStrength: string;
    condition: string;
    conditionMain: string;
    icon: string;
    timeOfDay: string;
}

export interface DailyWeather {
    date: string;
    formattedDate: string;
    dayOfWeek: string;
    isToday: boolean;
    tempMin: number;
    tempMax: number;
    humidity: number;
    uvIndex: number;
    rainChance: number;
    rainAmount: number;
    windSpeed: number;
    windDirection: string;
    windStrength: string;
    condition: string;
    conditionMain: string;
    icon: string;
    hasRain: boolean;
    hasStrongWind: boolean;
    hasExtremeTemp: boolean;
    soilCondition: string;
    extremeWeatherConditions: string[];
    farmingRecommendation: string;
    rainPrediction: {
        willRain: boolean;
        timing: string;
        confidence: string;
    };
    overview: string;
    message: string;
}

export interface WeatherAlert {
    id: number;
    type: string;
    createdAt: string;
    message?: string;
    severity?: string;
    title?: string;
    description?: string;
}

export interface WeatherData {
    location: WeatherLocation;
    weather: {
        current: CurrentWeather;
        daily: DailyWeather[];
        alerts: WeatherAlert[];
    };
    message: string;
    weatherOverview: string;
    alert: {
        id: number;
        type: string;
        createdAt: string;
    };
    weatherDataId: number;
    weatherDataStored: boolean;
    messageFormat: string;
    messageLength: number;
}

export interface HistoricalWeatherRecord {
    id: number;
    date: string;
    currentWeather: CurrentWeather;
    dailyForecast: DailyWeather[];
    weatherSummary: {
        temperature: {
            current: number;
            min: number;
            max: number;
            feelsLike: number;
        };
        conditions: {
            main: string;
            description: string;
            icon: string;
        };
        atmospheric: {
            humidity: number;
            pressure: number;
            uvIndex: number;
        };
        wind: {
            speed: number;
            direction: string;
            strength: string;
        };
        precipitation: {
            rainChance: number;
            rainAmount: number;
            hasRain: boolean;
        };
        farming: {
            soilCondition: string;
            farmingRecommendation: string;
            extremeConditions: string[];
        };
        metadata: {
            messageType: string;
            storedAt: string;
            hasOverview: boolean;
        };
    };
    messageType: string;
    messageGenerated: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface HistoricalWeatherResponse {
    location: WeatherLocation;
    records: HistoricalWeatherRecord[];
    aggregatedData: any;
    statistics: {
        locationId: number;
        locationName: string;
        totalRecords: number;
        dateRange: {
            start: string;
            end: string;
        };
        stats: {
            temperature: {
                average: number;
                min: number;
                max: number;
                samples: number;
            };
            humidity: {
                average: number;
                min: number;
                max: number;
                samples: number;
            };
            windSpeed: {
                average: number;
                min: number;
                max: number;
                samples: number;
            };
            rainChance: {
                average: number;
                samples: number;
            };
            conditions: Record<string, number>;
        };
    };
    pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        recordsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        nextPage: number | null;
        prevPage: number | null;
    };
    filters: {
        locationId: number;
        startDate: string;
        endDate: string;
        sortBy: string;
        sortOrder: string;
        groupBy: string | null;
    };
}

export interface WeatherAlertsResponse {
    count: number;
    messageFormat: string;
    alerts: WeatherAlert[];
}

export interface CoordinatesWeatherRequest {
    lat: number;
    lon: number;
    locationName: string;
    type: 'daily' | 'warning' | 'forecast';
}

export interface ApiResponse<T> {
    status: string;
    data: T;
    message?: string;
}

export interface HistoricalWeatherFilters {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'date' | 'locationId';
    sortOrder?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
    locationId?: number;
    groupBy?: 'day' | 'week' | 'month';
}

export interface WeatherRequestParams {
    type?: 'daily' | 'warning' | 'forecast';
}