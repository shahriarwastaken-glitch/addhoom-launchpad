import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Check, X } from 'lucide-react';

interface NotifPref {
  credit_reset: boolean;
  low_credits: boolean;
  generation_complete: boolean;
  weekly_summary: boolean;
  product_updates: boolean;
  tips: boolean;
}

const NOTIF_OPTIONS: { key: keyof NotifPref; labelBn: string; labelEn: string; descBn: string; descEn: string }[] = [
  { key: 'credit_reset', labelBn: 'মাসিক ক্রেডিট রিসেট রিমাইন্ডার', labelEn: 'Monthly credit reset reminder', descBn: 'ক্রেডিট রিসেট হলে জানানো হবে', descEn: 'Get notified when your credits reset' },
  { key: 'low_credits', labelBn: 'লো ক্রেডিট সতর্কতা', labelEn: 'Low credit warning', descBn: '২০% এর নিচে গেলে জানানো হবে', descEn: 'Get notified when below 20% credits' },
  { key: 'generation_complete', labelBn: 'জেনারেশন সম্পন্ন', labelEn: 'Generation completed', descBn: 'দীর্ঘ কাজ শেষ হলে ইমেইল', descEn: 'Email when long jobs finish' },
  { key: 'weekly_summary', labelBn: 'সাপ্তাহিক ব্যবহার সারসংক্ষেপ', labelEn: 'Weekly usage summary', descBn: 'আপনার কার্যকলাপের সাপ্তাহিক রিপোর্ট', descEn: 'Weekly report of your activity' },
  { key: 'product_updates', labelBn: 'প্রোডাক্ট আপডেট', labelEn: 'Product updates', descBn: 'নতুন ফিচার ও উন্নতি', descEn: 'New features and improvements' },
  { key: 'tips', labelBn: 'টিপস ও টিউটোরিয়াল', labelEn: 'Tips and tutorials', descBn: 'ভালো ফলাফল পেতে শিখুন', descEn: 'Learn how to get better results' },
];

const DEFAULT_PREFS: NotifPref = {
  credit_reset: true,
  low_credits: true,
  generation_complete: true,
  weekly_summary: false,
  product_updates: false,
  tips: false,
};

const NotificationsTab = () => {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [prefs, setPrefs] = useState<NotifPref>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (profile?.notification_preferences) {
      setPrefs({ ...DEFAULT_PREFS, ...(profile.notification_preferences as any) });
    }
  }, [profile]);

  const togglePref = (key: keyof NotifPref) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ notification_preferences: prefs as any }).eq('id', user.id);
      await refreshProfile();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">{t('ইমেইল নোটিফিকেশন', 'Email Notifications')}</h3>

        <div className="space-y-1">
          {NOTIF_OPTIONS.map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="min-w-0 flex-1 mr-4">
                <p className="text-sm font-medium text-foreground">{t(opt.labelBn, opt.labelEn)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descBn, opt.descEn)}</p>
              </div>
              <button
                onClick={() => togglePref(opt.key)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  prefs[opt.key] ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    prefs[opt.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('সংরক্ষণ', 'Save')}
          </button>
          {status === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> {t('সংরক্ষিত', 'Saved')}</span>}
          {status === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><X size={14} /> {t('ব্যর্থ', 'Failed')}</span>}
        </div>
      </section>
    </div>
  );
};

export default NotificationsTab;
