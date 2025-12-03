'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/i18n';
import {
    CloudRain,
    MapPin,
    Droplets,
    Loader2,
    ChevronDown
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from "@/lib/api";
import { Location, LocationsResponse } from '@/types/farmer';
import { ApiResponse } from '@/types/weather';

declare global {

    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace L {
        function heatLayer(latlngs: Array<[number, number, number]>, options?: any): any;
    }
}

interface WeatherDataPoint {
    location: string;
    coordinates: [number, number];
    temperature: number;
    rainfall: number;
    humidity: number;
    wind: number;
    weatherCode: string;
    alerts: string[];
    intensity?: number;
}

interface RainfallHeatmapProps {
    className?: string;
}

const MapViewUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);

    return null;
};

const HeatmapController = ({ weatherData }: { weatherData: WeatherDataPoint[] }) => {
    const map = useMap();
    const [heatLayer, setHeatLayer] = useState<any>(null);

    useEffect(() => {

        // Load heat plugin in background without blocking
        const loadHeatPlugin = async () => {
            if (typeof window !== 'undefined' && !(window as any).L?.heatLayer) {
                try {
                    // Use dynamic import with lower priority
                    import('leaflet.heat').catch(() => {
                        // Silently fail - fallback visualization will be used
                    });
                } catch (error) {
                    // Silently fail - fallback visualization will be used
                }
            }
        };

        // Load plugin without blocking UI
        loadHeatPlugin();
    }, []);

    useEffect(() => {
        if (!map || !weatherData.length) return;

        if (heatLayer) {
            map.removeLayer(heatLayer);
        }

        if ((window as any).L?.heatLayer) {

            const heatData = weatherData.map(point => [
                point.coordinates[0],
                point.coordinates[1],
                Math.max(0.1, Math.min(point.rainfall / 100, 1))
            ] as [number, number, number]);

            const newHeatLayer = (window as any).L.heatLayer(heatData, {
                radius: 40,
                blur: 25,
                maxZoom: 18,
                max: 1.0,
                gradient: {
                    0.0: '#fbbf24',
                    0.2: '#f59e0b',
                    0.4: '#d97706',
                    0.6: '#b45309',
                    0.8: '#92400e',
                    1.0: '#78350f'
                }
            });

            newHeatLayer.addTo(map);
            setHeatLayer(newHeatLayer);
        } else {

            const fallbackLayer = L.layerGroup();

            weatherData.forEach(point => {
                const intensity = Math.max(0.1, Math.min(point.rainfall / 100, 1));
                const radius = Math.max(15, Math.min(35, point.rainfall / 3));


                const color = intensity >= 0.8 ? '#78350f' :
                    intensity >= 0.6 ? '#92400e' :
                        intensity >= 0.4 ? '#b45309' :
                            intensity >= 0.2 ? '#d97706' : '#f59e0b';

                const circle = L.circleMarker(point.coordinates, {
                    radius: radius,
                    fillColor: color,
                    color: 'white',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.6
                });

                circle.bindPopup(`
                    <div class="p-3 min-w-[200px]">
                        <h3 class="font-bold text-gray-900 mb-2">${point.location}</h3>
                        <div class="bg-blue-50 p-3 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium text-blue-800">💧 Rainfall</span>
                                <span class="text-lg font-bold text-blue-900">${point.rainfall}mm</span>
                            </div>
                            <div class="text-xs text-blue-700">${getRainfallIntensity(point.rainfall)}</div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            <div class="bg-red-50 p-2 rounded text-center">
                                <span class="text-xs font-medium text-red-700">🌡️ ${point.temperature}°C</span>
                            </div>
                            <div class="bg-gray-50 p-2 rounded text-center">
                                <span class="text-xs font-medium text-gray-700">💨 ${point.wind}km/h</span>
                            </div>
                        </div>
                    </div>
                `);

                fallbackLayer.addLayer(circle);
            });

            fallbackLayer.addTo(map);
            setHeatLayer(fallbackLayer);
        }

        return () => {
            if (heatLayer) {
                map.removeLayer(heatLayer);
            }
        };
    }, [map, weatherData]);

    return null;
};

const getRainfallIntensity = (rainfall: number) => {
    if (rainfall >= 120) return 'Very Heavy';
    if (rainfall >= 100) return 'Heavy';
    if (rainfall >= 80) return 'Moderate-Heavy';
    if (rainfall >= 60) return 'Moderate';
    if (rainfall >= 40) return 'Light';
    if (rainfall >= 20) return 'Very Light';
    return 'Minimal';
};

