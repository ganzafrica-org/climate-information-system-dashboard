import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    AlertCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CloudDrizzle,
    CloudRain,
    Cloud,
    Download,
    MapPin,
    Share2,
    Sun,
    Thermometer,
    Wind,
} from 'lucide-react';

const musanzeSectors = [
    'Busogo', 'Cyuve', 'Gacaca', 'Gashaki', 'Gataraga',
    'Kimonyi', 'Kinigi', 'Muhoza', 'Muko', 'Musanze',
    'Nkotsi', 'Nyange', 'Remera', 'Rwaza', 'Shingiro'
];

// Mock weekly forecast data for Musanze
const weeklyForecast = [
    {
        day: 'Monday',
        date: '19 May',
        weather: 'cloudy',
        icon: <CloudDrizzle className="h-8 w-8" />,
        temperature: { high: 21, low: 14 },
        precipitation: 60,
        humidity: 75,
        wind: 12,
        alerts: ['heavyRainAlert']
    },
    {
        day: 'Tuesday',
        date: '20 May',
        weather: 'rainy',
        icon: <CloudRain className="h-8 w-8" />,
        temperature: { high: 19, low: 13 },
        precipitation: 80,
        humidity: 85,
        wind: 15,
        alerts: ['heavyRainAlert', 'floodRiskAlert']
    },
    {
        day: 'Wednesday',
        date: '21 May',
        weather: 'partlyCloudy',
        icon: <Cloud className="h-8 w-8" />,
        temperature: { high: 22, low: 14 },
        precipitation: 40,
        humidity: 70,
        wind: 10,
        alerts: []
    },
    {
        day: 'Thursday',
        date: '22 May',
        weather: 'sunny',
        icon: <Sun className="h-8 w-8" />,
        temperature: { high: 24, low: 15 },
        precipitation: 10,
        humidity: 60,
        wind: 8,
        alerts: ['optimalPlantingAlert']
    },
    {
        day: 'Friday',
        date: '23 May',
        weather: 'sunny',
        icon: <Sun className="h-8 w-8" />,
        temperature: { high: 25, low: 16 },
        precipitation: 5,
        humidity: 55,
        wind: 7,
        alerts: ['irrigationNeeded']
    },
    {
        day: 'Saturday',
        date: '24 May',
        weather: 'partlyCloudy',
        icon: <Cloud className="h-8 w-8" />,
        temperature: { high: 23, low: 15 },
        precipitation: 20,
        humidity: 65,
        wind: 9,
        alerts: []
    },
    {
        day: 'Sunday',
        date: '25 May',
        weather: 'cloudy',
        icon: <CloudDrizzle className="h-8 w-8" />,
        temperature: { high: 21, low: 14 },
        precipitation: 50,
        humidity: 70,
        wind: 11,
        alerts: []
    }
];

// Hour-by-hour forecast for today
const hourlyForecast = Array.from({ length: 24 }, (_, i) => {
    let hour = i;
    const period = hour < 12 ? 'AM' : 'PM';
    hour = hour % 12 || 12;

    // Temperature curve: cooler at night, warmer during day
    let temp = 0;
    if (i < 6) temp = 14 + i * 0.2; // Night: 14-15.2°C
    else if (i < 12) temp = 15 + (i - 6); // Morning: 15-21°C
    else if (i < 18) temp = 21 - (i - 12) * 0.5; // Afternoon: 21-18°C
    else temp = 18 - (i - 18) * 0.6; // Evening: 18-15.6°C

    let precipitation = 0;
    if (i >= 14 && i <= 18) precipitation = 60 + (i - 14) * 5; // Rain in afternoon

    return {
        hour: `${hour} ${period}`,
        temp: Math.round(temp * 10) / 10,
        icon: i >= 14 && i <= 18 ? <CloudRain className="h-6 w-6" /> :
            i >= 7 && i <= 19 ? <Sun className="h-6 w-6" /> :
                <Cloud className="h-6 w-6" />,
        precipitation: precipitation,
        wind: 8 + Math.sin(i * 0.4) * 5, // Wind varies throughout day
    };
});

