import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Save, RotateCcw, Loader2 } from 'lucide-react';

const PLAN_LIMITS = {
  pro: {
    video_ads_per_month: 2,
    max_video_duration: 15,
  },
  agency: {
    video_ads_per_month: 'unlimited',
    max_video_duration: 30,
  },
};

const PRICING = {
  pro: {
    monthly: 2999,
    annual: 28790,
    discount: 20,
  },
  agency: {
    monthly: 7999,
    annual: 76790,
    discount: 20,
  },
};

const DEFAULT_SYSTEM_PROMPT = `You are AdDhoom AI — Bangladesh's most intelligent digital marketing strategist...

(Default prompt from supabase/functions/_shared/systemPrompt.ts)`;

export default function AdminSettings() {
  const [refreshing, setRefreshing] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [usingDefault, setUsingDefault] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadSystemPrompt();
  }, []);

  const loadSystemPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'get_system_prompt' }
      });
      if (error) throw error;
      
      if (data.prompt) {
        setSystemPrompt(data.prompt);
        setOriginalPrompt(data.prompt);
        setUsingDefault(false);
      } else {
        // Fetch default prompt from backend or show placeholder
        setSystemPrompt('');
        setOriginalPrompt('');
        setUsingDefault(true);
      }
      setLastUpdated(data.updated_at);
    } catch (err: any) {
      toast.error('সিস্টেম প্রম্পট লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!systemPrompt.trim()) {
      toast.error('প্রম্পট খালি রাখা যাবে না।');
      return;
    }

    setSavingPrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'update_system_prompt', prompt: systemPrompt }
      });
      if (error) throw error;
      
      setOriginalPrompt(systemPrompt);
      setUsingDefault(false);
      toast.success('সিস্টেম প্রম্পট সফলভাবে আপডেট হয়েছে!');
      loadSystemPrompt();
    } catch (err: any) {
      toast.error(err.message || 'সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    setSavingPrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'reset_system_prompt' }
      });
      if (error) throw error;
      
      setSystemPrompt('');
      setOriginalPrompt('');
      setUsingDefault(true);
      toast.success('ডিফল্ট প্রম্পটে ফিরে গেছে।');
    } catch (err: any) {
      toast.error(err.message || 'রিসেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleRefreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-compute-metrics');
      if (error) throw error;
      toast.success('মেট্রিক্স ক্যাশ সফলভাবে আপডেট হয়েছে।');
    } catch (err: any) {
      toast.error(err.message || 'আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setRefreshing(false);
    }
  };

  const hasChanges = systemPrompt !== originalPrompt;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl md:text-2xl font-bold">প্ল্যাটফর্ম সেটিংস</h1>

      {/* System Prompt Editor */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🤖 AI সিস্টেম প্রম্পট
                {usingDefault && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">
                    ডিফল্ট ব্যবহার হচ্ছে
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                AdDhoom AI এর ব্যক্তিত্ব এবং আচরণ নির্ধারণ করে
                {lastUpdated && !usingDefault && (
                  <span className="ml-2 text-xs">
                    • শেষ আপডেট: {new Date(lastUpdated).toLocaleDateString('bn-BD')}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPrompt ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={DEFAULT_SYSTEM_PROMPT}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleSavePrompt} 
                  disabled={savingPrompt || !hasChanges}
                  className="gap-2"
                >
                  {savingPrompt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  সংরক্ষণ করুন
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetPrompt}
                  disabled={savingPrompt || usingDefault}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  ডিফল্টে ফিরুন
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 টিপ: কাস্টম প্রম্পট না দিলে supabase/functions/_shared/systemPrompt.ts থেকে ডিফল্ট প্রম্পট ব্যবহার হবে।
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan Limits */}
      <Card>
        <CardHeader>
          <CardTitle>পরিকল্পনার সীমা</CardTitle>
          <CardDescription>
            সীমা পরিবর্তন করতে কোড আপডেট প্রয়োজন (planLimits.ts)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-3">Pro Plan</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ভিডিও বিজ্ঞাপন/মাস</span>
                  <span className="font-medium">{PLAN_LIMITS.pro.video_ads_per_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বোচ্চ ভিডিও দৈর্ঘ্য</span>
                  <span className="font-medium">{PLAN_LIMITS.pro.max_video_duration}s</span>
                </div>
              </div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-4">
              <h4 className="font-semibold text-purple-600 mb-3">Agency Plan</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ভিডিও বিজ্ঞাপন/মাস</span>
                  <span className="font-medium">{PLAN_LIMITS.agency.video_ads_per_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>সর্বোচ্চ ভিডিও দৈর্ঘ্য</span>
                  <span className="font-medium">{PLAN_LIMITS.agency.max_video_duration}s</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Info */}
      <Card>
        <CardHeader>
          <CardTitle>মূল্য তথ্য</CardTitle>
          <CardDescription>
            বর্তমান মূল্য কাঠামো
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Pro</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>মাসিক</span>
                  <span className="font-medium">৳{PRICING.pro.monthly.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>বার্ষিক</span>
                  <span className="font-medium">৳{PRICING.pro.annual.toLocaleString()} ({PRICING.pro.discount}% ছাড়)</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Agency</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>মাসিক</span>
                  <span className="font-medium">৳{PRICING.agency.monthly.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>বার্ষিক</span>
                  <span className="font-medium">৳{PRICING.agency.annual.toLocaleString()} ({PRICING.agency.discount}% ছাড়)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cache */}
      <Card>
        <CardHeader>
          <CardTitle>মেট্রিক্স ক্যাশ</CardTitle>
          <CardDescription>
            দ্রুত ড্যাশবোর্ড লোডিংয়ের জন্য প্রাক-গণনাকৃত মেট্রিক্স
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefreshMetrics} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            এখনই আপডেট করুন
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
