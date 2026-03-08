export type VideoStage = 1 | 2 | 3;
export type VideoFormat = 'feed' | 'reels' | 'story';
export type VideoStyle = 'clean' | 'bold' | 'story' | 'luxury';
export type MusicTrack = 'energetic' | 'soft' | 'trendy' | 'corporate' | 'none' | 'custom';
export type TextLanguage = 'bn' | 'en';
export type FontStyle = 'hind' | 'bold' | 'modern';
export type TextAnimation = 'fade' | 'slide' | 'typewriter' | 'zoom';
export type VoiceGender = 'male' | 'female';
export type VoiceTone = 'warm' | 'professional' | 'excited';

export interface VideoSlide {
  slide_number: number;
  time_start: number;
  time_end: number;
  image_index: number;
  headline_text: string;
  sub_text?: string;
  text_animation: TextAnimation;
  text_position: 'top' | 'center' | 'bottom';
  overlay_opacity: number;
}

export interface VideoScript {
  slides: VideoSlide[];
  voiceover_script?: string;
  suggested_hashtags: string[];
  dhoom_score_prediction: number;
}

export interface VideoFormData {
  images: File[];
  imagePreviews: string[];
  productName: string;
  keyMessage: string;
  originalPrice: string;
  offerPrice: string;
  ctaText: string;
  format: VideoFormat;
  style: VideoStyle;
  musicTrack: MusicTrack;
  customMusicFile: File | null;
  customMusicPreview: string;
  textLanguage: TextLanguage;
  fontStyle: FontStyle;
  textAnimation: TextAnimation;
  voiceoverEnabled: boolean;
  voiceGender: VoiceGender;
  voiceTone: VoiceTone;
  customScript: string;
  useCustomScript: boolean;
}

export interface VideoResult {
  id: string;
  videoUrl: string;
  dhoomScore: number;
  productName: string;
  format: VideoFormat;
  style: VideoStyle;
  musicTrack: MusicTrack;
  script: VideoScript;
  createdAt: string;
}

export interface ProcessingStep {
  label: string;
  labelEn: string;
  status: 'waiting' | 'active' | 'done';
}

export const FORMAT_OPTIONS = [
  {
    value: 'feed' as VideoFormat,
    label: 'ফিড ভিডিও',
    labelEn: 'Feed Video',
    dimensions: '1080 × 1080 | 1:1',
    desc: 'Feed, Timeline এর জন্য',
    descEn: 'For Feed & Timeline',
    iconNames: ['facebook', 'instagram'] as const,
    ratio: 'aspect-square',
  },
  {
    value: 'reels' as VideoFormat,
    label: 'রিলস ও স্টোরিজ',
    labelEn: 'Reels & Stories',
    dimensions: '1080 × 1920 | 9:16',
    desc: 'সবচেয়ে বেশি ভিউ পায়',
    descEn: 'Gets the most views',
    iconNames: ['facebook', 'instagram', 'music'] as const,
    ratio: 'aspect-[9/16]',
    badge: 'জনপ্রিয়',
    badgeEn: 'Popular',
  },
  {
    value: 'story' as VideoFormat,
    label: 'ফেসবুক স্টোরি',
    labelEn: 'Facebook Story',
    dimensions: '1080 × 1920 | 9:16',
    desc: '24 ঘণ্টার জন্য',
    descEn: 'For 24 hours',
    iconNames: ['facebook'] as const,
    ratio: 'aspect-[9/16]',
  },
];

export const STYLE_OPTIONS = [
  {
    value: 'clean' as VideoStyle,
    label: 'ক্লিন প্রোডাক্ট',
    labelEn: 'Clean Product',
    desc: 'সাদা ব্যাকগ্রাউন্ড, পরিষ্কার লুক',
    descEn: 'White background, clean look',
    best: 'ফ্যাশন, ইলেকট্রনিক্স',
    bestEn: 'Fashion, Electronics',
    gradient: 'from-white to-gray-50',
  },
  {
    value: 'bold' as VideoStyle,
    label: 'বোল্ড অফার',
    labelEn: 'Bold Offer',
    desc: 'উজ্জ্বল রঙ, বড় দাম দেখানো',
    descEn: 'Bright colors, big price display',
    best: 'সেল, ডিসকাউন্ট',
    bestEn: 'Sales, Discounts',
    gradient: 'from-primary to-[#FFB800]',
  },
  {
    value: 'story' as VideoStyle,
    label: 'গল্পের মতো',
    labelEn: 'Story-like',
    desc: 'আবেগময়, গল্প বলার ধরনে',
    descEn: 'Emotional, narrative style',
    best: 'লাইফস্টাইল, গিফট',
    bestEn: 'Lifestyle, Gifts',
    gradient: 'from-orange-50 to-amber-50',
  },
  {
    value: 'luxury' as VideoStyle,
    label: 'লাক্সারি',
    labelEn: 'Luxury',
    desc: 'প্রিমিয়াম, উচ্চমানের অনুভূতি',
    descEn: 'Premium, high-end feel',
    best: 'জুয়েলারি, প্রিমিয়াম পণ্য',
    bestEn: 'Jewelry, Premium products',
    gradient: 'from-gray-900 to-gray-800',
  },
];

