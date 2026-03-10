export type GeneratorMode = 'copy' | 'image';

export type SceneKey = 'studio' | 'lifestyle' | 'luxury';

export type LightingMood = 'soft' | 'dramatic' | 'natural' | 'bright' | 'golden';
export type CameraAngle = 'front' | 'three_quarter' | 'overhead' | 'closeup' | 'cinematic';

// Legacy types kept for compatibility
export type ColorMood = 'warm' | 'cool' | 'neutral' | 'bold';
export type BackgroundComplexity = 'minimal' | 'moderate' | 'rich';
export type TimeOfDay = 'morning' | 'golden' | 'midday' | 'night';
export type ProductFocus = 'hero' | 'environmental' | 'detail';

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
  image_url?: string;
  scene?: SceneKey;
  // Copy That! fields
  awareness_stage?: string;
  sophistication_level?: string;
  key_desire_hit?: string;
  brief_completeness?: number;
  // Dimension scores
  scores?: {
    hook_strength?: number;
    emotional_resonance?: number;
    objection_handling?: number;
    offer_clarity?: number;
    awareness_fit?: number;
    language_execution?: number;
  };
}

export interface ImageResult {
  id?: string;
  image_url: string;
  sd_prompt: string;
  dhoom_score: number;
  format: string;
  variation_number: number;
  is_winner?: boolean;
  scene?: SceneKey;
}

export interface GeneratorFormData {
  productName: string;
  productDesc: string;
  price: string;
  platforms: string[];
  language: 'bn' | 'en' | 'banglish';
  framework: string;
  occasion: string;
  tone: string;
  numVariations: number;
  productImage: File | null;
  productImagePreview: string | null;
  imageFormat: 'square' | 'story' | 'banner';
  imageStyle: 'clean' | 'creative' | 'lifestyle' | 'sale';
  brandColorPrimary: string;
  brandColorSecondary: string;
  // Visual controls
  lightingMood: LightingMood;
  colorMood: ColorMood;
  cameraAngle: CameraAngle;
  backgroundComplexity: BackgroundComplexity;
  timeOfDay: TimeOfDay;
  productFocus: ProductFocus;
  // Scene selection (image mode v4)
  selectedScenes: SceneKey[];
  additionalDetails: string;
  // Copy That! advanced fields
  targetReader: string;
  awarenessStage: string;
  sophistication: string;
  oneIdea: string;
  desires: string;
  notions: string;
  identification: string;
  offer: string;
  oneAction: string;
}

export const COPY_PLATFORMS = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Email', value: 'email' },
  { label: 'Sales Page', value: 'sales_page' },
  { label: 'WhatsApp', value: 'whatsapp' },
];

export const COPY_LANGUAGES = [
  { label: 'English', value: 'en' as const },
  { label: 'বাংলা', value: 'bn' as const },
  { label: 'Banglish', value: 'banglish' as const },
];

export const COPY_TONES = [
  { label: 'Friendly', labelBn: 'বন্ধুসুলভ', value: 'friendly' },
  { label: 'Bold', labelBn: 'সাহসী', value: 'bold' },
  { label: 'Professional', labelBn: 'পেশাদার', value: 'professional' },
  { label: 'Urgent', labelBn: 'জরুরি', value: 'urgent' },
  { label: 'Playful', labelBn: 'খেলাধুলা', value: 'playful' },
  { label: 'Elegant', labelBn: 'মার্জিত', value: 'elegant' },
  { label: 'Conversational', labelBn: 'কথোপকথন', value: 'conversational' },
  { label: 'Aggressive', labelBn: 'আক্রমণাত্মক', value: 'aggressive' },
];

export const AWARENESS_STAGES = [
  { label: 'Brand New', labelBn: 'নতুন', value: 'unaware', icon: 'seedling', desc: "They've never heard of anything like this", descBn: 'এরকম কিছু সম্পর্কে কখনো শোনেনি' },
  { label: 'Has the Problem', labelBn: 'সমস্যা আছে', value: 'problem_aware', icon: 'frown', desc: "They know they have a problem but don't know solutions exist", descBn: 'সমস্যা আছে জানে কিন্তু সমাধান জানে না' },
  { label: 'Knows Solutions', labelBn: 'সমাধান জানে', value: 'solution_aware', icon: 'search', desc: "They've seen similar products but not yours", descBn: 'একই ধরনের পণ্য দেখেছে কিন্তু আপনারটি না' },
  { label: 'Comparing', labelBn: 'তুলনা করছে', value: 'product_aware', icon: 'thinking', desc: "They're choosing between yours and competitors", descBn: 'আপনার ও প্রতিযোগীদের মধ্যে বেছে নিচ্ছে' },
  { label: 'Ready to Buy', labelBn: 'কিনতে প্রস্তুত', value: 'most_aware', icon: 'check', desc: 'They know your product, just need a reason now', descBn: 'আপনার পণ্য জানে, শুধু কারণ দরকার' },
];

