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
  MoreHorizontal, Phone, Plus, Search, Trash, Upload, User, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
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
  const [limit, setLimit] = useState(10);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [farmerToEdit, setFarmerToEdit] = useState<Farmer | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  // Allow all authenticated users to view farmers; admin will still control mutations
  useEffect(() => {
    // no-op: viewing is allowed for all authenticated users
  }, [isAuthenticated, user, router, t]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFarmers();
    }
  }, [selectedLocation, searchTerm, currentPage, limit, isAuthenticated]);

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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  // Custom status badge component
  const StatusBadge = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return (
        <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }} className="hover:opacity-80">
          {t("active")}
        </Badge>
      );
    } else {
      return (
        <Badge style={{ backgroundColor: '#adc9e3', color: '#eab308', border: '1px solid #eab308' }} className="hover:opacity-80">
          {t("inactive")}
        </Badge>
      );
    }
  };

  return (
      <AppLayout>
        <Head>
          <title>
            {t("farmers")} | {t("climateInformationSystem")}
          </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
          {/* Header section with white background */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              {/* Left side - Title only */}
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">{t("farmersManagement")}</h2>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex flex-wrap w-full lg:w-auto items-center gap-2">
                <Button
                    variant="outline"
                    onClick={handleImportFarmers}
                    className="bg-amber-600 hover:bg-amber-700 text-white hover:text-white border-amber-600"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("importData")}
                </Button>

                <Button
                    variant="outline"
                    onClick={handleExportFarmers}
                    disabled={isExporting}
                    className="bg-green-600 hover:bg-green-700 text-white hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? t("exporting") : t("exportData")}
                </Button>
              </div>
            </div>
          </div>

          <Card className="shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <CardContent className="p-0">
              {/* Header with Add Farmer, All Locations dropdown, and Search */}
              <div className="p-4 bg-white border-b border-gray-200 flex justify-end items-center gap-4">
                {user?.role === 'admin' && (
                  <Button 
                    variant="primary" 
                    onClick={() => setCreateDialogOpen(true)} 
                    style={{ backgroundColor: '#147677', borderColor: '#147677' }}
                    className="hover:opacity-90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addFarmer")}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      style={{ borderColor: '#147677', color: '#147677' }}
                      className="hover:bg-[#147677]/10"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-[#147677]" />
                      <span>{selectedLocation === "all" ? t("allLocations") : selectedLocation}</span>
                      {/* <ChevronDown className="ml-2 h-4 w-4" /> */}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {locations.map((location) => (
                      <DropdownMenuItem key={location.id} onClick={() => setSelectedLocation(location.name)}>
                        {location.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder={t("searchFarmers") || "Search farmers..."}
                    className="pl-10 w-[300px] bg-gray-50 border-gray-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="animate-spin h-8 w-8" style={{ color: '#2580f5' }} />
                      <span className="text-gray-500">{t("loading") || "Loading..."}</span>
                    </div>
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead  className="bg-[#f2f5fa] text-black">
                      <tr>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          #
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          {t("name") || "Farmer Name"}
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          {t("phone") || "Phone"}
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          {t("locations") || "Location"}
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          {t("status") || "Status"}
                        </th>
                        <th className="py-4 px-6 text-left font-semibold text-sm">
                          {t("joinedDate") || "Joined Date"}
                        </th>
                        <th className="py-4 px-6 text-center font-semibold text-sm">
                          {t("actions") || "Actions"}
                        </th>
                      </tr>
                      </thead>
                      <tbody className="bg-white">
                      {farmers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-16 text-center">
                              <div className="flex flex-col items-center space-y-3">
                                <User className="h-12 w-12 text-gray-300" />
                                <div className="text-gray-500 font-medium">{t("noFarmersFound") || "No farmers found"}</div>
                                <div className="text-sm text-gray-400">{t("tryAdjustingFilters") || "Try adjusting your search criteria"}</div>
                              </div>
                            </td>
                          </tr>
                      ) : (
                          farmers.map((farmer, index) => (
                              <tr
                                  key={farmer.id}
                                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                  onClick={() => handleViewFarmer(farmer.id)}
                              >
                                <td className="py-4 px-6 text-sm text-gray-900">
                                  {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-medium text-gray-900">{farmer.name}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="text-sm text-gray-600 font-mono">{farmer.phone}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-wrap gap-1">
                                    {farmer.locations.map((location, idx) => (
                                        <span key={idx} className="text-sm text-gray-700">
                                          {location.name}
                                          {idx < farmer.locations.length - 1 && ", "}
                                        </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <StatusBadge isActive={farmer.isActive} />
                                </td>
                                <td className="py-4 px-6">
                                  <div className="text-sm text-gray-600">
                                    {new Date(farmer.createdAt).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewFarmer(farmer.id);
                                        }}
                                        className="cursor-pointer hover:bg-blue-50"
                                      >
                                        <User className="h-4 w-4 mr-2" style={{ color: '#2580f5' }} />
                                        {t("viewProfile") || "View Profile"}
                                      </DropdownMenuItem>
                                      {user?.role === 'admin' && (
                                        <DropdownMenuItem 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditFarmer(farmer);
                                          }}
                                          className="cursor-pointer hover:bg-green-50"
                                        >
                                          <Edit className="h-4 w-4 mr-2" style={{ color: '#66a9e3' }} />
                                          {t("editFarmer") || "Edit Farmer"}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toast.info(t("sendMessageFeatureComingSoon") || "Feature coming soon");
                                        }}
                                        className="cursor-pointer hover:bg-purple-50"
                                      >
                                        <MessageSquare className="h-4 w-4 mr-2" style={{ color: '#adc9e3' }} />
                                        {t("sendMessage") || "Send Message"}
                                      </DropdownMenuItem>
                                      {user?.role === 'admin' && (
                                        <>
                                          <Separator className="my-1" />
                                          <DropdownMenuItem
                                              className="cursor-pointer hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFarmer(farmer.id);
                                              }}
                                          >
                                            <Trash className="h-4 w-4 mr-2" style={{ color: '#e46064' }} />
                                            <span style={{ color: '#e46064' }}>{t("delete") || "Delete"}</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
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

              {/* Pagination Footer - Matching the provided design exactly */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600 gap-2">
                    <span>
                      {farmers.length === 0 ? "0" : `${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)}`} of {totalCount} row(s) selected.
                    </span>
                    <span>Rows per page</span>
                    <select 
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white ml-2"
                      value={limit}
                      onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(1)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                        title="First page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                        title="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                        title="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                        title="Last page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
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