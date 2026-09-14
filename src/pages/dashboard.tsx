import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Calendar,
    ChevronDown,
    CloudDrizzle,
    CloudRain,
    Droplets,
    MapPin,
    Loader2,
    RefreshCw,
    Wind,
    Users,
    MessageSquare,
    AlertTriangle,
    ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Location, LocationsResponse } from '@/types/farmer';
import { ApiResponse, DailyWeather, WeatherData, WeatherRequestParams } from '@/types/weather';
import { cn } from '@/lib/utils';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const SoftCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('bg-white rounded-2xl shadow-[0_8px_24px_rgba(15,40,80,0.06)]', className)}>
        {children}
    </div>
);

const SunCloudIcon = ({ className }: { className?: string }) => (
    <img
        src="/images/weather-sun-cloud.png"
        alt=""
        className={cn('object-contain', className)}
    />
);

const getWeatherIcon = (condition: string, className?: string): React.ReactElement => {
    const iconMap: { [key: string]: React.ReactElement } = {
        'clear': <SunCloudIcon className={cn('h-10 w-10', className)} />,
        'clouds': <SunCloudIcon className={cn('h-10 w-10', className)} />,
        'rain': <CloudRain className={cn('h-10 w-10 text-[#147677]', className)} />,
        'drizzle': <CloudDrizzle className={cn('h-10 w-10 text-[#147677]', className)} />,
        'snow': <CloudDrizzle className={cn('h-10 w-10 text-[#147677]', className)} />,
        'thunderstorm': <CloudRain className={cn('h-10 w-10 text-[#0f5f5f]', className)} />,
    };

    const conditionKey = (condition || '').toLowerCase();
    return iconMap[conditionKey] || <SunCloudIcon className={cn('h-10 w-10', className)} />;
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
    farmersToday?: number;
    messagesToday?: number;
    alertsToday?: number;
    locationsToday?: number;
};

const Dashboard: NextPage = () => {
    const { t, locale } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [todayWeather, setTodayWeather] = useState<any>(null);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalFarmers: 0,
        messagesSent: 0,
        activeAlerts: 0,
        activeLocations: 0,
        totalFarmersCount: 0,
        totalMessagesCount: 0,
        totalAlertsCount: 0,
        farmersToday: 0,
        messagesToday: 0,
        alertsToday: 0,
        locationsToday: 0,
    });
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    useEffect(() => {
        fetchLocations();
        fetchDashboardStats();
    }, []);

    useEffect(() => {
        if (selectedLocation) {
            fetchWeatherData(selectedLocation.id);
        }
    }, [selectedLocation]);

    const isToday = (value?: string | null) => {
        if (!value) return false;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        return date.toDateString() === new Date().toDateString();
    };

    const parseTimestamp = (value: unknown): number | null => {
        if (value == null || value === '') return null;
        if (value instanceof Date) {
            const time = value.getTime();
            return Number.isNaN(time) ? null : time;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value < 1e12 ? value * 1000 : value;
        }
        if (typeof value === 'string') {
            const numeric = Number(value);
            if (value.trim() !== '' && Number.isFinite(numeric) && numeric > 1e9 && numeric < 1e14) {
                return numeric < 1e12 ? numeric * 1000 : numeric;
            }
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
    };

    const latestTimestamp = (...values: unknown[]): Date | null => {
        const times = values
            .map(parseTimestamp)
            .filter((time): time is number => time != null && time > 0);
        if (!times.length) return null;
        return new Date(Math.max(...times));
    };

    const extractMessageLogs = (raw: any): any[] => {
        const payload = raw?.data ?? raw;
        if (Array.isArray(payload?.data?.results)) return payload.data.results;
        if (Array.isArray(payload?.results)) return payload.results;
        if (Array.isArray(payload?.data?.logs)) return payload.data.logs;
        if (Array.isArray(payload?.logs)) return payload.logs;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
    };

    const fetchDashboardStats = async () => {
        try {
            const [farmersRes, alertsListRes, messagesLogsRes, locsRes] = await Promise.all([
                api.get('/api/admin/farmers').catch((e: any) => e),
                api.get('/api/weather/alerts', { params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc' } }).catch((e: any) => e),
                api.get('/api/weather/admin/logs/messages', {
                    params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc', _ts: Date.now() },
                }).catch(() => null),
                api.get('/api/admin/locations').catch((e: any) => e),
            ]);

            const farmersData = farmersRes?.data?.data?.farmers || farmersRes?.data?.farmers || farmersRes?.farmers || [];
            const totalFarmers = Array.isArray(farmersData)
                ? farmersData.length
                : (farmersRes?.data?.count || farmersRes?.count || 0);
            const totalFarmersCount = farmersRes?.data?.data?.total || farmersRes?.data?.total || farmersRes?.total || totalFarmers;

            const farmersToday = Array.isArray(farmersData)
                ? farmersData.filter((farmer: any) => isToday(farmer.createdAt)).length
                : 0;

            let activeAlerts = 0;
            let totalAlertsCount = 0;

            const alertsPayload = alertsListRes?.data || alertsListRes;
            let alertsArray: any[] = [];
            if (Array.isArray(alertsPayload)) {
                alertsArray = alertsPayload;
            } else if (Array.isArray(alertsPayload?.data?.alerts)) {
                alertsArray = alertsPayload.data.alerts;
            } else if (Array.isArray(alertsPayload?.alerts)) {
                alertsArray = alertsPayload.alerts;
            } else if (Array.isArray(alertsPayload?.data)) {
                alertsArray = alertsPayload.data;
            }

            totalAlertsCount = alertsPayload?.data?.total || alertsPayload?.total || alertsPayload?.pagination?.total || alertsArray.length;

            if (alertsArray.length > 0) {
                const now = Date.now();
                const parsed = alertsArray.map((a: any) => ({
                    status: a.status || (a.isSent ? 'sent' : 'draft'),
                    isSent: Boolean(a.isSent || a.status === 'sent' || a.sentAt),
                    isActive: a.isActive,
                    validUntil: a.validUntil ? Date.parse(a.validUntil) : null,
                }));

                activeAlerts = parsed.filter(p => {
                    if (p.isActive === true) return true;
                    if (p.isSent && p.validUntil && p.validUntil > now) return true;
                    return false;
                }).length;
            }

            const alertsToday = alertsArray.filter((alert: any) => isToday(alert.sentAt) || isToday(alert.createdAt)).length;

            let messagesTotalFromLogs = 0;
            let totalMessagesCount = 0;
            if (messagesLogsRes) {
                const raw = messagesLogsRes;
                const payloadRoot = raw?.data ?? raw;

                const summaryNode = payloadRoot?.data?.summary || payloadRoot?.summary || null;
                const paginationNode = payloadRoot?.data?.pagination || payloadRoot?.pagination || null;

                messagesTotalFromLogs = (
                    (typeof summaryNode?.total === 'number' ? summaryNode.total : undefined) ??
                    (typeof paginationNode?.total === 'number' ? paginationNode.total : undefined) ??
                    0
                );

                totalMessagesCount = (
                    (typeof paginationNode?.total === 'number' ? paginationNode.total : undefined) ??
                    (typeof summaryNode?.total === 'number' ? summaryNode.total : undefined) ??
                    0
                );
            }

            const messagesSent = messagesTotalFromLogs;
            const totalMessages = totalMessagesCount;
            const messageLogs = extractMessageLogs(messagesLogsRes);
            const messagesToday = messageLogs.filter((log: any) =>
                isToday(log.sentAt) || isToday(log.timestamp) || isToday(log.createdAt)
            ).length;

            const locationsData = locsRes?.data?.data?.locations || locsRes?.data?.locations || locsRes?.locations || [];
            const activeLocations = Array.isArray(locationsData)
                ? locationsData.length
                : (locsRes?.data?.count || locsRes?.count || (locations?.length || 0));
            const totalLocationsCount = locsRes?.data?.data?.total || locsRes?.data?.total || locsRes?.total || locsRes?.pagination?.total || activeLocations;
            const locationsToday = Array.isArray(locationsData)
                ? locationsData.filter((location: any) => isToday(location.createdAt)).length
                : 0;

            setDashboardStats({
                totalFarmers,
                messagesSent,
                activeAlerts,
                activeLocations,
                totalFarmersCount,
                totalMessagesCount: totalMessages,
                totalAlertsCount,
                totalLocationsCount,
                farmersToday,
                messagesToday,
                alertsToday,
                locationsToday,
            });
        } catch (error: any) {
            console.error('Failed to fetch dashboard stats:', error);
            setDashboardStats({
                totalFarmers: 0,
                messagesSent: 0,
                activeAlerts: 0,
                activeLocations: locations.length || 0,
                totalFarmersCount: 0,
                totalMessagesCount: 0,
                totalAlertsCount: 0,
                totalLocationsCount: locations.length || 0,
                farmersToday: 0,
                messagesToday: 0,
                alertsToday: 0,
                locationsToday: 0,
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

            const payload = response.data as any;
            const updated = latestTimestamp(
                payload.updatedAt,
                payload.createdAt,
                payload.storedAt,
                payload.lastUpdated,
                payload.lastUpdate,
                payload.fetchedAt,
                payload.timestamp,
                payload.weatherDataUpdatedAt,
                payload.alert?.createdAt,
                payload.alert?.updatedAt,
                payload.weather?.updatedAt,
                payload.weather?.createdAt,
                payload.weather?.current?.dt,
                payload.metadata?.storedAt,
                payload.metadata?.updatedAt,
                today?.date,
            );
            setLastUpdatedAt(updated);

        } catch (error: any) {
            console.error('Byanze kubona amakuru y\'ibihe:', error);
            toast.error(t('failedToLoadWeather'));
        }
    };

    const handleRefresh = async () => {
        if (!selectedLocation) return;

        setIsRefreshing(true);
        try {
            await fetchWeatherData(selectedLocation.id);
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning');
        if (hour < 17) return t('goodAfternoon');
        return t('goodEvening');
    };

    const dateLocale = locale === 'rw' ? 'rw-RW' : undefined;

    const shortWeekday = (dayOfWeek?: string) => {
        const map: Record<string, string> = {
            sunday: 'daySun',
            monday: 'dayMon',
            tuesday: 'dayTue',
            wednesday: 'dayWed',
            thursday: 'dayThu',
            friday: 'dayFri',
            saturday: 'daySat',
        };
        const key = map[(dayOfWeek || '').toLowerCase()];
        return key ? t(key) : (dayOfWeek || '').slice(0, 3);
    };

    const translateCondition = (condition?: string) => {
        if (!condition) return '';
        const key = condition.toLowerCase();
        const translated = t(key);
        return translated !== key ? translated : condition;
    };

    const weeklyChartConfig = {
        tempMax: { label: t('maxTempShort'), color: '#147677' },
        tempMin: { label: t('minTempShort'), color: '#F5A623' },
        rain: { label: t('rainAmountMm'), color: '#F5A623' },
        rainChance: { label: t('rainChancePercent'), color: '#147677' },
    };

    const getWeeklyDays = (): DailyWeather[] => {
        if (!weatherData?.weather?.daily) return [];
        return weatherData.weather.daily.slice(0, 7);
    };

    const getWeeklyChartData = () => {
        return getWeeklyDays().map((day) => ({
            day: day.isToday
                ? t('today')
                : shortWeekday(day.dayOfWeek) || day.formattedDate,
            fullDay: day.dayOfWeek || day.formattedDate,
            tempMax: day.tempMax,
            tempMin: day.tempMin,
            rain: Number(day.rainAmount) || 0,
            humidity: day.humidity,
            rainChance: day.rainChance,
            condition: day.conditionMain,
            isToday: day.isToday,
        }));
    };

    const getWeeklyForecastSummary = () => {
        const next7Days = getWeeklyDays();
        if (next7Days.length === 0) return null;

        const avgTemp = Math.round(next7Days.reduce((sum, d) => sum + d.tempMax, 0) / next7Days.length);
        const avgHumidity = Math.round(next7Days.reduce((sum, d) => sum + d.humidity, 0) / next7Days.length);
        const totalRain = next7Days.reduce((sum, d) => sum + d.rainAmount, 0);
        const avgWindSpeed = Math.round(next7Days.reduce((sum, d) => sum + d.windSpeed, 0) / next7Days.length * 3.6);
        const daysWithRain = next7Days.filter(d => d.hasRain || d.rainChance > 30).length;

        return {
            avgTemp,
            avgHumidity,
            totalRain: totalRain.toFixed(1),
            avgWindSpeed,
            daysWithRain,
            dryDays: Math.max(next7Days.length - daysWithRain, 0),
        };
    };

    const getConditionBreakdown = () => {
        const days = getWeeklyDays();
        const counts: Record<string, number> = {};
        days.forEach((day) => {
            const key = day.conditionMain || 'Clouds';
            counts[key] = (counts[key] || 0) + 1;
        });
        const palette = ['#147677', '#F5A623', '#7AB8B8', '#FDBA74', '#0f5f5f'];
        return Object.entries(counts).map(([name, value], index) => ({
            name: translateCondition(name),
            value,
            fill: palette[index % palette.length],
        }));
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-[#147677]" />
                        <p className="mt-2 text-slate-500">{t('loadingLocations')}</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const weeklySummary = getWeeklyForecastSummary();
    const weeklyChartData = getWeeklyChartData();
    const conditionBreakdown = getConditionBreakdown();
    const currentWeather = weatherData?.weather?.current;
    const displayTemp = currentWeather?.temp ?? todayWeather?.tempMax;
    const displayCondition = currentWeather?.condition || todayWeather?.condition || '';

    const rainyDonut = weeklySummary ? [
        { name: t('rainy'), value: weeklySummary.daysWithRain, fill: '#F5A623' },
        { name: t('dry'), value: weeklySummary.dryDays, fill: '#C5E0E0' },
    ] : [];

    const stats = [
        {
            label: t('totalFarmersReached'),
            value: dashboardStats.totalFarmers,
            caption: t('allTime'),
            captionTone: 'teal' as const,
            icon: <Users className="h-5 w-5 text-[#7B8CFF]" strokeWidth={2} />,
            iconBg: 'bg-[#E8EEFF]',
        },
        {
            label: t('totalMessagesSent'),
            value: dashboardStats.messagesSent,
            caption: t('allTime'),
            captionTone: 'teal' as const,
            icon: <MessageSquare className="h-5 w-5 text-[#3DCC8A]" strokeWidth={2} />,
            iconBg: 'bg-[#E5F8EE]',
        },
        {
            label: t('activeAlerts'),
            value: dashboardStats.activeAlerts,
            caption: t('todayCount', { count: (dashboardStats.alertsToday || 0).toLocaleString() }),
            captionTone: 'orange' as const,
            icon: <AlertTriangle className="h-5 w-5 text-[#F5A623]" strokeWidth={2} />,
            iconBg: 'bg-[#FDECDC]',
        },
        {
            label: t('totalActiveLocations'),
            value: dashboardStats.activeLocations,
            caption: t('inTheSystem'),
            captionTone: 'teal' as const,
            icon: <MapPin className="h-5 w-5 text-[#C084FC]" strokeWidth={2} />,
            iconBg: 'bg-[#F3E8FF]',
        },
    ];

    const locationMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedLocation?.name || t('selectLocation')}
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
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
    );

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-3">
                <div className="bg-white px-4 py-3 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-[#147677] tracking-tight">
                                {getGreeting()}{user?.username ? `, ${user.username.split(' ')[0]}!` : '!'}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {new Date().toLocaleDateString(dateLocale, {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#f9fafb] px-3 py-2 rounded-lg border border-gray-200 text-slate-500">
                                <Calendar className="h-4 w-4 text-[#147677]" />
                                <span className="text-sm font-medium">{t(getCurrentSeason())}</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="rounded-lg border-gray-200 text-slate-600 hover:bg-[#f9fafb]"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? t('refreshing') : t('refresh')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {stats.map((stat) => (
                        <SoftCard key={stat.label} className="px-5 py-6">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-slate-400 text-xs">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-800 tracking-tight">
                                        {stat.value.toLocaleString()}
                                    </p>
                                    <div className="mt-1.5 text-xs">
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-0.5 font-medium',
                                                stat.captionTone === 'orange' ? 'text-[#F5A623]' : 'text-[#147677]'
                                            )}
                                        >
                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                            {stat.caption}
                                        </span>
                                    </div>
                                </div>
                                <div className={cn('h-12 w-12 rounded-full flex items-center justify-center shrink-0', stat.iconBg)}>
                                    {stat.icon}
                                </div>
                            </div>
                        </SoftCard>
                    ))}
                </div>

                <div className="grid gap-3 grid-cols-1 xl:grid-cols-12">
                    <SoftCard className="p-3 xl:col-span-8">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-800">
                                        {t('weeklyForecast')}
                                    </h2>
                                    <p className="text-xs text-slate-400">{selectedLocation?.name}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#147677]" />
                                        {t('maxTempShort')}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#F5A623]" />
                                        {t('minTempShort')}
                                    </span>
                                </div>
                            </div>
                            {weeklyChartData.length > 0 ? (
                                <>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {weeklyChartData.map((day) => (
                                        <div
                                            key={day.fullDay + day.day}
                                            className={cn(
                                                'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl',
                                                day.isToday ? 'bg-[#147677]/10' : ''
                                            )}
                                        >
                                            <span className="text-[11px] text-slate-400">{day.day}</span>
                                            {getWeatherIcon(day.condition, 'h-5 w-5')}
                                            <span className="text-sm font-semibold text-slate-700">{day.tempMax}°</span>
                                        </div>
                                    ))}
                                </div>
                                <ChartContainer config={weeklyChartConfig} className="h-[110px] w-full aspect-auto">
                                    <AreaChart data={weeklyChartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="tempMaxFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#147677" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#147677" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="tempMinFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 8" stroke="#E2E8F0" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Area type="monotone" dataKey="tempMax" stroke="#147677" strokeWidth={3} fill="url(#tempMaxFill)" name={t('maxTempShort')} />
                                        <Area type="monotone" dataKey="tempMin" stroke="#F5A623" strokeWidth={3} fill="url(#tempMinFill)" name={t('minTempShort')} />
                                    </AreaChart>
                                </ChartContainer>
                                {weeklySummary && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                        <div className="rounded-xl bg-[#F3F8F8] px-2 py-1 text-center">
                                            <p className="text-[10px] text-slate-400">{t('averageTemperature')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{weeklySummary.avgTemp}°C</p>
                                        </div>
                                        <div className="rounded-xl bg-[#F3F8F8] px-2 py-1 text-center">
                                            <p className="text-[10px] text-slate-400">{t('averageHumidity')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{weeklySummary.avgHumidity}%</p>
                                        </div>
                                        <div className="rounded-xl bg-[#F3F8F8] px-2 py-1 text-center">
                                            <p className="text-[10px] text-slate-400">{t('totalRainfall')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{weeklySummary.totalRain} mm</p>
                                        </div>
                                        <div className="rounded-xl bg-[#F3F8F8] px-2 py-1 text-center">
                                            <p className="text-[10px] text-slate-400">{t('averageWindSpeed')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{weeklySummary.avgWindSpeed} km/h</p>
                                        </div>
                                    </div>
                                )}
                                </>
                            ) : (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="animate-spin h-6 w-6 text-[#147677]" />
                                </div>
                            )}
                    </SoftCard>

                    <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] p-4 text-white shadow-[0_12px_28px_rgba(20,118,119,0.3)] flex flex-col h-full">
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            {locationMenu}
                        </div>

                        {todayWeather ? (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center py-3 cursor-pointer"
                                onClick={() => router.push('/forecasts')}
                            >
                                {getWeatherIcon(todayWeather.conditionMain || currentWeather?.conditionMain, 'h-16 w-16')}
                                <p className="text-xs text-white/80 mt-2">
                                    {t('today')}, {new Date().toLocaleDateString(dateLocale, {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p className="text-5xl font-bold tracking-tight leading-none mt-1">{Math.round(displayTemp)}°</p>
                                <p className="text-white/90 capitalize text-sm mt-1">{translateCondition(displayCondition) || t('todayForecast')}</p>
                                <div className="flex items-center gap-3 text-xs text-white/85 mt-3">
                                    <span className="flex items-center gap-1.5">
                                        <Wind className="h-3.5 w-3.5" />
                                        {todayWeather ? `${Math.round(todayWeather.windSpeed * 3.6)} km/h` : '--'}
                                    </span>
                                    <span className="text-white/40">|</span>
                                    <span className="flex items-center gap-1.5">
                                        <Droplets className="h-3.5 w-3.5" />
                                        {t('humidity')} {todayWeather ? `${todayWeather.humidity}%` : '--'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin h-6 w-6 text-white" />
                            </div>
                        )}
                    </div>

                    <SoftCard className="p-3 xl:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-semibold text-slate-800">{t('totalRainfall')}</h2>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F5A623]" />mm</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#147677]" />%</span>
                            </div>
                        </div>
                        {weeklyChartData.length > 0 ? (
                            <ChartContainer config={weeklyChartConfig} className="h-[120px] w-full aspect-auto">
                                <BarChart data={weeklyChartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="rain" fill="#F5A623" radius={[6, 6, 6, 6]} barSize={8} name={t('rainAmountMm')} />
                                    <Bar dataKey="rainChance" fill="#147677" radius={[6, 6, 6, 6]} barSize={8} name={t('rainChancePercent')} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex justify-center py-6">
                                <Loader2 className="animate-spin h-5 w-5 text-[#147677]" />
                            </div>
                        )}
                    </SoftCard>

                    <SoftCard className="p-3 xl:col-span-4">
                        <h2 className="text-sm font-semibold text-slate-800">{t('weatherConditions')}</h2>
                        {conditionBreakdown.length > 0 ? (
                            <div className="relative">
                                <ChartContainer config={weeklyChartConfig} className="h-[120px] w-full aspect-auto">
                                    <PieChart>
                                        <Pie data={conditionBreakdown} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                                            {conditionBreakdown.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    </PieChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold text-slate-800">{conditionBreakdown[0]?.value || 0}</span>
                                    <span className="text-[10px] text-slate-400 capitalize">{conditionBreakdown[0]?.name}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center py-6">
                                <Loader2 className="animate-spin h-5 w-5 text-[#147677]" />
                            </div>
                        )}
                    </SoftCard>

                    <SoftCard className="p-3 xl:col-span-4">
                        <h2 className="text-sm font-semibold text-slate-800">{t('daysWithRain')}</h2>
                        {weeklySummary ? (
                            <div className="relative">
                                <ChartContainer config={weeklyChartConfig} className="h-[120px] w-full aspect-auto">
                                    <PieChart>
                                        <Pie data={rainyDonut} dataKey="value" nameKey="name" innerRadius={32} outerRadius={46} paddingAngle={3} stroke="none">
                                            {rainyDonut.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    </PieChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold text-slate-800">{weeklySummary.daysWithRain}</span>
                                    <span className="text-[10px] text-slate-400">{t('days')}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center py-6">
                                <Loader2 className="animate-spin h-5 w-5 text-[#147677]" />
                            </div>
                        )}
                    </SoftCard>
                </div>

                <p className="text-center text-xs text-slate-400">
                    {t('dataLastUpdated')}: {lastUpdatedAt ? lastUpdatedAt.toLocaleString(dateLocale) : '—'}
                    <span className="mx-2">·</span>
                    {t('updatedDaily')}
                </p>
            </div>
        </AppLayout>
    );
};

export default Dashboard;
