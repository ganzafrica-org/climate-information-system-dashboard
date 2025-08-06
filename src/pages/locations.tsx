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

    useEffect(() => {
        if (isAuthenticated && user?.role !== 'admin') {
            toast.error(t('adminAccessRequired'));
            router.push('/dashboard');
            return;
        }
    }, [isAuthenticated, user, router, t]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchLocations();
        }
    }, [searchTerm, currentPage, limit, isAuthenticated, user]);

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
            await api.delete(`/api/users/locations//${locationId}`);
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
                    {t("locations") || "Locations"} | {t("climateInformationSystem") || "Climate Information System"}
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
                            <Button 
                                variant="primary" 
                                onClick={() => setCreateDialogOpen(true)} 
                                style={{ backgroundColor: '#2580f5', borderColor: '#2580f5' }}
                                className="hover:opacity-90 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {t("addLocation") || "Add Location"}
                            </Button>
                            
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

                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 ">
                                <div className="flex flex-col items-center space-y-3">
                                    <Loader2 className="animate-spin h-8 w-8" style={{ color: '#2580f5' }} />
                                    <span className="text-gray-500">{t("loading") || "Loading..."}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="text-black bg-[#f2f5fa]">
                                    <tr>
                                        <th className="py-4 px-6 text-left font-semibold text-sm">
                                            #
                                        </th>
                                        <th className="py-4 px-6 text-left font-semibold text-sm">
                                            {t("name") || "Location Name"}
                                        </th>
                                        <th className="py-4 px-6 text-left font-semibold text-sm">
                                            {t("coordinates") || "Coordinates"}
                                        </th>
                                        <th className="py-4 px-6 text-left font-semibold text-sm">
                                            {t("createdAt") || "Created Date"}
                                        </th>
                                        <th className="py-4 px-6 text-center font-semibold text-sm">
                                            {t("actions") || "Actions"}
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                    {locations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center">
                                                <div className="flex flex-col items-center space-y-3">
                                                    <MapPin className="h-12 w-12 text-gray-300" />
                                                    <div className="text-gray-500 font-medium">{t("noLocationsFound") || "No locations found"}</div>
                                                    <div className="text-sm text-gray-400">{t("tryAdjustingFilters") || "Try adjusting your search criteria"}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        locations.map((location, index) => (
                                            <tr
                                                key={location.id}
                                                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                }`}
                                                onClick={() => handleViewLocation(location.id)}
                                            >
                                                <td className="py-4 px-6 text-sm text-gray-900">
                                                    {(currentPage - 1) * limit + index + 1}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-gray-900">{location.name}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="text-sm text-gray-600 font-mono">
                                                        {location.lat && location.lon ? (
                                                            <span>{location.lat.toFixed(6)}, {location.lon.toFixed(6)}</span>
                                                        ) : (
                                                            <span className="text-gray-400">{t("notSpecified") || "Not specified"}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="text-sm text-gray-600">
                                                        {location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '-'}
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
                                                                    handleViewLocation(location.id);
                                                                }}
                                                                className="cursor-pointer hover:bg-blue-50"
                                                            >
                                                                <MapPin className="h-4 w-4 mr-2" style={{ color: '#2580f5' }} />
                                                                {t("viewLocation") || "View Location"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditLocation(location);
                                                                }}
                                                                className="cursor-pointer hover:bg-green-50"
                                                            >
                                                                <Edit className="h-4 w-4 mr-2" style={{ color: '#66a9e3' }} />
                                                                {t("editLocation") || "Edit Location"}
                                                            </DropdownMenuItem>
                                                            <Separator className="my-1" />
                                                            <DropdownMenuItem
                                                                className="cursor-pointer hover:bg-red-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteLocation(location.id);
                                                                }}
                                                            >
                                                                <Trash className="h-4 w-4 mr-2" style={{ color: '#e46064' }} />
                                                                <span style={{ color: '#e46064' }}>{t("delete") || "Delete"}</span>
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

                        {/* Pagination Footer - Matching the provided design exactly */}
                        {totalCount > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                                <div className="flex items-center text-sm text-gray-600 gap-2">
                                    <span>
                                        {locations.length === 0 ? "0" : `${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)}`} of {totalCount} row(s) selected.
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