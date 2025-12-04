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
import { RainTimingDisplay } from '@/components/ui/rain-timing';
import { HourlyForecastDisplay } from '@/components/ui/hourly-forecast';

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
    totalFarmersCount?: number;
    totalMessagesCount?: number;
    totalAlertsCount?: number;
    totalLocationsCount?: number;
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
        activeLocations: 0,
        totalFarmersCount: 0,
        totalMessagesCount: 0,
        totalAlertsCount: 0,
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
            const [farmersRes, alertsListRes, messagesLogsRes, locsRes] = await Promise.all([
                // Farmers
                api.get('/api/admin/farmers').catch((e: any) => e),
                // List alerts (with a large limit to approximate totals)
                api.get('/api/weather/alerts', { params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc' } }).catch((e: any) => e),
                // Use admin messages logs endpoint to compute total messages sent (bypass cache)
                api.get('/api/weather/admin/logs/messages', { 
                    params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc', _ts: Date.now() },
                }).catch(() => null),
                // Locations
                api.get('/api/admin/locations').catch((e: any) => e),
            ]);

            // Farmers total - extract both count and total
            const farmersData = farmersRes?.data?.data?.farmers || farmersRes?.data?.farmers || farmersRes?.farmers || [];
            const totalFarmers = Array.isArray(farmersData)
                ? farmersData.length
                : (farmersRes?.data?.count || farmersRes?.count || 0);
            const totalFarmersCount = farmersRes?.data?.data?.total || farmersRes?.data?.total || farmersRes?.total || totalFarmers;

            // Alerts sent/active counts from alerts list only
            let sentAlerts = 0;
            let activeAlerts = 0;
            let totalAlertsCount = 0;

            // Parse list response for alerts to compute counts
            const alertsPayload = alertsListRes?.data || alertsListRes;
            let alertsArray: any[] = [];
            if (Array.isArray(alertsPayload)) {
                alertsArray = alertsPayload;
            } else if (alertsPayload?.data?.alerts) {
                alertsArray = alertsPayload.data.alerts;
            } else if (alertsPayload?.alerts) {
                alertsArray = alertsPayload.alerts;
            }

            // Extract total count from pagination metadata
            totalAlertsCount = alertsPayload?.data?.total || alertsPayload?.total || alertsPayload?.pagination?.total || alertsArray.length;

            if (alertsArray.length > 0) {
                const now = Date.now();
                const parsed = alertsArray.map((a: any) => ({
                    status: a.status || (a.isSent ? 'sent' : 'draft'),
                    isSent: Boolean(a.isSent || a.status === 'sent' || a.sentAt),
                    isActive: a.isActive,
                    validUntil: a.validUntil ? Date.parse(a.validUntil) : null,
                }));

                sentAlerts = parsed.filter(p => p.isSent).length;
                activeAlerts = parsed.filter(p => {
                    if (p.isActive === true) return true;
                    if (p.isSent && p.validUntil && p.validUntil > now) return true;
                    return false;
                }).length;
            }

            // Messages totals (use summary.total or pagination.total)
            let messagesTotalFromLogs = 0;
            let totalMessagesCount = 0; // keep for detailed stats if needed
            if (messagesLogsRes) {
                const raw = messagesLogsRes;
                const payloadRoot = raw?.data ?? raw;
                
                // Extract summary and pagination nodes
                const summaryNode = payloadRoot?.data?.summary || payloadRoot?.summary || null;
                const paginationNode = payloadRoot?.data?.pagination || payloadRoot?.pagination || null;

                // Use total from summary or pagination as the displayed total
                messagesTotalFromLogs = (
                    (typeof summaryNode?.total === 'number' ? summaryNode.total : undefined) ??
                    (typeof paginationNode?.total === 'number' ? paginationNode.total : undefined) ??
                    0
                );
                
                // Use pagination.total for total messages count
                totalMessagesCount = (
                    (typeof paginationNode?.total === 'number' ? paginationNode.total : undefined) ??
                    (typeof summaryNode?.total === 'number' ? summaryNode.total : undefined) ??
                    0
                );
                
            }

            // Display the exact total from logs on the card
            const messagesSent = messagesTotalFromLogs;
            const totalMessages = totalMessagesCount;

            // Active locations - extract both count and total
            const locationsData = locsRes?.data?.data?.locations || locsRes?.data?.locations || locsRes?.locations || [];
            const activeLocations = Array.isArray(locationsData)
                ? locationsData.length
                : (locsRes?.data?.count || locsRes?.count || (locations?.length || 0));
            const totalLocationsCount = locsRes?.data?.data?.total || locsRes?.data?.total || locsRes?.total || locsRes?.pagination?.total || activeLocations;

            setDashboardStats({
                totalFarmers,
                messagesSent,
                activeAlerts,
                activeLocations,
                totalFarmersCount,
                totalMessagesCount: totalMessages,
                totalAlertsCount,
                totalLocationsCount,
            });

        } catch (error: any) {
            setDashboardStats({
                totalFarmers: 0,
                messagesSent: 0,
                activeAlerts: 0,
                activeLocations: locations.length || 0,
                totalFarmersCount: 0,
                totalMessagesCount: 0,
                totalAlertsCount: 0,
                totalLocationsCount: locations.length || 0,
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
            // Handle weather API configuration errors gracefully
            if (error.response?.status === 404 || error.response?.status === 500) {
                const errorMessage = error.response?.data?.message || '';
                if (errorMessage.includes('Weather API key not configured') || errorMessage.includes('Weather data retrieved for 0')) {
                    // Weather API not configured - show warning but don't block the UI
                    setAllLocationsWeather([]);
                } else {
                    toast.error(t('failedToLoadAllWeather'));
                }
            } else {
                toast.error(t('failedToLoadAllWeather'));
            }
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

    const getWeatherMetrics = () => {
        if (!todayWeather) return null;

        // Get current weather data if available
        const currentWeather = weatherData?.weather?.current;
        
        // Get average cloud coverage from hourly data if available
        const avgClouds = todayWeather.hourly && todayWeather.hourly.length > 0
            ? Math.round(todayWeather.hourly.reduce((sum: number, h: any) => sum + (h.clouds || 0), 0) / todayWeather.hourly.length)
            : null;

        // Get average visibility from hourly data if available
        const avgVisibility = todayWeather.hourly && todayWeather.hourly.length > 0
            ? Math.round(todayWeather.hourly.reduce((sum: number, h: any) => sum + (h.visibility || 10000), 0) / todayWeather.hourly.length)
            : null;

        // Get max wind gust from hourly data if available
        const maxWindGust = todayWeather.hourly && todayWeather.hourly.length > 0
            ? Math.max(...todayWeather.hourly.map((h: any) => h.wind_gust || 0))
            : null;

        return {
            uvIndex: todayWeather.uvIndex || currentWeather?.uvIndex || 0,
            pressure: currentWeather?.pressure || null,
            windDirection: todayWeather.windDirection || currentWeather?.windDirection || 'N/A',
            cloudCoverage: avgClouds,
            visibility: avgVisibility ? (avgVisibility / 1000).toFixed(1) : null, // Convert to km
            feelsLike: currentWeather?.feelsLike || null,
            windGust: maxWindGust ? Math.round(maxWindGust * 3.6) : null, // Convert to km/h
        };
    };

    const getWeeklyForecastSummary = () => {
        if (!weatherData?.weather?.daily) return null;

        const daily = weatherData.weather.daily;
        const next7Days = daily.slice(0, 7);

        if (next7Days.length === 0) return null;

        const avgTemp = Math.round(next7Days.reduce((sum, d) => sum + d.tempMax, 0) / next7Days.length);
        const avgHumidity = Math.round(next7Days.reduce((sum, d) => sum + d.humidity, 0) / next7Days.length);
        const totalRain = next7Days.reduce((sum, d) => sum + d.rainAmount, 0);
        const avgWindSpeed = Math.round(next7Days.reduce((sum, d) => sum + d.windSpeed, 0) / next7Days.length * 3.6); // Convert to km/h

        return {
            avgTemp,
            avgHumidity,
            totalRain: totalRain.toFixed(1),
            avgWindSpeed,
            daysWithRain: next7Days.filter(d => d.hasRain || d.rainChance > 30).length,
        };
    };

    const getUVIndexStatus = (uvIndex: number) => {
        if (uvIndex <= 2) return { level: 'low', color: 'text-green-600', bg: 'bg-green-100' };
        if (uvIndex <= 5) return { level: 'moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        if (uvIndex <= 7) return { level: 'high', color: 'text-orange-600', bg: 'bg-orange-100' };
        if (uvIndex <= 10) return { level: 'veryHigh', color: 'text-red-600', bg: 'bg-red-100' };
        return { level: 'extreme', color: 'text-purple-600', bg: 'bg-purple-100' };
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
    const weatherMetrics = getWeatherMetrics();
    const weeklySummary = getWeeklyForecastSummary();

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                                <Activity className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
                                <p className="text-white/80 text-lg">{t('climateInformationSystem')}</p>
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
                    <Card className="border border-gray-100 shadow-md bg-gradient-to-br from-white to-blue-50/30 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-600 text-sm font-medium">Farmers Reached</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1">{dashboardStats.totalFarmers.toLocaleString()}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl shadow-sm">
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-md bg-gradient-to-br from-white to-emerald-50/30 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-600 text-sm font-medium">Messages Sent</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1">{dashboardStats.messagesSent.toLocaleString()}</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-2xl shadow-sm">
                                    <MessageSquare className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-md bg-gradient-to-br from-white to-amber-50/30 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-600 text-sm font-medium">Active Alerts</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1">{dashboardStats.activeAlerts.toLocaleString()}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-xs text-slate-500">
                                            Total Alerts:  {(dashboardStats.totalAlertsCount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-2xl shadow-sm">
                                    <AlertTriangle className="h-6 w-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-100 shadow-md bg-gradient-to-br from-white to-indigo-50/30 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-600 text-sm font-medium">Active Locations</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1">{dashboardStats.activeLocations.toLocaleString()}</p>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-2xl shadow-sm">
                                    <MapPin className="h-6 w-6 text-white" />
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
                        <CardHeader className="bg-white border-b border-gray-200 pb-4">
                            <CardTitle className="flex items-center gap-2 text-slate-900">
                                <Sun className="h-5 w-5 text-yellow-500" />
                                {t('todayForecast')}
                            </CardTitle>
                            <CardDescription className="text-slate-600 flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 p-0 h-auto">
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
                                            <p className="text-sm text-slate-500">
                                                {weatherMetrics?.feelsLike 
                                                    ? `Feels like ${Math.round(weatherMetrics.feelsLike)}°C`
                                                    : `Feels like ${todayWeather.tempMax + 2}°C`
                                                }
                                            </p>
                                        </div>
                                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center shadow-sm">
                                            {getWeatherIcon(todayWeather.conditionMain)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-[#147677]/10 to-[#147677]/20 p-4 rounded-xl border border-[#147677]/30 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CloudRain className="h-4 w-4 text-[#147677]" />
                                                <p className="text-sm font-medium text-slate-700">Rainfall</p>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{todayWeather.rainAmount}mm</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-sky-50/80 to-sky-100/80 p-4 rounded-xl border border-sky-200/50 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Droplets className="h-4 w-4 text-sky-600" />
                                                <p className="text-sm font-medium text-slate-700">Humidity</p>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{todayWeather.humidity}%</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-slate-50/80 to-slate-100/80 p-4 rounded-xl border border-slate-200/50 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Wind className="h-4 w-4 text-slate-600" />
                                                <p className="text-sm font-medium text-slate-700">Wind</p>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">{Math.round(todayWeather.windSpeed * 3.6)} km/h</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 p-4 rounded-xl border border-emerald-200/50 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Eye className="h-4 w-4 text-emerald-600" />
                                                <p className="text-sm font-medium text-slate-700">Soil</p>
                                            </div>
                                            <p className="text-lg font-bold text-slate-900">{todayWeather.soilCondition}</p>
                                        </div>
                                    </div>

                                    {/* Rain Timing Display (only for today) - calculated from hourly data */}
                                    {todayWeather?.hourly && todayWeather.hourly.length > 0 && (
                                        <div className="mt-4">
                                            <RainTimingDisplay hourly={todayWeather.hourly} />
                                        </div>
                                    )}

                                    {/* Hourly Forecast Display (only for today) */}
                                    {todayWeather?.hourly && todayWeather.hourly.length > 0 && (
                                        <div className="mt-4">
                                            <HourlyForecastDisplay hourly={todayWeather.hourly} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t border-slate-100">
                            <Button className="w-full bg-[#147677] hover:bg-[#147677]/90 h-11" onClick={() => router.push('/forecasts')}>
                                {t('viewDetails')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                    
                        {/* Weather Conditions & Metrics */}
                        <Card className="border-0 shadow-md bg-white">
                            <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-b border-slate-200/50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-slate-900">
                                    <Droplets className="h-5 w-5 text-blue-600" />
                                    {t('weatherConditions') || 'Weather Conditions'}
                                </CardTitle>
                                <CardDescription className="text-slate-600">{t('forNextWeek')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {todayWeather && weatherMetrics ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* UV Index */}
                                            {weatherMetrics.uvIndex !== null && (
                                                <div className={`bg-gradient-to-br p-4 rounded-xl border ${getUVIndexStatus(weatherMetrics.uvIndex).bg} border-current`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Sun className="h-4 w-4 text-yellow-600" />
                                                        <span className="font-medium text-slate-900">{t('uvIndex') || 'UV Index'}</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-slate-900">{weatherMetrics.uvIndex}</p>
                                                    <p className={`text-xs font-semibold mt-1 ${getUVIndexStatus(weatherMetrics.uvIndex).color}`}>
                                                        {t(`uv${getUVIndexStatus(weatherMetrics.uvIndex).level}`) || getUVIndexStatus(weatherMetrics.uvIndex).level}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Atmospheric Pressure */}
                                            {weatherMetrics.pressure !== null && (
                                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Activity className="h-4 w-4 text-indigo-600" />
                                                        <span className="font-medium text-slate-900">{t('pressure') || 'Pressure'}</span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-slate-900">{weatherMetrics.pressure} hPa</p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {weatherMetrics.pressure > 1013 ? t('highPressure') || 'High' : t('lowPressure') || 'Low'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Wind Direction */}
                                            <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-xl border border-sky-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Wind className="h-4 w-4 text-sky-600" />
                                                    <span className="font-medium text-slate-900">{t('windDirection') || 'Wind Direction'}</span>
                                                </div>
                                                <p className="text-xl font-bold text-slate-900">{todayWeather.windDirection || weatherMetrics.windDirection}</p>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {todayWeather.windStrength || t('moderate') || 'Moderate'}
                                                </p>
                                            </div>

                                            {/* Cloud Coverage */}
                                            {weatherMetrics.cloudCoverage !== null && (
                                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                        <Cloud className="h-4 w-4 text-slate-600" />
                                                        <span className="font-medium text-slate-900">{t('cloudCoverage') || 'Cloud Coverage'}</span>
                                                </div>
                                                    <p className="text-2xl font-bold text-slate-900">{weatherMetrics.cloudCoverage}%</p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {weatherMetrics.cloudCoverage > 75 ? t('overcast') || 'Overcast' :
                                                         weatherMetrics.cloudCoverage > 50 ? t('mostlyCloudy') || 'Mostly Cloudy' :
                                                         weatherMetrics.cloudCoverage > 25 ? t('partlyCloudy') || 'Partly Cloudy' :
                                                         t('clear') || 'Clear'}
                                                    </p>
                                            </div>
                                            )}

                                            {/* Visibility */}
                                            {weatherMetrics.visibility !== null && (
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                        <Eye className="h-4 w-4 text-blue-600" />
                                                        <span className="font-medium text-slate-900">{t('visibility') || 'Visibility'}</span>
                                                </div>
                                                    <p className="text-2xl font-bold text-slate-900">{weatherMetrics.visibility} km</p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {parseFloat(weatherMetrics.visibility) > 10 ? t('excellent') || 'Excellent' :
                                                         parseFloat(weatherMetrics.visibility) > 5 ? t('good') || 'Good' :
                                                         t('fair') || 'Fair'}
                                                    </p>
                                            </div>
                                            )}

                                            {/* Wind Gust */}
                                            {weatherMetrics.windGust !== null && weatherMetrics.windGust > 0 && (
                                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                        <Zap className="h-4 w-4 text-amber-600" />
                                                        <span className="font-medium text-slate-900">{t('windGust') || 'Wind Gust'}</span>
                                                </div>
                                                    <p className="text-2xl font-bold text-slate-900">{weatherMetrics.windGust} km/h</p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {weatherMetrics.windGust > 50 ? t('strong') || 'Strong' : t('moderate') || 'Moderate'}
                                                    </p>
                                            </div>
                                            )}
                                        </div>

                                        {/* Weekly Forecast Summary */}
                                        {weeklySummary && (
                                            <>
                                        <Separator />
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
                                            <h3 className="font-semibold mb-3 text-slate-900 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-blue-600" />
                                                        {t('weeklyForecast') || '7-Day Forecast Summary'}
                                            </h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-xs text-slate-600 mb-1">{t('averageTemperature') || 'Avg Temperature'}</p>
                                                            <p className="text-lg font-bold text-slate-900">{weeklySummary.avgTemp}°C</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-600 mb-1">{t('averageHumidity') || 'Avg Humidity'}</p>
                                                            <p className="text-lg font-bold text-slate-900">{weeklySummary.avgHumidity}%</p>
                                                        </div>
                                                        <div className="bg-gradient-to-br from-[#147677]/10 to-[#147677]/20 p-4 rounded-xl border border-[#147677]/30 hover:shadow-md transition-shadow">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CloudRain className="h-4 w-4 text-[#147677]" />
                                                                <p className="text-xs font-medium text-slate-700">{t('totalRainfall') || 'Total Rainfall'}</p>
                                                            </div>
                                                            <p className="text-2xl font-bold text-[#147677]">{weeklySummary.totalRain} mm</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-600 mb-1">{t('averageWindSpeed') || 'Avg Wind Speed'}</p>
                                                            <p className="text-lg font-bold text-slate-900">{weeklySummary.avgWindSpeed} km/h</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-600 mb-1">{t('daysWithRain') || 'Rainy Days'}</p>
                                                            <p className="text-lg font-bold text-slate-900">{weeklySummary.daysWithRain} {t('days') || 'days'}</p>
                                                        </div>
                                                    </div>
                                        </div>
                                            </>
                                        )}
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