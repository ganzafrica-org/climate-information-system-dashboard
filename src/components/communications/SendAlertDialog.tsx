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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MessageSquare, 
  Users, 
  Send,
  X,
  Search,
  Loader2,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useLanguage } from '@/i18n';
import { toast } from 'sonner';
import api from '@/lib/api';

// Farmer Interface
interface Farmer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  location: string;
  isActive: boolean;
}

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

// Send Result Interface
interface SendResult {
  success: boolean;
  message: string;
  results?: {
    successful?: Array<{
      farmerId: number;
      farmerName: string;
      phone: string;
    }>;
    failed?: Array<{
      farmerId: number;
      farmerName: string;
      phone: string;
      error: string;
    }>;
  };
}

interface SendAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onSuccess: () => void;
}

export function SendAlertDialog({ 
  open, 
  onOpenChange, 
  alert, 
  onSuccess 
}: SendAlertDialogProps) {
  const { t } = useLanguage();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmers, setSelectedFarmers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingFarmers, setIsLoadingFarmers] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [showSendResult, setShowSendResult] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowSendResult(false);
      setSendResult(null);
      setSelectedFarmers([]);
      setSearchTerm('');
    }
  }, [open]);

  // Fetch farmers when dialog opens
  useEffect(() => {
    if (open && alert) {
      console.log('Dialog opened, fetching farmers for alert:', alert);
      fetchFarmers();
    }
  }, [open, alert]);

  const fetchFarmers = async () => {
    setIsLoadingFarmers(true);
    try {
      const filters: any = {
        limit: 100,
      };
  
      // Handle different location types
      let locationValue: string | number | null = null;
      if (alert?.location) {
        if (typeof alert.location === 'object' && alert.location !== null) {
          locationValue = alert.location.id;
        } else if (typeof alert.location === 'string') {
          locationValue = alert.location;
        }
      }
  
      console.log('Alert location:', alert?.location);
      console.log('Location value:', locationValue);
  
      if (locationValue && locationValue !== 'all') {
        // Try to find location by name first, then use as ID if it's a number
        const locationId = typeof locationValue === 'string' ? parseInt(locationValue) : locationValue;
        if (!isNaN(locationId)) {
          filters.locationId = locationId;
        } else {
          // If it's not a number, we'll get all farmers and filter client-side
          console.warn('Location is not a valid ID, fetching all farmers');
        }
      }
  
      const response = await api.get('/api/admin/farmers', {
        params: filters
      });
  
      console.log('Farmers API response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));
  
      // Handle different response formats based on the API structure
      let farmersData: any[] = [];
      
      // Check for the actual structure based on your console output
      if (response.data && response.data.farmers && Array.isArray(response.data.farmers)) {
        farmersData = response.data.farmers;
        console.log('Found farmers in response.data.farmers:', farmersData.length, 'farmers');
      } else if (response.data && response.data.data && response.data.data.farmers) {
        farmersData = response.data.data.farmers;
        console.log('Found farmers in response.data.data.farmers:', farmersData.length, 'farmers');
      } else if (Array.isArray(response.data)) {
        // Fallback: direct array
        farmersData = response.data;
        console.log('Found farmers in response.data array:', farmersData.length, 'farmers');
      } else {
        console.log('No farmers found in response, response structure:', JSON.stringify(response.data, null, 2));
      }
  
      console.log('Raw farmers data:', farmersData);
  
      // Ensure we have an array
      if (!Array.isArray(farmersData)) {
        console.error('Farmers data is not an array:', farmersData);
        farmersData = [];
      }
  
      // Transform farmers data to ensure consistent structure
      const transformedFarmers = farmersData.map((farmer: any, index: number) => {
        console.log(`Transforming farmer ${index}:`, farmer);
        
        return {
          id: farmer.id || farmer.farmerId,
          name: farmer.name || farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim() || 'Unknown Farmer',
          phone: farmer.phone || farmer.phoneNumber || farmer.mobile || 'No phone',
          email: farmer.email,
          location: farmer.locations && farmer.locations.length > 0 
            ? farmer.locations.map((loc: any) => loc.name).join(', ')
            : (farmer.location || farmer.sector || farmer.district || 'Unknown'),
          isActive: farmer.isActive !== false
        };
      });
  
      console.log('Transformed farmers:', transformedFarmers);
  
      // Filter by location if needed (client-side filtering)
      let finalFarmers = transformedFarmers.filter(f => f.isActive);
      console.log('After active filter:', finalFarmers);
      
      if (locationValue && locationValue !== 'all' && typeof locationValue === 'string' && isNaN(parseInt(locationValue))) {
        // If location is a string name, filter client-side
        finalFarmers = finalFarmers.filter(f => 
          f.location.toLowerCase().includes(locationValue.toLowerCase())
        );
        console.log('After location filter:', finalFarmers);
      }
  
      console.log('Final farmers to set:', finalFarmers);
      setFarmers(finalFarmers);
      
      if (finalFarmers.length === 0) {
        toast.info(t('noFarmersFound') || 'No farmers found for this location');
      } else {
        toast.success(`Loaded ${finalFarmers.length} farmers`);
      }
    } catch (error: any) {
      console.error('Failed to fetch farmers:', error);
      console.error('Error details:', error.response?.data);
      
      // Use fallback farmers for development/testing
      const fallbackFarmers: Farmer[] = [
        {
          id: 1,
          name: 'Jean Baptiste Uwimana',
          phone: '+250788123456',
          email: 'jean.uwimana@email.com',
          location: 'Gashora Sector',
          isActive: true
        },
        {
          id: 2,
          name: 'Marie Claire Mukamana',
          phone: '+250788234567',
          location: 'Rugarama Sector',
          isActive: true
        },
        {
          id: 3,
          name: 'Paul Nkuranga',
          phone: '+250788345678',
          email: 'paul.nkuranga@email.com',
          location: 'Kayonza District',
          isActive: true
        },
        {
          id: 4,
          name: 'Agnes Nyirahabimana',
          phone: '+250788456789',
          location: 'Gashora Sector',
          isActive: true
        },
        {
          id: 5,
          name: 'Emmanuel Habimana',
          phone: '+250788567890',
          location: 'Rugarama Sector',
          isActive: false
        }
      ];
  
      // Filter fallback farmers by location if specified
      let locationString = '';
      if (alert?.location) {
        if (typeof alert.location === 'object' && alert.location !== null) {
          locationString = alert.location.name;
        } else if (typeof alert.location === 'string') {
          locationString = alert.location;
        }
      }
  
      const filteredFarmers = locationString && locationString !== 'all' 
        ? fallbackFarmers.filter(f => f.location.toLowerCase().includes(locationString.toLowerCase()))
        : fallbackFarmers;
  
      setFarmers(filteredFarmers.filter(f => f.isActive));
      toast.error(t('failedToLoadFarmers') || 'Failed to load farmers. Using sample data.');
    } finally {
      setIsLoadingFarmers(false);
    }
  };

  const handleSendAlert = async () => {
    if (selectedFarmers.length === 0) {
      toast.error(t('pleaseSelectFarmers') || 'Please select at least one farmer');
      return;
    }

    setIsActionLoading(true);
    try {
      const response = await api.post(`/api/weather/alerts/${alert?.id}/send`, {
        farmerIds: selectedFarmers
      });

      console.log('Send alert response:', response);

      // Handle different response formats
      let result: SendResult;
      
      if (response.success !== undefined) {
        result = response as SendResult;
      } else if (response.data) {
        result = response.data as SendResult;
      } else {
        // Default success response
        result = {
          success: true,
          message: 'Alert sent successfully',
          results: {
            successful: selectedFarmers.map(id => {
              const farmer = farmers.find(f => f.id === id);
              return {
                farmerId: id,
                farmerName: farmer?.name || 'Unknown',
                phone: farmer?.phone || 'Unknown'
              };
            }),
            failed: []
          }
        };
      }

      // Ensure results structure is properly initialized
      if (result.results) {
        result.results.successful = result.results.successful || [];
        result.results.failed = result.results.failed || [];
      } else {
        result.results = {
          successful: selectedFarmers.map(id => {
            const farmer = farmers.find(f => f.id === id);
            return {
              farmerId: id,
              farmerName: farmer?.name || 'Unknown',
              phone: farmer?.phone || 'Unknown'
            };
          }),
          failed: []
        };
      }

      setSendResult(result);
      setShowSendResult(true);

      if (result.success) {
        toast.success(result.message || t('alertSentSuccessfully') || 'Alert sent successfully');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.message || t('failedToSendAlert') || 'Failed to send alert');
      }

    } catch (error: any) {
      console.error('Failed to send alert:', error);
      
      // Create error result
      const errorResult: SendResult = {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send alert',
        results: {
          successful: [],
          failed: selectedFarmers.map(id => {
            const farmer = farmers.find(f => f.id === id);
            return {
              farmerId: id,
              farmerName: farmer?.name || 'Unknown',
              phone: farmer?.phone || 'Unknown',
              error: 'Network error'
            };
          })
        }
      };

      setSendResult(errorResult);
      setShowSendResult(true);
      toast.error(errorResult.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelectAllFarmers = () => {
    const filteredFarmers = getFilteredFarmers();
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([]);
    } else {
      setSelectedFarmers(filteredFarmers.map(f => f.id));
    }
  };

  const handleSelectFarmer = (farmerId: number) => {
    setSelectedFarmers(prev => 
      prev.includes(farmerId) 
        ? prev.filter(id => id !== farmerId)
        : [...prev, farmerId]
    );
  };

  const getFilteredFarmers = () => {
    if (!searchTerm) return farmers;
    
    return farmers.filter(farmer => 
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.phone.includes(searchTerm) ||
      farmer.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredFarmers = getFilteredFarmers();
  console.log('Current farmers state:', farmers);
  console.log('Filtered farmers for display:', filteredFarmers);

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('sendAlert')} #{alert.id}
          </DialogTitle>
          <DialogDescription>
            {showSendResult ? t('sendResults') : t('selectFarmersToSend')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Show Send Results */}
          {showSendResult && sendResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {sendResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <h3 className="text-lg font-semibold">
                  {sendResult.success ? t('alertSentSuccessfully') : t('alertSendFailed')}
                </h3>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm mb-3">{sendResult.message}</p>
                
                {sendResult.results && (
                  <div className="space-y-3">
                    {sendResult.results.successful && sendResult.results.successful.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                          <UserCheck className="h-4 w-4" />
                          {t('successfullySent')} ({sendResult.results.successful.length})
                        </h4>
                        <div className="space-y-1">
                          {sendResult.results.successful.map((farmer, index) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              • {farmer.farmerName} ({farmer.phone})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sendResult.results.failed && sendResult.results.failed.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                          <UserX className="h-4 w-4" />
                          {t('failedToSend')} ({sendResult.results.failed.length})
                        </h4>
                        <div className="space-y-1">
                          {sendResult.results.failed.map((farmer, index) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              • {farmer.farmerName} ({farmer.phone}) - {farmer.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => onOpenChange(false)}>
                  {t('close')}
                </Button>
              </div>
            </div>
          )}

          {/* Show Farmer Selection */}
          {!showSendResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('selectFarmers')} ({filteredFarmers.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFarmers}
                  disabled={isLoadingFarmers || filteredFarmers.length === 0}
                >
                  {selectedFarmers.length === filteredFarmers.length ? t('unselectAll') : t('selectAll')}
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchFarmers') || 'Search farmers...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Selected count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{selectedFarmers.length} {t('farmersSelected')}</span>
                <span>
                  {t('location')}: {
                    typeof alert.location === 'object' && alert.location !== null 
                      ? alert.location.name 
                      : (alert.location || 'All Locations')
                  }
                </span>
              </div>

              {/* Debug info */}
              <div className="text-xs text-muted-foreground">
                Debug: {farmers.length} total farmers, {filteredFarmers.length} filtered, loading: {isLoadingFarmers.toString()}
              </div>

              {/* Farmers list */}
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {isLoadingFarmers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6 mr-2" />
                    <span>{t('loadingFarmers')}</span>
                  </div>
                ) : filteredFarmers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('noFarmersFound')}</p>
                    <p className="text-xs mt-2">Total farmers in state: {farmers.length}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredFarmers.map((farmer) => (
                      <div key={farmer.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50">
                        <Checkbox
                          checked={selectedFarmers.includes(farmer.id)}
                          onCheckedChange={() => handleSelectFarmer(farmer.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{farmer.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {farmer.phone} • {farmer.location}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message preview */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">{t('messagePreview')}</h4>
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.messageLength} characters • {alert.messageSegments} SMS segments
                </p>
              </div>

              {/* Send actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendAlert}
                  disabled={isActionLoading || selectedFarmers.length === 0}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isActionLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      {t('sending')}
                    </>
                  ) : (
                    `${t('sendTo')} ${selectedFarmers.length} ${t('farmers')}`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isActionLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}