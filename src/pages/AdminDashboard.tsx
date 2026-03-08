import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, BarChart3, CreditCard, Shield, ArrowLeft, Search,
  Crown, ChevronLeft, ChevronRight, Loader2, TrendingUp, Activity,
  Zap, UserPlus, Trash2, RefreshCw
} from 'lucide-react';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

type Tab = 'overview' | 'users' | 'payments' | 'roles';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const callAdmin = useCallback(async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-panel', {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.message_en || 'Admin action failed');
    return data;
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await callAdmin('get_stats');
      setStats(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [callAdmin]);

  const loadUsers = useCallback(async (page = 1) => {
    try {
      const data = await callAdmin('list_users', { page });
      setUsers(data.users || []);
      setUsersTotal(data.total || 0);
      setUsersPage(page);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [callAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([loadStats(), loadUsers()]).finally(() => setLoading(false));
    }
  }, [isAdmin, loadStats, loadUsers]);

  const handleAddRole = async (targetUserId: string, role: string) => {
    setActionLoading(`add-${targetUserId}-${role}`);
    try {
      await callAdmin('add_role', { target_user_id: targetUserId, role });
      toast.success(t('রোল যোগ হয়েছে!', 'Role added!'));
      await loadUsers(usersPage);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async (targetUserId: string, role: string) => {
    setActionLoading(`remove-${targetUserId}-${role}`);
    try {
      await callAdmin('remove_role', { target_user_id: targetUserId, role });
      toast.success(t('রোল সরানো হয়েছে!', 'Role removed!'));
      await loadUsers(usersPage);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePlan = async (targetUserId: string, plan: string) => {
    setActionLoading(`plan-${targetUserId}`);
    try {
      await callAdmin('update_user_plan', { target_user_id: targetUserId, plan });
      toast.success(t('প্ল্যান আপডেট হয়েছে!', 'Plan updated!'));
      await Promise.all([loadUsers(usersPage), loadStats()]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield size={48} className="text-destructive" />
        <h1 className="text-xl font-bold">{t('অ্যাক্সেস নেই', 'Access Denied')}</h1>
        <button onClick={() => navigate('/dashboard')} className="text-primary hover:underline">{t('ড্যাশবোর্ডে ফিরুন', 'Back to Dashboard')}</button>
      </div>
    );
  }

  const filteredUsers = searchQuery
    ? users.filter(u => 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const tabs: { id: Tab; icon: any; bn: string; en: string }[] = [
    { id: 'overview', icon: BarChart3, bn: 'ওভারভিউ', en: 'Overview' },
    { id: 'users', icon: Users, bn: 'ইউজার', en: 'Users' },
    { id: 'roles', icon: Shield, bn: 'রোল', en: 'Roles' },
    { id: 'payments', icon: CreditCard, bn: 'পেমেন্ট', en: 'Payments' },
  ];

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive',
    moderator: 'bg-brand-purple/10 text-brand-purple',
    user: 'bg-secondary text-muted-foreground',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              <h1 className="font-bold font-heading-en text-lg">
                <span className="text-foreground">Ad</span>
                <span className="text-primary">Dhoom</span>
                <span className="text-muted-foreground ml-2 text-sm font-normal">{t('অ্যাডমিন', 'Admin')}</span>
              </h1>
            </div>
          </div>
          <button onClick={() => { loadStats(); loadUsers(usersPage); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <tab.icon size={16} />
              {t(tab.bn, tab.en)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: { bn: 'মোট ইউজার', en: 'Total Users' }, value: stats.total_users, icon: Users, color: 'text-primary' },
                    { label: { bn: 'মোট রেভিনিউ', en: 'Total Revenue' }, value: `৳${toBengali(stats.total_revenue_bdt)}`, icon: TrendingUp, color: 'text-brand-green' },
                    { label: { bn: 'মোট বিজ্ঞাপন', en: 'Total Ads' }, value: stats.total_ads, icon: Zap, color: 'text-brand-yellow' },
                    { label: { bn: '৭ দিনে ব্যবহার', en: '7-Day Usage' }, value: stats.recent_usage_7d, icon: Activity, color: 'text-brand-purple' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card rounded-2xl shadow-warm p-5 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <stat.icon size={20} className={stat.color} />
                      </div>
                      <div className="text-2xl font-mono font-bold text-foreground">
                        {typeof stat.value === 'number' ? toBengali(stat.value) : stat.value}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-body-bn">{t(stat.label.bn, stat.label.en)}</p>
                    </div>
                  ))}
                </div>

                {/* Plan Breakdown */}
                <div className="bg-card rounded-2xl shadow-warm p-6 border border-border">
                  <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('প্ল্যান বিভাজন', 'Plan Breakdown')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(stats.plan_breakdown || {}).map(([plan, count]) => (
                      <div key={plan} className="bg-secondary/50 rounded-xl p-4 text-center">
                        <div className="text-xl font-mono font-bold text-foreground">{toBengali(count as number)}</div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{plan}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-card rounded-2xl shadow-warm p-6 border border-border">
                  <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('সাম্প্রতিক পেমেন্ট', 'Recent Payments')}</h3>
                  {stats.recent_payments?.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recent_payments.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                          <div>
                            <span className={`text-xs rounded-full px-2 py-0.5 ${p.status === 'success' ? 'bg-brand-green/10 text-brand-green' : p.status === 'pending' ? 'bg-brand-yellow/10 text-foreground' : 'bg-destructive/10 text-destructive'}`}>
                              {p.status}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">{p.plan_purchased}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono font-bold">৳{toBengali(p.amount_bdt)}</span>
                            <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('কোনো পেমেন্ট নেই', 'No payments yet')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Users */}
            {(activeTab === 'users' || activeTab === 'roles') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('ইউজার খুঁজুন...', 'Search users...')}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t(`মোট ${toBengali(usersTotal)} জন`, `Total ${usersTotal} users`)}
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="bg-card rounded-2xl shadow-warm p-5 border border-border">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-foreground truncate">{u.full_name || t('নামহীন', 'Unnamed')}</h4>
                            {u.roles?.map((role: string) => (
                              <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${roleColors[role] || roleColors.user}`}>
                                {role}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${u.plan === 'free' ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                              {u.plan}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {t('যোগদান:', 'Joined:')} {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {activeTab === 'roles' && (
                            <div className="flex flex-wrap gap-1">
                              {['admin', 'moderator'].map(role => {
                                const hasRole = u.roles?.includes(role);
                                return (
                                  <button
                                    key={role}
                                    onClick={() => hasRole ? handleRemoveRole(u.id, role) : handleAddRole(u.id, role)}
                                    disabled={actionLoading === `add-${u.id}-${role}` || actionLoading === `remove-${u.id}-${role}`}
                                    className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                      hasRole 
                                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                                  >
                                    {hasRole ? <Trash2 size={10} /> : <UserPlus size={10} />}
                                    {hasRole ? t(`${role} সরান`, `Remove ${role}`) : t(`${role} দিন`, `Add ${role}`)}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {activeTab === 'users' && (
                            <div className="flex gap-1">
                              {['free', 'pro', 'agency'].map(plan => (
                                <button
                                  key={plan}
                                  onClick={() => handleUpdatePlan(u.id, plan)}
                                  disabled={u.plan === plan || actionLoading === `plan-${u.id}`}
                                  className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider transition-colors disabled:opacity-30 ${
                                    u.plan === plan ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                  }`}
                                >
                                  {plan}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {usersTotal > 20 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button onClick={() => loadUsers(usersPage - 1)} disabled={usersPage <= 1}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <span className="text-sm text-muted-foreground">{toBengali(usersPage)} / {toBengali(Math.ceil(usersTotal / 20))}</span>
                    <button onClick={() => loadUsers(usersPage + 1)} disabled={usersPage * 20 >= usersTotal}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-2xl shadow-warm p-5 border border-border">
                    <div className="text-2xl font-mono font-bold text-brand-green">৳{toBengali(stats.total_revenue_bdt)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('মোট রেভিনিউ', 'Total Revenue')}</p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-warm p-5 border border-border">
                    <div className="text-2xl font-mono font-bold text-foreground">{toBengali(stats.total_payments)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('সফল পেমেন্ট', 'Successful Payments')}</p>
                  </div>
                </div>

                <div className="bg-card rounded-2xl shadow-warm p-6 border border-border">
                  <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('সব পেমেন্ট', 'All Payments')}</h3>
                  {stats.recent_payments?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="pb-2">{t('তারিখ', 'Date')}</th>
                            <th className="pb-2">{t('প্ল্যান', 'Plan')}</th>
                            <th className="pb-2">{t('পরিমাণ', 'Amount')}</th>
                            <th className="pb-2">{t('স্ট্যাটাস', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_payments.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="py-3 uppercase text-xs font-bold">{p.plan_purchased}</td>
                              <td className="py-3 font-mono">৳{toBengali(p.amount_bdt)}</td>
                              <td className="py-3">
                                <span className={`text-xs rounded-full px-2 py-0.5 ${p.status === 'success' ? 'bg-brand-green/10 text-brand-green' : 'bg-destructive/10 text-destructive'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('কোনো পেমেন্ট নেই', 'No payments')}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
