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
  { label: 'Facebook', value: 'facebook', icon: 'facebook', color: '#1877F2', bg: '#E8F0FE' },
  { label: 'Instagram', value: 'instagram', icon: 'instagram', color: '#E4405F', bg: '#FCE4EC' },
  { label: 'Daraz', value: 'daraz', icon: 'shopping-bag', color: '#FF5100', bg: '#FFF3E0' },
  { label: 'Google', value: 'google', icon: 'search', color: '#00B96B', bg: '#E8F5E9' },
];

export const FRAMEWORKS = [
  { label: 'FOMO', value: 'FOMO', tooltip: 'ভয় দেখান, তাড়া তৈরি করুন', icon: 'target' },
  { label: 'PAS', value: 'PAS', tooltip: 'সমস্যা → জ্বালা → সমাধান', icon: 'alert-triangle' },
  { label: 'AIDA', value: 'AIDA', tooltip: 'মনোযোগ → আগ্রহ → চাওয়া → কাজ', icon: 'book-open' },
  { label: 'সামাজিক প্রমাণ', value: 'social_proof', tooltip: 'অন্যরা কিনেছে দেখান', icon: 'check-circle' },
  { label: 'Before-After', value: 'before_after', tooltip: 'আগে কেমন ছিল, এখন কেমন', icon: 'zap' },
  { label: 'অফার-ফার্স্ট', value: 'offer_first', tooltip: 'দাম/অফার দিয়েই শুরু', icon: 'gift' },
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
  { label: 'বন্ধুত্বপূর্ণ', value: 'friendly', icon: 'smile' },
  { label: 'পেশাদার', value: 'professional', icon: 'briefcase' },
  { label: 'আক্রমণাত্মক', value: 'aggressive', icon: 'flame' },
];

export const IMAGE_FORMATS = [
  { label: 'স্কয়ার 1:1', value: 'square' as const, icon: 'square' },
  { label: 'স্টোরি 9:16', value: 'story' as const, icon: 'smartphone' },
  { label: 'ব্যানার 16:9', value: 'banner' as const, icon: 'monitor' },
];

export const IMAGE_STYLES = [
  { label: 'ক্লিন প্রোডাক্ট', value: 'clean' as const, icon: 'sparkles' },
  { label: 'ক্রিয়েটিভ', value: 'creative' as const, icon: 'palette' },
  { label: 'লাইফস্টাইল', value: 'lifestyle' as const, icon: 'camera' },
  { label: 'সেল/অফার', value: 'sale' as const, icon: 'flame' },
];

export const LOADING_TIPS = [
  'Facebook এ সন্ধ্যা ৭-১০টায় বিজ্ঞাপন পোস্ট করলে বেশি এনগেজমেন্ট পাওয়া যায়।',
  '৳৯৯৯ মূল্য ৳১,০০০ থেকে বেশি বিক্রি আনে — মনোবিজ্ঞান কাজ করে!',
  'ধুম স্কোর ৭৫+ বিজ্ঞাপন গড়ে ৩× বেশি ক্লিক পায়।',
];
