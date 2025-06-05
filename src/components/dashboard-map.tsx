'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap, Marker, Popup } from 'react-leaflet';
import { Sectors, Cells, Villages } from 'rwanda';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n';
import {
    CloudRain,
    Thermometer,
    AlertTriangle,
    Sun,
    CloudDrizzle,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
    province: string;
    district: string;
    sector?: string;
    cell?: string;
    village?: string;
}

interface Alert {
    type: string;
    severity: string;
    message: string;
    sectors: string[];
    color: string;
    icon: React.ReactNode;
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
}

interface OptimizedMapProps {
    onLocationChange?: (location: Location) => void;
    alerts?: Alert[];
    className?: string;
}

const MapViewUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);

    return null;
};

const OptimizedMap: React.FC<OptimizedMapProps> = ({
                                                       onLocationChange,
                                                       alerts = [],
                                                       className = ""
                                                   }) => {
    const { t } = useLanguage();
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'weather' | 'location'>('weather');
    const [weatherDataView, setWeatherDataView] = useState<'temperature' | 'rainfall' | 'alerts'>('temperature');

    const [selectedSector, setSelectedSector] = useState<string>('');
    const [selectedCell, setSelectedCell] = useState<string>('');
    const [selectedVillage, setSelectedVillage] = useState<string>('');

    const [availableSectors, setAvailableSectors] = useState<string[]>([]);
    const [availableCells, setAvailableCells] = useState<string[]>([]);
    const [availableVillages, setAvailableVillages] = useState<string[]>([]);

    const [mapCenter, setMapCenter] = useState<[number, number]>([-1.5006, 29.6348]);
    const [mapZoom, setMapZoom] = useState(10);

    const sampleWeatherData: WeatherDataPoint[] = useMemo(() => [
        {
            location: 'Kinigi',
            coordinates: [-1.4168, 29.6372],
            temperature: 19,
            rainfall: 80,
            humidity: 85,
            wind: 12,
            weatherCode: 'cloudy',
            alerts: ['heavyRainAlert']
        },
        {
            location: 'Muhoza',
            coordinates: [-1.4981, 29.6362],
            temperature: 21,
            rainfall: 40,
            humidity: 70,
            wind: 8,
            weatherCode: 'partlyCloudy',
            alerts: []
        },
        {
            location: 'Musanze',
            coordinates: [-1.5006, 29.6348],
            temperature: 22,
            rainfall: 30,
            humidity: 65,
            wind: 6,
            weatherCode: 'sunny',
            alerts: ['irrigationNeeded']
        },
        {
            location: 'Nyange',
            coordinates: [-1.5331, 29.5819],
            temperature: 18,
            rainfall: 95,
            humidity: 90,
            wind: 15,
            weatherCode: 'rainy',
            alerts: ['heavyRainAlert', 'floodRiskAlert']
        },
        {
            location: 'Shingiro',
            coordinates: [-1.4648, 29.6130],
            temperature: 20,
            rainfall: 65,
            humidity: 78,
            wind: 10,
            weatherCode: 'rainy',
            alerts: ['heavyRainAlert']
        }
    ], []);

    useEffect(() => {
        setIsLoading(true);

        fetch('/musanze_geo.json')
            .then(res => res.json())
            .then(data => {
                setGeoJsonData(data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error loading Musanze GeoJSON:', error);
                setIsLoading(false);
            });

        const musanzeSectors = Sectors('North', 'Musanze') || [];
        setAvailableSectors(musanzeSectors);
    }, []);

    useEffect(() => {
        if (selectedSector) {
            const cells = Cells('North', 'Musanze', selectedSector);
            setAvailableCells(cells || []);
            if (!cells?.includes(selectedCell)) {
                setSelectedCell('');
            }
            setSelectedVillage('');

            const sectorData = sampleWeatherData.find(d => d.location === selectedSector);
            if (sectorData) {
                setMapCenter(sectorData.coordinates);
                setMapZoom(12);
            }
        }
    }, [selectedSector, selectedCell, sampleWeatherData]);

    useEffect(() => {
        if (selectedSector && selectedCell) {
            const villages = Villages('North', 'Musanze', selectedSector, selectedCell);
            setAvailableVillages(villages || []);
            if (!villages?.includes(selectedVillage)) {
                setSelectedVillage('');
            }
            setMapZoom(13);
        }
    }, [selectedSector, selectedCell, selectedVillage]);

    useEffect(() => {
        if (onLocationChange && selectedSector) {
            onLocationChange({
                province: 'North',
                district: 'Musanze',
                sector: selectedSector,
                cell: selectedCell,
                village: selectedVillage
            });
        }
    }, [selectedSector, selectedCell, selectedVillage, onLocationChange]);

    useEffect(() => {
        if (selectedVillage) {
            setMapZoom(14);
        }
    }, [selectedVillage]);

    const getTemperatureColor = (temp: number) => {
        if (temp >= 23) return '#ef4444'; // Hot - red
        if (temp >= 21) return '#f97316'; // Warm - orange
        if (temp >= 19) return '#10b981'; // Mild - green
        return '#0ea5e9'; // Cool - blue
    };

    const getRainfallColor = (rainfall: number) => {
        if (rainfall >= 80) return '#1e40af'; // Heavy - dark blue
        if (rainfall >= 50) return '#3b82f6'; // Moderate - blue
        if (rainfall >= 30) return '#93c5fd'; // Light - light blue
        return '#f0f9ff'; // Minimal - very light blue
    };

    const styleFeature = (feature: any) => {
        const defaultStyle = {
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.6,
            fillColor: '#64748b'
        };

        const locationName = feature.properties?.ADM3_EN;
        if (!locationName) return defaultStyle;

        const data = sampleWeatherData.find(d => d.location === locationName);
        if (!data) return defaultStyle;

        if (activeTab === 'location') {

            const locationAlerts = alerts?.filter(alert =>
                alert.sectors?.includes(locationName)
            );

            if (locationAlerts?.length > 0) {
                // If there are multiple alerts, prioritize by severity
                const hasSevere = locationAlerts.some(alert => alert.severity === 'warning');
                const hasWarning = locationAlerts.some(alert => alert.severity === 'info');

                if (hasSevere) return { ...defaultStyle, fillColor: '#ef4444' }; // Red for severe warnings
                if (hasWarning) return { ...defaultStyle, fillColor: '#f59e0b' }; // Amber for warnings
                return { ...defaultStyle, fillColor: '#10b981' }; // Green for positive alerts
            }

            return { ...defaultStyle, fillColor: '#3b82f6' }; // Default blue if no alerts
        }

        switch (weatherDataView) {
            case 'temperature':
                return {
                    ...defaultStyle,
                    fillColor: getTemperatureColor(data.temperature)
                };
            case 'rainfall':
                return {
                    ...defaultStyle,
                    fillColor: getRainfallColor(data.rainfall)
                };
            case 'alerts':
                return {
                    ...defaultStyle,
                    fillColor: data.alerts.length > 0 ? '#f59e0b' : '#64748b',
                    fillOpacity: data.alerts.length > 0 ? 0.7 : 0.3
                };
            default:
                return defaultStyle;
        }
    };

    const filterFeature = (feature: any) => {
        if (feature.properties?.ADM3_EN) {
            return !(selectedSector && feature.properties.ADM3_EN !== selectedSector);
        }

        if (selectedSector && feature.properties?.shapeNam_1) {
            return !(selectedCell && feature.properties.shapeNam_1 !== selectedCell);
        }

        return true;
    };

    const onEachFeature = (feature: any, layer: any) => {
        const locationName = feature.properties?.ADM3_EN || feature.properties?.shapeNam_1 || feature.properties?.shapeName;
        if (!locationName) return;

        const weatherData = sampleWeatherData.find(d => d.location === locationName);

        layer.on('click', () => {
            if (feature.properties?.ADM3_EN && feature.properties.ADM3_EN !== selectedSector) {
                setSelectedSector(feature.properties.ADM3_EN);
                setSelectedCell('');
                setSelectedVillage('');
            } else if (feature.properties?.shapeNam_1 && feature.properties.shapeNam_1 !== selectedCell) {
                setSelectedCell(feature.properties.shapeNam_1);
                setSelectedVillage('');
            } else if (feature.properties?.shapeName &&
                feature.properties.shapeName !== selectedVillage &&
                feature.properties.shapeName !== feature.properties.ADM3_EN) {
                setSelectedVillage(feature.properties.shapeName);
            }
        });

        layer.bindPopup(() => {
            const popupElement = document.createElement('div');

            popupElement.innerHTML = `
        <div class="p-2">
          <h3 class="font-medium text-base mb-2">${locationName}</h3>
          
          ${weatherData ? `
            <div class="grid grid-cols-2 gap-2 mb-3">
              <div class="flex items-center">
                <span class="text-sm">🌡️ ${weatherData.temperature}°C</span>
              </div>
              <div class="flex items-center">
                <span class="text-sm">🌧️ ${weatherData.rainfall}mm</span>
              </div>
              <div class="flex items-center">
                <span class="text-sm">💧 ${weatherData.humidity}%</span>
              </div>
              <div class="flex items-center">
                <span class="text-sm">💨 ${weatherData.wind} km/h</span>
              </div>
            </div>
            
            ${weatherData.alerts.length > 0 ? `
              <div class="mt-2">
                <p class="text-sm font-medium mb-1">Alerts</p>
                <div class="space-y-1">
                  ${weatherData.alerts.map(alert => `
                    <div class="flex items-start gap-1">
                      <span class="text-amber-500">⚠️</span>
                      <span class="text-xs">${alert}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          ` : ''}
          
          <div class="text-sm text-gray-500 mt-2">
            ${feature.properties?.ADM3_EN ? `Sector: ${feature.properties.ADM3_EN}<br>` : ''}
            ${feature.properties?.shapeNam_1 ? `Cell: ${feature.properties.shapeNam_1}<br>` : ''}
            ${feature.properties?.shapeName &&
            feature.properties.shapeName !== feature.properties.ADM3_EN &&
            feature.properties.shapeName !== feature.properties.shapeNam_1 ?
                `Village: ${feature.properties.shapeName}` : ''}
          </div>
        </div>
      `;

            return popupElement;
        });
    };

    const createMarkerIcon = (weatherCode: string) => {
        let iconUrl = '';

        switch (weatherCode) {
            case 'sunny':
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png';
                break;
            case 'rainy':
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
                break;
            case 'cloudy':
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png';
                break;
            default:
                iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
        }

        return new L.Icon({
            iconUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    };

    const getWeatherIcon = (weatherCode: string) => {
        switch (weatherCode) {
            case 'sunny':
                return <Sun className="h-5 w-5 text-amber-500" />;
            case 'partlyCloudy':
                return <CloudDrizzle className="h-5 w-5 text-gray-400" />;
            case 'cloudy':
                return <CloudDrizzle className="h-5 w-5 text-gray-600" />;
            case 'rainy':
                return <CloudRain className="h-5 w-5 text-blue-500" />;
            default:
                return <CloudDrizzle className="h-5 w-5 text-gray-400" />;
        }
    };

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                    <span>{activeTab === 'weather' ? t('weatherMap') : t('locationSelector')}</span>
                    {selectedSector && (
                        <Badge variant="outline" className="ml-2">
                            {selectedSector}
                            {selectedCell && ` › ${selectedCell}`}
                            {selectedVillage && ` › ${selectedVillage}`}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    {activeTab === 'weather'
                        ? t('weatherMapDescription')
                        : t('selectLocationDescription')}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <Tabs defaultValue="weather" onValueChange={(value) => setActiveTab(value as 'weather' | 'location')}>
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="weather">
                            <CloudRain className="h-4 w-4 mr-2" />
                            {t('weatherMap')}
                        </TabsTrigger>
                        <TabsTrigger value="location">
                            <Thermometer className="h-4 w-4 mr-2" />
                            {t('locationSelector')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="weather" className="pt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={weatherDataView === 'temperature' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setWeatherDataView('temperature')}
                            >
                                <Thermometer className="h-4 w-4 mr-2" />
                                {t('temperature')}
                            </Button>
                            <Button
                                variant={weatherDataView === 'rainfall' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setWeatherDataView('rainfall')}
                            >
                                <CloudRain className="h-4 w-4 mr-2" />
                                {t('rainfall')}
                            </Button>
                            <Button
                                variant={weatherDataView === 'alerts' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setWeatherDataView('alerts')}
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {t('alerts')}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="location" className="pt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Select value={selectedSector} onValueChange={setSelectedSector}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder={t('sector')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSectors.map(sector => (
                                        <SelectItem key={sector} value={sector}>
                                            {sector}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedSector && (
                                <Select
                                    value={selectedCell}
                                    onValueChange={setSelectedCell}
                                    disabled={!selectedSector || availableCells.length === 0}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder={t('cell')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCells.map(cell => (
                                            <SelectItem key={cell} value={cell}>
                                                {cell}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {selectedCell && availableVillages.length > 0 && (
                                <Select
                                    value={selectedVillage}
                                    onValueChange={setSelectedVillage}
                                    disabled={!selectedCell}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder={t('village')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVillages.map(village => (
                                            <SelectItem key={village} value={village}>
                                                {village}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedSector('');
                                    setSelectedCell('');
                                    setSelectedVillage('');
                                    setMapCenter([-1.5006, 29.6348]);
                                    setMapZoom(10);
                                }}
                                disabled={!selectedSector}
                            >
                                {t('reset')}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="h-[400px] w-full rounded-md overflow-hidden border">
                    {typeof window !== 'undefined' && (
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

                            {geoJsonData && (
                                <GeoJSON
                                    data={geoJsonData}
                                    style={styleFeature}
                                    filter={filterFeature}
                                    onEachFeature={onEachFeature}
                                />
                            )}

                            {/* Show markers for alert locations in alert view */}
                            {activeTab === 'weather' && weatherDataView === 'alerts' &&
                                sampleWeatherData
                                    .filter(location => location.alerts.length > 0)
                                    .map((location, index) => (
                                        <Marker
                                            key={index}
                                            position={location.coordinates}
                                            icon={createMarkerIcon(location.weatherCode)}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <h3 className="font-medium">{location.location}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {getWeatherIcon(location.weatherCode)}
                                                        <span className="text-sm">{t(location.weatherCode)}</span>
                                                    </div>
                                                    <div className="text-sm mt-2">
                                                        <p>{t('alerts')}: {location.alerts.map(a => t(a)).join(', ')}</p>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))
                            }
                        </MapContainer>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 items-center justify-center text-sm text-muted-foreground">
                    {activeTab === 'weather' && weatherDataView === 'temperature' && (
                        <>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                                <span>≥ 23°C</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                                <span>21-22°C</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                                <span>19-20°C</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                                <span>≤ 18°C</span>
                            </div>
                        </>
                    )}

                    {activeTab === 'weather' && weatherDataView === 'rainfall' && (
                        <>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-900 mr-1"></div>
                                <span>≥ 80mm</span></div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                                <span>50-79mm</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-300 mr-1"></div>
                                <span>30-49mm</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-50 mr-1"></div>
                                <span>&lt; 30mm</span>
                            </div>
                        </>
                    )}

                    {activeTab === 'weather' && weatherDataView === 'alerts' && (
                        <>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                                <span>{t('alertsPresent')}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-slate-500 mr-1"></div>
                                <span>{t('noAlerts')}</span>
                            </div>
                        </>
                    )}

                    {activeTab === 'location' && (
                        <>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                                <span>{t('severeAlert')}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                                <span>{t('warning')}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                                <span>{t('favorable')}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                                <span>{t('normal')}</span>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default OptimizedMap;