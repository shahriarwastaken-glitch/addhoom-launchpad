/**
 * Checks if a supabase functions error is a 402 insufficient credits error
 * and dispatches the credits:insufficient event to trigger the upgrade modal.
 * Returns true if it was a credit error (so caller can skip generic error handling).
 * 
 * Usage: after supabase.functions.invoke, pass both error and data:
 *   if (error) {
 *     if (handleCreditError(error, data)) return;
 *     throw error;
 *   }
 * 
 * Also call in catch blocks for thrown errors:
 *   catch (e) { if (!handleCreditError(e)) toast.error(...); }
 */
export function handleCreditError(error: any, data?: any): boolean {
  // 1. Check if data contains insufficient_credits (some invoke patterns return data even on error)
  if (data?.error === 'insufficient_credits') {
    dispatchCreditEvent(data.balance, data.required, data.action);
    return true;
  }

  if (!error) return false;

  // 2. Check error message for credit-related patterns
  const msg = typeof error === 'string' ? error : error?.message || '';
  const isCredit = msg.includes('insufficient_credits') || msg.includes('402');

  // 3. FunctionsHttpError from supabase-js has a context with the response body
  if (error?.context) {
    try {
      // context can be a Response object or parsed JSON
      if (typeof error.context === 'object' && error.context.json) {
        // It's a Response — try to read it
        error.context.json().then((body: any) => {
          if (body?.error === 'insufficient_credits') {
            dispatchCreditEvent(body.balance, body.required, body.action);
          }
        }).catch(() => {});
        if (isCredit) return true;
      }
    } catch {
      // ignore
    }
  }

  // 4. Check for status property
  if (error?.status === 402) {
    dispatchCreditEvent(0, 0, '');
    return true;
  }

  // 5. Fallback: if message hints at credit issues
  if (isCredit) {
    dispatchCreditEvent(0, 0, '');
    return true;
  }

  return false;
}

function dispatchCreditEvent(balance: number, required: number, action: string) {
  window.dispatchEvent(
    new CustomEvent('credits:insufficient', {
      detail: { balance: balance ?? 0, required: required ?? 0, action: action || '' },
    })
  );
}
