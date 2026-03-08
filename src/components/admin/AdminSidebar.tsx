import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Bot, 
  Settings, 
  Shield,
  ArrowLeft 
} from 'lucide-react';

interface AdminSidebarProps {
  isSuperAdmin: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: 'ওভারভিউ', path: '/admin' },
  { icon: Users, label: 'ব্যবহারকারী', path: '/admin/users' },
  { icon: DollarSign, label: 'রাজস্ব', path: '/admin/revenue' },
  { icon: Bot, label: 'AI পারফরম্যান্স', path: '/admin/ai' },
  { icon: Settings, label: 'প্ল্যাটফর্ম সেটিংস', path: '/admin/settings' },
];

export default function AdminSidebar({ isSuperAdmin }: AdminSidebarProps) {
  const { profile } = useAuth();

  return (
    <aside className="w-60 min-h-screen bg-[#1C1B1A] text-white flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">AdDhoom</span>
          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Super Admin Only */}
        {isSuperAdmin && (
          <NavLink
            to="/admin/admins"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Shield className="h-4 w-4" />
            <span>অ্যাডমিন ব্যবস্থাপনা</span>
          </NavLink>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="px-3 py-2 text-xs text-white/50 truncate">
          {profile?.email}
        </div>
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ড্যাশবোর্ডে ফিরুন</span>
        </NavLink>
      </div>
    </aside>
  );
}
