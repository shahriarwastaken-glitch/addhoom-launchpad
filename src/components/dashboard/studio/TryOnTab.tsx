import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Check, ArrowRight, Download, RotateCcw, Save,
  Loader2, User, Shirt, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GarmentCategory, Gender, BodyType, SkinTone, PoseType, PresetModel } from './types';

const GARMENT_CATEGORIES: { label: string; value: GarmentCategory }[] = [
  { label: 'Top', value: 'Top' },
  { label: 'Bottom', value: 'Bottom' },
  { label: 'Full Body / Dress', value: 'Full Body / Dress' },
  { label: 'Outerwear', value: 'Outerwear' },
  { label: 'Footwear', value: 'Footwear' },
];

const PRESET_MODELS: PresetModel[] = [
  { id: 'f_slim_light_standing', gender: 'female', body: 'slim', skin: 'light', pose: 'standing', image_url: '' },
  { id: 'f_slim_medium_standing', gender: 'female', body: 'slim', skin: 'medium', pose: 'standing', image_url: '' },
  { id: 'f_slim_dark_standing', gender: 'female', body: 'slim', skin: 'dark', pose: 'standing', image_url: '' },
  { id: 'f_slim_light_walking', gender: 'female', body: 'slim', skin: 'light', pose: 'walking', image_url: '' },
  { id: 'f_slim_medium_walking', gender: 'female', body: 'slim', skin: 'medium', pose: 'walking', image_url: '' },
  { id: 'f_slim_dark_walking', gender: 'female', body: 'slim', skin: 'dark', pose: 'walking', image_url: '' },
  { id: 'f_avg_light_standing', gender: 'female', body: 'average', skin: 'light', pose: 'standing', image_url: '' },
  { id: 'f_avg_medium_standing', gender: 'female', body: 'average', skin: 'medium', pose: 'standing', image_url: '' },
  { id: 'f_avg_dark_standing', gender: 'female', body: 'average', skin: 'dark', pose: 'standing', image_url: '' },
  { id: 'f_avg_light_sitting', gender: 'female', body: 'average', skin: 'light', pose: 'sitting', image_url: '' },
  { id: 'f_avg_medium_sitting', gender: 'female', body: 'average', skin: 'medium', pose: 'sitting', image_url: '' },
  { id: 'f_avg_dark_sitting', gender: 'female', body: 'average', skin: 'dark', pose: 'sitting', image_url: '' },
  { id: 'f_plus_light_standing', gender: 'female', body: 'plus', skin: 'light', pose: 'standing', image_url: '' },
  { id: 'f_plus_medium_standing', gender: 'female', body: 'plus', skin: 'medium', pose: 'standing', image_url: '' },
  { id: 'f_plus_dark_standing', gender: 'female', body: 'plus', skin: 'dark', pose: 'standing', image_url: '' },
  { id: 'm_slim_light_standing', gender: 'male', body: 'slim', skin: 'light', pose: 'standing', image_url: '' },
  { id: 'm_slim_medium_standing', gender: 'male', body: 'slim', skin: 'medium', pose: 'standing', image_url: '' },
  { id: 'm_slim_dark_standing', gender: 'male', body: 'slim', skin: 'dark', pose: 'standing', image_url: '' },
  { id: 'm_avg_medium_standing', gender: 'male', body: 'average', skin: 'medium', pose: 'standing', image_url: '' },
  { id: 'm_plus_dark_standing', gender: 'male', body: 'plus', skin: 'dark', pose: 'standing', image_url: '' },
];

const LOADING_MESSAGES = [
  'Dressing the model...',
  'Checking the fit...',
  'Adjusting the drape...',
  'Almost ready...',
];

const TryOnTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();

  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory | null>(null);
  const [selectedModel, setSelectedModel] = useState<PresetModel | null>(null);
  const [variations, setVariations] = useState(1);
  const [background, setBackground] = useState<'remove' | 'white' | 'keep'>('remove');

  const [genderFilter, setGenderFilter] = useState<Gender>('all');
  const [bodyFilter, setBodyFilter] = useState<BodyType>('all');
  const [skinFilter, setSkinFilter] = useState<SkinTone>('all');
  const [poseFilter, setPoseFilter] = useState<PoseType>('all');

  const [generating, setGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [activeResult, setActiveResult] = useState(0);

  const filteredModels = PRESET_MODELS.filter(m => {
    if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
    if (bodyFilter !== 'all' && m.body !== bodyFilter) return false;
    if (skinFilter !== 'all' && m.skin !== skinFilter) return false;
    if (poseFilter !== 'all' && m.pose !== poseFilter) return false;
    return true;
  });

  const handleGarmentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('ফাইল 10MB এর বেশি', 'File exceeds 10MB'));
      return;
    }
    setGarmentFile(file);
    const reader = new FileReader();
    reader.onload = () => setGarmentPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResults([]);
  }, [t]);

  const handleGenerate = async () => {
    if (!garmentFile || !selectedModel || !garmentCategory || !activeWorkspace) return;
    setGenerating(true);
    setLoadingMsgIdx(0);
    setResults([]);

    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(garmentFile);
      });

      const { data, error } = await supabase.functions.invoke('generate-tryon', {
        body: {
          workspace_id: activeWorkspace.id,
          garment_image_base64: base64,
          model_id: selectedModel.id,
          garment_category: garmentCategory,
          background,
          variations,
        },
      });

      if (error) throw error;
      setResults(data.images || []);
      setActiveResult(0);
      toast.success(t('ট্রাই-অন তৈরি হয়েছে', 'Try-on generated'));
    } catch (err: any) {
      toast.error(err.message || t('ত্রুটি হয়েছে', 'An error occurred'));
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const handleMakeAd = () => {
    if (results[activeResult]) {
      navigate(`/dashboard/generate?tab=image&studio_image_url=${encodeURIComponent(results[activeResult])}`);
    }
  };

  const handleDownload = async () => {
    const url = results[activeResult];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `tryon_${Date.now()}.png`;
    a.click();
  };

  const FilterGroup = ({ label, value, options, onChange }: {
    label: string; value: string;
    options: { label: string; value: string }[];
    onChange: (v: any) => void;
  }) => (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
              value === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-2 space-y-6">
        {/* Garment Upload */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{t('গার্মেন্ট আপলোড', 'Upload Garment')}</h3>
            <p className="text-xs text-muted-foreground">{t('ফ্ল্যাট-লে বা ম্যানেকুইন শট ভালো কাজ করে', 'Flat-lay or mannequin shots work best')}</p>
          </div>

          {!garmentPreview ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{t('গার্মেন্ট ফটো এখানে ড্র্যাগ করুন', 'Drag garment photo here')}</span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleGarmentUpload} />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <img src={garmentPreview} alt="Garment" className="h-28 w-28 object-cover rounded-xl border" />
              <button onClick={() => { setGarmentFile(null); setGarmentPreview(null); setResults([]); }} className="text-xs text-primary hover:underline">
                {t('পরিবর্তন', 'Change')}
              </button>
            </div>
          )}

          {garmentPreview && (
            <div className="flex flex-wrap gap-1.5">
              {GARMENT_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setGarmentCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    garmentCategory === cat.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Choose Model */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('মডেল বাছাই', 'Choose Model')}</h3>

          <div className="space-y-2">
            <FilterGroup label={t('লিঙ্গ', 'Gender')} value={genderFilter}
              options={[{ label: t('সব', 'All'), value: 'all' }, { label: t('মহিলা', 'Female'), value: 'female' }, { label: t('পুরুষ', 'Male'), value: 'male' }]}
              onChange={setGenderFilter} />
            <FilterGroup label={t('শরীর', 'Body')} value={bodyFilter}
              options={[{ label: t('সব', 'All'), value: 'all' }, { label: t('স্লিম', 'Slim'), value: 'slim' }, { label: t('গড়', 'Average'), value: 'average' }, { label: t('প্লাস', 'Plus'), value: 'plus' }]}
              onChange={setBodyFilter} />
            <FilterGroup label={t('ত্বক', 'Skin')} value={skinFilter}
              options={[{ label: t('সব', 'All'), value: 'all' }, { label: t('হালকা', 'Light'), value: 'light' }, { label: t('মাঝারি', 'Medium'), value: 'medium' }, { label: t('গাঢ়', 'Dark'), value: 'dark' }]}
              onChange={setSkinFilter} />
            <FilterGroup label={t('পোজ', 'Pose')} value={poseFilter}
              options={[{ label: t('সব', 'All'), value: 'all' }, { label: t('দাঁড়ানো', 'Standing'), value: 'standing' }, { label: t('হাঁটা', 'Walking'), value: 'walking' }, { label: t('বসা', 'Sitting'), value: 'sitting' }]}
              onChange={setPoseFilter} />
          </div>

          <p className="text-xs text-muted-foreground">
            {t(`${filteredModels.length}টি মডেল থেকে ${PRESET_MODELS.length}টি দেখানো হচ্ছে`, `Showing ${filteredModels.length} of ${PRESET_MODELS.length} models`)}
          </p>

          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredModels.map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all hover:scale-[1.02] ${
                  selectedModel?.id === model.id ? 'border-primary' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground/50" />
                </div>
                {selectedModel?.id === model.id && (
                  <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 text-center capitalize">
                  {model.gender} · {model.body} · {model.skin}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold">{t('ভ্যারিয়েশন', 'Variations')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {[1, 2, 3].map(v => (
                <button key={v} onClick={() => setVariations(v)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    variations === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>{v}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">{t('ব্যাকগ্রাউন্ড', 'Background')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {([['remove', 'Remove'], ['white', 'White'], ['keep', 'Keep Original']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setBackground(val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    background === val ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>{t(label, label)}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate */}
        <div className="space-y-1.5">
          <Button
            onClick={handleGenerate}
            disabled={!garmentFile || !selectedModel || !garmentCategory || generating}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shirt className="h-4 w-4 mr-2" />}
            {t('ট্রাই-অন তৈরি করুন', 'Generate Try-On')}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            ~$0.013 {t('প্রতি জেনারেশন', 'per generation')} · 1 {t('ইমেজ ক্রেডিট', 'image credit')}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-border bg-card min-h-[500px] flex items-center justify-center p-6">
          {generating ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="w-full space-y-4">
              <img
                src={results[activeResult]}
                alt="Try-on result"
                className="w-full max-h-[500px] object-contain rounded-xl"
              />
              {results.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => setActiveResult(i)}
                      className={`h-16 w-16 rounded-lg border-2 overflow-hidden ${i === activeResult ? 'border-primary' : 'border-border'}`}>
                      <img src={r} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={handleMakeAd} className="w-full bg-primary hover:bg-primary/90">
                <ArrowRight className="h-4 w-4 mr-2" />
                {t('এটি দিয়ে অ্যাড তৈরি করুন', 'Make an Ad with This')}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedModel(null); setResults([]); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{t('ভিন্ন মডেল', 'Try Different Model')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setGarmentFile(null); setGarmentPreview(null); setResults([]); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{t('ভিন্ন গার্মেন্ট', 'Try Different Garment')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />{t('ডাউনলোড', 'Download')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.success(t('লাইব্রেরিতে সেভ হয়েছে', 'Saved to library'))}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{t('সেভ', 'Save to Library')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center space-y-2">
                  {garmentPreview ? (
                    <img src={garmentPreview} alt="Garment" className="h-32 w-32 object-cover rounded-xl border mx-auto" />
                  ) : (
                    <div className="h-32 w-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                      <Shirt className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('আপনার গার্মেন্ট', 'Your garment')}</p>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                <div className="text-center space-y-2">
                  {selectedModel ? (
                    <div className="h-32 w-24 rounded-xl border bg-muted flex items-center justify-center mx-auto">
                      <User className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  ) : (
                    <div className="h-32 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                      <User className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('আপনার মডেল', 'Your model')}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('ফলাফল এখানে দেখা যাবে', 'Result appears here')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnTab;
