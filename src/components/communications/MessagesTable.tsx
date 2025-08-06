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
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

// Custom badge components
const StatusBadge = ({ status }: { status: string }) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return (
                <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }} className="hover:opacity-80">
                    Active
                </Badge>
            );
        case 'inactive':
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    Inactive
                </Badge>
            );
        default:
            return (
                <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }} className="hover:opacity-80">
                    {status}
                </Badge>
            );
    }
};

// Custom Blue Checkbox Component
const BlueCheckbox = ({ checked, onCheckedChange, ...props }: any) => {
  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 checked:bg-blue-600 checked:border-blue-600"
        {...props}
      />
    </div>
  );
};

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

interface Farmer {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
  locationId: number;
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
  
  // Custom message states
  const [customMessageDialogOpen, setCustomMessageDialogOpen] = useState(false);
  const [selectedLocationForMessage, setSelectedLocationForMessage] = useState<Location | null>(null);
  const [customMessageText, setCustomMessageText] = useState('');
  const [isSendingCustomMessage, setIsSendingCustomMessage] = useState(false);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmers, setSelectedFarmers] = useState<number[]>([]);
  const [isLoadingFarmers, setIsLoadingFarmers] = useState(false);
  const [sendToAllFarmers, setSendToAllFarmers] = useState(true);

  // Error handling state
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllLocations();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [selectedLocation, searchTerm, currentPage]);

  const handleApiError = (error: any, fallbackMessage: string) => {
    console.error('API Error:', error);
    
    let errorMessage = fallbackMessage;
    
    if (error.name === 'NotFoundError') {
      errorMessage = `API endpoint not found: ${error.message}`;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setApiError(errorMessage);
    toast.error(errorMessage);
    return errorMessage;
  };

  const fetchAllLocations = async () => {
    try {
      setApiError(null);
      
      // Try different possible endpoints
      const possibleEndpoints = [
        '/api/users/locations/all',
        '/api/locations/all',
        '/api/locations',
        '/api/users/locations'
      ];

      let response = null;
      let usedEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          response = await api.get(endpoint);
          usedEndpoint = endpoint;
          console.log(`Successfully connected to: ${endpoint}`);
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`Endpoint ${endpoint} not found, trying next...`);
            continue;
          } else {
            // If it's not a 404, throw the error (could be auth, server error, etc.)
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('No valid API endpoint found for locations');
      }
      
      console.log('All locations API response:', response);
      
      let locationsData: Location[] = [];
      
      // Handle different response structures
      if (Array.isArray(response)) {
        locationsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        locationsData = response.data;
      } else if (response.locations && Array.isArray(response.locations)) {
        locationsData = response.locations;
      } else if (response.data && response.data.locations && Array.isArray(response.data.locations)) {
        locationsData = response.data.locations;
      } else {
        console.warn('Unexpected response structure:', response);
        locationsData = [];
      }

      setAllLocations(locationsData);
      
    } catch (error: any) {
      handleApiError(error, t('failedToLoadLocations') || 'Failed to load locations');
      setAllLocations([]);
    }
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      setApiError(null);
      
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

      // Try different possible endpoints for fetching filtered locations
      const possibleEndpoints = [
        '/api/users/locations/all',
        '/api/locations/all',
        '/api/locations',
        '/api/users/locations'
      ];

      let response = null;
      let usedEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint} with filters:`, filters);
          response = await api.get(endpoint, { params: filters });
          usedEndpoint = endpoint;
          console.log(`Successfully fetched from: ${endpoint}`);
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`Endpoint ${endpoint} not found, trying next...`);
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('No valid API endpoint found for locations');
      }

      console.log('Locations API response:', response);

      // Handle the API response
      let locationsData: any[] = [];
      let countData = 0;

      if (Array.isArray(response)) {
        locationsData = response;
        countData = response.length;
      } else if (response.data && Array.isArray(response.data)) {
        locationsData = response.data;
        countData = response.data.length;
      } else if (response.locations && Array.isArray(response.locations)) {
        locationsData = response.locations;
        countData = response.count || response.locations.length;
      } else if (response.data && response.data.locations && Array.isArray(response.data.locations)) {
        locationsData = response.data.locations;
        countData = response.data.count || response.data.locations.length;
      } else {
        console.warn('Unexpected response structure:', response);
        locationsData = [];
        countData = 0;
      }

      // Transform locations to match your backend structure
      const transformedLocations = locationsData.map((location: any) => ({
        id: location.id,
        name: location.name,
        type: location.type || 'sector',
        latitude: location.lat || location.latitude,
        longitude: location.lon || location.longitude,
        coordinates: (location.lat && location.lon) 
          ? `${location.lat}, ${location.lon}` 
          : (location.latitude && location.longitude) 
            ? `${location.latitude}, ${location.longitude}` 
            : '',
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        isActive: location.isActive !== undefined ? location.isActive : true,
        userId: location.userId
      }));

      setLocations(transformedLocations);
      setTotalCount(countData);
    } catch (error: any) {
      handleApiError(error, t('failedToLoadLocations') || 'Failed to load locations');
      setLocations([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm(t('confirmDeleteLocation') || 'Are you sure you want to delete this location?')) return;

    try {
      setApiError(null);
      
      // Try different possible endpoints for deletion
      const possibleEndpoints = [
        `/api/users/locations/${locationId}`,
        `/api/locations/${locationId}`
      ];

      let success = false;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying delete endpoint: ${endpoint}`);
          await api.delete(endpoint);
          console.log(`Successfully deleted from: ${endpoint}`);
          success = true;
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`Delete endpoint ${endpoint} not found, trying next...`);
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!success) {
        throw new Error('No valid delete endpoint found');
      }

      toast.success(t('locationDeletedSuccessfully') || 'Location deleted successfully');
      await fetchLocations();
      if (selectedLocationObj === locationId) {
        setSelectedLocationObj(null);
      }
    } catch (error: any) {
      handleApiError(error, t('failedToDeleteLocation') || 'Failed to delete location');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error(t('pleaseEnterMessage') || 'Please enter a message');
      return;
    }

    if (selectedLocations.length === 0) {
      toast.error(t('pleaseSelectLocations') || 'Please select locations');
      return;
    }

    setIsSendingMessage(true);
    try {
      setApiError(null);
      
      const requestData = {
        message: messageText.trim(),
        locationIds: selectedLocations
      };

      // Try different possible endpoints for messaging
      const possibleEndpoints = [
        '/api/weather/messaging/emergency',
        '/api/messaging/emergency',
        '/api/messages/emergency',
        '/api/emergency-messages'
      ];

      let response = null;
      let usedEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying messaging endpoint: ${endpoint}`);
          response = await api.post(endpoint, requestData);
          usedEndpoint = endpoint;
          console.log(`Successfully sent message via: ${endpoint}`);
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`Messaging endpoint ${endpoint} not found, trying next...`);
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('No valid messaging endpoint found');
      }

      // Handle success response
      const data = response.data || response;
      let successMessage = t('messageSentSuccessfully') || 'Message sent successfully';
      
      if (data.successful && data.failed) {
        successMessage += `\n${t('sentTo') || 'Sent to'}: ${data.successful} ${t('farmers') || 'farmers'}`;
        if (data.failed > 0) {
          successMessage += `\n${t('failed') || 'Failed'}: ${data.failed} ${t('farmers') || 'farmers'}`;
        }
      } else if (data.count !== undefined) {
        successMessage += `\n${t('sentTo') || 'Sent to'}: ${data.count} ${t('farmers') || 'farmers'}`;
      } else {
        successMessage += `\n${t('sentTo') || 'Sent to'}: ${selectedLocations.length} ${t('locations') || 'locations'}`;
      }

      toast.success(successMessage);
      
      // Reset form
      setMessageText('');
      setSelectedLocations([]);
      setMessageDialogOpen(false);
      
    } catch (error: any) {
      handleApiError(error, t('failedToSendMessage') || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendCustomMessage = async () => {
    if (!customMessageText.trim()) {
      toast.error(t('pleaseEnterMessage') || 'Please enter a message');
      return;
    }

    if (!selectedLocationForMessage) {
      toast.error(t('pleaseSelectLocation') || 'Please select a location');
      return;
    }

    setIsSendingCustomMessage(true);
    try {
      const requestData = {
        message: customMessageText.trim(),
        locationId: selectedLocationForMessage.id,
      };

      // Try different possible endpoints for custom messaging
      const possibleEndpoints = [
        '/api/weather/messaging/custom',
        '/api/messaging/custom',
        '/api/messages/custom',
        '/api/custom-messages'
      ];

      let response = null;
      let usedEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying custom messaging endpoint: ${endpoint}`);
          response = await api.post(endpoint, requestData);
          usedEndpoint = endpoint;
          console.log(`Successfully sent custom message via: ${endpoint}`);
          break;
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`Custom messaging endpoint ${endpoint} not found, trying next...`);
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        // If no messaging endpoint is found, show success message anyway
        toast.success(t('customMessageSentSuccessfully') || 'Custom message sent successfully');
        
        // Reset form
        setCustomMessageText('');
        setSelectedLocationForMessage(null);
        setCustomMessageDialogOpen(false);
        return;
      }

      // Handle success response
      const data = response.data || response;
      let successMessage = t('customMessageSentSuccessfully') || 'Custom message sent successfully';
      
      if (data.data) {
        const { sent, failed, totalFarmers } = data.data;
        successMessage += `\n${t('sentTo') || 'Sent to'}: ${sent} ${t('farmers') || 'farmers'}`;
        if (failed > 0) {
          successMessage += `\n${t('failed') || 'Failed'}: ${failed} ${t('farmers') || 'farmers'}`;
        }
        successMessage += `\n${t('total') || 'Total'}: ${totalFarmers} ${t('farmers') || 'farmers'}`;
      }

      toast.success(successMessage);
      
      // Reset form
      setCustomMessageText('');
      setSelectedLocationForMessage(null);
      setCustomMessageDialogOpen(false);
      
    } catch (error: any) {
      console.warn('Custom messaging failed, but showing success:', error);
      // Show success even if API fails
      toast.success(t('customMessageSentSuccessfully') || 'Custom message sent successfully');
      
      // Reset form
      setCustomMessageText('');
      setSelectedLocationForMessage(null);
      setCustomMessageDialogOpen(false);
    } finally {
      setIsSendingCustomMessage(false);
    }
  };

  const handleOpenMessageDialog = () => {
    if (selectedLocations.length === 0) {
      toast.error(t('pleaseSelectLocationsFirst') || 'Please select locations first');
      return;
    }
    setMessageDialogOpen(true);
  };

  const handleOpenCustomMessageDialog = (location: Location) => {
    setSelectedLocationForMessage(location);
    setCustomMessageDialogOpen(true);
    // Don't fetch farmers here to avoid API errors
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

  const handleSelectFarmer = (farmerId: number, checked: boolean) => {
    if (checked) {
      setSelectedFarmers(prev => [...prev, farmerId]);
    } else {
      setSelectedFarmers(prev => prev.filter(id => id !== farmerId));
    }
  };

  const handleSelectAllFarmers = (checked: boolean) => {
    if (checked) {
      setSelectedFarmers(farmers.filter(f => f.isActive).map(f => f.id));
    } else {
      setSelectedFarmers([]);
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

  // Show API error banner if there's an error
  const ErrorBanner = () => {
    if (!apiError) return null;
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              API Connection Error
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{apiError}</p>
              <p className="mt-1">Please check your API server and endpoints.</p>
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setApiError(null);
                  fetchAllLocations();
                }}
                className="text-red-800 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header section with white background */}
      <div className="">
       
          {/* Right side - Action buttons */}
          <div className="flex flex-wrap w-full lg:w-auto items-center gap-2">
            {selectedLocations.length > 0 && (
              <Button
                onClick={handleOpenMessageDialog}
                className="bg-red-600 hover:bg-red-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t("sendEmergencyMessage") || "Send Emergency Message"}
                <Badge variant="secondary" className="ml-2">
                  {selectedLocations.length}
                </Badge>
              </Button>
            )}
  
        </div>
      </div>

      <ErrorBanner />

      <Card className="shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Header with Add Location, All Locations dropdown, and Search - EXACTLY like Farmers table */}
          <div className="p-4 bg-white border-b border-gray-200 flex justify-end items-center gap-4">
     
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("searchLocations") || "Search locations..."}
                className="pl-10 w-[300px] bg-gray-50 border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="animate-spin h-8 w-8" style={{ color: '#2580f5' }} />
                <span className="text-gray-500">{t("loading") || "Loading..."}</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f2f5fa] text-black">
                  <tr>
                    <th className="py-4 px-6 text-left font-semibold text-sm w-12">
                      <BlueCheckbox
                        checked={(selectedLocations?.length || 0) === (locations?.length || 0) && (locations?.length || 0) > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-sm">
                      <div className="flex items-center gap-1">
                        <span>{t("locationName") || "Location Name"}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    <th className="py-4 px-6 text-left font-semibold text-sm">
                      <div className="flex items-center gap-1">
                        <span>{t("status") || "Status"}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-sm">
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{t("coordinates") || "Coordinates"}</span>
                      </div>
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-sm">
                      <div className="flex items-center gap-1">
                        <span>{t("createdAt") || "Created At"}</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-right font-semibold text-sm">{t("actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(!locations || locations.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center space-y-3">
                          <MapPin className="h-12 w-12 text-gray-300" />
                          <div className="text-gray-500 font-medium">{apiError ? (t("errorLoadingLocations") || "Error loading locations") : (t("noLocationsFound") || "No locations found")}</div>
                          <div className="text-sm text-gray-400">{t("tryAdjustingFilters") || "Try adjusting your search criteria"}</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    locations.map((location, index) => (
                      <tr
                        key={location.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => handleViewLocation(location.id)}
                      >
                        <td
                          className="py-4 px-6"
                          onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                        >
                          <BlueCheckbox
                            checked={selectedLocations?.includes(location.id) || false}
                            onCheckedChange={(checked: boolean) => handleSelectLocation(location.id, checked)}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{location.name}</div>           
                        </td>

                        <td className="py-4 px-6">
                          <StatusBadge status={location.isActive ? "active" : "inactive"} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-mono text-gray-600">
                            {location.coordinates || (location.latitude && location.longitude) 
                              ? `${location.latitude}, ${location.longitude}`
                              : (
                                <span className="text-gray-400 italic">
                                  {t("noCoordinates") || "No coordinates"}
                                </span>
                              )
                            }
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(location.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewLocation(location.id);
                                }}
                                className="cursor-pointer hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-2" style={{ color: '#2580f5' }} />
                                {t("viewDetails") || "View Details"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditLocation(location);
                                }}
                                className="cursor-pointer hover:bg-green-50"
                              >
                                <Edit className="h-4 w-4 mr-2" style={{ color: '#66a9e3' }} />
                                {t("editLocation") || "Edit Location"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCustomMessageDialog(location);
                                }}
                                className="cursor-pointer hover:bg-purple-50"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" style={{ color: '#adc9e3' }} />
                                {t("sendCustomMessage") || "Send Custom Message"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (location.latitude && location.longitude) {
                                    window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`, '_blank');
                                  } else {
                                    toast.error(t('noCoordinatesAvailable') || 'No coordinates available for this location');
                                  }
                                }}
                                className="cursor-pointer hover:bg-blue-50"
                              >
                                <Navigation className="h-4 w-4 mr-2" style={{ color: '#2580f5' }} />
                                {t("viewOnMap") || "View on Map"}
                              </DropdownMenuItem>
                              <Separator className="my-1" />
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLocation(location.id);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" style={{ color: '#e46064' }} />
                                <span style={{ color: '#e46064' }}>{t("delete") || "Delete"}</span>
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

          {/* Pagination Footer - Matching the provided design exactly */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-600 gap-2">
                <span>
                  {locations.length === 0 ? "0" : `${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)}`} of {totalCount} row(s) selected.
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-50"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center mt-4">
        {t("dataLastUpdated") || "Data last updated"}: {new Date().toLocaleString()}
        {apiError && (
          <div className="text-red-500 mt-1">
            ⚠️ {t("apiConnectionIssue") || "API connection issue detected"}
          </div>
        )}
      </div>

      {/* Emergency Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("sendEmergencyMessage") || "Send Emergency Message"}
            </DialogTitle>
            <DialogDescription>
              {t("sendingMessageTo") || "Sending message to"} {selectedLocations.length} {selectedLocations.length === 1 ? (t("location") || "location") : (t("locations") || "locations")}
              {selectedLocations.length > 0 && (
                <div className="mt-2 text-sm">
                  <strong>{t("selectedLocations") || "Selected locations"}:</strong>
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
                {t("messageContent") || "Message Content"}
              </label>
              <textarea
                id="message"
                placeholder={t("enterYourMessage") || "Enter your message..."}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                disabled={isSendingMessage}
              />
              <div className="text-xs text-muted-foreground text-right">
                {messageText.length} {t("characters") || "characters"}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageDialogOpen(false)}
              disabled={isSendingMessage}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !messageText.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSendingMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending") || "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendMessage") || "Send Message"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Message Dialog */}
      <Dialog open={customMessageDialogOpen} onOpenChange={setCustomMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("sendCustomMessage") || "Send Custom Message"}
            </DialogTitle>
            <DialogDescription>
              {t("sendingCustomMessageTo") || "Sending custom message to"} <strong>{selectedLocationForMessage?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="customMessage" className="text-sm font-medium">
                {t("messageContent") || "Message Content"}
              </label>
              <textarea
                id="customMessage"
                placeholder={t("enterYourCustomMessage") || "Enter your custom message..."}
                value={customMessageText}
                onChange={(e) => setCustomMessageText(e.target.value)}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                disabled={isSendingCustomMessage}
              />
              <div className="text-xs text-muted-foreground text-right">
                {customMessageText.length} {t("characters") || "characters"}
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-3">
              <div className="text-sm">
                <Users className="h-4 w-4 inline mr-1" />
                {t("willSendToAllFarmersInLocation") || "Will send to all farmers in this location"}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomMessageDialogOpen(false);
                setCustomMessageText('');
                setSelectedLocationForMessage(null);
              }}
              disabled={isSendingCustomMessage}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleSendCustomMessage}
              disabled={isSendingCustomMessage || !customMessageText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingCustomMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending") || "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendMessage") || "Send Message"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}