import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UpgradeProvider, useUpgrade as useUpgradeCtx } from "@/contexts/UpgradeContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setUpgradeHandler } from "@/lib/api";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboardNew from "./pages/AdminDashboardNew";
import NotFound from "./pages/NotFound";
import PlanGate from "./pages/PlanGate";
import Onboarding from "./pages/Onboarding";
import ShopDNASetup from "./components/dashboard/ShopDNASetup";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, skipPlanCheck }: { children: React.ReactNode; skipPlanCheck?: boolean }) => {
  const { user, loading, profile, activeWorkspace, refreshProfile } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile) {
      setOnboardingDone(profile.onboarding_complete === true);
    }
  }, [profile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-primary text-xl font-bold">AdDhoom</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  
  // Check if user has a paid plan (skip for admin routes)
  if (!skipPlanCheck) {
    const plan = profile?.plan || 'free';
    if (plan === 'free') {
      return <PlanGate />;
    }
  }

  // Show onboarding if not complete
  if (onboardingDone === false && !skipPlanCheck && activeWorkspace) {
    return (
      <ShopDNASetup
        onComplete={() => {
          setOnboardingDone(true);
          refreshProfile();
        }}
      />
    );
  }
  
  return <>{children}</>;
};

// Handle "Remember Me" — sign out on window close if unchecked
const SessionManager = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('addhoom_session_temp') === 'true') {
        supabase.auth.signOut();
        sessionStorage.removeItem('addhoom_session_temp');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  return <>{children}</>;
};

// Bridge UpgradeContext into the api module
const UpgradeBridge = ({ children }: { children: React.ReactNode }) => {
  const { showUpgrade } = useUpgradeCtx();
  useEffect(() => { setUpgradeHandler(showUpgrade); }, [showUpgrade]);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <SessionManager>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UpgradeProvider>
                <UpgradeBridge>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/admin/*" element={<AdminDashboardNew />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </UpgradeBridge>
              </UpgradeProvider>
            </BrowserRouter>
          </TooltipProvider>
        </SessionManager>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
