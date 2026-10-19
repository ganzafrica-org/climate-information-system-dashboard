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
import AssignmentFields from "@/components/admin/AssignmentFields";
import {
  assignmentPayload,
  validateAgronomistAssignment,
  type AssignmentLevel,
} from "@/lib/assignment";

// Define the user input
interface InviteUserInput {
  username: string;
  email: string;
  phone: string;
  role: 'admin' | 'agronomist';
  assignmentLevel: AssignmentLevel | "";
  sectorName: string;
}

function inviteErrorMessage(error: any): string {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;
  const backendErrors = error?.response?.data?.errors;
  const backendData = error?.response?.data;

  if (status === 409) {
    return backendMessage || "A user with this email, phone, or username already exists.";
  }

  if (status === 400 || status === 422) {
    if (Array.isArray(backendErrors) && backendErrors.length > 0) {
      const msg = backendErrors.map((item: any) => {
        if (typeof item === "string") return item;
        return item?.message || item?.msg || JSON.stringify(item);
      }).join("\n");
      return msg || "Validation error: Please check your input fields.";
    }
    if (backendMessage) return backendMessage;
    return backendData?.error || backendData?.message || `Bad Request (${status}): Please check your input fields.`;
  }

  return backendMessage || error?.message || "Failed to create user";
}

type InviteResult = { ok: true; user: User } | { ok: false; message: string };

const inviteUser = async (data: InviteUserInput): Promise<InviteResult> => {
  const sanitized: Record<string, string> = {
    email: data.email?.trim().toLowerCase(),
    role: data.role,
    ...assignmentPayload(data.role, data.assignmentLevel, data.sectorName),
  };

  const usernameTrimmed = data.username?.trim();
  if (usernameTrimmed) sanitized.username = usernameTrimmed;

  const phoneTrimmed = data.phone?.trim();
  if (phoneTrimmed) sanitized.phone = phoneTrimmed;

  try {
    try {
      const user = await api.post<User>("/api/admin/users/invite", sanitized);
      return { ok: true, user };
    } catch (inviteError: any) {
      if (inviteError?.response?.status !== 404) {
        return { ok: false, message: inviteErrorMessage(inviteError) };
      }
      const user = await api.post<User>("/api/auth/invite", sanitized);
      return { ok: true, user };
    }
  } catch (error: any) {
    return { ok: false, message: inviteErrorMessage(error) };
  }
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: User) => void;
}

export default function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const emptyForm: InviteUserInput = {
    username: "",
    email: "",
    phone: "",
    role: "agronomist",
    assignmentLevel: "",
    sectorName: "",
  };

  const [form, setForm] = useState<InviteUserInput>(emptyForm);

  const onChange = (field: keyof InviteUserInput, value: string) => {
    setForm(prev => {
      if (field === "role") {
        return {
          ...prev,
          role: value as InviteUserInput["role"],
          assignmentLevel: value === "agronomist" ? prev.assignmentLevel : "",
          sectorName: value === "agronomist" ? prev.sectorName : "",
        };
      }
      if (field === "assignmentLevel") {
        return {
          ...prev,
          assignmentLevel: value as AssignmentLevel,
          sectorName: value === "sector" ? prev.sectorName : "",
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!form.role) {
      toast.error("Role is required");
      return;
    }
    const assignmentError = validateAgronomistAssignment(
      form.role,
      form.assignmentLevel,
      form.sectorName
    );
    if (assignmentError) {
      toast.error(assignmentError);
      return;
    }
    setIsLoading(true);
    try {
      const result = await inviteUser(form);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("User created successfully");
      onSuccess(result.user);
      onOpenChange(false);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(inviteErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" aria-describedby="create-user-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create User
          </DialogTitle>
          <DialogDescription id="create-user-description">Fill in details to create a new user account.</DialogDescription>
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
            <AssignmentFields
              role={form.role}
              assignmentLevel={form.assignmentLevel}
              sectorName={form.sectorName}
              onAssignmentLevelChange={(value) => onChange("assignmentLevel", value)}
              onSectorNameChange={(value) => onChange("sectorName", value)}
              disabled={isLoading}
            />
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
            <Button type="submit" disabled={isLoading} className="bg-[#147677] hover:bg-[#147677]/90 text-white">
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