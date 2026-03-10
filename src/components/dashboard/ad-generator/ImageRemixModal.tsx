import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Sparkles, Camera, Layers, Sun, TreePine, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceProducts } from '@/hooks/useWorkspaceProducts';

interface ImageRemixModalProps {
  ad: {
    id: string;
    image_url: string;
    cutout_url?: string;
    text_config?: any;
    style?: string;
    format?: string;
  };
  workspaceId: string;
  onClose: () => void;
  onRemixComplete: (images: any[]) => void;
}

const STYLE_OPTIONS = [
  { value: 'studio', label: 'Studio Clean', icon: <Sparkles size={14} /> },
  { value: 'lifestyle', label: 'Lifestyle', icon: <Camera size={14} /> },
  { value: 'flatlay', label: 'Flat Lay', icon: <Layers size={14} /> },
  { value: 'gradient', label: 'Gradient', icon: <Sun size={14} /> },
  { value: 'outdoor', label: 'Outdoor', icon: <TreePine size={14} /> },
];

const CHANGE_ELEMENTS = ['Lighting', 'Background Color', 'Environment Depth', 'Props/Accessories', 'Camera Angle', 'Time of Day'];
const WINNING_QUALITIES = ['Clean composition', 'Bold contrast', 'Premium lighting', 'Lifestyle feel', 'Strong product focus', 'Color harmony', 'Minimalist', 'Energetic/Dynamic'];

