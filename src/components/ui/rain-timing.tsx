import React from 'react';
import { HourlyForecast } from '@/types/weather';
import { RainTiming, calculateRainTiming } from '@/utils/rainTiming';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CloudRain, Clock, Droplets, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/i18n';

interface RainTimingDisplayProps {
    hourly?: HourlyForecast[];
    className?: string;
}

export const RainTimingDisplay: React.FC<RainTimingDisplayProps> = ({ hourly, className = '' }) => {
    const { t } = useLanguage();

    if (!hourly || hourly.length === 0) {
        return null;
    }

    const rainTiming = calculateRainTiming(hourly);

    if (!rainTiming || !rainTiming.hasRain) {
        return null;
    }

    const formatSummary = (summary: string): string => {
        return summary.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getPeriodLabel = (period: string): string => {
        const labels: Record<string, string> = {
            'morning': t('morning') || 'Morning',
            'afternoon': t('afternoon') || 'Afternoon',
            'evening': t('evening') || 'Evening',
            'night': t('night') || 'Night'
        };
        return labels[period] || period;
    };

    const hasPeriods = (periods: any[]): boolean => {
        return periods && periods.length > 0;
    };

    return (
        <Card className={`border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-l-blue-500 ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                    <CloudRain className="h-5 w-5 text-blue-600" />
                    {t('rainTiming') || 'Rain Timing'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        {formatSummary(rainTiming.summary)}
                    </Badge>
                    {rainTiming.peakRainTime && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                            {t('peakRain') || 'Peak'}: {rainTiming.peakRainTime.time}
                        </Badge>
                    )}
                </div>

                {/* Peak Rain Time */}
                {rainTiming.peakRainTime && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-900">{t('peakRainTime') || 'Peak Rain Time'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                                <span className="text-gray-600">{t('time') || 'Time'}:</span>
                                <span className="font-semibold ml-1 text-blue-900">{rainTiming.peakRainTime.time}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">{t('amount') || 'Amount'}:</span>
                                <span className="font-semibold ml-1 text-blue-900">{rainTiming.peakRainTime.amount}mm</span>
                            </div>
                            <div>
                                <span className="text-gray-600">{t('chance') || 'Chance'}:</span>
                                <span className="font-semibold ml-1 text-blue-900">{rainTiming.peakRainTime.chance}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rain Window */}
                {rainTiming.rainStartsAt && rainTiming.rainEndsAt && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-900">{t('rainWindow') || 'Rain Window'}</span>
                        </div>
                        <div className="text-sm text-blue-800">
                            {rainTiming.rainStartsAt.time} - {rainTiming.rainEndsAt.time}
                        </div>
                    </div>
                )}

                {/* Rain Periods */}
                <div className="space-y-3">
                    {hasPeriods(rainTiming.periods.morning) && (
                        <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                {getPeriodLabel('morning')} ({rainTiming.periods.morning.length} {t('periods') || 'periods'})
                            </h4>
                            <div className="space-y-2">
                                {rainTiming.periods.morning.map((period, idx) => (
                                    <div key={idx} className="bg-white rounded p-2 border border-blue-100 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-900">{period.time}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700">
                                                    <Droplets className="h-3 w-3 inline mr-1" />
                                                    {period.rainAmount}mm
                                                </span>
                                                <span className="text-gray-600">{period.rainChance}%</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 capitalize">{period.condition}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasPeriods(rainTiming.periods.afternoon) && (
                        <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                {getPeriodLabel('afternoon')} ({rainTiming.periods.afternoon.length} {t('periods') || 'periods'})
                            </h4>
                            <div className="space-y-2">
                                {rainTiming.periods.afternoon.map((period, idx) => (
                                    <div key={idx} className="bg-white rounded p-2 border border-blue-100 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-900">{period.time}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700">
                                                    <Droplets className="h-3 w-3 inline mr-1" />
                                                    {period.rainAmount}mm
                                                </span>
                                                <span className="text-gray-600">{period.rainChance}%</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 capitalize">{period.condition}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasPeriods(rainTiming.periods.evening) && (
                        <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                {getPeriodLabel('evening')} ({rainTiming.periods.evening.length} {t('periods') || 'periods'})
                            </h4>
                            <div className="space-y-2">
                                {rainTiming.periods.evening.map((period, idx) => (
                                    <div key={idx} className="bg-white rounded p-2 border border-blue-100 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-900">{period.time}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700">
                                                    <Droplets className="h-3 w-3 inline mr-1" />
                                                    {period.rainAmount}mm
                                                </span>
                                                <span className="text-gray-600">{period.rainChance}%</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 capitalize">{period.condition}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasPeriods(rainTiming.periods.night) && (
                        <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                {getPeriodLabel('night')} ({rainTiming.periods.night.length} {t('periods') || 'periods'})
                            </h4>
                            <div className="space-y-2">
                                {rainTiming.periods.night.map((period, idx) => (
                                    <div key={idx} className="bg-white rounded p-2 border border-blue-100 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-900">{period.time}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700">
                                                    <Droplets className="h-3 w-3 inline mr-1" />
                                                    {period.rainAmount}mm
                                                </span>
                                                <span className="text-gray-600">{period.rainChance}%</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 capitalize">{period.condition}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

