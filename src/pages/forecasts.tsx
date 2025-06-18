import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, CloudDrizzle, CloudRain,
  Cloud, Download, MapPin, Share2, Sun, Wind, RefreshCw, Loader2, Droplets, WifiOff, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  WeatherData, ApiResponse, WeatherRequestParams
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
    toast.error(t('failedToLoadWeather') || 'Failed to load weather data.');
    return 'unknown_error';
  }
};

const Forecasts: NextPage = () => {
  const { t } = useLanguage();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<string>('');

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
      setHasError(false);
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });

      if (response?.data?.locations) {
        setLocations(response.data.locations);
        if (response.data.locations.length > 0) {
          setSelectedLocation(response.data.locations[0]);
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

  const fetchWeatherData = async (locationId: number) => {
    try {
      setIsLoading(true);
      setHasError(false);
      setErrorType('');

      const params: WeatherRequestParams = { type: 'daily' };
      const response = await api.get<ApiResponse<WeatherData>>(
          `/api/weather/location/${locationId}`,
          { params }
      );

      if (response?.data?.weather?.daily && response.data.weather.daily.length > 0) {
        setWeatherData(response.data);

        const todayIndex = response.data.weather.daily.findIndex(day => day.isToday);
        if (todayIndex !== -1) {
          setActiveDay(todayIndex);
        } else {
          setActiveDay(0);
        }
      } else {

        setWeatherData(null);
        setHasError(true);
        setErrorType('no_data');
        toast.error(t('noWeatherDataAvailable') || 'No weather data available for this location.');
      }
    } catch (error: any) {
      const errorType = handleApiError(error, t);
      setWeatherData(null);
      setHasError(true);
      setErrorType(errorType);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedLocation) return;

    setIsRefreshing(true);
    try {
      await fetchWeatherData(selectedLocation.id);
      if (!hasError) {
        toast.success(t('weatherDataRefreshed') || 'Weather data updated successfully.');
      }
    } catch (error) {

    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportForecast = () => {
    if (!weatherData || !weatherData.weather?.daily?.length) {
      toast.error(t('noDataToExport') || 'No data available to export.');
      return;
    }

    try {
      const exportData = weatherData.weather.daily.map(day => ({
        [t('date') || 'Date']: day.date,
        [t('day') || 'Day']: day.dayOfWeek,
        [t('condition') || 'Condition']: day.condition,
        [t('tempMin') || 'Min Temp']: `${day.tempMin}°C`,
        [t('tempMax') || 'Max Temp']: `${day.tempMax}°C`,
        [t('humidity') || 'Humidity']: `${day.humidity}%`,
        [t('rainChance') || 'Rain Chance']: `${day.rainChance}%`,
        [t('rainAmount') || 'Rain Amount']: `${day.rainAmount}mm`,
        [t('windSpeed') || 'Wind Speed']: `${day.windSpeed} km/h`,
        [t('windDirection') || 'Wind Direction']: day.windDirection,
        [t('overview') || 'Overview']: day.farmingRecommendation,
        [t('soilCondition') || 'Soil Condition']: day.soilCondition,
      }));

      const filename = `weather_forecast_${selectedLocation?.name || 'location'}_${new Date().toISOString().split('T')[0]}.csv`;
      api.exportAsCSV(exportData, filename);

      toast.success(t('forecastExportedSuccessfully') || 'Forecast exported successfully.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('failedToExportForecast') || 'Failed to export forecast.');
    }
  };

  const handleShareForecast = () => {
    if (!weatherData || !selectedLocation || !weatherData.weather?.daily?.length) {
      toast.error(t('noDataToShare') || 'No data available to share.');
      return;
    }

    try {
      const activeDayData = weatherData.weather.daily[activeDay];
      const shareText = `Weather Forecast for ${selectedLocation.name}\n${activeDayData.dayOfWeek}, ${activeDayData.formattedDate}\n${activeDayData.condition}\nTemp: ${activeDayData.tempMin}°C - ${activeDayData.tempMax}°C\nRain: ${activeDayData.rainChance}%\n\n${activeDayData.farmingRecommendation}`;

      if (navigator.share) {
        navigator.share({
          title: `Weather Forecast - ${selectedLocation.name}`,
          text: shareText,
        }).catch(err => console.log('Error sharing:', err));
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          toast.success(t('forecastCopiedToClipboard') || 'Forecast copied to clipboard.');
        }).catch(() => {
          toast.error(t('failedToCopyForecast') || 'Failed to copy forecast.');
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error(t('failedToShareForecast') || 'Failed to share forecast.');
    }
  };

  const renderEmptyState = () => {
    let icon = <CloudRain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
    let title = t('noWeatherData') || 'No Weather Data';
    let description = t('noWeatherDataDescription') || 'Unable to load weather data at the moment.';

    switch (errorType) {
      case 'timeout':
        icon = <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        title = t('requestTimeout') || 'Request Timed Out';
        description = t('timeoutDescription') || 'The request took too long to complete. Please check your connection and try again.';
        break;
      case 'network_error':
        icon = <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        title = t('networkError') || 'Network Error';
        description = t('networkErrorDescription') || 'Please check your internet connection and try again.';
        break;
      case 'server_error':
        icon = <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        title = t('serverError') || 'Server Error';
        description = t('serverErrorDescription') || 'Our servers are experiencing issues. Please try again later.';
        break;
      case 'not_found':
        icon = <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        title = t('dataNotFound') || 'Data Not Found';
        description = t('dataNotFoundDescription') || 'No weather data available for the selected location.';
        break;
      case 'no_locations':
        icon = <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        title = t('noLocations') || 'No Locations';
        description = t('noLocationsDescription') || 'No locations available. Please add a location first.';
        break;
      default:
        break;
    }

    return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              {icon}
              <h3 className="text-lg font-medium mb-2">{title}</h3>
              <p className="text-muted-foreground mb-4">
                {description}
              </p>
              <Button
                  variant="outline"
                  onClick={errorType === 'no_locations' ? fetchLocations : handleRefresh}
                  disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
                {(isRefreshing || isLoading) ? (t('loading') || 'Loading...') : (t('tryAgain') || 'Try Again')}
              </Button>
            </div>
          </CardContent>
        </Card>
    );
  };

  if (isLoading && !weatherData && !hasError) {
    return (
        <AppLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
              <p className="text-muted-foreground">{t('loadingWeatherData') || 'Loading weather data...'}</p>
            </div>
          </div>
        </AppLayout>
    );
  }

  return (
      <AppLayout>
        <Head>
          <title>
            {t("forecasts") || "Forecasts"} | {t("climateInformationSystem") || "Climate Information System"}
          </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ganz-primary" />
              <h2 className="text-lg font-medium">{t("weatherForecast") || "Weather Forecast"}</h2>

              {locations.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-2 h-9">
                        <span>{selectedLocation?.name || t("selectLocation") || "Select Location"}</span>
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

            
            <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
              <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading || !selectedLocation}
                  className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? (t('updating') || 'Updating...') : (t('updateData') || 'Update Data')}
              </Button>

              <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportForecast}
                  className="h-9"
                  disabled={!weatherData || !weatherData.weather?.daily?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                {t("exportForecast") || "Export Forecast"}
              </Button>

              <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareForecast}
                  className="h-9"
                  disabled={!weatherData || !weatherData.weather?.daily?.length}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t("shareForecast") || "Share Forecast"}
              </Button>
            </div>
          </div>

          
          {weatherData && weatherData.weather?.daily?.length > 0 ? (
              <>
                
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  
                  <div className="lg:col-span-1 order-1">
                    <div className="md:hidden">
                      
                      <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-3 pb-4">
                          {weatherData.weather.daily.map((day, index) => (
                              <Card
                                  key={day.date}
                                  className={`w-[120px] flex-shrink-0 cursor-pointer transition-colors ${
                                      activeDay === index ? "border-green-950" : ""
                                  }`}
                                  onClick={() => setActiveDay(index)}
                              >
                                <CardContent className="p-3 text-center">
                                  <div className="font-medium">
                                    {day.isToday ? (t('today') || 'Today') : day.dayOfWeek}
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
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>

                    <div className="hidden md:block">
                      
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-3">
                          {weatherData.weather.daily.map((day, index) => (
                              <Card
                                  key={day.date}
                                  className={`cursor-pointer transition-colors ${
                                      activeDay === index ? "border-green-950 bg-muted/50" : ""
                                  }`}
                                  onClick={() => setActiveDay(index)}
                              >
                                <CardContent className="p-3">
                                  <div className="text-center">
                                    <div className="font-medium text-sm">
                                      {day.isToday ? (t('today') || 'Today') : day.dayOfWeek}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">{day.formattedDate}</div>
                                    <div className="flex justify-center text-blue-500 mb-2">
                                      {getWeatherIcon(day.conditionMain)}
                                    </div>
                                    <div className="flex justify-center gap-1 text-sm">
                                      <span className="text-medium">{day.tempMin}°</span>
                                      <span>-</span>
                                      <span className="font-medium">{day.tempMax}°</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                                      {day.condition}
                                    </div>
                                    {day.rainChance > 50 && (
                                        <div className="mt-2 flex justify-center">
                                          <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="md:col-span-3 lg:col-span-4 order-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>
                              {weatherData.weather.daily[activeDay].isToday
                                  ? (t('today') || 'Today')
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
                                {t("lowTemp") || "Low"}: {weatherData.weather.daily[activeDay].tempMin}°C
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {weatherData.weather.daily[activeDay].condition}
                              </div>
                            </div>
                          </div>

                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                            <div className="flex items-center gap-2">
                              <CloudRain className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="text-sm text-muted-foreground">{t("precipitation") || "Precipitation"}</div>
                                <div className="font-medium">
                                  {weatherData.weather.daily[activeDay].rainChance}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Wind className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="text-sm text-muted-foreground">{t("wind") || "Wind"}</div>
                                <div className="font-medium">
                                  {weatherData.weather.daily[activeDay].windSpeed} km/h
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Droplets className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="text-sm text-muted-foreground">{t("humidity") || "Humidity"}</div>
                                <div className="font-medium">
                                  {weatherData.weather.daily[activeDay].humidity}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sun className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="text-sm text-muted-foreground">{t("uvIndex") || "UV Index"}</div>
                                <div className="font-medium">
                                  {weatherData.weather.daily[activeDay].uvIndex}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        
                        <div>
                          <h3 className="font-semibold mb-3">{t("weatherInsights") || "Weather Insights"}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t("overview") || "Farming Recommendation"}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm mb-3">
                                  {weatherData.weather.daily[activeDay].farmingRecommendation}
                                </p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {t("soilCondition") || "Soil Condition"}: {weatherData.weather.daily[activeDay].soilCondition}
                                    </Badge>
                                  </div>
                                  {weatherData.weather.daily[activeDay].rainAmount > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                          {t("expectedRainfall") || "Expected Rainfall"}: {weatherData.weather.daily[activeDay].rainAmount}mm
                                        </Badge>
                                      </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t("additionalInsights") || "Additional Insights"}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>{t("windDirection") || "Wind Direction"}:</span>
                                    <span className="font-medium capitalize">
                                  {weatherData.weather.daily[activeDay].windDirection}
                                </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t("windStrength") || "Wind Strength"}:</span>
                                    <span className="font-medium capitalize">
                                  {weatherData.weather.daily[activeDay].windStrength}
                                </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t("rainChance") || "Rain Chance"}:</span>
                                    <span className="font-medium">
                                  {weatherData.weather.daily[activeDay].rainChance || 'Unknown'}%
                                </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{t("rainPrediction") || "Rain Prediction"}:</span>
                                    <span className="font-medium">
                                  {weatherData.weather.daily[activeDay].rainPrediction?.confidence || 'Unknown'}
                                </span>
                                  </div>
                                  {weatherData.weather.daily[activeDay].extremeWeatherConditions && (
                                      <div className="mt-2">
                                        <span className="text-xs text-muted-foreground">{t("conditions") || "Conditions"}:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {weatherData.weather.daily[activeDay].extremeWeatherConditions.map((condition, index) => (
                                              <Badge key={index} variant="outline" className="text-xs">
                                                {condition}
                                              </Badge>
                                          ))}
                                        </div>
                                      </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        
                        {weatherData.weather.alerts && weatherData.weather.alerts.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-3">{t("weatherAlerts") || "Weather Alerts"}</h3>
                              <div className="space-y-2">
                                {weatherData.weather.alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 p-3"
                                    >
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="font-medium">{alert.title || t('weatherAlert') || 'Weather Alert'}</p>
                                          <p className="text-sm mt-1">
                                            {alert.message || alert.description || t('checkWeatherConditions') || 'Check weather conditions'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
          ) : (
              /* Empty state for no data or errors */
              renderEmptyState()
          )}

          <div className="text-xs text-muted-foreground text-center mt-4">
            {t("forecastDisclaimer") || "Weather forecasts are estimates and may vary from actual conditions."}
          </div>
        </div>
      </AppLayout>
  );
};

export default Forecasts;