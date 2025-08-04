import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Zap,
  Activity,
  Clock,
  MapPin,
  Users,
  Calendar,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from '@/i18n';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SchedulerStatus {
  isRunning: boolean;
  isInitialized: boolean;
  autoStarted: boolean;
  currentKigaliTime: string;
  timezone: string;
  frequency: string;
  scheduleTimes: string[];
  uptime?: string;
  nextAlert?: string;
  features?: any;
  systemInfo?: {
    nodeVersion: string;
    platform: string;
    memoryUsage: any;
    environment: string;
  };
}

interface BroadcastResult {
  success: boolean;
  timestamp: string;
  completedAt?: string;
  duration?: string;
  triggerTime: string;
  summary?: {
    totalFarmers: number;
    totalLocations: number;
    locationsProcessed: number;
    totalFarmersSent: number;
    totalFarmersFailed: number;
    successRate: number;
    messageType: string;
    scheduledTime: string;
  };
  locations?: any[];
  message?: string;
  error?: string;
}

export function WeatherSchedulerTable() {
  const { t } = useLanguage();
  
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<BroadcastResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSchedulerStatus();
    
    // Auto-refresh every 30 seconds if enabled
    const interval = autoRefresh ? setInterval(fetchSchedulerStatus, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchSchedulerStatus = async () => {
    try {
      const response = await api.get('/api/weather/scheduler/status');
      
      console.log('Scheduler API Response:', response.data); // Debug log
      
      // Check if the response has the expected structure
      if (response.data && typeof response.data === 'object') {
        // Check if it's the nested structure (with status and data fields)
        if (response.data.status === 'success' && response.data.data) {
          setSchedulerStatus(response.data.data);
        } 
        // Check if it's the direct structure (data directly in response.data)
        else if (response.data.isRunning !== undefined || response.data.isInitialized !== undefined) {
          setSchedulerStatus(response.data);
        }
        // Fallback for other structures
        else if (response.data.data) {
          setSchedulerStatus(response.data.data);
        } else {
          throw new Error('Invalid response structure');
        }
      } else {
        throw new Error('No data received from API');
      }
    } catch (error: any) {
      console.error('Failed to fetch scheduler status:', error);
      
      // Handle 501 error (controller not implemented)
      if (error.response?.status === 501) {
        toast.error('Weather Scheduler Controller not implemented');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load scheduler status';
        toast.error(errorMessage);
      }
      
      setSchedulerStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulerAction = async (action: 'start' | 'stop' | 'restart' | 'trigger') => {
    setIsActionLoading(action);
    
    try {
      let endpoint = '';
      
      switch (action) {
        case 'start':
          endpoint = '/api/weather/scheduler/start';
          break;
        case 'stop':
          endpoint = '/api/weather/scheduler/stop';
          break;
        case 'restart':
          endpoint = '/api/weather/scheduler/restart';
          break;
        case 'trigger':
          endpoint = '/api/weather/scheduler/trigger';
          break;
      }

      const response = await api.post(endpoint);
      
      console.log(`${action} Response:`, response.data); // Debug log
      
      // Check if response is successful (200-299 status codes are already handled by axios)
      if (response.data) {
        // Handle success, warning, or any other response status
        if (response.data.status === 'success' || response.data.status === 'warning') {
          // Show the actual API message
          toast.success(response.data.message || `${action} completed successfully`);
        } else if (response.data.status === 'error') {
          // Handle API-level errors gracefully
          toast.error(response.data.message || `${action} failed`);
        } else {
          // Handle responses without status field
          toast.success(response.data.message || `${action} completed successfully`);
        }
        
        // Update scheduler status if included in response
        if (response.data.data?.schedulerStatus) {
          setSchedulerStatus(response.data.data.schedulerStatus);
        }
        
        // Store broadcast result for trigger action
        if (action === 'trigger' && response.data.data?.broadcastResult) {
          setLastBroadcast(response.data.data.broadcastResult);
        }
        
        // Always refresh status after action (even if there was an API-level error)
        setTimeout(() => fetchSchedulerStatus(), 1000); // Small delay to allow backend to update
      } else {
        // Handle empty response
        toast.warning(`${action} request completed but no response data received`);
        setTimeout(() => fetchSchedulerStatus(), 1000);
      }
    } catch (error: any) {
      console.error(`Failed to ${action} scheduler:`, error);
      
      // Handle different HTTP status codes
      if (error.response?.status === 501) {
        toast.error(`Weather Scheduler Controller not implemented`);
      } else if (error.response?.status === 403) {
        toast.error('Admin access required for this action');
      } else if (error.response?.status === 404) {
        toast.error(`${action} endpoint not found`);
      } else if (error.response?.status >= 500) {
        toast.error(`Server error: Unable to ${action} scheduler`);
      } else if (error.response?.data?.message) {
        // Show API error message if available
        toast.error(error.response.data.message);
      } else if (error.message) {
        // Show generic error message
        toast.error(`Network error: ${error.message}`);
      } else {
        // Fallback error message
        toast.error(`Unable to ${action} scheduler. Please try again.`);
      }
      
      // Refresh status even after errors to get current state
      setTimeout(() => fetchSchedulerStatus(), 1000);
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleString();
    } catch {
      return timeString;
    }
  };

  const getStatusBadge = (isRunning: boolean, isInitialized: boolean) => {
    if (!isInitialized) {
      return (
        <Badge 
          variant="secondary" 
          className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-t shadow-sm"
        >
          Not Initialized
        </Badge>
      );
    }
    
    return isRunning ? (
      <Badge 
        variant="default" 
        className="bg-gradient-to-r from-green-900 to-emerald-950 text-white border-3  hover:shadow-xl transition-all duration-200"
      >
        <Activity className="h-3 w-3 mr-1" />
        Running
      </Badge>
    ) : (
      <Badge 
        variant="destructive"
        className="bg-gradient-to-r from-red-400 to-rose-500 text-white border-3"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Stopped
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading scheduler status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card className="bg-blue-50 border-t">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-900" >
                  <Activity className="h-5 w-5 text-white" />
                </div>
                Scheduler Status
              </CardTitle>
              {schedulerStatus && getStatusBadge(schedulerStatus.isRunning, schedulerStatus.isInitialized)}
            </div>
          </CardHeader>
          <CardContent>
            {!schedulerStatus ? (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Controller not available</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Current Time (Kigali)</p>
                    <p className="text-xs text-muted-foreground font-mono">{schedulerStatus.currentKigaliTime}</p>
                  </div>
                </div>
                <div className="flex items-center border-t ">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-xs text-muted-foreground">{schedulerStatus.timezone}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSchedulerStatus}
                    disabled={isActionLoading !== null}
                  >
                    <RefreshCw className={`h-3 w-3 ${isActionLoading === 'refresh' ? 'animate-spin' : ''}`} />
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Times Card */}
        <Card className="bg-orange-50 border-t ">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F89D2D]">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Daily Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Broadcast Times</span>
              </div>
              <div className="space-y-2">
                {schedulerStatus?.scheduleTimes?.map((time, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {time === '06:00' ? '6:00 AM' : time === '19:00' ? '7:00 PM' : time}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Daily</span>
                  </div>
                )) || (
                  <p className="text-xs text-muted-foreground">No schedule available</p>
                )}
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {schedulerStatus?.frequency || 'Schedule not configured'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Trigger Card */}
        <Card className="bg-[#E7E9EF] border-t ">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#2563EB]" >
                <Zap className="h-5 w-5 text-white" />
              </div>
              Manual Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Trigger Weather Alert</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Send weather messages to all farmers immediately, outside of the scheduled times.
              </p>
              <Button
                onClick={() => handleSchedulerAction('trigger')}
                disabled={isActionLoading !== null}
                variant="secondary"
                className="w-full flex items-center gap-2 bg-[#2563EB] hover:bg-[#2825AE] text-white hover:text-white-50"
                size="sm"
              >
                {isActionLoading === 'trigger' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                Trigger Now
              </Button>
              <div className="text-xs text-muted-foreground">
                Admin access required
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduler Controls</CardTitle>
          <CardDescription>
            Admin-only controls for managing the weather scheduler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => handleSchedulerAction('start')}
              disabled={isActionLoading !== null || (schedulerStatus?.isRunning ?? false)}
              className="flex items-center gap-2"
              variant={schedulerStatus?.isRunning ? "secondary" : "default"}
            >
              {isActionLoading === 'start' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Scheduler
            </Button>
            
            <Button
              onClick={() => handleSchedulerAction('stop')}
              disabled={isActionLoading !== null || !(schedulerStatus?.isRunning ?? false)}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {isActionLoading === 'stop' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Stop Scheduler
            </Button>
            
            <Button
              onClick={() => handleSchedulerAction('restart')}
              disabled={isActionLoading !== null}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isActionLoading === 'restart' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restart Scheduler
            </Button>
          </div>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Access Required:</strong> 
              The scheduler automatically sends weather updates at 6:00 AM and 7:00 PM Kigali time daily.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Last Broadcast Results */}
      {lastBroadcast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Last Broadcast Results
            </CardTitle>
            <CardDescription>
              Results from the most recent manual broadcast trigger
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastBroadcast.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Broadcast Completed Successfully</span>
                </div>
                
                {lastBroadcast.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Total Farmers</div>
                      <div className="text-lg">{lastBroadcast.summary.totalFarmers}</div>
                    </div>
                    <div>
                      <div className="font-medium">Messages Sent</div>
                      <div className="text-lg text-green-600">{lastBroadcast.summary.totalFarmersSent}</div>
                    </div>
                    <div>
                      <div className="font-medium">Failed</div>
                      <div className="text-lg text-red-600">{lastBroadcast.summary.totalFarmersFailed}</div>
                    </div>
                    <div>
                      <div className="font-medium">Success Rate</div>
                      <div className="text-lg">{lastBroadcast.summary.successRate}%</div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  <div>Started: {formatTime(lastBroadcast.timestamp)}</div>
                  {lastBroadcast.completedAt && (
                    <div>Completed: {formatTime(lastBroadcast.completedAt)}</div>
                  )}
                  {lastBroadcast.duration && (
                    <div>Duration: {lastBroadcast.duration}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span>Broadcast Failed: {lastBroadcast.message || lastBroadcast.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}