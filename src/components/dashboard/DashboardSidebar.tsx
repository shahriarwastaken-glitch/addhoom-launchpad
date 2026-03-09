import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Target, Video, Calendar, MessageSquare, Search, Stethoscope, FolderOpen, Settings, Shield, Zap, Wand2, BarChart3 } from 'lucide-react';

const items = [
  { icon: Target, bn: 'হোম', en: 'Home', url: '/dashboard' },
  { icon: Wand2, bn: 'অ্যাড তৈরি', en: 'Create Ad', url: '/dashboard/generate' },
  { icon: Video, bn: 'ভিডিও অ্যাড', en: 'Video Ads', url: '/dashboard/video' },
  { icon: FolderOpen, bn: 'প্রজেক্ট', en: 'Projects', url: '/dashboard/projects' },
  { icon: Calendar, bn: 'ক্যালেন্ডার', en: 'Calendar', url: '/dashboard/calendar' },
  { icon: MessageSquare, bn: 'AI চ্যাট', en: 'AI Chat', url: '/dashboard/chat' },
  { icon: Search, bn: 'প্রতিযোগী', en: 'Competitors', url: '/dashboard/competitors' },
  { icon: Stethoscope, bn: 'অ্যাকাউন্ট ডাক্তার', en: 'Doctor', url: '/dashboard/doctor' },
  { icon: PartyPopper, bn: 'উৎসব', en: 'Festival', url: '/dashboard/festival' },
  { icon: Zap, bn: 'ধুম স্কোর', en: 'Dhoom Score', url: '/dashboard/dhoom-score' },
  { icon: BarChart3, bn: 'বিশ্লেষণ', en: 'Analytics', url: '/dashboard/analytics' },
  { icon: Settings, bn: 'সেটিংস', en: 'Settings', url: '/dashboard/settings' },
];

const DashboardSidebar = () => {
  const { t } = useLanguage();
  const { state } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <Link to="/" className="text-lg font-bold font-heading-en">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            {!collapsed && <Zap size={16} className="text-brand-yellow" />}
          </Link>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.en}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/dashboard'} className="hover:bg-secondary" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="font-body-bn text-sm">{t(item.bn, item.en)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className="hover:bg-secondary" activeClassName="bg-destructive/10 text-destructive font-medium">
                      <Shield className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="font-body-bn text-sm">{t('অ্যাডমিন', 'Admin')}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className={`p-4 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed && (
            <button className="w-full bg-gradient-cta text-primary-foreground rounded-full px-4 py-2 text-xs font-semibold">
              {t('আপগ্রেড করুন', 'Upgrade')}
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
