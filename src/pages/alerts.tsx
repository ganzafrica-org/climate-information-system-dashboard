import { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { AlertsTable } from "@/components/communications/AlertsTable";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Location, LocationsResponse } from "@/types/farmer";
import { ApiResponse } from "@/types/weather";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Alerts: NextPage = () => {
  const { t } = useLanguage();
  const [selectedSector, setSelectedSector] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });
      setLocations(response.data.locations);
    } catch (error: any) {
      toast.error(t('failedToLoadLocations'));
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedLocationValue = () => {
    if (selectedSector === "all") return 'all';
    return selectedSector;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto" style={{ color: '#2580f5' }} />
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
          {t("alerts")} | {t("climateInformationSystem")}
        </title>
      </Head>

      <div className="space-y-4 md:space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-ganz-primary" />
              <h2 className="text-lg font-medium">{t("alerts")}</h2>
          </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder={t("searchAlerts")} 
                  className="pl-8 w-full sm:w-[180px] h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                          </div>
                        </div>
                        </div>
                      </div>

        <AlertsTable 
          selectedSector={getSelectedLocationValue()} 
          searchTerm={searchTerm} 
        />
      </div>
    </AppLayout>
  );
};

export default Alerts;
