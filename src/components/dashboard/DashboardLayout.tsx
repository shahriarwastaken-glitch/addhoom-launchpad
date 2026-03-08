import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Moon, Sun, Target, Video, Calendar, MessageSquare, Stethoscope } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const mobileItems = [
  { icon: Target, bn: 'অ্যাড', en: 'Ads', url: '/dashboard' },
  { icon: Video, bn: 'ভিডিও', en: 'Video', url: '/dashboard/video' },
  { icon: Calendar, bn: 'ক্যালেন্ডার', en: 'Calendar', url: '/dashboard/calendar' },
  { icon: MessageSquare, bn: 'চ্যাট', en: 'Chat', url: '/dashboard/chat' },
  { icon: Stethoscope, bn: 'ডাক্তার', en: 'Doctor', url: '/dashboard/doctor' },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { lang, toggle, t } = useLanguage();
  const { dark, toggleTheme } = useTheme();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors" aria-label="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={toggle} className="flex items-center bg-secondary rounded-full px-3 py-1 text-xs font-semibold">
                <span className={lang === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className={lang === 'bn' ? 'text-primary' : 'text-muted-foreground'}>বাং</span>
              </button>
              <button className="relative p-2 text-muted-foreground hover:text-foreground">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">A</div>
            </div>
          </header>
          <main className="flex-1 bg-background p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-1">
        {mobileItems.map(item => (
          <NavLink
            key={item.en}
            to={item.url}
            end={item.url === '/dashboard'}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground"
            activeClassName="text-primary"
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{t(item.bn, item.en)}</span>
          </NavLink>
        ))}
      </nav>
    </SidebarProvider>
  );
};

export default DashboardLayout;
