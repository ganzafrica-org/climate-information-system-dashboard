import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    Calendar,
    ChevronDown,
    CloudRain,
    Download, Loader2,
    MapPin,
    RefreshCw,
    Thermometer,
    TrendingUp,
    WifiOff,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    HistoricalWeatherResponse, HistoricalWeatherRecord, ApiResponse,
    HistoricalWeatherFilters
} from '@/types/weather';
import { Location, LocationsResponse } from '@/types/farmer';

const chartConfig = {
    temperature: {
        label: 'Temperature (°C)',
        color: '#147677',
    },
    tempMin: {
        label: 'Min Temperature (°C)',
        color: '#F59E0B', // Orange
    },
    tempMax: {
        label: 'Max Temperature (°C)',
        color: '#FF5500', // AMI Red
    },
    tempAvg: {
        label: 'Avg Temperature (°C)',
        color: '#147677',
    },
    rainfall: {
        label: 'Rainfall (mm)',
        color: '#147677',
    },
    historical: {
        label: 'Historical Average',
        color: '#64748b',
    },
};

type WeeklyData = {
    week: string;
    tempMin: number;
    tempMax: number;
    tempAvg: number;
    rainfall: number;
};

type MonthlyData = {
    month: string;
    tempMin: number;
    tempMax: number;
    tempAvg: number;
    rainfall: number;
};

type SeasonalData = {
    name: string;
    temperature: number;
    rainfall: number;
    days: number;
};

type ComparisonData = WeeklyData | MonthlyData | SeasonalData;

const handleApiError = (error: any, t: any) => {
    console.error('API Error:', error);

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error(t('requestTimeout') || 'Request timed out. Please try again.');
        return 'timeout';
    } else if (error.response?.status === 404) {
        toast.error(t('dataNotFound') || 'Data not found for this location.');
        return 'not_found';
    } else if (error.response?.status >= 500) {
        toast.error(t('serverError') || 'Server error. Please try again later.');
        return 'server_error';
    } else if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
        toast.error(t('networkError') || 'Network error. Please check your connection.');
        return 'network_error';
    } else {
        toast.error(t('failedToLoadHistoricalData') || 'Failed to load historical data.');
        return 'unknown_error';
    }
};

const processMonthlyData = (records: HistoricalWeatherRecord[]) => {
    if (!records || records.length === 0) return [];

    const monthlyData: { [key: string]: {
            month: string;
            tempMin: number[];
            tempMax: number[];
            tempAvg: number[];
            rainfall: number[]
        } } = {};

    records.forEach(record => {
        const date = new Date(record.date);
        const monthKey = date.toLocaleString('default', { month: 'short' });

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthKey,
                tempMin: [],
                tempMax: [],
                tempAvg: [],
                rainfall: []
            };
        }

        const tempMin = record.weatherSummary.temperature.min;
        const tempMax = record.weatherSummary.temperature.max;
        const tempAvg = record.weatherSummary.temperature.current;
        const rainfall = record.weatherSummary.precipitation.rainAmount;

        monthlyData[monthKey].tempMin.push(tempMin);
        monthlyData[monthKey].tempMax.push(tempMax);
        monthlyData[monthKey].tempAvg.push(tempAvg);
        monthlyData[monthKey].rainfall.push(rainfall);
    });

    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthOrder.map(month => {
        if (monthlyData[month]) {
            return {
                month,
                tempMin: monthlyData[month].tempMin.reduce((a, b) => a + b, 0) / monthlyData[month].tempMin.length,
                tempMax: monthlyData[month].tempMax.reduce((a, b) => a + b, 0) / monthlyData[month].tempMax.length,
                tempAvg: monthlyData[month].tempAvg.reduce((a, b) => a + b, 0) / monthlyData[month].tempAvg.length,
                rainfall: monthlyData[month].rainfall.reduce((a, b) => a + b, 0),
            };
        }
        return {
            month,
            tempMin: 0,
            tempMax: 0,
            tempAvg: 0,
            rainfall: 0,
        };
    }).filter(item => item.tempAvg > 0);
};

