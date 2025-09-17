import React from 'react';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import UsersTable from '@/components/admin/UsersTable';

export default function AdminUsersPage() {
  return (
    <AppLayout>
      <Head>
        <title>Admin | Users</title>
      </Head>
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium">Admin - Users Management</h2>
        </div>
        <UsersTable />
      </div>
    </AppLayout>
  );
}

