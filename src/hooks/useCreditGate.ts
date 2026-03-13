import { useAuth } from '@/contexts/AuthContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { useCallback } from 'react';

/**
 * Returns a gate function that checks credit balance before an action.
 * Call `requireCredits(cost, actionLabel)` — returns true if user can proceed, false if blocked.
 * When blocked, the upgrade modal is shown automatically.
 */
export function useCreditGate() {
  const { profile } = useAuth();
  const { showUpgrade } = useUpgrade();

  const requireCredits = useCallback((cost: number = 1, action?: string): boolean => {
    const balance = profile?.credit_balance ?? 0;
    if (balance < cost) {
      const hasPlan = profile?.plan && profile.plan !== 'free';
      showUpgrade(hasPlan ? 'credits' : 'general', {
        balance,
        required: cost,
        action,
      });
      return false;
    }
    return true;
  }, [profile, showUpgrade]);

  return { requireCredits };
}
