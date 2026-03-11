import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Coins, Search, Plus, Check, Pencil, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type CreditCost = {
  id: string;
  action_key: string;
  action_label: string;
  credits: number;
  category: string;
  is_active: boolean;
  updated_at: string;
};

type UserResult = {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string;
  credit_balance: number;
  credits_reset_at: string | null;
};

export default function AdminCredits() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<CreditCost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAction, setNewAction] = useState({ action_key: '', action_label: '', credits: 10, category: 'generation' });

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Adjust modal
  const [adjustUser, setAdjustUser] = useState<UserResult | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Stats
  const [stats, setStats] = useState({ issued: 0, consumed: 0, avgPerUser: 0, topUsers: [] as any[] });

  const fetchCosts = useCallback(async () => {
    const { data } = await supabase.from('credit_costs').select('*').order('category');
    if (data) setCosts(data as any);
  }, []);

  const fetchStats = useCallback(async () => {
    // Get this month's transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: txs } = await supabase
      .from('credit_transactions')
      .select('user_id, credits_delta, transaction_type')
      .gte('created_at', startOfMonth.toISOString());

    if (txs) {
      const issued = txs.filter(t => t.credits_delta > 0).reduce((s, t) => s + t.credits_delta, 0);
      const consumed = txs.filter(t => t.credits_delta < 0).reduce((s, t) => s + Math.abs(t.credits_delta), 0);
      const userSet = new Set(txs.map(t => t.user_id));

      // Top consumers
      const userConsumption: Record<string, number> = {};
      txs.filter(t => t.credits_delta < 0).forEach(t => {
        userConsumption[t.user_id] = (userConsumption[t.user_id] || 0) + Math.abs(t.credits_delta);
      });
      const topEntries = Object.entries(userConsumption).sort((a, b) => b[1] - a[1]).slice(0, 5);

      setStats({
        issued,
        consumed,
        avgPerUser: userSet.size > 0 ? Math.round(consumed / userSet.size) : 0,
        topUsers: topEntries.map(([uid, credits]) => ({ user_id: uid, credits })),
      });
    }
  }, []);

  useEffect(() => { fetchCosts(); fetchStats(); }, [fetchCosts, fetchStats]);

  const handleSaveCredits = async (cost: CreditCost) => {
    setSaving(true);
    const newCredits = parseInt(editValue);
    if (isNaN(newCredits) || newCredits < 0) {
      toast.error('Invalid credit value');
      setSaving(false);
      return;
    }
    await supabase.from('credit_costs').update({ credits: newCredits, updated_at: new Date().toISOString(), updated_by: user?.id }).eq('id', cost.id);
    setEditingId(null);
    setSaving(false);
    toast.success('Saved ✓');
    fetchCosts();
  };

  const handleToggleActive = async (cost: CreditCost) => {
    await supabase.from('credit_costs').update({ is_active: !cost.is_active }).eq('id', cost.id);
    fetchCosts();
  };

  const handleAddAction = async () => {
    if (!newAction.action_key || !newAction.action_label) {
      toast.error('Fill all fields');
      return;
    }
    await supabase.from('credit_costs').insert({ ...newAction, updated_by: user?.id });
    setShowAddForm(false);
    setNewAction({ action_key: '', action_label: '', credits: 10, category: 'generation' });
    toast.success('Action added');
    fetchCosts();
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan, credit_balance, credits_reset_at')
      .or(`email.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`)
      .limit(10);
    setSearchResults((data || []) as any);
    setSearching(false);
  };

  const handleAdjust = async () => {
    if (!adjustUser || !adjustAmount || !adjustReason) {
      toast.error('Fill all fields');
      return;
    }
    setAdjusting(true);
    const { data, error } = await supabase.rpc('admin_adjust_credits', {
      p_admin_id: user!.id,
      p_user_id: adjustUser.id,
      p_credits_delta: adjustAmount,
      p_description: adjustReason,
    });
    setAdjusting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Credits adjusted: ${data.balance_before} → ${data.balance_after}`);
    setAdjustUser(null);
    setAdjustAmount(0);
    setAdjustReason('');
    handleSearchUsers();
  };

  const categoryColors: Record<string, string> = {
    generation: 'bg-primary/10 text-primary',
    video: 'bg-purple-500/10 text-purple-500',
    copy: 'bg-emerald-500/10 text-emerald-500',
    enhancement: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ক্রেডিট ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground mt-1">ক্রেডিট খরচ, ব্যবহারকারী ব্যালেন্স এবং ব্যবহারের পরিসংখ্যান পরিচালনা করুন</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">ইস্যুকৃত (এই মাস)</p>
            <p className="text-xl font-bold text-foreground">{stats.issued.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">ব্যবহৃত (এই মাস)</p>
            <p className="text-xl font-bold text-foreground">{stats.consumed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">গড় প্রতি ব্যবহারকারী</p>
            <p className="text-xl font-bold text-foreground">{stats.avgPerUser.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">শীর্ষ ব্যবহারকারী</p>
            <p className="text-xl font-bold text-foreground">{stats.topUsers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Costs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              ক্রেডিট খরচ
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> নতুন অ্যাকশন
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="mb-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="action_key (slug)" value={newAction.action_key} onChange={e => setNewAction(p => ({ ...p, action_key: e.target.value }))} />
                <Input placeholder="Action Label" value={newAction.action_label} onChange={e => setNewAction(p => ({ ...p, action_label: e.target.value }))} />
                <Input type="number" placeholder="Credits" value={newAction.credits} onChange={e => setNewAction(p => ({ ...p, credits: parseInt(e.target.value) || 0 }))} />
                <Select value={newAction.category} onValueChange={v => setNewAction(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="copy">Copy</SelectItem>
                    <SelectItem value="enhancement">Enhancement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleAddAction}>Add Action</Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>অ্যাকশন</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead>ক্রেডিট</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map(cost => (
                <TableRow key={cost.id} className={cost.is_active ? '' : 'opacity-40'}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{cost.action_label}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{cost.action_key}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={categoryColors[cost.category] || ''}>
                      {cost.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingId === cost.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-20 h-7 text-sm"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveCredits(cost)}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveCredits(cost)} disabled={saving}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(cost.id); setEditValue(String(cost.credits)); }}
                        className="flex items-center gap-1 text-sm font-semibold hover:text-primary transition-colors"
                      >
                        {cost.credits} <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={cost.is_active} onCheckedChange={() => handleToggleActive(cost)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Credit Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            ব্যবহারকারী ক্রেডিট
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ইমেইল বা নাম দিয়ে খুঁজুন..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
            />
            <Button onClick={handleSearchUsers} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchResults.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-medium">{u.full_name || 'No name'}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{u.plan}</Badge>
                  <span className="text-xs font-semibold">{u.credit_balance.toLocaleString()} credits</span>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setAdjustUser(u); setAdjustAmount(0); setAdjustReason(''); }}>
                +/- ক্রেডিট
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Adjust Credits Modal */}
      <Dialog open={!!adjustUser} onOpenChange={() => setAdjustUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ক্রেডিট সমন্বয় — {adjustUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">বর্তমান ব্যালেন্স</p>
              <p className="text-2xl font-bold">{adjustUser?.credit_balance.toLocaleString()}</p>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {[500, 1000, 5000].map(v => (
                <Button key={v} size="sm" variant="outline" onClick={() => setAdjustAmount(v)}>+{v}</Button>
              ))}
              {[-500, -1000].map(v => (
                <Button key={v} size="sm" variant="outline" className="text-destructive" onClick={() => setAdjustAmount(v)}>{v}</Button>
              ))}
            </div>

            <Input
              type="number"
              placeholder="Custom amount (+ or -)"
              value={adjustAmount || ''}
              onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)}
            />

            <Select value={adjustReason} onValueChange={setAdjustReason}>
              <SelectTrigger><SelectValue placeholder="কারণ নির্বাচন করুন" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Compensation">Compensation</SelectItem>
                <SelectItem value="Bonus">Bonus</SelectItem>
                <SelectItem value="Error correction">Error correction</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {adjustAmount !== 0 && adjustUser && (
              <p className="text-center text-sm text-muted-foreground">
                ব্যালেন্স পরিবর্তন: {adjustUser.credit_balance.toLocaleString()} → {Math.max(0, adjustUser.credit_balance + adjustAmount).toLocaleString()}
              </p>
            )}

            <div className="flex gap-2">
              {adjustAmount > 0 ? (
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleAdjust} disabled={adjusting || !adjustReason}>
                  <TrendingUp className="h-4 w-4 mr-1" /> ক্রেডিট যোগ করুন
                </Button>
              ) : adjustAmount < 0 ? (
                <Button className="flex-1" variant="destructive" onClick={handleAdjust} disabled={adjusting || !adjustReason}>
                  <TrendingDown className="h-4 w-4 mr-1" /> ক্রেডিট কমান
                </Button>
              ) : (
                <Button className="flex-1" disabled>পরিমাণ লিখুন</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
