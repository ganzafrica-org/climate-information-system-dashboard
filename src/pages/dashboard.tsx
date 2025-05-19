// src/pages/dashboard.tsx
import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    AlertCircle,
    ArrowRight,
    Calendar,
    ChevronDown,
    CloudDrizzle,
    CloudRain,
    Droplets,
    Eye,
    Filter,
    MapPin,
    Search,
    Sun,
    Thermometer,
    Umbrella,
} from 'lucide-react';

const weatherData = [
    { month: 'Jan', temperature: 22, rainfall: 60, humidity: 65, season: 'A' },
    { month: 'Feb', temperature: 23, rainfall: 40, humidity: 60, season: 'A' },
    { month: 'Mar', temperature: 21, rainfall: 120, humidity: 75, season: 'B' },
    { month: 'Apr', temperature: 20, rainfall: 150, humidity: 80, season: 'B' },
    { month: 'May', temperature: 19, rainfall: 80, humidity: 72, season: 'B' },
    { month: 'Jun', temperature: 18, rainfall: 30, humidity: 68, season: 'B' },
    { month: 'Jul', temperature: 17, rainfall: 20, humidity: 65, season: 'C' },
    { month: 'Aug', temperature: 19, rainfall: 25, humidity: 67, season: 'C' },
    { month: 'Sep', temperature: 20, rainfall: 40, humidity: 70, season: 'A' },
    { month: 'Oct', temperature: 21, rainfall: 70, humidity: 73, season: 'A' },
    { month: 'Nov', temperature: 21, rainfall: 90, humidity: 75, season: 'A' },
    { month: 'Dec', temperature: 22, rainfall: 70, humidity: 70, season: 'A' }
];

const musanzeSectors = [
    'Busogo', 'Cyuve', 'Gacaca', 'Gashaki', 'Gataraga',
    'Kimonyi', 'Kinigi', 'Muhoza', 'Muko', 'Musanze',
    'Nkotsi', 'Nyange', 'Remera', 'Rwaza', 'Shingiro'
];

const chartConfig = {
    temperature: {
        label: 'Temperature (°C)',
        color: 'hsl(var(--primary))',
    },
    rainfall: {
        label: 'Rainfall (mm)',
        color: '#3b82f6',
    },
    humidity: {
        label: 'Humidity (%)',
        color: '#60a5fa',
    },
};

const generateAgriAlerts = () => {
    return [
        {
            type: 'heavyRainAlert',
            severity: 'warning',
            message: 'heavyRainWarning',
            sectors: ['Kinigi', 'Nyange', 'Shingiro'],
            color: 'amber',
            icon: <CloudRain />
        },
        {
            type: 'pestRiskAlert',
            severity: 'warning',
            message: 'pestRiskMessage',
            sectors: ['Musanze', 'Muhoza', 'Cyuve'],
            color: 'red',
            icon: <AlertCircle />
        },
        {
            type: 'irrigationNeeded',
            severity: 'info',
            message: 'irrigationMessage',
            sectors: ['Gacaca', 'Gashaki', 'Rwaza'],
            color: 'blue',
            icon: <Droplets />
        },
        {
            type: 'optimalPlantingAlert',
            severity: 'success',
            message: 'optimalPlantingMessage',
            sectors: ['Busogo', 'Gataraga'],
            color: 'green',
            icon: <Sun />
        }
    ];
};

const cropData = [
    { id: 'maize', name: 'maize', icon: '🌽' },
    { id: 'beans', name: 'beans', icon: '🌱' },
    { id: 'potatoes', name: 'potatoes', icon: '🥔' },
    { id: 'vegetables', name: 'vegetables', icon: '🥬' }
];

const Dashboard: NextPage = () => {
    const { t } = useLanguage();
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedCrop, setSelectedCrop] = useState('all');
    const alerts = generateAgriAlerts();

    const getCurrentSeason = () => {
        const month = new Date().getMonth() + 1; // 1-12
        if (month >= 9 || month <= 2) return 'seasons.seasonA';
        if (month >= 3 && month <= 6) return 'seasons.seasonB';
        return 'seasons.seasonC';
    };

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
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

                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('search')}
                                className="pl-8 w-full sm:w-[180px] h-9"
                            />
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            {t('filterBy')}
                        </Button>
                    </div>
                </div>
                <Card className="bg-ganz-primary/10 border-ganz-primary/30">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-ganz-primary" />
                                <span className="font-medium">{t('currentSeason')}: </span>
                                <span className="font-bold">{t(getCurrentSeason())}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {cropData.map(crop => (
                                    <Button
                                        key={crop.id}
                                        variant={selectedCrop === crop.id ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCrop(crop.id === selectedCrop ? 'all' : crop.id)}
                                        className="px-2 md:px-3"
                                    >
                                        <span className="mr-1">{crop.icon}</span>
                                        <span>{t(crop.name)}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle>{t('todayForecast')}</CardTitle>
                            <CardDescription>Musanze {selectedSector !== 'all' ? `- ${selectedSector}` : ''}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('temperature')}
                                    </p>
                                    <p className="text-3xl font-bold">21°C</p>
                                </div>
                                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <CloudDrizzle className="h-10 w-10 text-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('rainfall')}
                                    </p>
                                    <p className="text-xl font-medium">12mm</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('humidity')}
                                    </p>
                                    <p className="text-xl font-medium">65%</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('wind')}
                                    </p>
                                    <p className="text-xl font-medium">12 km/h</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('soilMoisture')}
                                    </p>
                                    <p className="text-xl font-medium">High</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline">
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
                            {alerts.map((alert, index) => (
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
                                        <div className="mt-0.5 flex-shrink-0 h-5 w-5">
                                            {alert.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium">{t(alert.type)}</p>
                                            <p className="text-sm mt-1">{t(alert.message)}</p>
                                            {alert.sectors && (
                                                <p className="text-sm mt-1 font-medium">
                                                    {t('affectedAreas')}: {alert.sectors.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Droplets className="h-5 w-5 text-blue-500" />
                                        <span className="font-medium">{t('planting')}</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                        <span className="ml-7 text-green-600 dark:text-green-400 font-medium">{t('favorable')}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Umbrella className="h-5 w-5 text-amber-500" />
                                        <span className="font-medium">{t('harvesting')}</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                        <span className="ml-7 text-amber-600 dark:text-amber-400 font-medium">{t('moderate')}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <span className="font-medium">{t('pestRisk')}</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                        <span className="ml-7 text-red-600 dark:text-red-400 font-medium">{t('high')}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-purple-500" />
                                        <span className="font-medium">{t('diseaseRisk')}</span>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                        <span className="ml-7 text-purple-600 dark:text-purple-400 font-medium">{t('moderate')}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="font-medium mb-2">{t('recommendedActivities')}</h3>
                                <ul className="text-sm space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                        <span>{t('plantingRecommendation')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                        <span>{t('fertilizerRecommendation')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                        <span>{t('pestControlRecommendation')}</span>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                                <CardDescription>{t('januaryToDecember')} 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <LineChart data={weatherData}>
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
                                <CardDescription>{t('januaryToDecember')} 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <BarChart data={weatherData}>
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
                                            fill="#3b82f6"
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
                                <CardDescription>{t('januaryToDecember')} 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[350px]">
                                    <LineChart data={weatherData}>
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

                <div className="text-xs text-muted-foreground text-center mt-4">
                    {t('dataLastUpdated')}: {new Date().toLocaleString()}
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;