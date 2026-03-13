import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { identifyUser, resetUser } from '@/lib/posthog';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  activeWorkspace: any | null;
  workspaces: any[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveWorkspaceId: (id: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  activeWorkspace: null,
  workspaces: [],
  signOut: async () => {},
  refreshProfile: async () => {},
  setActiveWorkspaceId: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem('active_workspace_id')
  );

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem('active_workspace_id', id);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const fetchWorkspaces = async (userId: string) => {
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const ws = data || [];
    setWorkspaces(ws);

    if (ws.length > 0) {
      const savedId = localStorage.getItem('active_workspace_id');
      const savedExists = savedId && ws.find((w: any) => w.id === savedId);
      const defaultWs = ws.find((w: any) => w.is_default);

      if (!savedExists) {
        const pick = defaultWs || ws[0];
        setActiveWorkspaceId(pick.id);
      }
    }

    // Auto-create default workspace if none
    if (ws.length === 0) {
      const { data: newWs } = await supabase
        .from('workspaces')
        .insert({ owner_id: userId, shop_name: 'My Shop', language: 'bn', is_default: true })
        .select()
        .single();
      if (newWs) {
        setWorkspaces([newWs]);
        setActiveWorkspaceId(newWs.id);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchWorkspaces(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchWorkspaces(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setWorkspaces([]);
          setActiveWorkspaceId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchWorkspaces(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        activeWorkspace,
        workspaces,
        signOut: async () => { await supabase.auth.signOut(); },
        refreshProfile,
        setActiveWorkspaceId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
