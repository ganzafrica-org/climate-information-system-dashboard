import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Clock,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  MessageSquare,
  Trash,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLanguage } from '@/i18n';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ViewAlertDialog } from './AlertsDialogs';

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

const alertsData: Alert[] = [
  {
    id: 6,
    type: 'daily',
    message:
      'Weather Gashora Sector: broken clouds 12-24C. Wind light breeze 9km/h south. Rain 1%',
    messageLength: 85,
    messageSegments: 1,
    isSent: false,
    sentAt: null,
    location: 'Gashora Sector',
    createdAt: '2025-06-16T09:58:05.266Z',
  },
  {
    id: 7,
    type: 'daily',
    message:
      'Weather Rugarama Sector: light rain 14-22C. Wind moderate breeze 11km/h west. Rain 70%',
    messageLength: 88,
    messageSegments: 1,
    isSent: true,
    sentAt: '2025-06-16T10:10:00.000Z',
    location: 'Rugarama Sector',
    createdAt: '2025-06-16T09:58:05.266Z',
  },
];

interface AlertsTableProps {
  selectedSector: string;
  searchTerm: string;
}

export function AlertsTable({ selectedSector, searchTerm }: AlertsTableProps) {
    const { t } = useLanguage();
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    
    const filteredAlerts = alertsData.filter((alert) => {
        const matchesSector =
        selectedSector === 'all' ||
        alert.location.toLowerCase().includes(selectedSector.toLowerCase());
        const matchesSearch =
        searchTerm === '' ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSector && matchesSearch;
    });

    const totalCount = filteredAlerts.length;
    const totalPages = Math.ceil(totalCount / limit);

    const handleViewDetails = (alert: Alert) => {
        setSelectedAlert(alert);
        setIsViewDialogOpen(true);
    };

    const handleEditAlert = (alert: Alert) => {
        // Handle edit functionality here
        console.log('Edit alert:', alert);
        setIsViewDialogOpen(false);
    };
  
  
  return (
    <>
      <Card>
          <CardHeader className="p-4">
              <CardTitle>{t("Alerts")}</CardTitle>
              <CardDescription>
                  {filteredAlerts.length} {t("alertsFound")}
              </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                        <tr className="border-b bg-muted">
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{t("Type")}</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{t("message")}</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{t("location")}</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{t("status")}</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredAlerts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                {t("noAlertsFound")}
                              </td>
                            </tr>
                        ) : (
                            filteredAlerts.map((alert) => (
                                <tr
                                    key={alert.id}
                                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                                  //   onClick={() => (handleViewFarmer(farmer.id))}
                                >
                                  <td className="py-3 px-4">
                                    <div className="font-medium">{alert.type}</div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="text-sm line-clamp-2">
                                      {alert.message}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-xs">
                                            {alert.location}
                                          </Badge>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                      <Badge variant={alert.isSent ? "default" : "secondary"}>
                                          {alert.isSent ? t("sent") : t("notSent")}
                                      </Badge>
                                  </td>

                                  <td className="py-3 px-4 text-right">
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleViewDetails(alert)}>
                                              <AlertCircle className="h-4 w-4 mr-2" />
                                              {t("viewDetails")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem>
                                              <Edit className="h-4 w-4 mr-2" />
                                              {t("editAlert")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem>
                                              <MessageSquare className="h-4 w-4 mr-2" />
                                              {t("sendMessage")}
                                          </DropdownMenuItem>
                                          <Separator className="my-1" />
                                          <DropdownMenuItem className="text-red-600">
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
        

        {filteredAlerts.length > 0 && (
          <CardFooter className="p-4 flex justify-between">
              <div className="text-sm text-muted-foreground">
              {t("showing")} {Math.min((currentPage - 1) * limit + 1, totalCount)} - {Math.min(currentPage * limit, totalCount)} {t("of")} {totalCount} {t("alerts")}
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

      <ViewAlertDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        alert={selectedAlert}
        onEdit={handleEditAlert}
      />
    </>
  );
}