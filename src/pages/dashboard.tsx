import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    ChevronDown,
    CloudDrizzle,
    CloudRain,
    Cloud,
    Sun,
    Droplets,
    Eye,
    MapPin,
    Search,
    Thermometer,
    Umbrella,
    Loader2,
    RefreshCw,
    Wind,
} from 'lucide-react';
import dynamic from "next/dynamic";
import { toast } from 'sonner';
import api from '@/lib/api';
import { Location, LocationsResponse } from '@/types/farmer';
import { ApiResponse, WeatherData, WeatherRequestParams } from '@/types/weather';

const OptimizedMap = dynamic(
    () => import('@/components/dashboard-map'),
    { ssr: false }
);

// Amakuru y'ibihe y'amateka ku binyabupfasoni (amakuru y'amateka)
const historicalWeatherData = [
    { month: 'Mut', temperature: 22, rainfall: 60, humidity: 65, season: 'A' },
    { month: 'Gas', temperature: 23, rainfall: 40, humidity: 60, season: 'A' },
    { month: 'Wer', temperature: 21, rainfall: 120, humidity: 75, season: 'B' },
    { month: 'Mat', temperature: 20, rainfall: 150, humidity: 80, season: 'B' },
    { month: 'Gic', temperature: 19, rainfall: 80, humidity: 72, season: 'B' },
    { month: 'Kam', temperature: 18, rainfall: 30, humidity: 68, season: 'B' },
    { month: 'Nya', temperature: 17, rainfall: 20, humidity: 65, season: 'C' },
    { month: 'Kan', temperature: 19, rainfall: 25, humidity: 67, season: 'C' },
    { month: 'Nze', temperature: 20, rainfall: 40, humidity: 70, season: 'A' },
    { month: 'Ukw', temperature: 21, rainfall: 70, humidity: 73, season: 'A' },
    { month: 'Ugu', temperature: 21, rainfall: 90, humidity: 75, season: 'A' },
    { month: 'Uku', temperature: 22, rainfall: 70, humidity: 70, season: 'A' }
];

const chartConfig = {
    temperature: {
        label: 'Ubushyuhe (°C)',
        color: 'hsl(var(--primary))',
    },
    rainfall: {
        label: 'Imvura (mm)',
        color: '#3b82f6',
    },
    humidity: {
        label: 'Ubuhehere (%)',
        color: '#60a5fa',
    },
};

const getWeatherIcon = (condition: string): React.ReactElement => {
    const iconMap: { [key: string]: React.ReactElement } = {
        'clear': <Sun className="h-10 w-10 text-blue-500" />,
        'clouds': <Cloud className="h-10 w-10 text-blue-500" />,
        'rain': <CloudRain className="h-10 w-10 text-blue-500" />,
        'drizzle': <CloudDrizzle className="h-10 w-10 text-blue-500" />,
        'snow': <CloudDrizzle className="h-10 w-10 text-blue-500" />,
        'thunderstorm': <CloudRain className="h-10 w-10 text-blue-500" />,
    };

    const conditionKey = condition.toLowerCase();
    return iconMap[conditionKey] || <Cloud className="h-10 w-10 text-blue-500" />;
};

const getConditionStatus = (value: number, type: 'planting' | 'harvesting' | 'pest' | 'disease'): { status: string, color: string } => {
    if (type === 'planting') {
        if (value >= 70) return { status: 'favorable', color: 'text-green-600 dark:text-green-400' };
        if (value >= 40) return { status: 'moderate', color: 'text-amber-600 dark:text-amber-400' };
        return { status: 'unfavorable', color: 'text-red-600 dark:text-red-400' };
    }
    
    if (type === 'harvesting') {
        if (value <= 30) return { status: 'favorable', color: 'text-green-600 dark:text-green-400' };
        if (value <= 60) return { status: 'moderate', color: 'text-amber-600 dark:text-amber-400' };
        return { status: 'unfavorable', color: 'text-red-600 dark:text-red-400' };
    }
    
    if (type === 'pest' || type === 'disease') {
        if (value <= 30) return { status: 'low', color: 'text-green-600 dark:text-green-400' };
        if (value <= 60) return { status: 'moderate', color: 'text-amber-600 dark:text-amber-400' };
        return { status: 'high', color: 'text-red-600 dark:text-red-400' };
    }
    
    return { status: 'unknown', color: 'text-gray-600' };
};

