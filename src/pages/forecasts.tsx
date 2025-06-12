import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, CloudDrizzle, CloudRain,
  Cloud, Download, MapPin, Share2, Sun, Thermometer, Wind, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  WeatherData, DailyWeather, ApiResponse, WeatherRequestParams
} from "@/types/weather";
import { Location, LocationsResponse } from "@/types/farmer";

const getWeatherIcon = (condition: string): React.ReactElement => {

  const iconMap: { [key: string]: React.ReactElement } = {
    'clear': <Sun className="h-8 w-8" />,
    'clouds': <Cloud className="h-8 w-8" />,
    'rain': <CloudRain className="h-8 w-8" />,
    'drizzle': <CloudDrizzle className="h-8 w-8" />,
    'snow': <CloudDrizzle className="h-8 w-8" />,
    'thunderstorm': <CloudRain className="h-8 w-8" />,
  };

  const conditionKey = condition.toLowerCase();
  return iconMap[conditionKey] || <Cloud className="h-8 w-8" />;
};

const Forecasts: NextPage = () => {
  const { t } = useLanguage();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchWeatherData(selectedLocation.id);
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });
      setLocations(response.data.locations);

      if (response.data.locations.length > 0) {
        setSelectedLocation(response.data.locations[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      toast.error(t('failedToLoadLocations'));
    }
  };

  const fetchWeatherData = async (locationId: number) => {
    setIsLoading(true);
    try {
      const params: WeatherRequestParams = { type: 'daily' };
      const response = await api.get<ApiResponse<WeatherData>>(
          `/api/weather/location/${locationId}`,
          { params }
      );

      setWeatherData(response.data);

      const todayIndex = response.data.weather.daily.findIndex(day => day.isToday);
      if (todayIndex !== -1) {
        setActiveDay(todayIndex);
      } else {
        setActiveDay(0);
      }
    } catch (error: any) {
      console.error('Failed to fetch weather data:', error);
      toast.error(t('failedToLoadWeather'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedLocation) return;

    setIsRefreshing(true);
    try {
      await fetchWeatherData(selectedLocation.id);
      toast.success(t('weatherDataRefreshed'));
    } catch (error) {
      toast.error(t('failedToRefreshWeather'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportForecast = () => {
    if (!weatherData) {
      toast.error(t('noDataToExport'));
      return;
    }

    try {

      const exportData = weatherData.weather.daily.map(day => ({
        [t('date')]: day.date,
        [t('day')]: day.dayOfWeek,
        [t('condition')]: day.condition,
        [t('tempMin')]: `${day.tempMin}°C`,
        [t('tempMax')]: `${day.tempMax}°C`,
        [t('humidity')]: `${day.humidity}%`,
        [t('rainChance')]: `${day.rainChance}%`,
        [t('rainAmount')]: `${day.rainAmount}mm`,
        [t('windSpeed')]: `${day.windSpeed} km/h`,
        [t('windDirection')]: day.windDirection,
        [t('farmingRecommendation')]: day.farmingRecommendation,
        [t('soilCondition')]: day.soilCondition,
      }));

      const filename = `weather_forecast_${selectedLocation?.name}_${new Date().toISOString().split('T')[0]}.csv`;
      api.exportAsCSV(exportData, filename);

      toast.success(t('forecastExportedSuccessfully'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('failedToExportForecast'));
    }
  };

  const handleShareForecast = () => {
    if (!weatherData || !selectedLocation) {
      toast.error(t('noDataToShare'));
      return;
    }

    const activeDayData = weatherData.weather.daily[activeDay];
    const shareText = `Weather Forecast for ${selectedLocation.name}\n${activeDayData.dayOfWeek}, ${activeDayData.formattedDate}\n${activeDayData.condition}\nTemp: ${activeDayData.tempMin}°C - ${activeDayData.tempMax}°C\nRain: ${activeDayData.rainChance}%\n\n${activeDayData.farmingRecommendation}`;

    if (navigator.share) {
      navigator.share({
        title: `Weather Forecast - ${selectedLocation.name}`,
        text: shareText,
      }).catch(err => console.log('Error sharing:', err));
    } else {

      navigator.clipboard.writeText(shareText).then(() => {
        toast.success(t('forecastCopiedToClipboard'));
      }).catch(() => {
        toast.error(t('failedToCopyForecast'));
      });
    }
  };

  const getSuitabilityColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'moderate': return 'bg-amber-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCropSuitability = (crop: string, dayData: DailyWeather) => {

    if (crop === 'maize' && dayData.rainChance > 70) return 'low';
    if (crop === 'vegetables' && dayData.windSpeed > 12) return 'low';
    if (crop === 'potatoes' && dayData.rainChance > 50) return 'moderate';
    if (crop === 'beans' && dayData.rainChance < 20) return 'moderate';
    return 'high';
  };

  if (isLoading && !weatherData) {
    return (
        <AppLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8" />
              <p className="mt-2 text-muted-foreground">{t('loadingWeatherData')}</p>
            </div>
          </div>
        </AppLayout>
    );
  }

  return (
      <AppLayout>
        <Head>
          <title>
            {t("forecasts")} | {t("climateInformationSystem")}
          </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ganz-primary" />
              <h2 className="text-lg font-medium">{t("weatherForecast")}</h2>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2 h-9">
                    <span>{selectedLocation?.name || t("selectLocation")}</span>
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

            <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('refreshing') : t('refresh')}
            </Button>
          </div>

          {weatherData && (
              <>
                <div className="w-full overflow-x-auto pb-2">
                  <div className="flex min-w-max space-x-3">
                    {weatherData.weather.daily.map((day, index) => (
                        <Card
                            key={day.date}
                            className={`w-[120px] lg:w-[140px] flex-shrink-0 cursor-pointer transition-colors ${
                                activeDay === index ? "border-green-950" : ""
                            }`}
                            onClick={() => setActiveDay(index)}
                        >
                          <CardContent className="p-3 text-center">
                            <div className="font-medium">
                              {day.isToday ? t('today') : day.dayOfWeek}
                            </div>
                            <div className="text-xs text-muted-foreground">{day.formattedDate}</div>
                            <div className="my-2 flex justify-center text-blue-500">
                              {getWeatherIcon(day.conditionMain)}
                            </div>
                            <div className="flex justify-center gap-2 text-sm">
                              <span className="text-medium">{day.tempMin}°</span>
                              <span className="font-medium">-</span>
                              <span className="font-medium">{day.tempMax}°</span>
                            </div>
                            {day.rainChance > 50 && (
                                <div className="mt-1 flex justify-center">
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                </div>
                            )}
                          </CardContent>
                        </Card>
                    ))}
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {weatherData.weather.daily[activeDay].isToday
                              ? t('today')
                              : weatherData.weather.daily[activeDay].dayOfWeek
                          }
                        </CardTitle>
                        <CardDescription>
                          {weatherData.weather.daily[activeDay].formattedDate} - {selectedLocation?.name}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={activeDay === 0}
                            onClick={() => setActiveDay((prev) => Math.max(0, prev - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={activeDay === weatherData.weather.daily.length - 1}
                            onClick={() => setActiveDay((prev) => Math.min(weatherData.weather.daily.length - 1, prev + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center">
                        <div className="text-blue-500 mr-6">
                          {getWeatherIcon(weatherData.weather.daily[activeDay].conditionMain)}
                        </div>
                        <div>
                          <div className="text-4xl font-bold">
                            {weatherData.weather.daily[activeDay].tempMax}°C
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("lowTemp")}: {weatherData.weather.daily[activeDay].tempMin}°C
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {weatherData.weather.daily[activeDay].condition}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                        <div className="flex items-center gap-2">
                          <CloudRain className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="text-sm text-muted-foreground">{t("precipitation")}</div>
                            <div className="font-medium">
                              {weatherData.weather.daily[activeDay].rainChance}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wind className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="text-sm text-muted-foreground">{t("wind")}</div>
                            <div className="font-medium">
                              {weatherData.weather.daily[activeDay].windSpeed} km/h
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="text-sm text-muted-foreground">{t("humidity")}</div>
                            <div className="font-medium">
                              {weatherData.weather.daily[activeDay].humidity}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">{t("agriculturalImpact")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t("farmingRecommendation")}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm mb-3">
                              {weatherData.weather.daily[activeDay].farmingRecommendation}
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {t("soilCondition")}: {weatherData.weather.daily[activeDay].soilCondition}
                                </Badge>
                              </div>
                              {weatherData.weather.daily[activeDay].rainAmount > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                      {t("expectedRainfall")}: {weatherData.weather.daily[activeDay].rainAmount}mm
                                    </Badge>
                                  </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t("cropSuitability")}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                              {["maize", "beans", "potatoes", "vegetables"].map((crop) => {
                                const suitability = getCropSuitability(crop, weatherData.weather.daily[activeDay]);
                                return (
                                    <div key={crop} className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${getSuitabilityColor(suitability)}`} />
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
                    {weatherData.weather.alerts.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">{t("weatherAlerts")}</h3>
                          <div className="space-y-2">
                            {weatherData.weather.alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 p-3"
                                >
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">{alert.title || t('weatherAlert')}</p>
                                      <p className="text-sm mt-1">
                                        {alert.message || alert.description || t('checkWeatherConditions')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={handleExportForecast}>
                      <Download className="mr-2 h-4 w-4" />
                      {t("exportForecast")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShareForecast}>
                      <Share2 className="mr-2 h-4 w-4" />
                      {t("shareForecast")}
                    </Button>
                  </CardFooter>
                </Card>
              </>
          )}

          <div className="text-xs text-muted-foreground text-center mt-4">
            {t("forecastDisclaimer")}
          </div>
        </div>
      </AppLayout>
  );
};

export default Forecasts;