import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import AdminPlans from '@/components/admin/AdminPlans';
import AdminPlanForm from '@/components/admin/AdminPlanForm';

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
          <Route path="plans" element={<AdminPlans />} />
          <Route path="plans/new" element={<AdminPlanForm />} />
          <Route path="plans/:id/edit" element={<AdminPlanForm />} />
          {isSuperAdmin && (
            <Route path="admins" element={<AdminManageAdmins />} />
          )}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminGuard>
  );
}