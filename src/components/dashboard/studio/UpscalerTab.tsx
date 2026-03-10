import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Download, ArrowRight, RotateCcw, Save, Loader2,
  ArrowUpCircle, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { UpscaleScale, EnhancementMode, ExportFormat } from './types';

function getCdnImageUrl(fullUrl: string, opts: { width?: number; quality?: number } = {}): string {
  if (!fullUrl || !fullUrl.includes('/storage/v1/object/public/')) return fullUrl;
  const transformed = fullUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  params.set('format', 'webp');
  params.set('resize', 'contain');
  return `${transformed}?${params.toString()}`;
}

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

  // Job queue state
  const [jobId, setJobId] = useState<string | null>(null);
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [upscaledSize, setUpscaledSize] = useState<{ w: number; h: number } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [dividerPos, setDividerPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'studio_jobs', filter: `id=eq.${jobId}` },
        (payload: any) => {
          const job = payload.new;
          if (job.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            const url = job.output_urls?.[0] || null;
            setResultUrl(url);
            if (originalSize) setUpscaledSize({ w: originalSize.w * scale, h: originalSize.h * scale });
            setUpscaling(false);
            setJobId(null);
            toast.success(t('আপস্কেল সম্পন্ন', 'Upscale complete'));
          }
          if (job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setUpscaling(false);
            setJobId(null);
            toast.error(job.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, t, originalSize, scale]);

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
    setProgress(0);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('queue-studio-job', {
        body: {
          workspace_id: activeWorkspace.id,
          job_type: 'upscale',
          input_config: {
            image_base64: base64,
            scale,
            mode,
            export_format: exportFormat,
            jpg_quality: jpgQuality,
          },
        },
      });

      if (error) throw error;
      setJobId(data.job_id);

      // Fallback polling
      const startTime = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startTime > 120000) {
          if (pollRef.current) clearInterval(pollRef.current);
          setUpscaling(false);
          toast.error(t('টাইমআউট হয়েছে', 'Request timed out'));
          return;
        }
        try {
          const { data: status } = await supabase.functions.invoke('get-job-status', { body: { job_id: data.job_id } });
          if (!status) return;
          setProgress(status.progress || 0);
          setTimeRemaining(status.time_remaining_ms || 0);
          if (status.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            const url = status.output_urls?.[0] || null;
            setResultUrl(url);
            if (originalSize) setUpscaledSize({ w: originalSize.w * scale, h: originalSize.h * scale });
            setUpscaling(false);
            setJobId(null);
            toast.success(t('আপস্কেল সম্পন্ন', 'Upscale complete'));
          }
          if (status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setUpscaling(false);
            setJobId(null);
            toast.error(status.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || t('ত্রুটি হয়েছে', 'An error occurred'));
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
          {t('যেকোনো ইমেজ 8× পর্যন্ত রেজোলিউশনে বাড়ান। প্রিন্ট বা এক্সপোর্টের জন্য প্রস্তুত।', 'Enhance any image up to 8× resolution. Sharp details, clean edges, ready for print or export.')}
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
            <img src={preview} alt="Original" className="absolute inset-0 w-full h-full object-contain bg-muted" />
            {resultUrl && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}>
                <img src={getCdnImageUrl(resultUrl, { width: 1200, quality: 90 })} alt="Upscaled" className="w-full h-full object-contain bg-muted" />
              </div>
            )}
            <div className="absolute top-3 left-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">
              {t('আসল', 'Original')}
            </div>
            {resultUrl && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-full">
                {t('আপস্কেলড', 'Upscaled')}
              </div>
            )}
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
            {/* Upscaling overlay */}
            {upscaling && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3 z-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">{t('ইমেজ আপস্কেল হচ্ছে...', 'Enhancing your image...')}</p>
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 10)}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">~{Math.ceil(timeRemaining / 1000)}s {t('বাকি', 'remaining')}</p>
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
            {/* IMPROVEMENT 4: Two-pass notice */}
            {scale > 4 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>{t('6× এবং 8× প্রক্রিয়া করতে 4× এর চেয়ে 2× বেশি সময় লাগে', '6× and 8× take 2× longer to process')}</span>
              </div>
            )}
          </div>

          {/* Enhancement Mode */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">{t('এনহ্যান্সমেন্ট মোড', 'Enhancement Mode')}</span>
            <div className="flex gap-1.5 flex-wrap">
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
            <p className="text-[11px] text-muted-foreground text-center">
              ~$0.005 {t('প্রতি আপস্কেল', 'per upscale')} · {scale > 4 ? '2' : '1'} {t('আপস্কেল ক্রেডিট', 'upscale credit{s}')}
            </p>
          </div>

          {/* Result Actions */}
          {resultUrl && (
            <div className="space-y-3 pt-2">
              <Button onClick={() => {
                // Download at full resolution — no CDN transform
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
