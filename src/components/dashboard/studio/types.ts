export type StudioTab = 'tryon' | 'product-photo' | 'upscaler';

export type GarmentCategory = 'Top' | 'Bottom' | 'Full Body / Dress' | 'Outerwear' | 'Footwear';

export type Gender = 'all' | 'female' | 'male';
export type BodyType = 'all' | 'slim' | 'average' | 'plus';
export type SkinTone = 'all' | 'light' | 'medium' | 'dark';
export type PoseType = 'all' | 'standing' | 'walking' | 'sitting';

export interface PresetModel {
  id: string;
  gender: 'female' | 'male';
  body: 'slim' | 'average' | 'plus';
  skin: 'light' | 'medium' | 'dark';
  pose: 'standing' | 'walking' | 'sitting';
  image_url: string;
}

export type SceneType = 'onWhite' | 'studio' | 'lifestyle' | 'flatlay' | 'outdoor';

export interface SceneConfig {
  // Studio
  backdrop?: string;
  lightingDirection?: 'left' | 'right' | 'top';
  // Lifestyle
  surface?: string;
  mood?: 'warm' | 'cool' | 'neutral';
  // Flat Lay
  propsDensity?: 'minimal' | 'moderate' | 'rich';
  // Outdoor
  timeOfDay?: 'morning' | 'golden' | 'overcast';
  environment?: 'garden' | 'urban' | 'beach' | 'forest';
  // On White
  shadow?: 'soft' | 'none';
}

export type ImageFormat = '1:1' | '4:5' | '9:16' | '16:9';
export type ExportFormat = 'png' | 'jpg';
export type UpscaleScale = 2 | 4 | 6 | 8;
export type EnhancementMode = 'standard' | 'sharp_details' | 'smooth_skin';