const RainfallHeatmap: React.FC<RainfallHeatmapProps> = ({ className = "" }) => {
    const { t } = useLanguage();
    const [isLoadingWeather, setIsLoadingWeather] = useState(true);
    // Musanze District coordinates - centered and zoomed in
    const [mapCenter] = useState<[number, number]>([-1.5006, 29.6348]);
    const [mapZoom] = useState(12); // Increased zoom level to focus on Musanze district
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherDataPoint[]>([]);

    useEffect(() => {
        // Fetch both locations and weather data in parallel for faster loading
        const fetchData = async () => {
            try {
                setIsLoadingWeather(true);
                
                // Fetch both API calls in parallel
                const [locationsResponse, weatherResponse] = await Promise.all([
                    api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                        params: { limit: 100 }
                    }).catch(() => ({ data: { locations: [] } })),
                    api.get('/api/weather/all', {
                        params: { type: 'daily' }
                    }).catch(() => ({ data: { locations: [] } }))
                ]);

                // Set locations
                if (locationsResponse?.data?.locations) {
                    setLocations(locationsResponse.data.locations);
                }

                // Process weather data
                const weatherLocations = weatherResponse.data.locations || [];
                const mappedData: WeatherDataPoint[] = weatherLocations.map((loc: any) => ({
                    location: loc.locationName,
                    coordinates: [loc.coordinates.lat, loc.coordinates.lon],
                    temperature: loc.weatherSummary.currentTemp,
                    rainfall: loc.weatherSummary.rainAmount,
                    humidity: parseInt(loc.weatherOverview?.match(/humidity level is (\d+)%/)?.[1] || '0'),
                    wind: parseInt(loc.weatherOverview?.match(/wind.*\((\d+)\s*km\/h\)/)?.[1] || '0'),
                    weatherCode: loc.weatherSummary.condition || 'unknown',
                    alerts: [
                        ...(loc.alert ? [loc.alert.type] : []),
                        ...(loc.intelligentAlerts?.map((a: any) => a.title) || [])
                    ],
                    intensity: Math.min(loc.weatherSummary.rainAmount / 100, 1)
                }));

                setWeatherData(mappedData);
            } catch (error) {
                } finally {
                setIsLoadingWeather(false);
            }
        };

        fetchData();
    }, []);




    return (
        <Card className={`w-full border-0 shadow-md ${className}`}>
            <CardHeader className="bg-[#f2f5fa] text-[#147677] rounded-t-xl">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                            <CloudRain className="h-7 w-7 text-[#147677]" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-[#147677]">
                                {t('rainfallHeatmap') || 'Rainfall Heatmap'}
                            </CardTitle>

                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-blue-50 text-[#147677] border-blue-200 px-4 py-2 hover:bg-blue-100">
                                <MapPin className="h-4 w-4 mr-2" />
                                {selectedLocation?.name || t('allLocations') || 'All Locations'}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                            <DropdownMenuItem
                                onClick={() => setSelectedLocation(null)}
                            >
                                <span className="font-medium">{t('allLocations') || 'All Locations'}</span>
                            </DropdownMenuItem>
                            {locations.length > 0 ? (
                                locations.map((location) => (
                                    <DropdownMenuItem
                                        key={location.id}
                                        onClick={() => setSelectedLocation(location)}
                                    >
                                        {location.name}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>
                                    {isLoadingWeather ? (t('loading') || 'Loading...') : (t('noLocationsFound') || 'No locations found')}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

                
                <div className="h-[500px] w-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner relative">
                    {typeof window !== 'undefined' && (
                        <>
                            <MapContainer
                                center={mapCenter}
                                zoom={mapZoom}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <ZoomControl position="bottomright" />
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                <MapViewUpdater center={mapCenter} zoom={mapZoom} />
                                {weatherData.length > 0 && <HeatmapController weatherData={weatherData} />}
                            </MapContainer>
                            {isLoadingWeather && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[1000]">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#147677]" />
                                    <p className="mt-2 text-slate-600 text-sm">Loading weather data...</p>
                                </div>
                            )}
                        </>
                    )}
                </div>


                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-2xl border border-blue-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                            <Droplets className="h-5 w-5 text-blue-600" />
                            Rainfall Intensity Scale
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#fef3c7' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">0-20mm</div>
                                    <div className="text-xs text-slate-500">Minimal</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#fde68a' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">20-40mm</div>
                                    <div className="text-xs text-slate-500">Light</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#fbbf24' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">40-60mm</div>
                                    <div className="text-xs text-slate-500">Moderate</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">60-80mm</div>
                                    <div className="text-xs text-slate-500">Mod-Heavy</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#d97706' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">80-120mm</div>
                                    <div className="text-xs text-slate-500">Heavy</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#b45309' }}></div>
                                <div>
                                    <div className="font-semibold text-slate-700 text-sm">120mm+</div>
                                    <div className="text-xs text-slate-500">Very Heavy</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </CardContent>
        </Card>
    );
};

export default RainfallHeatmap;