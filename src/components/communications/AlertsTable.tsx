import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Clock,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  MessageSquare,
  Trash,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLanguage } from '@/i18n';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ViewAlertDialog } from './AlertsDialogs';
import { SendAlertDialog } from './SendAlertDialog';
import { EditAlertDialog } from './AlertsDialogs';
import api from '@/lib/api';
import { toast } from 'sonner';

// Custom badge components
const StatusBadge = ({ status }: { status: string }) => {
    switch (status?.toLowerCase()) {
        case 'sent':
            return (
                <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }} className="hover:opacity-80">
                    Sent
                </Badge>
            );
        case 'scheduled':
            return (
                <Badge style={{ backgroundColor: '#dbeafe', color: '#3b82f6', border: '1px solid #dbeafe' }} className="hover:opacity-80">
                    Scheduled
                </Badge>
            );
        case 'draft':
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    Draft
                </Badge>
            );
        case 'failed':
            return (
                <Badge style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fee2e2' }} className="hover:opacity-80">
                    Failed
                </Badge>
            );
        default:
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    {status}
                </Badge>
            );
    }
};

const PriorityBadge = ({ priority }: { priority: string }) => {
    switch (priority?.toLowerCase()) {
        case 'critical':
            return (
                <Badge style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fee2e2' }} className="hover:opacity-80">
                    Critical
                </Badge>
            );
        case 'high':
            return (
                <Badge style={{ backgroundColor: '#fef3c7', color: '#f59e0b', border: '1px solid #fef3c7' }} className="hover:opacity-80">
                    High
                </Badge>
            );
        case 'medium':
            return (
                <Badge style={{ backgroundColor: '#dbeafe', color: '#3b82f6', border: '1px solid #dbeafe' }} className="hover:opacity-80">
                    Medium
                </Badge>
            );
        case 'low':
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    Low
                </Badge>
            );
        default:
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    {priority}
                </Badge>
            );
    }
};

