/**
 * Friendly error messages mapped from known error codes / keys.
 * Use with: getFriendlyError(err.message || err.code)
 */
const ERROR_MESSAGES: Record<string, { bn: string; en: string }> = {
  insufficient_credits: {
    bn: 'ক্রেডিট শেষ। প্ল্যান আপগ্রেড করুন।',
    en: 'Not enough credits. Please upgrade your plan.',
  },
  rate_limit_exceeded: {
    bn: 'অনেক বেশি রিকোয়েস্ট হচ্ছে। একটু অপেক্ষা করুন।',
    en: 'Too many requests. Please wait a moment.',
  },
  generation_failed: {
    bn: 'জেনারেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
    en: 'Generation failed. Please try again.',
  },
  payment_failed: {
    bn: 'পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
    en: 'Payment failed. Please try again.',
  },
  workspace_limit_reached: {
    bn: 'আরো ওয়ার্কস্পেস যোগ করতে প্ল্যান আপগ্রেড করুন।',
    en: 'Upgrade your plan to add more workspaces.',
  },
  unauthorized: {
    bn: 'আবার লগইন করুন।',
    en: 'Please log in again.',
  },
  network_error: {
    bn: 'ইন্টারনেট সংযোগ পরীক্ষা করুন।',
    en: 'Please check your internet connection.',
  },
};

const DEFAULT_ERROR = {
  bn: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  en: 'Something went wrong. Please try again.',
};

/**
 * Get a user-friendly error message from an error string or code.
 */
export function getFriendlyError(errorKey: string | undefined, lang: 'bn' | 'en' = 'en'): string {
  if (!errorKey) return DEFAULT_ERROR[lang];

  const lower = errorKey.toLowerCase().replace(/\s+/g, '_');
  const match = ERROR_MESSAGES[lower];
  if (match) return match[lang];

  // Check partial matches
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (lower.includes(key)) return msg[lang];
  }

  return DEFAULT_ERROR[lang];
}

export default ERROR_MESSAGES;
