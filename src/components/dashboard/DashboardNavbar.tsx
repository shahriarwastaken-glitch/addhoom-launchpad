import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, FolderOpen, MessageSquare, PartyPopper, Search, Settings, Shield, Stethoscope, Target, Video, Wand2, Zap } from 'lucide-react';

const navItems = [
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
  { icon: Settings, bn: 'সেটিংস', en: 'Settings', url: '/dashboard/settings' },
];

const DashboardNavbar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
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
    <nav className="hidden md:flex items-center gap-1 overflow-x-auto px-2">
      {navItems.map((item) => (
        <NavLink
          key={item.en}
          to={item.url}
          end={item.url === '/dashboard'}
          className="whitespace-nowrap px-3 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2"
          activeClassName="bg-primary/10 text-primary"
        >
          <item.icon className="h-4 w-4" />
          <span className="font-body-bn">{t(item.bn, item.en)}</span>
        </NavLink>
      ))}

      {isAdmin && (
        <NavLink
          to="/admin"
          className="whitespace-nowrap px-3 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2"
          activeClassName="bg-destructive/10 text-destructive"
        >
          <Shield className="h-4 w-4" />
          <span className="font-body-bn">{t('অ্যাডমিন', 'Admin')}</span>
        </NavLink>
      )}
    </nav>
  );
};

export default DashboardNavbar;
