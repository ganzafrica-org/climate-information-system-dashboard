import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types/user";

// Define the update user input type
interface UpdateUserInput {
  username: string;
  email: string;
  phone: string;
  role: 'admin' | 'agronomist';
}

// API functions for user operations
const getUserById = async (userId: string | number): Promise<User> => {
  try {
    const response = await api.get<{status: string, data: User}>(`/api/admin/users/${userId}`);
    // Extract the user data from the response.data property
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to fetch user');
    }
  }
};

const updateUser = async (userId: string | number, data: UpdateUserInput): Promise<User> => {
  try {
    const response = await api.put<{status: string, data: User}>(`/api/admin/users/${userId}`, data);
    // Extract the user data from the response.data property
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to update user');
    }
  }
};

interface UpdateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export default function UpdateUserDialog({ open, onOpenChange, user, onSuccess }: UpdateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [form, setForm] = useState<UpdateUserInput>({
    username: "",
    email: "",
    phone: "",
    role: "agronomist"
  });

  // Fetch user details when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      fetchUserDetails();
    }
  }, [open, user?.id]);

  const fetchUserDetails = async () => {
    setIsFetching(true);
    try {
      const userData = await getUserById(user.id);
      setForm({
        username: userData.username || "",
        email: userData.email || "",
        phone: userData.phone || "",
        role: getValidRole(userData.role)
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load user details");
      // Fallback to the passed user data
      setForm({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        role: getValidRole(user.role)
      });
    } finally {
      setIsFetching(false);
    }
  };

  const getValidRole = (role: string | undefined): 'admin' | 'agronomist' => {
    if (role === 'admin' || role === 'agronomist') {
      return role;
    }
    return 'agronomist';
  };

  const onChange = (field: keyof UpdateUserInput, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim()) {
      toast.error("Username and email are required");
      return;
    }
    
    setIsLoading(true);
    try {
      await updateUser(user.id, form);
      toast.success("User updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Update User
          </DialogTitle>
          <DialogDescription>
            Update user information and role settings.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6 mr-2" />
            <span>Loading user details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="update-username">Username</Label>
                <Input 
                  id="update-username" 
                  value={form.username} 
                  onChange={(e) => onChange('username', e.target.value)} 
                  placeholder="Enter username" 
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="update-email">Email</Label>
                <Input 
                  id="update-email" 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => onChange('email', e.target.value)} 
                  placeholder="user@example.com" 
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="update-phone">Phone</Label>
                <Input 
                  id="update-phone" 
                  value={form.phone} 
                  onChange={(e) => onChange('phone', e.target.value)} 
                  placeholder="Enter phone number"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="update-role">Role</Label>
                <Select 
                  value={form.role} 
                  onValueChange={(v: 'admin' | 'agronomist') => onChange('role', v)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agronomist">Agronomist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel} 
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating User
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}