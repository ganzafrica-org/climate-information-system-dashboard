import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable, type SortableColumn } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
    ArrowUpDown, ChevronDown, Download, Edit, Loader2, MapPin, MessageSquare,
    MoreHorizontal, Phone, Plus, Search, Trash, Upload, User,
    RefreshCw, AlertTriangle, WifiOff
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

                            {user?.role === 'admin' && (
                                <Button
                                    variant="primary"
                                    onClick={() => setCreateDialogOpen(true)}
                                    className="rounded-lg"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("addLocation") || "Add Location"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,40,80,0.06)] px-5 pt-5 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h2 className="text-base font-bold text-slate-900">
                            {t("listOfLocations") || "List of Locations"}
                        </h2>

                        <div className="relative flex-1 sm:flex-none w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="search"
                                placeholder={t("searchLocations") || "Search locations..."}
                                className="pl-10 h-10 w-full sm:w-[220px] rounded-full bg-[#F3F4F6] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#147677]/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <DataTable<any>
                        label="Locations"
                        variant="sheet"
                        rowHeight={56}
                        data={locations}
                        getRowId={(l) => String(l.id)}
                        loading={isLoading}
                        skeletonRows={limit}
                        onRowClick={(l) => handleViewLocation(l.id)}
                        emptyState={
                          <div className="flex flex-col items-center space-y-2">
                            <MapPin className="h-10 w-10 text-gray-300" />
                            <div className="text-slate-600 font-medium">{t("noLocationsFound") || "No locations found"}</div>
                          </div>
                        }
                        columns={[
                          { id: "index", header: "#", width: "72px", numeric: true, value: (l: any) => l.id },
                          { id: "name", header: t("name") || "Location Name", value: (l: any) => l.name || "", cell: (l: any) => <span className="font-semibold text-slate-900">{l.name}</span> },
                          { id: "coordinates", header: t("coordinates") || "Coordinates", sortable: false, cell: (l: any) => (
                            <span className="text-sm text-slate-600 font-mono">
                              {l.lat && l.lon ? `${l.lat.toFixed(6)}, ${l.lon.toFixed(6)}` : <span className="text-gray-400">{t("notSpecified") || "Not specified"}</span>}
                            </span>
                          ) },
                          { id: "createdAt", header: t("createdAt") || "Created Date", width: "140px", value: (l: any) => l.createdAt || "", cell: (l: any) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-' },
                          { id: "__actions", header: t("actions"), width: "96px", sortable: false, cell: (location: any) => (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => handleViewLocation(location.id)}>
                                  <MapPin className="h-4 w-4 mr-2 text-[#147677]" />
                                  {t("viewLocation") || "View Location"}
                                </DropdownMenuItem>
                                {user?.role === 'admin' && (
                                  <>
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditLocation(location)}>
                                      <Edit className="h-4 w-4 mr-2 text-[#147677]" />
                                      {t("editLocation") || "Edit Location"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleDeleteLocation(location.id)}>
                                      <Trash className="h-4 w-4 mr-2 text-[#e46064]" />
                                      <span className="text-[#e46064]">{t("delete") || "Delete"}</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) },
                        ] as SortableColumn<any>[]}
                    />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                        <p className="text-sm text-slate-500">
                            {t("showingEntries", { count: isLoading ? 0 : locations.length, total: totalCount })}
                        </p>
                        <Pagination
                            label="Locations"
                            variant="boxed"
                            showEdges
                            count={totalPages}
                            page={currentPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>

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