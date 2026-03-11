import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { X, AlertTriangle, Hand } from 'lucide-react';

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

  if (!profile.onboarding_complete) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Shop setup incomplete</p>
            <p className="text-sm text-muted-foreground">Complete setup so AI can customize for your shop.</p>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold whitespace-nowrap"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

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
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Hand className="w-5 h-5" /> Welcome{firstName ? `, ${firstName}` : ''}!
          </h3>
          <p className="text-[15px] text-white/85">
            Your journey with AdDhoom has begun.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Create Ad', path: '/dashboard/generate' },
            { label: 'View Calendar', path: '/dashboard/calendar' },
            { label: 'Learn about Dhoom Score', path: '/dashboard/dhoom-score' },
          ].map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="text-xs font-semibold text-white border border-white/30 rounded-full px-4 py-2 hover:bg-white/10 transition-colors whitespace-nowrap"
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
