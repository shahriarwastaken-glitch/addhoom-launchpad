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
  adminRefreshToken: string;
  adminAccessToken: string;
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
      // Call end-impersonation with admin token (stored)
      await supabase.functions.invoke('end-impersonation', {
        body: { impersonation_token: state.token },
        headers: { Authorization: `Bearer ${state.adminAccessToken}` },
      });
    } catch (err) {
      console.error('Error ending impersonation:', err);
    }

    try {
      // Sign out from impersonated user session
      await supabase.auth.signOut();

      // Restore admin session
      const { error } = await supabase.auth.setSession({
        access_token: state.adminAccessToken,
        refresh_token: state.adminRefreshToken,
      });

      if (error) {
        console.error('Failed to restore admin session:', error);
        // If restore fails, redirect to login
        window.location.href = '/auth';
        return;
      }
    } catch (err) {
      console.error('Session restore error:', err);
      window.location.href = '/auth';
      return;
    } finally {
      sessionStorage.removeItem('addhoom_impersonation');
      setState(null);
      setEnding(false);
    }

    navigate('/admin/users', { replace: true });
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
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) throw new Error('Not authenticated');

    // Store admin tokens before switching
    const adminAccessToken = adminSession.access_token;
    const adminRefreshToken = adminSession.refresh_token;

    const { data, error } = await supabase.functions.invoke('start-impersonation', {
      body: { target_user_id: targetUserId },
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });

    if (error || !data?.success) {
      throw new Error(data?.message || 'Failed to start impersonation');
    }

    // Store impersonation state BEFORE switching session
    const impersonation: ImpersonationState = {
      active: true,
      targetName: data.target_user.name || '',
      targetEmail: data.target_user.email || '',
      targetUserId: data.target_user.id,
      token: data.impersonation_token,
      adminAccessToken,
      adminRefreshToken,
    };

    sessionStorage.setItem('addhoom_impersonation', JSON.stringify(impersonation));

    // Now sign in as the target user using the OTP
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: data.target_email,
      token: data.email_otp,
      type: 'email',
    });

    if (otpError) {
      console.error('OTP verification error:', otpError);
      sessionStorage.removeItem('addhoom_impersonation');
      throw new Error('Failed to sign in as target user: ' + otpError.message);
    }

    return impersonation;
  } catch (err) {
    console.error('Impersonation error:', err);
    return null;
  }
}
