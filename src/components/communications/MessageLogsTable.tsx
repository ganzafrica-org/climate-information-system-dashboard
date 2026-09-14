import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DataTable, rowActionsColumn, type SortableColumn } from '@/components/ui/table';
import { MoreHorizontal, RefreshCw, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n';

interface MessageLog {
    id?: number;
    level?: string;
    message: string;
    timestamp?: string;
    alertId: number;
    alertTitle: string; 
    alertType: string;
    farmerId: number;
    farmerName: string; 
    phoneNumber: string;
    success?: boolean;
    status?: string;
    messageId: string;
    error?: string | null;
    errorMessage?: string | null;
    errorReason?: string | null;
    messageLength?: number;
    provider?: string;
    sentAt?: string | null;
    createdAt?: string;
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
            const response = await api.get<any>(
                '/api/weather/admin/logs/messages',
                {
                    params: { _ts: Date.now() },
                    headers: { 'Cache-Control': 'no-cache' }
                }
            );
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
            return [l.message, l.phoneNumber, l.messageId, l.alertId?.toString(), l.farmerName, l.level, l.alertTitle, l.alertType, l.status, l.provider]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(term));
        });
    }, [logs, searchTerm]);

    const logStats = useMemo(() => {
        const source = Array.isArray(logs) ? logs : [];
        let sentCount = 0;
        let failedCount = 0;

        source.forEach((log) => {
            const status = log.status?.toLowerCase();
            const success = log.success;
            const level = log.level?.toLowerCase();
            const hasError = log.error || log.errorMessage;

            // Count as sent/success
            if (status === 'sent' || status === 'delivered' || status === 'success' || success === true || level === 'info') {
                sentCount++;
            }
            // Count as failed
            else if (status === 'failed' || status === 'error' || success === false || level === 'error' || hasError) {
                failedCount++;
            }
        });

        return { total: source.length, sentCount, failedCount };
    }, [logs]);

    const StatusBadge = ({ log }: { log: MessageLog }) => {
        // Determine status from multiple possible fields
        const status = log.status?.toLowerCase();
        const success = log.success;
        const level = log.level?.toLowerCase();
        const hasError = log.error || log.errorMessage;
        
        // Success cases
        if (status === 'sent' || status === 'delivered' || status === 'success' || success === true || level === 'info') {
            return (
                <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }}>
                    {t('success') || 'Success'}
                </Badge>
            );
        }
        
        // Failure cases
        if (status === 'failed' || status === 'error' || success === false || level === 'error' || hasError) {
            return (
                <Badge style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FEE2E2' }}>
                    {t('failed') || 'Failed'}
                </Badge>
            );
        }
        
        // Pending/processing cases
        if (status === 'pending' || status === 'processing' || status === 'queued') {
            return (
                <Badge style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FEF3C7' }}>
                    {t('pending') || 'Pending'}
                </Badge>
            );
        }
        
        // Unknown/other cases
        return (
            <Badge style={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                {status || level || t('unknown') || 'Unknown'}
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
            [t('id') || 'ID']: l.id || '-',
            [t('alertId') || 'Alert ID']: l.alertId,
            [t('alertTitle') || 'Alert Title']: l.alertTitle || '-',
            [t('alertType') || 'Alert Type']: l.alertType || '-',
            [t('farmerName') || 'Farmer Name']: l.farmerName || `Farmer ${l.farmerId}`,
            [t('phoneNumber') || 'Phone Number']: l.phoneNumber || '-',
            [t('message') || 'Message']: l.message || '-',
            [t('messageId') || 'Message ID']: l.messageId || '-',
            [t('status') || 'Status']: l.status || (l.success ? 'Success' : 'Failed'),
            [t('provider') || 'Provider']: l.provider || '-',
            [t('messageLength') || 'Message Length']: l.messageLength ?? l.message?.length ?? '-',
            [t('level') || 'Level']: l.level || '-',
            [t('error') || 'Error']: l.error || l.errorMessage || '-',
            [t('errorReason') || 'Error Reason']: l.errorReason || '-',
            [t('sentAt') || 'Sent At']: l.sentAt ? new Date(l.sentAt).toLocaleString() : '-',
            [t('timestamp') || 'Timestamp']: l.timestamp ? new Date(l.timestamp).toLocaleString() : l.createdAt ? new Date(l.createdAt).toLocaleString() : '-',
        }));
        api.exportAsCSV(exportData, `message_logs_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const formatTimestamp = (log: MessageLog) => {
        const timestamp = log.timestamp || log.sentAt || log.createdAt;
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString();
    };

    const getMessageLength = (log: MessageLog) => {
        return log.messageLength ?? log.message?.length ?? 0;
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
                    <div className="relative ml-auto">
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

                <div className="p-4">
                  <DataTable<MessageLog>
                    label="Message logs"
                    data={filteredLogs}
                    getRowId={(l) => `${l.messageId}-${l.id}`}
                    loading={isLoading}
                    pagination={{ pageSize: 15 }}
                    emptyState={t('noLogsFound') || 'No logs found'}
                    columns={[
                      { id: 'alertTitle', header: t('alertTitle') || 'Alert Title', value: (l) => l.alertTitle || l.alertType || '', cell: (l) => (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{l.alertTitle || l.alertType || 'N/A'}</Badge>
                      ) },
                      { id: 'farmerName', header: t('farmerName') || 'Farmer Name', value: (l) => l.farmerName || `Farmer ${l.farmerId}`, cell: (l) => l.farmerName || `Farmer ${l.farmerId}` },
                      { id: 'phoneNumber', header: t('phoneNumber') || 'Phone', value: (l) => l.phoneNumber || '', cell: (l) => <span className="font-mono">{l.phoneNumber}</span> },
                      { id: 'status', header: t('status') || 'Status', sortable: false, cell: (l) => <StatusBadge log={l} /> },
                      { id: 'provider', header: t('provider') || 'Provider', value: (l) => l.provider || '', cell: (l) => (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{l.provider || 'N/A'}</Badge>
                      ) },
                      { id: 'length', header: t('messageLength') || 'Length', numeric: true, value: (l) => getMessageLength(l), cell: (l) => `${getMessageLength(l)} chars` },
                      { id: 'timestamp', header: t('timestamp') || 'Timestamp', value: (l) => l.timestamp || l.sentAt || l.createdAt || '', cell: (l) => formatTimestamp(l) },
                      rowActionsColumn<MessageLog>((log) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => {
                              const details = { 'Alert ID': log.alertId, 'Alert Title': log.alertTitle, 'Farmer': log.farmerName, 'Phone': log.phoneNumber, 'Status': log.status, 'Provider': log.provider, 'Message ID': log.messageId, 'Message': log.message, 'Error': log.error || log.errorMessage || 'None' };
                              toast.info(JSON.stringify(details, null, 2));
                            }}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(log.messageId); toast.success('Message ID copied to clipboard'); }}>Copy Message ID</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info(log.message)}>View Message</DropdownMenuItem>
                            {(log.error || log.errorMessage) && (
                              <DropdownMenuItem destructive onClick={() => toast.error(log.error || log.errorMessage || 'Unknown error')}>View Error</DropdownMenuItem>
                            )}
                            {log.errorReason && (
                              <DropdownMenuItem destructive onClick={() => toast.error(log.errorReason!)}>View Error Reason</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )),
                    ] as SortableColumn<MessageLog>[]}
                  />
                </div>
            </CardContent>
        </Card>
    );
}