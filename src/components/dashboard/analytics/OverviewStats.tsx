import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnalyticsData } from '../Analytics';

interface OverviewStatsProps {
  data: AnalyticsData;
}

const OverviewStats = ({ data }: OverviewStatsProps) => {
  const { t } = useLanguage();

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const winnerPercentage = data.total_ads > 0 
    ? Math.round((data.winner_count / data.total_ads) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Ads */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body-bn">
                {t('মোট বিজ্ঞাপন তৈরি', 'Total Ads Created')}
              </p>
              <p className="text-2xl font-bold mt-1">{data.total_ads}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Dhoom Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body-bn">
                {t('গড় ধুম স্কোর', 'Avg Dhoom Score')}
              </p>
              <p className={`text-2xl font-bold mt-1 ${getScoreColor(data.avg_dhoom_score)}`}>
                {data.avg_dhoom_score}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winner Ads */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body-bn">
                {t('বিজয়ী বিজ্ঞাপন', 'Winner Ads')}
              </p>
              <p className="text-2xl font-bold mt-1">{data.winner_count}</p>
              <p className="text-xs text-muted-foreground font-body-bn">
                {t(`মোট বিজ্ঞাপনের ${winnerPercentage}%`, `${winnerPercentage}% of total`)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Framework */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-body-bn">
                {t('সেরা ফ্রেমওয়ার্ক', 'Best Framework')}
              </p>
              {data.best_framework ? (
                <>
                  <p className="text-xl font-bold mt-1">{data.best_framework.framework}</p>
                  <p className="text-xs text-muted-foreground font-body-bn">
                    {t(`গড় স্কোর ${Math.round(data.best_framework.avg_score)}`, `Avg ${Math.round(data.best_framework.avg_score)}`)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 font-body-bn">
                  {t('ডেটা নেই', 'No data')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewStats;