export type GeneratorMode = 'copy' | 'image';

export interface AdResult {
  id?: string;
  headline: string;
  body: string;
  cta: string;
  dhoom_score: number;
  copy_score: number;
  score_reason?: string;
  platform: string;
  framework: string;
  language?: string;
  is_winner?: boolean;
  improvement_note?: string;
  remixed_from_id?: string;
}

export interface ImageResult {
  id?: string;
  image_url: string;
  sd_prompt: string;
  dhoom_score: number;
  format: string;
  variation_number: number;
  is_winner?: boolean;
}

export interface GeneratorFormData {
  productName: string;
  productDesc: string;
  price: string;
  platforms: string[];
  language: 'bn' | 'banglish';
  framework: string;
  occasion: string;
  tone: string;
  numVariations: number;
  // Image-specific
  productImage: File | null;
  productImagePreview: string | null;
  imageFormat: 'square' | 'story' | 'banner';
  imageStyle: 'clean' | 'creative' | 'lifestyle' | 'sale';
  brandColorPrimary: string;
  brandColorSecondary: string;
}

export const PLATFORMS = [
  { label: 'Facebook', value: 'facebook', emoji: '🔵', color: '#1877F2', bg: '#E8F0FE' },
  { label: 'Instagram', value: 'instagram', emoji: '📸', color: '#E4405F', bg: '#FCE4EC' },
  { label: 'Daraz', value: 'daraz', emoji: '🛍️', color: '#FF5100', bg: '#FFF3E0' },
  { label: 'Google', value: 'google', emoji: '🔍', color: '#00B96B', bg: '#E8F5E9' },
];

export const FRAMEWORKS = [
  { label: '🎯 FOMO', value: 'FOMO', tooltip: 'ভয় দেখান, তাড়া তৈরি করুন' },
  { label: '😰 PAS', value: 'PAS', tooltip: 'সমস্যা → জ্বালা → সমাধান' },
  { label: '📖 AIDA', value: 'AIDA', tooltip: 'মনোযোগ → আগ্রহ → চাওয়া → কাজ' },
  { label: '✅ সামাজিক প্রমাণ', value: 'social_proof', tooltip: 'অন্যরা কিনেছে দেখান' },
  { label: '⚡ Before-After', value: 'before_after', tooltip: 'আগে কেমন ছিল, এখন কেমন' },
  { label: '🎁 অফার-ফার্স্ট', value: 'offer_first', tooltip: 'দাম/অফার দিয়েই শুরু' },
];

export const OCCASIONS = [
  { label: 'সাধারণ (কোনো বিশেষ উপলক্ষ নেই)', value: 'general' },
  { label: 'ঈদুল ফিতর', value: 'eid_fitr' },
  { label: 'ঈদুল আযহা', value: 'eid_adha' },
  { label: 'পহেলা বৈশাখ', value: 'boishakh' },
  { label: 'বিজয় দিবস', value: 'december16' },
  { label: 'ভালোবাসা দিবস', value: 'valentine' },
  { label: 'মাতৃ দিবস', value: 'mothers_day' },
  { label: 'নববর্ষ', value: 'new_year' },
  { label: 'রমজান', value: 'ramadan' },
  { label: 'ব্ল্যাক ফ্রাইডে / সেল সিজন', value: 'black_friday' },
  { label: 'পণ্য লঞ্চ', value: 'product_launch' },
];

export const TONES = [
  { label: '😊 বন্ধুত্বপূর্ণ', value: 'friendly' },
  { label: '💼 পেশাদার', value: 'professional' },
  { label: '🔥 আক্রমণাত্মক', value: 'aggressive' },
];

export const IMAGE_FORMATS = [
  { label: '◻️ স্কয়ার 1:1', value: 'square' as const },
  { label: '📱 স্টোরি 9:16', value: 'story' as const },
  { label: '🖼️ ব্যানার 16:9', value: 'banner' as const },
];

export const IMAGE_STYLES = [
  { label: '✨ ক্লিন প্রোডাক্ট', value: 'clean' as const },
  { label: '🎨 ক্রিয়েটিভ', value: 'creative' as const },
  { label: '📸 লাইফস্টাইল', value: 'lifestyle' as const },
  { label: '🔥 সেল/অফার', value: 'sale' as const },
];

export const LOADING_TIPS = [
  'Facebook এ সন্ধ্যা ৭-১০টায় বিজ্ঞাপন পোস্ট করলে বেশি এনগেজমেন্ট পাওয়া যায়।',
  '৳৯৯৯ মূল্য ৳১,০০০ থেকে বেশি বিক্রি আনে — মনোবিজ্ঞান কাজ করে!',
  'ধুম স্কোর ৭৫+ বিজ্ঞাপন গড়ে ৩× বেশি ক্লিক পায়।',
];
