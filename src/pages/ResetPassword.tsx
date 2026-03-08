import { useState, forwardRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, Zap } from 'lucide-react';

const ResetPassword = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: t('সমস্যা', 'Error'), description: t('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'Password must be at least 6 characters'), variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t('সমস্যা', 'Error'), description: t('পাসওয়ার্ড মিলছে না', 'Passwords do not match'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: t('পাসওয়ার্ড আপডেট হয়েছে!', 'Password updated!'),
        description: t('এখন লগইন করতে পারবেন।', 'You can now log in.'),
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: t('সমস্যা', 'Error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div ref={ref} className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground">{t('অবৈধ রিসেট লিংক', 'Invalid reset link')}</p>
          <button onClick={() => navigate('/auth')} className="mt-4 text-primary hover:underline">
            {t('লগইনে যান', 'Go to login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading-en">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            <Zap size={20} className="text-brand-yellow" />
          </h1>
        </div>

        <div className="bg-card rounded-2xl shadow-warm-lg p-8 border border-border">
          <h2 className="text-xl font-bold font-heading-bn mb-6">
            {t('নতুন পাসওয়ার্ড সেট করুন', 'Set New Password')}
          </h2>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('নতুন পাসওয়ার্ড', 'New password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                required
                minLength={6}
                maxLength={128}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm password')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                required
                minLength={6}
                maxLength={128}
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50">
              {loading ? t('আপডেট হচ্ছে...', 'Updating...') : t('পাসওয়ার্ড আপডেট করুন', 'Update Password')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

ResetPassword.displayName = 'ResetPassword';

export default ResetPassword;
