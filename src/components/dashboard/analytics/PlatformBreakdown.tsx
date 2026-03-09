import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Facebook, Instagram, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlatformBreakdownProps {
  data: Array<{
    platform: string;
    count: number;
    avg_score: number;
    best_framework: string | null;
  }>;
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  daraz: '#FF5100',
};

const PLATFORM_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  daraz: ShoppingBag,
};

const PlatformBreakdown = ({ data }: PlatformBreakdownProps) => {
  const { t } = useLanguage();

  const chartData = data.map(item => ({
    name: item.platform,
    value: item.count
  }));

  const totalAds = data.reduce((sum, item) => sum + item.count, 0);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('কোন প্ল্যাটফর্মে বেশি বিজ্ঞাপন তৈরি হয়েছে?', 'Platform Distribution')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.name.toLowerCase()] || '#FF5100'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((platform) => {
            const Icon = PLATFORM_ICONS[platform.platform.toLowerCase()] || ShoppingBag;
            return (
              <Card key={platform.platform}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-5 w-5" style={{ color: PLATFORM_COLORS[platform.platform.toLowerCase()] }} />
                    <span className="font-semibold capitalize">{platform.platform}</span>
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(platform.avg_score)}`}>
                    {Math.round(platform.avg_score)}
                  </p>
                  {platform.best_framework && (
                    <p className="text-xs text-muted-foreground mt-2 font-body-bn">
                      {t('সেরা ফ্রেমওয়ার্ক', 'Best Framework')}: {platform.best_framework}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformBreakdown;