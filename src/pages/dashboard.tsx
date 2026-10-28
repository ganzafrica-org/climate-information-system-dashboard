import React, { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
    Bell,
    Info,
    X,
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
import { rainfallCategory } from '@/lib/weather';
import { addISODays, kigaliNowParts, kigaliTodayISO, kigaliWeekDates, monthName, weekday, KIGALI_TZ } from '@/lib/weatherFormat';
import { locationDisplayName, pickDefaultLocation, sortLocationsDistrictFirst, isDistrictLocationName } from '@/lib/assignment';
import { useSectorHistory } from '@/lib/weather';
import { isSigningInAgain, isUnauthorized } from '@/lib/session';

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
    sentYesterday?: number;
    failedYesterday?: number;
    alertsToday?: number;
    locationsToday?: number;
    messagesScope?: 'sector' | 'district' | 'all' | null;
    messagesSectorName?: string | null;
};


const Dashboard: NextPage = () => {
    const { t, locale } = useLanguage();
    const { user, isLoading: authLoading } = useAuth();
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
        sentYesterday: 0,
        failedYesterday: 0,
        alertsToday: 0,
        locationsToday: 0,
        messagesScope: null,
        messagesSectorName: null,
    });
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [dismissedWatch, setDismissedWatch] = useState<string | null>(null);
    const weatherRequest = useRef(0);
    const todayIso = kigaliTodayISO();
    const weekStart = kigaliWeekDates(todayIso)[0];
    const yesterdayIso = addISODays(todayIso, -1);
    const savedWeekQ = useSectorHistory(weekStart, yesterdayIso, yesterdayIso >= weekStart);

    useEffect(() => {
        try {
            setDismissedWatch(sessionStorage.getItem('weather-watch-dismissed'));
        } catch {
            /* keep the notice visible if storage is blocked */
        }
    }, []);

    useEffect(() => {
        fetchLocations();
        fetchDashboardStats();
    }, []);

    useEffect(() => {
        if (authLoading || !locations.length) return;
        const picked = pickDefaultLocation(user, locations);
        if (!picked) return;
        setSelectedLocation((current) => {
            if (!current || !locations.some((location) => location.id === current.id)) return picked;
            if (user?.assignmentLevel === "sector" && user.sectorName && current.name !== user.sectorName) {
                return picked;
            }
            return current;
        });
    }, [authLoading, user, locations]);

    useEffect(() => {
        if (!selectedLocation) return;
        const requestId = ++weatherRequest.current;
        setWeatherData(null);
        setTodayWeather(null);
        fetchWeatherData(selectedLocation.id, requestId);
    }, [selectedLocation?.id, locale]);

    const isToday = (value?: string | null) => {
        if (!value) return false;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        return kigaliTodayISO(date) === kigaliTodayISO();
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

    const fetchDashboardStats = async () => {
        try {
            const [farmersRes, alertsListRes, messagesDashRes, locsRes] = await Promise.all([
                api.get('/api/admin/farmers').catch((e: any) => e),
                api.get('/api/weather/alerts', { params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc' } }).catch((e: any) => e),
                api.get('/api/weather/dashboard/messages').catch(() => null),
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

            let messagesSent = 0;
            let totalMessages = 0;
            let sentYesterday = 0;
            let failedYesterday = 0;
            let messagesScope: DashboardStats['messagesScope'] = null;
            let messagesSectorName: string | null = null;

            const dashNode = messagesDashRes?.data ?? messagesDashRes;
            const hasDashCounts = dashNode && (
                dashNode.totalSent != null
                || dashNode.sentYesterday != null
                || dashNode.failedYesterday != null
                || dashNode.sentToday != null
                || dashNode.failedToday != null
            );

            if (hasDashCounts) {
                messagesSent = Number(dashNode.totalSent) || 0;
                totalMessages = messagesSent;
                sentYesterday = Number(dashNode.sentYesterday ?? dashNode.sentToday) || 0;
                failedYesterday = Number(dashNode.failedYesterday ?? dashNode.failedToday) || 0;
                messagesScope = dashNode.scope === 'sector' || dashNode.scope === 'district' || dashNode.scope === 'all'
                    ? dashNode.scope
                    : null;
                messagesSectorName = dashNode.sectorName || null;
            } else {
                const messagesLogsRes = await api.get('/api/weather/admin/logs/messages', {
                    params: { limit: 1000, sortField: 'createdAt', sortOrder: 'desc', _ts: Date.now() },
                }).catch(() => null);

                if (messagesLogsRes) {
                    const payloadRoot = messagesLogsRes?.data ?? messagesLogsRes;
                    const summaryNode = payloadRoot?.data?.summary || payloadRoot?.summary || null;
                    const paginationNode = payloadRoot?.data?.pagination || payloadRoot?.pagination || null;
                    messagesSent = (
                        (typeof summaryNode?.total === 'number' ? summaryNode.total : undefined) ??
                        (typeof paginationNode?.total === 'number' ? paginationNode.total : undefined) ??
                        0
                    );
                    totalMessages = messagesSent;
                    sentYesterday = Number(summaryNode?.sentYesterday ?? summaryNode?.sentToday) || 0;
                    failedYesterday = Number(summaryNode?.failedYesterday ?? summaryNode?.failedToday) || 0;
                }
            }

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
                sentYesterday,
                failedYesterday,
                alertsToday,
                locationsToday,
                messagesScope,
                messagesSectorName,
            });
        } catch (error: any) {
            if (isUnauthorized(error) || error?.sessionExpired) return;
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
                sentYesterday: 0,
                failedYesterday: 0,
                alertsToday: 0,
                locationsToday: 0,
                messagesScope: null,
                messagesSectorName: null,
            });
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: { limit: 100 }
            });
            const list = sortLocationsDistrictFirst(response.data.locations || []);
            setLocations(list);
            const picked = pickDefaultLocation(user, list);
            if (picked) setSelectedLocation(picked);
        } catch (error: any) {
            if (isUnauthorized(error) || error?.sessionExpired) return;
            toast.error(t('failedToLoadLocations'));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWeatherData = async (locationId: number, requestId = ++weatherRequest.current) => {
        try {
            const params: WeatherRequestParams = { type: 'daily', createAlert: false };
            const response = await api.get<ApiResponse<WeatherData>>(
                `/api/weather/location/${locationId}`,
                { params }
            );
            if (requestId !== weatherRequest.current) return;

            setWeatherData(response.data);

            const today = response.data.weather.daily.find((day) => day.date === kigaliTodayISO()) || null;
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
            if (requestId !== weatherRequest.current) return;
            if (isUnauthorized(error) || error?.sessionExpired) return;
            toast.error(t('failedToLoadWeather'));
        }
    };

    const handleRefresh = async () => {
        if (!selectedLocation) return;

        setIsRefreshing(true);
        try {
            await fetchWeatherData(selectedLocation.id);
            await fetchDashboardStats();
            if (isSigningInAgain()) return;
            toast.success(t('weatherDataRefreshed'));
        } catch (error) {
            if (isUnauthorized(error) || isSigningInAgain()) return;
            toast.error(t('failedToRefreshWeather'));
        } finally {
            setIsRefreshing(false);
        }
    };

    const getCurrentSeason = () => {
        const month = kigaliNowParts().month;
        if (month >= 9 || month <= 2) return 'seasons.seasonA';
        if (month >= 3 && month <= 6) return 'seasons.seasonB';
        return 'seasons.seasonC';
    };

    const getGreeting = () => {
        const hour = kigaliNowParts().hour;
        if (hour < 12) return t('goodMorning');
        if (hour < 17) return t('goodAfternoon');
        return t('goodEvening');
    };

    const dateLocale = locale === 'rw' ? 'rw-RW' : undefined;
    const lang = locale === 'rw' ? 'rw' : 'en';

    const namedDay = (date: Date) => {
        const week = weekday(date, lang, true);
        const month = monthName(date.getMonth(), lang, true);
        const dayNum = date.getDate();
        if (lang === 'rw') {
            const bare = week.replace(/^Kuwa\s+/i, '').replace(/^Ku\s+/i, '');
            const dayName = bare.charAt(0).toUpperCase() + bare.slice(1);
            return `${dayName}, ${dayNum} ${month}`;
        }
        return `${week}, ${month} ${dayNum}`;
    };

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

    const shortWeekdayFromDate = (date?: string) => {
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
        const [year, month, day] = date.split('-').map(Number);
        const keys = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];
        return t(keys[new Date(year, month - 1, day, 12).getDay()]);
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
        rainChance: { label: t('rainChancePercent'), color: '#147677' },
    };

    const getWeeklyDays = (): DailyWeather[] => {
        if (!weatherData?.weather?.daily) return [];
        return weatherData.weather.daily.slice(0, 7);
    };

    const getWeeklyChartData = () => {
        const place = selectedLocation ? locationDisplayName(selectedLocation) : "";
        const savedRows = (() => {
            const data = savedWeekQ.data;
            if (!data || !place) return [];
            const direct = data[place]?.records;
            if (direct) return direct;
            if (isDistrictLocationName(place)) {
                return Object.entries(data).find(([name]) => isDistrictLocationName(name))?.[1]?.records ?? [];
            }
            return [];
        })();
        const savedByDate = new Map(
            savedRows.filter((row) => row.matchedDay && row.date < todayIso).map((row) => [row.date, row])
        );
        const byDate = new Map(getWeeklyDays().filter((day) => day.date).map((day) => [day.date, day]));
        return kigaliWeekDates(todayIso).flatMap((iso) => {
            const day = byDate.get(iso);
            const saved = savedByDate.get(iso);
            const label = iso === todayIso ? t('today') : shortWeekdayFromDate(iso) || iso;
            if (day) {
                return [{
                    day: label,
                    fullDay: day.dayOfWeek || iso,
                    tempMax: day.tempMax,
                    tempMin: day.tempMin,
                    rain: Number(day.rainAmount) || 0,
                    rainCategory: day.rainCategory,
                    peakRainHour: day.peakRainHour,
                    humidity: day.humidity,
                    rainChance: day.rainChance,
                    condition: day.conditionMain,
                    isToday: iso === todayIso,
                    missing: false,
                }];
            }
            if (!saved) return [];
            return [{
                day: label,
                fullDay: iso,
                tempMax: saved.max,
                tempMin: saved.min,
                rain: Number(saved.rain) || 0,
                rainCategory: saved.rainCategory || undefined,
                peakRainHour: null,
                humidity: saved.humidity ?? 0,
                rainChance: saved.rainChance ?? 0,
                condition: saved.conditionMain || "",
                isToday: false,
                missing: false,
            }];
        });
    };

    const getWeeklyForecastSummary = () => {
        const next7Days = getWeeklyDays();
        if (next7Days.length === 0) return null;

        const avgTemp = Math.round(next7Days.reduce((sum, day) => sum + ((Number(day.tempMin) || 0) + (Number(day.tempMax) || 0)) / 2, 0) / next7Days.length);
        const avgHumidity = Math.round(next7Days.reduce((sum, d) => sum + d.humidity, 0) / next7Days.length);
        const totalRain = next7Days.reduce((sum, d) => sum + d.rainAmount, 0);
        const avgWindSpeed = Math.round(next7Days.reduce((sum, d) => sum + d.windSpeed, 0) / next7Days.length * 3.6);
        const daysWithRain = next7Days.filter((day) => (Number(day.rainAmount) || 0) >= 1).length;

        return {
            avgTemp,
            avgHumidity,
            totalRain: totalRain.toFixed(1),
            avgWindSpeed,
            daysWithRain,
            dryDays: Math.max(next7Days.length - daysWithRain, 0),
        };
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
    const currentWeather = weatherData?.weather?.current;
    const displayTemp = currentWeather?.temp ?? todayWeather?.tempMax;
    const displayCondition = currentWeather?.condition || todayWeather?.condition || '';

    const rainyDonut = weeklySummary ? [
        { name: t('rainy'), value: weeklySummary.daysWithRain, fill: '#F5A623' },
        { name: t('dry'), value: weeklySummary.dryDays, fill: '#C5E0E0' },
    ] : [];

    const formatMm = (value: number) => {
        const mm = Number(value) || 0;
        if (Number.isInteger(mm)) return String(mm);
        return String(parseFloat(mm.toPrecision(12)));
    };

    const rainCatOf = (day: { rainCategory?: string | null; rainAmount?: number; rain?: number }) => {
        const known = ['no_rain', 'trace', 'light_rain', 'moderate_rain', 'heavy_rain', 'very_heavy'];
        if (day.rainCategory && known.includes(day.rainCategory)) return day.rainCategory;
        return rainfallCategory(Number(day.rainAmount ?? day.rain) || 0);
    };

    const weatherIconKey = (rain: string, condition?: string) => {
        if (rain === 'light_rain') return 'drizzle';
        if (rain === 'moderate_rain' || rain === 'heavy_rain' || rain === 'very_heavy') return 'rain';
        return condition || 'clouds';
    };

    const todayRainLabel = todayWeather
        ? `${t(`wx.rainCat.${rainCatOf(todayWeather)}`)} · ${formatMm(Number(todayWeather.rainAmount) || 0)} mm`
        : '';

    const formatWatchDay = (day: DailyWeather) => {
        if (day.date && /^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
            const [year, month, date] = day.date.split('-').map(Number);
            return namedDay(new Date(year, month - 1, date, 12));
        }
        return day.dayOfWeek || day.formattedDate || '';
    };

    type WatchKind = 'very_heavy' | 'heavy_rain' | 'hot' | 'heavy_hot' | 'very_heavy_hot';

    const watchKind = (day: DailyWeather): WatchKind | null => {
        const rain = rainCatOf(day);
        const hot = Number(day.tempMax) >= 26;
        const veryHeavy = rain === 'very_heavy';
        const heavy = rain === 'heavy_rain' || veryHeavy;
        if (!heavy && !hot) return null;
        if (veryHeavy && hot) return 'very_heavy_hot';
        if (heavy && hot) return 'heavy_hot';
        if (veryHeavy) return 'very_heavy';
        if (rain === 'heavy_rain') return 'heavy_rain';
        return 'hot';
    };

    const watchDays = getWeeklyDays()
        .map((day) => ({ day, kind: watchKind(day) }))
        .filter((item): item is { day: DailyWeather; kind: WatchKind } => item.kind != null);

    const watchMessageKey: Record<WatchKind, string> = {
        very_heavy: 'weatherWatchVeryHeavy',
        heavy_rain: 'weatherWatchHeavy',
        hot: 'weatherWatchHot',
        heavy_hot: 'weatherWatchHeavyHot',
        very_heavy_hot: 'weatherWatchVeryHeavyHot',
    };

    const watchLine = (day: DailyWeather, kind: WatchKind) => t(watchMessageKey[kind], {
        location: selectedLocation ? locationDisplayName(selectedLocation) : '',
        day: formatWatchDay(day),
        mm: formatMm(Number(day.rainAmount) || 0),
    });

    const heavyWatch = watchDays.filter((item) => item.kind !== 'hot');
    const firstWatch = heavyWatch[0];
    const watchKey = firstWatch
        ? `${selectedLocation?.id || 'all'}:${firstWatch.day.date}:${firstWatch.kind}:${formatMm(Number(firstWatch.day.rainAmount) || 0)}`
        : '';
    const bannerVisible = Boolean(firstWatch) && dismissedWatch !== watchKey;

    const hideWatchBanner = () => {
        setDismissedWatch(watchKey);
        try {
            sessionStorage.setItem('weather-watch-dismissed', watchKey);
        } catch {
            /* the banner still closes for this page view */
        }
    };

    const highlightDays = (() => {
        const days = getWeeklyDays();
        const byRain = [...days].sort((a, b) =>
            (Number(b.rainAmount) || 0) - (Number(a.rainAmount) || 0) || String(a.date).localeCompare(String(b.date))
        );
        const byHeat = [...days].sort((a, b) =>
            (Number(b.tempMax) || 0) - (Number(a.tempMax) || 0) || String(a.date).localeCompare(String(b.date))
        );
        const hot = (day: DailyWeather) => Number(day.tempMax) >= 26;
        const heavy = (day: DailyWeather) => {
            const rain = rainCatOf(day);
            return rain === 'heavy_rain' || rain === 'very_heavy';
        };
        const moderate = (day: DailyWeather) => rainCatOf(day) === 'moderate_rain';
        const picked: { day: DailyWeather; reason: 'rain' | 'temperature' | 'both' }[] = [];
        const already = (day: DailyWeather) => picked.some((item) => item.day.date === day.date);
        const add = (day: DailyWeather, why: 'rain' | 'temperature') => {
            if (picked.length >= 3 || already(day)) return;
            const rainy = heavy(day) || moderate(day);
            const reason = hot(day) && rainy ? 'both' : why === 'temperature' ? 'temperature' : hot(day) ? 'both' : 'rain';
            picked.push({ day, reason });
        };
        byRain.forEach((day) => { if (heavy(day)) add(day, 'rain'); });
        byHeat.forEach((day) => { if (hot(day)) add(day, 'temperature'); });
        byRain.forEach((day) => { if (moderate(day)) add(day, 'rain'); });
        byRain.forEach((day) => add(day, 'rain'));
        return picked;
    })();

    const highlightLabel = (day: DailyWeather) => {
        if (!day.date || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return day.dayOfWeek || '';
        const [year, month, date] = day.date.split('-').map(Number);
        const parsed = new Date(year, month - 1, date, 12);
        return `${weekday(parsed, lang, true)} ${parsed.getDate()}`;
    };

    const stats = [
        {
            label: t('totalFarmersReached'),
            value: dashboardStats.totalFarmers,
            captions: [{ text: t('allTime'), tone: 'teal' as const, arrow: true }],
            icon: <Users className="h-5 w-5 text-[#7B8CFF]" strokeWidth={2} />,
            iconBg: 'bg-[#E8EEFF]',
        },
        {
            label: t('totalMessagesSent'),
            value: dashboardStats.messagesSent,
            subtitle: dashboardStats.messagesScope === 'sector' ? dashboardStats.messagesSectorName || undefined : undefined,
            captions: [{ text: t('allTime'), tone: 'teal' as const, arrow: true }],
            icon: <MessageSquare className="h-5 w-5 text-[#3DCC8A]" strokeWidth={2} />,
            iconBg: 'bg-[#E5F8EE]',
        },
        {
            label: t('activeAlerts'),
            value: dashboardStats.activeAlerts,
            captions: [{
                text: t('todayCount', { count: (dashboardStats.alertsToday || 0).toLocaleString() }),
                tone: 'orange' as const,
                arrow: true,
            }],
            icon: <AlertTriangle className="h-5 w-5 text-[#F5A623]" strokeWidth={2} />,
            iconBg: 'bg-[#FDECDC]',
        },
        {
            label: t('totalActiveLocations'),
            value: dashboardStats.activeLocations,
            captions: [{ text: t('inTheSystem'), tone: 'teal' as const, arrow: true }],
            icon: <MapPin className="h-5 w-5 text-[#C084FC]" strokeWidth={2} />,
            iconBg: 'bg-[#F3E8FF]',
        },
    ];

    const locationMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedLocation ? locationDisplayName(selectedLocation) : t('selectLocation')}
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[min(20rem,calc(100vh-6rem))] overflow-y-auto">
                {locations.map((location) => (
                    <DropdownMenuItem
                        key={location.id}
                        onClick={() => setSelectedLocation(location)}
                    >
                        {locationDisplayName(location)}
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
                {bannerVisible && firstWatch && (
                    <div className="flex items-start gap-3 rounded-lg bg-[#F6D452] px-4 py-2.5 text-[#3F2E04]">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8B931]">
                            <Bell className="h-4 w-4" />
                        </span>
                        <p className="flex-1 text-sm font-medium leading-6">
                            {watchLine(firstWatch.day, firstWatch.kind)}
                            {heavyWatch.length > 1
                                ? ` ${t('weatherWatchMore', { count: heavyWatch.length - 1 })}`
                                : ''}
                            {' '}
                            <Link href="/communications?tab=messages" className="font-semibold underline underline-offset-2">
                                {t('tellFarmers')}
                            </Link>
                        </p>
                        <button
                            type="button"
                            onClick={hideWatchBanner}
                            aria-label={t('weatherWatchDismiss')}
                            className="mt-0.5 rounded-full p-1 text-[#3F2E04] hover:bg-[#E8B931]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                <div className="bg-white px-4 py-3 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-[#147677] tracking-tight">
                                {getGreeting()}{user?.username ? `, ${user.username.split(' ')[0]}!` : '!'}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {new Date().toLocaleDateString(dateLocale, {
                                    timeZone: KIGALI_TZ,
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
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-slate-400 text-xs">{stat.label}</p>
                                    {stat.subtitle && (
                                        <p className="text-[11px] text-slate-400 truncate">{stat.subtitle}</p>
                                    )}
                                    <p className="text-3xl font-bold text-slate-800 tracking-tight">
                                        {stat.value.toLocaleString()}
                                    </p>
                                </div>
                                <div className={cn('h-12 w-12 rounded-full flex items-center justify-center shrink-0', stat.iconBg)}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs font-medium text-[#147677] whitespace-nowrap">
                                {stat.captions[0]?.arrow && (
                                    <ArrowUpRight className="inline h-3.5 w-3.5 mr-0.5 align-text-bottom" />
                                )}
                                {stat.captions.map((caption, index) => (
                                    <span
                                        key={caption.text}
                                        className={cn(
                                            caption.tone === 'orange' ? 'text-[#F5A623]' : 'text-[#147677]'
                                        )}
                                    >
                                        {index > 0 ? ' · ' : ''}
                                        {caption.text}
                                    </span>
                                ))}
                            </p>
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
                                    <p className="text-xs text-slate-400">{selectedLocation ? locationDisplayName(selectedLocation) : ""}</p>
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
                                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `repeat(${Math.max(weeklyChartData.length, 1)}, minmax(0, 1fr))` }}>
                                    {weeklyChartData.map((day) => (
                                        <div
                                            key={day.fullDay + day.day}
                                            className={cn(
                                                'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl',
                                                day.isToday ? 'bg-[#147677]/10' : ''
                                            )}
                                        >
                                            <span className="text-[11px] text-slate-400">{day.day}</span>
                                            {day.missing ? (
                                                <span className="py-3 text-[10px] text-slate-400">—</span>
                                            ) : (
                                                <>
                                                    {getWeatherIcon(weatherIconKey(rainCatOf({ rainCategory: day.rainCategory, rain: day.rain ?? 0 }), day.condition), 'h-5 w-5')}
                                                    <span className="text-sm font-semibold text-slate-700">{day.tempMax}°</span>
                                                    <span className="text-[10px] leading-tight text-center text-slate-500">
                                                        {t(`wx.rainCat.${rainCatOf({ rainCategory: day.rainCategory, rain: day.rain ?? 0 })}`)}
                                                    </span>
                                                    <span className="text-[10px] leading-tight text-slate-400">{formatMm(day.rain || 0)} mm</span>
                                                </>
                                            )}
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
                                        <Area type="monotone" dataKey="tempMax" stroke="#147677" strokeWidth={3} fill="url(#tempMaxFill)" name={t('maxTempShort')} connectNulls={false} />
                                        <Area type="monotone" dataKey="tempMin" stroke="#F5A623" strokeWidth={3} fill="url(#tempMinFill)" name={t('minTempShort')} connectNulls={false} />
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
                                            <p className="text-[10px] text-slate-400">{t('wx.rain')}</p>
                                            <p className="text-sm font-semibold text-slate-700">{todayRainLabel || '—'}</p>
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

                    <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] p-4 text-white flex flex-col h-full">
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            {locationMenu}
                        </div>

                        {(currentWeather || todayWeather) ? (
                            <div
                                className="flex-1 flex flex-col items-center justify-center text-center py-3 cursor-pointer"
                                onClick={() => router.push('/forecasts')}
                            >
                                {getWeatherIcon(todayWeather?.conditionMain || currentWeather?.conditionMain, 'h-16 w-16')}
                                <p className="text-xs text-white/80 mt-2">
                                    {t('today')}, {new Date().toLocaleDateString(dateLocale, {
                                        timeZone: KIGALI_TZ,
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                                <p className="text-5xl font-bold tracking-tight leading-none mt-1">{Math.round(displayTemp)}°</p>
                                <p className="text-white/90 capitalize text-sm mt-1">{translateCondition(displayCondition) || t('todayForecast')}</p>
                                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/85 mt-3">
                                    {todayWeather && (
                                        <span className="flex items-center gap-1.5">
                                            <Droplets className="h-3.5 w-3.5" />
                                            {todayRainLabel}
                                            {todayWeather.rainChance != null ? ` · ${todayWeather.rainChance}%` : ''}
                                        </span>
                                    )}
                                    {todayWeather && <span className="text-white/40">|</span>}
                                    <span>{t('humidity')} {todayWeather?.humidity ?? currentWeather?.humidity ?? '—'}%</span>
                                    <span className="text-white/40">|</span>
                                    <span className="flex items-center gap-1.5">
                                        <Wind className="h-3.5 w-3.5" />
                                        {Math.round(((todayWeather?.windSpeed ?? currentWeather?.windSpeed) || 0) * 3.6)} km/h
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
                            <h2 className="text-sm font-semibold text-slate-800">{t('wx.rain')}</h2>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#147677]" />%</span>
                            </div>
                        </div>
                        {weeklyChartData.length > 0 ? (
                            <ChartContainer config={weeklyChartConfig} className="h-[120px] w-full aspect-auto">
                                <BarChart data={weeklyChartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltipContent />} />
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

                    <SoftCard className="p-3 xl:col-span-4">
                        <h2 className="text-sm font-semibold text-[#147677]">{t('weatherWatchTitle')}</h2>
                        {highlightDays.length > 0 ? (
                            <ul className="mt-2 space-y-1.5">
                                {highlightDays.map(({ day }) => {
                                    const rain = rainCatOf(day);
                                    return (
                                    <li key={day.date || highlightLabel(day)} className="flex items-start gap-2 text-xs">
                                        <span className="mt-0.5 shrink-0">
                                            {getWeatherIcon(weatherIconKey(rain, day.conditionMain || day.condition), 'h-5 w-5')}
                                        </span>
                                        <div className="min-w-0 flex-1 leading-4">
                                            <p className="font-medium text-slate-800">{highlightLabel(day)}</p>
                                            <p className="text-slate-500">
                                                <span className="font-semibold text-[#F5A623]">{formatMm(Number(day.rainAmount) || 0)} mm</span>
                                                {' · '}{t(`wx.rainCat.${rain}`)}{' · '}{day.tempMin}–{day.tempMax}°C
                                            </p>
                                        </div>
                                        <div className="relative shrink-0">
                                            <button
                                                type="button"
                                                aria-label={t('keyHighlightAdvice')}
                                                className="peer rounded-full p-1 text-[#147677] hover:bg-[#147677]/10"
                                            >
                                                <Info className="h-3.5 w-3.5" />
                                            </button>
                                            <div className="pointer-events-none invisible absolute right-0 bottom-full z-30 mb-1 w-64 peer-hover:visible">
                                                <div className="rounded-lg bg-white p-2 text-left shadow-lg">
                                                    <p className="text-[11px] leading-4 text-slate-600">{day.farmingRecommendation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="py-6 text-center text-xs text-slate-500">{t('weatherWatchClear')}</p>
                        )}
                        <Link href="/forecasts" className="mt-2 inline-block text-xs font-semibold text-[#147677]">
                            {t('viewMore')}
                        </Link>
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
