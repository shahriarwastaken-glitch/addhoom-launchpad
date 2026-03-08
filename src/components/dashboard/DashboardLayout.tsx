import { ReactNode, useState, useRef, useCallback } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Moon, Sun, Target, Video, Calendar, MessageSquare, Stethoscope, LogOut, ChevronDown, Store, RefreshCw, Zap, X } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

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
  const location = useLocation();
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const main = mainRef.current;
    if (main && main.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const main = mainRef.current;
    if (!main || main.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      // Reload the page content
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } else {
      setPullDistance(0);
    }
    isPulling.current = false;
  }, [pullDistance, isRefreshing]);

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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-2 sm:px-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="hidden md:flex" />
              {/* Workspace selector */}
              <div className="relative min-w-0">
                <button
                  onClick={() => setShowWorkspaces(!showWorkspaces)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors min-w-0"
                >
                  <Store size={14} className="text-primary flex-shrink-0" />
                  <span className="max-w-[80px] sm:max-w-[120px] truncate text-xs sm:text-sm">{activeWorkspace?.shop_name || t('শপ', 'Shop')}</span>
                  <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
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

            <div className="flex items-center gap-1.5 sm:gap-3">
              {profile?.plan && (
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {profile.plan}
                </span>
              )}
              <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors" aria-label="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={toggle} className="hidden sm:flex items-center bg-secondary rounded-full px-3 py-1 text-xs font-semibold">
                <span className={lang === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className={lang === 'bn' ? 'text-primary' : 'text-muted-foreground'}>বাং</span>
              </button>
              {/* Compact language toggle for mobile */}
              <button onClick={toggle} className="sm:hidden p-1.5 rounded-full bg-secondary text-foreground text-xs font-bold">
                {lang === 'bn' ? 'EN' : 'বাং'}
              </button>
              <button className="relative p-1.5 sm:p-2 text-muted-foreground hover:text-foreground">
                <Bell size={16} />
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-[10px] sm:text-xs font-bold"
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

          {/* Pull-to-refresh indicator */}
          <AnimatePresence>
            {pullDistance > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: pullDistance, opacity: pullDistance > 20 ? 1 : 0 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center bg-background overflow-hidden md:hidden"
              >
                <RefreshCw
                  size={20}
                  className={`text-primary transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                  style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <main
            ref={mainRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 bg-background p-3 sm:p-6 md:p-8 overflow-auto pb-20 md:pb-8"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 safe-bottom">
        {mobileItems.map(item => (
          <NavLink key={item.en} to={item.url} end={item.url === '/dashboard'}
            className="flex flex-col items-center gap-0.5 px-2 py-2.5 text-muted-foreground min-w-0 flex-1"
            activeClassName="text-primary">
            <item.icon size={20} />
            <span className="text-[10px] font-medium truncate">{t(item.bn, item.en)}</span>
          </NavLink>
        ))}
      </nav>
    </SidebarProvider>
  );
};

export default DashboardLayout;
