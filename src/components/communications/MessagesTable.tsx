import React, { useState } from 'react';
import { MessageSquare, Send, Clock, Users, Eye, MoreHorizontal, Archive, Trash, ArrowUpDown, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from '@/i18n';
import { ViewMessageDialog } from './MessagesDialogs';

interface Message {
  id: string;
  content: string;
  recipients: string[];
  recipientCount: number;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'draft';
}

const messagesData: Message[] = [
  {
    id: 'msg-001',
    content: 'Attention farmers in Kinigi. Heavy rainfall (>25mm) expected in the next 24 hours. Please protect seedlings, delay fertilizer application, and ensure proper field drainage.',
    recipients: ['Kinigi'],
    recipientCount: 32,
    sentAt: '2025-01-20T10:30:00',
    status: 'sent'
  },
  {
    id: 'msg-002',
    content: 'Attention maize farmers in Muhoza and Cyuve. Current warm and humid conditions increase risk of army worm. Monitor your crops and prepare control measures.',
    recipients: ['Muhoza', 'Cyuve'],
    recipientCount: 45,
    sentAt: '2025-01-19T14:20:00',
    status: 'sent'
  },
  {
    id: 'msg-003',
    content: 'Good news for Gataraga farmers! Optimal planting conditions for the next 48 hours. Soil moisture and temperatures are favorable for planting beans.',
    recipients: ['Gataraga'],
    recipientCount: 28,
    sentAt: '2025-01-18T09:15:00',
    status: 'sent'
  },
  {
    id: 'msg-004',
    content: 'Reminder for vegetable farmers in Cyuve and Rwaza. Schedule irrigation for your crops this week. No rainfall expected for the next 5 days.',
    recipients: ['Cyuve', 'Rwaza'],
    recipientCount: 23,
    sentAt: '2025-01-21T07:00:00',
    status: 'scheduled'
  },
  {
    id: 'msg-005',
    content: 'Advisory for Kinigi farmers: Good conditions for fertilizer application in the next 3 days for potatoes. Follow recommended amounts based on your soil test results.',
    recipients: ['Kinigi'],
    recipientCount: 18,
    sentAt: '2025-01-17T16:45:00',
    status: 'sent'
  }
];

interface MessagesTableProps {
  selectedSector: string;
  searchTerm: string;
}

export function MessagesTable({ selectedSector, searchTerm }: MessagesTableProps) {
  const { t } = useLanguage();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<Message | null>(null);

  const filteredMessages = messagesData.filter(message => {
    const matchesSector = selectedSector === 'all' || message.recipients.some(r => r.toLowerCase().includes(selectedSector.toLowerCase()));
    const matchesSearch = searchTerm === '' || 
      message.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSector && matchesSearch;
  });

  const totalCount = filteredMessages.length;
  const totalPages = Math.ceil(totalCount / limit);

  const handleViewDetails = (message: Message, event: React.MouseEvent) => {
    event.stopPropagation();
    setDialogMessage(message);
    setIsDialogOpen(true);
  };

  const handleEditMessage = (message: Message) => {
    // Handle edit message logic here
    console.log('Edit message:', message);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4">
          <CardTitle>{t("Message History")}</CardTitle>
          <CardDescription>
            {filteredMessages.length} {t("messagesFound")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{t("Message Content")}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{t("Recipients")}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{t("Status")}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{t("Date")}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t("noMessagesFound")}
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((message) => (
                    <tr
                      key={message.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMessage(message)}
                    >
                      <td className="py-3 px-4">
                        <div className="text-sm line-clamp-2">
                          {message.content}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {message.recipients.map((recipient) => (
                            <Badge key={recipient} variant="outline" className="text-xs">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {message.recipientCount} farmers
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          message.status === 'sent' ? "default" : 
                          message.status === 'scheduled' ? "secondary" : 
                          "outline"
                        }>
                          {message.status === 'sent' ? t("sent") : 
                           message.status === 'scheduled' ? t("scheduled") : 
                           t("draft")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {message.status === 'scheduled' ? (
                            <div>
                              <div className="text-xs text-muted-foreground">{t("Scheduled for")}:</div>
                              <div className="font-medium">{new Date(message.sentAt).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <div className="font-medium">{new Date(message.sentAt).toLocaleDateString()}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleViewDetails(message, e)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t("viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("editMessage")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              {t("resendMessage")}
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem>
                              <Archive className="h-4 w-4 mr-2" />
                              {t("archive")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-danger">
                              <Trash className="h-4 w-4 mr-2" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {filteredMessages.length > 0 && (
          <CardFooter className="p-4 flex justify-between">
            <div className="text-sm text-muted-foreground">
              {t("showing")} {Math.min((currentPage - 1) * limit + 1, totalCount)} - {Math.min(currentPage * limit, totalCount)} {t("of")} {totalCount} {t("messages")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                {t("previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                {t("next")}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ViewMessageDialog Component */}
      <ViewMessageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        message={dialogMessage}
        onEdit={handleEditMessage}
      />
    </div>
  );
}