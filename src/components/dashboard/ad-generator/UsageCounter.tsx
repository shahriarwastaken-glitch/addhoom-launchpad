import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const UsageCounter = () => {
  const { profile } = useAuth();
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchUsage = async () => {
      setLoading(true);
      try {
        // Get plan limits
        const planKey = (profile as any).plan_key || profile.plan || 'pro';
        const { data: plan } = await supabase
          .from('plans')
          .select('limits')
          .eq('plan_key', planKey)
          .single();

        const imgLimit = plan?.limits && typeof plan.limits === 'object'
          ? (plan.limits as any).image_generation
          : null;

        if (imgLimit?.type === 'number') {
          setLimit(imgLimit.value);
        } else if (imgLimit?.type === 'unlimited' || !imgLimit) {
          setLimit(null); // unlimited
        } else if (imgLimit?.type === 'disabled') {
          setLimit(0);
        }

        // Get this month's usage
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count } = await supabase
          .from('usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('feature', 'image_generator')
          .gte('created_at', monthStart);

        setUsed(count || 0);
      } catch (e) {
        console.error('Usage fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, [profile]);

  if (loading) return null;

  const remaining = limit !== null ? Math.max(0, limit - used) : null;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const isLow = remaining !== null && remaining <= 3;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
      isLow ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-secondary text-muted-foreground'
    }`}>
      <ImageIcon size={13} />
      {limit === null ? (
        <span>{used} generated · Unlimited</span>
      ) : limit === 0 ? (
        <span>Image generation not available</span>
      ) : (
        <>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden min-w-[60px]">
            <div
              className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span>{remaining} left</span>
        </>
      )}
    </div>
  );
};

export default UsageCounter;
