import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Package, Check, Pencil, Loader2, TrendingUp, Users, DollarSign, Search } from 'lucide-react';
import { format } from 'date-fns';

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  price_bdt: number;
  is_active: boolean;
  sort_order: number;
};

type PackPurchase = {
  id: string;
  user_id: string;
  credits: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  credit_packs: { name: string } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

export default function AdminCreditPacks() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [purchases, setPurchases] = useState<PackPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CreditPack>>({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Revenue stats
  const [revenue, setRevenue] = useState({ totalBDT: 0, totalUSD: 0, count: 0, popularPack: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: packsData }, { data: purchasesData }] = await Promise.all([
      supabase.from('credit_packs').select('*').order('sort_order'),
      supabase.from('credit_pack_purchases').select('*, credit_packs(name)').order('created_at', { ascending: false }).limit(100),
    ]);

    setPacks((packsData || []) as any);
    const allPurchases = (purchasesData || []) as any;
    setPurchases(allPurchases);

    // Compute revenue stats for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPurchases = allPurchases.filter((p: any) => p.status === 'paid' && new Date(p.created_at) >= startOfMonth);
    const bdtRevenue = monthPurchases.filter((p: any) => p.currency === 'BDT').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const usdRevenue = monthPurchases.filter((p: any) => p.currency !== 'BDT').reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Most popular pack
    const packCounts: Record<string, number> = {};
    monthPurchases.forEach((p: any) => {
      const name = p.credit_packs?.name || 'Unknown';
      packCounts[name] = (packCounts[name] || 0) + 1;
    });
    const popular = Object.entries(packCounts).sort((a, b) => b[1] - a[1])[0];

    setRevenue({
      totalBDT: bdtRevenue,
      totalUSD: usdRevenue,
      count: monthPurchases.length,
      popularPack: popular ? popular[0] : '—',
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStartEdit = (pack: CreditPack) => {
    setEditingId(pack.id);
    setEditValues({ name: pack.name, credits: pack.credits, price_usd: pack.price_usd, price_bdt: pack.price_bdt });
  };

  const handleSaveEdit = async (packId: string) => {
    setSaving(true);
    const { error } = await supabase.from('credit_packs').update({
      name: editValues.name,
      credits: editValues.credits,
      price_usd: editValues.price_usd,
      price_bdt: editValues.price_bdt,
    }).eq('id', packId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Pack updated');
    setEditingId(null);
    fetchData();
  };

  const handleToggleActive = async (pack: CreditPack) => {
    await supabase.from('credit_packs').update({ is_active: !pack.is_active }).eq('id', pack.id);
    toast.success(pack.is_active ? 'Pack hidden' : 'Pack visible');
    fetchData();
  };

  const filteredPurchases = statusFilter === 'all' ? purchases : purchases.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ক্রেডিট প্যাক ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground mt-1">ক্রেডিট প্যাক পরিচালনা, ক্রয় ইতিহাস এবং রাজস্ব দেখুন</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign size={12} /> BDT Revenue (Month)</p>
            <p className="text-xl font-bold text-foreground">৳{revenue.totalBDT.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign size={12} /> USD Revenue (Month)</p>
            <p className="text-xl font-bold text-foreground">${revenue.totalUSD.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users size={12} /> Purchases (Month)</p>
            <p className="text-xl font-bold text-foreground">{revenue.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp size={12} /> Most Popular</p>
            <p className="text-xl font-bold text-primary">{revenue.popularPack}</p>
          </CardContent>
        </Card>
      </div>

      {/* Packs Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            ক্রেডিট প্যাক
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>নাম</TableHead>
                <TableHead>ক্রেডিট</TableHead>
                <TableHead>USD</TableHead>
                <TableHead>BDT</TableHead>
                <TableHead>সক্রিয়</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map(pack => (
                <TableRow key={pack.id} className={pack.is_active ? '' : 'opacity-40'}>
                  <TableCell>
                    {editingId === pack.id ? (
                      <Input value={editValues.name || ''} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className="h-7 w-28 text-sm" />
                    ) : (
                      <span className="font-medium">{pack.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === pack.id ? (
                      <Input type="number" value={editValues.credits || 0} onChange={e => setEditValues(v => ({ ...v, credits: parseInt(e.target.value) || 0 }))} className="h-7 w-20 text-sm" />
                    ) : (
                      pack.credits.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === pack.id ? (
                      <Input type="number" value={editValues.price_usd || 0} onChange={e => setEditValues(v => ({ ...v, price_usd: parseFloat(e.target.value) || 0 }))} className="h-7 w-20 text-sm" />
                    ) : (
                      `$${pack.price_usd}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === pack.id ? (
                      <Input type="number" value={editValues.price_bdt || 0} onChange={e => setEditValues(v => ({ ...v, price_bdt: parseFloat(e.target.value) || 0 }))} className="h-7 w-20 text-sm" />
                    ) : (
                      `৳${pack.price_bdt.toLocaleString()}`
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={pack.is_active} onCheckedChange={() => handleToggleActive(pack)} />
                  </TableCell>
                  <TableCell>
                    {editingId === pack.id ? (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(pack.id)} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStartEdit(pack)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              ক্রয় ইতিহাস
            </CardTitle>
            <div className="flex gap-1">
              {['all', 'paid', 'pending', 'failed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : filteredPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">কোনো ক্রয় নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>প্যাক</TableHead>
                    <TableHead>ক্রেডিট</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{format(new Date(p.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>{p.credit_packs?.name || '—'}</TableCell>
                      <TableCell className="text-green-600 font-semibold">+{p.credits.toLocaleString()}</TableCell>
                      <TableCell>{p.currency === 'BDT' ? '৳' : '$'}{Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          p.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                          p.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                          'bg-amber-500/10 text-amber-600'
                        }>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
