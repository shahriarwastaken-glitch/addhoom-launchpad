import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ScatterChart, Scatter, ZAxis,
  Cell,
} from 'recharts';
import { Search, BarChart3, Activity, TrendingUp, Lightbulb } from 'lucide-react';

const COLORS = ['#FF5100', '#00B96B', '#6C3FE8', '#FFB800', '#E8453F', '#0096C7'];
const toBn = (n: number) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

type HistoryItem = {
  id: string; competitor_name: string; competitor_url: string | null;
  top_patterns: string[]; ads_count: number; created_at: string;
};

const RADAR_DIMS = ['FOMO', 'Price Anchoring', 'Social Proof', 'Authority', 'Urgency', 'Emotional'];

const matchesDim = (pattern: string, dim: string): boolean => {
  const p = pattern.toLowerCase();
  const checks: Record<string, string[]> = {
    'FOMO': ['fomo', 'miss', 'limited', 'শেষ', 'সীমিত'],
    'Price Anchoring': ['price', 'discount', 'দাম', 'ছাড়', 'anchor', 'offer'],
    'Social Proof': ['social proof', 'review', 'testimonial', 'রিভিউ', 'গ্রাহক'],
    'Authority': ['authority', 'expert', 'বিশেষজ্ঞ', 'certif', 'brand'],
    'Urgency': ['urgent', 'hurry', 'now', 'তাড়াতাড়ি', 'এখনই', 'deadline'],
    'Emotional': ['emotion', 'story', 'feel', 'গল্প', 'আবেগ', 'heart'],
  };
  return (checks[dim] || []).some(k => p.includes(k));
};

const ChartCard = ({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`bg-card rounded-2xl shadow-warm p-4 sm:p-5 border border-border ${className}`}>
    <h4 className="font-heading-bn font-bold text-foreground text-sm mb-0.5">{title}</h4>
    {subtitle && <p className="text-[11px] text-muted-foreground font-body-bn mb-3">{subtitle}</p>}
    {children}
  </div>
);

