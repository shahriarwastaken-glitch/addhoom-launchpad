import { useState, useEffect } from 'react';
import { Plus, Ticket, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  name: string | null;
  discount_type: string;
  discount_value: number;
  applicable_plans: string[] | null;
  applicable_billing: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  total_uses: number;
  total_revenue_bdt: number;
  expires_at: string | null;
  is_active: boolean;
  new_users_only: boolean;
}

const emptyForm = {
  code: '',
  name: '',
  discount_type: 'fixed',
  discount_value: 0,
  applicable_plans: [] as string[],
  applicable_billing: 'both',
  usage_limit: null as number | null,
  usage_limit_per_user: 1,
  expires_at: '',
  new_users_only: false,
  unlimited_uses: false,
  no_expiry: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (err: any) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'DHOOM';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(prev => ({ ...prev, code }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (form.discount_value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        applicable_plans: form.applicable_plans.length > 0 ? form.applicable_plans : null,
        applicable_billing: form.applicable_billing,
        usage_limit: form.unlimited_uses ? null : form.usage_limit,
        usage_limit_per_user: form.usage_limit_per_user,
        expires_at: form.no_expiry ? null : form.expires_at ? new Date(form.expires_at).toISOString() : null,
        new_users_only: form.new_users_only,
        is_active: true,
      };

      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) throw error;

      toast.success('Coupon created');
      setShowModal(false);
      setForm({ ...emptyForm });
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create coupon');
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err: any) {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      fetchCoupons();
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Coupon Codes</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Coupon Codes</h1>
          <p className="text-muted-foreground">Manage discount codes for payments</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm }); setShowModal(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="font-mono font-bold text-primary">{c.code}</code>
                      {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                    </TableCell>
                    <TableCell>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`}
                    </TableCell>
                    <TableCell>
                      {c.total_uses}{c.usage_limit ? `/${c.usage_limit}` : ''}
                    </TableCell>
                    <TableCell>৳{Number(c.total_revenue_bdt || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(c)}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {coupons.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No coupons yet</p>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="DHOOM50"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={generateRandomCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Eid 2025 Campaign" />
            </div>
            <div>
              <Label>Discount Type</Label>
              <RadioGroup value={form.discount_type} onValueChange={(v) => setForm(p => ({ ...p, discount_type: v }))} className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="pct" />
                  <Label htmlFor="pct">Percentage (%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Fixed Amount (৳)</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Discount Value</Label>
              <Input
                type="number"
                min="1"
                value={form.discount_value || ''}
                onChange={(e) => setForm(p => ({ ...p, discount_value: parseInt(e.target.value) || 0 }))}
                placeholder={form.discount_type === 'percentage' ? '50' : '500'}
              />
            </div>
            <div>
              <Label>Billing Cycle</Label>
              <RadioGroup value={form.applicable_billing} onValueChange={(v) => setForm(p => ({ ...p, applicable_billing: v }))} className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="annual" id="annual" />
                  <Label htmlFor="annual">Annual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both">Both</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Usage Limit</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.unlimited_uses} onCheckedChange={(v) => setForm(p => ({ ...p, unlimited_uses: v }))} />
                  <span className="text-sm">{form.unlimited_uses ? 'Unlimited' : 'Limited'}</span>
                </div>
                {!form.unlimited_uses && (
                  <Input type="number" min="1" className="mt-2" value={form.usage_limit || ''} onChange={(e) => setForm(p => ({ ...p, usage_limit: parseInt(e.target.value) || null }))} />
                )}
              </div>
              <div>
                <Label>Per User Limit</Label>
                <Input type="number" min="1" className="mt-1" value={form.usage_limit_per_user || 1} onChange={(e) => setForm(p => ({ ...p, usage_limit_per_user: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={!form.no_expiry} onCheckedChange={(v) => setForm(p => ({ ...p, no_expiry: !v }))} />
                <Label>{form.no_expiry ? 'No expiry' : 'Has expiry'}</Label>
              </div>
              {!form.no_expiry && (
                <Input type="date" value={form.expires_at} onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.new_users_only} onCheckedChange={(v) => setForm(p => ({ ...p, new_users_only: v }))} />
              <Label>New users only</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
