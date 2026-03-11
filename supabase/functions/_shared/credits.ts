export async function deductCredits(params: {
  supabase: any;
  userId: string;
  workspaceId: string;
  actionKey: string;
  quantity?: number;
}): Promise<{
  success: boolean;
  creditsUsed: number;
  balanceAfter: number;
  error?: string;
}> {
  const { userId, workspaceId, actionKey } = params;
  const quantity = params.quantity || 1;

  // Get credit cost
  const { data: cost } = await params.supabase
    .from('credit_costs')
    .select('credits, action_label, is_active')
    .eq('action_key', actionKey)
    .single();

  if (!cost || !cost.is_active) {
    throw new Error(`Unknown or inactive action: ${actionKey}`);
  }

  const creditsToDeduct = cost.credits * quantity;

  // Atomic deduct
  const { data, error } = await params.supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_workspace_id: workspaceId,
    p_action_key: actionKey,
    p_action_label: cost.action_label,
    p_credits: creditsToDeduct,
  });

  if (error) throw new Error(error.message);

  if (!data.success) {
    return {
      success: false,
      creditsUsed: 0,
      balanceAfter: data.balance,
      error: 'insufficient_credits',
    };
  }

  return {
    success: true,
    creditsUsed: creditsToDeduct,
    balanceAfter: data.balance_after,
  };
}

export async function getCreditCost(
  supabase: any,
  actionKey: string
): Promise<number> {
  const { data } = await supabase
    .from('credit_costs')
    .select('credits')
    .eq('action_key', actionKey)
    .single();
  return data?.credits || 0;
}

export function insufficientCreditsResponse(
  corsHeaders: Record<string, string>,
  balance: number,
  required: number
) {
  return new Response(
    JSON.stringify({
      error: 'insufficient_credits',
      balance,
      required,
    }),
    { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
