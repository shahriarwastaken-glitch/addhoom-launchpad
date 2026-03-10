import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Download, ArrowRight, RotateCcw, Save, Loader2,
  ArrowUpCircle, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { UpscaleScale, EnhancementMode, ExportFormat } from './types';

const UpscalerTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState<UpscaleScale>(4);
  const [mode, setMode] = useState<EnhancementMode>('standard');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [jpgQuality, setJpgQuality] = useState(90);

  const [upscaling, setUpscaling] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [upscaledSize, setUpscaledSize] = useState<{ w: number; h: number } | null>(null);

  const [dividerPos, setDividerPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast.error(t('ফাইল 20MB এর বেশি', 'File exceeds 20MB'));
      return;
    }
    setFile(f);
    setResultUrl(null);
    setUpscaledSize(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const img = new window.Image();
      img.onload = () => setOriginalSize({ w: img.width, h: img.height });
      img.src = dataUrl;
    };
    reader.readAsDataURL(f);
  }, [t]);

  const handleUpscale = async () => {
    if (!file || !activeWorkspace) return;
    setUpscaling(true);
    setResultUrl(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('upscale-image', {
        body: {
          workspace_id: activeWorkspace.id,
          image_base64: base64,
          scale,
          mode,
          export_format: exportFormat,
          jpg_quality: jpgQuality,
        },
      });

      if (error) throw error;
      setResultUrl(data.image_url);
      if (data.upscaled_size) {
        const [w, h] = data.upscaled_size.split('x').map(Number);
        setUpscaledSize({ w, h });
      }
      toast.success(t('আপস্কেল সম্পন্ন', 'Upscale complete'));
    } catch (err: any) {
      toast.error(err.message || t('ত্রুটি হয়েছে', 'An error occurred'));
    } finally {
      setUpscaling(false);
    }
  };

  const handleDividerDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const handleMove = (clientX: number) => {
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setDividerPos(Math.max(5, Math.min(95, pos)));
    };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      handleMove(cx);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onUp);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="max-w-[680px] mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold">{t('ইমেজ আপস্কেল করুন', 'Upscale Your Image')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('যেকোনো ইমেজ 4× রেজোলিউশনে বাড়ান। প্রিন্ট বা এক্সপোর্টের জন্য প্রস্তুত।', 'Enhance any image up to 4× resolution. Sharp details, clean edges, ready for print or export.')}
        </p>
      </div>

      {/* Upload / Compare */}
      {!preview ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-12 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <span className="text-sm font-medium text-muted-foreground">{t('আপস্কেল করতে ইমেজ ড্র্যাগ করুন', 'Drop any image here to upscale')}</span>
          <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 20MB</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      ) : (
        <div className="space-y-3">
          {/* Compare view */}
          <div
            ref={containerRef}
            className="relative aspect-video rounded-xl overflow-hidden border border-border select-none"
          >
            {/* Original (full) */}
            <img src={preview} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-muted" />
            {/* Upscaled (clipped) */}
            {resultUrl && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}>
                <img src={resultUrl} alt="Upscaled" className="w-full h-full object-contain bg-muted" />
              </div>
            )}
            {/* Labels */}
            <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">
              {t('আসল', 'Original')}
            </div>
            {resultUrl && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-full">
                {t('আপস্কেলড', 'Upscaled')}
              </div>
            )}
            {/* Divider */}
            {resultUrl && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-col-resize z-10"
                style={{ left: `${dividerPos}%` }}
                onMouseDown={handleDividerDrag}
                onTouchStart={handleDividerDrag}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-3 bg-muted-foreground rounded-full" />
                    <div className="w-0.5 h-3 bg-muted-foreground rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('আসল', 'Original')}: {originalSize ? `${originalSize.w} × ${originalSize.h}px` : '—'} · {file ? formatFileSize(file.size) : '—'}</span>
            <span>{t('আপস্কেলড', 'Upscaled')}: {upscaledSize ? `${upscaledSize.w} × ${upscaledSize.h}px` : originalSize ? `${originalSize.w * scale} × ${originalSize.h * scale}px (${t('আনুমানিক', 'est.')})` : '—'}</span>
          </div>
        </div>
      )}

      {preview && (
        <>
          {/* Scale */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">{t('স্কেল', 'Scale')}</span>
            <div className="flex gap-1.5">
              {([2, 4, 6, 8] as UpscaleScale[]).map(s => (
                <button key={s} onClick={() => setScale(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    scale === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>{s}×</button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t('বেশি স্কেল = বড় ফাইল সাইজ', 'Higher scale = larger file size')}</p>
          </div>

          {/* Enhancement Mode */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">{t('এনহ্যান্সমেন্ট মোড', 'Enhancement Mode')}</span>
            <div className="flex gap-1.5">
              {([
                ['standard', 'Standard'],
                ['sharp_details', 'Sharp Details'],
                ['smooth_skin', 'Smooth Skin'],
              ] as const).map(([val, label]) => (
                <button key={val} onClick={() => setMode(val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    mode === val ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">{t('আউটপুট ফরম্যাট', 'Output Format')}</span>
            <div className="flex gap-1.5">
              {(['png', 'jpg'] as ExportFormat[]).map(f => (
                <button key={f} onClick={() => setExportFormat(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all uppercase ${
                    exportFormat === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}>{f}</button>
              ))}
            </div>
            {exportFormat === 'jpg' && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span><span>High</span>
                </div>
                <Slider value={[jpgQuality]} onValueChange={v => setJpgQuality(v[0])} min={10} max={100} step={5} />
                <p className="text-[11px] text-muted-foreground text-center">{t('কোয়ালিটি', 'Quality')}: {jpgQuality}%</p>
              </div>
            )}
          </div>

          {/* Upscale Button */}
          <div className="space-y-1.5">
            <Button onClick={handleUpscale} disabled={upscaling} className="w-full bg-primary hover:bg-primary/90">
              {upscaling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpCircle className="h-4 w-4 mr-2" />}
              {t('ইমেজ আপস্কেল করুন', 'Upscale Image')}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">~$0.005 {t('প্রতি আপস্কেল', 'per upscale')} · 1 {t('আপস্কেল ক্রেডিট', 'upscale credit')}</p>
          </div>

          {/* Result Actions */}
          {resultUrl && (
            <div className="space-y-3 pt-2">
              <Button onClick={() => {
                const a = document.createElement('a'); a.href = resultUrl; a.download = `upscaled_${Date.now()}.${exportFormat}`; a.click();
              }} className="w-full bg-primary hover:bg-primary/90">
                <Download className="h-4 w-4 mr-2" />{t('আপস্কেলড ইমেজ ডাউনলোড', 'Download Upscaled Image')}
              </Button>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreview(null); setResultUrl(null); setOriginalSize(null); setUpscaledSize(null); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{t('আরেকটি আপস্কেল', 'Upscale Another')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/generate?tab=image&studio_image_url=${encodeURIComponent(resultUrl)}`)}>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />{t('অ্যাড তৈরি', 'Make an Ad')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.success(t('লাইব্রেরিতে সেভ হয়েছে', 'Saved to library'))}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{t('সেভ', 'Save to Library')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UpscalerTab;
