import React, { useState, useEffect } from 'react';
import { AlertsTable } from '@/components/communications/AlertsTable';
import { MessagesTable } from '@/components/communications/MessagesTable';
import { WeatherSchedulerTable } from '@/components/communications/SchedulerTable';
import { MessageLogsTable } from '@/components/communications/MessageLogsTable';
import { AlertTriangle, MessageSquare, Bell, Plus, Filter, Search, MapPin, ChevronDown, Loader2, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import Head from 'next/head';
import { useLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { toast } from 'sonner';
import api from '@/lib/api';
import { Location, LocationsResponse } from '@/types/farmer';
import { ApiResponse } from '@/types/weather';

export default function Communications() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      // Try different possible endpoints
      const possibleEndpoints = [
        '/api/users/locations/all',
        '/api/locations/all',
        '/api/locations',
        '/api/users/locations',
        '/api/admin/locations'
      ];

      let response = null;
      for (const endpoint of possibleEndpoints) {
        try {
          response = await api.get<ApiResponse<LocationsResponse>>(endpoint, {
            params: { limit: 100 }
          });
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('No valid API endpoint found for locations');
      }

      // Handle different response structures
      let locationsData: Location[] = [];
      if (response.data?.locations) {
        locationsData = response.data.locations;
      } else if (Array.isArray(response.data)) {
        locationsData = response.data;
      } else if (Array.isArray(response)) {
        locationsData = response;
      }

      setLocations(locationsData);

      // Auto-select first location or set to "all"
      if (locationsData.length > 0) {
        // Don't auto-select, let user choose or default to "all"
        setSelectedLocation(null);
      }
    } catch (error: any) {
      toast.error(t('failedToLoadLocations'));
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedLocationName = () => {
    if (!selectedLocation) return t('allLocations') || 'All Locations';
    return selectedLocation.name;
  };

  const getSelectedLocationValue = () => {
    if (!selectedLocation) return 'all';
    return selectedLocation.name;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto" />
            <p className="mt-2 text-gray-500">{t('loadingLocations')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
        <Head>
            <title> 
                {t("communications")} | {t("climateInformationSystem")}
            </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
            {/* Header section with white background */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Left side - Title only */}
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-medium">{t("Agricultural Alerts & Messages")}</h2>
                    </div>
                </div>
            </div>
            
            <Tabs
                defaultValue="alerts"
                onValueChange={setActiveTab}
                items={[
                    { value: 'alerts', label: <span className="inline-flex items-center"><AlertTriangle className="h-4 w-4 mr-2" />{t("alerts")}</span> },
                    { value: 'messages', label: <span className="inline-flex items-center"><MessageSquare className="h-4 w-4 mr-2" />{t("customMessages")}</span> },
                    { value: 'scheduler', label: <span className="inline-flex items-center"><Clock className="h-4 w-4 mr-2" />{t("weatherScheduler")}</span> },
                    ...(user?.role === 'admin'
                        ? [{ value: 'logs', label: <span className="inline-flex items-center"><Clock className="h-4 w-4 mr-2" />{t("logs")}</span> }]
                        : []),
                ]}
                renderPanel={(value) =>
                    value === 'alerts' ? (
                        <AlertsTable selectedSector={getSelectedLocationValue()} searchTerm={searchTerm} />
                    ) : value === 'messages' ? (
                        <MessagesTable selectedSector={getSelectedLocationValue()} searchTerm={searchTerm} />
                    ) : value === 'scheduler' ? (
                        <WeatherSchedulerTable />
                    ) : value === 'logs' && user?.role === 'admin' ? (
                        <MessageLogsTable />
                    ) : null
                }
            />
        </div>
    
    </AppLayout>
  );
}