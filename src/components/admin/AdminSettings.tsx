import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Copy, Check } from 'lucide-react';

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

const SYSTEM_PROMPT_PREVIEW = `তুমি একজন বাংলাদেশি ডিজিটাল মার্কেটিং বিশেষজ্ঞ এবং কপিরাইটার। তোমার নাম "AdDhoom AI"...

(Full prompt in supabase/functions/_shared/systemPrompt.ts)`;

export default function AdminSettings() {
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT_PREVIEW);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('কপি করা হয়েছে!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">প্ল্যাটফর্ম সেটিংস</h1>

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

      {/* System Prompt Preview */}
      <Card>
        <CardHeader>
          <CardTitle>সিস্টেম প্রম্পট প্রিভিউ</CardTitle>
          <CardDescription>
            প্রম্পট পরিবর্তন করতে supabase/functions/_shared/systemPrompt.ts আপডেট করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-auto max-h-48 text-muted-foreground">
              {SYSTEM_PROMPT_PREVIEW}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyPrompt}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
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
