import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Bot, 
  Settings, 
  Shield,
  ArrowLeft,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { dark, toggleTheme } = useTheme();

  return (
    <aside className="w-60 min-h-screen bg-sidebar-background border-r border-sidebar-border text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">AdDhoom</span>
            <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded font-medium">
              Admin
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
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
                  ? 'bg-sidebar-primary/20 text-sidebar-primary' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
                  ? 'bg-sidebar-primary/20 text-sidebar-primary' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )
            }
          >
            <Shield className="h-4 w-4" />
            <span>অ্যাডমিন ব্যবস্থাপনা</span>
          </NavLink>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 text-xs text-sidebar-foreground/50 truncate">
          {profile?.email}
        </div>
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ড্যাশবোর্ডে ফিরুন</span>
        </NavLink>
      </div>
    </aside>
  );
}
