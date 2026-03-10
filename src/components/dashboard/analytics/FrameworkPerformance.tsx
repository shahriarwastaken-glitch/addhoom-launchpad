import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp } from 'lucide-react';

interface FrameworkPerformanceProps {
  data: Array<{
    framework: string;
    count: number;
    avg_score: number;
    good_performance_rate: number;
  }>;
  industry: string | null;
}

const FrameworkPerformance = ({ data, industry }: FrameworkPerformanceProps) => {
  const { t } = useLanguage();

  const chartData = data.map(item => ({
    name: item.framework,
    score: Math.round(item.avg_score),
    count: item.count
  }));

  const topFramework = data.length > 0 ? data[0] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('কোন কৌশল সবচেয়ে ভালো কাজ করে?', 'Which Strategy Works Best?')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold font-body-bn">{payload[0].payload.name}</p>
                      <p className="text-sm text-muted-foreground font-body-bn">
                        {t('স্কোর', 'Score')}: {payload[0].value}
                      </p>
                      <p className="text-xs text-muted-foreground font-body-bn">
                        ({payload[0].payload.count} {t('টি বিজ্ঞাপন', 'ads')})
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="score" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insight Callout */}
        {topFramework && (
          <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-lg">
            <p className="text-sm font-body-bn flex items-start gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {t(
                `${topFramework.framework} কৌশল আপনার ${industry || 'ব্যবসার'} জন্য সবচেয়ে কার্যকর। পরবর্তী বিজ্ঞাপনে ${topFramework.framework} ব্যবহার করুন।`,
                `${topFramework.framework} strategy is most effective for your ${industry || 'business'}. Use ${topFramework.framework} in your next ads.`
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FrameworkPerformance;