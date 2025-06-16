import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown, ChevronDown, Download, Edit, Loader2, MapPin, MessageSquare,
  MoreHorizontal, Phone, Plus, Search, Trash, Upload, User
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CreateFarmerDialog, ViewFarmerDialog, EditFarmerDialog, ImportFarmersDialog } from "@/components/farmers/dialogs";
import {
  Farmer, Location, FarmersResponse, LocationsResponse, ApiResponse, FarmerFilters
} from "@/types/farmer";

const Farmers: NextPage = () => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [farmerToEdit, setFarmerToEdit] = useState<Farmer | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      toast.error(t('adminAccessRequired'));
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router, t]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchFarmers();
    }
  }, [selectedLocation, searchTerm, currentPage, isAuthenticated, user]);

  const fetchLocations = async () => {
    try {
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });
      setLocations(response.data.locations);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      toast.error(t('failedToLoadLocations'));
    }
  };

  const fetchFarmers = async () => {
    setIsLoading(true);
    try {
      const filters: FarmerFilters = {
        limit,
        offset: (currentPage - 1) * limit,
      };

      if (selectedLocation !== "all") {
        const location = locations.find(l => l.name === selectedLocation);
        if (location) {
          filters.locationId = location.id;
        }
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await api.get<ApiResponse<FarmersResponse>>('/api/admin/farmers', {
        params: filters
      });

      setFarmers(response.data.farmers);
      setTotalCount(response.data.count);
    } catch (error: any) {
      console.error('Failed to fetch farmers:', error);
      toast.error(t('failedToLoadFarmers'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFarmer = async (farmerId: number) => {
    if (!confirm(t('confirmDeleteFarmer'))) return;

    try {
      await api.delete(`/api/admin/farmers/${farmerId}`);
      toast.success(t('farmerDeletedSuccessfully'));
      await fetchFarmers();
      if (selectedFarmer === farmerId) {
        setSelectedFarmer(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('failedToDeleteFarmer');
      toast.error(message);
    }
  };

  const handleImportFarmers = () => {
    setImportDialogOpen(true);
  };

  const fetchAllFarmersForExport = async (): Promise<Farmer[]> => {
    try {
      const filters: FarmerFilters = {
        limit: 100,
        offset: 0,
      };

      if (selectedLocation !== "all") {
        const location = locations.find(l => l.name === selectedLocation);
        if (location) {
          filters.locationId = location.id;
        }
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await api.get<ApiResponse<FarmersResponse>>('/api/admin/farmers', {
        params: filters
      });

      return response.data.farmers;
    } catch (error) {
      console.error('Failed to fetch all farmers for export:', error);
      throw error;
    }
  };

  const handleExportFarmers = async () => {
    setIsExporting(true);
    try {
      const allFarmers = await fetchAllFarmersForExport();

      if (allFarmers.length === 0) {
        toast.error(t('noDataToExport'));
        return;
      }

      const exportData = allFarmers.map(farmer => ({
        [t('farmerId')]: farmer.id,
        [t('name')]: farmer.name,
        [t('phoneNumber')]: farmer.phone,
        [t('locations')]: farmer.locations.map(loc => loc.name).join('; '),
        [t('status')]: farmer.isActive ? t('active') : t('inactive'),
        [t('createdAt')]: new Date(farmer.createdAt).toLocaleDateString(),
        [t('updatedAt')]: new Date(farmer.updatedAt).toLocaleDateString(),
      }));

      let filename = `farmers_${new Date().toISOString().split('T')[0]}`;
      if (selectedLocation !== 'all') {
        filename += `_${selectedLocation}`;
      }
      if (searchTerm.trim()) {
        filename += `_search_${searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      filename += '.csv';

      api.exportAsCSV(exportData, filename);

      toast.success(t('farmersExportedSuccessfully') + ` (${allFarmers.length} ${t('farmers')})`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(t('failedToExportFarmers'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewFarmer = (farmerId: number) => {
    setSelectedFarmer(farmerId);
    setViewDialogOpen(true);
  };
  
  const handleEditFarmer = (farmer: Farmer) => {
    setFarmerToEdit(farmer);
    setViewDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchFarmers();
    setSelectedFarmer(null);
  };

  const totalPages = Math.ceil(totalCount / limit);


  return (
      <AppLayout>
        <Head>
          <title>
            {t("farmers")} | {t("climateInformationSystem")}
          </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ganz-primary" />
              <h2 className="text-lg font-medium">{t("farmersManagement")}</h2>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2 h-9">
                    <span>{selectedLocation === "all" ? t("allLocations") : selectedLocation}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedLocation("all")}>{t("allLocations")}</DropdownMenuItem>
                  <Separator className="my-1" />
                  {locations.map((location) => (
                      <DropdownMenuItem key={location.id} onClick={() => setSelectedLocation(location.name)}>
                        {location.name}
                      </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t("searchFarmers")}
                    className="pl-8 w-full sm:w-[200px] h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addFarmer")}
            </Button>

            <Button
                variant="outline"
                onClick={handleImportFarmers}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("importData")}
            </Button>

            <Button
                variant="outline"
                onClick={handleExportFarmers}
                disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? t("exporting") : t("exportData")}
            </Button>
          </div>

          <Card>
            <CardHeader className="p-4">
              <CardTitle>{t("registeredFarmers")}</CardTitle>
              <CardDescription>
                {totalCount} {t("farmersFound")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                      <tr className="border-b bg-muted">
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{t("name")}</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{t("locations")}</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{t("status")}</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{t("joinedDate")}</span>
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                      </tr>
                      </thead>
                      <tbody>
                      {farmers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              {t("noFarmersFound")}
                            </td>
                          </tr>
                      ) : (
                          farmers.map((farmer) => (
                              <tr
                                  key={farmer.id}
                                  className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => handleViewFarmer(farmer.id)}
                              >
                                <td className="py-3 px-4">
                                  <div className="font-medium">{farmer.name}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {farmer.phone}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {farmer.locations.map((location, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {location.name}
                                        </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant={farmer.isActive ? "default" : "secondary"}>
                                    {farmer.isActive ? t("active") : t("inactive")}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm">
                                    {new Date(farmer.createdAt).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewFarmer(farmer.id);
                                      }}>
                                        <User className="h-4 w-4 mr-2" />
                                        {t("viewProfile")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditFarmer(farmer);
                                      }}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t("editFarmer")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        toast.info(t("sendMessageFeatureComingSoon"));
                                      }}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        {t("sendMessage")}
                                      </DropdownMenuItem>
                                      <Separator className="my-1" />
                                      <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFarmer(farmer.id);
                                          }}
                                      >
                                        <Trash className="h-4 w-4 mr-2" />
                                        {t("delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                          ))
                      )}
                      </tbody>
                    </table>
                  </div>
              )}
            </CardContent>

            {totalCount > 0 && (
                <CardFooter className="p-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("showing")} {Math.min((currentPage - 1) * limit + 1, totalCount)} - {Math.min(currentPage * limit, totalCount)} {t("of")} {totalCount} {t("farmers")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      {t("previous")}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      {t("next")}
                    </Button>
                  </div>
                </CardFooter>
            )}
          </Card>

          <div className="text-xs text-muted-foreground text-center mt-4">
            {t("dataLastUpdated")}: {new Date().toLocaleString()}
          </div>
        </div>

        <ImportFarmersDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />

        <CreateFarmerDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />

        <ViewFarmerDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            farmerId={selectedFarmer}
            onEdit={handleEditFarmer}
        />

        <EditFarmerDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            farmer={farmerToEdit}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />
      </AppLayout>
  );
};

export default Farmers;