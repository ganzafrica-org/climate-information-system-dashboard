import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types/user";

// Define the user input
interface InviteUserInput {
  username: string;
  email: string;
  phone: string;
  role: 'admin' | 'agronomist';
}

// Use the existing API client instead of fetch
const inviteUser = async (data: InviteUserInput): Promise<User> => {
  try {
    // Sanitize payload: trim fields, lowercase email, omit empty optional fields
    const sanitized: Partial<InviteUserInput> = {
      username: data.username?.trim(),
      email: data.email?.trim().toLowerCase(),
      role: data.role,
    };
    const phoneTrimmed = data.phone?.trim();
    if (phoneTrimmed) {
      sanitized.phone = phoneTrimmed;
    }

    const response = await api.post<User>('/api/admin/users/invite', sanitized);
    return response;
  } catch (error: any) {
    // Provide clearer messages based on common API responses
    const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message;
    const backendErrors = error?.response?.data?.errors;

    if (status === 409) {
      throw new Error(backendMessage || 'A user with this email or username already exists.');
    }

    if (status === 400 || status === 422) {
      // Aggregate validation errors if present
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        const msg = backendErrors.map((e: any) => e?.message || e).join('\n');
        throw new Error(msg);
      }
      if (backendMessage) {
        throw new Error(backendMessage);
      }
    }

    if (backendMessage) {
      throw new Error(backendMessage);
    }

    if (error.message) {
      throw new Error(error.message);
    }

    throw new Error('Failed to create user');
  }
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: User) => void;
}

export default function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<InviteUserInput>({
    username: "",
    email: "",
    phone: "",
    role: "agronomist"
  });

  const onChange = (field: keyof InviteUserInput, value: string) => {
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
      const created = await inviteUser(form);
      toast.success("User created successfully");
      onSuccess(created);
      onOpenChange(false);
      // Reset form
      setForm({
        username: "",
        email: "",
        phone: "",
        role: "agronomist"
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create User
          </DialogTitle>
          <DialogDescription>Fill in details to create a new user account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={form.username} 
                onChange={(e) => onChange('username', e.target.value)} 
                placeholder="Enter username" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={form.email} 
                onChange={(e) => onChange('email', e.target.value)} 
                placeholder="name@example.com" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={form.phone} 
                onChange={(e) => onChange('phone', e.target.value)} 
                placeholder="Enter phone number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(v: 'admin' | 'agronomist') => onChange('role', v)}>
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
              onClick={() => onOpenChange(false)} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating User
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}