export const SOPHISTICATION_LEVELS = [
  { label: 'Fresh Market', labelBn: 'নতুন বাজার', value: 'low' },
  { label: 'Some Exposure', labelBn: 'কিছু এক্সপোজার', value: 'medium' },
  { label: 'Seen It All', labelBn: 'সব দেখেছে', value: 'high' },
  { label: 'Max Saturation', labelBn: 'সর্বোচ্চ', value: 'maximum' },
];

export const IMAGE_LIGHTING_OPTIONS = [
  { label: 'সফ্ট', labelEn: 'Soft', value: 'soft' as const, emoji: '🌤' },
  { label: 'ড্রামাটিক', labelEn: 'Dramatic', value: 'dramatic' as const, emoji: '⚡' },
  { label: 'ন্যাচারাল', labelEn: 'Natural', value: 'natural' as const, emoji: '🌿' },
  { label: 'ব্রাইট', labelEn: 'Bright', value: 'bright' as const, emoji: '☀️' },
  { label: 'গোল্ডেন আওয়ার', labelEn: 'Golden Hour', value: 'golden' as const, emoji: '🌇' },
];

export const IMAGE_CAMERA_OPTIONS = [
  { label: 'ফ্রন্ট', labelEn: 'Front', value: 'front' as const, emoji: '📷' },
  { label: '৩/৪ অ্যাঙ্গেল', labelEn: '3/4 Angle', value: 'three_quarter' as const, emoji: '↗️' },
  { label: 'ওভারহেড', labelEn: 'Overhead', value: 'overhead' as const, emoji: '⬆️' },
  { label: 'ক্লোজ-আপ', labelEn: 'Close-up', value: 'closeup' as const, emoji: '🔍' },
  { label: 'সিনেম্যাটিক', labelEn: 'Cinematic', value: 'cinematic' as const, emoji: '🎬' },
];

export const SCENE_OPTIONS: { label: string; labelBn: string; value: SceneKey; desc: string; descBn: string; icon: string }[] = [
  { label: 'Studio', labelBn: 'স্টুডিও', value: 'studio', desc: 'Clean white backdrop', descBn: 'পরিষ্কার সাদা ব্যাকড্রপ', icon: 'target' },
  { label: 'Lifestyle', labelBn: 'লাইফস্টাইল', value: 'lifestyle', desc: 'Natural warm interior', descBn: 'উষ্ণ প্রাকৃতিক ইন্টেরিয়র', icon: 'home' },
  { label: 'Luxury', labelBn: 'লাক্সারি', value: 'luxury', desc: 'Dark dramatic premium', descBn: 'ডার্ক ড্রামাটিক প্রিমিয়াম', icon: 'sparkles' },
];

// Legacy exports for backward compatibility
export const PLATFORMS = [
  { label: 'Facebook', labelEn: 'Facebook', value: 'facebook', icon: 'facebook', color: '#1877F2', bg: '#E8F0FE' },
  { label: 'Instagram', labelEn: 'Instagram', value: 'instagram', icon: 'instagram', color: '#E4405F', bg: '#FCE4EC' },
  { label: 'Daraz', labelEn: 'Daraz', value: 'daraz', icon: 'shopping-bag', color: '#FF5100', bg: '#FFF3E0' },
  { label: 'Google', labelEn: 'Google', value: 'google', icon: 'search', color: '#00B96B', bg: '#E8F5E9' },
];

export const FRAMEWORKS = [
  { label: 'FOMO', labelEn: 'FOMO', value: 'FOMO', tooltip: 'ভয় দেখান, তাড়া তৈরি করুন', tooltipEn: 'Create urgency & fear of missing out', icon: 'target' },
  { label: 'PAS', labelEn: 'PAS', value: 'PAS', tooltip: 'সমস্যা → জ্বালা → সমাধান', tooltipEn: 'Problem → Agitation → Solution', icon: 'alert-triangle' },
  { label: 'AIDA', labelEn: 'AIDA', value: 'AIDA', tooltip: 'মনোযোগ → আগ্রহ → চাওয়া → কাজ', tooltipEn: 'Attention → Interest → Desire → Action', icon: 'book-open' },
  { label: 'সামাজিক প্রমাণ', labelEn: 'Social Proof', value: 'social_proof', tooltip: 'অন্যরা কিনেছে দেখান', tooltipEn: 'Show others have bought it', icon: 'check-circle' },
  { label: 'Before-After', labelEn: 'Before-After', value: 'before_after', tooltip: 'আগে কেমন ছিল, এখন কেমন', tooltipEn: 'Show before vs after transformation', icon: 'zap' },
  { label: 'অফার-ফার্স্ট', labelEn: 'Offer-First', value: 'offer_first', tooltip: 'দাম/অফার দিয়েই শুরু', tooltipEn: 'Lead with the deal/price', icon: 'gift' },
];

export const OCCASIONS = [
  { label: 'সাধারণ (কোনো বিশেষ উপলক্ষ নেই)', labelEn: 'General (No special occasion)', value: 'general' },
  { label: 'ঈদুল ফিতর', labelEn: 'Eid ul-Fitr', value: 'eid_fitr' },
  { label: 'ঈদুল আযহা', labelEn: 'Eid ul-Adha', value: 'eid_adha' },
  { label: 'পহেলা বৈশাখ', labelEn: 'Pohela Boishakh', value: 'boishakh' },
  { label: 'বিজয় দিবস', labelEn: 'Victory Day', value: 'december16' },
  { label: 'ভালোবাসা দিবস', labelEn: "Valentine's Day", value: 'valentine' },
  { label: 'মাতৃ দিবস', labelEn: "Mother's Day", value: 'mothers_day' },
  { label: 'নববর্ষ', labelEn: 'New Year', value: 'new_year' },
  { label: 'রমজান', labelEn: 'Ramadan', value: 'ramadan' },
  { label: 'ব্ল্যাক ফ্রাইডে / সেল সিজন', labelEn: 'Black Friday / Sale Season', value: 'black_friday' },
  { label: 'পণ্য লঞ্চ', labelEn: 'Product Launch', value: 'product_launch' },
];

export const TONES = [
  { label: 'বন্ধুত্বপূর্ণ', labelEn: 'Friendly', value: 'friendly', icon: 'smile' },
  { label: 'পেশাদার', labelEn: 'Professional', value: 'professional', icon: 'briefcase' },
  { label: 'আক্রমণাত্মক', labelEn: 'Aggressive', value: 'aggressive', icon: 'flame' },
];

export const IMAGE_FORMATS = [
  { label: 'স্কয়ার 1:1', labelEn: 'Square 1:1', value: 'square' as const, icon: 'square' },
  { label: 'স্টোরি 9:16', labelEn: 'Story 9:16', value: 'story' as const, icon: 'smartphone' },
  { label: 'ব্যানার 16:9', labelEn: 'Banner 16:9', value: 'banner' as const, icon: 'monitor' },
];

export const IMAGE_STYLES = [
  { label: 'ক্লিন প্রোডাক্ট', labelEn: 'Clean Product', value: 'clean' as const, icon: 'sparkles' },
  { label: 'ক্রিয়েটিভ', labelEn: 'Creative', value: 'creative' as const, icon: 'palette' },
  { label: 'লাইফস্টাইল', labelEn: 'Lifestyle', value: 'lifestyle' as const, icon: 'camera' },
  { label: 'সেল/অফার', labelEn: 'Sale/Offer', value: 'sale' as const, icon: 'flame' },
];

export const LIGHTING_OPTIONS = [
  { label: 'সফ্ট', labelEn: 'Soft', value: 'soft' as const, emoji: '🌤' },
  { label: 'ড্রামাটিক', labelEn: 'Dramatic', value: 'dramatic' as const, emoji: '⚡' },
  { label: 'ন্যাচারাল', labelEn: 'Natural', value: 'natural' as const, emoji: '🌿' },
  { label: 'ব্রাইট', labelEn: 'Bright', value: 'bright' as const, emoji: '☀️' },
];

export const COLOR_MOOD_OPTIONS = [
  { label: 'উষ্ণ', labelEn: 'Warm', value: 'warm' as const, emoji: '🍂' },
  { label: 'কুল', labelEn: 'Cool', value: 'cool' as const, emoji: '❄️' },
  { label: 'নিউট্রাল', labelEn: 'Neutral', value: 'neutral' as const, emoji: '⚪' },
  { label: 'বোল্ড', labelEn: 'Bold', value: 'bold' as const, emoji: '🎨' },
];

export const CAMERA_ANGLE_OPTIONS = [
  { label: 'ফ্রন্ট', labelEn: 'Front', value: 'front' as const, emoji: '📷' },
  { label: '৩/৪ অ্যাঙ্গেল', labelEn: '3/4 Angle', value: 'three_quarter' as const, emoji: '↗️' },
  { label: 'ওভারহেড', labelEn: 'Overhead', value: 'overhead' as const, emoji: '⬆️' },
  { label: 'ক্লোজ-আপ', labelEn: 'Close-up', value: 'closeup' as const, emoji: '🔍' },
];

