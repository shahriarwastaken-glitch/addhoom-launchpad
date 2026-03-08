import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Moon, Sun, Target, Video, Calendar, MessageSquare, Stethoscope, LogOut, ChevronDown, Store } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

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
  const { user, profile, activeWorkspace, workspaces, setActiveWorkspaceId, signOut } = useAuth();
  const navigate = useNavigate();
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              {/* Workspace selector */}
              <div className="relative">
                <button
                  onClick={() => setShowWorkspaces(!showWorkspaces)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                >
                  <Store size={14} className="text-primary" />
                  <span className="max-w-[120px] truncate">{activeWorkspace?.shop_name || t('শপ নির্বাচন', 'Select shop')}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {showWorkspaces && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaces(false)} />
                    <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-warm-lg py-1 min-w-[200px]">
                      {workspaces.map(ws => (
                        <button
                          key={ws.id}
                          onClick={() => { setActiveWorkspaceId(ws.id); setShowWorkspaces(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${ws.id === activeWorkspace?.id ? 'text-primary font-medium' : 'text-foreground'}`}
                        >
                          {ws.shop_name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.plan && (
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {profile.plan}
                </span>
              )}
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

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold"
                >
                  {initials}
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-warm-lg py-1 min-w-[200px]">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || t('ব্যবহারকারী', 'User')}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors flex items-center gap-2"
                      >
                        <LogOut size={14} /> {t('লগআউট', 'Log Out')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 bg-background p-3 sm:p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-1">
        {mobileItems.map(item => (
          <NavLink key={item.en} to={item.url} end={item.url === '/dashboard'}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground" activeClassName="text-primary">
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{t(item.bn, item.en)}</span>
          </NavLink>
        ))}
      </nav>
    </SidebarProvider>
  );
};

export default DashboardLayout;
