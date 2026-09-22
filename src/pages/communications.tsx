import React, { useRef, useState } from 'react';
import { AlertsTable } from '@/components/communications/AlertsTable';
import { MessagesTable } from '@/components/communications/MessagesTable';
import { WeatherSchedulerTable } from '@/components/communications/SchedulerTable';
import { MessageLogsTable, type MessageLogsTableHandle } from '@/components/communications/MessageLogsTable';
import { AppLayout } from '@/components/layout/AppLayout';
import Head from 'next/head';
import { useLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export default function Communications() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [logsBusy, setLogsBusy] = useState(false);
  const logsRef = useRef<MessageLogsTableHandle>(null);
  const { t } = useLanguage();
  const { user } = useAuth();

  const tabs = [
    { value: 'alerts', label: t('alerts') },
    { value: 'messages', label: t('customMessages') },
    { value: 'scheduler', label: t('weatherScheduler') },
    ...(user?.role === 'admin' ? [{ value: 'logs', label: t('logs') }] : []),
  ];

  return (
    <AppLayout>
      <Head>
        <title>
          {t('communications')} | {t('climateInformationSystem')}
        </title>
      </Head>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('Agricultural Alerts & Messages')}
          </h1>

          {activeTab === 'logs' && user?.role === 'admin' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => logsRef.current?.refresh()}
                disabled={logsBusy}
                className="border-gray-200 text-slate-600 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${logsBusy ? 'animate-spin' : ''}`} />
                {logsBusy ? t('updating') : t('refresh')}
              </Button>
              <Button
                variant="outline"
                onClick={() => logsRef.current?.exportLogs()}
                className="border-gray-200 text-slate-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('exportData')}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl px-5">
          <div className="flex items-center gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              const selected = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative shrink-0 py-3.5 text-sm font-medium transition-colors',
                    selected
                      ? 'text-[#147677]'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {tab.label}
                  {selected && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#147677]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'alerts' && <AlertsTable selectedSector="all" searchTerm="" />}
        {activeTab === 'messages' && <MessagesTable selectedSector="all" searchTerm="" />}
        {activeTab === 'scheduler' && <WeatherSchedulerTable />}
        {activeTab === 'logs' && user?.role === 'admin' && (
          <MessageLogsTable
            ref={logsRef}
            onBusyChange={setLogsBusy}
          />
        )}
      </div>
    </AppLayout>
  );
}
