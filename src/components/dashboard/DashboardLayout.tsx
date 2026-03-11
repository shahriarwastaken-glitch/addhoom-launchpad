import { ReactNode, useState, useEffect, useMemo } from 'react';
import DashboardNavbar from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Moon, Sun, Target, Video, MessageSquare, LogOut, ChevronDown, Store, X, Settings, Wand2, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';

const mobileItems = [
  { icon: Target, bn: 'হোম', en: 'Home', url: '/dashboard' },
  { icon: Wand2, bn: 'অ্যাড তৈরি', en: 'Create Ad', url: '/dashboard/generate' },
  { icon: Sparkles, bn: 'স্টুডিও', en: 'Studio', url: '/dashboard/studio' },
  { icon: Video, bn: 'ভিডিও', en: 'Video', url: '/dashboard/video' },
  { icon: Settings, bn: 'সেটিংস', en: 'Settings', url: '/dashboard/settings' },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  const { dark, toggleTheme } = useTheme();
  const { user, profile, activeWorkspace, workspaces, setActiveWorkspaceId, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const creditBalance = profile?.credit_balance ?? 0;
  // Compute plan credits from plan_key
  const planCredits = useMemo(() => {
    const key = profile?.plan_key || 'pro';
    if (key === 'agency') return 35000;
    if (key === 'pro') return 15000;
    return 5000;
  }, [profile?.plan_key]);
  const creditPct = planCredits > 0 ? Math.round(((planCredits - creditBalance) / planCredits) * 100) : 0;
  const daysUntilReset = useMemo(() => {
    if (!profile?.credits_reset_at) return null;
    const resetDate = new Date(profile.credits_reset_at);
    resetDate.setDate(resetDate.getDate() + 30);
    const diff = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [profile?.credits_reset_at]);
  const creditWarning = planCredits > 0 && creditBalance / planCredits < 0.2;
  const creditEmpty = creditBalance <= 0;


  // Load notifications
  useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(notifs || []);
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      setReadIds(new Set((reads || []).map((r: any) => r.notification_id)));
    };
    loadNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAsRead = async (notifId: string) => {
    if (readIds.has(notifId) || !user) return;
    await supabase.from('notification_reads').insert({ notification_id: notifId, user_id: user.id });
    setReadIds(prev => new Set([...prev, notifId]));
  };

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
              <SidebarTrigger className="hidden md:flex mr-1" />
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

            <div className="flex-1 flex justify-center min-w-0">
              <DashboardNavbar />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Credit Balance Widget */}
              <div className="relative">
                <button
                  onClick={() => setShowCredits(!showCredits)}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    creditEmpty
                      ? 'bg-destructive/10 text-destructive'
                      : creditWarning
                        ? 'bg-[hsl(var(--brand-yellow))]/10 text-[hsl(var(--brand-yellow))]'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {creditEmpty ? <X size={12} /> : creditWarning ? <AlertTriangle size={12} /> : <Zap size={12} />}
                  {creditEmpty
                    ? t('ক্রেডিট নেই', 'No credits')
                    : `${creditBalance.toLocaleString()}`
                  }
                </button>
                {showCredits && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCredits(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-warm-lg p-4 min-w-[240px] space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-primary" />
                        <span className="text-sm font-bold text-foreground">{creditBalance.toLocaleString()} {t('ক্রেডিট বাকি', 'credits remaining')}</span>
                      </div>
                      <div className="space-y-1">
                        <Progress value={creditPct} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground">{creditPct}% {t('ব্যবহৃত', 'used')}</p>
                      </div>
                      {daysUntilReset !== null && (
                        <p className="text-[11px] text-muted-foreground">
                          {t(`${daysUntilReset} দিনে রিসেট হবে`, `Resets in ${daysUntilReset} days`)}
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
                        <button onClick={() => { setShowCredits(false); navigate('/dashboard/credits'); }}
                          className="text-xs text-primary hover:underline text-left">
                          {t('ব্যবহার দেখুন →', 'View Usage →')}
                        </button>
                        <button onClick={() => { setShowCredits(false); navigate('/pricing'); }}
                          className="text-xs text-primary hover:underline text-left">
                          {t('প্ল্যান আপগ্রেড করুন →', 'Upgrade Plan →')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {profile?.plan && (
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {profile.plan}
                </span>
              )}
              <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors" aria-label="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 sm:p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold rounded-full px-1">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-warm-lg w-72 sm:w-80 max-h-[400px] overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h4 className="text-sm font-semibold text-foreground">{t('নোটিফিকেশন', 'Notifications')}</h4>
                        <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center">
                            <Bell size={24} className="text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground font-body-bn">{t('নতুন কোনো নোটিফিকেশন নেই', 'No new notifications')}</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <button
                              key={n.id}
                              onClick={() => markAsRead(n.id)}
                              className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${!readIds.has(n.id) ? 'bg-primary/5' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                {!readIds.has(n.id) && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

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

          <main className={`flex-1 bg-background overflow-auto ${
            location.pathname === '/dashboard/chat' || location.pathname === '/dashboard/calendar'
              ? 'p-0 pb-14 md:pb-0' 
              : 'p-3 sm:p-6 md:p-8 pb-20 md:pb-8'
          }`}>
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