const CompetitorCharts = ({ competitors }: { competitors: HistoryItem[] }) => {
  const { t, lang } = useLanguage();

  // Deduplicate by name (latest first)
  const unique = useMemo(() => {
    const sorted = [...competitors].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const seen = new Set<string>();
    return sorted.filter(c => {
      if (seen.has(c.competitor_name)) return false;
      seen.add(c.competitor_name);
      return true;
    });
  }, [competitors]);

  if (unique.length < 2) {
    return (
      <div className="bg-card rounded-2xl shadow-warm p-8 text-center mb-6 border border-border">
        <div className="flex justify-center gap-4 mb-4 opacity-30">
          <BarChart3 size={32} /> <Activity size={32} /> <TrendingUp size={32} /> <Search size={32} />
        </div>
        <p className="text-muted-foreground font-body-bn text-sm">
          {t('তুলনা চার্ট দেখতে কমপক্ষে ২টি প্রতিযোগী বিশ্লেষণ করুন', 'Analyze at least 2 competitors to see comparison charts')}
        </p>
        <p className="text-xs text-primary mt-2 font-body-bn">{t('প্রথম বিশ্লেষণ শুরু করুন →', 'Start first analysis →')}</p>
      </div>
    );
  }

  // Chart 1: Ad volume
  const adVolumeData = unique.map(c => ({
    name: c.competitor_name.length > 12 ? c.competitor_name.slice(0, 12) + '…' : c.competitor_name,
    fullName: c.competitor_name,
    count: c.ads_count,
  }));
  const maxAds = Math.max(...adVolumeData.map(d => d.count));

  // Chart 2: Radar
  const radarData = RADAR_DIMS.map(dim => {
    const entry: any = { dimension: dim };
    unique.forEach(c => {
      entry[c.competitor_name] = c.top_patterns.some(p => matchesDim(p, dim)) ? 1 : 0;
    });
    return entry;
  });

  // Chart 3: Timeline scatter
  const scatterData = competitors.map(c => ({
    x: new Date(c.created_at).getTime(),
    y: c.ads_count,
    name: c.competitor_name,
    date: new Date(c.created_at).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US'),
    z: Math.max(c.ads_count * 10, 40),
  }));

  // Chart 4: Pattern frequency
  const patternMap = new Map<string, Set<string>>();
  competitors.forEach(c => {
    c.top_patterns.forEach(p => {
      const short = (typeof p === 'string' ? p.split(':')[0].split('—')[0].trim() : '').slice(0, 30);
      if (!short) return;
      if (!patternMap.has(short)) patternMap.set(short, new Set());
      patternMap.get(short)!.add(c.competitor_name);
    });
  });
  const patternFreq = Array.from(patternMap.entries())
    .map(([pattern, users]) => ({ pattern, count: users.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Generate insight
  const insight = useMemo(() => {
    const top = adVolumeData.reduce((a, b) => a.count > b.count ? a : b);
    const avg = adVolumeData.reduce((s, d) => s + d.count, 0) / adVolumeData.length;
    if (top.count > avg * 2.5) {
      return lang === 'bn'
        ? `${top.fullName} সবচেয়ে বেশি বিজ্ঞাপন চালাচ্ছে — তারা সম্ভবত সবচেয়ে বেশি বাজেট খরচ করছে।`
        : `${top.fullName} is running the most ads — they likely have the highest ad budget.`;
    }
    if (patternFreq.length > 0) {
      const topPattern = patternFreq[0].pattern;
      return lang === 'bn'
        ? `আপনার বাজারে "${topPattern}" সবচেয়ে বেশি ব্যবহৃত কৌশল। ভিন্ন কৌশল নিয়ে এগিয়ে থাকুন।`
        : `"${topPattern}" is the most common strategy. Try a different approach to stand out.`;
    }
    return lang === 'bn'
      ? 'সব প্রতিযোগী একই কৌশল ব্যবহার করছে। এটাই আপনার সুযোগ — ভিন্ন কিছু করুন।'
      : 'All competitors use similar strategies. This is your opportunity — do something different.';
  }, [adVolumeData, patternFreq, lang]);

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="font-heading-bn font-bold text-foreground text-lg">
          {t('প্রতিযোগী তুলনা বিশ্লেষণ', 'Competitor Comparison Analysis')}
        </h3>
        <p className="text-xs text-muted-foreground font-body-bn">
          {lang === 'bn'
            ? `${toBn(unique.length)}টি প্রতিযোগীর তথ্য বিশ্লেষণ করা হয়েছে`
            : `${unique.length} competitors analyzed`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Ad Volume */}
        <ChartCard
          title={t('কে কতটি বিজ্ঞাপন চালাচ্ছে?', 'Who is running how many ads?')}
          subtitle={t('বেশি বিজ্ঞাপন = বেশি বাজেট = বেশি আক্রমণাত্মক', 'More ads = more budget = more aggressive')}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={adVolumeData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number, _: any, entry: any) => [
                  `${lang === 'bn' ? toBn(value) : value}টি সক্রিয় বিজ্ঞাপন`,
                  entry.payload.fullName
                ]}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 'bold' }}>
                {adVolumeData.map((entry, i) => (
                  <Cell key={i} fill={entry.count === maxAds && maxAds > 0 ? '#FF5100' : '#FFB066'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Radar */}
        <ChartCard
          title={t('কোন কৌশল কারা ব্যবহার করছে?', 'Who uses which strategy?')}
        >
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
              {unique.slice(0, 4).map((c, i) => (
                <Radar
                  key={c.id}
                  name={c.competitor_name}
                  dataKey={c.competitor_name}
                  stroke={COLORS[i]}
                  fill={COLORS[i]}
                  fillOpacity={0.2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Timeline Scatter */}
        <ChartCard
          title={t('প্রতিযোগীদের কার্যকলাপের ট্রেন্ড', 'Competitor Activity Trend')}
        >
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="x" type="number" domain={['auto', 'auto']}
                tickFormatter={v => new Date(v).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 9 }}
              />
              <YAxis dataKey="y" tick={{ fontSize: 10 }} />
              <ZAxis dataKey="z" range={[40, 200]} />
              <Tooltip
                formatter={(_: any, __: any, entry: any) => [
                  `${entry.payload.name} — ${entry.payload.date} — ${lang === 'bn' ? toBn(entry.payload.y) : entry.payload.y}টি অ্যাড`,
                  ''
                ]}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 11 }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => {
                  const colorIdx = unique.findIndex(u => u.competitor_name === entry.name);
                  return <Cell key={i} fill={COLORS[colorIdx % COLORS.length]} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Pattern Frequency */}
        <ChartCard
          title={t('বাজারে সবচেয়ে বেশি ব্যবহৃত কৌশল', 'Most Used Strategies in Market')}
        >
          <ResponsiveContainer width="100%" height={Math.max(200, patternFreq.length * 40)}>
            <BarChart data={patternFreq} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="pattern" type="category" width={120} tick={{ fontSize: 9 }} />
              <Tooltip
                formatter={(value: number) => [
                  `${lang === 'bn' ? toBn(value) : value}টি প্রতিযোগী ব্যবহার করছে`,
                  ''
                ]}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 11 }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {patternFreq.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#FF5100' : i < 3 ? '#FF8533' : '#FFB800'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Insight callout */}
      <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Lightbulb size={20} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground font-heading-bn mb-1">
            {t('AI অন্তর্দৃষ্টি:', 'AI Insight:')}
          </p>
          <p className="text-sm text-muted-foreground font-body-bn">{insight}</p>
        </div>
      </div>
    </div>
  );
};

export default CompetitorCharts;
