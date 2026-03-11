export const WORKSPACE_LIMITS: Record<string, number> = {
  free: 1,
  starter: 1,
  pro: 5,
  agency: 20,
  custom: Infinity,
};

export const PRESET_COLORS = [
  '#FF5100', '#6C3FE8', '#00B96B', '#FFB800',
  '#1C1B1A', '#E91E8C', '#2196F3', '#FF6B35',
];

export const PRESET_ICONS = [
  'store', 'shopping-bag', 'shirt', 'palette',
  'smartphone', 'coffee', 'gem', 'package',
] as const;

export const INDUSTRIES = [
  'Fashion', 'Footwear', 'Beauty', 'Electronics',
  'Food & Beverage', 'Home & Furniture', 'Jewellery', 'Bags',
  'Kids & Toys', 'Sports', 'Health', 'Other',
];

export const PLATFORMS = [
  'Facebook', 'Instagram', 'Daraz', 'Own Website', 'Multiple',
];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'banglish', label: 'Banglish' },
];
