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
  MessageSquare, 
  MapPin, 
  Calendar,
  Users, 
  Edit, 
  Send} from 'lucide-react';
import { useLanguage } from '@/i18n';


// Message Interface and Dialog
interface Message {
  id: string;
  content: string;
  recipients: string[];
  recipientCount: number;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'draft';
}

interface ViewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  onEdit?: (message: Message) => void;
}

export function ViewMessageDialog({ open, onOpenChange, message, onEdit }: ViewMessageDialogProps) {
  const { t } = useLanguage();

  if (!message) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('messageDetails')}
          </DialogTitle>
          <DialogDescription>
            {t('viewMessageInformation')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{t('customMessage')}</h3>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Users className="h-4 w-4" />
                <span>{message.recipientCount} {t('recipients')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {message.status === 'scheduled' 
                    ? `${t('scheduledFor')} ${new Date(message.sentAt).toLocaleDateString()}`
                    : `${t('sentOn')} ${new Date(message.sentAt).toLocaleDateString()}`
                  }
                </span>
              </div>
            </div>
            <Badge variant={getStatusVariant(message.status)}>
              {message.status === 'sent' ? t('sent') : 
               message.status === 'scheduled' ? t('scheduled') : 
               t('draft')}
            </Badge>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('messageContent')}
            </h4>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('targetLocations')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {message.recipients.map((recipient) => (
                  <Badge key={recipient} variant="outline">
                    {recipient}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {message.recipientCount} {t('farmersTotal')}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3">{t('messageInfo')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('messageId')}:</span>
                  <span>{message.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('length')}:</span>
                  <span>{message.content.length} characters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('segments')}:</span>
                  <span>{Math.ceil(message.content.length / 160)}</span>
                </div>
                {message.status === 'scheduled' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('scheduledTime')}:</span>
                    <span>{new Date(message.sentAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {message.status !== 'sent' && (
            <Button variant="primary_outline">
              <Send className="h-4 w-4 mr-2" />
              {t('sendNow')}
            </Button>
          )}
          <Button variant="primary">
            <Edit className="h-4 w-4 mr-2" />
            {t('editMessage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}