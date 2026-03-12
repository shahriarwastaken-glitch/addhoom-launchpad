import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mascot } from '@/components/Mascot';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          navigate('/auth?error=verification_failed', { replace: true });
          return;
        }

        const user = data.session.user;

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
      } catch {
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
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
