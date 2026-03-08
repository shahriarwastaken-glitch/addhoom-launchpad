import { supabase } from '@/integrations/supabase/client';

export type ApiError = {
  error: true;
  code: number;
  message_bn: string;
  message_en: string;
};

async function callFunction<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: ApiError | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    return {
      data: null,
      error: {
        error: true,
        code: 500,
        message_bn: 'কিছু একটা সমস্যা হয়েছে।',
        message_en: error.message || 'Something went wrong.',
      },
    };
  }

  if (data?.error) {
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
    competitor_url: string;
    competitor_name?: string;
  }) => callFunction<{ analysis: any }>('competitor-intel', params),

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
};
