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

type DashboardStats = {
    totalFarmers: number;
    messagesSent: number;
    activeAlerts: number;
    activeLocations: number;
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
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalFarmers: 0,
        messagesSent: 0,
        activeAlerts: 0,
        activeLocations: 0
    });

    useEffect(() => {
        fetchLocations();
        fetchDashboardStats();
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

    const fetchDashboardStats = async () => {
        try {
            const [farmersRes, alertsStatsRes, alertsListRes, messagesStatsRes, locsRes] = await Promise.all([
                // Farmers
                api.get('/api/admin/farmers').catch((e: any) => e),
                // Try a dedicated alerts stats endpoint first
                api.get('/api/weather/alerts/stats').catch(() => null),
                // Fallback to listing alerts (with a large limit to approximate totals)
                api.get('/api/weather/alerts', { params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc' } }).catch((e: any) => e),
                // Try messaging stats endpoints for custom/emergency messages
                (async () => {
                    const candidates = ['/api/messaging/stats', '/api/messages/stats', '/api/weather/messaging/stats'];
                    for (const url of candidates) {
                        try {
                            const res = await api.get(url);
                            return res;
                        } catch (e: any) {
                            if (e?.response?.status === 404) continue;
                        }
                    }
                    return null;
                })(),
                // Locations
                api.get('/api/admin/locations').catch((e: any) => e),
            ]);

            // Farmers total
            const farmersData = farmersRes?.data?.data?.farmers || farmersRes?.data?.farmers || farmersRes?.farmers || [];
            const totalFarmers = Array.isArray(farmersData)
                ? farmersData.length
                : (farmersRes?.data?.count || farmersRes?.count || 0);

            // Alerts sent/active counts
            let sentAlerts = 0;
            let activeAlerts = 0;

            // Prefer stats endpoint shape if present
            const alertsStats = alertsStatsRes?.data?.data || alertsStatsRes?.data || alertsStatsRes;
            if (alertsStats && (alertsStats.sent !== undefined || alertsStats.sentCount !== undefined)) {
                sentAlerts = alertsStats.sent ?? alertsStats.sentCount ?? 0;
                // Active may be provided, else fallback to list parsing below
                activeAlerts = alertsStats.active ?? alertsStats.activeCount ?? 0;
            }

            // Parse list response for alerts to compute counts when stats not available or incomplete
            const alertsPayload = alertsListRes?.data || alertsListRes;
            let alertsArray: any[] = [];
            if (Array.isArray(alertsPayload)) {
                alertsArray = alertsPayload;
            } else if (alertsPayload?.data?.alerts) {
                alertsArray = alertsPayload.data.alerts;
            } else if (alertsPayload?.alerts) {
                alertsArray = alertsPayload.alerts;
            }

            if (alertsArray.length > 0) {
                const now = Date.now();
                const parsed = alertsArray.map((a: any) => ({
                    status: a.status || (a.isSent ? 'sent' : 'draft'),
                    isSent: Boolean(a.isSent || a.status === 'sent' || a.sentAt),
                    isActive: a.isActive,
                    validUntil: a.validUntil ? Date.parse(a.validUntil) : null,
                }));

                if (!sentAlerts) {
                    sentAlerts = parsed.filter(p => p.isSent).length;
                }
                if (!activeAlerts) {
                    activeAlerts = parsed.filter(p => {
                        if (p.isActive === true) return true;
                        if (p.isSent && p.validUntil && p.validUntil > now) return true;
                        return false;
                    }).length;
                }
            }

            // Messages (custom/emergency) sent
            let otherMessagesSent = 0;
            if (messagesStatsRes) {
                const ms = messagesStatsRes.data?.data || messagesStatsRes.data || messagesStatsRes;
                // Try common keys
                otherMessagesSent = ms?.sent ?? ms?.sentCount ?? ms?.delivered ?? ms?.deliveredCount ?? 0;
            }

            const messagesSent = sentAlerts + otherMessagesSent;

            // Active locations
            const locationsData = locsRes?.data?.data?.locations || locsRes?.data?.locations || locsRes?.locations || [];
            const activeLocations = Array.isArray(locationsData)
                ? locationsData.length
                : (locsRes?.data?.count || locsRes?.count || (locations?.length || 0));

            setDashboardStats({
                totalFarmers,
                messagesSent,
                activeAlerts,
                activeLocations,
            });

            console.log('Dashboard stats updated:', { totalFarmers, messagesSent, activeAlerts, activeLocations });
        } catch (error: any) {
            console.error('Failed to fetch dashboard stats:', error);
            setDashboardStats({
                totalFarmers: 0,
                messagesSent: 0,
                activeAlerts: 0,
                activeLocations: locations.length || 0,
            });
        }
    };

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
            await fetchDashboardStats();
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
                {/* Header Section */}
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
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm font-medium">{t(getCurrentSeason())}</span>
                            </div>

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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-gray-200 shadow-md bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Farmers Reached</p>
                                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalFarmers.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">+12% this month</span>
                                    </div>
                                </div>
                                <div className="bg-blue-500/10 backdrop-blur-sm p-3 rounded-2xl">
                                    <Users className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Messages Sent</p>
                                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.messagesSent.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">+24% this month</span>
                                    </div>
                                </div>
                                <div className="bg-green-500/10 backdrop-blur-sm p-3 rounded-2xl">
                                    <MessageSquare className="h-6 w-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Active Alerts</p>
                                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.activeAlerts.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingDown className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">-5% from last week</span>
                                    </div>
                                </div>
                                <div className="bg-orange-500/10 backdrop-blur-sm p-3 rounded-2xl">
                                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-md bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Active Locations</p>
                                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.activeLocations.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">+8% this month</span>
                                    </div>
                                </div>
                                <div className="bg-purple-500/10 backdrop-blur-sm p-3 rounded-2xl">
                                    <MapPin className="h-6 w-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Map Section */}
                <RainfallHeatmap />

                {/* Main Content Grid */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    {/* Today's Weather */}
                    <Card className="border-0 shadow-md bg-white lg:col-span-1">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 pb-4">
                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Sun className="h-5 w-5 text-yellow-500" />
                                {t('todayForecast')}
                            </CardTitle>
                            <CardDescription className="text-blue-700 flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-900 p-0 h-auto">
                                            <MapPin className="h-4 w-4 mr-1" />
                                            {selectedLocation?.name || t('selectLocation')}
                                            <ChevronDown className="ml-1 h-3 w-3" />
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

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                    
                        {/* Farming Conditions */}
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

                {/* Footer */}
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