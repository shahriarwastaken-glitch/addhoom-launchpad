import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

const WelcomeBanner = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('addhoom_welcome_dismissed')) {
      setDismissed(true);
    }
  }, []);

  if (dismissed || !profile) return null;

  // Show incomplete setup banner
  if (!profile.onboarding_complete) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-foreground font-bn">⚠️ শপ সেটআপ বাকি আছে</p>
            <p className="text-sm text-muted-foreground font-bn">সেটআপ সম্পন্ন করলে AI আপনার শপের জন্য কাস্টমাইজ করতে পারবে।</p>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold font-bn whitespace-nowrap"
          >
            সেটআপ সম্পন্ন করুন
          </button>
        </div>
      </div>
    );
  }

  // Show welcome banner (first visit after onboarding)
  const firstName = profile.full_name?.split(' ')[0] || '';

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary to-[hsl(var(--brand-yellow))] p-5 mb-6 relative">
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem('addhoom_welcome_dismissed', 'true');
        }}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-bn">
            👋 স্বাগতম{firstName ? `, ${firstName}` : ''}!
          </h3>
          <p className="text-[15px] text-white/85 font-bn">
            AdDhoom-এ আপনার যাত্রা শুরু হয়েছে।
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'বিজ্ঞাপন তৈরি করুন', path: '/dashboard/generate' },
            { label: 'ক্যালেন্ডার দেখুন', path: '/dashboard/calendar' },
            { label: 'ধুম স্কোর সম্পর্কে জানুন', path: '/dashboard/doctor' },
          ].map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="text-xs font-semibold text-white border border-white/30 rounded-full px-4 py-2 hover:bg-white/10 transition-colors font-bn whitespace-nowrap"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
