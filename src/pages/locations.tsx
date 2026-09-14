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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable, rowActionsColumn, type SortableColumn } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowUpDown, ChevronDown, Download, Edit, Loader2, MapPin, MessageSquare,
    MoreHorizontal, Phone, Plus, Search, Trash, Upload, User, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, RefreshCw, AlertTriangle, WifiOff
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
    CreateLocationDialog, ViewLocationDialog, EditLocationDialog
} from "@/components/locations/dialogs";
import {
    Location, LocationsResponse, ApiResponse, LocationFilters
} from "@/types/farmer";

const Locations: NextPage = () => {
    const { t } = useLanguage();
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    const [locations, setLocations] = useState<Location[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [errorType, setErrorType] = useState<string>('');

    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Allow all authenticated users to view locations; admin will still control mutations
    useEffect(() => {
    }, [isAuthenticated, user, router, t]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchLocations();
        }
    }, [searchTerm, currentPage, limit, isAuthenticated]);

    const handleApiError = (error: any) => {
        console.error('API Error:', error);
        setHasError(true);

        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            toast.error(t('requestTimeout') || 'Request timed out. Please try again.');
            setErrorType('timeout');
        } else if (error.response?.status === 404) {
            toast.error(t('dataNotFound') || 'Data not found.');
            setErrorType('not_found');
        } else if (error.response?.status >= 500) {
            toast.error(t('serverError') || 'Server error. Please try again later.');
            setErrorType('server_error');
        } else if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
            toast.error(t('networkError') || 'Network error. Please check your connection.');
            setErrorType('network_error');
        } else {
            toast.error(t('failedToLoadLocations') || 'Failed to load locations data.');
            setErrorType('unknown_error');
        }
    };

    const fetchLocations = async () => {
        setIsLoading(true);
        setHasError(false);
        setErrorType('');

        try {
            const filters: LocationFilters = {
                limit,
                offset: (currentPage - 1) * limit,
            };

            if (searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }

            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: filters
            });

            setLocations(response.data.locations);
            setTotalCount(response.data.pagination.total);
        } catch (error: any) {
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLocation = async (locationId: number) => {
        if (!confirm(t('confirmDeleteLocation'))) return;

        try {
            await api.delete(`/api/users/locations/${locationId}`);
            toast.success(t('locationDeletedSuccessfully'));
            await fetchLocations();
            if (selectedLocation === locationId) {
                setSelectedLocation(null);
            }
        } catch (error: any) {
            const message = error.response?.data?.message || t('failedToDeleteLocation');
            toast.error(message);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchLocations();
            if (!hasError) {
                toast.success(t('locationsDataRefreshed') || 'Locations data updated successfully.');
            }
        } catch (error) {

        } finally {
            setIsRefreshing(false);
        }
    };

    const fetchAllLocationsForExport = async (): Promise<Location[]> => {
        try {
            const filters: LocationFilters = {
                limit: 100,
                offset: 0,
            };

            if (searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }

            const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
                params: filters
            });

            return response.data.locations;
        } catch (error) {
            console.error('Failed to fetch all locations for export:', error);
            throw error;
        }
    };

    const handleExportLocations = async () => {
        setIsExporting(true);
        try {
            const allLocations = await fetchAllLocationsForExport();

            if (allLocations.length === 0) {
                toast.error(t('noDataToExport'));
                return;
            }

            const exportData = allLocations.map(location => ({
                [t('locationId')]: location.id,
                [t('name')]: location.name,
                [t('latitude')]: location.lat,
                [t('longitude')]: location.lon,
                [t('isDefault')]: location.isDefault ? t('yes') : t('no'),
                [t('createdAt')]: location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '-',
                [t('updatedAt')]: location.updatedAt ? new Date(location.updatedAt).toLocaleDateString() : '-',
            }));

            let filename = `locations_${new Date().toISOString().split('T')[0]}`;
            if (searchTerm.trim()) {
                filename += `_search_${searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
            }
            filename += '.csv';

            api.exportAsCSV(exportData, filename);

            toast.success(t('locationsExportedSuccessfully') + ` (${allLocations.length} ${t('locations')})`);
        } catch (error: any) {
            console.error('Export error:', error);
            toast.error(t('failedToExportLocations'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleViewLocation = (locationId: number) => {
        setSelectedLocation(locationId);
        setViewDialogOpen(true);
    };

    const handleEditLocation = (location: Location) => {
        setLocationToEdit(location);
        setViewDialogOpen(false);
        setEditDialogOpen(true);
    };

    const handleDialogSuccess = () => {
        fetchLocations();
        setSelectedLocation(null);
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

    // Custom status badge component for default locations
    const DefaultBadge = ({ isDefault }: { isDefault: boolean }) => {
        if (isDefault) {
            return (
                <Badge style={{ backgroundColor: '#FEF2D6', color: '#F38C19', border: '1px solid #FEF2D6' }} className="hover:opacity-80">
                    {t("default")}
                </Badge>
            );
        } else {
            return (
                <Badge style={{ backgroundColor: '#E0EDDD', color: '#37662B', border: '1px solid #E0EDDD' }} className="hover:opacity-80">
                    {t("standard")}
                </Badge>
            );
        }
    };

    return (
        <AppLayout>
            <Head>
                <title>
                    {t("locations") || "Locations"} | {t("climateInformationSystem") || "Teganyamuhinzi"}
                </title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                {/* Header section with white background */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        {/* Left side - Title only */}
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-medium">{t("locationsManagement") || "Locations Management"}</h2>
                        </div>

                        {/* Right side - Action buttons */}
                        <div className="flex flex-wrap w-full lg:w-auto items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing || isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? (t('updating') || "Updating...") : (t('refresh') || "Refresh")}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleExportLocations}
                                disabled={isExporting}
                                className="bg-green-600 hover:bg-green-700 text-white hover:text-white"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {isExporting ? (t("exporting") || "Exporting...") : (t("exportData") || "Export Data")}
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                    <CardContent className="p-0">
                        {/* Header with Add Location and Search */}
                        <div className="p-4 bg-white border-b border-gray-200 flex justify-end items-center gap-4">
                            {user?.role === 'admin' && (
                                <Button 
                                    variant="primary" 
                                    onClick={() => setCreateDialogOpen(true)} 
                                    style={{ backgroundColor: '#147677', borderColor: '#147677' }}
                                    className="hover:opacity-90 text-white"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("addLocation") || "Add Location"}
                                </Button>
                            )}
                            
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder={t("searchLocations") || "Search locations..."}
                                    className="pl-10 w-[300px] bg-gray-50 border-gray-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4">
                          <DataTable<any>
                            label="Locations"
                            data={locations}
                            getRowId={(l) => String(l.id)}
                            loading={isLoading}
                            onRowClick={(l) => handleViewLocation(l.id)}
                            emptyState={
                              <div className="flex flex-col items-center space-y-3">
                                <MapPin className="h-12 w-12 text-gray-300" />
                                <div className="text-gray-500 font-medium">{t("noLocationsFound") || "No locations found"}</div>
                                <div className="text-sm text-gray-400">{t("tryAdjustingFilters") || "Try adjusting your search criteria"}</div>
                              </div>
                            }
                            columns={[
                              { id: "name", header: t("name") || "Location Name", value: (l: any) => l.name || "", cell: (l: any) => <span className="font-medium text-gray-900">{l.name}</span> },
                              { id: "coordinates", header: t("coordinates") || "Coordinates", sortable: false, cell: (l: any) => (
                                <span className="text-sm text-gray-600 font-mono">
                                  {l.lat && l.lon ? `${l.lat.toFixed(6)}, ${l.lon.toFixed(6)}` : <span className="text-gray-400">{t("notSpecified") || "Not specified"}</span>}
                                </span>
                              ) },
                              { id: "createdAt", header: t("createdAt") || "Created Date", value: (l: any) => l.createdAt || "", cell: (l: any) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-' },
                              rowActionsColumn<any>((location: any) => (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => handleViewLocation(location.id)}>
                                      <MapPin className="h-4 w-4 mr-2" />
                                      {t("viewLocation") || "View Location"}
                                    </DropdownMenuItem>
                                    {user?.role === 'admin' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          {t("editLocation") || "Edit Location"}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem destructive onClick={() => handleDeleteLocation(location.id)}>
                                          <Trash className="h-4 w-4 mr-2" />
                                          {t("delete") || "Delete"}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )),
                            ] as SortableColumn<any>[]}
                          />
                        </div>


                        {/* Pagination Footer - Matching the provided design exactly */}
                        {totalCount > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                                <div className="flex items-center text-sm text-gray-600 gap-2">
                                    <span>
                                        {locations.length === 0 ? "0" : `${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)}`} of {totalCount} row(s) selected.
                                    </span>
                                    <span>{t("rowsPerPage") || "Rows per page"}</span>
                                    <Select value={String(limit)} onValueChange={(v) => handleLimitChange(parseInt(v))}>
                                        <SelectTrigger className="ml-2 h-8 w-[72px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                    {t("dataLastUpdated") || "Data last updated"}: {new Date().toLocaleString()}
                </div>
            </div>

            <CreateLocationDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleDialogSuccess}
            />

            <ViewLocationDialog
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                locationId={selectedLocation}
                onEdit={handleEditLocation}
            />

            <EditLocationDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                location={locationToEdit}
                onSuccess={handleDialogSuccess}
            />
        </AppLayout>
    );
};

export default Locations;