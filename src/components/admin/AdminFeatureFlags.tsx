import { useState, useEffect } from 'react';
import { Flag, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  global_enabled: boolean;
  plan_overrides: Record<string, boolean>;
  user_overrides: Record<string, boolean>;
  updated_at: string;
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: '', name: '', description: '', global_enabled: true });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name');

      if (error) throw error;
      setFlags((data || []).map(f => ({
        ...f,
        plan_overrides: (f.plan_overrides as Record<string, boolean>) || {},
        user_overrides: (f.user_overrides as Record<string, boolean>) || {}
      })));
    } catch (err: any) {
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobal = async (flag: FeatureFlag) => {
    const newValue = !flag.global_enabled;
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ global_enabled: newValue, updated_at: new Date().toISOString() })
        .eq('id', flag.id);

      if (error) throw error;
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, global_enabled: newValue } : f));
      toast.success(`${flag.name} ${newValue ? 'enabled' : 'disabled'} globally`);
    } catch (err: any) {
      toast.error('Failed to update flag');
    }
  };

  const togglePlanOverride = async (flag: FeatureFlag, planKey: string) => {
    const currentOverrides = { ...flag.plan_overrides };
    if (currentOverrides[planKey] === undefined) {
      currentOverrides[planKey] = !flag.global_enabled;
    } else {
      delete currentOverrides[planKey];
    }

    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ plan_overrides: currentOverrides, updated_at: new Date().toISOString() })
        .eq('id', flag.id);

      if (error) throw error;
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, plan_overrides: currentOverrides } : f));
    } catch (err: any) {
      toast.error('Failed to update plan override');
    }
  };

  const handleAddFlag = async () => {
    if (!newFlag.flag_key || !newFlag.name) {
      toast.error('Key and name are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_flags')
        .insert([newFlag]);

      if (error) throw error;
      toast.success('Flag created');
      setShowAddModal(false);
      setNewFlag({ flag_key: '', name: '', description: '', global_enabled: true });
      fetchFlags();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create flag');
    }
  };

  const planKeys = ['pro', 'agency'];

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Feature Flags</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">Turn features on/off without code deployment</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Flag
        </Button>
      </div>

      {/* Flags Table */}
      <div className="space-y-3">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Flag Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold truncate">{flag.name}</h3>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded hidden md:inline">
                      {flag.flag_key}
                    </code>
                  </div>
                  {flag.description && (
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  )}
                </div>

                {/* Global Toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Global</Label>
                    <Switch
                      checked={flag.global_enabled}
                      onCheckedChange={() => toggleGlobal(flag)}
                    />
                  </div>
                </div>

                {/* Plan Overrides */}
                <div className="flex items-center gap-2">
                  {planKeys.map(plan => {
                    const isOverridden = flag.plan_overrides[plan] !== undefined;
                    const isEnabled = isOverridden ? flag.plan_overrides[plan] : flag.global_enabled;
                    
                    return (
                      <button
                        key={plan}
                        onClick={() => togglePlanOverride(flag, plan)}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          isEnabled
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                        }`}
                      >
                        {plan.charAt(0).toUpperCase() + plan.slice(1)} {isEnabled ? '✓' : '✗'}
                      </button>
                    );
                  })}
                </div>

                {/* User Overrides Count */}
                {Object.keys(flag.user_overrides).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {Object.keys(flag.user_overrides).length} user overrides
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {flags.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No feature flags configured</p>
        </div>
      )}

      {/* Add Flag Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Flag Key</Label>
              <Input
                value={newFlag.flag_key}
                onChange={(e) => setNewFlag(prev => ({ ...prev, flag_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="my_feature_flag"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={newFlag.name}
                onChange={(e) => setNewFlag(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Feature"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newFlag.description}
                onChange={(e) => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What this flag controls"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newFlag.global_enabled}
                onCheckedChange={(v) => setNewFlag(prev => ({ ...prev, global_enabled: v }))}
              />
              <Label>Enabled by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddFlag}>Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
