import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScoreTrendProps {
  data: Array<{
    date: string;
    avg_score: number;
  }>;
}

const ScoreTrend = ({ data }: ScoreTrendProps) => {
  const { t } = useLanguage();

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
    score: Math.round(item.avg_score)
  }));

  // Calculate trend
  const firstScore = data.length > 0 ? data[0].avg_score : 0;
  const lastScore = data.length > 0 ? data[data.length - 1].avg_score : 0;
  const isUpward = lastScore > firstScore;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('ধুম স্কোর সময়ের সাথে কীভাবে পরিবর্তন হচ্ছে?', 'Dhoom Score Trend Over Time')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold font-body-bn">{payload[0].payload.date}</p>
                      <p className="text-sm text-muted-foreground font-body-bn">
                        {t('স্কোর', 'Score')}: {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={70}
              stroke="hsl(var(--brand-green))"
              strokeDasharray="3 3"
              label={{ value: t('লঞ্চ জোন', 'Launch'), fill: 'hsl(var(--brand-green))', fontSize: 12 }}
            />
            <ReferenceLine
              y={50}
              stroke="hsl(var(--brand-yellow))"
              strokeDasharray="3 3"
              label={{ value: t('টেস্ট জোন', 'Test'), fill: 'hsl(var(--brand-yellow))', fontSize: 12 }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Trend Insight */}
        {isUpward ? (
          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-body-bn text-green-900">
              📈 {t('আপনার বিজ্ঞাপনের মান উন্নত হচ্ছে!', 'Your ad quality is improving!')}
            </p>
          </div>
        ) : (
          <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-lg">
            <p className="text-sm font-body-bn">
              💡 {t('বিভিন্ন ফ্রেমওয়ার্ক ব্যবহার করে দেখুন', 'Try experimenting with different frameworks')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreTrend;