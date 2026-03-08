import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import KPICard from './KPICard';
import { Star, Sparkles, Target, Trophy } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AIPerformanceData {
  overall: {
    avg_dhoom_score: number;
    avg_copy_score: number;
    total_ads: number;
  };
  by_framework: { name: string; avg_dhoom_score: number; avg_copy_score: number; count: number }[];
  by_occasion: { name: string; avg_dhoom_score: number; avg_copy_score: number; count: number }[];
  by_platform: { name: string; avg_dhoom_score: number; avg_copy_score: number; count: number }[];
  by_language: { name: string; avg_dhoom_score: number; avg_copy_score: number; count: number }[];
  daily_trend: { date: string; avg_dhoom_score: number; count: number }[];
  worst_ads: any[];
  best_ads: any[];
}

const getScoreColor = (score: number) => {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
};

export default function AdminAIPerformance() {
  const [data, setData] = useState<AIPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('admin-get-ai-performance');
        if (error) throw error;
        setData(result);
      } catch (err: any) {
        toast.error(err.message || 'ডেটা লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI পারফরম্যান্স</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const winnerRate = data.overall.total_ads > 0 
    ? Math.round((data.best_ads.filter(a => a.dhoom_score >= 70).length / data.overall.total_ads) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI পারফরম্যান্স</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="গড় ধুম স্কোর"
          value={data.overall.avg_dhoom_score}
          icon={Star}
          badgeType={data.overall.avg_dhoom_score >= 70 ? 'success' : data.overall.avg_dhoom_score >= 50 ? 'warning' : 'error'}
          badge={data.overall.avg_dhoom_score >= 70 ? 'ভালো' : data.overall.avg_dhoom_score >= 50 ? 'মোটামুটি' : 'উন্নতি দরকার'}
        />
        <KPICard
          title="গড় কপি স্কোর"
          value={data.overall.avg_copy_score}
          icon={Sparkles}
        />
        <KPICard
          title="মোট বিজ্ঞাপন"
          value={data.overall.total_ads.toLocaleString()}
          icon={Target}
        />
        <KPICard
          title="Winner Rate"
          value={`${winnerRate}%`}
          icon={Trophy}
        />
      </div>

      {/* Quality Trend Chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold mb-4">ধুম স্কোর ট্রেন্ড (৩০ দিন)</h3>
        {data.daily_trend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [value, 'ধুম স্কোর']}
                  labelFormatter={(label) => `তারিখ: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_dhoom_score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            পর্যাপ্ত ডেটা নেই
          </div>
        )}
      </div>

      {/* Framework & Occasion Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Framework Performance */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">ফ্রেমওয়ার্ক পারফরম্যান্স</h3>
          {data.by_framework.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_framework} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'গড় স্কোর']}
                  />
                  <Bar dataKey="avg_dhoom_score" radius={[0, 4, 4, 0]}>
                    {data.by_framework.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.avg_dhoom_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              কোনো ডেটা নেই
            </div>
          )}
        </div>

        {/* Occasion Performance */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">উপলক্ষ পারফরম্যান্স</h3>
          {data.by_occasion.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_occasion.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'গড় স্কোর']}
                  />
                  <Bar dataKey="avg_dhoom_score" radius={[0, 4, 4, 0]}>
                    {data.by_occasion.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.avg_dhoom_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              কোনো ডেটা নেই
            </div>
          )}
        </div>
      </div>

      {/* Language Comparison */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold mb-4">ভাষা তুলনা</h3>
        <div className="flex gap-6 justify-center py-4">
          {data.by_language.map((lang) => (
            <div key={lang.name} className="text-center">
              <div 
                className="text-4xl font-bold"
                style={{ color: getScoreColor(lang.avg_dhoom_score) }}
              >
                {lang.avg_dhoom_score}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {lang.name === 'bn' ? 'বাংলা' : lang.name === 'en' ? 'English' : lang.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang.count} বিজ্ঞাপন
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best & Worst Ads */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Ads */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500"><Trophy className="h-4 w-4" /></span>
            সেরা বিজ্ঞাপন (সর্বকালের)
          </h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {data.best_ads.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">কোনো ডেটা নেই</div>
            ) : (
              data.best_ads.map((ad) => (
                <div key={ad.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium text-sm line-clamp-2">{ad.headline || 'N/A'}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: getScoreColor(ad.dhoom_score), color: getScoreColor(ad.dhoom_score) }}
                    >
                      Score: {ad.dhoom_score}
                    </Badge>
                    {ad.framework && (
                      <Badge variant="outline" className="text-xs">{ad.framework}</Badge>
                    )}
                    {ad.occasion && (
                      <Badge variant="outline" className="text-xs">{ad.occasion}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Worst Ads */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">!</span>
            দুর্বল বিজ্ঞাপন (গত ৭ দিন)
          </h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {data.worst_ads.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">কোনো দুর্বল বিজ্ঞাপন নেই 🎉</div>
            ) : (
              data.worst_ads.map((ad) => (
                <div key={ad.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium text-sm line-clamp-2">{ad.headline || 'N/A'}</div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: getScoreColor(ad.dhoom_score), color: getScoreColor(ad.dhoom_score) }}
                    >
                      Score: {ad.dhoom_score}
                    </Badge>
                    {ad.framework && (
                      <Badge variant="outline" className="text-xs">{ad.framework}</Badge>
                    )}
                    <span className="text-xs text-primary">প্রম্পট রিভিউ করুন</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
