import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, rowActionsColumn, type SortableColumn } from "@/components/ui/table";
import { toast } from "sonner";
import { Eye, Edit, MoreHorizontal, Plus, RefreshCw, Search, Shield, Trash } from "lucide-react";
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
      console.error(e);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (userId: string | number) => {
    try {
      await api.deleteUser(userId);
      toast.success("User deleted");
      fetchUsers(true);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete user");
    }
  };

  const handleRoleChange = async (userId: string | number, role: AllowedRole) => {
    try {
      await api.updateUserRole(userId, role as any);
      toast.success("Role updated");
      fetchUsers(true);
    } catch (e: any) {
      console.error(e);
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

  const formatRole = (role: string | undefined) => {
    if (!role) return 'Agronomist';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getStatusBadge = (status?: string, isActive?: boolean) => {
    if (status === 'pending') {
      return <Badge style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Pending</Badge>;
    }
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

  const getValidRole = (role: string | undefined): AllowedRole => {
    if (role === 'admin' || role === 'agronomist') return role;
    return 'agronomist';
  };

  const columns = useMemo<SortableColumn<User>[]>(() => [
    {
      id: "username",
      header: "Username",
      value: (u) => (u as any).username ?? "",
      cell: (u) => <span className="font-medium">{(u as any).username || 'N/A'}</span>,
    },
    { id: "email", header: "Email", value: (u) => u.email ?? "", cell: (u) => u.email || '-' },
    { id: "phone", header: "Phone", value: (u) => (u as any).phone ?? "", cell: (u) => (u as any).phone || '-' },
    {
      id: "status",
      header: "Status",
      sortable: false,
      cell: (u) => getStatusBadge((u as any).status, (u as any).isActive),
    },
    {
      id: "role",
      header: "Role",
      value: (u) => (u as any).role ?? "",
      cell: (u) => (
        <Select
          value={getValidRole((u as any).role)}
          onValueChange={(val: AllowedRole) => handleRoleChange(u.id, val)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue>{formatRole((u as any).role)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agronomist">Agronomist</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    rowActionsColumn<User>((u) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleView(u)}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdate(u)}>
            <Edit className="h-4 w-4 mr-2" />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem destructive onClick={() => handleDelete(u.id)}>
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

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
      <CardContent className="p-4 pt-0">
        <DataTable<User>
          label="Users"
          data={Array.isArray(users) ? users : []}
          columns={columns}
          getRowId={(u) => String(u.id)}
          loading={isLoading}
          defaultSort={{ columnId: "username", direction: "asc" }}
          search={{
            query: search,
            matches: (u, q) =>
              [(u as any).username, u.email, (u as any).role, (u as any).phone, (u as any).status]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
          }}
          pagination={{ pageSize: 10 }}
          emptyState="No users found"
        />
      </CardContent>
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
