/**
 * Checks if a supabase functions error is a 402 insufficient credits error
 * and dispatches the credits:insufficient event to trigger the upgrade modal.
 * Returns true if it was a credit error (so caller can skip generic error handling).
 */
export function handleCreditError(error: any, data?: any): boolean {
  // Check if the response data itself indicates insufficient credits
  if (data?.error === 'insufficient_credits') {
    window.dispatchEvent(
      new CustomEvent('credits:insufficient', {
        detail: {
          balance: data.balance ?? 0,
          required: data.required ?? 0,
          action: data.action || '',
        },
      })
    );
    return true;
  }

  // Check if the error object from supabase.functions.invoke contains 402 info
  if (error) {
    const msg = typeof error === 'string' ? error : error?.message || '';
    // supabase functions.invoke wraps non-2xx as FunctionsHttpError
    // The context may include the parsed body
    if (
      msg.includes('insufficient_credits') ||
      msg.includes('402') ||
      error?.status === 402
    ) {
      // Try to extract details from the error context
      let balance = 0;
      let required = 0;
      let action = '';
      try {
        const ctx = error?.context ? JSON.parse(error.context) : {};
        balance = ctx.balance ?? 0;
        required = ctx.required ?? 0;
        action = ctx.action ?? '';
      } catch {
        // ignore
      }
      window.dispatchEvent(
        new CustomEvent('credits:insufficient', {
          detail: { balance, required, action },
        })
      );
      return true;
    }
  }

  return false;
}
