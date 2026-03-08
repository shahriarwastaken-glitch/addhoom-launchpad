import { useState, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, User, Eye, EyeOff, Zap, PartyPopper } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, 'Name is required').max(100),
});

const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate inputs
      const schema = isLogin ? loginSchema : signupSchema;
      const result = schema.safeParse({ email, password, fullName });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;

        // If "Remember Me" is unchecked, session will be cleared on tab close
        if (!rememberMe) {
          // Store flag to clear session on window close
          sessionStorage.setItem('addhoom_session_temp', 'true');
        } else {
          sessionStorage.removeItem('addhoom_session_temp');
        }

        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: t('অ্যাকাউন্ট তৈরি হয়েছে!', 'Account created!'),
          description: t('ইমেইল ভেরিফাই করুন।', 'Please verify your email.'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('সমস্যা হয়েছে', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    const emailCheck = z.string().email().safeParse(forgotEmail.trim());
    if (!emailCheck.success) {
      toast({ title: t('সমস্যা', 'Error'), description: t('সঠিক ইমেইল দিন', 'Enter a valid email'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: t('ইমেইল পাঠানো হয়েছে! 📧', 'Email sent! 📧'),
        description: t('পাসওয়ার্ড রিসেট লিংক চেক করুন।', 'Check your email for the reset link.'),
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({ title: t('সমস্যা', 'Error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold font-heading-en inline-block">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            <span className="text-brand-yellow">⚡</span>
          </Link>
          <p className="mt-2 text-muted-foreground">
            {t('আপনার AI মার্কেটিং অ্যাসিস্ট্যান্ট', 'Your AI Marketing Assistant')}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-warm-lg p-8 border border-border">
          {showForgotPassword ? (
            <>
              <h2 className="text-xl font-bold font-heading-bn mb-6">
                {t('পাসওয়ার্ড রিসেট', 'Reset Password')}
              </h2>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder={t('আপনার ইমেইল', 'Your email')}
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    required
                    maxLength={255}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50">
                  {loading ? t('পাঠানো হচ্ছে...', 'Sending...') : t('রিসেট লিংক পাঠান', 'Send Reset Link')}
                </button>
              </form>
              <button onClick={() => setShowForgotPassword(false)} className="mt-4 text-sm text-primary hover:underline w-full text-center">
                {t('← লগইনে ফিরুন', '← Back to login')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold font-heading-bn mb-6">
                {isLogin ? t('লগইন করুন', 'Log In') : t('অ্যাকাউন্ট তৈরি করুন', 'Sign Up')}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder={t('আপনার নাম', 'Your name')}
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        required
                        maxLength={100}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                  </div>
                )}

                <div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder={t('ইমেইল', 'Email')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      required
                      maxLength={255}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>

                <div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('পাসওয়ার্ড', 'Password')}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      required
                      minLength={6}
                      maxLength={128}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-sm text-muted-foreground font-body-bn">
                        {t('মনে রাখুন', 'Remember me')}
                      </span>
                    </label>
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline font-body-bn">
                      {t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {loading
                    ? t('অপেক্ষা করুন...', 'Please wait...')
                    : isLogin
                    ? t('লগইন', 'Log In')
                    : t('অ্যাকাউন্ট তৈরি করুন', 'Sign Up')}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? t('অ্যাকাউন্ট নেই?', "Don't have an account?") : t('অ্যাকাউন্ট আছে?', 'Already have an account?')}{' '}
                <button onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-primary font-semibold hover:underline">
                  {isLogin ? t('সাইন আপ', 'Sign Up') : t('লগইন', 'Log In')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';

export default Auth;