const processWeeklyData = (records: HistoricalWeatherRecord[]) => {
    if (!records || records.length === 0) return [];

    const weeklyData: { [key: string]: {
            week: string;
            tempMin: number[];
            tempMax: number[];
            tempAvg: number[];
            rainfall: number[]
        } } = {};

    records.forEach(record => {
        const date = new Date(record.date);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const weekKey = `Week ${Math.ceil(date.getDate() / 7)} - ${date.toLocaleString('default', { month: 'short' })}`;

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                week: weekKey,
                tempMin: [],
                tempMax: [],
                tempAvg: [],
                rainfall: []
            };
        }

        const tempMin = record.weatherSummary.temperature.min;
        const tempMax = record.weatherSummary.temperature.max;
        const tempAvg = record.weatherSummary.temperature.current;
        const rainfall = record.weatherSummary.precipitation.rainAmount;

        weeklyData[weekKey].tempMin.push(tempMin);
        weeklyData[weekKey].tempMax.push(tempMax);
        weeklyData[weekKey].tempAvg.push(tempAvg);
        weeklyData[weekKey].rainfall.push(rainfall);
    });

    return Object.values(weeklyData).map(week => ({
        week: week.week,
        tempMin: week.tempMin.reduce((a, b) => a + b, 0) / week.tempMin.length,
        tempMax: week.tempMax.reduce((a, b) => a + b, 0) / week.tempMax.length,
        tempAvg: week.tempAvg.reduce((a, b) => a + b, 0) / week.tempAvg.length,
        rainfall: week.rainfall.reduce((a, b) => a + b, 0),
    })).sort((a, b) => a.week.localeCompare(b.week));
};

const processSeasonalData = (records: HistoricalWeatherRecord[]) => {
    if (!records || records.length === 0) return [];

    const seasonA = records.filter(record => {
        const month = new Date(record.date).getMonth() + 1;
        return month >= 9 || month <= 1;
    });

    const seasonB = records.filter(record => {
        const month = new Date(record.date).getMonth() + 1;
        return month >= 2 && month <= 5;
    });

    const seasonC = records.filter(record => {
        const month = new Date(record.date).getMonth() + 1;
        return month >= 6 && month <= 8;
    });

    const calculateSeasonStats = (seasonData: HistoricalWeatherRecord[], name: string) => {
        if (seasonData.length === 0) return { name, rainfall: 0, temperature: 0, days: 0 };

        const totalRainfall = seasonData.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0);
        const avgTemp = seasonData.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / seasonData.length;

        return {
            name,
            rainfall: totalRainfall,
            temperature: avgTemp,
            days: seasonData.length
        };
    };

    return [
        calculateSeasonStats(seasonA, 'Season A'),
        calculateSeasonStats(seasonB, 'Season B'),
        calculateSeasonStats(seasonC, 'Season C')
    ];
};