const Forecasts: NextPage = () => {
    const { t } = useLanguage();
    const [selectedSector, setSelectedSector] = useState('all');
    const [activeDay, setActiveDay] = useState(0);
    const [viewType, setViewType] = useState('daily');


    return (
        <AppLayout>
            <Head>
                <title>{t('forecasts')} | {t('climateInformationSystem')}</title>
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

                    <div className="flex items-center gap-2">
                        <Tabs defaultValue="daily" onValueChange={(value) => setViewType(value)}>
                            <TabsList>
                                <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
                                <TabsTrigger value="hourly">{t('hourly')}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
                <div className="w-full overflow-x-auto pb-2">
                    <div className="flex min-w-max space-x-2">
                        {weeklyForecast.map((day, index) => (
                            <Card
                                key={day.day}
                                className={`w-[120px] flex-shrink-0 cursor-pointer transition-colors ${
                                    activeDay === index ? 'border-ganz-primary bg-ganz-primary/5' : ''
                                }`}
                                onClick={() => setActiveDay(index)}
                            >
                                <CardContent className="p-3 text-center">
                                    <div className="font-medium">{day.day}</div>
                                    <div className="text-xs text-muted-foreground">{day.date}</div>
                                    <div className="my-2 flex justify-center text-blue-500">{day.icon}</div>
                                    <div className="flex justify-center gap-2 text-sm">
                                        <span className="font-medium">{day.temperature.high}°</span>
                                        <span className="text-muted-foreground">{day.temperature.low}°</span>
                                    </div>
                                    {day.alerts.length > 0 && (
                                        <div className="mt-1 flex justify-center">
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {viewType === 'daily' ? (
                    <>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{weeklyForecast[activeDay].day}</CardTitle>
                                        <CardDescription>{weeklyForecast[activeDay].date}</CardDescription>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button variant="outline" size="icon" disabled={activeDay === 0} onClick={() => setActiveDay(prev => Math.max(0, prev - 1))}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" disabled={activeDay === weeklyForecast.length - 1} onClick={() => setActiveDay(prev => Math.min(weeklyForecast.length - 1, prev + 1))}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center">
                                        <div className="text-blue-500 mr-6">
                                            {weeklyForecast[activeDay].icon}
                                        </div>
                                        <div>
                                            <div className="text-4xl font-bold">
                                                {weeklyForecast[activeDay].temperature.high}°C
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {t('lowTemp')}: {weeklyForecast[activeDay].temperature.low}°C
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                                        <div className="flex items-center gap-2">
                                            <CloudRain className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('precipitation')}</div>
                                                <div className="font-medium">{weeklyForecast[activeDay].precipitation}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Wind className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('wind')}</div>
                                                <div className="font-medium">{weeklyForecast[activeDay].wind} km/h</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Thermometer className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <div className="text-sm text-muted-foreground">{t('humidity')}</div>
                                                <div className="font-medium">{weeklyForecast[activeDay].humidity}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-3">{t('agriculturalImpact')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{t('recommendedActivities')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {weeklyForecast[activeDay].precipitation > 60 ? (
                                                        <>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-red-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('avoidFertilizing')}</span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('ensureDrainage')}</span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('protectSeedlings')}</span>
                                                            </li>
                                                        </>
                                                    ) : weeklyForecast[activeDay].precipitation < 20 ? (
                                                        <>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('irrigationRecommended')}</span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('mulchingSoil')}</span>
                                                            </li>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('normalFarmingOperations')}</span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                                                <span>{t('moderateIrrigation')}</span>
                                                            </li>
                                                        </>
                                                    )}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{t('suitableForCrops')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['maize', 'beans', 'potatoes', 'vegetables'].map(crop => {
                                                        let suitability = 'high';
                                                        if (
                                                            (crop === 'maize' && weeklyForecast[activeDay].precipitation > 70) ||
                                                            (crop === 'vegetables' && weeklyForecast[activeDay].wind > 12)
                                                        ) {
                                                            suitability = 'low';
                                                        } else if (
                                                            (crop === 'potatoes' && weeklyForecast[activeDay].precipitation > 50) ||
                                                            (crop === 'beans' && weeklyForecast[activeDay].precipitation < 20)
                                                        ) {
                                                            suitability = 'moderate';
                                                        }

                                                        return (
                                                            <div key={crop} className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    suitability === 'high' ? 'bg-green-500' :
                                                                        suitability === 'moderate' ? 'bg-amber-500' :
                                                                            'bg-red-500'
                                                                }`} />
                                                                <span className="capitalize">{t(crop)}</span>
                                                                <span className="text-xs text-muted-foreground ml-auto">
                                  {t(suitability)}
                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                                {weeklyForecast[activeDay].alerts.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3">{t('weatherAlerts')}</h3>
                                        <div className="space-y-2">
                                            {weeklyForecast[activeDay].alerts.map(alert => (
                                                <div
                                                    key={alert}
                                                    className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 p-3"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-medium">{t(alert)}</p>
                                                            <p className="text-sm mt-1">{t(`${alert.replace('Alert', '')}Warning`)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('exportForecast')}
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    {t('shareForecast')}
                                </Button>
                            </CardFooter>
                        </Card>
                    </>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('hourlyForecast')}</CardTitle>
                                <CardDescription>{weeklyForecast[0].date} - {t('today')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <div className="inline-block min-w-full align-middle">
                                        <div className="grid grid-cols-8 md:grid-cols-12 gap-4">
                                            {hourlyForecast.map((hour, index) => (
                                                <div
                                                    key={index}
                                                    className="flex flex-col items-center p-2 rounded-md border bg-card hover:bg-accent transition-colors"
                                                >
                                                    <span className="text-xs text-muted-foreground">{hour.hour}</span>
                                                    <div className="my-1 text-blue-500">{hour.icon}</div>
                                                    <span className="font-medium">{hour.temp}°</span>
                                                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                                                        <CloudRain className="h-3 w-3 mr-1" />
                                                        <span>{hour.precipitation > 0 ? `${hour.precipitation}%` : '-'}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                                                        <Wind className="h-3 w-3 mr-1" />
                                                        <span>{Math.round(hour.wind)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('todaysFarmingOutlook')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="text-base font-medium mb-2">{t('morning')} (6 AM - 12 PM)</h3>
                                    <ul className="space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('morningFarmingRecommendation1')}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('morningFarmingRecommendation2')}</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-base font-medium mb-2">{t('afternoon')} (12 PM - 6 PM)</h3>
                                    <ul className="space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-amber-500 h-2 w-2 mt-1.5" />
                                            <span>{t('afternoonFarmingRecommendation1')}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-red-500 h-2 w-2 mt-1.5" />
                                            <span>{t('afternoonFarmingRecommendation2')}</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-base font-medium mb-2">{t('evening')} (6 PM - 5 AM)</h3>
                                    <ul className="space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('eveningFarmingRecommendation1')}</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                            <span>{t('eveningFarmingRecommendation2')}</span>
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                <div className="text-xs text-muted-foreground text-center mt-4">
                    {t('forecastDisclaimer')}
                </div>
            </div>
        </AppLayout>
    );
};

export default Forecasts;