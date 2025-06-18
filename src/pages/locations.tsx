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
import { Badge } from "@/components/ui/badge";
import {
    ArrowUpDown, Download, Edit, Loader2, MapPin,
    Plus, Search, Trash, RefreshCw, AlertTriangle, WifiOff
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
    const [limit] = useState(20);

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
    }, [searchTerm, currentPage, isAuthenticated, user]);

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

            const response = await api.get<ApiResponse<LocationsResponse>>('/api/admin/locations', {
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
            await api.delete(`/api/admin/locations/${locationId}`);
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

            const response = await api.get<ApiResponse<LocationsResponse>>('/api/admin/locations', {
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

    const renderEmptyState = () => {
        let icon = <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />;
        let title = t('noLocationsData') || 'No Locations Data';
        let description = t('noLocationsDataDescription') || 'Unable to load locations data at the moment.';

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
                description = t('dataNotFoundDescription') || 'No locations data available.';
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
                            onClick={handleRefresh}
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

    return (
        <AppLayout>
            <Head>
                <title>
                    {t("locations") || "Locations"} | {t("climateInformationSystem") || "Climate Information System"}
                </title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t("locationsManagement") || "Locations Management"}</h2>
                    </div>

                    <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t("searchLocations") || "Search locations..."}
                                className="pl-8 w-full sm:w-[200px] h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="primary" onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("addLocation") || "Add Location"}
                            </Button>

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
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {isExporting ? (t("exporting") || "Exporting...") : (t("exportData") || "Export Data")}
                            </Button>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader className="p-4">
                        <CardTitle>{t("registeredLocations") || "Registered Locations"}</CardTitle>
                        <CardDescription>
                            {totalCount} {t("locationsFound") || "locations found"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin h-8 w-8" />
                            </div>
                        ) : hasError ? (
                            renderEmptyState()
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b bg-muted">
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span>{t("name") || "Name"}</span>
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span>{t("coordinates") || "Coordinates"}</span>
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span>{t("createdAt") || "Created"}</span>
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions") || "Actions"}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {locations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                {hasError ? (t("errorLoadingLocations") || "Error loading locations") : (t("noLocationsFound") || "No locations found")}
                                            </td>
                                        </tr>
                                    ) : (
                                        locations.map((location) => (
                                            <tr
                                                key={location.id}
                                                className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => handleViewLocation(location.id)}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-medium">{location.name}</div>
                                                    {location.isDefault && (
                                                        <Badge variant="secondary" className="mt-1">
                                                            {t("default") || "Default"}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-sm">
                                                        {location.lat && location.lon ? (
                                                            <span>{location.lat.toFixed(6)}, {location.lon.toFixed(6)}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">{t("notSpecified") || "Not specified"}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-sm">
                                                        {location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '-'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditLocation(location);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteLocation(location.id);
                                                            }}
                                                            className="text-red-600"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
                                {t("showing") || "Showing"} {Math.min((currentPage - 1) * limit + 1, totalCount)} - {Math.min(currentPage * limit, totalCount)} {t("of") || "of"} {totalCount} {t("locations") || "locations"}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                >
                                    {t("previous") || "Previous"}
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
                                    {t("next") || "Next"}
                                </Button>
                            </div>
                        </CardFooter>
                    )}
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