import UpcomingContentWidget from './UpcomingContentWidget';
import TodaysLoopWidget from './TodaysLoopWidget';
import WelcomeBanner from './WelcomeBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Video, Brain, Shield, FolderOpen, Calendar, PartyPopper, Zap } from 'lucide-react';

const DashboardHome = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const quickActions = [
    { icon: Sparkles, label: t('বিজ্ঞাপন তৈরি', 'Create Ad'), path: '/dashboard/generate', color: 'bg-primary/10 text-primary' },
    { icon: Video, label: t('ভিডিও তৈরি', 'Create Video'), path: '/dashboard/video', color: 'bg-brand-purple/10 text-brand-purple' },
    { icon: Calendar, label: t('ক্যালেন্ডার', 'Calendar'), path: '/dashboard/calendar', color: 'bg-brand-green/10 text-brand-green' },
    { icon: Brain, label: t('AI চ্যাট', 'AI Chat'), path: '/dashboard/chat', color: 'bg-brand-yellow/10 text-brand-yellow' },
    { icon: PartyPopper, label: t('উৎসব', 'Festival'), path: '/dashboard/festival', color: 'bg-accent/10 text-accent' },
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
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
    </div>
  );
};

export default DashboardHome;
