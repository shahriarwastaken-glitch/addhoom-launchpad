import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguagePerformanceProps {
  data: {
    bn?: { count: number; avg_score: number };
    en?: { count: number; avg_score: number };
  };
}

const LanguagePerformance = ({ data }: LanguagePerformanceProps) => {
  const { t } = useLanguage();

  const bnAvg = Math.round(data.bn?.avg_score ?? 0);
  const enAvg = Math.round(data.en?.avg_score ?? 0);
  
  const winner = bnAvg > enAvg ? 'bn' : 'en';

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="font-body-bn text-lg md:text-xl">
          {t('বাংলা নাকি English — কোনটা বেশি ভালো?', 'Bangla vs English Performance')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {/* Bangla */}
          <Card className={winner === 'bn' ? 'border-primary border-2' : ''}>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="text-center">
                <p className="text-sm md:text-lg font-semibold font-body-bn mb-1 md:mb-2">
                  {t('বাংলা', 'Bangla')}
                </p>
                <p className={`text-2xl md:text-4xl font-bold ${getScoreColor(bnAvg)}`}>
                  {bnAvg}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground mt-1 md:mt-2">
                  {data.bn?.count ?? 0} {t('টি বিজ্ঞাপন', 'ads')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* English */}
          <Card className={winner === 'en' ? 'border-primary border-2' : ''}>
            <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
              <div className="text-center">
                <p className="text-sm md:text-lg font-semibold mb-1 md:mb-2">English</p>
                <p className={`text-2xl md:text-4xl font-bold ${getScoreColor(enAvg)}`}>
                  {enAvg}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground mt-1 md:mt-2">
                  {data.en?.count ?? 0} {t('টি বিজ্ঞাপন', 'ads')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Insight */}
        <div className="border-l-4 border-primary bg-primary/5 p-3 md:p-4 rounded-lg">
          <p className="text-xs md:text-sm font-body-bn">
            {winner === 'bn' 
              ? t('আপনার শপের জন্য বাংলা বেশি কার্যকর', 'Bangla is more effective for your shop')
              : t('আপনার শপের জন্য English বেশি কার্যকর', 'English is more effective for your shop')
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguagePerformance;
