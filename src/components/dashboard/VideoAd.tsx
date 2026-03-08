import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, Film } from 'lucide-react';

const VideoAd = () => {
  const { t } = useLanguage();
  const [images, setImages] = useState<string[]>([]);
  const [format, setFormat] = useState('9:16');
  const [duration, setDuration] = useState('15s');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const formats = [
    { label: 'Reels/TikTok', value: '9:16' },
    { label: 'Feed', value: '1:1' },
    { label: 'Story', value: '9:16s' },
    { label: 'YouTube', value: '16:9' },
  ];
  const durations = ['15s', '30s', '60s'];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8">
        {t('🎬 AI ভিডিও বিজ্ঞাপন', '🎬 AI Video Ads')}
      </h2>

      <div className="bg-card rounded-[20px] shadow-warm p-8 space-y-6">
        {/* Upload */}
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-10 text-center cursor-pointer hover:bg-primary/5 transition-colors">
          <Upload className="mx-auto mb-3 text-primary" size={32} />
          <p className="font-body-bn font-semibold text-foreground">{t('পণ্যের ছবি আপলোড করুন', 'Upload Product Images')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('১–৫টি ছবি ড্র্যাগ করুন', 'Drag 1-5 images')}</p>
        </div>

        {/* Format */}
        <div>
          <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ভিডিও ফরম্যাট', 'Video Format')}</label>
          <div className="flex flex-wrap gap-2">
            {formats.map(f => (
              <button key={f.value} onClick={() => setFormat(f.value)}
                className={`text-sm rounded-full px-4 py-2 transition-colors ${format === f.value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('সময়কাল', 'Duration')}</label>
          <div className="flex gap-2">
            {durations.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`text-sm rounded-full px-4 py-2 transition-colors ${duration === d ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Language & Mood */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ভাষা', 'Language')}</label>
            <div className="flex flex-col gap-2">
              {[{ bn: 'বাংলা', en: 'Bangla' }, { bn: 'English', en: 'English' }].map(l => (
                <span key={l.en} className="text-sm border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors font-body-bn text-center">{t(l.bn, l.en)}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('মিউজিক মুড', 'Music Mood')}</label>
            <div className="flex flex-col gap-2">
              {['Energetic', 'Soft', 'None'].map(m => (
                <span key={m} className="text-sm border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors text-center">{m}</span>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className="w-full bg-gradient-cta text-primary-foreground rounded-full py-4 text-lg font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🎬</span> {t('ভিডিও তৈরি হচ্ছে...', 'Creating video...')}
            </span>
          ) : (
            <span>🎬 {t('ভিডিও অ্যাড তৈরি করুন', 'Create Video Ad')}</span>
          )}
        </button>
      </div>

      {generated && (
        <div className="mt-8 bg-card rounded-[20px] shadow-warm p-8 animate-fade-up">
          <div className="aspect-video bg-secondary rounded-xl flex items-center justify-center mb-4">
            <Film className="text-muted-foreground" size={48} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-brand-green font-mono font-bold text-xl">৮৮</span>
              <span className="text-xs text-muted-foreground ml-2 font-body-bn">{t('ধুম স্কোর', 'Dhoom Score')}</span>
            </div>
            <div className="flex gap-2">
              <button className="text-sm bg-primary text-primary-foreground rounded-full px-4 py-2 font-body-bn">{t('ডাউনলোড', 'Download')}</button>
              <button className="text-sm border border-border rounded-full px-4 py-2 text-muted-foreground hover:text-primary transition-colors font-body-bn">{t('Remix করুন', 'Remix')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAd;
