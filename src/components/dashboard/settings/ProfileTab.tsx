import { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Type, Sun, Moon, Save, Camera, Loader2, Check, X, AlertTriangle, Zap, ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

const ProfileTab = () => {
  const { t, lang, toggle } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { showUpgrade } = useUpgrade();
  const navigate = useNavigate();

  // Credit tracker
  const planKey = profile?.plan_key || 'free';
  const planCredits = useMemo(() => {
    if (planKey === 'agency') return 35000;
    if (planKey === 'pro') return 15000;
    if (planKey === 'starter') return 5000;
    return 0;
  }, [planKey]);
  const creditBalance = profile?.credit_balance ?? 0;
  const creditPct = planCredits > 0 ? Math.round(((planCredits - creditBalance) / planCredits) * 100) : 0;
  const resetDate = useMemo(() => {
    if (!profile?.credits_reset_at) return null;
    return new Date(profile.credits_reset_at);
  }, [profile?.credits_reset_at]);
  const creditLow = planCredits > 0 && creditBalance / planCredits < 0.2;
  const creditEmpty = creditBalance <= 0;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Preferences
  const [defaultAdLang, setDefaultAdLang] = useState('en');
  const [prefStatus, setPrefStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
      setDefaultAdLang(profile.default_ad_language || 'en');
    }
  }, [profile]);

  const showInlineStatus = (setter: (s: 'idle' | 'saved' | 'error') => void, status: 'saved' | 'error') => {
    setter(status);
    if (status === 'saved') setTimeout(() => setter('idle'), 2000);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showInlineStatus(setSaveStatus, 'saved');
    } catch {
      showInlineStatus(setSaveStatus, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('ad-images').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
      await refreshProfile();
    } catch {
      // silent fail
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      await supabase.from('profiles').update({ default_ad_language: defaultAdLang }).eq('id', user.id);
      await refreshProfile();
      showInlineStatus(setPrefStatus, 'saved');
    } catch {
      showInlineStatus(setPrefStatus, 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Credit Tracker */}
      <section className={`rounded-2xl border p-5 sm:p-6 ${
        creditEmpty ? 'border-destructive/30 bg-destructive/5' : creditLow ? 'border-[hsl(var(--brand-yellow))]/30 bg-[hsl(var(--brand-yellow))]/5' : 'border-border bg-card'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap size={16} className={creditEmpty ? 'text-destructive' : 'text-primary'} />
            {t('ক্রেডিট ব্যালেন্স', 'Credit Balance')}
          </h3>
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            planKey === 'free' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
          }`}>
            {profile?.plan || 'Free'}
          </span>
        </div>

        <div className="flex items-end gap-1 mb-3">
          <span className={`text-3xl font-bold ${creditEmpty ? 'text-destructive' : 'text-foreground'}`}>
            {creditBalance.toLocaleString()}
          </span>
          {planCredits > 0 && (
            <span className="text-sm text-muted-foreground mb-1">/ {planCredits.toLocaleString()} {t('ক্রেডিট', 'credits')}</span>
          )}
          {planKey === 'free' && (
            <span className="text-sm text-muted-foreground mb-1">{t('ক্রেডিট', 'credits')}</span>
          )}
        </div>

        {planCredits > 0 && (
          <div className="space-y-1.5 mb-4">
            <Progress value={creditPct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{creditPct}% {t('ব্যবহৃত', 'used')}</span>
              {resetDate && <span>{t(`রিসেট হবে ${format(resetDate, 'MMM d, yyyy')}`, `Resets on ${format(resetDate, 'MMM d, yyyy')}`)}</span>}
            </div>
          </div>
        )}

        {creditEmpty && (
          <p className="text-sm text-destructive mb-3">
            {t('আপনার ক্রেডিট শেষ। কোনো অ্যাকশন করতে প্ল্যান কিনুন।', 'You have no credits. Subscribe to a plan to start creating.')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {planKey === 'free' || creditEmpty ? (
            <button
              onClick={() => showUpgrade('credits', { balance: creditBalance })}
              className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {t('প্ল্যান কিনুন', 'Get a Plan')} <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard/settings#billing')}
              className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {t('বিলিং দেখুন', 'View Billing')}
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard/credits')}
            className="text-sm text-primary hover:underline px-2 py-2"
          >
            {t('ব্যবহার দেখুন →', 'View Usage →')}
          </button>
        </div>
      </section>

      {/* Personal Information */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">{t('ব্যক্তিগত তথ্য', 'Personal Information')}</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 size={20} className="text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5">
              <Camera size={14} />
              {t('ছবি পরিবর্তন করুন', 'Change photo')}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG. Max 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('পুরো নাম', 'Full name')}</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('ইমেইল', 'Email')}</label>
            <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary text-muted-foreground text-sm" />
            <p className="text-xs text-muted-foreground mt-1">{t('ইমেইল পরিবর্তনে সাপোর্টে যোগাযোগ করুন', 'Contact support to change email')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('ফোন নম্বর', 'Phone number')}</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+880..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSaveProfile} disabled={saving}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('পরিবর্তন সংরক্ষণ', 'Save Changes')}
          </button>
          {saveStatus === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> {t('সংরক্ষিত', 'Saved')}</span>}
          {saveStatus === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><X size={14} /> {t('ব্যর্থ', 'Failed')}</span>}
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">{t('পছন্দসমূহ', 'Preferences')}</h3>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ইন্টারফেস ভাষা', 'Interface language')}</label>
            <div className="flex gap-2">
              {[
                { label: 'English', value: 'en' as const, icon: Globe },
                { label: 'বাংলা', value: 'bn' as const, icon: Type },
              ].map(l => (
                <button key={l.value} onClick={() => { if (lang !== l.value) toggle(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    lang === l.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <l.icon size={14} /> {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ডিফল্ট অ্যাড ভাষা', 'Default ad language')}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'English', value: 'en' },
                { label: 'বাংলা', value: 'bn' },
                { label: 'Banglish', value: 'banglish' },
              ].map(l => (
                <button key={l.value} onClick={() => setDefaultAdLang(l.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    defaultAdLang === l.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('থিম', 'Theme')}</label>
            <div className="flex gap-2">
              {[
                { label: t('লাইট', 'Light'), value: false, icon: Sun },
                { label: t('ডার্ক', 'Dark'), value: true, icon: Moon },
              ].map(opt => (
                <button key={String(opt.value)} onClick={() => { if (dark !== opt.value) toggleTheme(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    dark === opt.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <opt.icon size={14} /> {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSavePrefs} disabled={savingPrefs}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            {savingPrefs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('পছন্দ সংরক্ষণ', 'Save Preferences')}
          </button>
          {prefStatus === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> {t('সংরক্ষিত', 'Saved')}</span>}
          {prefStatus === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><X size={14} /> {t('ব্যর্থ', 'Failed')}</span>}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-card rounded-2xl border border-destructive/30 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-destructive mb-2">{t('বিপদ অঞ্চল', 'Danger Zone')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('এই ক্রিয়াগুলি পূর্বাবস্থায় ফেরানো যাবে না।', 'These actions cannot be undone.')}</p>
        <button onClick={() => setShowDeleteModal(true)}
          className="border border-destructive text-destructive rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          {t('অ্যাকাউন্ট ডিলিট করুন', 'Delete Account')}
        </button>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card rounded-2xl w-full max-w-[440px] p-6 sm:p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={20} /></button>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={28} className="text-destructive" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-center text-foreground mb-2">{t('অ্যাকাউন্ট ডিলিট করবেন?', 'Delete your account?')}</h2>
            <p className="text-sm text-muted-foreground text-center mb-1">
              {t('আপনার অ্যাকাউন্ট ৩০ দিনে স্থায়ীভাবে মুছে যাবে। পুনরুদ্ধারের জন্য সাপোর্টে যোগাযোগ করুন।', 'Your account will be permanently deleted in 30 days. Contact support to recover it.')}
            </p>
            <p className="text-sm text-destructive font-medium text-center mb-4">{t('এটি পূর্বাবস্থায় ফেরানো যাবে না।', 'This cannot be undone.')}</p>
            <div>
              <label className="text-sm font-medium text-foreground">{t('নিশ্চিত করতে ইমেইল টাইপ করুন:', 'Type your email to confirm:')}</label>
              <input value={deleteConfirmEmail} onChange={e => setDeleteConfirmEmail(e.target.value)} placeholder={user?.email || ''}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30" />
            </div>
            <div className="mt-6 space-y-2">
              <button disabled={deleteConfirmEmail !== user?.email}
                className="w-full bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              >
                {t('আমার অ্যাকাউন্ট ডিলিট করুন', 'Delete My Account')}
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="w-full text-muted-foreground hover:text-foreground text-sm py-2">{t('বাতিল', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
