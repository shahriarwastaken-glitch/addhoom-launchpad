import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminGuardProps {
  children: React.ReactNode;
  onAdminVerified?: (isSuperAdmin: boolean) => void;
}

export default function AdminGuard({ children, onAdminVerified }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          toast.error('অ্যাক্সেস অস্বীকৃত');
          navigate('/dashboard', { replace: true });
          return;
        }

        setIsAdmin(true);
        onAdminVerified?.(data.role === 'super_admin');
      } catch (err) {
        toast.error('অ্যাক্সেস অস্বীকৃত');
        navigate('/dashboard', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user, authLoading, navigate, onAdminVerified]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
