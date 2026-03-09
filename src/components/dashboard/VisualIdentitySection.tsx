import { useState } from 'react';
import { Palette, Type, Image, Plus, X } from 'lucide-react';

type BrandColors = Array<{ hex: string; role: string; source: string }>;
type BrandFonts = { heading?: string; body?: string; source: string };

type VisualIdentitySectionProps = {
  brandColors: BrandColors;
  brandFonts: BrandFonts;
  brandLogoUrl: string | null;
  onUpdateColors: (colors: BrandColors) => void;
  onUpdateFonts: (fonts: BrandFonts) => void;
};

const COLOR_ROLES = ['primary', 'secondary', 'background', 'text', 'accent'];

const VisualIdentitySection = ({
  brandColors, brandFonts, brandLogoUrl,
  onUpdateColors, onUpdateFonts,
}: VisualIdentitySectionProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColor, setNewColor] = useState('#FF5100');

  const addColor = () => {
    if (brandColors.length >= 6) return;
    const usedRoles = brandColors.map(c => c.role);
    const nextRole = COLOR_ROLES.find(r => !usedRoles.includes(r)) || 'accent';
    onUpdateColors([...brandColors, { hex: newColor, role: nextRole, source: 'manual' }]);
    setShowColorPicker(false);
  };

  const removeColor = (index: number) => {
    onUpdateColors(brandColors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Palette size={18} className="text-primary" />
        Visual Identity
      </h3>

      {/* Logo */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          <Image size={12} className="inline mr-1" /> Logo
        </label>
        {brandLogoUrl ? (
          <div className="flex items-center gap-3">
            <img src={brandLogoUrl} alt="Brand logo" className="h-[60px] object-contain rounded-lg bg-secondary p-2" />
            <span className="text-xs text-[hsl(var(--brand-green))] font-medium">Logo detected</span>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">No logo detected</p>
          </div>
        )}
      </div>

      {/* Brand Colors */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          <Palette size={12} className="inline mr-1" /> Brand Colors
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {brandColors.map((color, i) => (
            <div key={i} className="group relative">
              <div
                className="w-9 h-9 rounded-full border-2 border-background shadow-sm cursor-pointer"
                style={{ backgroundColor: color.hex }}
                title={`${color.role} — ${color.hex}`}
              />
              <button
                onClick={() => removeColor(i)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white items-center justify-center text-[10px] hidden group-hover:flex"
              >
                <X size={10} />
              </button>
              <span className="text-[10px] text-muted-foreground text-center block mt-0.5 capitalize">{color.role}</span>
            </div>
          ))}
          {brandColors.length < 6 && (
            showColorPicker ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-9 h-9 rounded-full cursor-pointer border border-input"
                />
                <button onClick={addColor} className="text-xs text-primary font-semibold">Add</button>
                <button onClick={() => setShowColorPicker(false)} className="text-xs text-muted-foreground">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowColorPicker(true)}
                className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus size={14} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          <Type size={12} className="inline mr-1" /> Fonts
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground mb-1">Heading</p>
            <input
              type="text"
              value={brandFonts.heading || ''}
              onChange={e => onUpdateFonts({ ...brandFonts, heading: e.target.value })}
              placeholder="Not detected"
              className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-foreground"
            />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground mb-1">Body</p>
            <input
              type="text"
              value={brandFonts.body || ''}
              onChange={e => onUpdateFonts({ ...brandFonts, body: e.target.value })}
              placeholder="Not detected"
              className="w-full text-sm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualIdentitySection;
