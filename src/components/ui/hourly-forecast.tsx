import React from 'react';
import { HourlyForecast } from '@/types/weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Clock, Droplets, Wind, Thermometer } from 'lucide-react';
import { useLanguage } from '@/i18n';

interface HourlyForecastDisplayProps {
    hourly?: HourlyForecast[];
    className?: string;
}

export const HourlyForecastDisplay: React.FC<HourlyForecastDisplayProps> = ({ hourly, className = '' }) => {
    const { t } = useLanguage();

    if (!hourly || hourly.length === 0) {
        return null;
    }

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getWeatherIcon = (main: string): string => {
        const iconMap: Record<string, string> = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️'
        };
        return iconMap[main] || '☁️';
    };

    return (
        <Card className={`border-0 shadow-md bg-gradient-to-br from-slate-50 to-gray-50 border-l-4 border-l-slate-500 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-600" />
                    {t('hourlyForecast') || 'Hourly Forecast'}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                    {t('threeHourIntervals') || '3-hour intervals from OpenWeatherMap'}
                </p>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex space-x-3 pb-4">
                        {hourly.map((hour, idx) => (
                            <div
                                key={idx}
                                className="flex-shrink-0 w-32 bg-white rounded-lg p-3 border border-slate-200 hover:shadow-md transition-shadow"
                            >
                                <div className="text-center space-y-2">
                                    <div className="text-xs font-medium text-slate-600">
                                        {formatTime(hour.dt)}
                                    </div>
                                    <div className="text-2xl">
                                        {getWeatherIcon(hour.weather[0]?.main || 'Clouds')}
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                        <Thermometer className="h-3 w-3 text-red-500" />
                                        <span className="text-sm font-semibold text-slate-900">
                                            {Math.round(hour.temp)}°
                                        </span>
                                    </div>
                                    {hour.rain > 0 && (
                                        <div className="flex items-center justify-center gap-1">
                                            <Droplets className="h-3 w-3 text-blue-500" />
                                            <span className="text-xs text-blue-700">
                                                {hour.rain.toFixed(1)}mm
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                ({t('3h') || '3h'})
                                            </span>
                                        </div>
                                    )}
                                    {hour.pop > 0 && (
                                        <div className="text-xs text-gray-500">
                                            {Math.round(hour.pop * 100)}% {t('chance') || 'chance'}
                                        </div>
                                    )}
                                    {hour.rain === 0 && hour.pop > 0.3 && (
                                        <div className="text-xs text-blue-500">
                                            {Math.round(hour.pop * 100)}% {t('chance') || 'chance'}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center gap-1">
                                        <Wind className="h-3 w-3 text-gray-500" />
                                        <span className="text-xs text-gray-600">
                                            {Math.round(hour.wind_speed * 3.6)} km/h
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 capitalize truncate">
                                        {hour.weather[0]?.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