export const BACKGROUND_OPTIONS = [
  { label: 'মিনিমাল', labelEn: 'Minimal', value: 'minimal' as const, emoji: '✦' },
  { label: 'মডারেট', labelEn: 'Moderate', value: 'moderate' as const, emoji: '◈' },
  { label: 'রিচ', labelEn: 'Rich', value: 'rich' as const, emoji: '❋' },
];

export const TIME_OF_DAY_OPTIONS = [
  { label: 'সকাল', labelEn: 'Morning', value: 'morning' as const, emoji: '🌅' },
  { label: 'গোল্ডেন আওয়ার', labelEn: 'Golden Hour', value: 'golden' as const, emoji: '🌇' },
  { label: 'দুপুর', labelEn: 'Midday', value: 'midday' as const, emoji: '☀️' },
  { label: 'রাত', labelEn: 'Night', value: 'night' as const, emoji: '🌙' },
];

export const PRODUCT_FOCUS_OPTIONS = [
  { label: 'হিরো', labelEn: 'Hero', value: 'hero' as const, emoji: '⭐' },
  { label: 'এনভায়রনমেন্টাল', labelEn: 'Environmental', value: 'environmental' as const, emoji: '🌿' },
  { label: 'ডিটেইল', labelEn: 'Detail', value: 'detail' as const, emoji: '🔎' },
];

export type SceneStyleDefaults = {
  lightingMood: LightingMood;
  colorMood: ColorMood;
  cameraAngle: CameraAngle;
  backgroundComplexity: BackgroundComplexity;
  timeOfDay: TimeOfDay;
  productFocus: ProductFocus;
};

export const SCENE_STYLE_DEFAULTS: Record<string, SceneStyleDefaults> = {
  clean: { lightingMood: 'soft', colorMood: 'neutral', cameraAngle: 'front', backgroundComplexity: 'minimal', timeOfDay: 'midday', productFocus: 'hero' },
  creative: { lightingMood: 'dramatic', colorMood: 'bold', cameraAngle: 'front', backgroundComplexity: 'minimal', timeOfDay: 'midday', productFocus: 'hero' },
  lifestyle: { lightingMood: 'natural', colorMood: 'warm', cameraAngle: 'three_quarter', backgroundComplexity: 'moderate', timeOfDay: 'golden', productFocus: 'environmental' },
  sale: { lightingMood: 'bright', colorMood: 'bold', cameraAngle: 'front', backgroundComplexity: 'minimal', timeOfDay: 'midday', productFocus: 'hero' },
  onWhite: { lightingMood: 'soft', colorMood: 'neutral', cameraAngle: 'front', backgroundComplexity: 'minimal', timeOfDay: 'midday', productFocus: 'hero' },
  studio: { lightingMood: 'soft', colorMood: 'neutral', cameraAngle: 'front', backgroundComplexity: 'minimal', timeOfDay: 'midday', productFocus: 'hero' },
  flatlay: { lightingMood: 'bright', colorMood: 'neutral', cameraAngle: 'overhead', backgroundComplexity: 'moderate', timeOfDay: 'midday', productFocus: 'hero' },
  outdoor: { lightingMood: 'natural', colorMood: 'warm', cameraAngle: 'three_quarter', backgroundComplexity: 'rich', timeOfDay: 'golden', productFocus: 'environmental' },
};

export const LOADING_TIPS = [
  'Facebook এ সন্ধ্যা ৭-১০টায় বিজ্ঞাপন পোস্ট করলে বেশি এনগেজমেন্ট পাওয়া যায়।',
  '৳৯৯৯ মূল্য ৳১,০০০ থেকে বেশি বিক্রি আনে — মনোবিজ্ঞান কাজ করে!',
  'ধুম স্কোর ৭৫+ বিজ্ঞাপন গড়ে ৩× বেশি ক্লিক পায়।',
];

export const LOADING_TIPS_EN = [
  'Posting ads on Facebook between 7-10 PM gets more engagement.',
  '৳999 pricing sells more than ৳1,000 — psychology works!',
  'Ads with Dhoom Score 75+ get 3× more clicks on average.',
];

export const COPY_LOADING_MESSAGES = [
  'Identifying your reader\'s desires...',
  'Finding the right hook...',
  'Overcoming objections...',
  'Choosing the strongest angle...',
  'Polishing the copy...',
];

export const COPY_LOADING_MESSAGES_BN = [
  'পাঠকের ইচ্ছা শনাক্ত করা হচ্ছে...',
  'সঠিক হুক খুঁজে বের করা হচ্ছে...',
  'আপত্তি দূর করা হচ্ছে...',
  'সবচেয়ে শক্তিশালী কোণ বাছাই করা হচ্ছে...',
  'কপি পরিমার্জন করা হচ্ছে...',
];
