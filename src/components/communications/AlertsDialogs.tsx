import React from 'react';
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
import { 
  AlertCircle, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Edit, 
  Send,
  Copy,
  Archive,
  Trash
} from 'lucide-react';
import { useLanguage } from '@/i18n';

// Alert Interface and Dialog
interface Alert {
  id: number;
  type: string;
  message: string;
  messageLength: number;
  messageSegments: number;
  isSent: boolean;
  sentAt: string | null;
  location: string;
  createdAt: string;
}

interface ViewAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onEdit?: (alert: Alert) => void;
}

export function ViewAlertDialog({ open, onOpenChange, alert, onEdit }: ViewAlertDialogProps) {
  const { t } = useLanguage();

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t('alertDetails')}
          </DialogTitle>
          <DialogDescription>
            {t('viewAlertInformation')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold capitalize">{alert.type} Alert</h3>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                <span>{alert.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>{t('createdOn')} {new Date(alert.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant={alert.isSent ? "default" : "secondary"}>
              {alert.isSent ? t('sent') : t('notSent')}
            </Badge>
          </div>

          <Separator />

          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              {t('alertMessage')}
            </h3>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm leading-relaxed">{alert.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold mb-2">{t('messageDetails')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('messageLength')}:</span>
                  <span>{alert.messageLength} characters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('segments')}:</span>
                  <span>{alert.messageSegments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('alertId')}:</span>
                  <span>#{alert.id}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">{t('deliveryInfo')}</h4>
              <div className="space-y-2 text-sm">
                {alert.isSent && alert.sentAt ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('sentAt')}:</span>
                    <span>{new Date(alert.sentAt).toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('status')}:</span>
                    <span>{t('pending')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('location')}:</span>
                  <span>{alert.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!alert.isSent && (
            <Button variant="primary_outline">
              <Send className="h-4 w-4 mr-2" />
              {t('sendNow')}
            </Button>
          )}
          <Button  variant="primary">
              <Edit className="h-4 w-4 mr-2" />
              {t('editAlert')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}