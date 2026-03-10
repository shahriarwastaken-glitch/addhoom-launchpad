import { useState } from 'react';
import {
  Shirt, Sparkles, UtensilsCrossed, Smartphone, Home, Gem,
  HeartPulse, Dumbbell, Baby, BookOpen, Gift, MoreHorizontal,
} from 'lucide-react';

const TEMPLATES: {
  id: string; icon: React.ElementType; label: string;
  data: { brand_tone: string; target_audience: string; price_range: string; niche_tags: string[]; key_products: string; unique_selling: string };
}[] = [
  {
    id: 'fashion', icon: Shirt, label: 'Fashion',
    data: { brand_tone: 'Stylish, trendy, approachable', target_audience: 'Fashion-conscious women and men, 18-35', price_range: 'mid_range', niche_tags: ['fashion', 'clothing', 'accessories'], key_products: 'Tops, bottoms, dresses, accessories', unique_selling: 'Latest trends at affordable prices' },
  },
  {
    id: 'beauty', icon: Sparkles, label: 'Beauty',
    data: { brand_tone: 'Confident, caring, trustworthy', target_audience: 'Women 18-40 focused on skincare and beauty', price_range: 'mid_range', niche_tags: ['beauty', 'skincare', 'cosmetics'], key_products: 'Skincare, makeup, hair care', unique_selling: 'Safe, effective beauty products' },
  },
  {
    id: 'food', icon: UtensilsCrossed, label: 'Food',
    data: { brand_tone: 'Warm, delicious, homey', target_audience: 'Food lovers, families, office workers', price_range: 'budget', niche_tags: ['food', 'homemade', 'delivery'], key_products: 'Homemade food, snacks, beverages', unique_selling: 'Fresh, homemade taste delivered to your door' },
  },
  {
    id: 'electronics', icon: Smartphone, label: 'Electronics',
    data: { brand_tone: 'Tech-savvy, reliable, modern', target_audience: 'Tech enthusiasts, professionals, students', price_range: 'mid_range', niche_tags: ['electronics', 'gadgets', 'accessories'], key_products: 'Phones, accessories, gadgets', unique_selling: 'Latest tech at competitive prices' },
  },
  {
    id: 'home_goods', icon: Home, label: 'Home Decor',
    data: { brand_tone: 'Warm, inspiring, homey', target_audience: 'Homeowners and renters 25-45', price_range: 'mid_range', niche_tags: ['home decor', 'furniture', 'lifestyle'], key_products: 'Decorative items, furniture, home accessories', unique_selling: 'Transform your space affordably' },
  },
  {
    id: 'jewelry', icon: Gem, label: 'Jewelry',
    data: { brand_tone: 'Elegant, premium, timeless', target_audience: 'Women 20-45 looking for quality jewelry', price_range: 'premium', niche_tags: ['jewelry', 'accessories', 'gifts'], key_products: 'Necklaces, earrings, bracelets, rings', unique_selling: 'Handcrafted jewelry for every occasion' },
  },
  {
    id: 'health', icon: HeartPulse, label: 'Health',
    data: { brand_tone: 'Trustworthy, scientific, caring', target_audience: 'Health-conscious adults 25-45', price_range: 'mid_range', niche_tags: ['health', 'wellness', 'supplements'], key_products: 'Supplements, health products, wellness items', unique_selling: 'Clinically backed health solutions' },
  },
  {
    id: 'sports', icon: Dumbbell, label: 'Sports',
    data: { brand_tone: 'Energetic, motivational, bold', target_audience: 'Fitness enthusiasts 18-40', price_range: 'mid_range', niche_tags: ['sports', 'fitness', 'activewear'], key_products: 'Sportswear, equipment, supplements', unique_selling: 'Performance gear for every athlete' },
  },
  {
    id: 'kids', icon: Baby, label: 'Baby & Kids',
    data: { brand_tone: 'Caring, safe, playful', target_audience: 'Parents of children 0-12', price_range: 'mid_range', niche_tags: ['kids', 'baby', 'toys'], key_products: 'Toys, clothing, accessories for kids', unique_selling: 'Safe and fun products for your little ones' },
  },
  {
    id: 'books', icon: BookOpen, label: 'Books',
    data: { brand_tone: 'Intellectual, curated, trusted', target_audience: 'Book lovers, students, professionals', price_range: 'budget', niche_tags: ['books', 'stationery', 'education'], key_products: 'Books, notebooks, stationery', unique_selling: 'Curated collection for every reader' },
  },
  {
    id: 'gifts', icon: Gift, label: 'Gifts',
    data: { brand_tone: 'Thoughtful, joyful, premium', target_audience: 'Gift shoppers for all occasions', price_range: 'mid_range', niche_tags: ['gifts', 'customized', 'occasions'], key_products: 'Gift boxes, personalized items, hampers', unique_selling: 'Unique gifts that create memories' },
  },
  {
    id: 'other', icon: MoreHorizontal, label: 'Other',
    data: { brand_tone: 'Professional, reliable', target_audience: 'General consumers', price_range: 'mid_range', niche_tags: [], key_products: '', unique_selling: '' },
  },
];

type Props = {
  onSelect: (industry: string, templateData: typeof TEMPLATES[0]['data']) => void;
};

const TemplateSelector = ({ onSelect }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedTemplate = TEMPLATES.find(t => t.id === selected);

  return (
    <div className="mt-4 space-y-5">
      <p className="text-sm font-semibold text-foreground">What kind of shop do you have?</p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                selected === t.id ? 'border-primary bg-primary/[0.04]' : 'border-border hover:border-primary/50'
              }`}>
              <Icon size={22} className={selected === t.id ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs font-medium text-foreground">{t.label}</span>
            </button>
          );
        })}
      </div>

      {selectedTemplate && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground mb-3">Here's your starting profile:</p>
          {[
            { label: 'Brand Voice', value: selectedTemplate.data.brand_tone },
            { label: 'Target Audience', value: selectedTemplate.data.target_audience },
            { label: 'Key Products', value: selectedTemplate.data.key_products },
            { label: 'Unique Selling Point', value: selectedTemplate.data.unique_selling },
            { label: 'Price Range', value: selectedTemplate.data.price_range.replace('_', ' ') },
          ].map(field => (
            <div key={field.label}>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{field.label}</span>
              <p className="text-sm font-medium text-foreground capitalize">{field.value || 'Not set'}</p>
            </div>
          ))}
          <button onClick={() => onSelect(selectedTemplate.id, selectedTemplate.data)}
            className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-3.5 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all mt-2">
            Looks good →
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
