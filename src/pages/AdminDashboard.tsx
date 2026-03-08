import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, BarChart3, CreditCard, Shield, ArrowLeft, Search,
  ChevronLeft, ChevronRight, Loader2, TrendingUp, Activity,
  Zap, UserPlus, Trash2, RefreshCw, Key, Plus, Eye, EyeOff,
  Pencil, Check, X, Power
} from 'lucide-react';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

type Tab = 'overview' | 'users' | 'payments' | 'roles' | 'api_keys';

type ApiKey = {
  id: string;
  key_name: string;
  key_value: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editKeyData, setEditKeyData] = useState({ key_name: '', key_value: '', description: '' });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

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
    } catch (e: any) { toast.error(e.message); }
  }, [callAdmin]);

  const loadUsers = useCallback(async (page = 1) => {
    try {
      const data = await callAdmin('list_users', { page });
      setUsers(data.users || []);
      setUsersTotal(data.total || 0);
      setUsersPage(page);
    } catch (e: any) { toast.error(e.message); }
  }, [callAdmin]);

  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const data = await callAdmin('list_api_keys');
      setApiKeys(data.keys || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setApiKeysLoading(false); }
  }, [callAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([loadStats(), loadUsers()]).finally(() => setLoading(false));
    }
  }, [isAdmin, loadStats, loadUsers]);

  useEffect(() => {
    if (isAdmin && activeTab === 'api_keys') loadApiKeys();
  }, [isAdmin, activeTab, loadApiKeys]);

  // User actions
  const handleAddRole = async (targetUserId: string, role: string) => {
    setActionLoading(`add-${targetUserId}-${role}`);
    try {
      await callAdmin('add_role', { target_user_id: targetUserId, role });
      toast.success(t('রোল যোগ হয়েছে!', 'Role added!'));
      await loadUsers(usersPage);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const handleRemoveRole = async (targetUserId: string, role: string) => {
    setActionLoading(`remove-${targetUserId}-${role}`);
    try {
      await callAdmin('remove_role', { target_user_id: targetUserId, role });
      toast.success(t('রোল সরানো হয়েছে!', 'Role removed!'));
      await loadUsers(usersPage);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const handleUpdatePlan = async (targetUserId: string, plan: string) => {
    setActionLoading(`plan-${targetUserId}`);
    try {
      await callAdmin('update_user_plan', { target_user_id: targetUserId, plan });
      toast.success(t('প্ল্যান আপডেট হয়েছে!', 'Plan updated!'));
      await Promise.all([loadUsers(usersPage), loadStats()]);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  // API Key actions
  const handleAddApiKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error(t('নাম ও ভ্যালু আবশ্যক', 'Name and value required'));
      return;
    }
    setActionLoading('add-key');
    try {
      await callAdmin('add_api_key', { key_name: newKeyName, key_value: newKeyValue, description: newKeyDesc });
      toast.success(t('API কী যোগ হয়েছে!', 'API key added!'));
      setNewKeyName(''); setNewKeyValue(''); setNewKeyDesc(''); setShowAddKey(false);
      await loadApiKeys();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const handleUpdateApiKey = async () => {
    if (!editingKeyId) return;
    setActionLoading(`edit-${editingKeyId}`);
    try {
      await callAdmin('update_api_key', {
        key_id: editingKeyId,
        key_name: editKeyData.key_name,
        key_value: editKeyData.key_value,
        description: editKeyData.description,
      });
      toast.success(t('API কী আপডেট হয়েছে!', 'API key updated!'));
      setEditingKeyId(null);
      await loadApiKeys();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const handleToggleApiKey = async (key: ApiKey) => {
    setActionLoading(`toggle-${key.id}`);
    try {
      await callAdmin('update_api_key', { key_id: key.id, is_active: !key.is_active });
      toast.success(key.is_active
        ? t('API কী নিষ্ক্রিয় করা হয়েছে', 'API key deactivated')
        : t('API কী সক্রিয় করা হয়েছে', 'API key activated')
      );
      await loadApiKeys();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm(t('এই API কী মুছে ফেলতে চান?', 'Delete this API key?'))) return;
    setActionLoading(`delete-${keyId}`);
    try {
      await callAdmin('delete_api_key', { key_id: keyId });
      toast.success(t('API কী মুছে ফেলা হয়েছে!', 'API key deleted!'));
      await loadApiKeys();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(null); }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(keyId) ? next.delete(keyId) : next.add(keyId);
      return next;
    });
  };

  const maskKey = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
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
    { id: 'api_keys', icon: Key, bn: 'API কী', en: 'API Keys' },
  ];

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive',
    moderator: 'bg-primary/10 text-primary',
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
          <button onClick={() => { loadStats(); loadUsers(usersPage); if (activeTab === 'api_keys') loadApiKeys(); }}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: { bn: 'মোট ইউজার', en: 'Total Users' }, value: stats.total_users, icon: Users, color: 'text-primary' },
                    { label: { bn: 'মোট রেভিনিউ', en: 'Total Revenue' }, value: `৳${toBengali(stats.total_revenue_bdt)}`, icon: TrendingUp, color: 'text-brand-green' },
                    { label: { bn: 'মোট বিজ্ঞাপন', en: 'Total Ads' }, value: stats.total_ads, icon: Zap, color: 'text-primary' },
                    { label: { bn: '৭ দিনে ব্যবহার', en: '7-Day Usage' }, value: stats.recent_usage_7d, icon: Activity, color: 'text-primary' },
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

                <div className="bg-card rounded-2xl shadow-warm p-6 border border-border">
                  <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('সাম্প্রতিক পেমেন্ট', 'Recent Payments')}</h3>
                  {stats.recent_payments?.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recent_payments.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                          <div>
                            <span className={`text-xs rounded-full px-2 py-0.5 ${p.status === 'success' ? 'bg-brand-green/10 text-brand-green' : p.status === 'pending' ? 'bg-primary/10 text-foreground' : 'bg-destructive/10 text-destructive'}`}>
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

            {/* Users & Roles */}
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

            {/* API Keys Tab */}
            {activeTab === 'api_keys' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading-bn font-bold text-foreground text-lg">{t('API কী ম্যানেজমেন্ট', 'API Key Management')}</h3>
                  <button
                    onClick={() => setShowAddKey(!showAddKey)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={16} />
                    {t('নতুন কী যোগ করুন', 'Add New Key')}
                  </button>
                </div>

                {/* Add New Key Form */}
                {showAddKey && (
                  <div className="bg-card rounded-2xl shadow-warm p-6 border border-border space-y-4 animate-fade-up">
                    <h4 className="font-semibold text-foreground">{t('নতুন API কী', 'New API Key')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('কী নাম *', 'Key Name *')}</label>
                        <input
                          value={newKeyName}
                          onChange={e => setNewKeyName(e.target.value)}
                          placeholder={t('যেমন: GEMINI_API_KEY', 'e.g., GEMINI_API_KEY')}
                          className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('কী ভ্যালু *', 'Key Value *')}</label>
                        <input
                          type="password"
                          value={newKeyValue}
                          onChange={e => setNewKeyValue(e.target.value)}
                          placeholder="sk-..."
                          className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('বিবরণ (ঐচ্ছিক)', 'Description (optional)')}</label>
                      <input
                        value={newKeyDesc}
                        onChange={e => setNewKeyDesc(e.target.value)}
                        placeholder={t('এই কী কিসের জন্য ব্যবহৃত হয়', 'What is this key used for')}
                        className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleAddApiKey} disabled={actionLoading === 'add-key'}
                        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {actionLoading === 'add-key' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {t('যোগ করুন', 'Add Key')}
                      </button>
                      <button onClick={() => { setShowAddKey(false); setNewKeyName(''); setNewKeyValue(''); setNewKeyDesc(''); }}
                        className="border border-border text-muted-foreground rounded-full px-6 py-2.5 text-sm hover:text-foreground transition-colors">
                        {t('বাতিল', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Keys List */}
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="bg-card rounded-2xl shadow-warm p-12 border border-border text-center">
                    <Key size={40} className="mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-body-bn">{t('কোনো API কী নেই', 'No API keys yet')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map(key => (
                      <div key={key.id} className={`bg-card rounded-2xl shadow-warm p-5 border transition-colors ${key.is_active ? 'border-border' : 'border-destructive/20 opacity-60'}`}>
                        {editingKeyId === key.id ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input value={editKeyData.key_name} onChange={e => setEditKeyData(p => ({ ...p, key_name: e.target.value }))}
                                className="p-2.5 rounded-lg border border-primary bg-background text-foreground text-sm font-mono outline-none" />
                              <input type="text" value={editKeyData.key_value} onChange={e => setEditKeyData(p => ({ ...p, key_value: e.target.value }))}
                                className="p-2.5 rounded-lg border border-primary bg-background text-foreground text-sm font-mono outline-none" />
                            </div>
                            <input value={editKeyData.description} onChange={e => setEditKeyData(p => ({ ...p, description: e.target.value }))}
                              placeholder={t('বিবরণ', 'Description')}
                              className="w-full p-2.5 rounded-lg border border-primary bg-background text-foreground text-sm outline-none" />
                            <div className="flex gap-2">
                              <button onClick={handleUpdateApiKey} disabled={actionLoading === `edit-${key.id}`}
                                className="text-xs bg-brand-green text-white rounded-full px-4 py-1.5 flex items-center gap-1 disabled:opacity-50">
                                <Check size={12} /> {t('সংরক্ষণ', 'Save')}
                              </button>
                              <button onClick={() => setEditingKeyId(null)}
                                className="text-xs bg-secondary text-muted-foreground rounded-full px-4 py-1.5 flex items-center gap-1">
                                <X size={12} /> {t('বাতিল', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Key size={14} className={key.is_active ? 'text-primary' : 'text-muted-foreground'} />
                                  <h4 className="font-mono font-bold text-foreground text-sm">{key.key_name}</h4>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${key.is_active ? 'bg-brand-green/10 text-brand-green' : 'bg-destructive/10 text-destructive'}`}>
                                    {key.is_active ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Inactive')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <code className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                                    {visibleKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                                  </code>
                                  <button onClick={() => toggleKeyVisibility(key.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    {visibleKeys.has(key.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                                {key.description && (
                                  <p className="text-xs text-muted-foreground mt-2">{key.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {t('তৈরি:', 'Created:')} {new Date(key.created_at).toLocaleDateString()}
                                  {key.updated_at !== key.created_at && ` · ${t('আপডেট:', 'Updated:')} ${new Date(key.updated_at).toLocaleDateString()}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => { setEditingKeyId(key.id); setEditKeyData({ key_name: key.key_name, key_value: key.key_value, description: key.description || '' }); }}
                                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={t('এডিট', 'Edit')}>
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleToggleApiKey(key)} disabled={actionLoading === `toggle-${key.id}`}
                                  className={`p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 ${key.is_active ? 'text-brand-green hover:text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                  title={key.is_active ? t('নিষ্ক্রিয় করুন', 'Deactivate') : t('সক্রিয় করুন', 'Activate')}>
                                  <Power size={14} />
                                </button>
                                <button onClick={() => handleDeleteApiKey(key.id)} disabled={actionLoading === `delete-${key.id}`}
                                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50" title={t('মুছুন', 'Delete')}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
