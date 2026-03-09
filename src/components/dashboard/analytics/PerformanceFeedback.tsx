import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Meh, ThumbsDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceFeedbackProps {
  unratedAds: any[];
  onRate: (creativeId: string, rating: 'good' | 'neutral' | 'poor') => void;
}

const PerformanceFeedback = ({ unratedAds, onRate }: PerformanceFeedbackProps) => {
  const { t } = useLanguage();
  const [ratedAds, setRatedAds] = useState<Set<string>>(new Set());

  const handleRate = (adId: string, rating: 'good' | 'neutral' | 'poor') => {
    setRatedAds(prev => new Set(prev).add(adId));
    onRate(adId, rating);
  };

  const displayedAds = unratedAds.filter(ad => !ratedAds.has(ad.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-body-bn text-xl">
          {t('বিজ্ঞাপনের ফলাফল জানান', 'Rate Ad Performance')}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-body-bn">
          {t('কোন বিজ্ঞাপন ভালো কাজ করেছে? জানালে AI আরো ভালো করবে।', 
             'Which ads worked well? Your feedback helps the AI improve.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why This Matters */}
        <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-lg">
          <p className="text-[13px] font-body-bn">
            🧠 {t('আপনি যত বেশি ফলাফল জানাবেন, ধুম স্কোর তত নির্ভুল হবে। এটি আপনার নিজস্ব AI ট্রেনিং।',
                  'The more feedback you provide, the more accurate Dhoom Score becomes. This is your personal AI training.')}
          </p>
        </div>

        {/* Feedback Queue */}
        <div className="space-y-3">
          <p className="text-sm font-semibold font-body-bn">
            {t('এই বিজ্ঞাপনগুলো কেমন কাজ করেছে?', 'How did these ads perform?')}
          </p>

          <AnimatePresence>
            {displayedAds.map((ad) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate font-body-bn">
                          {ad.headline || t('শিরোনাম নেই', 'No headline')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ad.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ad.created_at).toLocaleDateString('bn-BD')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleRate(ad.id, 'good')}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span className="text-xs font-body-bn">
                            {t('ভালো', 'Good')}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          onClick={() => handleRate(ad.id, 'neutral')}
                        >
                          <Meh className="h-4 w-4 mr-1" />
                          <span className="text-xs font-body-bn">
                            {t('মোটামুটি', 'Neutral')}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRate(ad.id, 'poor')}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          <span className="text-xs font-body-bn">
                            {t('ভালো না', 'Poor')}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {displayedAds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 font-body-bn">
              {t('সব বিজ্ঞাপন রেট করা হয়েছে! 🎉', 'All ads have been rated! 🎉')}
            </p>
          )}

          {/* Counter */}
          {unratedAds.length > 0 && (
            <p className="text-xs text-muted-foreground text-center font-body-bn">
              {t(`${unratedAds.length} এর মধ্যে ${ratedAds.size}টি রেট করা হয়েছে`,
                 `${ratedAds.size} of ${unratedAds.length} rated`)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceFeedback;