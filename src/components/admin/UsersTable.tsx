import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowUpDown, Eye, Edit, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Shield, Trash } from "lucide-react";
import api from "@/lib/api";
import type { User } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateUserDialog from "@/components/admin/CreateUserDialog";
import UpdateUserDialog from "@/components/admin/UpdateUserDialog";
import ViewUserDialog from "@/components/admin/ViewUserDialog";

// Define allowed roles type
type AllowedRole = 'admin' | 'agronomist';

export function UsersTable() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchUsers = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true); else setIsLoading(true);
      const data = await api.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const term = search.trim().toLowerCase();
    const sorted = [...list].sort((a, b) => {
      const aVal = ((a as any)?.[sortField] ?? "") as any;
      const bVal = ((b as any)?.[sortField] ?? "") as any;
      const aStr = typeof aVal === 'string' ? aVal.toLowerCase() : String(aVal);
      const bStr = typeof bVal === 'string' ? bVal.toLowerCase() : String(bVal);
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    if (!term) return sorted;
    return sorted.filter(u =>
      [(u as any).username, u.email, u.role, (u as any).phone, (u as any).status]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [users, search, sortField, sortOrder]);

  const handleDelete = async (userId: string | number) => {
    try {
      await api.deleteUser(userId);
      toast.success("User deleted");
      fetchUsers(true);
    } catch (e: any) {
      toast.error("Failed to delete user");
    }
  };

  const handleRoleChange = async (userId: string | number, role: AllowedRole) => {
    try {
      await api.updateUserRole(userId, role as any);
      toast.success("Role updated");
      fetchUsers(true);
    } catch (e: any) {
      toast.error("Failed to update role");
    }
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const handleUpdate = (user: User) => {
    setSelectedUser(user);
    setIsUpdateOpen(true);
  };

  const handleUpdateSuccess = () => {
    setIsUpdateOpen(false);
    setSelectedUser(null);
    fetchUsers(true);
  };

  const handleViewClose = () => {
    setIsViewOpen(false);
    setSelectedUser(null);
  };

  // Helper function to format role display
  const formatRole = (role: string | undefined) => {
    if (!role) return 'Agronomist';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Helper function to get status badge
  const getStatusBadge = (status?: string, isActive?: boolean) => {
    // If user hasn't logged in yet, show as pending regardless of isActive
    if (status === 'pending') {
      return <Badge style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Pending</Badge>;
    }
    
    // If user is locked, show as inactive
    if (status === 'locked') {
      return <Badge style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Inactive</Badge>;
    }
    
    if (isActive === false) {
      return <Badge style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Inactive</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge style={{ backgroundColor: '#ECFDF6', color: '#16a34a', border: '1px solid #ECFDF6' }}>Active</Badge>;
      case 'suspended':
        return <Badge style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Suspended</Badge>;
      default:
        return <Badge style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #f3f4f6' }}>Unknown</Badge>;
    }
  };

  // Helper function to get valid role for select
  const getValidRole = (role: string | undefined): AllowedRole => {
    if (role === 'admin' || role === 'agronomist') {
      return role;
    }
    return 'agronomist'; // Default to agronomist if invalid role
  };

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>Manage platform users and roles</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="pl-8 w-64" />
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="bg-[#147677] text-white hover:bg-[#147677]/90">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchUsers(true)} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-6 w-6" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f2f5fa] text-black">
                <tr>
                  <th className="py-4 px-6 text-left font-semibold text-sm">#</th>
                  <th className="py-4 px-6 text-left font-semibold text-sm">
                    <button className="flex items-center gap-1 hover:text-gray-600" onClick={() => {
                      setSortField('username');
                      setSortOrder(sortField === 'username' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}>
                      <span>Username</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-6 text-left font-semibold text-sm">Email</th>
                  <th className="py-4 px-6 text-left font-semibold text-sm">Phone</th>
                  <th className="py-4 px-6 text-left font-semibold text-sm">Status</th>
                  <th className="py-4 px-6 text-left font-semibold text-sm">
                    <button className="flex items-center gap-1 hover:text-gray-600" onClick={() => {
                      setSortField('role');
                      setSortOrder(sortField === 'role' && sortOrder === 'asc' ? 'desc' : 'asc');
                    }}>
                      <span>Role</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filtered.map((user, index) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 font-medium">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{(user as any).username || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">{user.email || '-'}</td>
                      <td className="py-3 px-4">{(user as any).phone || '-'}</td>
                      <td className="py-3 px-4">
                        {getStatusBadge((user as any).status, (user as any).isActive)}
                      </td>
                      <td className="py-3 px-4">
                        <Select 
                          value={getValidRole((user as any).role)} 
                          onValueChange={(val: AllowedRole) => handleRoleChange(user.id, val)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>{formatRole((user as any).role)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agronomist">Agronomist</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdate(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(user.id)}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
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
      <CardFooter className="p-4"></CardFooter>
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => fetchUsers(true)}
      />
      {selectedUser && (
        <>
          <UpdateUserDialog
            open={isUpdateOpen}
            onOpenChange={setIsUpdateOpen}
            user={selectedUser}
            onSuccess={handleUpdateSuccess}
          />
          <ViewUserDialog
            open={isViewOpen}
            onOpenChange={setIsViewOpen}
            user={selectedUser}
            onClose={handleViewClose}
          />
        </>
      )}
    </Card>
  );
}

export default UsersTable;