// Delete Confirmation Dialog Component
const DeleteConfirmationDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    alertCount 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    alertCount: number; 
}) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                <div className="text-center">
                    <div className="mb-4">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <Trash className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t('confirmDelete') || 'Confirm Delete'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {t('confirmDeleteMessage') || `Are you sure you want to delete the ${alertCount} selected alert${alertCount > 1 ? 's' : ''}?`}
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-6"
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirm}
                            className="px-6"
                        >
                            {t('delete') || 'Delete'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Alert {
  id: number;
  type: string;
  message: string;
  messageLength: number;
  messageSegments: number;
  isSent: boolean;
  sentAt: string | null;
  location: string | { id: number; name: string } | null;
  createdAt: string;
  updatedAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  recipientCount?: number;
  status?: 'draft' | 'scheduled' | 'sent' | 'failed';
}

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

interface AlertsResponse {
  alerts: Alert[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AlertsTableProps {
  selectedSector: string;
  searchTerm: string;
}

export function AlertsTable({ selectedSector, searchTerm }: AlertsTableProps) {
    const { t } = useLanguage();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [sortField, setSortField] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Multi-select state
    const [selectedAlerts, setSelectedAlerts] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch alerts from API
    const fetchAlerts = async (page: number = currentPage, refresh: boolean = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            const params = {
                page,
                limit,
                sortField,
                sortOrder,
                ...(selectedSector !== 'all' && { location: selectedSector }),
                ...(searchTerm && { search: searchTerm }),
            };

            console.log('Fetching alerts with params:', params);
            const response = await api.get('/api/weather/alerts', { params });
            
            console.log('API Response:', response.data);

            // Handle different response formats
            let alertsData: Alert[] = [];
            let paginationData = {
                total: 0,
                page: page,
                limit: limit,
                totalPages: 0
            };

            // Check if response has the expected wrapper format
            if (response.data && response.data.status === 'success' && response.data.data) {
                alertsData = response.data.data.alerts || response.data.data;
                paginationData = response.data.data.pagination || paginationData;
            }
            // Check if response is direct array of alerts
            else if (Array.isArray(response.data)) {
                alertsData = response.data;
                paginationData.total = response.data.length;
                paginationData.totalPages = Math.ceil(response.data.length / limit);
            }
            // Check if response.data contains alerts directly
            else if (response.data && response.data.alerts) {
                alertsData = response.data.alerts;
                paginationData = response.data.pagination || paginationData;
            }
            // Check if response.data is the alerts array
            else if (response.data && typeof response.data === 'object') {
                // Try to extract alerts from various possible structures
                alertsData = response.data.alerts || response.data.data || [];
                paginationData = response.data.pagination || response.data.meta || paginationData;
            }

            // Transform alerts to ensure they have required properties
            const transformedAlerts = alertsData.map((alert: any) => ({
                id: alert.id || Date.now(),
                type: alert.type || 'weather',
                message: alert.message || '',
                messageLength: alert.messageLength || alert.message?.length || 0,
                messageSegments: alert.messageSegments || 1,
                isSent: alert.isSent || alert.status === 'sent' || false,
                sentAt: alert.sentAt || null,
                // Handle location - extract name if it's an object
                location: typeof alert.location === 'object' && alert.location !== null 
                    ? (alert.location.name || alert.location.id || 'Unknown')
                    : (alert.location || 'Unknown'),
                createdAt: alert.createdAt || new Date().toISOString(),
                updatedAt: alert.updatedAt,
                priority: alert.priority || 'medium',
                category: alert.category,
                targetAudience: alert.targetAudience,
                deliveryMethod: alert.deliveryMethod,
                recipientCount: alert.recipientCount,
                status: alert.status || (alert.isSent ? 'sent' : 'draft')
            }));

            setAlerts(transformedAlerts);
            setTotalCount(paginationData.total || transformedAlerts.length);
            setTotalPages(paginationData.totalPages || Math.ceil((paginationData.total || transformedAlerts.length) / limit));
            setCurrentPage(paginationData.page || page);
            
            // Clear selections on new data
            setSelectedAlerts(new Set());
            setSelectAll(false);
            
            if (refresh) {
                toast.success(t('alertsRefreshed') || 'Alerts refreshed');
            }

        } catch (error: any) {
            console.error('Failed to fetch alerts:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // More specific error messages
            let errorMessage = t('failedToLoadAlerts') || 'Failed to load alerts';
            if (error.response?.status === 404) {
                errorMessage = 'Alerts endpoint not found';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error while fetching alerts';
            } else if (error.message.includes('Network Error')) {
                errorMessage = 'Network error - check if server is running';
            }
            
            toast.error(errorMessage);
            
            // Use fallback data for development/testing
            console.log('Using fallback alerts data');
            const fallbackAlerts = getFallbackAlerts();
            setAlerts(fallbackAlerts);
            setTotalCount(fallbackAlerts.length);
            setTotalPages(Math.ceil(fallbackAlerts.length / limit));
            setCurrentPage(1);
            
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchAlerts(1);
    }, []);

    // Refetch when filters change
    useEffect(() => {
        if (currentPage === 1) {
            fetchAlerts(1);
        } else {
            setCurrentPage(1);
        }
    }, [selectedSector, searchTerm, sortField, sortOrder, limit]);

    // Refetch when page changes
    useEffect(() => {
        if (currentPage > 1) {
            fetchAlerts(currentPage);
        }
    }, [currentPage]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleRefresh = () => {
        fetchAlerts(currentPage, true);
    };

    const handleViewDetails = (alert: Alert) => {
        setSelectedAlert(alert);
        setIsViewDialogOpen(true);
    };

    const handleEditAlert = (alert: Alert) => {
        console.log('Edit alert:', alert);
        setSelectedAlert(alert);
        setIsViewDialogOpen(false);
        setIsEditDialogOpen(true);
    };

    const handleDeleteAlert = async (alertId: number) => {
        try {
            await api.delete(`/api/weather/alerts/${alertId}`);
            toast.success(t('alertDeleted') || 'Alert deleted');
            fetchAlerts(currentPage, true);
        } catch (error: any) {
            console.error('Failed to delete alert:', error);
            toast.error(t('failedToDeleteAlert') || 'Failed to delete alert');
        }
    };

    const handleSendAlert = (alert: Alert) => {
        setSelectedAlert(alert);
        setIsSendDialogOpen(true);
    };

    const handleSendSuccess = () => {
        setIsSendDialogOpen(false);
        fetchAlerts(currentPage, true);
    };

    const handleEditSuccess = () => {
        setIsEditDialogOpen(false);
        fetchAlerts(currentPage, true);
    };

    // Multi-select handlers
    const handleSelectAlert = (alertId: number) => {
        const newSelected = new Set(selectedAlerts);
        if (newSelected.has(alertId)) {
            newSelected.delete(alertId);
        } else {
            newSelected.add(alertId);
        }
        setSelectedAlerts(newSelected);
        setSelectAll(newSelected.size === alerts.length);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedAlerts(new Set());
            setSelectAll(false);
        } else {
            const allIds = new Set(alerts.map(alert => alert.id));
            setSelectedAlerts(allIds);
            setSelectAll(true);
        }
    };

    const handleBulkDelete = async () => {
        try {
            const alertIds = Array.from(selectedAlerts);
            
            // Delete alerts (assuming API supports bulk delete or individual deletes)
            await Promise.all(
                alertIds.map(id => api.delete(`/api/weather/alerts/${id}`))
            );
            
            toast.success(t('alertsDeleted') || `${alertIds.length} alert(s) deleted successfully`);
            setSelectedAlerts(new Set());
            setSelectAll(false);
            setShowDeleteConfirm(false);
            fetchAlerts(currentPage, true);
        } catch (error: any) {
            console.error('Failed to delete alerts:', error);
            toast.error(t('failedToDeleteAlerts') || 'Failed to delete some alerts');
        }
    };

    // Fallback data for development/testing
    const getFallbackAlerts = (): Alert[] => {
        return [
            {
                id: 1,
                type: 'weather',
                message: 'Weather update for Gashora Sector: Partly cloudy conditions expected with temperatures ranging from 18-25°C. Light winds from the east at 5-8 km/h. Rainfall probability is low at 15%.',
                messageLength: 156,
                messageSegments: 1,
                isSent: true,
                sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                location: 'Gashora Sector',
                createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
                priority: 'medium',
                category: 'daily_weather',
                status: 'sent',
                recipientCount: 245
            },
            {
                id: 2,
                type: 'alert',
                message: 'URGENT: Heavy rainfall warning for Rugarama Sector. Expected precipitation: 40-60mm over next 6 hours. Farmers advised to secure crops and livestock. Flash flood risk in low-lying areas.',
                messageLength: 178,
                messageSegments: 2,
                isSent: false,
                sentAt: null,
                location: 'Rugarama Sector',
                createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                priority: 'high',
                category: 'severe_weather',
                status: 'draft',
                recipientCount: 189
            },
            {
                id: 3,
                type: 'advisory',
                message: 'Farming advisory: Optimal planting conditions detected for beans and maize in Kayonza District. Soil moisture at 65%, temperature stable at 22°C. Recommended planting window: next 48 hours.',
                messageLength: 195,
                messageSegments: 2,
                isSent: true,
                sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                location: 'Kayonza District',
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
                priority: 'medium',
                category: 'farming_advisory',
                status: 'sent',
                recipientCount: 412
            }
        ];
    };

    if (isLoading && alerts.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                        <p className="text-muted-foreground">{t('loadingAlerts')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate the actual range being displayed
    const startIndex = (currentPage - 1) * limit + 1;
    const endIndex = Math.min(currentPage * limit, totalCount);

    return (
        <>
            <Card>
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                {t("alerts")}
                            </CardTitle>
                            <CardDescription>
                                {totalCount} {t("alertsFound")}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedAlerts.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash className="h-4 w-4 mr-2" />
                                    {t('delete')} ({selectedAlerts.size})
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? t('refreshing') : t('refresh')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#f2f5fa] text-black">
                                <tr>
                                    <th className="py-4 px-6 text-left font-semibold text-sm w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <button
                                            className="flex items-center gap-1 hover:text-white/80"
                                            onClick={() => handleSort('type')}
                                        >
                                            <span>{t("type")}</span>
                                            <ArrowUpDown className="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <button
                                            className="flex items-center gap-1 hover:text-white/80"
                                            onClick={() => handleSort('message')}
                                        >
                                            <span>{t("message")}</span>
                                            <ArrowUpDown className="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <button
                                            className="flex items-center gap-1 hover:text-white/80"
                                            onClick={() => handleSort('location')}
                                        >
                                            <span>{t("location")}</span>
                                            <ArrowUpDown className="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <span>{t("priority")}</span>
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <button
                                            className="flex items-center gap-1 hover:text-white/80"
                                            onClick={() => handleSort('isSent')}
                                        >
                                            <span>{t("status")}</span>
                                            <ArrowUpDown className="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">
                                        <button
                                            className="flex items-center gap-1 hover:text-white/80"
                                            onClick={() => handleSort('createdAt')}
                                        >
                                            <span>{t("created")}</span>
                                            <ArrowUpDown className="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-center font-semibold text-sm">
                                        {t("actions")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-muted-foreground">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="animate-spin h-4 w-4" />
                                                    <span>{t("loadingAlerts")}</span>
                                                </div>
                                            ) : (
                                                t("noAlertsFound")
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    alerts.map((alert, index) => (
                                        <tr
                                            key={alert.id}
                                            className={`border-b hover:bg-muted/50 transition-colors ${
                                                selectedAlerts.has(alert.id) ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAlerts.has(alert.id)}
                                                    onChange={() => handleSelectAlert(alert.id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <div className="font-medium capitalize">{alert.type}</div>
                                                {alert.category && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {typeof alert.category === 'string' ? alert.category : 'General'}
                                                    </div>
                                                )}
                                            </td>

                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <div className="text-sm line-clamp-2 max-w-[300px]">
                                                    {typeof alert.message === 'string' ? alert.message : 'No message'}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {alert.messageLength} chars • {alert.messageSegments} segments
                                                </div>
                                            </td>

                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {typeof alert.location === 'string' ? alert.location : 'Unknown Location'}
                                                    </Badge>
                                                </div>
                                                {alert.recipientCount && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {alert.recipientCount} recipients
                                                    </div>
                                                )}
                                            </td>

                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <PriorityBadge priority={alert.priority || 'medium'} />
                                            </td>

                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <StatusBadge status={alert.status || (alert.isSent ? 'sent' : 'draft')} />
                                                {alert.sentAt && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <Clock className="h-3 w-3 inline mr-1" />
                                                        {new Date(alert.sentAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </td>

                                            <td 
                                                className="py-3 px-4 cursor-pointer"
                                                onClick={() => handleViewDetails(alert)}
                                            >
                                                <div className="text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3 inline mr-1" />
                                                    {new Date(alert.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(alert.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetails(alert)}>
                                                            <AlertCircle className="h-4 w-4 mr-2" />
                                                            {t("viewDetails")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditAlert(alert)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            {t("editAlert")}
                                                        </DropdownMenuItem>
                                                        {!alert.isSent && (
                                                            <DropdownMenuItem onClick={() => handleSendAlert(alert)}>
                                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                                {t("sendNow")}
                                                            </DropdownMenuItem>
                                                        )}
                                                        <Separator className="my-1" />
                                                        <DropdownMenuItem 
                                                            className="text-red-600"
                                                            onClick={() => handleDeleteAlert(alert.id)}
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
                </CardContent>

                {alerts.length > 0 && (
                    <CardFooter className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            {t("showing")} {startIndex} - {endIndex} {t("of")} {totalCount} {t("alerts")}
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="text-sm border rounded px-2 py-1"
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            >
                                {t("next")}
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>

            <ViewAlertDialog
                open={isViewDialogOpen}
                onOpenChange={setIsViewDialogOpen}
                alert={selectedAlert}
                onEdit={handleEditAlert}
                onSend={handleSendAlert}
                onDelete={handleDeleteAlert}
            />

            <SendAlertDialog
                open={isSendDialogOpen}
                onOpenChange={setIsSendDialogOpen}
                alert={selectedAlert}
                onSuccess={handleSendSuccess}
            />

            <EditAlertDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                alert={selectedAlert}
                onSuccess={handleEditSuccess}
            />

            <DeleteConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                alertCount={selectedAlerts.size}
            />
        </>
    );
}