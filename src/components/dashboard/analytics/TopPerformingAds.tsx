import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TopPerformingAdsProps {
  topAds: {
    by_score: any[];
    winners: any[];
    good_performance: any[];
  };
}

const TopPerformingAds = ({ topAds }: TopPerformingAdsProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'score' | 'winners' | 'performance'>('score');

  const getDisplayAds = () => {
    switch (activeTab) {
      case 'winners':
        return topAds.winners.slice(0, 5);
      case 'performance':
        return topAds.good_performance.slice(0, 5);
      default:
        return topAds.by_score.slice(0, 5);
    }
  };

  const displayAds = getDisplayAds();

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('আপনার সেরা বিজ্ঞাপন', 'Your Top Performing Ads')}
        </CardTitle>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
          <TabsList>
            <TabsTrigger value="score" className="font-body-bn">
              {t('সেরা ধুম স্কোর', 'Best Score')}
            </TabsTrigger>
            <TabsTrigger value="winners" className="font-body-bn">
              {t('বিজয়ী ⭐', 'Winners ⭐')}
            </TabsTrigger>
            <TabsTrigger value="performance" className="font-body-bn">
              {t('ভালো ফলাফল ✓', 'Good Results ✓')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayAds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 font-body-bn">
              {t('কোনো ডেটা পাওয়া যায়নি', 'No data available')}
            </p>
          ) : (
            displayAds.map((ad, index) => (
              <Card key={ad.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-mono text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate font-body-bn">
                        {ad.headline || t('শিরোনাম নেই', 'No headline')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {ad.platform && (
                          <Badge variant="outline" className="text-xs">
                            {ad.platform}
                          </Badge>
                        )}
                        {ad.framework && (
                          <Badge variant="secondary" className="text-xs">
                            {ad.framework}
                          </Badge>
                        )}
                        {ad.dhoom_score && (
                          <Badge className={`text-xs ${getScoreColor(ad.dhoom_score)}`}>
                            {ad.dhoom_score}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPerformingAds;