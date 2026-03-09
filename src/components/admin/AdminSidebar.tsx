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
  Moon,
  Key,
  Menu,
  X,
  Crown,
  Bell,
  ClipboardList,
  Palette,
  Flag,
  Megaphone,
  Ticket,
  Mail,
  Wrench,
  FileText,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminSidebarProps {
  isSuperAdmin: boolean;
}

const mainNavItems = [
  { icon: LayoutDashboard, label: 'ওভারভিউ', path: '/admin' },
  { icon: Users, label: 'ব্যবহারকারী', path: '/admin/users' },
  { icon: DollarSign, label: 'রাজস্ব', path: '/admin/revenue' },
  { icon: Bot, label: 'AI পারফরম্যান্স', path: '/admin/ai' },
];

const controlNavItems = [
  { icon: ClipboardList, label: 'প্ল্যান ম্যানেজার', path: '/admin/plans' },
  { icon: Palette, label: 'ব্র্যান্ড সেটিংস', path: '/admin/branding' },
  { icon: Flag, label: 'ফিচার ফ্ল্যাগ', path: '/admin/feature-flags' },
  { icon: Megaphone, label: 'ঘোষণা', path: '/admin/announcements' },
  { icon: Ticket, label: 'কুপন', path: '/admin/coupons' },
];

const systemNavItems = [
  { icon: Key, label: 'API কী', path: '/admin/api-keys' },
  { icon: Mail, label: 'ইমেইল টেমপ্লেট', path: '/admin/emails' },
  { icon: Wrench, label: 'সিস্টেম সেটিংস', path: '/admin/settings' },
  { icon: FileText, label: 'অডিট লগ', path: '/admin/audit-log' },
];

export default function AdminSidebar({ isSuperAdmin }: AdminSidebarProps) {
  const { profile } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const sidebarContent = (
    <>
      {/* Logo & Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                AdDhoom
              </span>
              <span className="ml-1 text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded font-medium">
                Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8 md:hidden text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-3 mx-3 mt-3 rounded-xl bg-gradient-to-br from-primary/10 via-orange-500/5 to-transparent border border-primary/10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary to-orange-400 text-white text-sm font-semibold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || 'Admin User'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Crown className="h-2.5 w-2.5" />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Shield className="h-2.5 w-2.5" />
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-3 py-2">
          মেনু
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive 
                  ? 'bg-gradient-to-r from-primary/15 to-orange-500/10 text-primary shadow-sm border border-primary/10' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Super Admin Only */}
        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-border/50" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-3 py-2">
              সুপার অ্যাডমিন
            </p>
            <NavLink
              to="/admin/admins"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive 
                    ? 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/10' 
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Crown className="h-4 w-4" />
              <span>অ্যাডমিন ব্যবস্থাপনা</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border/50">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ড্যাশবোর্ডে ফিরুন</span>
        </NavLink>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            AdDhoom
          </span>
          <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 h-full w-72 bg-background border-r border-border z-50 flex flex-col transition-transform duration-300 shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen bg-gradient-to-b from-background to-muted/20 border-r border-border text-foreground flex-col shadow-sm">
        {sidebarContent}
      </aside>
    </>
  );
}
