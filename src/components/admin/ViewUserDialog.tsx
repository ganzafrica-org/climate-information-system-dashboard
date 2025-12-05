import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, User as UserIcon, Mail, Phone, Shield, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types/user";

// API function to get user details
const getUserById = async (userId: string | number): Promise<User> => {
  try {
    const response = await api.get<{status: string, data: User}>(`/api/admin/users/${userId}`);
    // Extract the user data from the response.data property
    return response.data;
  } catch (error: any) {
    console.error('Get user error:', error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to fetch user');
    }
  }
};

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onClose: () => void;
}

export default function ViewUserDialog({ open, onOpenChange, user, onClose }: ViewUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<User | null>(null);

  // Fetch user details when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      fetchUserDetails();
    }
  }, [open, user?.id]);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    try {
      const userData = await getUserById(user.id);
      setUserDetails(userData);
    } catch (error: any) {
      console.error('Failed to fetch user details:', error);
      toast.error(error.message || "Failed to load user details");
      // Fallback to the passed user data
      setUserDetails(user);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format role display
  const formatRole = (role: string | undefined) => {
    if (!role) return 'Agronomist';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Helper function to get status badge
  const getStatusBadge = (status?: string, isActive?: boolean) => {
    if (isActive === false) {
      return <Badge style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Inactive</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }}>Active</Badge>;
      case 'pending':
        return <Badge style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Pending</Badge>;
      case 'suspended':
        return <Badge style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Suspended</Badge>;
      default:
        return <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }}>Unknown</Badge>;
    }
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            View complete user information and account details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6 mr-2" />
            <span>Loading user details...</span>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Username</p>
                    <p className="text-base">{userDetails.username || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-base">{userDetails.email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-base">{userDetails.phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="text-base">{formatRole(userDetails.role)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Account Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(userDetails.status, userDetails.isActive)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Created</p>
                    <p className="text-base">{formatDate(userDetails.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Updated</p>
                    <p className="text-base">{formatDate(userDetails.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            {(userDetails.lastLogin || userDetails.emailVerified !== undefined) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDetails.lastLogin && (
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Last Login</p>
                        <p className="text-base">{formatDate(userDetails.lastLogin)}</p>
                      </div>
                    </div>
                  )}

                  {userDetails.emailVerified !== undefined && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email Verified</p>
                        <Badge 
                          style={{ 
                            backgroundColor: userDetails.emailVerified ? '#ECFDF6' : '#fef2f2', 
                            color: userDetails.emailVerified ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {userDetails.emailVerified ? 'Verified' : 'Not Verified'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Failed to load user details
          </div>
        )}

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}