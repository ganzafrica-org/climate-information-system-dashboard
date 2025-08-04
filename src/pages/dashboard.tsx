import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
    Thermometer,
    Umbrella,
    Loader2,
    RefreshCw,
    Wind,
    TrendingUp,
    Users,
    MessageSquare,
    Activity,
    AlertTriangle,
    Zap,
    Target,
    TrendingDown
} from 'lucide-react';
import dynamic from "next/dynamic";
import { toast } from 'sonner';
import api from '@/lib/api';
import { Location, LocationsResponse } from '@/types/farmer';
import { ApiResponse, WeatherData, WeatherRequestParams } from '@/types/weather';

const RainfallHeatmap = dynamic(
    () => import('@/components/dashboard-map'),
    { ssr: false }
);

const getWeatherIcon = (condition: string): React.ReactElement => {
    const iconMap: { [key: string]: React.ReactElement } = {
        'clear': <Sun className="h-10 w-10 text-yellow-500" />,
        'clouds': <Cloud className="h-10 w-10 text-gray-500" />,
        'rain': <CloudRain className="h-10 w-10 text-blue-600" />,
        'drizzle': <CloudDrizzle className="h-10 w-10 text-blue-400" />,
        'snow': <CloudDrizzle className="h-10 w-10 text-cyan-400" />,
        'thunderstorm': <CloudRain className="h-10 w-10 text-purple-600" />,
    };

    const conditionKey = condition.toLowerCase();
    return iconMap[conditionKey] || <Cloud className="h-10 w-10 text-gray-500" />;
};

const getConditionStatus = (value: number, type: 'planting' | 'harvesting' | 'pest' | 'disease'): { status: string, color: string } => {
    if (type === 'planting') {
        if (value >= 70) return { status: 'favorable', color: 'text-green-600' };
        if (value >= 40) return { status: 'moderate', color: 'text-amber-600' };
        return { status: 'unfavorable', color: 'text-red-600' };
    }

    if (type === 'harvesting') {
        if (value <= 30) return { status: 'favorable', color: 'text-green-600' };
        if (value <= 60) return { status: 'moderate', color: 'text-amber-600' };
        return { status: 'unfavorable', color: 'text-red-600' };
    }

    if (type === 'pest' || type === 'disease') {
        if (value <= 30) return { status: 'low', color: 'text-green-600' };
        if (value <= 60) return { status: 'moderate', color: 'text-amber-600' };
        return { status: 'high', color: 'text-red-600' };
    }

    return { status: 'unknown', color: 'text-gray-600' };
};

type Alert = {
    type: string;
    severity: string;
    message: string;
    sectors: string[];
    color: string;
    icon: React.ReactNode;
};

