import { useState, useEffect } from 'react';
import { PenLine, ImageIcon, Calendar, Check, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const TodaysLoopWidget = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [counts, setCounts] = useState({ copies: 0, images: 0, scheduled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    const todayStr = new Date().toISOString().split('T')[0];

    Promise.all([
      supabase.from('ad_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace.id)
        .gte('created_at', todayStr + 'T00:00:00'),
      supabase.from('ad_images')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace.id)
        .gte('created_at', todayStr + 'T00:00:00'),
      supabase.from('content_calendar')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace.id)
        .gte('created_at', todayStr + 'T00:00:00'),
    ]).then(([copiesRes, imagesRes, calRes]) => {
      setCounts({
        copies: copiesRes.count || 0,
        images: imagesRes.count || 0,
        scheduled: calRes.count || 0,
      });
      setLoading(false);
    });
  }, [activeWorkspace]);

  const allDone = counts.copies > 0 && counts.images > 0 && counts.scheduled > 0;

  const steps = [
    { icon: PenLine, label: t('কপি তৈরি', 'Copy'), count: counts.copies, countLabel: t('টি কপি', ' copies') },
    { icon: ImageIcon, label: t('ছবি তৈরি', 'Image'), count: counts.images, countLabel: t('টি ছবি', ' images') },
    { icon: Calendar, label: t('শিডিউল', 'Schedule'), count: counts.scheduled, countLabel: t('টি শিডিউল', ' scheduled') },
  ];

  if (loading) return null;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      allDone
        ? 'border-primary/30 bg-primary/[0.03] shadow-[0_0_20px_hsl(var(--primary)/0.08)]'
        : 'border-border bg-card'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-heading-bn text-foreground">
          {t("আজকের লুপ", "Today's Loop")}
        </h3>
        {allDone && (
          <span className="text-xs font-heading-bn font-semibold text-primary animate-pulse">
            🔥 {t('লুপ সম্পন্ন!', 'Loop Complete!')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const active = step.count > 0;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <ArrowRight size={14} className={active ? 'text-primary/40' : 'text-muted-foreground/20'} />
              )}
              <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'border border-dashed border-muted-foreground/30 text-muted-foreground/40'
                }`}>
                  {active ? <Check size={18} /> : <step.icon size={18} />}
                </div>
                <span className={`text-[11px] font-heading-bn text-center leading-tight ${
                  active ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}>
                  {active
                    ? `${step.count}${step.countLabel}`
                    : t('এখনো হয়নি', 'Not yet')
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodaysLoopWidget;
