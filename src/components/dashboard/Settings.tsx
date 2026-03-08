import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { t } = useLanguage();
  const { user, profile, activeWorkspace, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (activeWorkspace) {
      setShopName(activeWorkspace.shop_name || '');
      setShopUrl(activeWorkspace.shop_url || '');
      setIndustry(activeWorkspace.industry || '');
    }
  }, [profile, activeWorkspace]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      if (activeWorkspace) {
        await supabase.from('workspaces').update({ shop_name: shopName, shop_url: shopUrl, industry }).eq('id', activeWorkspace.id);
      }
      await refreshProfile();
      toast.success(t('সেটিংস সেভ হয়েছে!', 'Settings saved!'));
    } catch {
      toast.error(t('সেভ ব্যর্থ', 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8 flex items-center gap-2">
        <SettingsIcon className="text-primary" size={28} />
        {t('সেটিংস', 'Settings')}
      </h2>

      {/* Profile */}
      <div className="bg-card rounded-[20px] shadow-warm p-6 mb-6">
        <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('প্রোফাইল', 'Profile')}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('ইমেইল', 'Email')}</label>
            <input value={user?.email || ''} disabled className="w-full p-3 rounded-xl border border-border bg-secondary text-muted-foreground font-mono text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('নাম', 'Name')}</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('ফোন', 'Phone')}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880"
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" />
          </div>
        </div>
      </div>

      {/* Shop */}
      <div className="bg-card rounded-[20px] shadow-warm p-6 mb-6">
        <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('শপ তথ্য', 'Shop Info')}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('শপের নাম', 'Shop Name')}</label>
            <input value={shopName} onChange={e => setShopName(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('শপ URL', 'Shop URL')}</label>
            <input value={shopUrl} onChange={e => setShopUrl(e.target.value)} placeholder="https://"
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('ইন্ডাস্ট্রি', 'Industry')}</label>
            <div className="flex flex-wrap gap-2">
              {['fashion', 'electronics', 'food', 'beauty', 'home', 'other'].map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={`text-xs rounded-full px-3 py-1.5 capitalize transition-colors ${industry === ind ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary'}`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-card rounded-[20px] shadow-warm p-6 mb-6">
        <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('সাবস্ক্রিপশন', 'Subscription')}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">{profile?.plan || 'free'}</span>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.subscription_status === 'active'
                ? t('সক্রিয়', 'Active')
                : t('ফ্রি প্ল্যান', 'Free Plan')}
            </p>
          </div>
          {profile?.plan === 'free' && (
            <button className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn">
              {t('আপগ্রেড করুন', 'Upgrade')}
            </button>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn flex items-center justify-center gap-2">
        <Save size={18} />
        {saving ? t('সেভ হচ্ছে...', 'Saving...') : t('সেটিংস সেভ করুন', 'Save Settings')}
      </button>
    </div>
  );
};

export default Settings;
