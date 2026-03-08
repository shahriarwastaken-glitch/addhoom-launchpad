import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: t('অ্যাকাউন্ট তৈরি হয়েছে! 🎉', 'Account created! 🎉'),
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
          <h2 className="text-xl font-bold font-heading-bn mb-6">
            {isLogin ? t('লগইন করুন', 'Log In') : t('অ্যাকাউন্ট তৈরি করুন', 'Sign Up')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('আপনার নাম', 'Your name')}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder={t('ইমেইল', 'Email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                required
              />
            </div>

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
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

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
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
              {isLogin ? t('সাইন আপ', 'Sign Up') : t('লগইন', 'Log In')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
