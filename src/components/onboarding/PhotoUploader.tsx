import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2 } from 'lucide-react';

type Props = {
  onSubmit: (base64Images: string[]) => void;
  loading?: boolean;
};

const PhotoUploader = ({ onSubmit, loading }: Props) => {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - previews.length);
    const newPreviews = newFiles.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    const base64s = await Promise.all(
      previews.map(p => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip data:... prefix
        };
        reader.readAsDataURL(p.file);
      }))
    );
    onSubmit(base64s);
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold text-foreground">Upload your product photos</p>
      <p className="text-xs text-muted-foreground">Upload 1-5 photos. AI will analyze them to understand your products and brand style.</p>

      {previews.length < 5 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
          onDragLeave={e => e.currentTarget.classList.remove('border-primary')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Drag photos here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB each</p>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
            onChange={e => handleFiles(e.target.files)} className="hidden" />
        </div>
      )}

      {previews.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {previews.map((p, i) => (
            <div key={i} className="relative group">
              <img src={p.url} alt={`Product ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-border" />
              <button onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Camera size={18} /> Analyze Photos →</>}
        </button>
      )}
    </div>
  );
};

export default PhotoUploader;
