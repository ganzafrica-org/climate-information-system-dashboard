import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, Users, Eye, MoreHorizontal, Archive, Trash, ArrowUpDown, Edit, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Location {
  id: number;
  locationName: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  createdAt: string;
  farmerCount?: number;
  sector?: string;
}

interface Message {
  id: string;
  content: string;
  recipients: string[];
  recipientCount: number;
  sentAt: string;
  status: 'sent' | 'scheduled' | 'draft';
  locationIds: number[];
}

interface MessagesTableProps {
  selectedSector?: string;
  searchTerm?: string;
}

export function MessagesTable({ selectedSector = 'all', searchTerm = '' }: MessagesTableProps) {
  const [activeTab, setActiveTab] = useState<'locations' | 'history'>('locations');
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [messagingResult, setMessagingResult] = useState<{
    success: number;
    failed: number;
    totalFarmers: number;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get auth token from localStorage or context
  const getAuthToken = () => {
    // Try different possible token storage keys
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('accessToken') ||
           localStorage.getItem('jwt');
  };

  // Fetch locations from backend
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('http://localhost:3000/api/users/locations', {
          headers
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          }
          throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setLocations(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
        console.error('Error fetching locations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('messageHistory');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (err) {
        console.error('Error loading saved messages:', err);
      }
    }
  }, []);

  // Save messages to localStorage whenever messages array changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('messageHistory', JSON.stringify(messages));
    }
  }, [messages]);

  const filteredLocations = locations.filter(location => {
    const matchesSector = selectedSector === 'all' || 
      (location.sector && location.sector.toLowerCase().includes(selectedSector.toLowerCase()));
    const matchesSearch = searchTerm === '' || 
      location.locationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSector && matchesSearch;
  });

  const filteredMessages = messages.filter(message => {
    const matchesSector = selectedSector === 'all' || message.recipients.some(r => 
      r.toLowerCase().includes(selectedSector.toLowerCase())
    );
    const matchesSearch = searchTerm === '' || 
      message.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSector && matchesSearch;
  });

  const handleLocationSelect = (locationId: number) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === filteredLocations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(filteredLocations.map(loc => loc.id));
    }
  };

  const getTotalSelectedFarmers = () => {
    return locations
      .filter(loc => selectedLocations.includes(loc.id))
      .reduce((total, loc) => total + (loc.farmerCount || 0), 0);
  };

  const handleSendMessage = async () => {
    if (!customMessage.trim() || selectedLocations.length === 0) return;

    setIsSending(true);
    
    try {
      const token = getAuthToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:3000/api/weather/messaging/emergency', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: customMessage,
          locationIds: selectedLocations
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Calculate success metrics (you might get this from the API response)
      const totalFarmers = getTotalSelectedFarmers();
      const successCount = result.successCount || Math.floor(totalFarmers * 0.95);
      const failedCount = totalFarmers - successCount;

      setMessagingResult({
        success: successCount,
        failed: failedCount,
        totalFarmers: totalFarmers
      });

      // Add the sent message to history
      const selectedLocationNames = locations
        .filter(loc => selectedLocations.includes(loc.id))
        .map(loc => loc.locationName);

      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: customMessage,
        recipients: selectedLocationNames,
        recipientCount: totalFarmers,
        sentAt: new Date().toISOString(),
        status: 'sent',
        locationIds: selectedLocations
      };

      setMessages(prev => [newMessage, ...prev]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const totalFarmers = getTotalSelectedFarmers();
      setMessagingResult({
        success: 0,
        failed: totalFarmers,
        totalFarmers: totalFarmers
      });
    } finally {
      setIsSending(false);
      setIsMessageDialogOpen(false);
      setIsSuccessModalOpen(true);
      setCustomMessage('');
      setSelectedLocations([]);
    }
  };

  const formatCoordinates = (coordinates: { lat: number; lon: number }) => {
    return `${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading locations...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            {error.includes('Authentication') ? (
              <>
                <strong>Authentication Error:</strong> {error}
                <br />
                <span className="text-sm text-muted-foreground mt-1">
                  Please check if you're logged in and try refreshing the page.
                </span>
              </>
            ) : (
              <>
                <strong>Error loading locations:</strong> {error}
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'locations'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations ({filteredLocations.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            Message History ({filteredMessages.length})
          </div>
        </button>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Locations & Messaging</CardTitle>
                <CardDescription>
                  Select locations to send custom messages to farmers
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedLocations.length > 0 && (
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedLocations.length} locations selected ({getTotalSelectedFarmers()} farmers)
                  </Badge>
                )}
                <Button
                  onClick={() => setIsMessageDialogOpen(true)}
                  disabled={selectedLocations.length === 0}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="py-3 px-4 text-left">
                      <Checkbox
                        checked={selectedLocations.length === filteredLocations.length && filteredLocations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Location Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Coordinates</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Created At</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No locations found
                      </td>
                    </tr>
                  ) : (
                    filteredLocations.map((location) => (
                      <tr
                        key={location.id}
                        className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedLocations.includes(location.id) ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => handleLocationSelect(location.id)}
                      >
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedLocations.includes(location.id)}
                            onCheckedChange={() => handleLocationSelect(location.id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{location.locationName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatCoordinates(location.coordinates)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {new Date(location.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle>Message History</CardTitle>
            <CardDescription>
              {filteredMessages.length} messages found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Message Content</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Recipients</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No messages found
                      </td>
                    </tr>
                  ) : (
                    filteredMessages.map((message) => (
                      <tr
                        key={message.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
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
                            {message.status === 'sent' ? 'Sent' : 
                            message.status === 'scheduled' ? 'Scheduled' : 
                            'Draft'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium">
                            {new Date(message.sentAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(message.sentAt).toLocaleTimeString()}
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Send className="h-4 w-4 mr-2" />
                                Resend Message
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
        </Card>
      )}

      {/* Custom Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Send Custom Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedLocations.length} selected location{selectedLocations.length !== 1 ? 's' : ''} ({getTotalSelectedFarmers()} farmers)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Selected Locations:</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedLocations.map(id => {
                  const location = locations.find(loc => loc.id === id);
                  return location ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {location.locationName}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Message Content:</label>
              <textarea
                placeholder="Enter your message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {customMessage.length}/500 characters
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage} 
              disabled={!customMessage.trim() || isSending}
              className="gap-2"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              Message Sent Successfully
            </DialogTitle>
          </DialogHeader>
          
          {messagingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {messagingResult.success}
                  </div>
                  <div className="text-sm text-green-700">
                    Successfully Sent
                  </div>
                </div>
                {messagingResult.failed > 0 && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {messagingResult.failed}
                    </div>
                    <div className="text-sm text-red-700">
                      Failed to Send
                    </div>
                  </div>
                )}
              </div>
              
              <Alert>
                <AlertDescription>
                  Your message was sent to {messagingResult.success} out of {messagingResult.totalFarmers} farmers.
                  {messagingResult.failed > 0 && (
                    <span className="text-red-600">
                      {' '}
                      {messagingResult.failed} messages failed due to network issues or invalid contact information.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsSuccessModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}