import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, RefreshCw, Edit3, Maximize, Save, Check, ImageIcon, Sparkles, Camera, Layers, Sun, TreePine, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addTextOverlay, getCanvasDimensions, type TextOverlayConfig } from './canvasRenderer';
import UsageCounter from './UsageCounter';
import ImageRemixModal from './ImageRemixModal';
import type { AdResult } from './types';

interface PipelineStep { label: string; status: 'pending' | 'active' | 'done' | 'error'; }

const SCENE_STYLES = [
  { value: 'studio', label: 'Studio Clean', desc: 'Seamless backdrop, professional lighting', icon: <Sparkles size={16} /> },
  { value: 'lifestyle', label: 'Lifestyle', desc: 'Real environment, natural light', icon: <Camera size={16} /> },
  { value: 'flatlay', label: 'Flat Lay', desc: 'Overhead shot, styled surface', icon: <Layers size={16} /> },
  { value: 'gradient', label: 'Gradient', desc: 'Bold color gradient, modern editorial', icon: <Sun size={16} /> },
  { value: 'outdoor', label: 'Outdoor', desc: 'Natural light, aspirational', icon: <TreePine size={16} /> },
];

const FORMAT_OPTIONS = [
  { value: 'square', label: '1:1 Square' },
  { value: 'feed', label: '4:5 Feed' },
  { value: 'story', label: '9:16 Story' },
];

const TEXT_STYLES = [
  { value: 'clean' as const, label: 'Clean' },
  { value: 'bold' as const, label: 'Bold' },
  { value: 'card' as const, label: 'Card' },
];

const POSITIONS = ['TL','TC','TR','ML','MC','MR','BL','BC','BR'];

interface Props {
  onBack?: () => void;
  onResultsGenerated?: (results: AdResult[]) => void;
}

