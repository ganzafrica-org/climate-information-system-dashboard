import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Clock,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Location } from '@/types/farmer';

interface SchedulerStatus {
  isRunning: boolean;
  isInitialized: boolean;
  currentKigaliTime?: string;
  timezone?: string;
  frequency?: string;
  scheduleTimes?: string[];
  nextAlert?: string;
}

const DEFAULT_TIMES = ['19:00'];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const normalizeTime = (raw: string) => {
  const value = (raw || '').trim();
  const ampm = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = ampm[2];
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '19:00';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const isEveningTime = (hhmm: string) => Number(normalizeTime(hhmm).split(':')[0]) >= 12;

const formatDisplayTime = (hhmm: string) => {
  const [hours, minutes] = normalizeTime(hhmm).split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const kigaliMinutesNow = (currentKigaliTime?: string) => {
  if (currentKigaliTime) {
    const parsed = new Date(currentKigaliTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours() * 60 + parsed.getMinutes();
    }
    const match = currentKigaliTime.match(/(\d{1,2}):(\d{2})/);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
  }
  const now = new Date();
  const kigali = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Kigali' }));
  return kigali.getHours() * 60 + kigali.getMinutes();
};

export function WeatherSchedulerTable() {
  const { t } = useLanguage();
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(DEFAULT_TIMES);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('19:00');

  const [sendOpen, setSendOpen] = useState(false);
  const [alertType, setAlertType] = useState('heavy_rainfall');
  const [locationId, setLocationId] = useState('');
  const [message, setMessage] = useState('');

  const alertTypes = [
    { value: 'heavy_rainfall', label: t('heavyRainfall') },
    { value: 'drought', label: t('drought') },
    { value: 'strong_winds', label: t('strongWinds') },
    { value: 'flood', label: t('flood') },
    { value: 'general', label: t('generalWeather') },
  ];

  const timeMeta = (hhmm: string) => {
    const hours = Number(normalizeTime(hhmm).split(':')[0]);
    if (hours >= 17) {
      return { title: t('eveningAlert'), subtitle: t('dailyWeatherUpdate'), tint: 'bg-[#E0E7FF] text-[#4338CA]' };
    }
    return { title: t('daytimeAlert'), subtitle: t('dailyWeatherUpdate'), tint: 'bg-[#E7F4F4] text-[#147677]' };
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/api/users/locations/all', { params: { limit: 100 } });
      const data = response.data;
      const list = data?.locations || data?.data?.locations || (Array.isArray(data) ? data : []);
      setLocations(list);
    } catch {
      setLocations([]);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await api.get('/api/weather/scheduler/status');
      const payload = response.data;
      const data =
        payload?.data && typeof payload.data === 'object' && (payload.data.isRunning !== undefined || payload.data.scheduleTimes)
          ? payload.data
          : payload;

      if (data && typeof data === 'object') {
        setSchedulerStatus(data);
        const times = Array.isArray(data.scheduleTimes) && data.scheduleTimes.length
          ? data.scheduleTimes.map(normalizeTime).filter(isEveningTime)
          : DEFAULT_TIMES;
        setScheduleTimes(times.length ? times : DEFAULT_TIMES);
      }
    } catch (error: any) {
      if (error.response?.status !== 501) {
        toast.error(error.response?.data?.message || t('failedToLoadScheduler'));
      }
      setSchedulerStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
    fetchLocations();
    const interval = setInterval(fetchSchedulerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const nextBroadcast = useMemo(() => {
    const sorted = [...scheduleTimes].map(normalizeTime).sort((a, b) => toMinutes(a) - toMinutes(b));
    if (!sorted.length) return { time: '19:00', when: t('today') };
    const now = kigaliMinutesNow(schedulerStatus?.currentKigaliTime);
    const upcoming = sorted.find((time) => toMinutes(time) > now);
    if (upcoming) return { time: upcoming, when: t('today') };
    return { time: sorted[0], when: t('tomorrow') };
  }, [scheduleTimes, schedulerStatus?.currentKigaliTime, t]);

  const persistTimes = async (times: string[]) => {
    const eveningTimes = times.filter(isEveningTime);
    setScheduleTimes(eveningTimes);
    try {
      await api.post('/api/weather/scheduler/schedule', { scheduleTimes: eveningTimes });
    } catch {
      // Backend may not expose a schedule updater; keep the times in the UI.
    }
  };

  const handleSchedulerAction = async (action: 'start' | 'stop' | 'restart') => {
    setIsActionLoading(action);
    try {
      const response = await api.post(`/api/weather/scheduler/${action}`);
      const payload = response.data;
      if (payload?.status === 'error') {
        toast.error(payload.message || t('schedulerActionFailed'));
      } else {
        toast.success(payload?.message || t('schedulerActionCompleted'));
      }
      if (payload?.data?.schedulerStatus) {
        setSchedulerStatus(payload.data.schedulerStatus);
      }
      setTimeout(() => fetchSchedulerStatus(), 800);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error(t('adminAccessRequired'));
      } else {
        toast.error(error.response?.data?.message || t('schedulerActionFailed'));
      }
      setTimeout(() => fetchSchedulerStatus(), 800);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleSendAlert = async () => {
    if (!locationId) {
      toast.error(t('pleaseSelectLocation'));
      return;
    }
    if (!message.trim()) {
      toast.error(t('pleaseEnterMessage'));
      return;
    }

    setIsActionLoading('trigger');
    try {
      const requestData = {
        message: message.trim(),
        locationId: Number(locationId),
        locationIds: [Number(locationId)],
        type: alertType,
      };

      const endpoints = [
        '/api/weather/messaging/custom',
        '/api/weather/messaging/emergency',
        '/api/messaging/custom',
      ];

      let response = null;
      for (const endpoint of endpoints) {
        try {
          response = await api.post(endpoint, requestData);
          break;
        } catch (error: any) {
          if (error.response?.status === 404) continue;
          throw error;
        }
      }

      if (!response) {
        throw new Error(t('failedToSendMessage'));
      }

      toast.success(response.data?.message || t('alertSentSuccessfully'));
      setMessage('');
      setSendOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('failedToSendMessage'));
    } finally {
      setIsActionLoading(null);
    }
  };

  const openEdit = (index: number | null) => {
    setEditIndex(index);
    setEditValue(index === null ? '19:00' : scheduleTimes[index] || '19:00');
    setEditOpen(true);
  };

  const saveTime = async () => {
    const next = normalizeTime(editValue);
    if (!isEveningTime(next)) {
      toast.error(t('eveningTimesOnly'));
      return;
    }
    if (editIndex === null) {
      if (scheduleTimes.includes(next)) {
        toast.error(t('timeAlreadyScheduled'));
        return;
      }
      await persistTimes([...scheduleTimes, next].sort((a, b) => toMinutes(a) - toMinutes(b)));
    } else {
      const updated = scheduleTimes.map((time, index) => (index === editIndex ? next : time));
      await persistTimes(updated.sort((a, b) => toMinutes(a) - toMinutes(b)));
    }
    setEditOpen(false);
  };

  const removeTime = async (index: number) => {
    if (scheduleTimes.length <= 1) {
      toast.error(t('keepOneBroadcastTime'));
      return;
    }
    await persistTimes(scheduleTimes.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#147677]" />
      </div>
    );
  }

  const isRunning = Boolean(schedulerStatus?.isRunning);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-400">
                {t('automaticBroadcastSchedule')}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('chooseWhenAlertsSent')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn(
                'border-0 uppercase',
                isRunning
                  ? 'bg-[#ECFDF6] text-[#16a34a] hover:bg-[#16a34a] hover:text-white'
                  : 'bg-[#FEF2F2] text-[#DC2626]'
              )}>
                {isRunning ? t('active') : t('paused')}
              </Badge>
              <Button
                className="h-9 rounded-lg bg-[#147677] hover:bg-[#147677]/90 text-white"
                onClick={() => setSendOpen(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                {t('sendAlert')}
              </Button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {scheduleTimes.map((time, index) => {
              const meta = timeMeta(time);
              return (
                <div
                  key={`${time}-${index}`}
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 px-4 py-4"
                >
                  <div className={cn('h-11 w-11 rounded-full flex items-center justify-center shrink-0', meta.tint)}>
                    {Number(normalizeTime(time).split(':')[0]) >= 17 ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{meta.title}</p>
                    <p className="text-sm text-slate-400">{meta.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatDisplayTime(time)}</p>
                    <button
                      type="button"
                      onClick={() => openEdit(index)}
                      className="text-sm font-medium text-[#147677] hover:underline"
                    >
                      {t('edit')}
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => openEdit(null)}
              className="w-full rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-sm font-medium text-slate-500 hover:border-[#147677]/40 hover:text-[#147677]"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('addAnotherBroadcastTime')}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
            {t('nextBroadcast')}
          </p>
          <p className="text-4xl font-bold text-slate-900 mt-2">
            {formatDisplayTime(nextBroadcast.time)}
          </p>
          <p className="text-sm text-slate-400 mt-1 pb-5 border-b border-gray-100">
            {nextBroadcast.when} · {t('kigaliTime')}
          </p>

          <p className="text-sm font-semibold text-slate-900 mt-5 mb-3">
            {t('schedulerControls')}
          </p>
          <div className="space-y-3">
            {isRunning ? (
              <Button
                variant="outline"
                className="w-full h-12 justify-start rounded-xl border-gray-200 text-slate-800"
                onClick={() => handleSchedulerAction('stop')}
                disabled={isActionLoading !== null}
              >
                {isActionLoading === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                {t('pauseScheduler')}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full h-12 justify-start rounded-xl border-gray-200 text-slate-800"
                onClick={() => handleSchedulerAction('start')}
                disabled={isActionLoading !== null}
              >
                {isActionLoading === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t('resumeScheduler')}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-12 justify-start rounded-xl border-gray-200 text-slate-800"
              onClick={() => handleSchedulerAction('restart')}
              disabled={isActionLoading !== null}
            >
              {isActionLoading === 'restart' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t('restartScheduler')}
            </Button>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            {isRunning ? t('automaticAlertsEnabled') : t('automaticAlertsPaused')}
          </p>
        </div>
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" style={{ color: '#147677' }} />
              {t('sendWeatherAlertNow')}
            </DialogTitle>
            <DialogDescription>
              {t('sendAlertNowHint')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-500 font-medium">{t('alertType')}</Label>
              <Select value={alertType} onValueChange={setAlertType}>
                <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alertTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-500 font-medium">{t('location')}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                  <SelectValue placeholder={t('selectLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-500 font-medium">{t('message')}</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={t('writeWeatherAlertMessage')}
                className="mt-1.5 w-full rounded-xl border border-input bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#147677]/30 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              {t('close')}
            </Button>
            <Button
              onClick={handleSendAlert}
              disabled={isActionLoading === 'trigger'}
              className="bg-[#147677] hover:bg-[#147677]/90 text-white"
            >
              {isActionLoading === 'trigger' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('sendAlert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editIndex === null ? t('addAnotherBroadcastTime') : t('editBroadcastTime')}
            </DialogTitle>
            <DialogDescription>
              {t('kigaliTime')}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="time"
            min="12:00"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-12 rounded-xl"
          />
          {editIndex !== null && scheduleTimes.length > 1 && (
            <button
              type="button"
              onClick={() => {
                removeTime(editIndex);
                setEditOpen(false);
              }}
              className="text-sm text-[#DC2626] text-left"
            >
              {t('removeBroadcastTime')}
            </button>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('close')}
            </Button>
            <Button
              onClick={saveTime}
              className="bg-[#147677] hover:bg-[#147677]/90 text-white"
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