export const MUSIC_OPTIONS = [
  { value: 'energetic' as MusicTrack, iconName: 'music' as const, label: 'এনার্জেটিক বিট', labelEn: 'Energetic Beat', desc: 'দ্রুত, উত্তেজনাপূর্ণ — সেলের জন্য', descEn: 'Fast, exciting — for sales' },
  { value: 'soft' as MusicTrack, iconName: 'music-2' as const, label: 'নরম ব্যাকগ্রাউন্ড', labelEn: 'Soft Background', desc: 'শান্ত, পেশাদার — সব ধরনে কাজ করে', descEn: 'Calm, professional — works for all' },
  { value: 'trendy' as MusicTrack, iconName: 'drum' as const, label: 'ট্রেন্ডি পপ', labelEn: 'Trendy Pop', desc: 'আধুনিক, তরুণ দর্শকের জন্য', descEn: 'Modern, for young audience' },
  { value: 'corporate' as MusicTrack, iconName: 'guitar' as const, label: 'কর্পোরেট', labelEn: 'Corporate', desc: 'বিশ্বাসযোগ্য, ব্র্যান্ড বিল্ডিং', descEn: 'Trustworthy, brand building' },
  { value: 'custom' as MusicTrack, iconName: 'upload' as const, label: 'নিজের মিউজিক', labelEn: 'Custom Music', desc: 'নিজের অডিও ফাইল আপলোড করুন', descEn: 'Upload your own audio file' },
  { value: 'none' as MusicTrack, iconName: 'volume-x' as const, label: 'মিউজিক ছাড়া', labelEn: 'No Music', desc: 'শুধু ভয়েসওভার বা নীরব', descEn: 'Voiceover only or silent' },
];

export const CTA_PRESETS = [
  { bn: 'এখনই কিনুন', en: 'Buy Now' },
  { bn: 'আরো জানুন', en: 'Learn More' },
  { bn: 'মেসেজ করুন', en: 'Message Us' },
  { bn: 'অর্ডার করুন', en: 'Order Now' },
];

export const FUN_FACTS = [
  { bn: '📊 বাংলাদেশে ৯৩% ফেসবুক ব্যবহারকারী মোবাইলে দেখেন। তাই Reels ফরম্যাট সবচেয়ে কার্যকর।', en: '📊 93% of Facebook users in Bangladesh browse on mobile. That\'s why Reels format is most effective.' },
  { bn: '🎬 ভিডিও বিজ্ঞাপন ছবির চেয়ে ৩× বেশি এনগেজমেন্ট পায়।', en: '🎬 Video ads get 3× more engagement than image ads.' },
  { bn: '⏱️ প্রথম ৩ সেকেন্ডে মনোযোগ না পেলে দর্শক স্ক্রল করে। AI প্রথম ফ্রেমটি সবচেয়ে আকর্ষণীয় করে তোলে।', en: '⏱️ Viewers scroll past if not hooked in 3 seconds. AI makes the first frame most engaging.' },
  { bn: '🛒 ভিডিও বিজ্ঞাপনে CTR গড়ে ১.৮৫% — স্ট্যাটিক ইমেজের চেয়ে ২× বেশি।', en: '🛒 Video ads average 1.85% CTR — 2× more than static images.' },
];

export const DEFAULT_FORM: VideoFormData = {
  images: [],
  imagePreviews: [],
  productName: '',
  keyMessage: '',
  originalPrice: '',
  offerPrice: '',
  ctaText: '',
  format: 'reels',
  style: 'clean',
  musicTrack: 'soft',
  customMusicFile: null,
  customMusicPreview: '',
  textLanguage: 'bn',
  fontStyle: 'hind',
  textAnimation: 'slide',
  voiceoverEnabled: false,
  voiceGender: 'male',
  voiceTone: 'warm',
  customScript: '',
  useCustomScript: false,
};
