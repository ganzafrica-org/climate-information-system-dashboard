import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Edit,
  Trash,
  Loader2,
  RefreshCw,
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Navigation,
  ChevronDown,
  Send,
  MessageSquare,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLanguage } from '@/i18n';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from '@/lib/api';
import { toast } from 'sonner';

interface Location {
  id: number;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
  userId?: number;
}

interface LocationsResponse {
  locations: Location[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

interface LocationFilters {
  limit: number;
  offset: number;
  locationId?: number;
  search?: string;
}

interface MessagesTableProps {
  selectedSector: string;
  searchTerm: string;
}

export function MessagesTable({ selectedSector, searchTerm: initialSearchTerm }: MessagesTableProps) {
  const { t } = useLanguage();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [selectedLocationObj, setSelectedLocationObj] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);
  
  // Message sending states
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    fetchAllLocations();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [selectedLocation, searchTerm, currentPage]);

  const fetchAllLocations = async () => {
    try {
      const response = await api.get('/api/users/locations/all');
      
      console.log('All locations API response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setAllLocations(response.data);
      } else if (response.data && response.data.locations && Array.isArray(response.data.locations)) {
        setAllLocations(response.data.locations);
      } else {
        console.warn('No valid locations data received');
        setAllLocations([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch all locations:', error);
      toast.error(t('failedToLoadLocations'));
      setAllLocations([]);
    }
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        limit,
        offset: (currentPage - 1) * limit,
      };

      if (selectedLocation !== "all") {
        const location = allLocations?.find(l => l.name === selectedLocation);
        if (location) {
          filters.locationId = location.id;
        }
      }

      if (searchTerm?.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await api.get('/api/users/locations/all', { params: filters });

      console.log('Locations API response:', response.data);

      // Handle the API response directly from your backend
      let locationsData: any[] = [];
      let countData = 0;

      if (Array.isArray(response.data)) {
        locationsData = response.data;
        countData = response.data.length;
      } else if (response.data && response.data.locations && Array.isArray(response.data.locations)) {
        locationsData = response.data.locations;
        countData = response.data.count || response.data.locations.length;
      } else {
        console.warn('No valid locations data received');
        locationsData = [];
        countData = 0;
      }

      // Transform locations to match your backend structure (lat/lon)
      const transformedLocations = locationsData.map((location: any) => ({
        id: location.id,
        name: location.name,
        type: location.type || 'sector',
        latitude: location.lat,
        longitude: location.lon,
        coordinates: location.lat && location.lon ? `${location.lat}, ${location.lon}` : '',
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        isActive: location.isActive !== undefined ? location.isActive : true,
        userId: location.userId
      }));

      setLocations(transformedLocations);
      setTotalCount(countData);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      toast.error(t('failedToLoadLocations'));
      setLocations([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm(t('confirmDeleteLocation'))) return;

    try {
      await api.delete(`/api/users/locations/${locationId}`);
      toast.success(t('locationDeletedSuccessfully'));
      await fetchLocations();
      if (selectedLocationObj === locationId) {
        setSelectedLocationObj(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('failedToDeleteLocation');
      toast.error(message);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error(t('pleaseEnterMessage'));
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error(t('pleaseSelectLocations'));
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await api.post('http://localhost:3000/api/weather/messaging/emergency', {
        message: messageText.trim(),
        locationIds: selectedLocations
      });

      // Handle success response
      const data = response.data;
      let successMessage = t('messageSentSuccessfully');
      
      if (data.successful && data.failed) {
        successMessage += `\n${t('sentTo')}: ${data.successful} ${t('farmers')}`;
        if (data.failed > 0) {
          successMessage += `\n${t('failed')}: ${data.failed} ${t('farmers')}`;
        }
      } else if (data.count !== undefined) {
        successMessage += `\n${t('sentTo')}: ${data.count} ${t('farmers')}`;
      } else {
        successMessage += `\n${t('sentTo')}: ${selectedLocations.length} ${t('locations')}`;
      }

      toast.success(successMessage);
      
      // Reset form
      setMessageText('');
      setSelectedLocations([]);
      setMessageDialogOpen(false);
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.message || t('failedToSendMessage');
      toast.error(errorMessage);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleOpenMessageDialog = () => {
    if (selectedLocations.length === 0) {
      toast.error(t('pleaseSelectLocationsFirst'));
      return;
    }
    setMessageDialogOpen(true);
  };

  const handleViewLocation = (locationId: number) => {
    setSelectedLocationObj(locationId);
    setViewDialogOpen(true);
  };
  
  const handleEditLocation = (location: Location) => {
    setLocationToEdit(location);
    setViewDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchLocations();
    setSelectedLocationObj(null);
  };

  const handleSelectLocation = (locationId: number, checked: boolean) => {
    if (checked) {
      setSelectedLocations(prev => [...prev, locationId]);
    } else {
      setSelectedLocations(prev => prev.filter(id => id !== locationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && locations?.length) {
      setSelectedLocations(locations.map(location => location.id));
    } else {
      setSelectedLocations([]);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'district': return 'default';
      case 'sector': return 'secondary';
      case 'cell': return 'outline';
      case 'village': return 'outline';
      default: return 'outline';
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-ganz-primary" />
          <h2 className="text-lg font-medium">{t("locationsManagement")}</h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 h-9">
                <span>{selectedLocation === "all" ? t("allLocations") : selectedLocation}</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedLocation("all")}>{t("allLocations")}</DropdownMenuItem>
              <Separator className="my-1" />
              {allLocations?.map((location) => (
                <DropdownMenuItem key={location.id} onClick={() => setSelectedLocation(location.name)}>
                  {location.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchLocations")}
              className="pl-8 w-full sm:w-[200px] h-9"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedLocations?.length > 0 && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenMessageDialog}
                  className="bg-[#0c5c2c] hover:bg-green-900"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t("sendMessage")} ({selectedLocations?.length || 0})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Bulk actions coming soon')}
                >
                  {t("bulkActions")} ({selectedLocations?.length || 0})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4">
          <CardTitle>{t("registeredLocations")}</CardTitle>
          <CardDescription>
            {totalCount} {t("locationsFound")}
            {selectedLocations?.length > 0 && (
              <span className="ml-2">
                ({selectedLocations.length} {t("selected")})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground w-12">
                      <Checkbox
                        checked={(selectedLocations?.length || 0) === (locations?.length || 0) && (locations?.length || 0) > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>{t("locationName")}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>{t("status")}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{t("coordinates")}</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>{t("createdAt")}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(!locations || locations.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        {t("noLocationsFound")}
                      </td>
                    </tr>
                  ) : (
                    locations.map((location) => (
                      <tr
                        key={location.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleViewLocation(location.id)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLocations?.includes(location.id) || false}
                            onCheckedChange={(checked) => handleSelectLocation(location.id, checked as boolean)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{location.name}</div>
                          {location.userId && (
                            <div className="text-xs text-muted-foreground">
                              User ID: {location.userId}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={location.isActive ? "default" : "secondary"}>
                            {location.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-mono">
                            {location.coordinates || (location.latitude && location.longitude) 
                              ? `${location.latitude}, ${location.longitude}`
                              : (
                                <span className="text-muted-foreground italic">
                                  {t("noCoordinates")}
                                </span>
                              )
                            }
                          </div>
                          {location.latitude && location.longitude && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Lat: {location.latitude}, Lng: {location.longitude}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {new Date(location.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewLocation(location.id);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t("viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditLocation(location);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t("editLocation")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                if (location.latitude && location.longitude) {
                                  window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`, '_blank');
                                } else {
                                  toast.error('No coordinates available for this location');
                                }
                              }}>
                                <Navigation className="h-4 w-4 mr-2" />
                                {t("viewOnMap")}
                              </DropdownMenuItem>
                              <Separator className="my-1" />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLocation(location.id);
                                }}
                              >
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
          )}
        </CardContent>

        {totalCount > 0 && (
          <CardFooter className="p-4 flex justify-between">
            <div className="text-sm text-muted-foreground">
              {t("showing")} {Math.min((currentPage - 1) * limit + 1, totalCount)} - {Math.min(currentPage * limit, totalCount)} {t("of")} {totalCount} {t("locations")}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                {t("next")}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <div className="text-xs text-muted-foreground text-center mt-4">
        {t("dataLastUpdated")}: {new Date().toLocaleString()}
      </div>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("sendEmergencyMessage")}
            </DialogTitle>
            <DialogDescription>
              {t("sendingMessageTo")} {selectedLocations.length} {selectedLocations.length === 1 ? t("location") : t("locations")}
              {selectedLocations.length > 0 && (
                <div className="mt-2 text-sm">
                  <strong>{t("selectedLocations")}:</strong>
                  <div className="mt-1 max-h-20 overflow-y-auto text-xs text-muted-foreground">
                    {selectedLocations.map(id => {
                      const location = locations.find(l => l.id === id);
                      return location ? location.name : `ID: ${id}`;
                    }).join(', ')}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                {t("messageContent")}
              </label>
              <textarea
                id="message"
                placeholder={t("enterYourMessage")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                disabled={isSendingMessage}
              />
              <div className="text-xs text-muted-foreground text-right">
                {messageText.length} {t("characters")}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageDialogOpen(false)}
              disabled={isSendingMessage}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !messageText.trim()}
              className="bg-[#0c5c2c] hover:bg-green-900"
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendMessage")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}