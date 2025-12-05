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
  Cloud, Download, MapPin, Share2, Sun, Wind, RefreshCw, Loader2, Droplets, WifiOff, AlertTriangle, Calendar
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  WeatherData, ApiResponse, WeatherRequestParams
} from "@/types/weather";
import { Location, LocationsResponse } from "@/types/farmer";
import { RainTimingDisplay } from '@/components/ui/rain-timing';
import { HourlyForecastDisplay } from '@/components/ui/hourly-forecast';

const getWeatherIcon = (condition: string, isActive = false): React.ReactElement => {
  const baseClass = "h-8 w-8";
  const iconMap: { [key: string]: React.ReactElement } = {
    'clear': <Sun className={`${baseClass} ${isActive ? 'text-white' : 'text-yellow-500'}`} />,
    'clouds': <Cloud className={`${baseClass} ${isActive ? 'text-white' : 'text-slate-400'}`} />,
    'rain': <CloudRain className={`${baseClass} ${isActive ? 'text-white' : 'text-blue-900'}`} />,
    'drizzle': <CloudDrizzle className={`${baseClass} ${isActive ? 'text-white' : 'text-blue-400'}`} />,
    'snow': <CloudDrizzle className={`${baseClass} ${isActive ? 'text-white' : 'text-cyan-400'}`} />,
    'thunderstorm': <CloudRain className={`${baseClass} ${isActive ? 'text-white' : 'text-purple-600'}`} />,
  };

  const conditionKey = condition.toLowerCase();
  return iconMap[conditionKey] || <Cloud className={`${baseClass} ${isActive ? 'text-white' : 'text-slate-500'}`} />;
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
  const [forecastFilter, setForecastFilter] = useState<'all' | '7days' | '10days' | '14days' | '16days'>('all');

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
    if (!filteredForecastData.length) {
      toast.error(t('noDataToExport') || 'No data available to export.');
      return;
    }

    try {
      const exportData = filteredForecastData.map(day => ({
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
        [t('overview') || 'Overview']: day.overview,
        [t('farmingRecommendation') || 'Farming Recommendation']: day.farmingRecommendation,
        [t('soilCondition') || 'Soil Condition']: day.soilCondition,
      }));

      const filename = `weather_forecast_${selectedLocation?.name || 'location'}_${forecastFilter}_${new Date().toISOString().split('T')[0]}.csv`;
      api.exportAsCSV(exportData, filename);

      toast.success(t('forecastExportedSuccessfully') || 'Forecast exported successfully.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('failedToExportForecast') || 'Failed to export forecast.');
    }
  };

  const handleShareForecast = () => {
    if (!weatherData || !selectedLocation || !filteredForecastData.length) {
      toast.error(t('noDataToShare') || 'No data available to share.');
      return;
    }

    try {
      const activeDayData = filteredForecastData[activeDay];
      const shareText = `Weather Forecast for ${selectedLocation.name}\n${activeDayData.dayOfWeek}, ${activeDayData.formattedDate}\n${activeDayData.condition}\nTemp: ${activeDayData.tempMin}°C - ${activeDayData.tempMax}°C\nRain: ${activeDayData.rainChance}%\n\nOverview: ${activeDayData.overview}\n\nFarming Recommendation: ${activeDayData.farmingRecommendation}`;

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

  // Filter forecast data based on selected filter
  const filteredForecastData = weatherData?.weather?.daily ? (() => {
    const allDays = weatherData.weather.daily;
    switch (forecastFilter) {
      case '7days':
        return allDays.slice(0, 7);
      case '10days':
        return allDays.slice(0, 10);
      case '14days':
        return allDays.slice(0, 14);
      case '16days':
        return allDays.slice(0, 16);
      case 'all':
      default:
        return allDays;
    }
  })() : [];

  // Reset active day when filter changes
  useEffect(() => {
    if (activeDay >= filteredForecastData.length && filteredForecastData.length > 0) {
      setActiveDay(0);
    }
  }, [forecastFilter, filteredForecastData.length]);

  const getFilterOptions = () => {
    if (!weatherData?.weather?.daily?.length) return [];
    
    const totalDays = weatherData.weather.daily.length;
    const options = [
      { value: 'all', label: t('allDays') || `${t('all') || 'All'} ${totalDays} ${t('days') || 'days'}`, available: true }
    ];

    if (totalDays >= 7) {
      options.push({ value: '7days', label: t('7days') || '7 days', available: true });
    }
    if (totalDays >= 10) {
      options.push({ value: '10days', label: t('10days') || '10 days', available: true });
    }
    if (totalDays >= 14) {
      options.push({ value: '14days', label: t('14days') || '14 days', available: true });
    }
    if (totalDays >= 16) {
      options.push({ value: '16days', label: t('16days') || '16 days', available: true });
    }

    return options;
  };

  const renderEmptyState = () => {
    let icon = <CloudRain className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
    let title = t('noWeatherData') || 'No Weather Data';
    let description = t('noWeatherDataDescription') || 'Unable to load weather data at the moment.';

    switch (errorType) {
      case 'timeout':
        icon = <WifiOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        title = t('requestTimeout') || 'Request Timed Out';
        description = t('timeoutDescription') || 'The request took too long to complete. Please check your connection and try again.';
        break;
      case 'network_error':
        icon = <WifiOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        title = t('networkError') || 'Network Error';
        description = t('networkErrorDescription') || 'Please check your internet connection and try again.';
        break;
      case 'server_error':
        icon = <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        title = t('serverError') || 'Server Error';
        description = t('serverErrorDescription') || 'Our servers are experiencing issues. Please try again later.';
        break;
      case 'not_found':
        icon = <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        title = t('dataNotFound') || 'Data Not Found';
        description = t('dataNotFoundDescription') || 'No weather data available for the selected location.';
        break;
      case 'no_locations':
        icon = <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />;
        title = t('noLocations') || 'No Locations';
        description = t('noLocationsDescription') || 'No locations available. Please add a location first.';
        break;
      default:
        break;
    }

    return (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              {icon}
              <h3 className="text-lg font-medium mb-2 text-slate-700">{title}</h3>
              <p className="text-slate-500 mb-4">
                {description}
              </p>
              <Button
                  variant="outline"
                  onClick={errorType === 'no_locations' ? fetchLocations : handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="bg-[#147677] hover:bg-[#147677]/90 text-white border-[#147677]"
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
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-slate-600">{t('loadingWeatherData') || 'Loading weather data...'}</p>
            </div>
          </div>
        </AppLayout>
    );
  }

  return (
      <AppLayout>
        <Head>
          <title>
            {t("forecasts") || "Forecasts"} | {t("climateInformationSystem") || "Teganyamuhinzi"}
          </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
          
          <div className="bg-gradient-to-br from-[#147677] via-[#0f5f5f] to-[#0c4d4d] rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                  <CloudRain className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t("weatherForecast") || "Weather Forecast"}</h2>
                  {filteredForecastData.length > 0 && (
                    <p className="text-blue-100 text-sm">
                      {filteredForecastData.length} {t("dayForecast") || "day forecast"}
                    </p>
                  )}
                </div>
              </div>

              {locations.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                        <MapPin className="h-4 w-4 mr-2" />
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
          </div>

          
          <div className="flex flex-wrap items-center gap-3">
            {/* Forecast Filter Dropdown */}
            {weatherData && weatherData.weather?.daily?.length > 7 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {getFilterOptions().find(opt => opt.value === forecastFilter)?.label || t('filterDays') || 'Filter Days'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {getFilterOptions().map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setForecastFilter(option.value as any)}
                      className={forecastFilter === option.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading || !selectedLocation}
                className="bg-[#147677] hover:bg-[#147677]/90 text-white hover:text-white border-[#147677]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? (t('updating') || 'Updating...') : (t('updateData') || 'Update Data')}
            </Button>

            <Button
                variant="outline"
                onClick={handleExportForecast}
                className="bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white border-emerald-600"
                disabled={!filteredForecastData.length}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("exportForecast") || "Export Forecast"}
            </Button>

            <Button
                variant="outline"
                onClick={handleShareForecast}
                className="bg-amber-600 hover:bg-amber-700 text-white hover:text-white border-amber-600"
                disabled={!filteredForecastData.length}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {t("shareForecast") || "Share Forecast"}
            </Button>
          </div>

          {weatherData && weatherData.weather?.daily?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  
                  <div className="lg:col-span-1 order-1">
                    {/* Mobile horizontal scroll for filtered forecast days */}
                    <div className="md:hidden">
                      <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-3 pb-4">
                          {filteredForecastData.map((day, index) => (
                              <Card
                                  key={day.date}
                                  className={`w-[120px] flex-shrink-0 cursor-pointer transition-all duration-200 border-0 shadow-md ${
                                      activeDay === index
                                          ? "bg-gradient-to-br from-[#147677] to-[#0f5f5f] text-white shadow-lg scale-105"
                                          : "bg-white hover:bg-blue-50 hover:shadow-lg"
                                  }`}
                                  onClick={() => setActiveDay(index)}
                              >
                                <CardContent className="p-3 text-center">
                                  <div className={`font-medium ${activeDay === index ? 'text-white' : 'text-slate-700'}`}>
                                    {day.isToday ? (t('today') || 'Today') : (t(`${day.dayOfWeek}`))}
                                  </div>
                                  <div className={`text-xs ${activeDay === index ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {(() => {
                                      const formattedDate = day.formattedDate;
                                      const [month, dayNum] = formattedDate.split(' ');
                                      const translatedMonth = t(month);

                                      return `${translatedMonth} ${dayNum}`;
                                    })()}
                                  </div>
                                  <div className="my-2 flex justify-center">
                                    {getWeatherIcon(day.conditionMain, activeDay === index)}
                                  </div>
                                  <div className={`flex justify-center gap-2 text-sm ${activeDay === index ? 'text-white' : 'text-slate-600'}`}>
                                    <span>{day.tempMin}°</span>
                                    <span className="font-medium">-</span>
                                    <span className="font-medium">{day.tempMax}°</span>
                                  </div>
                                  {day.rainChance > 50 && (
                                      <div className="mt-1 flex justify-center">
                                        <AlertCircle className={`h-4 w-4 ${activeDay === index ? 'text-amber-200' : 'text-amber-500'}`} />
                                      </div>
                                  )}
                                </CardContent>
                              </Card>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>

                    {/* Desktop vertical scroll for filtered forecast days */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[800px]">
                        <div className="space-y-3">
                          {filteredForecastData.map((day, index) => (
                              <Card
                                  key={day.date}
                                  className={`cursor-pointer transition-all duration-200 border-0 shadow-md ${
                                      activeDay === index
                                          ? "bg-gradient-to-br from-[#147677] to-[#0f5f5f] text-white shadow-lg"
                                          : "bg-white hover:bg-blue-50 hover:shadow-lg hover:border-blue-200"
                                  }`}
                                  onClick={() => setActiveDay(index)}
                              >
                                <CardContent className="p-3">
                                  <div className="text-center">
                                    <div className={`font-medium text-sm ${activeDay === index ? 'text-white' : 'text-slate-700'}`}>
                                      {day.isToday ? (t('today') || 'Today') : (t(`${day.dayOfWeek}`))}
                                    </div>
                                    <div className={`text-xs mb-2 ${activeDay === index ? 'text-blue-100' : 'text-slate-500'}`}>
                                      {(() => {
                                        const formattedDate = day.formattedDate;
                                        const [month, dayNum] = formattedDate.split(' ');
                                        const translatedMonth = t(month);

                                        return `${translatedMonth} ${dayNum}`;
                                      })()}
                                    </div>
                                    <div className="flex justify-center mb-2">
                                      {getWeatherIcon(day.conditionMain, activeDay === index)}
                                    </div>
                                    <div className={`flex justify-center gap-1 text-sm ${activeDay === index ? 'text-white' : 'text-slate-600'}`}>
                                      <span>{day.tempMin}°</span>
                                      <span>-</span>
                                      <span className="font-medium">{day.tempMax}°</span>
                                    </div>
                                    <div className={`text-xs mt-1 capitalize ${activeDay === index ? 'text-blue-100' : 'text-slate-500'}`}>
                                      {(t(`${day.condition}`))}
                                    </div>
                                    {day.rainChance > 50 && (
                                        <div className="mt-2 flex justify-center">
                                          <AlertCircle className={`h-4 w-4 ${activeDay === index ? 'text-amber-200' : 'text-amber-500'}`} />
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
                    <Card className="border-0 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-slate-900">
                              {filteredForecastData[activeDay]?.isToday
                                  ? (t('today') || 'Today')
                                  : (t(`${filteredForecastData[activeDay]?.dayOfWeek}`))
                              }
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                              {(() => {
                                const formattedDate = filteredForecastData[activeDay]?.formattedDate;
                                if (!formattedDate) return '';
                                const [month, day] = formattedDate.split(' ');
                                const translatedMonth = t(month);

                                return `${translatedMonth} ${day}`;
                              })()}
                              - {selectedLocation?.name}
                            </CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={activeDay === 0}
                                onClick={() => setActiveDay((prev) => Math.max(0, prev - 1))}
                                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                            >
                              <ChevronLeft className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={activeDay === (weatherData?.weather?.daily?.length || 0) - 1}
                                onClick={() => setActiveDay((prev) => Math.min((weatherData?.weather?.daily?.length || 0) - 1, prev + 1))}
                                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                            >
                              <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6 p-6">
                        
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                          <div className="flex items-center">
                            <div className="text-blue-500 mr-6">
                              {getWeatherIcon(filteredForecastData[activeDay]?.conditionMain)}
                            </div>
                            <div>
                              <div className="text-4xl font-bold text-slate-900">
                                {filteredForecastData[activeDay]?.tempMax}°C
                              </div>
                              <div className="text-sm text-slate-500">
                                {t("lowTemp") || "Low"}: {filteredForecastData[activeDay]?.tempMin}°C
                              </div>
                              <div className="text-sm text-slate-600 capitalize mt-1">
                                {(t(`${filteredForecastData[activeDay]?.condition}`))}
                              </div>
                            </div>
                          </div>

                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50/80 to-blue-100/80 rounded-xl border border-blue-200/50 hover:shadow-md transition-shadow">
                              <CloudRain className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="text-sm text-slate-700 font-medium">{t("precipitation") || "Precipitation"}</div>
                                <div className="font-semibold text-slate-900">
                                  {filteredForecastData[activeDay]?.rainChance}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-slate-50/80 to-slate-100/80 rounded-xl border border-slate-200/50 hover:shadow-md transition-shadow">
                              <Wind className="h-5 w-5 text-slate-600" />
                              <div>
                                <div className="text-sm text-slate-700 font-medium">{t("wind") || "Wind"}</div>
                                <div className="font-semibold text-slate-900">
                                  {filteredForecastData[activeDay]?.windSpeed} km/h
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-sky-50/80 to-sky-100/80 rounded-xl border border-sky-200/50 hover:shadow-md transition-shadow">
                              <Droplets className="h-5 w-5 text-sky-600" />
                              <div>
                                <div className="text-sm text-slate-700 font-medium">{t("humidity") || "Humidity"}</div>
                                <div className="font-semibold text-slate-900">
                                  {filteredForecastData[activeDay]?.humidity}%
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-amber-50/80 to-amber-100/80 rounded-xl border border-amber-200/50 hover:shadow-md transition-shadow">
                              <Sun className="h-5 w-5 text-amber-600" />
                              <div>
                                <div className="text-sm text-slate-700 font-medium">{t("uvIndex") || "UV Index"}</div>
                                <div className="font-semibold text-slate-900">
                                  {filteredForecastData[activeDay]?.uvIndex}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        
                        <div>
                          <h3 className="font-semibold mb-4 text-slate-800 text-lg">{t("weatherInsights") || "Weather Insights"}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50/80 to-emerald-100/80 border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base text-slate-900">{t("overview") || "Overview"}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm mb-4 text-slate-700 leading-relaxed">
                                  {filteredForecastData[activeDay]?.overview}
                                </p>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                      {t("soilCondition") || "Soil Condition"}: {filteredForecastData[activeDay]?.soilCondition}
                                    </Badge>
                                  </div>
                                  {(filteredForecastData[activeDay]?.rainAmount || 0) > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                                          {t("expectedRainfall") || "Expected Rainfall"}: {filteredForecastData[activeDay]?.rainAmount}mm
                                        </Badge>
                                      </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50/80 to-sky-50/80 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base text-slate-900">{t("farmingRecommendation") || "Farming Recommendation"}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm mb-4 text-slate-700 leading-relaxed">
                                  {filteredForecastData[activeDay]?.farmingRecommendation}
                                </p>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between p-2 bg-white rounded-lg">
                                    <span className="text-slate-600">{t("windDirection") || "Wind Direction"}:</span>
                                    <span className="font-medium capitalize text-slate-800">
                                      {filteredForecastData[activeDay]?.windDirection}
                                    </span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-white rounded-lg">
                                    <span className="text-slate-600">{t("windStrength") || "Wind Strength"}:</span>
                                    <span className="font-medium capitalize text-slate-800">
                                      {filteredForecastData[activeDay]?.windStrength}
                                    </span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-white rounded-lg">
                                    <span className="text-slate-600">{t("rainChance") || "Rain Chance"}:</span>
                                    <span className="font-medium text-slate-800">
                                      {filteredForecastData[activeDay]?.rainChance || 'Unknown'}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between p-2 bg-white rounded-lg">
                                    <span className="text-slate-600">{t("rainPrediction") || "Rain Prediction"}:</span>
                                    <span className="font-medium text-slate-800">
                                      {filteredForecastData[activeDay]?.rainPrediction?.confidence || 'Unknown'}
                                    </span>
                                  </div>
                                  {filteredForecastData[activeDay]?.extremeWeatherConditions && (
                                      <div className="mt-3">
                                        <span className="text-xs text-slate-500 font-medium">{t("conditions") || "Conditions"}:</span>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {filteredForecastData[activeDay]?.extremeWeatherConditions.map((condition, index) => (
                                              <Badge key={index} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
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

                        {/* Rain Timing Display (only for today) - calculated from hourly data */}
                        {filteredForecastData[activeDay]?.isToday && filteredForecastData[activeDay]?.hourly && filteredForecastData[activeDay].hourly.length > 0 && (
                            <div className="mt-6">
                                <RainTimingDisplay hourly={filteredForecastData[activeDay].hourly} />
                            </div>
                        )}

                        {/* Hourly Forecast Display (only for today) */}
                        {filteredForecastData[activeDay]?.isToday && filteredForecastData[activeDay]?.hourly && filteredForecastData[activeDay].hourly.length > 0 && (
                            <div className="mt-6">
                                <HourlyForecastDisplay hourly={filteredForecastData[activeDay].hourly} />
                            </div>
                        )}

                        
                        {weatherData.weather.alerts && weatherData.weather.alerts.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-4 text-slate-800 text-lg">{t("weatherAlerts") || "Weather Alerts"}</h3>
                              <div className="space-y-3">
                                {weatherData.weather.alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 shadow-md"
                                    >
                                      <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                                        <div>
                                          <p className="font-medium text-amber-900">{alert.title || t('weatherAlert') || 'Weather Alert'}</p>
                                          <p className="text-sm mt-2 text-amber-800 leading-relaxed">
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

          
          <div className="text-center p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">
              {t("forecastDisclaimer") || "Weather forecasts are estimates and may vary from actual conditions."}
            </p>
          </div>
        </div>
      </AppLayout>
  );
};

export default Forecasts;