import React, { useState, useEffect } from 'react';
import { AlertsTable } from '@/components/communications/AlertsTable';
import { MessagesTable } from '@/components/communications/MessagesTable';
import { AlertTriangle, MessageSquare, Bell, Plus, Filter, Search, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import Head from 'next/head';
import { useLanguage } from '@/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });
      setLocations(response.data.locations);

      // Auto-select first location or set to "all"
      if (response.data.locations.length > 0) {
        // Don't auto-select, let user choose or default to "all"
        setSelectedLocation(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
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
            <p className="mt-2 text-muted-foreground">{t('loadingLocations')}</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t("Agricultural Alerts & Messages")}</h2>
            
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-2 h-9">
                              <span>{getSelectedLocationName()}</span>
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedLocation(null)}>
                              {t("allLocations") || "All Locations"}
                            </DropdownMenuItem>
                            <Separator className="my-1" />
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
            
                      <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="search" 
                            placeholder={t("searchMessages")} 
                            className="pl-8 w-full sm:w-[180px] h-9" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                          />
                        </div>
                      </div>
            </div>
            
            <Tabs defaultValue="alerts" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="alerts">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t("alerts")}
                    </TabsTrigger>
                    <TabsTrigger value="messages">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("customMessages")}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Tab Content */}
            <div className="transition-all duration-300 ease-in-out">
                {activeTab === 'alerts' ? (
                    <AlertsTable 
                      selectedSector={getSelectedLocationValue()} 
                      searchTerm={searchTerm} 
                    />
                ) : (
                    <MessagesTable 
                      selectedSector={getSelectedLocationValue()} 
                      searchTerm={searchTerm} 
                    />
                )}
            </div>
        </div>
    
    </AppLayout>
  );
}