import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Clock, 
  Edit, 
  Send,
  Copy,
  Trash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  Activity,
  Users,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/i18n';
import { toast } from 'sonner';
import api from '@/lib/api';

// Alert Interface
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

interface ViewAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onEdit?: (alert: Alert) => void;
  onSend?: (alert: Alert) => void;
  onDelete?: (alertId: number) => void;
}

export function ViewAlertDialog({ 
  open, 
  onOpenChange, 
  alert, 
  onEdit, 
  onSend, 
  onDelete 
}: ViewAlertDialogProps) {
  const { t } = useLanguage();

  if (!alert) return null;

  const handleCopyMessage = () => {
    const messageText = typeof alert.message === 'string' ? alert.message : 'No message content';
    navigator.clipboard.writeText(messageText);
    toast.success(t('messageCopied') || 'Message copied to clipboard');
  };

  const handleDeleteAlert = async () => {
    if (!onDelete) return;
    if (confirm(t('confirmDeleteAlert') || 'Are you sure you want to delete this alert?')) {
      await onDelete(alert.id);
      onOpenChange(false);
    }
  };

  const handleEditAlert = () => {
    if (onEdit) {
      onEdit(alert);
    }
  };

  const handleSendAlert = () => {
    if (onSend) {
      onSend(alert);
    }
  };

  const getPriorityIcon = (priority: string = 'medium') => {
    switch (priority.toLowerCase()) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <Info className="h-5 w-5 text-blue-500" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string = 'medium') => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'draft': return <FileText className="h-4 w-4 text-gray-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sent': return 'default';
      case 'scheduled': return 'secondary';
      case 'draft': return 'outline';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const currentStatus = alert.status || (alert.isSent ? 'sent' : 'draft');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPriorityIcon(alert.priority)}
            {t('alertDetails')} #{alert.id}
          </DialogTitle>
          <DialogDescription>
            {t('viewAlertInformation')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Header */}
          <div className="flex items-start gap-4">
            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
              {getPriorityIcon(alert.priority)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold capitalize">
                {typeof alert.type === 'string' ? alert.type : 'Alert'} Alert
              </h3>
              {alert.category && (
                <p className="text-sm text-muted-foreground capitalize">
                  {typeof alert.category === 'string' ? alert.category : 'General'}
                </p>
              )}
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                <span>
                  {typeof alert.location === 'object' && alert.location !== null 
                    ? alert.location.name 
                    : (alert.location || 'Unknown Location')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>{t('createdOn')} {new Date(alert.createdAt).toLocaleDateString()}</span>
                <Clock className="h-4 w-4 ml-2" />
                <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant={getPriorityColor(alert.priority)}>
                {alert.priority || 'medium'} priority
              </Badge>
              <Badge variant={getStatusColor(currentStatus)} className="flex items-center gap-1">
                {getStatusIcon(currentStatus)}
                {currentStatus}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Alert Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('alertMessage')}
              </h3>
              <Button variant="outline" size="sm" onClick={handleCopyMessage}>
                <Copy className="h-4 w-4 mr-2" />
                {t('copy')}
              </Button>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm leading-relaxed">
                {typeof alert.message === 'string' ? alert.message : 'No message content available'}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Message Details */}
            <div>
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('messageDetails')}
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">{t('messageLength')}:</span>
                  <span className="font-medium">{alert.messageLength} characters</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">{t('segments')}:</span>
                  <span className="font-medium">{alert.messageSegments}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">{t('alertId')}:</span>
                  <span className="font-medium">#{alert.id}</span>
                </div>
                {alert.targetAudience && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t('targetAudience')}:</span>
                    <span className="font-medium">{alert.targetAudience}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div>
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('deliveryInfo')}
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">{t('status')}:</span>
                  <Badge variant={getStatusColor(currentStatus)} className="flex items-center gap-1">
                    {getStatusIcon(currentStatus)}
                    {currentStatus}
                  </Badge>
                </div>
                {alert.sentAt ? (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t('sentAt')}:</span>
                    <span className="font-medium">{new Date(alert.sentAt).toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t('status')}:</span>
                    <span className="font-medium">{t('pending')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">{t('location')}:</span>
                  <span className="font-medium">
                    {typeof alert.location === 'object' && alert.location !== null 
                      ? alert.location.name 
                      : (alert.location || 'Unknown Location')}
                  </span>
                </div>
                {alert.recipientCount && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t('recipients')}:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {alert.recipientCount}
                    </span>
                  </div>
                )}
                {alert.deliveryMethod && (
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">{t('deliveryMethod')}:</span>
                    <span className="font-medium">{alert.deliveryMethod}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {alert.updatedAt && (
            <>
              <Separator />
              <div>
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('timeline')}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">
                      {t('created')}: {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {alert.updatedAt !== alert.createdAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        {t('updated')}: {new Date(alert.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {!alert.isSent && onSend && (
              <Button
                onClick={handleSendAlert}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('sendToFarmers')}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                onClick={handleEditAlert}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('editAlert')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={handleDeleteAlert}
                className="text-red-600 hover:text-red-700"
              >
                <Trash className="h-4 w-4 mr-2" />
                {t('delete')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Alert Dialog Interface
interface EditAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onSuccess: () => void;
}

export function EditAlertDialog({ 
  open, 
  onOpenChange, 
  alert, 
  onSuccess 
}: EditAlertDialogProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    message: '',
    priority: 'medium',
    category: '',
    targetAudience: '',
    deliveryMethod: ''
  });

  // Initialize form data when alert changes
  React.useEffect(() => {
    if (alert) {
      setFormData({
        type: alert.type || '',
        message: alert.message || '',
        priority: alert.priority || 'medium',
        category: alert.category || '',
        targetAudience: alert.targetAudience || '',
        deliveryMethod: alert.deliveryMethod || ''
      });
    }
  }, [alert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert) return;

    setIsLoading(true);
    try {
      const updateData = {
        type: formData.type,
        message: formData.message,
        priority: formData.priority,
        category: formData.category,
        targetAudience: formData.targetAudience,
        deliveryMethod: formData.deliveryMethod
      };

      console.log('Updating alert with data:', updateData);

      const response = await api.put(`/api/weather/alerts/${alert.id}/update`, updateData);

      console.log('Update response:', response);

      toast.success(t('alertUpdatedSuccessfully') || 'Alert updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update alert:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update alert';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t('editAlert')} #{alert.id}
          </DialogTitle>
          <DialogDescription>
            {t('editAlertInformation') || 'Update the alert information below'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert Type */}
          <div className="space-y-2">
            <Label htmlFor="type">{t('alertType') || 'Alert Type'}</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectAlertType') || 'Select alert type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weather">{t('weather') || 'Weather'}</SelectItem>
                <SelectItem value="alert">{t('alert') || 'Alert'}</SelectItem>
                <SelectItem value="advisory">{t('advisory') || 'Advisory'}</SelectItem>
                <SelectItem value="warning">{t('warning') || 'Warning'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">{t('priority') || 'Priority'}</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectPriority') || 'Select priority'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('low') || 'Low'}</SelectItem>
                <SelectItem value="medium">{t('medium') || 'Medium'}</SelectItem>
                <SelectItem value="high">{t('high') || 'High'}</SelectItem>
                <SelectItem value="critical">{t('critical') || 'Critical'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t('category') || 'Category'}</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectCategory') || 'Select category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_weather">{t('dailyWeather') || 'Daily Weather'}</SelectItem>
                <SelectItem value="severe_weather">{t('severeWeather') || 'Severe Weather'}</SelectItem>
                <SelectItem value="farming_advisory">{t('farmingAdvisory') || 'Farming Advisory'}</SelectItem>
                <SelectItem value="general">{t('general') || 'General'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t('message') || 'Message'}</Label>
            <textarea
              id="message"
              rows={4}
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder={t('enterAlertMessage') || 'Enter alert message...'}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {formData.message.length} characters
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">{t('targetAudience') || 'Target Audience'}</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              placeholder={t('enterTargetAudience') || 'e.g., All farmers, Specific sector...'}
            />
          </div>

          {/* Delivery Method */}
          <div className="space-y-2">
            <Label htmlFor="deliveryMethod">{t('deliveryMethod') || 'Delivery Method'}</Label>
            <Select value={formData.deliveryMethod} onValueChange={(value) => handleInputChange('deliveryMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectDeliveryMethod') || 'Select delivery method'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">{t('sms') || 'SMS'}</SelectItem>
                <SelectItem value="email">{t('email') || 'Email'}</SelectItem>
                <SelectItem value="push">{t('pushNotification') || 'Push Notification'}</SelectItem>
                <SelectItem value="all">{t('allMethods') || 'All Methods'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.message.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('updating') || 'Updating...'}
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('updateAlert') || 'Update Alert'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}