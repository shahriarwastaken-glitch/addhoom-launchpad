import { useLanguage } from '@/contexts/LanguageContext';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Target, Video, Calendar, MessageSquare, Search, Stethoscope, PartyPopper, BarChart3, Settings } from 'lucide-react';

const items = [
  { icon: Target, bn: 'AI বিজ্ঞাপন', en: 'AI Ads', url: '/dashboard' },
  { icon: Video, bn: 'ভিডিও অ্যাড', en: 'Video Ads', url: '/dashboard/video' },
  { icon: Calendar, bn: 'ক্যালেন্ডার', en: 'Calendar', url: '/dashboard/calendar' },
  { icon: MessageSquare, bn: 'AI চ্যাট', en: 'AI Chat', url: '/dashboard/chat' },
  { icon: Search, bn: 'প্রতিযোগী', en: 'Competitors', url: '/dashboard/competitors' },
  { icon: Stethoscope, bn: 'অ্যাকাউন্ট ডাক্তার', en: 'Doctor', url: '/dashboard/doctor' },
  { icon: PartyPopper, bn: 'উৎসব', en: 'Festival', url: '/dashboard/festival' },
  { icon: BarChart3, bn: 'ক্যাম্পেইন', en: 'Campaigns', url: '/dashboard/campaigns' },
  { icon: Settings, bn: 'সেটিংস', en: 'Settings', url: '/dashboard/settings' },
];

const DashboardSidebar = () => {
  const { t } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <Link to="/" className="text-lg font-bold font-heading-en">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            {!collapsed && <span className="text-brand-yellow">⚡</span>}
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