const Dashboard: NextPage = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [, setAllLocationsWeather] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [, setIsLoadingAllWeather] = useState(false);
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
                        humidity: todayWeather?.currentTemp ? Math.round(Math.random() * 30 + 50) : 65,
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
        const month = new Date().getMonth() + 1;
        if (month >= 9 || month <= 2) return 'seasons.seasonA';
        if (month >= 3 && month <= 6) return 'seasons.seasonB';
        return 'seasons.seasonC';
    };

    const getIntelligentAlerts = () => {
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

    const getFarmingConditions = () => {
        if (!todayWeather) return null;

        const temp = todayWeather.tempMax;
        const humidity = todayWeather.humidity;
        const rainChance = todayWeather.rainChance;
        const windSpeed = todayWeather.windSpeed;

        const plantingScore = temp >= 18 && temp <= 28 && humidity >= 50 ? 70 :
            temp >= 15 && temp <= 32 && humidity >= 40 ? 50 : 30;

        const harvestingScore = rainChance <= 20 && windSpeed <= 5 ? 80 :
            rainChance <= 40 && windSpeed <= 8 ? 50 : 20;

        const pestRisk = temp > 25 && humidity > 70 ? 80 :
            temp > 20 && humidity > 60 ? 50 : 20;

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
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" />
                        <p className="mt-2 text-slate-600">{t('loadingLocations')}</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const alerts = getIntelligentAlerts();
    const farmingConditions = getFarmingConditions();
    const recommendedActivities = getRecommendedActivities();

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-6">
                
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                                <Activity className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
                                <p className="text-blue-100 text-lg">{t('climateInformationSystem')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {selectedLocation?.name || t('selectLocation')}
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
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? t('refreshing') : t('refresh')}
                            </Button>
                        </div>
                    </div>
                </div>

                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-500">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-lg">
                                    <Calendar className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-amber-600">Current Season</p>
                                    <p className="font-bold text-amber-900">{t(getCurrentSeason())}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-lg">
                                    <Target className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-green-600">System Status</p>
                                    <p className="font-bold text-green-900">Operational</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Zap className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Active Locations</p>
                                    <p className="font-bold text-blue-900">{locations.length} Sectors</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Farmers Reached</p>
                                    <p className="text-3xl font-bold">1,245</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp className="h-4 w-4 text-green-300" />
                                        <span className="text-xs text-green-300">+12% this month</span>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Messages Sent</p>
                                    <p className="text-3xl font-bold">5,832</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp className="h-4 w-4 text-blue-300" />
                                        <span className="text-xs text-blue-300">+24% this month</span>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-sm font-medium">Active Alerts</p>
                                    <p className="text-3xl font-bold">18</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingDown className="h-4 w-4 text-green-300" />
                                        <span className="text-xs text-green-300">-5% from last week</span>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                
                <RainfallHeatmap />

                
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    
                    <Card className="border-0 shadow-md bg-white lg:col-span-1">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 pb-4">
                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Sun className="h-5 w-5 text-yellow-500" />
                                {t('todayForecast')}
                            </CardTitle>
                            <CardDescription className="text-blue-700">
                                {selectedLocation ? selectedLocation.name : t('selectLocation')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {todayWeather ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-600">
                                                {t('temperature')}
                                            </p>
                                            <p className="text-4xl font-bold text-slate-900">{todayWeather.tempMax}°C</p>
                                            <p className="text-sm text-slate-500">Feels like {todayWeather.tempMax + 2}°C</p>
                                        </div>
                                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                                            {getWeatherIcon(todayWeather.conditionMain)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CloudRain className="h-4 w-4 text-blue-600" />
                                                <p className="text-sm font-medium text-blue-700">Rainfall</p>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-900">{todayWeather.rainAmount}mm</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Droplets className="h-4 w-4 text-cyan-600" />
                                                <p className="text-sm font-medium text-cyan-700">Humidity</p>
                                            </div>
                                            <p className="text-2xl font-bold text-cyan-900">{todayWeather.humidity}%</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Wind className="h-4 w-4 text-gray-600" />
                                                <p className="text-sm font-medium text-gray-700">Wind</p>
                                            </div>
                                            <p className="text-2xl font-bold text-gray-900">{Math.round(todayWeather.windSpeed * 3.6)} km/h</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Eye className="h-4 w-4 text-green-600" />
                                                <p className="text-sm font-medium text-green-700">Soil</p>
                                            </div>
                                            <p className="text-lg font-bold text-green-900">{todayWeather.soilCondition}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t border-slate-100">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11" onClick={() => router.push('/forecasts')}>
                                {t('viewDetails')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>

                    
                    <div className="lg:col-span-2 space-y-6">
                        
                        <Card className="border-0 shadow-md bg-white">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 pb-4">
                                <CardTitle className="flex items-center gap-2 text-amber-900">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    {t('alerts')} & Advisories
                                </CardTitle>
                                <CardDescription className="text-amber-700">{t('farmingActionAdvisories')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 max-h-[300px] overflow-y-auto space-y-3">
                                {alerts.length > 0 ? (
                                    alerts.map(function(alert: Alert, index: number) {
                                        return (
                                            <div
                                                key={index}
                                                className={`rounded-xl p-4 border-l-4 transition-all hover:shadow-md ${
                                                    alert.color === 'amber' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-l-amber-500' :
                                                        alert.color === 'red' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-l-red-500' :
                                                            alert.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-blue-500' :
                                                                'bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 flex-shrink-0 ${
                                                        alert.color === 'amber' ? 'text-amber-600' :
                                                            alert.color === 'red' ? 'text-red-600' :
                                                                alert.color === 'blue' ? 'text-blue-600' :
                                                                    'text-green-600'
                                                    }`}>
                                                        {alert.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-semibold ${
                                                            alert.color === 'amber' ? 'text-amber-900' :
                                                                alert.color === 'red' ? 'text-red-900' :
                                                                    alert.color === 'blue' ? 'text-blue-900' :
                                                                        'text-green-900'
                                                        }`}>{alert.type}</p>
                                                        <p className={`text-sm mt-1 ${
                                                            alert.color === 'amber' ? 'text-amber-800' :
                                                                alert.color === 'red' ? 'text-red-800' :
                                                                    alert.color === 'blue' ? 'text-blue-800' :
                                                                        'text-green-800'
                                                        }`}>{alert.message}</p>
                                                        {alert.sectors && (
                                                            <p className={`text-sm mt-1 font-medium ${
                                                                alert.color === 'amber' ? 'text-amber-700' :
                                                                    alert.color === 'red' ? 'text-red-700' :
                                                                        alert.color === 'blue' ? 'text-blue-700' :
                                                                            'text-green-700'
                                                            }`}>
                                                                {t('affectedAreas')}: {alert.sectors.join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center p-8 text-slate-500">
                                        <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                            <AlertCircle className="h-8 w-8 text-green-600" />
                                        </div>
                                        <p className="font-medium text-slate-600">{t('noAlertsForRegion')}</p>
                                        <p className="text-sm mt-1 text-slate-500">All conditions are normal</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-slate-100">
                                <Button className="w-full bg-amber-600 hover:bg-amber-700 h-11" variant="outline" onClick={() => router.push('/communications')}>
                                    {t('viewAllAlerts')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>

                        
                        <Card className="border-0 shadow-md bg-white">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 pb-4">
                                <CardTitle className="flex items-center gap-2 text-green-900">
                                    <Droplets className="h-5 w-5 text-green-600" />
                                    {t('farmingConditions')}
                                </CardTitle>
                                <CardDescription className="text-green-700">{t('forNextWeek')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {farmingConditions ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Droplets className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium text-blue-900">{t('planting')}</span>
                                                </div>
                                                <span className={`text-sm font-semibold ${farmingConditions.planting.color}`}>
                                                    {t(farmingConditions.planting.status)}
                                                </span>
                                            </div>
                                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Umbrella className="h-4 w-4 text-amber-600" />
                                                    <span className="font-medium text-amber-900">{t('harvesting')}</span>
                                                </div>
                                                <span className={`text-sm font-semibold ${farmingConditions.harvesting.color}`}>
                                                    {t(farmingConditions.harvesting.status)}
                                                </span>
                                            </div>
                                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertCircle className="h-4 w-4 text-orange-600" />
                                                    <span className="font-medium text-orange-900">{t('pestRisk')}</span>
                                                </div>
                                                <span className={`text-sm font-semibold ${farmingConditions.pestRisk.color}`}>
                                                    {t(farmingConditions.pestRisk.status)}
                                                </span>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Eye className="h-4 w-4 text-purple-600" />
                                                    <span className="font-medium text-purple-900">{t('diseaseRisk')}</span>
                                                </div>
                                                <span className={`text-sm font-semibold ${farmingConditions.diseaseRisk.color}`}>
                                                    {t(farmingConditions.diseaseRisk.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
                                            <h3 className="font-semibold mb-3 text-slate-900 flex items-center gap-2">
                                                <Target className="h-4 w-4 text-blue-600" />
                                                {t('recommendedActivities')}
                                            </h3>
                                            <ul className="space-y-3">
                                                {recommendedActivities.map((activity, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <div className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 h-2 w-2 mt-2 flex-shrink-0" />
                                                        <span className="text-sm text-slate-700 leading-relaxed">{activity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="animate-spin h-6 w-6 text-green-600" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                
                <div className="text-center p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500">
                        {t('dataLastUpdated')}: {new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;