const ImageRemixModal = ({ ad, workspaceId, onClose, onRemixComplete }: ImageRemixModalProps) => {
  const [remixType, setRemixType] = useState<'fresh' | 'style' | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fresh Scene state
  const [freshStyle, setFreshStyle] = useState(ad.style || 'studio');
  const [selectedChanges, setSelectedChanges] = useState<string[]>(['Lighting', 'Background Color']);
  const [freshVariations, setFreshVariations] = useState(3);

  // Style Transfer state
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [styleVariations, setStyleVariations] = useState(2);
  const [targetProductImage, setTargetProductImage] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { products } = useWorkspaceProducts(workspaceId);

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const handleFreshScene = async () => {
    if (selectedChanges.length === 0) { toast.error('Select at least one change'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remix-image-fresh', {
        body: {
          workspace_id: workspaceId,
          source_image_id: ad.id,
          style: freshStyle,
          change_elements: selectedChanges,
          variations: freshVariations,
          text_config: ad.text_config,
        },
      });
      if (error) throw error;
      if (data?.success && data.images?.length) {
        toast.success(`${data.images.length} fresh scenes generated!`);
        onRemixComplete(data.images);
      } else {
        toast.error(data?.message || 'Generation failed');
      }
    } catch { toast.error('Remix failed'); }
    finally { setGenerating(false); }
  };

  const handleStyleTransfer = async () => {
    if (selectedQualities.length === 0) { toast.error('Select at least one quality'); return; }
    if (!targetProductImage && !selectedProductId) { toast.error('Select a target product'); return; }
    setGenerating(true);
    try {
      const targetProduct = selectedProductId
        ? products.find(p => p.id === selectedProductId)
        : null;
      const targetCutoutUrl = targetProduct?.primary_image_url || targetProductImage;

      const { data, error } = await supabase.functions.invoke('remix-image-style', {
        body: {
          workspace_id: workspaceId,
          source_image_id: ad.id,
          winning_qualities: selectedQualities,
          target_product_cutout_url: targetCutoutUrl,
          target_product_image_base64: !targetCutoutUrl ? targetProductImage : undefined,
          variations: styleVariations,
          text_config: ad.text_config,
        },
      });
      if (error) throw error;
      if (data?.success && data.images?.length) {
        toast.success(`${data.images.length} style transfers generated!`);
        onRemixComplete(data.images);
      } else {
        toast.error(data?.message || 'Style transfer failed');
      }
    } catch { toast.error('Style transfer failed'); }
    finally { setGenerating(false); }
  };

  const handleUploadTarget = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => { setTargetProductImage(reader.result as string); setSelectedProductId(null); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-card rounded-[24px] max-w-[560px] w-full p-8 shadow-warm-lg border border-border z-10 max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={20} /></button>

        <h3 className="text-lg font-bold text-foreground mb-1">Remix This Image</h3>
        <p className="text-sm text-muted-foreground mb-4">Choose how you want to remix it</p>

        {/* Source preview */}
        <div className="rounded-[14px] overflow-hidden border border-border mb-5 h-[180px]">
          <img src={ad.image_url} alt="Source" className="w-full h-full object-cover" />
        </div>

        {/* Type selection */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {([
            { key: 'fresh' as const, icon: <Camera size={18} />, title: 'Fresh Scene', desc: 'Same product, new background. Keep the style — just a different scene.' },
            { key: 'style' as const, icon: <Sparkles size={18} />, title: 'Style Transfer', desc: "Apply this image's winning style to a different product." },
          ]).map(opt => (
            <button key={opt.key} onClick={() => setRemixType(opt.key)}
              className={`p-4 rounded-xl border-[1.5px] text-left transition-all ${
                remixType === opt.key ? 'border-primary bg-primary/[0.04]' : 'border-border hover:border-primary/40'
              }`}>
              <div className={`mb-2 ${remixType === opt.key ? 'text-primary' : 'text-muted-foreground'}`}>{opt.icon}</div>
              <p className="text-sm font-semibold text-foreground">{opt.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Fresh Scene Options */}
        {remixType === 'fresh' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Scene Style</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setFreshStyle(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border transition-colors ${
                      freshStyle === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                    }`}>{s.icon} {s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">What to change?</label>
              <div className="flex flex-wrap gap-1.5">
                {CHANGE_ELEMENTS.map(el => (
                  <button key={el} onClick={() => toggleItem(selectedChanges, el, setSelectedChanges)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedChanges.includes(el) ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                    }`}>{el}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Variations</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setFreshVariations(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold ${freshVariations === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{n}</button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Each variation = 1 generation credit</p>
            </div>
            <button onClick={handleFreshScene} disabled={generating}
              className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] hover:brightness-110 disabled:opacity-70 flex items-center justify-center gap-2">
              {generating ? <><RefreshCw size={16} className="animate-spin" /> Generating...</> : 'Generate Fresh Scenes'}
            </button>
          </motion.div>
        )}

        {/* Style Transfer Options */}
        {remixType === 'style' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">What made this image work?</label>
              <div className="flex flex-wrap gap-1.5">
                {WINNING_QUALITIES.map(q => (
                  <button key={q} onClick={() => toggleItem(selectedQualities, q, setSelectedQualities)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedQualities.includes(q) ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                    }`}>{q}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Apply style to which product?</label>
              {products.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {products.filter(p => p.is_active).slice(0, 6).map(p => (
                    <button key={p.id} onClick={() => { setSelectedProductId(p.id); setTargetProductImage(null); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                        selectedProductId === p.id ? 'border-primary bg-primary/5' : 'border-input'
                      }`}>
                      {p.primary_image_url && <img src={p.primary_image_url} className="w-6 h-6 rounded object-cover" />}
                      <span className="truncate max-w-[100px]">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleUploadTarget(e.target.files[0])} />
              <button onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Upload size={12} /> Or upload a new product photo
              </button>
              {targetProductImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={targetProductImage} className="w-12 h-12 rounded-lg object-cover border border-border" />
                  <button onClick={() => setTargetProductImage(null)} className="text-xs text-destructive">Remove</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Variations</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setStyleVariations(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold ${styleVariations === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{n}</button>
                ))}
              </div>
            </div>
            <button onClick={handleStyleTransfer} disabled={generating}
              className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold text-[15px] hover:brightness-110 disabled:opacity-70 flex items-center justify-center gap-2">
              {generating ? <><RefreshCw size={16} className="animate-spin" /> Applying...</> : 'Apply Style to Product'}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ImageRemixModal;
