import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Check, X, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react';

const SecurityTab = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: t('দুর্বল', 'Weak'), color: 'bg-destructive' };
    if (score === 2) return { level: 2, label: t('মোটামুটি', 'Fair'), color: 'bg-yellow-500' };
    if (score === 3) return { level: 3, label: t('শক্তিশালী', 'Strong'), color: 'bg-green-500' };
    return { level: 4, label: t('অনেক শক্তিশালী', 'Very Strong'), color: 'bg-green-700' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('পাসওয়ার্ড মিলছে না', 'Passwords do not match'));
      setStatus('error');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg(t('ন্যূনতম ৮ অক্ষর', 'Minimum 8 characters'));
      setStatus('error');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStatus('saved');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">{t('পাসওয়ার্ড পরিবর্তন', 'Change Password')}</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('বর্তমান পাসওয়ার্ড', 'Current password')}</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
              />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('নতুন পাসওয়ার্ড', 'New password')}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
              />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-muted'}`} />
                  ))}
                </div>
                <p className={`text-xs ${strength.level <= 1 ? 'text-destructive' : strength.level <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm new password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleChangePassword} disabled={saving || !newPassword || !confirmPassword}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('পাসওয়ার্ড আপডেট করুন', 'Update Password')}
          </button>
          {status === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> {t('আপডেট হয়েছে', 'Updated')}</span>}
          {status === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><X size={14} /> {errorMsg || t('ব্যর্থ', 'Failed')}</span>}
        </div>
      </section>

      {/* Active Sessions */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('সক্রিয় সেশন', 'Active Sessions')}</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <Monitor size={20} className="text-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'} — {navigator.platform}</p>
              <p className="text-xs text-muted-foreground">{t('এখন সক্রিয়', 'Active now')}</p>
            </div>
            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">{t('এই ডিভাইস', 'This device')}</span>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut({ scope: 'others' });
          }}
          className="mt-4 border border-destructive text-destructive rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          {t('অন্যান্য সব সেশন বাতিল করুন', 'Revoke All Other Sessions')}
        </button>
      </section>
    </div>
  );
};

export default SecurityTab;