const Historical: NextPage = () => {
    const { t } = useLanguage();

    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [historicalData, setHistoricalData] = useState<HistoricalWeatherRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorType, setErrorType] = useState<string>('');

    const [viewType, setViewType] = useState<'monthly' | 'weekly' | 'seasonal'>('monthly');
    const [dateRange, setDateRange] = useState({
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`
    });


    const [comparisonLocation1, setComparisonLocation1] = useState<Location | null>(null);
    const [comparisonLocation2, setComparisonLocation2] = useState<Location | null>(null);
    const [comparisonData1, setComparisonData1] = useState<HistoricalWeatherRecord[]>([]);
    const [comparisonData2, setComparisonData2] = useState<HistoricalWeatherRecord[]>([]);
    const [comparisonDataType, setComparisonDataType] = useState<'temperature' | 'rainfall'>('temperature');

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        if (selectedLocation) {
            fetchHistoricalData();
        }
    }, [selectedLocation, dateRange, viewType]);

    const fetchLocations = async () => {
        try {
            setHasError(false);
            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: { limit: 100 }
            });

            if (response?.data?.locations) {
                setLocations(response.data.locations);
                if (response.data.locations.length > 0) {
                    setSelectedLocation(response.data.locations[0]);
                    setComparisonLocation1(response.data.locations[0]);
                    if (response.data.locations.length > 1) {
                        setComparisonLocation2(response.data.locations[1]);
                    }
                }
            } else {
                setLocations([]);
                setHasError(true);
                setErrorType('no_locations');
                toast.error(t('noLocationsFound') || 'No locations found.');
            }
        } catch (error: any) {
            const errorType = handleApiError(error, t);
            setLocations([]);
            setHasError(true);
            setErrorType(errorType);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistoricalData = async () => {
        if (!selectedLocation) return;

        try {
            setIsLoading(true);
            setHasError(false);
            setErrorType('');

            const filters: HistoricalWeatherFilters = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                limit: 1000,
                sortBy: 'date',
                sortOrder: 'ASC'
            };

            const response = await api.get<ApiResponse<HistoricalWeatherResponse>>(
                `/api/weather/historical/location/${selectedLocation.id}`,
                { params: filters }
            );

            if (response?.data?.records && response.data.records.length > 0) {
                setHistoricalData(response.data.records);
            } else {
                setHistoricalData([]);
                setHasError(true);
                setErrorType('no_data');
                toast.error(t('noHistoricalDataAvailable') || 'No historical data available for this period.');
            }
        } catch (error: any) {
            const errorType = handleApiError(error, t);
            setHistoricalData([]);
            setHasError(true);
            setErrorType(errorType);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchComparisonData = async () => {
        if (!comparisonLocation1 || !comparisonLocation2) return;

        try {
            const filters: HistoricalWeatherFilters = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                limit: 1000,
                sortBy: 'date',
                sortOrder: 'ASC'
            };

            const [response1, response2] = await Promise.all([
                api.get<ApiResponse<HistoricalWeatherResponse>>(
                    `/api/weather/historical/location/${comparisonLocation1.id}`,
                    { params: filters }
                ),
                api.get<ApiResponse<HistoricalWeatherResponse>>(
                    `/api/weather/historical/location/${comparisonLocation2.id}`,
                    { params: filters }
                )
            ]);

            setComparisonData1(response1?.data?.records || []);
            setComparisonData2(response2?.data?.records || []);
            toast.success(t('comparisonDataLoaded') || 'Comparison data loaded successfully.');
        } catch (error: any) {
            handleApiError(error, t);
            setComparisonData1([]);
            setComparisonData2([]);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchHistoricalData();
            if (!hasError) {
                toast.success(t('historicalDataRefreshed') || 'Historical data updated successfully.');
            }
        } catch (error) {

        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExportData = () => {
        if (historicalData.length === 0) {
            toast.error(t('noDataToExport') || 'No data available to export.');
            return;
        }

        try {
            const exportData = historicalData.map(record => ({
                [t('date') || 'Date']: record.date,
                [t('location') || 'Location']: selectedLocation?.name || '',
                [t('tempMin') || 'Min Temp']: `${record.weatherSummary.temperature.min}°C`,
                [t('tempMax') || 'Max Temp']: `${record.weatherSummary.temperature.max}°C`,
                [t('tempCurrent') || 'Current Temp']: `${record.weatherSummary.temperature.current}°C`,
                [t('humidity') || 'Humidity']: `${record.weatherSummary.atmospheric.humidity}%`,
                [t('rainfall') || 'Rainfall']: `${record.weatherSummary.precipitation.rainAmount}mm`,
                [t('rainChance') || 'Rain Chance']: `${record.weatherSummary.precipitation.rainChance}%`,
                [t('windSpeed') || 'Wind Speed']: `${record.weatherSummary.wind.speed} km/h`,
                [t('windDirection') || 'Wind Direction']: record.weatherSummary.wind.direction,
                [t('condition') || 'Condition']: record.weatherSummary.conditions.description,
                [t('soilCondition') || 'Soil Condition']: record.weatherSummary.farming.soilCondition,
                [t('farmingRecommendation') || 'Farming Recommendation']: record.weatherSummary.farming.farmingRecommendation,
            }));

            const filename = `historical_weather_${selectedLocation?.name || 'location'}_${new Date().toISOString().split('T')[0]}.csv`;
            api.exportAsCSV(exportData, filename);

            toast.success(t('dataExportedSuccessfully') || 'Data exported successfully.');
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('failedToExportData') || 'Failed to export data.');
        }
    };

    const getProcessedData = () => {
        switch (viewType) {
            case 'weekly':
                return processWeeklyData(historicalData);
            case 'seasonal':
                return processSeasonalData(historicalData);
            default:
                return processMonthlyData(historicalData);
        }
    };

    const processComparisonData = () => {
        if (comparisonData1.length === 0 || comparisonData2.length === 0) return [];

        let comparison1Data: ComparisonData[], comparison2Data: ComparisonData[];

        switch (viewType) {
            case 'weekly':
                comparison1Data = processWeeklyData(comparisonData1);
                comparison2Data = processWeeklyData(comparisonData2);
                break;
            case 'seasonal':
                comparison1Data = processSeasonalData(comparisonData1);
                comparison2Data = processSeasonalData(comparisonData2);
                break;
            default:
                comparison1Data = processMonthlyData(comparisonData1);
                comparison2Data = processWeeklyData(comparisonData2);
        }

        return comparison1Data.map((item, index) => {
            let key: string;
            let location1: number;
            let location2: number;

            if (viewType === 'seasonal') {
                const seasonalItem = item as SeasonalData;
                const seasonalItem2 = comparison2Data[index] as SeasonalData;
                key = seasonalItem.name;
                location1 = comparisonDataType === 'temperature' ? seasonalItem.temperature : seasonalItem.rainfall;
                location2 = comparisonDataType === 'temperature'
                    ? (seasonalItem2?.temperature || 0)
                    : (seasonalItem2?.rainfall || 0);
            } else if (viewType === 'weekly') {
                const weeklyItem = item as WeeklyData;
                const weeklyItem2 = comparison2Data[index] as WeeklyData;
                key = weeklyItem.week;
                location1 = comparisonDataType === 'temperature' ? weeklyItem.tempAvg : weeklyItem.rainfall;
                location2 = comparisonDataType === 'temperature'
                    ? (weeklyItem2?.tempAvg || 0)
                    : (weeklyItem2?.rainfall || 0);
            } else {
                const monthlyItem = item as MonthlyData;
                const monthlyItem2 = comparison2Data[index] as MonthlyData;
                key = monthlyItem.month;
                location1 = comparisonDataType === 'temperature' ? monthlyItem.tempAvg : monthlyItem.rainfall;
                location2 = comparisonDataType === 'temperature'
                    ? (monthlyItem2?.tempAvg || 0)
                    : (monthlyItem2?.rainfall || 0);
            }

            return {
                [viewType === 'seasonal' ? 'name' : viewType === 'weekly' ? 'week' : 'month']: key,
                location1,
                location2
            };
        });
    };

    const renderEmptyState = () => {
        let icon = <CloudRain className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        let title = t('noHistoricalData') || 'No Historical Data';
        let description = t('noDataForSelectedPeriod') || 'No data available for the selected period.';

        switch (errorType) {
            case 'timeout':
                icon = <WifiOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
                title = t('requestTimeout') || 'Request Timed Out';
                description = t('timeoutDescription') || 'The request took too long to complete. Please check your connection and try again.';
                break;
            case 'network_error':
                icon = <WifiOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
                title = t('networkError') || 'Network Error';
                description = t('networkErrorDescription') || 'Please check your internet connection and try again.';
                break;
            case 'server_error':
                icon = <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
                title = t('serverError') || 'Server Error';
                description = t('serverErrorDescription') || 'Our servers are experiencing issues. Please try again later.';
                break;
            case 'not_found':
                icon = <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
                title = t('dataNotFound') || 'Data Not Found';
                description = t('dataNotFoundDescription') || 'No historical data available for the selected location and period.';
                break;
            case 'no_locations':
                icon = <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
                title = t('noLocations') || 'No Locations';
                description = t('noLocationsDescription') || 'No locations available. Please add a location first.';
                break;
            default:
                break;
        }

        return (
            <Card className="border-0 shadow-md">
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                        {icon}
                        <h3 className="text-lg font-medium mb-2 text-slate-700">{title}</h3>
                        <p className="text-slate-500 mb-4">
                            {description}
                        </p>
                        <Button
                            variant="outline"
                            onClick={errorType === 'no_locations' ? fetchLocations : handleRefresh}
                            disabled={isRefreshing || isLoading}
                            className="bg-[#147677] hover:bg-[#147677]/90 text-white border-[#147677]"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
                            {(isRefreshing || isLoading) ? (t('loading') || 'Loading...') : (t('tryAgain') || 'Try Again')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const processedData = getProcessedData();
    const comparisonChartData = processComparisonData();

    const avgTemp = historicalData.length > 0
        ? historicalData.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / historicalData.length
        : 0;
    const totalRainfall = historicalData.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0);
    const rainyDays = historicalData.filter(record => record.weatherSummary.precipitation.rainAmount > 0.1).length;
    const extremeEvents = historicalData.filter(record =>
        record.weatherSummary.temperature.max > 30 ||
        record.weatherSummary.temperature.min < 5 ||
        record.weatherSummary.precipitation.rainAmount > 50
    ).length;

    if (isLoading && !historicalData.length && !hasError) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-slate-600">{t('loadingHistoricalData') || 'Loading historical data...'}</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head>
                <title>{t('historical') || 'Historical'} | {t('climateInformationSystem') || 'Teganyamuhinzi'}</title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                
                <div className="bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{t('historicalWeatherData') || 'Historical Weather Data'}</h2>
                            </div>
                        </div>

                        {locations.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        <span>{selectedLocation?.name || t('selectLocation') || 'Select Location'}</span>
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
                        )}
                    </div>
                </div>

                <Card className="border-0 shadow-md">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-6">
                            <div className="flex flex-col sm:flex-row flex-1 gap-3 items-end">
                                <div className="space-y-1 w-full sm:w-36">
                                    <Label className="text-slate-700 text-sm font-medium">{t('viewType') || 'View Type'}</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-9 justify-between border-slate-300 hover:border-slate-400 hover:bg-slate-50">
                                                <span className="capitalize">{t(viewType) || viewType}</span>
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-full">
                                            <DropdownMenuItem onClick={() => setViewType('monthly')}>
                                                {t('monthly') || 'Monthly'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setViewType('weekly')}>
                                                {t('weekly') || 'Weekly'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setViewType('seasonal')}>
                                                {t('seasonal') || 'Seasonal'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-1 w-full sm:w-36">
                                    <Label className="text-slate-700 text-sm font-medium">{t('startDate') || 'Start Date'}</Label>
                                    <Input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="space-y-1 w-full sm:w-36">
                                    <Label className="text-slate-700 text-sm font-medium">{t('endDate') || 'End Date'}</Label>
                                    <Input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0 lg:ml-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing || isLoading || !selectedLocation}
                                    className="h-9 bg-[#147677] hover:bg-[#147677]/90 text-white border-[#147677]"
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? (t('updating') || 'Updating...') : (t('updateData') || 'Update Data')}
                                </Button>

                                <Button
                                    size="sm"
                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleExportData}
                                    disabled={!historicalData.length}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    {t('exportData') || 'Export Data'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                
                {historicalData.length > 0 && (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-0 shadow-md bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Thermometer className="h-5 w-5" />
                                    {t('avgTemperature') || 'Avg Temperature'}
                                </CardTitle>
                                <CardDescription className="text-red-100">{t('forSelectedPeriod') || 'For Selected Period'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-1">{avgTemp.toFixed(1)}°C</div>
                                <div className="flex items-center text-sm text-red-100">
                                    <span>{t('averageForPeriod') || 'Average for period'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-[#147677] to-[#0f5f5f] text-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CloudRain className="h-5 w-5" />
                                    {t('totalRainfall') || 'Total Rainfall'}
                                </CardTitle>
                                <CardDescription className="text-white/80">{t('forSelectedPeriod') || 'For Selected Period'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-1">{totalRainfall.toFixed(0)}mm</div>
                                <div className="flex items-center text-sm text-white/80">
                                    <span>{rainyDays} {t('rainyDays') || 'rainy days'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('rainyDays') || 'Rainy Days'}
                                </CardTitle>
                                <CardDescription className="text-emerald-100">{t('forSelectedPeriod') || 'For Selected Period'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-1">{rainyDays}</div>
                                <div className="flex items-center text-sm text-emerald-100">
                                    <span>{t('daysWithRain') || 'days with rain'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    {t('extremeWeatherEvents') || 'Extreme Weather Events'}
                                </CardTitle>
                                <CardDescription className="text-amber-100">{t('forSelectedPeriod') || 'For Selected Period'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold mb-1">{extremeEvents}</div>
                                <div className="flex items-center text-sm text-amber-100">
                                    <span>{t('recordedEvents') || 'recorded events'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                
                {historicalData.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-xl">
                                <CardHeader className="bg-gradient-to-r from-slate-50 via-red-50/50 to-slate-50 border-b border-slate-200/50">
                                    <CardTitle className="text-slate-900">
                                        {viewType === 'seasonal' ? (t('seasonalTemperature') || 'Seasonal Temperature') :
                                            viewType === 'weekly' ? (t('weeklyTemperature') || 'Weekly Temperature') :
                                                (t('monthlyTemperature') || 'Monthly Temperature')}
                                    </CardTitle>
                                    <CardDescription className="text-slate-600">
                                        {selectedLocation?.name} - {new Date(dateRange.startDate).getFullYear()} to {new Date(dateRange.endDate).getFullYear()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                        {viewType === 'seasonal' ? (
                                            <BarChart data={processedData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                                                <YAxis tick={{ fill: '#64748b' }} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="temperature"
                                                    fill="#147677"
                                                    name={t('avgTemperature') || 'Avg Temperature'}
                                                    radius={4}
                                                />
                                            </BarChart>
                                        ) : (
                                            <LineChart data={processedData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey={viewType === 'weekly' ? 'week' : 'month'} tick={{ fill: '#64748b' }} />
                                                <YAxis tick={{ fill: '#64748b' }} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempAvg"
                                                    stroke="#147677"
                                                    name={t('avgTemperature') || 'Avg Temperature'}
                                                    strokeWidth={3}
                                                    dot={{ fill: '#147677', strokeWidth: 2 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMin"
                                                    stroke="#F59E0B"
                                                    name={t('minTemperature') || 'Min Temperature'}
                                                    strokeWidth={2}
                                                    dot={{ fill: '#F59E0B', strokeWidth: 2 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMax"
                                                    stroke="#FF5500"
                                                    name={t('maxTemperature') || 'Max Temperature'}
                                                    strokeWidth={2}
                                                    dot={{ fill: '#FF5500', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        )}
                                    </ChartContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-xl">
                                <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-b border-slate-200/50">
                                    <CardTitle className="text-slate-900">
                                        {viewType === 'seasonal' ? (t('seasonalRainfall') || 'Seasonal Rainfall') :
                                            viewType === 'weekly' ? (t('weeklyRainfall') || 'Weekly Rainfall') :
                                                (t('monthlyRainfall') || 'Monthly Rainfall')}
                                    </CardTitle>
                                    <CardDescription className="text-slate-600">
                                        {selectedLocation?.name} - {new Date(dateRange.startDate).getFullYear()} to {new Date(dateRange.endDate).getFullYear()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                        <BarChart data={processedData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey={viewType === 'seasonal' ? 'name' : viewType === 'weekly' ? 'week' : 'month'} tick={{ fill: '#64748b' }} />
                                            <YAxis tick={{ fill: '#64748b' }} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                            <Bar
                                                dataKey="rainfall"
                                                fill="#147677"
                                                name={t('rainfall') || 'Rainfall'}
                                                radius={4}
                                            />
                                        </BarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>

                        
                        <Card className="border-0 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 border-b border-slate-200/50">
                                <CardTitle className="text-slate-900">{t('compareLocations') || 'Compare Locations'}</CardTitle>
                                <CardDescription className="text-slate-600">{t('compareLocationWeatherData') || 'Compare weather data between different locations'}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-wrap gap-4 mb-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-slate-700">{t('selectLocation1') || 'Select Location 1'}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="border-slate-300 hover:border-slate-400 hover:bg-slate-50">
                                                    <span>{comparisonLocation1?.name || t('selectLocation') || 'Select Location'}</span>
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {locations.map((location) => (
                                                    <DropdownMenuItem
                                                        key={location.id}
                                                        onClick={() => setComparisonLocation1(location)}
                                                    >
                                                        {location.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-slate-700">{t('selectLocation2') || 'Select Location 2'}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="border-slate-300 hover:border-slate-400 hover:bg-slate-50">
                                                    <span>{comparisonLocation2?.name || t('selectLocation') || 'Select Location'}</span>
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {locations.map((location) => (
                                                    <DropdownMenuItem
                                                        key={location.id}
                                                        onClick={() => setComparisonLocation2(location)}
                                                    >
                                                        {location.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-slate-700">{t('dataType') || 'Data Type'}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="border-slate-300 hover:border-slate-400 hover:bg-slate-50">
                                                    {comparisonDataType === 'temperature' ? (
                                                        <>
                                                            <Thermometer className="mr-2 h-4 w-4 text-red-500" />
                                                            <span>{t('temperature') || 'Temperature'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CloudRain className="mr-2 h-4 w-4 text-blue-500" />
                                                            <span>{t('rainfall') || 'Rainfall'}</span>
                                                        </>
                                                    )}
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setComparisonDataType('temperature')}>
                                                    <Thermometer className="mr-2 h-4 w-4 text-red-500" />
                                                    <span>{t('temperature') || 'Temperature'}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setComparisonDataType('rainfall')}>
                                                    <CloudRain className="mr-2 h-4 w-4 text-blue-500" />
                                                    <span>{t('rainfall') || 'Rainfall'}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            className="bg-[#147677] hover:bg-[#147677]/90 text-white hover:text-white"
                                            onClick={fetchComparisonData}
                                            disabled={!comparisonLocation1 || !comparisonLocation2}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            {t('compare') || 'Compare'}
                                        </Button>
                                    </div>
                                </div>

                                {comparisonChartData.length > 0 && (
                                    <div className="mt-6">
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <LineChart data={comparisonChartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey={viewType === 'seasonal' ? 'name' : viewType === 'weekly' ? 'week' : 'month'} tick={{ fill: '#64748b' }} />
                                                <YAxis tick={{ fill: '#64748b' }} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="location1"
                                                    stroke="#147677"
                                                    name={comparisonLocation1?.name || 'Location 1'}
                                                    strokeWidth={3}
                                                    dot={{ fill: '#147677', strokeWidth: 2 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="location2"
                                                    stroke="#0f5f5f"
                                                    name={comparisonLocation2?.name || 'Location 2'}
                                                    strokeWidth={3}
                                                    dot={{ fill: '#0f5f5f', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </div>
                                )}

                                {comparisonData1.length > 0 && comparisonData2.length > 0 && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base text-slate-900">{comparisonLocation1?.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('avgTemperature') || 'Avg Temperature'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData1.length > 0 ? (comparisonData1.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / comparisonData1.length).toFixed(1) : '0'}°C
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('totalRainfall') || 'Total Rainfall'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData1.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0).toFixed(0)}mm
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('rainyDays') || 'Rainy Days'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData1.filter(record => record.weatherSummary.precipitation.rainAmount > 0.1).length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50/80 to-sky-50/80 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base text-slate-900">{comparisonLocation2?.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('avgTemperature') || 'Avg Temperature'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData2.length > 0 ? (comparisonData2.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / comparisonData2.length).toFixed(1) : '0'}°C
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('totalRainfall') || 'Total Rainfall'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData2.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0).toFixed(0)}mm
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">{t('rainyDays') || 'Rainy Days'}:</span>
                                                        <span className="font-medium text-slate-900">
                                                            {comparisonData2.filter(record => record.weatherSummary.precipitation.rainAmount > 0.1).length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        
                        <Card className="border-0 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-b border-slate-200/50">
                                <CardTitle className="text-slate-900">{t('weatherInsights') || 'Weather Insights'}</CardTitle>
                                <CardDescription className="text-slate-600">
                                    {t('keyTrendsAndPatterns') || 'Key trends and patterns'} - {selectedLocation?.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="font-medium flex items-center gap-2 text-slate-800">
                                            <Thermometer className="h-4 w-4 text-red-500" />
                                            {t('temperatureTrend') || 'Temperature Trend'}
                                        </h4>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-red-50/80 to-red-100/80 rounded-lg border border-red-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('highest') || 'Highest'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {historicalData.length > 0 ? Math.max(...historicalData.map(r => r.weatherSummary.temperature.max)).toFixed(1) : '0'}°C
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-blue-50/80 to-blue-100/80 rounded-lg border border-blue-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('lowest') || 'Lowest'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {historicalData.length > 0 ? Math.min(...historicalData.map(r => r.weatherSummary.temperature.min)).toFixed(1) : '0'}°C
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 rounded-lg border border-emerald-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('average') || 'Average'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {avgTemp.toFixed(1)}°C
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-medium flex items-center gap-2 text-slate-800">
                                            <CloudRain className="h-4 w-4 text-blue-500" />
                                            {t('rainfallPattern') || 'Rainfall Pattern'}
                                        </h4>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-blue-50/80 to-blue-100/80 rounded-lg border border-blue-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('totalRainfall') || 'Total Rainfall'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {totalRainfall.toFixed(0)}mm
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-sky-50/80 to-sky-100/80 rounded-lg border border-sky-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('rainyDays') || 'Rainy Days'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {rainyDays}
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-indigo-50/80 to-indigo-100/80 rounded-lg border border-indigo-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('maxDailyRain') || 'Max Daily Rain'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {historicalData.length > 0 ? Math.max(...historicalData.map(r => r.weatherSummary.precipitation.rainAmount)).toFixed(1) : '0'}mm
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-medium flex items-center gap-2 text-slate-800">
                                            <TrendingUp className="h-4 w-4 text-amber-500" />
                                            {t('extremeEvents') || 'Extreme Events'}
                                        </h4>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-amber-50/80 to-amber-100/80 rounded-lg border border-amber-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('totalEvents') || 'Total Events'}:</span>
                                                <span className="font-medium text-slate-900">
                                                    {extremeEvents}
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-orange-50/80 to-orange-100/80 rounded-lg border border-orange-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('hotDays') || 'Hot Days'} (&gt;30°C):</span>
                                                <span className="font-medium text-slate-900">
                                                    {historicalData.filter(r => r.weatherSummary.temperature.max > 30).length}
                                                </span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-gradient-to-br from-red-50/80 to-red-100/80 rounded-lg border border-red-200/50 hover:shadow-sm transition-shadow">
                                                <span className="text-slate-600">{t('heavyRain') || 'Heavy Rain'} (&gt;50mm):</span>
                                                <span className="font-medium text-slate-900">
                                                    {historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 50).length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <h4 className="font-medium mb-4 text-slate-800">{t('farmingInsights') || 'Farming Insights'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <h5 className="text-sm font-medium text-slate-900 bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 px-3 py-2 rounded-lg border border-emerald-200/50">{t('favorableConditions') || 'Favorable Conditions'}</h5>
                                            <ul className="text-sm space-y-2">
                                                <li className="flex items-start gap-3 p-2 bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 rounded-lg border border-emerald-200/50 hover:shadow-sm transition-shadow">
                                                    <div className="rounded-full bg-emerald-500 h-2 w-2 mt-2 flex-shrink-0" />
                                                    <span className="text-slate-700">
                                                        <span className="font-medium text-slate-900">{historicalData.filter(r => r.weatherSummary.temperature.current >= 18 && r.weatherSummary.temperature.current <= 25).length}</span> {t('daysOptimalTemp') || 'days with optimal temperature'}
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-3 p-2 bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 rounded-lg border border-emerald-200/50 hover:shadow-sm transition-shadow">
                                                    <div className="rounded-full bg-emerald-500 h-2 w-2 mt-2 flex-shrink-0" />
                                                    <span className="text-slate-700">
                                                        <span className="font-medium text-slate-900">{historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 1 && r.weatherSummary.precipitation.rainAmount < 30).length}</span> {t('daysModerateRain') || 'days with moderate rain'}
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <h5 className="text-sm font-medium text-slate-900 bg-gradient-to-br from-amber-50/80 to-amber-100/80 px-3 py-2 rounded-lg border border-amber-200/50">{t('challengingConditions') || 'Challenging Conditions'}</h5>
                                            <ul className="text-sm space-y-2">
                                                <li className="flex items-start gap-3 p-2 bg-gradient-to-br from-amber-50/80 to-amber-100/80 rounded-lg border border-amber-200/50 hover:shadow-sm transition-shadow">
                                                    <div className="rounded-full bg-amber-500 h-2 w-2 mt-2 flex-shrink-0" />
                                                    <span className="text-slate-700">
                                                        <span className="font-medium text-slate-900">{historicalData.filter(r => r.weatherSummary.temperature.max > 30 || r.weatherSummary.temperature.min < 10).length}</span> {t('daysExtremeTemp') || 'days with extreme temperature'}
                                                    </span>
                                                </li>
                                                <li className="flex items-start gap-3 p-2 bg-gradient-to-br from-amber-50/80 to-amber-100/80 rounded-lg border border-amber-200/50 hover:shadow-sm transition-shadow">
                                                    <div className="rounded-full bg-amber-500 h-2 w-2 mt-2 flex-shrink-0" />
                                                    <span className="text-slate-700">
                                                        <span className="font-medium text-slate-900">{historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 50).length}</span> {t('daysHeavyRain') || 'days with heavy rain'}
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    /* Empty state for no data or errors */
                    renderEmptyState()
                )}

            </div>
        </AppLayout>
    );
};

export default Historical;