import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    Search,
    Thermometer,
    TrendingUp,
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
        color: 'hsl(var(--primary))',
    },
    tempMin: {
        label: 'Min Temperature (°C)',
        color: '#3b82f6',
    },
    tempMax: {
        label: 'Max Temperature (°C)',
        color: '#ef4444',
    },
    tempAvg: {
        label: 'Avg Temperature (°C)',
        color: '#10b981',
    },
    rainfall: {
        label: 'Rainfall (mm)',
        color: '#3b82f6',
    },
    historical: {
        label: 'Historical Average',
        color: '#9ca3af',
    },
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

const processAnnualData = (records: HistoricalWeatherRecord[]) => {
    if (!records || records.length === 0) return [];

    const yearlyData: { [key: string]: {
            year: number;
            tempMin: number[];
            tempMax: number[];
            tempAvg: number[];
            rainfall: number[]
        } } = {};

    records.forEach(record => {
        const year = new Date(record.date).getFullYear();

        if (!yearlyData[year]) {
            yearlyData[year] = {
                year,
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

        yearlyData[year].tempMin.push(tempMin);
        yearlyData[year].tempMax.push(tempMax);
        yearlyData[year].tempAvg.push(tempAvg);
        yearlyData[year].rainfall.push(rainfall);
    });

    return Object.values(yearlyData).map(year => ({
        year: year.year,
        tempMin: year.tempMin.reduce((a, b) => a + b, 0) / year.tempMin.length,
        tempMax: year.tempMax.reduce((a, b) => a + b, 0) / year.tempMax.length,
        tempAvg: year.tempAvg.reduce((a, b) => a + b, 0) / year.tempAvg.length,
        rainfall: year.rainfall.reduce((a, b) => a + b, 0),
    })).sort((a, b) => a.year - b.year);
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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedTimePeriod, setSelectedTimePeriod] = useState('monthly');
    const [searchTerm, setSearchTerm] = useState('');
    const [historicalData, setHistoricalData] = useState<HistoricalWeatherRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
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
    }, [selectedLocation, dateRange]);

    useEffect(() => {
        setDateRange({
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`
        });
    }, [selectedYear]);

    const fetchLocations = async () => {
        try {
            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: { limit: 100 }
            });
            setLocations(response.data.locations);

            if (response.data.locations.length > 0) {
                setSelectedLocation(response.data.locations[0]);
                setComparisonLocation1(response.data.locations[0]);
                if (response.data.locations.length > 1) {
                    setComparisonLocation2(response.data.locations[1]);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch locations:', error);
            toast.error(t('failedToLoadLocations'));
        }
    };

    const fetchHistoricalData = async () => {
        if (!selectedLocation) return;

        setIsLoading(true);
        try {
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

            setHistoricalData(response.data.records);
        } catch (error: any) {
            console.error('Failed to fetch historical data:', error);
            toast.error(t('failedToLoadHistoricalData'));
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

            setComparisonData1(response1.data.records);
            setComparisonData2(response2.data.records);
            toast.success(t('comparisonDataLoaded'));
        } catch (error: any) {
            console.error('Failed to fetch comparison data:', error);
            toast.error(t('failedToLoadComparisonData'));
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchHistoricalData();
            toast.success(t('historicalDataRefreshed'));
        } catch (error) {
            toast.error(t('failedToRefreshData'));
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExportData = () => {
        if (historicalData.length === 0) {
            toast.error(t('noDataToExport'));
            return;
        }

        try {
            const exportData = historicalData.map(record => ({
                [t('date')]: record.date,
                [t('location')]: selectedLocation?.name || '',
                [t('tempMin')]: `${record.weatherSummary.temperature.min}°C`,
                [t('tempMax')]: `${record.weatherSummary.temperature.max}°C`,
                [t('tempCurrent')]: `${record.weatherSummary.temperature.current}°C`,
                [t('humidity')]: `${record.weatherSummary.atmospheric.humidity}%`,
                [t('rainfall')]: `${record.weatherSummary.precipitation.rainAmount}mm`,
                [t('rainChance')]: `${record.weatherSummary.precipitation.rainChance}%`,
                [t('windSpeed')]: `${record.weatherSummary.wind.speed} km/h`,
                [t('windDirection')]: record.weatherSummary.wind.direction,
                [t('condition')]: record.weatherSummary.conditions.description,
                [t('soilCondition')]: record.weatherSummary.farming.soilCondition,
                [t('farmingRecommendation')]: record.weatherSummary.farming.farmingRecommendation,
            }));

            const filename = `historical_weather_${selectedLocation?.name}_${selectedYear}.csv`;
            api.exportAsCSV(exportData, filename);

            toast.success(t('dataExportedSuccessfully'));
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('failedToExportData'));
        }
    };

    const monthlyData = processMonthlyData(historicalData);
    const annualData = processAnnualData(historicalData);
    const seasonalData = processSeasonalData(historicalData);

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

    const availableYears = Array.from(
        { length: 10 },
        (_, i) => new Date().getFullYear() - i
    );

    const processComparisonData = () => {
        if (comparisonData1.length === 0 || comparisonData2.length === 0) return [];

        const monthlyComparison1 = processMonthlyData(comparisonData1);
        const monthlyComparison2 = processMonthlyData(comparisonData2);

        return monthlyComparison1.map((item, index) => ({
            month: item.month,
            location1: comparisonDataType === 'temperature' ? item.tempAvg : item.rainfall,
            location2: comparisonDataType === 'temperature'
                ? (monthlyComparison2[index]?.tempAvg || 0)
                : (monthlyComparison2[index]?.rainfall || 0),
        }));
    };

    const comparisonChartData = processComparisonData();

    return (
        <AppLayout>
            <Head>
                <title>{t('historical')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t('historicalWeatherData')}</h2>

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
                    </div>

                    <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('search')}
                                className="pl-8 w-full sm:w-[180px] h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className='h-9'>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    <span>{selectedYear}</span>
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {availableYears.map((year) => (
                                    <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                                        {year}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-9"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? t('refreshing') : t('refresh')}
                        </Button>

                        <Button variant="primary" className='h-9' onClick={handleExportData}>
                            <Download className="h-4 w-4 mr-2" />
                            {t('exportData')}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="monthly" onValueChange={setSelectedTimePeriod}>
                    <TabsList className="w-full flex justify-start overflow-x-auto">
                        <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
                        <TabsTrigger value="seasonal">{t('seasonal')}</TabsTrigger>
                        <TabsTrigger value="annual">{t('annual')}</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('avgTemperature')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">{avgTemp.toFixed(1)}°C</div>
                            <div className="flex items-center text-sm">
                                <Thermometer className="h-4 w-4 mr-1 text-blue-500" />
                                <span className="text-muted-foreground">{t('averageForYear')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('totalRainfall')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">{totalRainfall.toFixed(0)}mm</div>
                            <div className="flex items-center text-sm">
                                <CloudRain className="h-4 w-4 mr-1 text-blue-500" />
                                <span className="text-muted-foreground">{rainyDays} {t('rainyDays')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('rainyDays')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">{rainyDays}</div>
                            <div className="flex items-center text-sm">
                                <span className="text-muted-foreground">{t('daysWithRain')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('extremeWeatherEvents')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">{extremeEvents}</div>
                            <div className="flex items-center text-sm">
                                <span className="text-muted-foreground">{t('recordedEvents')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {isLoading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="animate-spin  h-8 w-8" />
                                <p className="mt-2 text-muted-foreground">{t('loadingHistoricalData')}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {selectedTimePeriod === 'monthly' && monthlyData.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('monthlyTemperature')}</CardTitle>
                                        <CardDescription>
                                            {selectedYear} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <LineChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempAvg"
                                                    stroke="var(--color-tempAvg)"
                                                    name={t('avgTemperature')}
                                                    strokeWidth={2}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMin"
                                                    stroke="var(--color-tempMin)"
                                                    name={t('minTemperature')}
                                                    strokeWidth={1.5}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMax"
                                                    stroke="var(--color-tempMax)"
                                                    name={t('maxTemperature')}
                                                    strokeWidth={1.5}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('monthlyRainfall')}</CardTitle>
                                        <CardDescription>
                                            {selectedYear} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <BarChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="rainfall"
                                                    fill="var(--color-rainfall)"
                                                    name={t('rainfall')}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {selectedTimePeriod === 'seasonal' && seasonalData.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('seasonalRainfall')}</CardTitle>
                                        <CardDescription>
                                            {selectedYear} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <BarChart data={seasonalData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="rainfall"
                                                    fill="var(--color-rainfall)"
                                                    name={t('rainfall')}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('seasonalTemperature')}</CardTitle>
                                        <CardDescription>
                                            {selectedYear} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <BarChart data={seasonalData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="temperature"
                                                    fill="var(--color-tempAvg)"
                                                    name={t('avgTemperature')}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {selectedTimePeriod === 'annual' && annualData.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('annualTemperatureTrend')}</CardTitle>
                                        <CardDescription>
                                            {t('temperatureOverYears')} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <LineChart data={annualData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="year" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempAvg"
                                                    stroke="var(--color-tempAvg)"
                                                    name={t('avgTemperature')}
                                                    strokeWidth={2}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMin"
                                                    stroke="var(--color-tempMin)"
                                                    name={t('minTemperature')}
                                                    strokeWidth={1.5}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="tempMax"
                                                    stroke="var(--color-tempMax)"
                                                    name={t('maxTemperature')}
                                                    strokeWidth={1.5}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('annualRainfallTrend')}</CardTitle>
                                        <CardDescription>
                                            {t('rainfallOverYears')} - {selectedLocation?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <BarChart data={annualData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="year" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar
                                                    dataKey="rainfall"
                                                    fill="var(--color-rainfall)"
                                                    name={t('rainfall')}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('compareLocations')}</CardTitle>
                                <CardDescription>{t('compareLocationWeatherData')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-4 mb-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">{t('selectLocation1')}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    <span>{comparisonLocation1?.name || t('selectLocation')}</span>
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
                                        <label className="text-sm font-medium">{t('selectLocation2')}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    <span>{comparisonLocation2?.name || t('selectLocation')}</span>
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
                                        <label className="text-sm font-medium">{t('dataType')}</label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">
                                                    {comparisonDataType === 'temperature' ? (
                                                        <>
                                                            <Thermometer className="mr-2 h-4 w-4" />
                                                            <span>{t('temperature')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CloudRain className="mr-2 h-4 w-4" />
                                                            <span>{t('rainfall')}</span>
                                                        </>
                                                    )}
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setComparisonDataType('temperature')}>
                                                    <Thermometer className="mr-2 h-4 w-4" />
                                                    <span>{t('temperature')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setComparisonDataType('rainfall')}>
                                                    <CloudRain className="mr-2 h-4 w-4" />
                                                    <span>{t('rainfall')}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            variant="primary"
                                            className="h-9"
                                            onClick={fetchComparisonData}
                                            disabled={!comparisonLocation1 || !comparisonLocation2}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            {t('compare')}
                                        </Button>
                                    </div>
                                </div>

                                {comparisonChartData.length > 0 && (
                                    <div className="mt-6">
                                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                            <LineChart data={comparisonChartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="location1"
                                                    stroke="#0D6C44"
                                                    name={comparisonLocation1?.name || 'Location 1'}
                                                    strokeWidth={2}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="location2"
                                                    stroke="#0B3C88"
                                                    name={comparisonLocation2?.name || 'Location 2'}
                                                    strokeWidth={2}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </div>
                                )}

                                {comparisonData1.length > 0 && comparisonData2.length > 0 && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{comparisonLocation1?.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t('avgTemperature')}:</span>
                                                        <span className="font-medium">
                                                            {comparisonData1.length > 0 ? (comparisonData1.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / comparisonData1.length).toFixed(1) : '0'}°C
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t('totalRainfall')}:</span>
                                                        <span className="font-medium">
                                                            {comparisonData1.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0).toFixed(0)}mm
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t('rainyDays')}:</span>
                                                        <span className="font-medium">
                                                            {comparisonData1.filter(record => record.weatherSummary.precipitation.rainAmount > 0.1).length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{comparisonLocation2?.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t('avgTemperature')}:</span>
                                                        <span className="font-medium">
                                                            {comparisonData2.length > 0 ? (comparisonData2.reduce((sum, record) => sum + record.weatherSummary.temperature.current, 0) / comparisonData2.length).toFixed(1) : '0'}°C
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t('totalRainfall')}:</span>
                                                        <span className="font-medium">
                                                            {comparisonData2.reduce((sum, record) => sum + record.weatherSummary.precipitation.rainAmount, 0).toFixed(0)}mm
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t('rainyDays')}:</span>
                                                        <span className="font-medium">
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

                        {historicalData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('dataInsights')}</CardTitle>
                                    <CardDescription>
                                        {t('keyTrendsAndPatterns')} - {selectedLocation?.name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <Thermometer className="h-4 w-4" />
                                                {t('temperatureTrend')}
                                            </h4>
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span>{t('highest')}:</span>
                                                    <span className="font-medium text-red-600">
                                                        {historicalData.length > 0 ? Math.max(...historicalData.map(r => r.weatherSummary.temperature.max)).toFixed(1) : '0'}°C
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('lowest')}:</span>
                                                    <span className="font-medium text-blue-600">
                                                        {historicalData.length > 0 ? Math.min(...historicalData.map(r => r.weatherSummary.temperature.min)).toFixed(1) : '0'}°C
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('average')}:</span>
                                                    <span className="font-medium">
                                                        {avgTemp.toFixed(1)}°C
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <CloudRain className="h-4 w-4" />
                                                {t('rainfallPattern')}
                                            </h4>
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span>{t('totalRainfall')}:</span>
                                                    <span className="font-medium text-blue-600">
                                                        {totalRainfall.toFixed(0)}mm
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('rainyDays')}:</span>
                                                    <span className="font-medium">
                                                        {rainyDays}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('maxDailyRain')}:</span>
                                                    <span className="font-medium">
                                                        {historicalData.length > 0 ? Math.max(...historicalData.map(r => r.weatherSummary.precipitation.rainAmount)).toFixed(1) : '0'}mm
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" />
                                                {t('extremeEvents')}
                                            </h4>
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span>{t('totalEvents')}:</span>
                                                    <span className="font-medium text-amber-600">
                                                        {extremeEvents}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('hotDays')} (&gt;30°C):</span>
                                                    <span className="font-medium">
                                                        {historicalData.filter(r => r.weatherSummary.temperature.max > 30).length}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('heavyRain')} (&gt;50mm):</span>
                                                    <span className="font-medium">
                                                        {historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 50).length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="font-medium mb-3">{t('agriculturalImpact')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <h5 className="text-sm font-medium text-green-600">{t('favorableConditions')}</h5>
                                                <ul className="text-sm space-y-1">
                                                    <li className="flex items-start gap-2">
                                                        <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                        <span>
                                                            {historicalData.filter(r => r.weatherSummary.temperature.current >= 18 && r.weatherSummary.temperature.current <= 25).length} {t('daysOptimalTemp')}
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                        <span>
                                                            {historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 1 && r.weatherSummary.precipitation.rainAmount < 30).length} {t('daysModerateRain')}
                                                        </span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="space-y-2">
                                                <h5 className="text-sm font-medium text-amber-600">{t('challengingConditions')}</h5>
                                                <ul className="text-sm space-y-1">
                                                    <li className="flex items-start gap-2">
                                                        <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                                        <span>
                                                            {historicalData.filter(r => r.weatherSummary.temperature.max > 30 || r.weatherSummary.temperature.min < 10).length} {t('daysExtremeTemp')}
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                                        <span>
                                                            {historicalData.filter(r => r.weatherSummary.precipitation.rainAmount > 50).length} {t('daysHeavyRain')}
                                                        </span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {!isLoading && historicalData.length === 0 && (
                            <Card>
                                <CardContent className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <CloudRain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">{t('noHistoricalData')}</h3>
                                        <p className="text-muted-foreground mb-4">
                                            {t('noDataForSelectedPeriod')}
                                        </p>
                                        <Button variant="outline" onClick={handleRefresh}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            {t('tryAgain')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                <div className="text-xs text-muted-foreground text-center mt-4">
                    {t("dataLastUpdated")}: {new Date().toLocaleString()}
                </div>
            </div>
        </AppLayout>
    );
};

export default Historical;