import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DataTable, type SortableColumn } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Eye,
    Filter,
    MessageSquare,
    MoreHorizontal,
    Phone,
    Search,
    User,
} from 'lucide-react';
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

type LogSummary = {
    total: number;
    sent: number;
    failed: number;
    pending: number;
};

type StatusFilter = 'all' | 'sent' | 'failed' | 'pending';

const normalizeSummary = (raw: any, logs: MessageLog[]): LogSummary => {
    const sentFromLogs = logs.filter((l) => l.status === 'sent' || l.success === true).length;
    const failedFromLogs = logs.filter((l) => l.status === 'failed' || l.success === false).length;
    const pendingFromLogs = logs.filter((l) => l.status === 'pending').length;
    return {
        total: Number(raw?.total ?? raw?.totalEntries ?? logs.length) || logs.length,
        sent: Number(raw?.sent ?? raw?.sentCount ?? sentFromLogs) || sentFromLogs,
        failed: Number(raw?.failed ?? raw?.failedCount ?? failedFromLogs) || failedFromLogs,
        pending: Number(raw?.pending ?? pendingFromLogs) || pendingFromLogs,
    };
};

export type MessageLogsTableHandle = {
    refresh: () => Promise<void>;
    exportLogs: () => void;
    isBusy: boolean;
};

export const MessageLogsTable = forwardRef<MessageLogsTableHandle, { onBusyChange?: (busy: boolean) => void }>(function MessageLogsTable({ onBusyChange }, ref) {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [summary, setSummary] = useState<LogSummary>({ total: 0, sent: 0, failed: 0, pending: 0 });
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const pageSize = 15;

    const extractPage = (payload: any): { logs: MessageLog[]; summary: any; total: number; pageCount: number } => {
        if (!payload) return { logs: [], summary: null, total: 0, pageCount: 1 };
        const root = payload.data ?? payload;
        const logs = Array.isArray(root?.results) ? root.results
            : Array.isArray(root?.messages) ? root.messages
            : Array.isArray(payload.results) ? payload.results
            : Array.isArray(payload) ? payload
            : [];
        const pagination = root?.pagination || payload.pagination;
        const total = Number(pagination?.total ?? root?.summary?.total ?? logs.length) || logs.length;
        const pageCount = Number(pagination?.totalPages ?? Math.max(1, Math.ceil(total / 200))) || 1;
        return { logs, summary: root?.summary ?? payload.summary, total, pageCount };
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const allLogs: MessageLog[] = [];
            let collectedSummary: any = null;
            let pageNum = 1;
            let pageCount = 1;

            do {
                const payload = await api.get<any>(
                    '/api/weather/admin/logs/messages',
                    {
                        params: {
                            page: pageNum,
                            limit: 200,
                            sortField: 'createdAt',
                            sortOrder: 'desc',
                            _ts: Date.now(),
                        },
                    }
                );
                const extracted = extractPage(payload);
                if (extracted.summary) collectedSummary = extracted.summary;
                allLogs.push(...extracted.logs);
                pageCount = extracted.pageCount;
                pageNum += 1;
            } while (pageNum <= pageCount && pageNum <= 25);

            setLogs(allLogs);
            setSummary(normalizeSummary(collectedSummary, allLogs));
        } catch (error: any) {
            console.error('Failed to fetch message logs:', error);
            toast.error(t('failedToLoadLogs'));
            setLogs([]);
            setSummary({ total: 0, sent: 0, failed: 0, pending: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        onBusyChange?.(isRefreshing || isLoading);
    }, [isRefreshing, isLoading, onBusyChange]);

    const filteredLogs = useMemo(() => {
        const source = Array.isArray(logs) ? logs : [];
        const byStatus = source.filter((l) => {
            if (statusFilter === 'all') return true;
            const status = (l.status || '').toLowerCase();
            if (statusFilter === 'sent') return status === 'sent' || (status !== 'failed' && status !== 'pending' && l.success === true);
            if (statusFilter === 'failed') return status === 'failed';
            if (statusFilter === 'pending') return status === 'pending';
            return true;
        });
        if (!searchTerm) return byStatus;
        const term = searchTerm.toLowerCase();
        return byStatus.filter((l) => {
            return [l.message, l.phoneNumber, l.messageId, l.alertId?.toString(), l.farmerName, l.level, l.alertTitle, l.alertType, l.status, l.provider]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(term));
        });
    }, [logs, searchTerm, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    const pagedLogs = useMemo(
        () => filteredLogs.slice((page - 1) * pageSize, page * pageSize),
        [filteredLogs, page]
    );

    const StatusBadge = ({ log }: { log: MessageLog }) => {
        const status = (log.status || '').toLowerCase();
        const hasError = Boolean(log.error || log.errorMessage);

        if (status === 'sent' || status === 'success' || (log.success === true && status !== 'failed')) {
            return (
                <Badge className="max-w-full truncate border-[#ECFDF6] bg-[#ECFDF6] text-[#16a34a] hover:border-[#16a34a] hover:bg-[#16a34a] hover:text-white">
                    {t('sent')}
                </Badge>
            );
        }

        if (status === 'failed' || log.success === false || hasError) {
            return (
                <Badge className="border-[#FEE2E2] bg-[#FEF2F2] text-[#DC2626]">
                    {t('failed')}
                </Badge>
            );
        }

        if (status === 'pending' || status === 'processing' || status === 'queued') {
            return (
                <Badge className="border-[#FEF3C7] bg-[#FEF3C7] text-[#D97706]">
                    {t('pending')}
                </Badge>
            );
        }

        return (
            <Badge className="border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280]">
                {log.status || t('pending')}
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

    useImperativeHandle(ref, () => ({
        refresh: handleRefresh,
        exportLogs,
        isBusy: isRefreshing || isLoading,
    }), [handleRefresh, exportLogs, isRefreshing, isLoading]);

    const getMessageLength = (log: MessageLog) => {
        return log.messageLength ?? log.message?.length ?? 0;
    };

    const formatTimestamp = (log: MessageLog) => {
        const timestamp = log.timestamp || log.sentAt || log.createdAt;
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const formatProvider = (provider?: string) => {
        if (!provider) return 'N/A';
        return provider.split(':')[0];
    };

    const openDetails = (log: MessageLog) => {
        setSelectedLog(log);
        setDetailsOpen(true);
    };

    const statusFilters = [
        { id: 'all' as const, label: t('allStatuses'), count: summary.total },
        { id: 'sent' as const, label: t('sentCountLabel'), count: summary.sent },
        { id: 'failed' as const, label: t('failedCountLabel'), count: summary.failed },
        { id: 'pending' as const, label: t('pendingCountLabel'), count: summary.pending },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,40,80,0.06)] px-5 pt-5 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-900">
                    {t('listOfLogs')}
                </h2>

                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder={t('search')}
                            className="pl-10 h-10 w-full sm:w-[220px] rounded-full bg-[#F3F4F6] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#147677]/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="primary"
                                size="icon"
                                className="h-10 w-10 rounded-lg shrink-0"
                                title={statusFilters.find((item) => item.id === statusFilter)?.label}
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {statusFilters.map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => setStatusFilter(item.id)}
                                    className={statusFilter === item.id ? 'text-[#147677] font-medium' : ''}
                                >
                                    {item.label} ({item.count})
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <DataTable<MessageLog>
                label="Message logs"
                variant="sheet"
                rowHeight={52}
                data={pagedLogs}
                getRowId={(l) => String(l.id ?? `${l.messageId || 'log'}-${l.phoneNumber}-${l.createdAt}`)}
                loading={isLoading}
                skeletonRows={pageSize}
                emptyState={t('noLogsFound')}
                columns={[
                  { id: 'alertTitle', header: t('alertTitle') || 'Alert Title', width: 'minmax(110px, 1fr)', value: (l) => l.alertTitle || l.alertType || '', cell: (l) => (
                    <span className="block truncate" title={l.alertTitle || l.alertType || undefined}>{l.alertTitle || l.alertType || 'N/A'}</span>
                  ) },
                  { id: 'farmerName', header: t('farmerName') || 'Farmer Name', width: 'minmax(150px, 1.2fr)', value: (l) => l.farmerName || `Farmer ${l.farmerId}`, cell: (l) => (
                    <span className="block truncate">{l.farmerName || `Farmer ${l.farmerId}`}</span>
                  ) },
                  { id: 'phoneNumber', header: t('phone') || 'Phone', width: '130px', value: (l) => l.phoneNumber || '', cell: (l) => (
                    <span className="font-mono whitespace-nowrap">{l.phoneNumber}</span>
                  ) },
                  { id: 'status', header: t('status') || 'Status', width: '110px', sortable: false, cell: (l) => <StatusBadge log={l} /> },
                  { id: 'provider', header: t('provider') || 'Provider', width: '160px', value: (l) => formatProvider(l.provider), cell: (l) => (
                    <span
                      className="block truncate text-xs font-medium text-[#B45309]"
                      title={l.provider || undefined}
                    >
                      {formatProvider(l.provider)}
                    </span>
                  ) },
                  { id: 'length', header: t('messageLength') || 'Length', width: '88px', numeric: true, value: (l) => getMessageLength(l), cell: (l) => (
                    <span className="whitespace-nowrap">{getMessageLength(l)}</span>
                  ) },
                  { id: 'timestamp', header: t('timestamp') || 'Timestamp', width: '158px', value: (l) => l.timestamp || l.sentAt || l.createdAt || '', cell: (l) => (
                    <span className="block truncate whitespace-nowrap" title={formatTimestamp(l)}>{formatTimestamp(l)}</span>
                  ) },
                  { id: '__actions', header: t('actions'), width: '96px', sortable: false, cell: (log) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                          <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => openDetails(log)} className="cursor-pointer">
                          <Eye className="h-4 w-4 mr-2 text-[#147677]" />
                          {t('viewDetails')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) },
                ] as SortableColumn<MessageLog>[]}
            />

            {filteredLogs.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                    <p className="text-sm text-slate-500">
                        {t("showingEntries", { count: isLoading ? 0 : pagedLogs.length, total: filteredLogs.length })}
                    </p>
                    <Pagination
                        label="Message logs"
                        variant="boxed"
                        showEdges
                        count={totalPages}
                        page={page}
                        onPageChange={setPage}
                    />
                </div>
            )}

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" style={{ color: '#147677' }} />
                            {t('messageDetails')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('logDetails')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="rounded-full h-16 w-16 flex items-center justify-center shrink-0" style={{ backgroundColor: '#147677' }}>
                                    <User className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-semibold truncate">
                                        {selectedLog.farmerName || `Farmer ${selectedLog.farmerId}`}
                                    </h3>
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                        <Phone className="h-4 w-4" style={{ color: '#147677' }} />
                                        <span>{selectedLog.phoneNumber || '—'}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {formatTimestamp(selectedLog)}
                                    </p>
                                </div>
                                <StatusBadge log={selectedLog} />
                            </div>

                            <Separator />

                            <div>
                                <h4 className="font-medium mb-2">{t('message')}</h4>
                                <p className="rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedLog.message || '—'}
                                </p>
                            </div>

                            {(selectedLog.error || selectedLog.errorMessage || selectedLog.errorReason) && (
                                <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
                                    <p className="text-xs font-medium text-[#DC2626] mb-1">{t('error')}</p>
                                    <p className="text-sm text-[#991B1B]">
                                        {selectedLog.error || selectedLog.errorMessage || selectedLog.errorReason}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                            {t('close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});