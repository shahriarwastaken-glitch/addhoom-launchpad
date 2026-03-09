import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ImpersonationState {
  active: boolean;
  targetName: string;
  targetEmail: string;
  targetUserId: string;
  token: string;
}

export default function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);
  const [ending, setEnding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('addhoom_impersonation');
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  const endImpersonation = async () => {
    if (!state) return;
    setEnding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('end-impersonation', {
        body: { impersonation_token: state.token },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch (err) {
      console.error('Error ending impersonation:', err);
    } finally {
      sessionStorage.removeItem('addhoom_impersonation');
      setState(null);
      setEnding(false);
      navigate(`/admin/users`);
    }
  };

  if (!state?.active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-3 text-sm shadow-lg">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        You are viewing as <strong>{state.targetName || state.targetEmail}</strong>
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={endImpersonation}
        disabled={ending}
        className="ml-2 h-7 text-xs"
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        {ending ? 'Ending...' : 'Return to Admin'}
      </Button>
    </div>
  );
}

// Helper to start impersonation from admin user detail
export async function startImpersonation(targetUserId: string): Promise<ImpersonationState | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('start-impersonation', {
      body: { target_user_id: targetUserId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error || !data?.success) {
      throw new Error(data?.message || 'Failed to start impersonation');
    }

    const impersonation: ImpersonationState = {
      active: true,
      targetName: data.target_user.name || '',
      targetEmail: data.target_user.email || '',
      targetUserId: data.target_user.id,
      token: data.impersonation_token,
    };

    sessionStorage.setItem('addhoom_impersonation', JSON.stringify(impersonation));
    return impersonation;
  } catch (err) {
    console.error('Impersonation error:', err);
    return null;
  }
}
