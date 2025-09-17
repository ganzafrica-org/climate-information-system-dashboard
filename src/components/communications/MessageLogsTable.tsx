import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal, RefreshCw, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n';

interface MessageLog {
    level: string;
    message: string;
    timestamp: string;
    alertId: number;
    alertTitle: string; 
    alertType: string;
    farmerId: number;
    farmerName: string; 
    phoneNumber: string;
    success: boolean;
    messageId: string;
    error: string | null;
    errorReason: string | null;
    messageLength: number;
}

interface ApiResponse {
    status: string;
    data: {
        summary: {
            totalEntries: number;
            returned: number;
            sentCount: number;
            failedCount: number;
            byAlert: Record<string, { sent: number; failed: number; total: number }>;
        };
        results: MessageLog[];
    };
}

export function MessageLogsTable() {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [summary, setSummary] = useState<ApiResponse['data']['summary'] | null>(null);

    const extractData = (payload: any): { logs: MessageLog[]; summary: ApiResponse['data']['summary'] | null } => {
        if (!payload) return { logs: [], summary: null };
        
        // Handle the specific API response structure
        if (payload.data?.results && Array.isArray(payload.data.results)) {
            return {
                logs: payload.data.results,
                summary: payload.data.summary || null
            };
        }
        
        // Fallback extraction methods
        const logs = Array.isArray(payload) ? payload :
                    Array.isArray(payload.logs) ? payload.logs :
                    Array.isArray(payload.data) ? payload.data :
                    Array.isArray(payload.items) ? payload.items :
                    Array.isArray(payload.results) ? payload.results :
                    Array.isArray(payload.rows) ? payload.rows :
                    Array.isArray(payload.records) ? payload.records :
                    Array.isArray(payload?.data?.logs) ? payload.data.logs :
                    Array.isArray(payload?.data?.items) ? payload.data.items :
                    Array.isArray(payload?.data?.results) ? payload.data.results :
                    Array.isArray(payload?.data?.rows) ? payload.data.rows :
                    Array.isArray(payload?.data?.records) ? payload.data.records : [];
        
        return { logs, summary: null };
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<any>('/api/weather/admin/logs/messages');
            const data = response as any;
            console.log('Logs API raw payload:', data);
            
            const { logs: extractedLogs, summary: extractedSummary } = extractData(data);
            const logsArray = Array.isArray(extractedLogs) ? extractedLogs : [];
            setLogs(logsArray);
            setSummary(extractedSummary);
            console.log('Parsed logs count:', logsArray.length);
            
        } catch (error: any) {
            console.error('Failed to fetch message logs:', error);
            toast.error(t('failedToLoadLogs') || 'Failed to load logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredLogs = useMemo(() => {
        const source = Array.isArray(logs) ? logs : [];
        if (!searchTerm) return source;
        const term = searchTerm.toLowerCase();
        return source.filter((l) => {
            return [l.message, l.phoneNumber, l.messageId, l.alertId?.toString(), l.farmerName, l.level, l.alertTitle, l.alertType]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(term));
        });
    }, [logs, searchTerm]);

    const StatusBadge = ({ success, level }: { success?: boolean; level?: string }) => {
        if (success === true || level === 'info') {
            return (
                <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }}>
                    {t('success') || 'Success'}
                </Badge>
            );
        }
        if (success === false || level === 'error') {
            return (
                <Badge style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                    {t('failed') || 'Failed'}
                </Badge>
            );
        }
        return (
            <Badge style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FEF3C7' }}>
                {level || 'Unknown'}
            </Badge>
        );
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchLogs();
            toast.success(t('logsRefreshed') || 'Logs refreshed');
        } finally {
            setIsRefreshing(false);
        }
    };

    const exportLogs = () => {
        if (!filteredLogs.length) {
            toast.error(t('noDataToExport') || 'No data to export');
            return;
        }
        const exportData = filteredLogs.map((l) => ({
            [t('alertId') || 'Alert ID']: l.alertId,
            [t('alertTitle') || 'Alert Title']: l.alertTitle || '-',
            [t('alertType') || 'Alert Type']: l.alertType || '-',
            [t('farmerName') || 'Farmer Name']: l.farmerName || `Farmer ${l.farmerId}`,
            [t('phoneNumber') || 'Phone Number']: l.phoneNumber || '-',
            [t('message') || 'Message']: l.message || '-',
            [t('messageId') || 'Message ID']: l.messageId || '-',
            [t('success') || 'Success']: l.success ? 'Yes' : 'No',
            [t('messageLength') || 'Message Length']: l.messageLength ?? '-',
            [t('level') || 'Level']: l.level || '-',
            [t('error') || 'Error']: l.error || '-',
            [t('errorReason') || 'Error Reason']: l.errorReason || '-',
            [t('timestamp') || 'Timestamp']: l.timestamp ? new Date(l.timestamp).toLocaleString() : '-',
        }));
        api.exportAsCSV(exportData, `message_logs_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <Card className="shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Message Logs</CardTitle>
                        <CardDescription>
                            SMS delivery outcomes and diagnostics
                            {summary && (
                                <span className="ml-2 text-sm">
                                    ({summary.sentCount} sent, {summary.failedCount} failed)
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing || isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Updating...' : 'Refresh'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={exportLogs}
                            className="bg-green-600 hover:bg-green-700 text-white hover:text-white"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Data
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center gap-4">
                    {summary && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Total: {summary.totalEntries}</span>
                            <span className="text-green-600">Sent: {summary.sentCount}</span>
                            <span className="text-red-600">Failed: {summary.failedCount}</span>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder={t('searchLogs') || 'Search logs...'}
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
                            <span className="text-gray-500">{t('loading') || 'Loading...'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="text-black bg-[#f2f5fa]">
                                <tr>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">#</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('alertTitle') || 'Alert Title'}</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('farmerName') || 'Farmer Name'}</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('phoneNumber') || 'Phone'}</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('status') || 'Status'}</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('messageLength') || 'Length'}</th>
                                    <th className="py-4 px-6 text-left font-semibold text-sm">{t('timestamp') || 'Timestamp'}</th>
                                    <th className="py-4 px-6 text-center font-semibold text-sm">{t('actions') || 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <div className="text-gray-500">{t('noLogsFound') || 'No logs found'}</div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, index) => (
                                        <tr
                                            key={`${log.messageId}-${index}`}
                                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                        >
                                            <td className="py-4 px-6 text-sm text-gray-900">{index + 1}</td>
                                            <td className="py-4 px-6 text-sm">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    {log.alertTitle || log.alertType || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6 text-sm">
                                                {log.farmerName || `Farmer ${log.farmerId}`}
                                            </td>
                                            <td className="py-4 px-6 text-sm font-mono">{log.phoneNumber}</td>
                                            <td className="py-4 px-6">
                                                <StatusBadge success={log.success} level={log.level} />
                                            </td>
                                            <td className="py-4 px-6 text-sm">{log.messageLength} chars</td>
                                            <td className="py-4 px-6 text-sm">
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
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
                                                            onClick={() => toast.info(JSON.stringify(log, null, 2))} 
                                                            className="cursor-pointer hover:bg-blue-50"
                                                        >
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => toast.info(`Message ID: ${log.messageId}`)} 
                                                            className="cursor-pointer hover:bg-green-50"
                                                        >
                                                            Copy Message ID
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => toast.info(log.message)} 
                                                            className="cursor-pointer hover:bg-yellow-50"
                                                        >
                                                            View Message
                                                        </DropdownMenuItem>
                                                        {log.error && (
                                                            <DropdownMenuItem 
                                                                onClick={() => toast.error(log.error!)} 
                                                                className="cursor-pointer hover:bg-red-50"
                                                            >
                                                                View Error
                                                            </DropdownMenuItem>
                                                        )}
                                                        {log.errorReason && (
                                                            <DropdownMenuItem 
                                                                onClick={() => toast.error(log.errorReason!)} 
                                                                className="cursor-pointer hover:bg-red-50"
                                                            >
                                                                View Error Reason
                                                            </DropdownMenuItem>
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
            </CardContent>
        </Card>
    );
}