const Dashboard: NextPage = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [allLocationsWeather, setAllLocationsWeather] = useState<any[]>([]);
    const [dashboardView, setDashboardView] = useState<'map' | 'charts'>('map');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingAllWeather, setIsLoadingAllWeather] = useState(false);
    const [todayWeather, setTodayWeather] = useState<any>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        if (selectedLocation) {
            fetchWeatherData(selectedLocation.id);
        }
    }, [selectedLocation]);

    useEffect(() => {
        if (locations.length > 0) {
            fetchAllLocationsWeather();
        }
    }, [locations]);

    const fetchLocations = async () => {
        try {
            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: { limit: 100 }
            });
            setLocations(response.data.locations);

            // Hitamo ahantu ha mbere ku ikurikiranyagihe
            if (response.data.locations.length > 0) {
                setSelectedLocation(response.data.locations[0]);
            }
        } catch (error: any) {
            console.error('Byanze kubona ahantu:', error);
            toast.error(t('failedToLoadLocations'));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWeatherData = async (locationId: number) => {
        try {
            const params: WeatherRequestParams = { type: 'daily' };
            const response = await api.get<ApiResponse<WeatherData>>(
                `/api/weather/location/${locationId}`,
                { params }
            );

            setWeatherData(response.data);
            
            // Shiraho ibihe by'uyumunsi (icya mbere mu rutonde rwa buri munsi cyangwa gishaka uyumunsi)
            const todayIndex = response.data.weather.daily.findIndex(day => day.isToday);
            const today = todayIndex !== -1 ? response.data.weather.daily[todayIndex] : response.data.weather.daily[0];
            setTodayWeather(today);

        } catch (error: any) {
            console.error('Byanze kubona amakuru y\'ibihe:', error);
            toast.error(t('failedToLoadWeather'));
        }
    };

    const fetchAllLocationsWeather = async () => {
        setIsLoadingAllWeather(true);
        try {
            const response = await api.get('/api/weather/all', {
                params: { type: 'daily' }
            });

            if (response.data.status === 'success') {
                const processedWeatherData = response.data.data.locations.map((location: any) => {
                    const todayWeather = location.weatherSummary;
                    const locationData = locations.find(loc => loc.id === location.locationId);

                    return {
                        id: location.locationId,
                        name: location.locationName,
                        sector: location.locationName,
                        lat: location.coordinates?.lat || locationData?.lat,
                        lon: location.coordinates?.lon || locationData?.lon,
                        temperature: todayWeather?.currentTemp || 20,
                        condition: todayWeather?.condition || 'Bitazwi',
                        rainChance: todayWeather?.rainChance || 0,
                        humidity: todayWeather?.currentTemp ? Math.round(Math.random() * 30 + 50) : 65, // Ubusumbane
                        windSpeed: todayWeather?.windInfo ? parseFloat(todayWeather.windInfo.split(' ')[0]) || 5 : 5,
                        alerts: location.intelligentAlerts || [],
                        hasExtremeConditions: todayWeather?.hasExtremeConditions || false,
                        farmingAdvice: todayWeather?.farmingAdvice || 'Kora igenzura ry\'ibihingwa buri gihe',
                        weatherOverview: location.weatherOverview || `Ibihe by\'ikirere bya ${location.locationName}`,
                    };
                });

                setAllLocationsWeather(processedWeatherData);
            }
        } catch (error: any) {
            console.error('Byanze kubona ibihe by\'ahantu hose:', error);
            toast.error(t('failedToLoadAllWeather'));
        } finally {
            setIsLoadingAllWeather(false);
        }
    };

    const handleRefresh = async () => {
        if (!selectedLocation) return;

        setIsRefreshing(true);
        try {
            await fetchWeatherData(selectedLocation.id);
            await fetchAllLocationsWeather();
            toast.success(t('weatherDataRefreshed'));
        } catch (error) {
            toast.error(t('failedToRefreshWeather'));
        } finally {
            setIsRefreshing(false);
        }
    };

    const getCurrentSeason = () => {
        const month = new Date().getMonth() + 1; // 1-12
        if (month >= 9 || month <= 2) return 'seasons.seasonA';
        if (month >= 3 && month <= 6) return 'seasons.seasonB';
        return 'seasons.seasonC';
    };

    const handleLocationChange = (location: any) => {
        if (location.sector || location.name) {
            const locationName = location.sector || location.name;
            const foundLocation = locations.find(loc => loc.name === locationName);
            if (foundLocation) {
                setSelectedLocation(foundLocation);
            }
        }
    };

    const handleViewDetails = () => {
        router.push('/forecasts');
    };

    const handleViewAllAlerts = () => {
        router.push('/communications');
    };

    const getIntelligentAlerts = () => {
        // Reba niba weatherData ifite imburizi z'ubwenge, ubundi usubize urutonde rwiza
        const alerts = (weatherData as any)?.intelligentAlerts || [];
        if (!alerts || alerts.length === 0) return [];
        
        return alerts.map((alert: any) => ({
            type: alert.type,
            severity: alert.level,
            message: alert.message,
            sectors: [selectedLocation?.name || ''],
            color: alert.level === 'critical' ? 'red' : 
                   alert.level === 'high' ? 'amber' : 
                   alert.level === 'medium' ? 'blue' : 'green',
            icon: alert.category === 'rainfall' ? <CloudRain className="h-5 w-5" /> :
                  alert.category === 'pest_management' ? <AlertCircle className="h-5 w-5" /> :
                  alert.category === 'irrigation' ? <Droplets className="h-5 w-5" /> :
                  alert.category === 'temperature' ? <Thermometer className="h-5 w-5" /> :
                  alert.category === 'wind' ? <Wind className="h-5 w-5" /> : <Sun className="h-5 w-5" />
        }));
    };

    const getMapAlerts = () => {
        // Huza imburizi z'ahantu hose ku karita
        const mapAlerts: any[] = [];
        
        allLocationsWeather.forEach(location => {
            if (location.alerts && location.alerts.length > 0) {
                location.alerts.forEach((alert: any) => {
                    mapAlerts.push({
                        type: alert.type || 'imburizi_y\'ibihe',
                        severity: alert.level || 'medium',
                        message: alert.message || `Imburizi y'ibihe ya ${location.name}`,
                        sectors: [location.name],
                        color: alert.level === 'critical' ? 'red' : 
                               alert.level === 'high' ? 'amber' : 
                               alert.level === 'medium' ? 'blue' : 'green',
                        icon: alert.category === 'rainfall' ? <CloudRain /> :
                              alert.category === 'pest_management' ? <AlertCircle /> :
                              alert.category === 'irrigation' ? <Droplets /> :
                              alert.category === 'temperature' ? <Thermometer /> :
                              alert.category === 'wind' ? <Wind /> : <Sun />,
                        location: {
                            lat: location.lat,
                            lon: location.lon,
                            name: location.name
                        }
                    });
                });
            }
        });

        return mapAlerts;
    };

    const getFarmingConditions = () => {
        if (!todayWeather) return null;

        // Kubara imiterere y'ubuhinzi ukurikije amakuru y'ibihe
        const temp = todayWeather.tempMax;
        const humidity = todayWeather.humidity;
        const rainChance = todayWeather.rainChance;
        const windSpeed = todayWeather.windSpeed;

        // Imiterere yo gutera (ubushyuhe bwiza + ubuhehere bumwe)
        const plantingScore = temp >= 18 && temp <= 28 && humidity >= 50 ? 70 : 
                             temp >= 15 && temp <= 32 && humidity >= 40 ? 50 : 30;

        // Imiterere yo kweza (ikirere cyumutse gikunda)
        const harvestingScore = rainChance <= 20 && windSpeed <= 5 ? 80 : 
                               rainChance <= 40 && windSpeed <= 8 ? 50 : 20;

        // Ibyago by'udukoko (ubushyuhe + ubuhehere = ibyago byinshi)
        const pestRisk = temp > 25 && humidity > 70 ? 80 : 
                        temp > 20 && humidity > 60 ? 50 : 20;

        // Ibyago by'indwara (bisa n'udukoko ariko harimo ubuhehere)
        const diseaseRisk = temp > 20 && humidity > 65 && rainChance > 40 ? 75 : 
                           temp > 15 && humidity > 55 ? 45 : 25;

        return {
            planting: getConditionStatus(plantingScore, 'planting'),
            harvesting: getConditionStatus(harvestingScore, 'harvesting'),
            pestRisk: getConditionStatus(pestRisk, 'pest'),
            diseaseRisk: getConditionStatus(diseaseRisk, 'disease')
        };
    };

    const getRecommendedActivities = () => {
        if (!todayWeather) return [];

        const activities = [];
        const temp = todayWeather.tempMax;
        const rainChance = todayWeather.rainChance;
        const humidity = todayWeather.humidity;

        // Tanga impanuro z'ibikorwa ukurikije imiterere y'ibihe
        if (temp >= 18 && temp <= 28 && rainChance > 30) {
            activities.push(t('goodTimeToPlantBeans') || 'Igihe cyiza cyo gutera ibishyimbo n\'imboga');
        }

        if (temp >= 20 && temp <= 30 && humidity >= 50) {
            activities.push(t('applyFertilizerToMaize') || 'Shyira ifumbire mu bigori');
        }

        if (humidity > 70 && temp > 20) {
            activities.push(t('monitorPotatoesForBlight') || 'Kora igenzura ry\'ibirayi ureba ibimenyetso by\'indwara');
        }

        if (rainChance < 20) {
            activities.push(t('goodTimeForHarvesting') || 'Ibihe byiza byo kweza');
        }

        if (temp > 25) {
            activities.push(t('provideShadeForLivestock') || 'Tanga igicucu cy\'amatungo');
        }

        if (activities.length === 0) {
            activities.push(t('monitorCropsRegularly') || 'Kora igenzura ry\'ibihingwa buri gihe');
        }

        return activities;
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                        <p className="mt-2 text-muted-foreground">{t('loadingLocations')}</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const alerts = getIntelligentAlerts();
    const mapAlerts = getMapAlerts();
    const farmingConditions = getFarmingConditions();
    const recommendedActivities = getRecommendedActivities();

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t('dashboard')}</h2>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-2">
                                    <span>{selectedLocation?.name || t('selectLocation')}</span>
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {locations.map((location) => (
                                    <DropdownMenuItem 
                                        key={location.id} 
                                        onClick={() => setSelectedLocation(location)}
                                    >
                                        {location.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="ml-2"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? t('refreshing') : t('refresh')}
                        </Button>
                    </div>

                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('search')}
                                className="pl-8 w-full sm:w-[180px] h-9"
                            />
                        </div>
                    </div>
                </div>

                <Card className="bg-ganz-primary/10 border-ganz-primary/30">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-ganz-primary" />
                                <span className="font-medium">{t('currentSeason')}: </span>
                                <span className="font-bold">{t(getCurrentSeason())}</span>
                                {selectedLocation && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <span className="font-medium">{selectedLocation.name}</span>
                                    </>
                                )}
                            </div>
                            {isLoadingAllWeather && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    <span>{t('loadingMapData')}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {dashboardView === 'map' && (
                    <div className="space-y-4">
                        <OptimizedMap
                            onLocationChange={handleLocationChange}
                            alerts={mapAlerts}
                            locations={allLocationsWeather}
                            isLoading={isLoadingAllWeather}
                        />
                        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('todayForecast')}</CardTitle>
                                    <CardDescription>
                                        {selectedLocation ? selectedLocation.name : t('selectLocation')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {todayWeather ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {t('temperature')}
                                                    </p>
                                                    <p className="text-3xl font-bold">{todayWeather.tempMax}°C</p>
                                                </div>
                                                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                    {getWeatherIcon(todayWeather.conditionMain)}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {t('rainfall')}
                                                    </p>
                                                    <p className="text-xl font-medium">{todayWeather.rainAmount}mm</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {t('humidity')}
                                                    </p>
                                                    <p className="text-xl font-medium">{todayWeather.humidity}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {t('wind')}
                                                    </p>
                                                    <p className="text-xl font-medium">{Math.round(todayWeather.windSpeed * 3.6)} km/h</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {t('soilMoisture')}
                                                    </p>
                                                    <p className="text-xl font-medium">{todayWeather.soilCondition}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="animate-spin h-6 w-6" />
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" variant="outline" onClick={handleViewDetails}>
                                        {t('viewDetails')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('alerts')}</CardTitle>
                                    <CardDescription>{t('farmingActionAdvisories')}</CardDescription>
                                </CardHeader>
                                <CardContent className="max-h-[260px] overflow-y-auto space-y-3">
                                    {alerts.length > 0 ? (
                                        alerts.map((alert, index) => (
                                            <div
                                                key={index}
                                                className={`rounded-md p-3 ${
                                                    alert.color === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        alert.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                            alert.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {alert.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{alert.type}</p>
                                                        <p className="text-sm mt-1">{alert.message}</p>
                                                        {alert.sectors && (
                                                            <p className="text-sm mt-1 font-medium">
                                                                {t('affectedAreas')}: {alert.sectors.join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-4 text-muted-foreground">
                                            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p>{t('noAlertsForRegion')}</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" variant="outline" onClick={handleViewAllAlerts}>
                                        {t('viewAllAlerts')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('farmingConditions')}</CardTitle>
                                    <CardDescription>{t('forNextWeek')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {farmingConditions ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Droplets className="h-5 w-5 text-blue-500" />
                                                        <span className="font-medium">{t('planting')}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center">
                                                        <span className={`ml-7 font-medium ${farmingConditions.planting.color}`}>
                                                            {t(farmingConditions.planting.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Umbrella className="h-5 w-5 text-amber-500" />
                                                        <span className="font-medium">{t('harvesting')}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center">
                                                        <span className={`ml-7 font-medium ${farmingConditions.harvesting.color}`}>
                                                            {t(farmingConditions.harvesting.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                                        <span className="font-medium">{t('pestRisk')}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center">
                                                        <span className={`ml-7 font-medium ${farmingConditions.pestRisk.color}`}>
                                                            {t(farmingConditions.pestRisk.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="h-5 w-5 text-purple-500" />
                                                        <span className="font-medium">{t('diseaseRisk')}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center">
                                                        <span className={`ml-7 font-medium ${farmingConditions.diseaseRisk.color}`}>
                                                            {t(farmingConditions.diseaseRisk.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div>
                                                <h3 className="font-medium mb-2">{t('recommendedActivities')}</h3>
                                                <ul className="text-sm space-y-1.5">
                                                    {recommendedActivities.map((activity, index) => (
                                                        <li key={index} className="flex items-start gap-2">
                                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                            <span>{activity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="animate-spin h-6 w-6" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
                {dashboardView === 'charts' && (
                    <>
                        <Tabs defaultValue="temperature" className="space-y-4">
                            <div className="overflow-x-auto pb-2">
                                <TabsList>
                                    <TabsTrigger value="temperature">
                                        <Thermometer className="h-4 w-4 mr-2" />
                                        {t('temperature')}
                                    </TabsTrigger>
                                    <TabsTrigger value="rainfall">
                                        <CloudRain className="h-4 w-4 mr-2" />
                                        {t('rainfall')}
                                    </TabsTrigger>
                                    <TabsTrigger value="humidity">
                                        <Droplets className="h-4 w-4 mr-2" />
                                        {t('humidity')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="temperature" className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>{t('weeklyOverview')}: {t('temperature')}</CardTitle>
                                        <CardDescription>
                                            {t('januaryToDecember')} 2024 - {selectedLocation?.name || t('selectLocation')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px]">
                                            <LineChart data={historicalWeatherData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="month"
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12 }}
                                                    domain={[15, 25]}
                                                />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="temperature"
                                                    stroke="var(--color-temperature)"
                                                    strokeWidth={2}
                                                    dot={{ strokeWidth: 2 }}
                                                    name={t('temperature')}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="rainfall" className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>{t('weeklyOverview')}: {t('rainfall')}</CardTitle>
                                        <CardDescription>
                                            {t('januaryToDecember')} 2024 - {selectedLocation?.name || t('selectLocation')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px]">
                                            <BarChart data={historicalWeatherData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="month"
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="rainfall"
                                                    fill="#004b23"
                                                    name={t('rainfall')}
                                                    radius={4}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="humidity" className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>{t('weeklyOverview')}: {t('humidity')}</CardTitle>
                                        <CardDescription>
                                            {t('januaryToDecember')} 2024 - {selectedLocation?.name || t('selectLocation')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px]">
                                            <LineChart data={historicalWeatherData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="month"
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12 }}
                                                    domain={[50, 90]}
                                                />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="humidity"
                                                    stroke="#60a5fa"
                                                    strokeWidth={2}
                                                    dot={{ strokeWidth: 2 }}
                                                    name={t('humidity')}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('farmersReached')}</CardTitle>
                                    <CardDescription>{t('last30Days')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">1,245</div>
                                    <p className="text-sm text-muted-foreground mt-2">+12% {t('fromPreviousPeriod')}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('messagesDelivered')}</CardTitle>
                                    <CardDescription>{t('last30Days')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">5,832</div>
                                    <p className="text-sm text-muted-foreground mt-2">+24% {t('fromPreviousPeriod')}</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>{t('alertsTriggered')}</CardTitle>
                                    <CardDescription>{t('last30Days')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">18</div>
                                    <p className="text-sm text-muted-foreground mt-2">-5% {t('fromPreviousPeriod')}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                <div className="text-xs text-muted-foreground text-center mt-4">
                    {t('dataLastUpdated')}: {new Date().toLocaleString()}
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;