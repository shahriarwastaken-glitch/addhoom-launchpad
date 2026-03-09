export async function checkPlanLimit(
  supabaseClient: any,
  userId: string,
  feature: string,
  language: string = "bn"
): Promise<{ 
  allowed: boolean; 
  plan: string; 
  used: number; 
  limit: number;
  reason?: string;
  remaining?: number;
  period?: string;
}> {
  try {
    // 1. Get user's plan_key
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('plan_key, plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return { allowed: false, plan: 'unknown', used: 0, limit: 0, reason: 'profile_not_found' };
    }

    // Use plan_key if available, fallback to plan for backwards compatibility
    const planKey = profile.plan_key || profile.plan || 'pro';

    // 2. Get plan limits from DB
    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .select('limits, plan_key, name')
      .eq('plan_key', planKey)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      // Fallback to default limits for backwards compatibility
      return { allowed: true, plan: planKey, used: 0, limit: 999999 };
    }

    const limit = plan.limits[feature];

    // 3. If no limit defined for this feature: allow
    if (!limit) {
      return { allowed: true, plan: planKey, used: 0, limit: 999999 };
    }

    // 4. If unlimited: allow
    if (!limit || limit.type === 'unlimited') {
      return { allowed: true, plan: planKey, used: 0, limit: 999999 };
    }
    
    // 5. If disabled: block
    if (limit.type === 'disabled') {
      return { 
        allowed: false, 
        plan: planKey, 
        used: 0, 
        limit: 0,
        reason: 'feature_not_available' 
      };
    }

    // 6. If number limit: check usage
    if (limit.type === 'number') {
      const period = limit.period || 'month'; // default to month
      const limitValue = limit.value || 0;
      
      let since = null;
      if (period === 'month') {
        const now = new Date();
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'day') {
        const now = new Date();
        since = new Date();
        since.setHours(0, 0, 0, 0);
      }
      // For 'total', since remains null (no time restriction)

      let usageQuery = supabaseClient
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature);

      if (since) {
        usageQuery = usageQuery.gte('created_at', since.toISOString());
      }

      const { count, error: usageError } = await usageQuery;

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        // On error, allow the action but log it
        return { allowed: true, plan: planKey, used: 0, limit: limitValue };
      }

      const used = count || 0;

      if (used >= limitValue) {
        return {
          allowed: false,
          plan: planKey,
          used,
          limit: limitValue,
          period,
          reason: 'limit_reached'
        };
      }

      return { 
        allowed: true, 
        plan: planKey, 
        used, 
        limit: limitValue,
        period,
        remaining: limitValue - used
      };
    }

    // Default: allow if unknown limit type
    return { allowed: true, plan: planKey, used: 0, limit: 999999 };

  } catch (error) {
    console.error('Error in checkPlanLimit:', error);
    // On any error, default to allowing the action
    return { allowed: true, plan: 'unknown', used: 0, limit: 999999 };
  }
}

// Helper function to get all plan limits for a user (useful for UI)
export async function getUserPlanLimits(
  supabaseClient: any,
  userId: string
): Promise<{ planKey: string; planName: string; limits: any } | null> {
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_key, plan')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    const planKey = profile.plan_key || profile.plan || 'pro';

    const { data: plan } = await supabaseClient
      .from('plans')
      .select('limits, plan_key, name')
      .eq('plan_key', planKey)
      .single();

    if (!plan) return null;

    return {
      planKey: plan.plan_key,
      planName: plan.name,
      limits: plan.limits || {}
    };
  } catch (error) {
    console.error('Error fetching user plan limits:', error);
    return null;
  }
}

// Helper function to check if a feature is available on a plan (without usage check)
export async function isFeatureAvailable(
  supabaseClient: any,
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan_key, plan')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    const planKey = profile.plan_key || profile.plan || 'pro';

    const { data: plan } = await supabaseClient
      .from('plans')
      .select('limits')
      .eq('plan_key', planKey)
      .single();

    if (!plan) return true; // Default to available if plan not found

    const limit = plan.limits[feature];
    
    // If no limit defined or unlimited: available
    if (!limit || limit.type === 'unlimited') {
      return true;
    }
    
    // If disabled: not available
    if (limit.type === 'disabled') {
      return false;
    }
    
    // If number limit: available (actual usage check happens in checkPlanLimit)
    if (limit.type === 'number') {
      return true;
    }
    
    return true; // Default to available
  } catch (error) {
    console.error('Error checking feature availability:', error);
    return true; // Default to available on error
  }
}