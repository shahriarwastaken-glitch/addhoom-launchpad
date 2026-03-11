import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

const FirstTimeHelperBar = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (profile?.onboarding_complete && !(profile as any).tour_completed) {
      setVisible(true);
    }
  }, [profile]);

  const dismiss = async () => {
    setVisible(false);
    if (user) {
      await supabase.from('profiles').update({ tour_completed: true } as any).eq('id', user.id);
      await refreshProfile();
    }
  };

  const handleAction = async (path: string) => {
    await dismiss();
    navigate(path);
  };

  if (!visible) return null;

  return (
    <div
      className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3"
      style={{ backgroundColor: '#FFF3E8', borderBottom: '1px solid rgba(255,81,0,0.15)' }}
    >
      <span className="text-sm text-foreground font-medium">👋 Ready to create your first ad?</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleAction('/dashboard/generate')}
          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
        >
          Try Image Generator →
        </button>
        <button
          onClick={() => handleAction('/dashboard/generate?tab=copy')}
          className="text-xs font-semibold text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
        >
          Try Ad Copy →
        </button>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default FirstTimeHelperBar;
