import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as RechartsTooltip } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface OccasionHeatmapProps {
  data: Array<{
    occasion: string;
    month: number;
    count: number;
    avg_score: number;
  }>;
}

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const OccasionHeatmap = ({ data }: OccasionHeatmapProps) => {
  const { t } = useLanguage();

  // Group data by occasion
  const occasionMap = new Map<string, Map<number, { count: number; avg_score: number }>>();
  
  data.forEach(item => {
    if (!occasionMap.has(item.occasion)) {
      occasionMap.set(item.occasion, new Map());
    }
    occasionMap.get(item.occasion)!.set(item.month, {
      count: item.count,
      avg_score: item.avg_score
    });
  });

  const occasions = Array.from(occasionMap.keys());

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 3) return 'bg-primary/20';
    if (count <= 7) return 'bg-primary/50';
    return 'bg-primary';
  };

  // Find most active period
  const monthCounts = new Map<number, number>();
  data.forEach(item => {
    monthCounts.set(item.month, (monthCounts.get(item.month) || 0) + item.count);
  });
  
  const mostActiveMonth = Array.from(monthCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('কোন উপলক্ষে সবচেয়ে বেশি বিজ্ঞাপন তৈরি হয়েছে?', 'Ads by Occasion')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Month Headers */}
            <div className="grid grid-cols-13 gap-1 mb-2">
              <div className="text-xs font-semibold"></div>
              {MONTHS.slice(0, 12).map((month, i) => (
                <div key={i} className="text-xs text-center font-body-bn text-muted-foreground">
                  {month.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            {occasions.map(occasion => (
              <div key={occasion} className="grid grid-cols-13 gap-1 mb-1">
                <div className="text-xs font-semibold pr-2 flex items-center font-body-bn">
                  {occasion}
                </div>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const cellData = occasionMap.get(occasion)?.get(month);
                  const count = cellData?.count || 0;
                  const avgScore = cellData?.avg_score || 0;

                  return (
                    <div
                      key={month}
                      className={`h-8 rounded ${getHeatmapColor(count)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary`}
                      title={`${occasion} • ${MONTHS[month - 1]} • ${count}টি বিজ্ঞাপন • গড় স্কোর: ${Math.round(avgScore)}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground font-body-bn">{t('কম', 'Less')}</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-gray-100 rounded" />
            <div className="w-4 h-4 bg-primary/20 rounded" />
            <div className="w-4 h-4 bg-primary/50 rounded" />
            <div className="w-4 h-4 bg-primary rounded" />
          </div>
          <span className="text-muted-foreground font-body-bn">{t('বেশি', 'More')}</span>
        </div>

        {/* Insight */}
        {mostActiveMonth && (
          <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-lg">
            <p className="text-sm font-body-bn">
              📅 {t(
                `আপনার সবচেয়ে সক্রিয় সময়: ${MONTHS[mostActiveMonth[0] - 1]} মাস`,
                `Your most active period: ${MONTHS[mostActiveMonth[0] - 1]}`
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OccasionHeatmap;