import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mascot } from '@/components/Mascot';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const user = session.user;

          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', user.id)
            .single();

          if (!profile?.onboarding_complete) {
            navigate('/onboarding', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // ignore, wait for SIGNED_IN
        }
      }
    );

    // Fallback: if session already exists (e.g. implicit flow)
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth?error=verification_failed', { replace: true });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Mascot variant="energetic" size={80} animate />
      <p className="mt-4 text-muted-foreground font-body-bn">
        Verifying your account...
      </p>
    </div>
  );
};

export default AuthCallback;
