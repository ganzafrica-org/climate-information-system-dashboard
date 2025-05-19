import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
    Download,
    Filter,
    MapPin,
    RefreshCw,
    Search,
    Thermometer,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';

const musanzeSectors = [
    'Busogo', 'Cyuve', 'Gacaca', 'Gashaki', 'Gataraga',
    'Kimonyi', 'Kinigi', 'Muhoza', 'Muko', 'Musanze',
    'Nkotsi', 'Nyange', 'Remera', 'Rwaza', 'Shingiro'
];

const temperatureData = [
    { year: 2020, avg: 19.8, min: 13.2, max: 26.5 },
    { year: 2021, avg: 20.1, min: 13.5, max: 26.8 },
    { year: 2022, avg: 20.3, min: 13.7, max: 27.0 },
    { year: 2023, avg: 20.5, min: 13.9, max: 27.2 },
    { year: 2024, avg: 20.8, min: 14.1, max: 27.5 },
];

// Monthly temperature data for last year
const monthlyTemperatureData = [
    { month: 'Jan', avg: 20.4, min: 14.1, max: 26.8, reference: 19.5 },
    { month: 'Feb', avg: 20.6, min: 14.3, max: 27.0, reference: 19.7 },
    { month: 'Mar', avg: 20.2, min: 14.0, max: 26.5, reference: 19.5 },
    { month: 'Apr', avg: 19.8, min: 13.8, max: 25.8, reference: 19.3 },
    { month: 'May', avg: 19.5, min: 13.5, max: 25.5, reference: 19.1 },
    { month: 'Jun', avg: 19.0, min: 13.0, max: 25.0, reference: 18.8 },
    { month: 'Jul', avg: 18.8, min: 12.8, max: 24.8, reference: 18.5 },
    { month: 'Aug', avg: 19.2, min: 13.2, max: 25.2, reference: 18.9 },
    { month: 'Sep', avg: 19.8, min: 13.8, max: 25.8, reference: 19.3 },
    { month: 'Oct', avg: 20.2, min: 14.2, max: 26.2, reference: 19.7 },
    { month: 'Nov', avg: 20.5, min: 14.5, max: 26.5, reference: 19.9 },
    { month: 'Dec', avg: 20.6, min: 14.6, max: 26.6, reference: 20.0 },
];

// Rainfall data with baseline for comparison
const rainfallData = [
    { month: 'Jan', current: 60, historical: 55 },
    { month: 'Feb', current: 40, historical: 50 },
    { month: 'Mar', current: 120, historical: 100 },
    { month: 'Apr', current: 150, historical: 130 },
    { month: 'May', current: 80, historical: 90 },
    { month: 'Jun', current: 30, historical: 40 },
    { month: 'Jul', current: 20, historical: 25 },
    { month: 'Aug', current: 25, historical: 30 },
    { month: 'Sep', current: 40, historical: 45 },
    { month: 'Oct', current: 70, historical: 65 },
    { month: 'Nov', current: 90, historical: 85 },
    { month: 'Dec', current: 70, historical: 75 },
];

// Season comparison data (Season A, B, C in Rwanda)
const seasonData = [
    { name: 'Season A', rainfall: 330, normalRainfall: 325, variance: '+1.5%' },
    { name: 'Season B', rainfall: 380, normalRainfall: 360, variance: '+5.6%' },
    { name: 'Season C', rainfall: 45, normalRainfall: 55, variance: '-18.2%' },
];

