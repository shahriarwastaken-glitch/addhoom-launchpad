import { useState, useEffect, useCallback } from 'react';
import UpcomingContentWidget from './UpcomingContentWidget';
import TodaysLoopWidget from './TodaysLoopWidget';
import WelcomeBanner from './WelcomeBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Video, Brain, Shield, FolderOpen, Calendar, BarChart3, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Mascot } from '@/components/Mascot';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardHome = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();

  // Payment result handler for credit packs
  const [showCreditsSuccess, setShowCreditsSuccess] = useState(false);
  const [addedCredits, setAddedCredits] = useState(0);
  const [animatedBalance, setAnimatedBalance] = useState(0);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const credits = searchParams.get('credits');

    if (payment === 'credits_added' && credits) {
      const creditsNum = parseInt(credits) || 0;
      setAddedCredits(creditsNum);
      setShowCreditsSuccess(true);
      refreshProfile();
      // Clear URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('credits');
      setSearchParams(newParams, { replace: true });
    } else if (payment === 'already_processed') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  // Animate balance count-up
  useEffect(() => {
    if (!showCreditsSuccess || !profile) return;
    const targetBalance = profile.credit_balance ?? 0;
    const startBalance = Math.max(0, targetBalance - addedCredits);
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedBalance(Math.round(startBalance + (targetBalance - startBalance) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [showCreditsSuccess, profile?.credit_balance]);

  const quickActions = [
    { icon: Sparkles, label: t('বিজ্ঞাপন তৈরি', 'Create Ad'), path: '/dashboard/generate', color: 'bg-primary/10 text-primary' },
    { icon: Video, label: t('ভিডিও তৈরি', 'Create Video'), path: '/dashboard/video', color: 'bg-brand-purple/10 text-brand-purple' },
    { icon: Calendar, label: t('ক্যালেন্ডার', 'Calendar'), path: '/dashboard/calendar', color: 'bg-brand-green/10 text-brand-green' },
    { icon: Brain, label: 'DhoomAi', path: '/dashboard/chat', color: 'bg-brand-yellow/10 text-brand-yellow' },
    { icon: BarChart3, label: t('অ্যানালিটিক্স', 'Analytics'), path: '/dashboard/analytics', color: 'bg-accent/10 text-accent' },
    { icon: Zap, label: t('ধুম স্কোর', 'Dhoom Score'), path: '/dashboard/dhoom-score', color: 'bg-brand-yellow/10 text-brand-yellow' },
    { icon: FolderOpen, label: t('প্রজেক্ট', 'Projects'), path: '/dashboard/projects', color: 'bg-destructive/10 text-destructive' },
    { icon: Shield, label: t('অ্যাকাউন্ট ডক্টর', 'Account Doctor'), path: '/dashboard/doctor', color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome / Setup banner */}
      <WelcomeBanner />
      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-3 font-bn">
          {t('দ্রুত শুরু করুন', 'Quick Start')}
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {quickActions.map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-card hover:bg-secondary/50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon size={20} />
              </div>
              <span className="text-[11px] font-medium text-foreground text-center font-bn leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's Loop widget */}
      <TodaysLoopWidget />

      {/* Upcoming content widget */}
      <UpcomingContentWidget />

      {/* Credits Added Success Modal */}
      <AnimatePresence>
        {showCreditsSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowCreditsSuccess(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[420px] bg-card rounded-3xl shadow-warm-lg overflow-hidden border border-border p-8 text-center"
            >
              <Mascot variant="celebrating" size={80} className="mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                {t('ক্রেডিট যোগ হয়েছে!', 'Credits added!')} <Zap size={20} className="inline text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {addedCredits.toLocaleString()} {t('ক্রেডিট আপনার অ্যাকাউন্টে যোগ হয়েছে।', 'credits added to your account.')}
              </p>
              <p className="text-3xl font-bold mb-6" style={{ fontFamily: 'Syne, sans-serif', color: 'hsl(var(--primary))' }}>
                {t('নতুন ব্যালেন্স:', 'New balance:')} {animatedBalance.toLocaleString()}
              </p>
              <button
                onClick={() => setShowCreditsSuccess(false)}
                className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
              >
                {t('তৈরি শুরু করুন', 'Start Creating')} <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardHome;
