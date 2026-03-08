import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  isSuperAdmin: boolean;
}

export default function AdminLayout({ isSuperAdmin }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />
      <main className="flex-1 p-4 md:p-6 overflow-auto pt-16 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
