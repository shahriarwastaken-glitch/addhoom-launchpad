import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ApiError = {
  error: true;
  code: number;
  message_bn: string;
  message_en: string;
};

// Event emitter for upgrade modal (avoids circular deps with React context)
type UpgradeHandler = (type: 'video' | 'general') => void;
let _upgradeHandler: UpgradeHandler | null = null;
export const setUpgradeHandler = (handler: UpgradeHandler) => { _upgradeHandler = handler; };

async function callFunction<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: ApiError | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  // Network / invocation error
  if (error) {
    const status = (error as any)?.status || (error as any)?.context?.status || 500;

    if (status === 401) {
      window.location.href = '/auth';
      return { data: null, error: { error: true, code: 401, message_bn: 'আবার লগইন করুন।', message_en: 'Please log in again.' } };
    }

    if (status === 402) {
      const isVideo = name === 'generate-video' || name === 'video';
      _upgradeHandler?.(isVideo ? 'video' : 'general');
      return { data: null, error: { error: true, code: 402, message_bn: 'আপগ্রেড প্রয়োজন।', message_en: 'Upgrade required.' } };
    }

    if (status === 503) {
      toast.info('AI এখন ব্যস্ত। ৩০ সেকেন্ড পরে আবার চেষ্টা করুন।', { duration: 6000 });
      return { data: null, error: { error: true, code: 503, message_bn: 'AI ব্যস্ত।', message_en: 'AI is busy.' } };
    }

    toast.error('কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    return {
      data: null,
      error: { error: true, code: 500, message_bn: 'কিছু একটা সমস্যা হয়েছে।', message_en: error.message || 'Something went wrong.' },
    };
  }

  // Application-level error returned in data
  if (data?.error) {
    const code = data.code || 500;

    if (code === 402 || data.error === 'insufficient_credits') {
      window.dispatchEvent(new CustomEvent('credits:insufficient', {
        detail: {
          action: name,
          required: data.required,
          balance: data.balance,
        }
      }));
      return { data: null, error: { error: true, code: 402, message_bn: 'ক্রেডিট শেষ।', message_en: 'Insufficient credits.' } };
    }

    return { data: null, error: data as ApiError };
  }

  return { data: data as T, error: null };
}

export const api = {
  generateAds: (params: {
    workspace_id: string;
    product_name: string;
    description?: string;
    price_bdt?: number;
    target_audience?: string;
    platform?: string[];
    language?: string;
    framework?: string;
    occasion?: string;
    num_variations?: number;
    tone?: string;
  }) => callFunction<{ ads: any[] }>('generate-ads', params),

  generateAdsFromUrl: (params: {
    workspace_id: string;
    url: string;
    platform?: string[];
    language?: string;
  }) => callFunction<{ product_info: any; ads: any[] }>('generate-ads-from-url', params),

  aiChat: (params: {
    workspace_id: string;
    conversation_id?: string | null;
    message: string;
    language?: string;
  }) => callFunction<{ response: string; conversation_id: string }>('ai-chat', params),

  competitorIntel: (params: {
    workspace_id: string;
    competitor_name: string;
    competitor_page_url?: string;
  }) => callFunction<{ analysis: any; ads: any[]; ads_fetched: boolean; saved_id?: string }>('competitor-intel', params),

  accountDoctor: (params: {
    workspace_id: string;
  }) => callFunction<{ report: any }>('account-doctor', params),

  calculateRoi: (params: {
    monthly_spend_bdt: number;
    hours_weekly: number;
    platforms: string[];
  }) => callFunction<{
    annual_savings_bdt: number;
    monthly_savings_bdt: number;
    hours_saved_monthly: number;
    roi_pct: number;
    roas_boost: number;
  }>('calculate-roi', params),

  remixAd: (params: {
    workspace_id: string;
    ad_id: string;
    num_variations?: number;
  }) => callFunction<{ ads: any[] }>('remix-ad', params),

  generateContentCalendar: (params: {
    workspace_id: string;
    start_date: string;
    posts_per_week?: number;
    platforms?: string[];
    content_mix?: Record<string, number>;
    regenerate?: boolean;
    language?: string;
  }) => callFunction<{ total_items: number; batch_id: string; festivals_covered: string[] }>('generate-content-calendar', params),

  updateCalendarItem: (params: {
    item_id: string;
    title?: string;
    content_idea?: string;
    date?: string;
    content_type?: string;
    platform?: string;
    status?: string;
  }) => callFunction<{ item: any }>('update-calendar-item', params),

  swipeAction: (params: {
    item_id: string;
    action: 'confirm' | 'skip' | 'generate' | 'undo_skip';
  }) => callFunction<{ action: string; redirect_to?: string; prefill?: Record<string, string> }>('swipe-action', params),

  bulkUpdateCalendar: (params: {
    item_ids: string[];
    action: 'confirm' | 'skip' | 'reschedule';
    new_date?: string;
  }) => callFunction<{ updated: number }>('bulk-update-calendar', params),
};
