import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminRevenue from '@/components/admin/AdminRevenue';
import AdminAIPerformance from '@/components/admin/AdminAIPerformance';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminManageAdmins from '@/components/admin/AdminManageAdmins';
import AdminApiKeys from '@/components/admin/AdminApiKeys';
import AdminNotifications from '@/components/admin/AdminNotifications';

export default function AdminDashboardNew() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  return (
    <AdminGuard onAdminVerified={(superAdmin) => setIsSuperAdmin(superAdmin)}>
      <Routes>
        <Route element={<AdminLayout isSuperAdmin={isSuperAdmin} />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="ai" element={<AdminAIPerformance />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="api-keys" element={<AdminApiKeys />} />
          {isSuperAdmin && (
            <Route path="admins" element={<AdminManageAdmins />} />
          )}
        </Route>
      </Routes>
    </AdminGuard>
  );
}
