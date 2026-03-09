import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguagePerformanceProps {
  data: {
    bn: { count: number; avg_score: number };
    banglish: { count: number; avg_score: number };
  };
}

const LanguagePerformance = ({ data }: LanguagePerformanceProps) => {
  const { t } = useLanguage();

  const bnAvg = Math.round(data.bn.avg_score);
  const banglishAvg = Math.round(data.banglish.avg_score);
  
  const winner = bnAvg > banglishAvg ? 'bn' : 'banglish';

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('বাংলা নাকি Banglish — কোনটা বেশি ভালো?', 'Bangla vs Banglish Performance')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bangla */}
          <Card className={winner === 'bn' ? 'border-primary border-2' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold font-body-bn mb-2">বাংলা</p>
                <p className={`text-4xl font-bold ${getScoreColor(bnAvg)}`}>
                  {bnAvg}
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-body-bn">
                  {data.bn.count} {t('টি বিজ্ঞাপন', 'ads')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Banglish */}
          <Card className={winner === 'banglish' ? 'border-primary border-2' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Banglish</p>
                <p className={`text-4xl font-bold ${getScoreColor(banglishAvg)}`}>
                  {banglishAvg}
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-body-bn">
                  {data.banglish.count} {t('টি বিজ্ঞাপন', 'ads')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Insight */}
        <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-lg">
          <p className="text-sm font-body-bn">
            {winner === 'bn' 
              ? t('আপনার শপের জন্য বাংলা বেশি কার্যকর', 'Bangla is more effective for your shop')
              : t('আপনার শপের জন্য Banglish বেশি কার্যকর', 'Banglish is more effective for your shop')
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguagePerformance;