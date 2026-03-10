import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Target,
  ThumbsUp,
  Meh,
  ThumbsDown
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import OverviewStats from './analytics/OverviewStats';
import PerformanceFeedback from './analytics/PerformanceFeedback';
import FrameworkPerformance from './analytics/FrameworkPerformance';
import PlatformBreakdown from './analytics/PlatformBreakdown';
import ScoreTrend from './analytics/ScoreTrend';
import TopPerformingAds from './analytics/TopPerformingAds';
import OccasionHeatmap from './analytics/OccasionHeatmap';
import LanguagePerformance from './analytics/LanguagePerformance';

export interface AnalyticsData {
  total_ads: number;
  avg_dhoom_score: number;
  winner_count: number;
  best_framework: {
    framework: string;
    avg_score: number;
    count: number;
  } | null;
  framework_breakdown: Array<{
    framework: string;
    count: number;
    avg_score: number;
    good_performance_rate: number;
  }>;
  platform_breakdown: Array<{
    platform: string;
    count: number;
    avg_score: number;
    best_framework: string | null;
  }>;
  score_trend: Array<{
    date: string;
    avg_score: number;
  }>;
  top_ads: {
    by_score: any[];
    winners: any[];
    good_performance: any[];
  };
  occasion_heatmap: Array<{
    occasion: string;
    month: number;
    count: number;
    avg_score: number;
  }>;
  language_comparison: {
    bn: { count: number; avg_score: number };
    en: { count: number; avg_score: number };
  };
  unrated_ads: any[];
  workspace_industry: string | null;
}

const Analytics = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | '3month' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('get-analytics-overview', {
        body: { period },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      setData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error(t('ডেটা লোড করতে সমস্যা হয়েছে', 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, user]);

  const handleRateAd = async (creativeId: string, rating: 'good' | 'neutral' | 'poor') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('rate-ad-performance', {
        body: { creative_id: creativeId, rating },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast.success(response.data.insight);
      fetchAnalytics(); // Refresh data
    } catch (error) {
      console.error('Error rating ad:', error);
      toast.error(t('রেটিং সংরক্ষণে সমস্যা হয়েছে', 'Failed to save rating'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('লোড হচ্ছে...', 'Loading...')}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('ডেটা পাওয়া যায়নি', 'No data available')}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold font-body-bn">{t('বিশ্লেষণ', 'Analytics')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('আপনার বিজ্ঞাপনের পারফরম্যান্স প্যাটার্ন', 'Your ad performance patterns')}
          </p>
        </div>

        {/* Period Filter */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
            <TabsTrigger value="week" className="px-2 text-[11px] md:px-3 md:text-sm">
              {t('এই সপ্তাহ', 'This Week')}
            </TabsTrigger>
            <TabsTrigger value="month" className="px-2 text-[11px] md:px-3 md:text-sm">
              {t('এই মাস', 'This Month')}
            </TabsTrigger>
            <TabsTrigger value="3month" className="px-2 text-[11px] md:px-3 md:text-sm">
              {t('৩ মাস', '3 Months')}
            </TabsTrigger>
            <TabsTrigger value="all" className="px-2 text-[11px] md:px-3 md:text-sm">
              {t('সব সময়', 'All Time')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Data Note */}
      <div className="border-l-2 border-border pl-3 py-1">
        <p className="text-[11px] text-muted-foreground italic">
          {t(
            'এই তথ্য AdDhoom-এ তৈরি বিজ্ঞাপনের উপর ভিত্তি করে। আসল Facebook পারফরম্যান্স ডেটা নয়।',
            'This data is based on ads created in AdDhoom. Not actual Facebook performance data.'
          )}
        </p>
      </div>

      {/* Section 1: Overview Stats */}
      <OverviewStats data={data} />

      {/* Section 2: Performance Feedback */}
      {data.unrated_ads.length > 0 && (
        <PerformanceFeedback 
          unratedAds={data.unrated_ads} 
          onRate={handleRateAd}
        />
      )}

      {/* Section 3: Framework Performance */}
      {data.framework_breakdown.length > 0 && (
        <FrameworkPerformance 
          data={data.framework_breakdown}
          industry={data.workspace_industry}
        />
      )}

      {/* Section 4: Platform Breakdown */}
      {data.platform_breakdown.length > 0 && (
        <PlatformBreakdown data={data.platform_breakdown} />
      )}

      {/* Section 5: Score Trend */}
      {data.score_trend.length > 0 && (
        <ScoreTrend data={data.score_trend} />
      )}

      {/* Section 6: Top Performing Ads */}
      {data.top_ads.by_score.length > 0 && (
        <TopPerformingAds topAds={data.top_ads} />
      )}

      {/* Section 7: Occasion Heatmap */}
      {data.occasion_heatmap.length > 0 && (
        <OccasionHeatmap data={data.occasion_heatmap} />
      )}

      {/* Section 8: Language Performance */}
      {(data.language_comparison.bn.count > 0 || data.language_comparison.en.count > 0) && (
        <LanguagePerformance data={data.language_comparison} />
      )}
    </div>
  );
};

export default Analytics;