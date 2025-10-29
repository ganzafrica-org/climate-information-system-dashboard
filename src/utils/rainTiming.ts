import { HourlyForecast } from '@/types/weather';

// Frontend-calculated rain timing from raw hourly data
export interface RainPeriod {
    hour: number;            // 0-23
    timestamp: number;       // Unix timestamp
    time: string;            // "2:00 PM"
    rainAmount: number;      // mm (for 3-hour period)
    rainChance: number;      // 0-100 (%)
    condition: string;       // Weather description
}

export interface RainTiming {
    hasRain: boolean;
    summary: string;         // 'morning', 'afternoon', 'evening', 'morning_and_afternoon', 'no_rain'
    periods: {
        morning: RainPeriod[];    // 6:00 AM - 12:00 PM
        afternoon: RainPeriod[];  // 12:00 PM - 6:00 PM
        evening: RainPeriod[];    // 6:00 PM - 12:00 AM
        night: RainPeriod[];     // 12:00 AM - 6:00 AM
    };
    peakRainTime: {
        hour: number;           // 0-23
        time: string;           // "3:00 PM"
        amount: string;         // "2.5" (mm)
        chance: number;         // 0-100 (%)
    } | null;
    totalPeriods: number;     // How many periods have rain
    rainStartsAt: {
        hour: number;
        time: string;
        timestamp: number;      // Unix timestamp
    } | null;
    rainEndsAt: {
        hour: number;
        time: string;
        timestamp: number;      // Unix timestamp
    } | null;
}

/**
 * Calculate rain timing from raw hourly forecast data (OpenWeatherMap 3-hour intervals)
 */
export function calculateRainTiming(hourly: HourlyForecast[]): RainTiming | null {
    if (!hourly || hourly.length === 0) {
        return null;
    }

    const periods = {
        morning: [] as RainPeriod[],
        afternoon: [] as RainPeriod[],
        evening: [] as RainPeriod[],
        night: [] as RainPeriod[]
    };

    let peakRain: { hour: number; time: string; amount: number; chance: number } | null = null;
    let rainStart: { hour: number; time: string; timestamp: number } | null = null;
    let rainEnd: { hour: number; time: string; timestamp: number } | null = null;

    hourly.forEach(hour => {
        const date = new Date(hour.dt * 1000);
        const hourOfDay = date.getHours();
        const hasRain = hour.rain > 0 || hour.pop > 0.3;
        
        if (hasRain) {
            const rainChance = Math.round(hour.pop * 100);
            const rainAmount = hour.rain || 0;
            
            const period: RainPeriod = {
                hour: hourOfDay,
                timestamp: hour.dt,
                time: date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }),
                rainAmount,
                rainChance,
                condition: hour.weather[0]?.description || 'unknown'
            };

            // Track peak rain (prioritize rain amount, then chance)
            if (!peakRain || rainAmount > peakRain.amount || 
                (rainAmount === peakRain.amount && rainChance > peakRain.chance)) {
                peakRain = {
                    hour: hourOfDay,
                    time: period.time,
                    amount: rainAmount,
                    chance: rainChance
                };
            }

            // Track rain start
            if (!rainStart) {
                rainStart = {
                    hour: hourOfDay,
                    time: period.time,
                    timestamp: hour.dt
                };
            }

            // Track rain end (always update to latest)
            rainEnd = {
                hour: hourOfDay,
                time: period.time,
                timestamp: hour.dt
            };

            // Categorize by time of day
            if (hourOfDay >= 6 && hourOfDay < 12) {
                periods.morning.push(period);
            } else if (hourOfDay >= 12 && hourOfDay < 18) {
                periods.afternoon.push(period);
            } else if (hourOfDay >= 18 && hourOfDay < 24) {
                periods.evening.push(period);
            } else {
                periods.night.push(period);
            }
        }
    });

    const totalPeriods = periods.morning.length + periods.afternoon.length + 
                         periods.evening.length + periods.night.length;

    if (totalPeriods === 0) {
        return {
            hasRain: false,
            summary: 'no_rain',
            periods,
            peakRainTime: null,
            totalPeriods: 0,
            rainStartsAt: null,
            rainEndsAt: null
        };
    }

    // Generate summary
    const periodNames = [];
    if (periods.morning.length > 0) periodNames.push('morning');
    if (periods.afternoon.length > 0) periodNames.push('afternoon');
    if (periods.evening.length > 0) periodNames.push('evening');
    if (periods.night.length > 0) periodNames.push('night');

    const summary = periodNames.join('_and_');

    return {
        hasRain: true,
        summary,
        periods,
        peakRainTime: peakRain ? {
            hour: peakRain.hour,
            time: peakRain.time,
            amount: peakRain.amount.toFixed(1),
            chance: peakRain.chance
        } : null,
        totalPeriods,
        rainStartsAt: rainStart,
        rainEndsAt: rainEnd
    };
}

