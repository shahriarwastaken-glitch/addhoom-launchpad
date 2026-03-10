import { useState } from 'react';

const INDUSTRIES = [
  'Fashion & Clothing', 'Beauty & Skincare', 'Food & Beverage', 'Electronics & Gadgets',
  'Home & Furniture', 'Jewelry & Accessories', 'Health & Wellness', 'Sports & Fitness',
  'Baby & Kids', 'Books & Stationery', 'Other',
];

const PRICE_RANGES = ['Budget', 'Mid-range', 'Premium', 'Luxury'] as const;

const PERSONALITIES = [
  'Friendly', 'Professional', 'Fun', 'Trustworthy', 'Bold', 'Elegant',
  'Youthful', 'Reliable', 'Modern', 'Traditional', 'Playful', 'Serious',
];

export type ManualFormData = {
  shop_name: string;
  industry: string;
  key_products: string;
  target_audience: string;
  price_range: string;
  brand_tone: string;
};

type Props = {
  onSubmit: (data: ManualFormData) => void;
  loading?: boolean;
};

const ManualEntryForm = ({ onSubmit, loading }: Props) => {
  const [form, setForm] = useState<ManualFormData>({
    shop_name: '', industry: '', key_products: '', target_audience: '', price_range: '', brand_tone: '',
  });
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);

  const togglePersonality = (p: string) => {
    setSelectedPersonalities(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : prev.length < 3 ? [...prev, p] : prev;
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit({ ...form, brand_tone: selectedPersonalities.join(', ') || form.brand_tone });
  };

  const isValid = form.shop_name.trim() && form.industry.trim() && form.key_products.trim();

  return (
    <div className="space-y-5 mt-4">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Shop Name *</label>
        <input type="text" value={form.shop_name} onChange={e => setForm({ ...form, shop_name: e.target.value })}
          placeholder="What's your shop called?"
          className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Industry *</label>
        <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
          className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-foreground">
          <option value="">Select your industry</option>
          {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">What do you sell? *</label>
        <textarea value={form.key_products} onChange={e => setForm({ ...form, key_products: e.target.value })}
          placeholder="Describe your main products briefly" rows={2}
          className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground resize-none" />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Who are your customers?</label>
        <input type="text" value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
          placeholder="e.g. Women aged 20-35 in Dhaka"
          className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Price range</label>
        <div className="flex gap-2 flex-wrap">
          {PRICE_RANGES.map(pr => (
            <button key={pr} onClick={() => setForm({ ...form, price_range: pr.toLowerCase().replace('-', '_') })}
              className={`text-sm rounded-full px-4 py-2 border transition-colors ${
                form.price_range === pr.toLowerCase().replace('-', '_')
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}>{pr}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Brand personality (pick up to 3)</label>
        <div className="flex gap-2 flex-wrap">
          {PERSONALITIES.map(p => (
            <button key={p} onClick={() => togglePersonality(p)}
              className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                selectedPersonalities.includes(p)
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}>{p}</button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!isValid || loading}
        className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? 'Processing...' : 'Continue →'}
      </button>
    </div>
  );
};

export default ManualEntryForm;