const chartConfig = {
    temperature: {
        label: 'Temperature (°C)',
        color: 'hsl(var(--primary))',
    },
    min: {
        label: 'Min Temperature (°C)',
        color: '#3b82f6',
    },
    max: {
        label: 'Max Temperature (°C)',
        color: '#ef4444',
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

const Historical: NextPage = () => {
    const { t } = useLanguage();
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedYear, setSelectedYear] = useState(2024);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState('monthly');


    const temperatureTrend = temperatureData[temperatureData.length-1].avg - temperatureData[0].avg;
    const rainfallTrend = rainfallData.reduce((sum, curr) => sum + (curr.current - curr.historical), 0) / rainfallData.length;

    return (
        <AppLayout>
            <Head>
                <title>{t('historical')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-4 md:space-y-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t('musanzeRegion')}</h2>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="ml-2">
                                    <span>{selectedSector === 'all' ? t('selectRegion') : selectedSector}</span>
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setSelectedSector('all')}>
                                    {t('all')}
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                {musanzeSectors.map((sector) => (
                                    <DropdownMenuItem key={sector} onClick={() => setSelectedSector(sector)}>
                                        {sector}
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
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>{selectedYear}</span>
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {[2020, 2021, 2022, 2023, 2024].map((year) => (
                                    <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                                        {year}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            {t('filterBy')}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="monthly" onValueChange={setSelectedTimePeriod}>
                    <TabsList className="w-full flex justify-start overflow-x-auto">
                        <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
                        <TabsTrigger value="seasonal">{t('seasonal')}</TabsTrigger>
                        <TabsTrigger value="annual">{t('annual')}</TabsTrigger>
                        <TabsTrigger value="historical">{t('fiveYearTrend')}</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('avgTemperature')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">20.8°C</div>
                            <div className="flex items-center text-sm">
                                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                                <span className="text-green-500 font-medium">+0.3°C</span>
                                <span className="text-muted-foreground ml-1">{t('vsLastYear')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('totalRainfall')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">795mm</div>
                            <div className="flex items-center text-sm">
                                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                                <span className="text-green-500 font-medium">+5.2%</span>
                                <span className="text-muted-foreground ml-1">{t('vsHistoricalAvg')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('rainyDays')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">115</div>
                            <div className="flex items-center text-sm">
                                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                                <span className="text-red-500 font-medium">-8</span>
                                <span className="text-muted-foreground ml-1">{t('vsLastYear')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('extremeWeatherEvents')}</CardTitle>
                            <CardDescription>{t('for')} {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-1">14</div>
                            <div className="flex items-center text-sm">
                                <TrendingUp className="h-4 w-4 mr-1 text-amber-500" />
                                <span className="text-amber-500 font-medium">+3</span>
                                <span className="text-muted-foreground ml-1">{t('vsLastYear')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Different time period views */}
                {selectedTimePeriod === 'monthly' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('monthlyTemperature')}</CardTitle>
                            <CardDescription>
                                {selectedYear} {t('comparedTo10YearAvg')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[350px]">
                                <LineChart data={monthlyTemperatureData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[12, 28]} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="avg"
                                        stroke="var(--color-temperature)"
                                        name={t('avgTemperature')}
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="min"
                                        stroke="var(--color-min)"
                                        name={t('minTemperature')}
                                        strokeWidth={1.5}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="max"
                                        stroke="var(--color-max)"
                                        name={t('maxTemperature')}
                                        strokeWidth={1.5}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="reference"
                                        stroke="var(--color-historical)"
                                        name={t('historicalAvg')}
                                        strokeDasharray="3 3"
                                    />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                )}

                {selectedTimePeriod === 'seasonal' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('seasonalRainfall')}</CardTitle>
                                <CardDescription>
                                    {selectedYear} {t('comparedToNormal')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <BarChart data={seasonData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar
                                            dataKey="rainfall"
                                            fill="#3b82f6"
                                            name={t('rainfall')}
                                        />
                                        <Bar
                                            dataKey="normalRainfall"
                                            fill="#9ca3af"
                                            name={t('normalRainfall')}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('seasonalComparison')}</CardTitle>
                                <CardDescription>
                                    {t('rainfallVarianceFromNormal')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col justify-center h-[350px]">
                                <div className="space-y-4">
                                    {seasonData.map(season => (
                                        <div key={season.name} className="space-y-2">
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className="font-medium">{season.name}</span>
                                                    <span className="text-sm text-muted-foreground ml-2">
                            ({season.rainfall}mm vs {season.normalRainfall}mm)
                          </span>
                                                </div>
                                                <div className={
                                                    season.variance.startsWith('+')
                                                        ? 'text-green-500 font-medium'
                                                        : 'text-red-500 font-medium'
                                                }>
                                                    {season.variance}
                                                </div>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${
                                                        season.variance.startsWith('+') ? 'bg-green-500' : 'bg-red-500'
                                                    }`}
                                                    style={{
                                                        width: `${Math.min(100, Math.abs(parseInt(season.variance) * 4))}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-medium mb-2">{t('seasonalImpact')}</h3>
                                    <ul className="space-y-1 text-sm">
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('seasonAImpact')}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('seasonBImpact')}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                            <span>{t('seasonCImpact')}</span>
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {selectedTimePeriod === 'annual' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('annualTemperatureTrend')}</CardTitle>
                                <CardDescription>
                                    {t('temperatureLast5Years')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <LineChart data={temperatureData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="year" />
                                        <YAxis domain={[12, 28]} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="avg"
                                            stroke="var(--color-temperature)"
                                            name={t('avgTemperature')}
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="min"
                                            stroke="var(--color-min)"
                                            name={t('minTemperature')}
                                            strokeWidth={1.5}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="max"
                                            stroke="var(--color-max)"
                                            name={t('maxTemperature')}
                                            strokeWidth={1.5}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('annualRainfallComparison')}</CardTitle>
                                <CardDescription>
                                    {t('currentVsHistorical')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <BarChart data={rainfallData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar
                                            dataKey="current"
                                            fill="#3b82f6"
                                            name={t('currentYear')}
                                        />
                                        <Bar
                                            dataKey="historical"
                                            fill="#9ca3af"
                                            name={t('historicalAvg')}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {selectedTimePeriod === 'historical' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('fiveYearClimateAnalysis')}</CardTitle>
                            <CardDescription>
                                {t('longTermTrends')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-medium mb-4">{t('temperatureTrend')}</h3>
                                    <div className="flex items-center text-2xl mb-4">
                                        <TrendingUp className="h-6 w-6 mr-2 text-red-500" />
                                        <span>+{temperatureTrend.toFixed(1)}°C</span>
                                        <span className="text-muted-foreground text-sm ml-2">
                      {t('overFiveYears')}
                    </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('temperatureTrendAnalysis')}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-medium mb-4">{t('rainfallTrend')}</h3>
                                    <div className="flex items-center text-2xl mb-4">
                                        {rainfallTrend > 0 ? (
                                            <TrendingUp className="h-6 w-6 mr-2 text-green-500" />
                                        ) : (
                                            <TrendingDown className="h-6 w-6 mr-2 text-red-500" />
                                        )}
                                        <span className={rainfallTrend > 0 ? 'text-green-500' : 'text-red-500'}>
                      {rainfallTrend > 0 ? '+' : ''}{(rainfallTrend * 100).toFixed(1)}%
                    </span>
                                        <span className="text-muted-foreground text-sm ml-2">
                      {t('averageAnnualChange')}
                    </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('rainfallTrendAnalysis')}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="font-medium mb-4">{t('agriculturalImplications')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">{t('positiveEffects')}</h4>
                                        <ul className="space-y-1 text-sm">
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                <span>{t('positiveEffect1')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                <span>{t('positiveEffect2')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                <span>{t('positiveEffect3')}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">{t('challengesToAddress')}</h4>
                                        <ul className="space-y-1 text-sm">
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-red-500 h-2 w-2 mt-1.5" />
                                                <span>{t('challenge1')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-red-500 h-2 w-2 mt-1.5" />
                                                <span>{t('challenge2')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="rounded-full bg-red-500 h-2 w-2 mt-1.5" />
                                                <span>{t('challenge3')}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="ml-auto">
                                <Download className="h-4 w-4 mr-2" />
                                {t('downloadFullReport')}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t('compareSections')}</CardTitle>
                        <CardDescription>{t('compareSectorsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">{t('selectSector1')}</label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <span>Kinigi</span>
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {musanzeSectors.map((sector) => (
                                            <DropdownMenuItem key={sector}>
                                                {sector}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">{t('selectSector2')}</label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <span>Muhoza</span>
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {musanzeSectors.map((sector) => (
                                            <DropdownMenuItem key={sector}>
                                                {sector}
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
                                            <Thermometer className="mr-2 h-4 w-4" />
                                            <span>{t('temperature')}</span>
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>
                                            <Thermometer className="mr-2 h-4 w-4" />
                                            <span>{t('temperature')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <CloudRain className="mr-2 h-4 w-4" />
                                            <span>{t('rainfall')}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex items-end">
                                <Button>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {t('compare')}
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6">
                            <ChartContainer config={chartConfig} className="h-[350px]">
                                <LineChart data={monthlyTemperatureData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[12, 28]} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="avg"
                                        stroke="#0D6C44"
                                        name="Kinigi"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="reference"
                                        stroke="#0B3C88"
                                        name="Muhoza"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground text-center mt-4">
                    {t('dataLastUpdated')}: {new Date().toLocaleString()}
                </div>
            </div>
        </AppLayout>
    );
};

export default Historical;