import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Edit,
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
  useEffect(() => {
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