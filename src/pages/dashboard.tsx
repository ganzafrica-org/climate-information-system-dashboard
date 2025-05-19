import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useTheme } from 'next-themes';

// Mock data
const weatherData = [
    { month: 'Jan', temperature: 22, rainfall: 60, humidity: 65 },
    { month: 'Feb', temperature: 23, rainfall: 90, humidity: 70 },
    { month: 'Mar', temperature: 21, rainfall: 120, humidity: 75 },
    { month: 'Apr', temperature: 20, rainfall: 150, humidity: 80 },
    { month: 'May', temperature: 19, rainfall: 80, humidity: 72 },
    { month: 'Jun', temperature: 18, rainfall: 40, humidity: 68 },
];

// Chart configuration
const chartConfig = {
    temperature: {
        label: 'Temperature (°C)',
        color: 'hsl(var(--primary))',
    },
    rainfall: {
        label: 'Rainfall (mm)',
        color: 'hsl(var(--secondary))',
    },
    humidity: {
        label: 'Humidity (%)',
        color: '#60a5fa',
    },
};

const Dashboard: NextPage = () => {
    const { t } = useLanguage();
    const { theme } = useTheme();

    return (
        <AppLayout>
            <Head>
                <title>{t('dashboard')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="grid gap-6">
                <div className="flex flex-col gap-4 md:flex-row">
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle>{t('todayForecast')}</CardTitle>
                            <CardDescription>Musanze Region</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('temperature')}
                                    </p>
                                    <p className="text-3xl font-bold">21°C</p>
                                </div>
                                <div>
                                    {/* Weather icon would go here */}
                                    <span className="text-6xl">⛅</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {t('rainfall')}
                                    </p>
                                    <p className="text-xl font-medium">40mm</p>
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
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle>{t('alerts')}</CardTitle>
                            <CardDescription>Active Weather Alerts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 p-3 mb-3">
                                <p className="font-medium">Heavy rainfall expected in the afternoon</p>
                                <p className="text-sm">2:00 PM - 6:00 PM</p>
                            </div>
                            <div className="rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-400 p-3">
                                <p className="font-medium">Strong winds tomorrow morning</p>
                                <p className="text-sm">6:00 AM - 10:00 AM</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="temperature" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="temperature">{t('temperature')}</TabsTrigger>
                        <TabsTrigger value="rainfall">{t('rainfall')}</TabsTrigger>
                        <TabsTrigger value="humidity">{t('humidity')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="temperature" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('weeklyOverview')}: {t('temperature')}</CardTitle>
                                <CardDescription>January - June 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-80">
                                    <LineChart data={weatherData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line
                                            type="monotone"
                                            dataKey="temperature"
                                            stroke="var(--color-temperature)"
                                            strokeWidth={2}
                                            dot={{ strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rainfall" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('weeklyOverview')}: {t('rainfall')}</CardTitle>
                                <CardDescription>January - June 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-80">
                                    <BarChart data={weatherData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar
                                            dataKey="rainfall"
                                            fill="var(--color-rainfall)"
                                            radius={4}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="humidity" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('weeklyOverview')}: {t('humidity')}</CardTitle>
                                <CardDescription>January - June 2024</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-80">
                                    <LineChart data={weatherData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line
                                            type="monotone"
                                            dataKey="humidity"
                                            stroke="#60a5fa"
                                            strokeWidth={2}
                                            dot={{ strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('farmersReached')}</CardTitle>
                            <CardDescription>Last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">1,245</div>
                            <p className="text-sm text-muted-foreground mt-2">+12% from previous period</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('messagesDelivered')}</CardTitle>
                            <CardDescription>Last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">5,832</div>
                            <p className="text-sm text-muted-foreground mt-2">+24% from previous period</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('alertsTriggered')}</CardTitle>
                            <CardDescription>Last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">18</div>
                            <p className="text-sm text-muted-foreground mt-2">-5% from previous period</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default Dashboard;