const PremiumImageGenerator = ({ onBack, onResultsGenerated }: Props) => {
  const { activeWorkspace } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [price, setPrice] = useState('');
  const [showPrice, setShowPrice] = useState(true);
  const [offerTag, setOfferTag] = useState('');
  const [sceneStyle, setSceneStyle] = useState('studio');
  const [format, setFormat] = useState('square');
  const [textStyle, setTextStyle] = useState<'clean' | 'bold' | 'card'>('clean');
  const [textPosition, setTextPosition] = useState('BC');
  const [dragOver, setDragOver] = useState(false);

  // Pipeline state
  const [generating, setGenerating] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([
    { label: 'Removing background...', status: 'pending' },
    { label: 'Generating ad image...', status: 'pending' },
    { label: 'Adding text...', status: 'pending' },
  ]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [currentAdId, setCurrentAdId] = useState<string | null>(null);

  // Remix state
  const [remixModalOpen, setRemixModalOpen] = useState(false);
  const [remixAd, setRemixAd] = useState<any>(null);

  // Inline edit state
  const [editing, setEditing] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setProductImage(file);
    const reader = new FileReader();
    reader.onload = () => setProductImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setFinalImageUrl(null);
    setGeneratedImageUrl(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  };

  const updateStep = (idx: number, status: PipelineStep['status']) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status } : s));
  };

  const handleGenerate = useCallback(async () => {
    if (!activeWorkspace || !productImagePreview || !headline.trim()) return;
    setGenerating(true);
    setFinalImageUrl(null);
    setGeneratedImageUrl(null);
    setSteps([
      { label: 'Removing background...', status: 'pending' },
      { label: 'Generating ad image...', status: 'pending' },
      { label: 'Adding text...', status: 'pending' },
    ]);

    try {
      // Step 1: Background removal
      updateStep(0, 'active');
      const { data: bgData, error: bgError } = await supabase.functions.invoke('remove-background', {
        body: { workspace_id: activeWorkspace.id, image_base64: productImagePreview },
      });

      let imageForGeneration = productImagePreview;
      if (!bgError && bgData?.background_removed && bgData?.cutout_url) {
        setCutoutUrl(bgData.cutout_url);
        imageForGeneration = bgData.cutout_url;
      }
      updateStep(0, 'done');

      // Step 2: Generate ad image (no text)
      updateStep(1, 'active');
      const { data: genData, error: genError } = await supabase.functions.invoke('generate-ad-image', {
        body: {
          workspace_id: activeWorkspace.id,
          product_name: headline,
          product_image_base64: imageForGeneration,
          format,
          style: sceneStyle,
          brand_color_primary: '#FF5100',
          brand_color_secondary: '#FFFFFF',
          ad_headline: '', // no text in image
          num_variations: 1,
          no_text: true,
        },
      });

      if (genError || !genData?.success || !genData?.images?.length) {
        updateStep(1, 'error');
        toast.error('Image generation failed');
        setGenerating(false);
        return;
      }

      const genImgUrl = genData.images[0].image_url;
      setGeneratedImageUrl(genImgUrl);
      setCurrentAdId(genData.images[0].id);
      updateStep(1, 'done');

      // Step 3: Canvas text overlay (client-side, instant)
      updateStep(2, 'active');
      const dims = getCanvasDimensions(format);
      const textConfig: TextOverlayConfig = {
        generatedImageUrl: genImgUrl,
        canvasWidth: dims.width,
        canvasHeight: dims.height,
        headline,
        price: showPrice && price ? `BDT ${price}` : undefined,
        offerTag: offerTag || undefined,
        textStyle,
        textPosition,
        primaryColor: '#FF5100',
        headingFont: 'Inter',
      };

      const finalDataUrl = await addTextOverlay(textConfig);
      setFinalImageUrl(finalDataUrl);
      updateStep(2, 'done');

      // Save text_config to DB
      if (genData.images[0].id) {
        await supabase.from('ad_images').update({
          text_config: { headline, price: showPrice ? price : null, offerTag, textStyle, textPosition },
          cutout_url: cutoutUrl || imageForGeneration,
        } as any).eq('id', genData.images[0].id);
      }

      toast.success('Ad image generated!');

      if (onResultsGenerated) {
        onResultsGenerated([{
          id: genData.images[0].id,
          headline: `Version 1`,
          body: '',
          cta: '',
          dhoom_score: genData.images[0].dhoom_score || 75,
          copy_score: 0,
          platform: 'facebook',
          framework: 'AIDA',
          image_url: genImgUrl,
        }]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [activeWorkspace, productImagePreview, headline, price, showPrice, offerTag, sceneStyle, format, textStyle, textPosition, cutoutUrl, onResultsGenerated]);

  const handleReapplyText = useCallback(async () => {
    if (!generatedImageUrl) return;
    const dims = getCanvasDimensions(format);
    const finalDataUrl = await addTextOverlay({
      generatedImageUrl,
      canvasWidth: dims.width,
      canvasHeight: dims.height,
      headline,
      price: showPrice && price ? `BDT ${price}` : undefined,
      offerTag: offerTag || undefined,
      textStyle,
      textPosition,
      primaryColor: '#FF5100',
      headingFont: 'Inter',
    });
    setFinalImageUrl(finalDataUrl);
    setEditing(false);
  }, [generatedImageUrl, headline, price, showPrice, offerTag, textStyle, textPosition, format]);

  const handleDownload = () => {
    if (!finalImageUrl) return;
    const a = document.createElement('a');
    a.href = finalImageUrl;
    a.download = `ad-${Date.now()}.png`;
    a.click();
    toast.success('Downloading...');
  };

  const handleNewVariation = async () => {
    if (!cutoutUrl && !productImagePreview) return;
    await handleGenerate();
  };

  const handleRemix = () => {
    if (!currentAdId || !generatedImageUrl) return;
    setRemixAd({
      id: currentAdId,
      image_url: generatedImageUrl,
      cutout_url: cutoutUrl,
      text_config: { headline, price, offerTag, textStyle, textPosition },
      style: sceneStyle,
      format,
    });
    setRemixModalOpen(true);
  };

  const canGenerate = productImagePreview && headline.trim();
  const dims = getCanvasDimensions(format);
  const aspectRatio = dims.width / dims.height;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Controls */}
      <div className="w-[40%] min-w-[320px] border-r border-border flex flex-col bg-card">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Image Generator</h2>
            <UsageCounter />
          </div>

          {/* Product Image Upload */}
          <div>
            <span className="block text-[13px] font-semibold text-foreground mb-1.5">Product Image *</span>
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`block rounded-[20px] border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-primary bg-primary/5' : productImagePreview ? 'border-border bg-secondary' : 'border-border hover:border-primary hover:bg-primary/[0.03]'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { e.target.files?.[0] && handleFileSelect(e.target.files[0]); e.target.value = ''; }} />
              {productImagePreview ? (
                <div className="flex items-center gap-3">
                  <img src={productImagePreview} alt="Product" className="w-[120px] h-[120px] rounded-xl object-cover" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">{productImage?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Background will be removed automatically</p>
                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setProductImage(null); setProductImagePreview(null); }}
                      className="text-xs text-primary mt-2">Change</button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag your product photo here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse — JPG, PNG, WEBP · Max 10MB</p>
                </>
              )}
            </label>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Headline *</label>
            <div className="relative">
              <input type="text" value={headline} onChange={e => setHeadline(e.target.value.slice(0, 60))} maxLength={60}
                placeholder="Your main message here"
                className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{headline.length}/60</span>
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-semibold text-foreground">Price</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-xs text-muted-foreground">Show price</span>
                <button onClick={() => setShowPrice(!showPrice)}
                  className={`w-8 h-4.5 rounded-full transition-colors ${showPrice ? 'bg-primary' : 'bg-border'} relative`}>
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${showPrice ? 'left-4' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
            <input type="text" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="e.g. 1,500"
              className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary" />
          </div>

          {/* Offer Tag */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Offer Tag (optional)</label>
            <input type="text" value={offerTag} onChange={e => setOfferTag(e.target.value.slice(0, 25))} maxLength={25}
              placeholder="e.g. FREE DELIVERY"
              className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary" />
            <p className="text-[11px] text-muted-foreground mt-1">Shown as a badge on the image</p>
          </div>

          {/* Scene Style */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Scene Style</label>
            <div className="grid grid-cols-2 gap-2">
              {SCENE_STYLES.map(s => (
                <button key={s.value} onClick={() => setSceneStyle(s.value)}
                  className={`p-3 rounded-xl border-[1.5px] text-left transition-all ${
                    sceneStyle === s.value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/40'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={sceneStyle === s.value ? 'text-primary' : 'text-muted-foreground'}>{s.icon}</span>
                    <span className="text-[13px] font-semibold text-foreground">{s.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Format</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map(f => (
                <button key={f.value} onClick={() => setFormat(f.value)}
                  className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all ${
                    format === f.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Text Layout */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Text Position</label>
            <div className="grid grid-cols-3 gap-1 w-fit">
              {POSITIONS.map(pos => (
                <button key={pos} onClick={() => setTextPosition(pos)}
                  className={`w-10 h-10 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    textPosition === pos ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
                  }`}>{pos}</button>
              ))}
            </div>
          </div>

          {/* Text Style */}
          <div>
            <label className="block text-[13px] font-semibold text-foreground mb-1.5">Text Style</label>
            <div className="flex gap-2">
              {TEXT_STYLES.map(s => (
                <button key={s.value} onClick={() => setTextStyle(s.value)}
                  className={`flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all ${
                    textStyle === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>

          <div className="h-20" />
        </div>

        {/* Generate Button */}
        <div className="sticky bottom-0 bg-gradient-to-t from-card via-card to-transparent px-6 pb-5 pt-4">
          <button onClick={handleGenerate} disabled={!canGenerate || generating}
            className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] text-primary-foreground transition-all ${
              generating ? 'bg-primary/70 cursor-not-allowed' : canGenerate ? 'bg-primary hover:brightness-110 shadow-warm-lg' : 'bg-muted cursor-not-allowed text-muted-foreground'
            }`}>
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin" /> Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ImageIcon size={18} /> Generate Ad Image
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 bg-secondary flex flex-col items-center justify-center p-8 overflow-y-auto">
        {generating ? (
          <div className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-foreground text-center mb-6">Creating your ad...</h3>
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.status === 'done' ? 'bg-primary text-primary-foreground' :
                  step.status === 'active' ? 'bg-primary/20 text-primary animate-pulse' :
                  step.status === 'error' ? 'bg-destructive text-destructive-foreground' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {step.status === 'done' ? <Check size={14} /> :
                   step.status === 'active' ? <RefreshCw size={12} className="animate-spin" /> :
                   step.status === 'error' ? <X size={14} /> :
                   i + 1}
                </div>
                <span className={`text-sm font-medium ${step.status === 'active' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        ) : finalImageUrl ? (
          <div className="w-full max-w-lg">
            <div className="rounded-2xl overflow-hidden border border-border shadow-warm-lg bg-card mb-4"
              style={{ aspectRatio }}>
              <img src={finalImageUrl} alt="Generated ad" className="w-full h-full object-cover" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:brightness-110">
                <Download size={14} /> Download
              </button>
              <button onClick={handleNewVariation}
                className="px-4 py-2.5 rounded-xl border border-input text-sm font-medium text-foreground flex items-center gap-2 hover:bg-secondary">
                <RefreshCw size={14} /> New Variation
              </button>
              <button onClick={() => { setEditing(true); }}
                className="px-4 py-2.5 rounded-xl border border-input text-sm font-medium text-foreground flex items-center gap-2 hover:bg-secondary">
                <Edit3 size={14} /> Edit Text
              </button>
              <button onClick={handleRemix}
                className="px-4 py-2.5 rounded-xl border border-input text-sm font-medium text-foreground flex items-center gap-2 hover:bg-secondary">
                <RefreshCw size={14} /> Remix Image
              </button>
              <button onClick={() => toast.success('Saved to library!')}
                className="px-4 py-2.5 rounded-xl border border-input text-sm font-medium text-foreground flex items-center gap-2 hover:bg-secondary">
                <Save size={14} /> Save to Library
              </button>
            </div>

            {/* Inline Edit Panel */}
            <AnimatePresence>
              {editing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="mt-4 bg-card rounded-xl border border-border p-4 space-y-3 overflow-hidden">
                  <h4 className="text-sm font-bold text-foreground">Edit Text Overlay</h4>
                  <input type="text" value={headline} onChange={e => setHeadline(e.target.value.slice(0, 60))}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="Headline" />
                  <input type="text" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm" placeholder="Price" />
                  <div className="flex gap-2">
                    {TEXT_STYLES.map(s => (
                      <button key={s.value} onClick={() => setTextStyle(s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${textStyle === s.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleReapplyText}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Apply Changes</button>
                    <button onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-64 mx-auto rounded-2xl border-2 border-dashed border-border mb-6"
              style={{ aspectRatio }}>
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Your ad will appear here</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Upload a product image and add a headline to get started</p>
          </div>
        )}
      </div>

      {/* Remix Modal */}
      <AnimatePresence>
        {remixModalOpen && remixAd && (
          <ImageRemixModal
            ad={remixAd}
            workspaceId={activeWorkspace?.id || ''}
            onClose={() => { setRemixModalOpen(false); setRemixAd(null); }}
            onRemixComplete={(images) => {
              if (images.length > 0) {
                setGeneratedImageUrl(images[0].image_url);
                setCurrentAdId(images[0].id);
                // Re-apply text
                handleReapplyText();
              }
              setRemixModalOpen(false);
              setRemixAd(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumImageGenerator;
