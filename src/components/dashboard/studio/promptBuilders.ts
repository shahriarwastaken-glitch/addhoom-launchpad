// Pure TypeScript template builders — zero API cost

import type { LightingMood, ColorMood, CameraAngle, BackgroundComplexity, TimeOfDay, ProductFocus } from '@/components/dashboard/ad-generator/types';

// ── Shared prompt maps for the 6 visual controls ──

const LIGHTING: Record<LightingMood, string> = {
  soft: 'soft diffused lighting, gentle shadows, even illumination, studio softbox quality',
  dramatic: 'dramatic high-contrast lighting, deep shadows, strong directional light, cinematic chiaroscuro effect',
  natural: 'natural ambient lighting, soft outdoor light, warm sunlight feel, realistic shadows',
  bright: 'bright clean lighting, high key, minimal shadows, airy and light feel, commercial photography brightness',
};

const COLOR: Record<ColorMood, string> = {
  warm: 'warm color grading, golden amber tones, rich earthy palette, cozy inviting atmosphere',
  cool: 'cool color grading, blue and grey tones, clean crisp palette, modern minimalist feel',
  neutral: 'neutral color grading, balanced tones, true-to-life colors, clean professional palette',
  bold: 'bold vibrant color grading, saturated tones, high impact palette, energetic visual punch',
};

const ANGLE: Record<CameraAngle, string> = {
  front: 'straight-on front facing angle, product fully visible, symmetrical composition',
  three_quarter: '3/4 angle perspective, slight diagonal view, adds depth and dimension to the product',
  overhead: 'overhead flat lay perspective, bird\'s eye view, product shot from directly above',
  closeup: 'close-up detail shot, tight crop on product, texture and detail emphasized, macro photography feel',
};

const BACKGROUND: Record<BackgroundComplexity, string> = {
  minimal: 'minimal clean background, almost empty, product is the sole focus, negative space dominant',
  moderate: 'moderately styled background, a few complementary elements, balanced composition between product and environment',
  rich: 'richly detailed background, full environmental context, props and scene elements tell a story around the product',
};

const TIME: Record<TimeOfDay, string> = {
  morning: 'fresh morning light, soft directional sunlight, cool crisp atmosphere, gentle long shadows',
  golden: 'warm golden hour light, rich amber glow, long soft shadows, magic hour photography',
  midday: 'bright midday light, strong even illumination, clean sharp shadows, high noon energy',
  night: 'night atmosphere, artificial warm lighting, dramatic shadows, moody ambient light, urban or studio night feel',
};

const FOCUS: Record<ProductFocus, string> = {
  hero: 'product is the undisputed hero of the frame, large and centered, commands full attention, everything else supports the product',
  environmental: 'product lives naturally in its environment, context and lifestyle story equally important, product integrated into the scene',
  detail: 'detail and texture focused composition, product craftsmanship emphasized, close attention to material and finish quality',
};

// ── Ad Image prompt ──

export function buildAdImagePrompt(config: {
  productName: string;
  style: string;
  brandColors: string[];
  format: string;
  lightingMood?: LightingMood;
  colorMood?: ColorMood;
  cameraAngle?: CameraAngle;
  backgroundComplexity?: BackgroundComplexity;
  timeOfDay?: TimeOfDay;
  productFocus?: ProductFocus;
}): string {
  const styleDescriptions: Record<string, string> = {
    clean: 'professional studio photography setup, seamless paper backdrop, clean empty surface, soft drop shadow',
    lifestyle: 'realistic lifestyle environment, complementary props that enhance the product story, shallow depth of field, soft bokeh background',
    creative: 'smooth bold color gradient background, subtle grain texture overlay, modern editorial advertising aesthetic, clean minimal environment',
    sale: 'vibrant sale campaign aesthetic, bold contrasting colors, dynamic composition, high energy, attention-grabbing commercial photography',
  };

  const name = config.productName || 'the product';
  const styleDesc = styleDescriptions[config.style] || styleDescriptions.clean;
  const colorNote = config.brandColors.length > 0
    ? `Incorporate brand colors subtly: ${config.brandColors.join(', ')}.`
    : '';

  const lighting = config.lightingMood ? `LIGHTING: ${LIGHTING[config.lightingMood]}.` : '';
  const color = config.colorMood ? `COLOR: ${COLOR[config.colorMood]}.` : '';
  const angle = config.cameraAngle ? `COMPOSITION: ${ANGLE[config.cameraAngle]}.` : '';
  const bg = config.backgroundComplexity ? `BACKGROUND: ${BACKGROUND[config.backgroundComplexity]}.` : '';
  const time = config.timeOfDay ? `TIME: ${TIME[config.timeOfDay]}.` : '';
  const focus = config.productFocus ? `PRODUCT ROLE: ${FOCUS[config.productFocus]}.` : '';

  return `Product advertisement photography of ${name}. ${styleDesc}. ${angle} ${focus} ${bg} ${lighting} ${time} ${color} ${colorNote} RULES: Product appears exactly once, same orientation, colors, proportions as reference image. No text, watermarks, or labels. Full product visible, not cropped. QUALITY: 8K, perfect exposure, professional color grading, luxury brand campaign quality.`.replace(/\s{2,}/g, ' ').trim();
}

// ── Product Photo prompt ──

export function buildProductPhotoPrompt(config: {
  productName?: string;
  scene: string;
  sceneConfig: Record<string, string>;
  format: string;
  lightingMood?: LightingMood;
  colorMood?: ColorMood;
  cameraAngle?: CameraAngle;
  backgroundComplexity?: BackgroundComplexity;
  timeOfDay?: TimeOfDay;
  productFocus?: ProductFocus;
}): string {
  const sceneDescriptions: Record<string, string> = {
    onWhite: `pure white seamless background, product perfectly centered, soft overhead lighting with fill light, subtle soft drop shadow beneath product, clean clinical marketplace-ready presentation`,
    studio: `professional studio photography, ${config.sceneConfig.backdrop || 'light grey'} seamless backdrop, softbox lighting from ${config.sceneConfig.lightingDirection || 'left'}, subtle rim light opposite side, clean surface with realistic shadow`,
    lifestyle: `realistic lifestyle environment, ${config.sceneConfig.surface || 'marble'} surface, ${config.sceneConfig.mood || 'warm'} lighting mood, complementary props enhancing the product, shallow depth of field, soft bokeh`,
    flatlay: `overhead flat lay photography, ${config.sceneConfig.surface || 'marble'} surface, ${config.sceneConfig.propsDensity === 'rich' ? 'richly styled with many complementary props' : config.sceneConfig.propsDensity === 'moderate' ? 'a few carefully chosen props' : 'minimal clean styling, almost no props'}, even diffused lighting, no harsh shadows`,
    outdoor: `${config.sceneConfig.environment || 'garden'} outdoor environment, ${config.sceneConfig.timeOfDay === 'golden' ? 'warm golden hour light, long soft shadows' : config.sceneConfig.timeOfDay === 'morning' ? 'fresh morning light, soft and directional' : 'soft overcast daylight, even diffused'}, aspirational lifestyle photography`,
  };

  const name = config.productName || 'the product';
  const sceneDesc = sceneDescriptions[config.scene] || sceneDescriptions.onWhite;

  const lighting = config.lightingMood ? `LIGHTING: ${LIGHTING[config.lightingMood]}.` : '';
  const color = config.colorMood ? `COLOR: ${COLOR[config.colorMood]}.` : '';
  const angle = config.cameraAngle ? `COMPOSITION: ${ANGLE[config.cameraAngle]}.` : '';
  const bg = config.backgroundComplexity ? `BACKGROUND: ${BACKGROUND[config.backgroundComplexity]}.` : '';
  const time = config.timeOfDay ? `TIME: ${TIME[config.timeOfDay]}.` : '';
  const focus = config.productFocus ? `PRODUCT ROLE: ${FOCUS[config.productFocus]}.` : '';

  return `Professional product photography of ${name}. ${sceneDesc}. ${angle} ${focus} ${bg} ${lighting} ${time} ${color} Product appears exactly once, full product visible, same colors and proportions as reference image. No text, watermarks, or labels. 8K resolution, perfect exposure, professional color grading.`.replace(/\s{2,}/g, ' ').trim();
}

// ── Motion Video prompt ──

export function buildMotionPrompt(config: {
  motionStyle: string;
  productName: string;
  productCategory: string;
  inputMode: 'single' | 'multiple';
  aspectRatio: string;
}): string {
  const stylePrompts: Record<string, string> = {
    cinematic_reveal: 'Slow cinematic push-in movement. Camera starts wide and gradually moves forward toward the product. Dramatic depth reveal, shallow depth of field, product emerges from soft bokeh background. Luxury brand campaign feel.',
    float_rotate: 'Product gently floats in space with a smooth 360-degree rotation. Soft studio lighting follows the product as it turns. Clean background, product is hero. Smooth seamless loop motion.',
    zoom_pan: 'Dynamic camera movement starting wide then zooming into product details. Slow pan across key product features, highlighting texture and craftsmanship. Sharp focus throughout, editorial feel.',
    lifestyle_motion: 'Camera glides through a lifestyle environment where the product lives. Natural ambient motion, soft wind, light shift, environmental depth. Product integrated naturally in scene. Warm aspirational atmosphere.',
    energy_burst: 'High energy dynamic motion. Fast camera movement with momentum. Light streaks and particle effects. Bold, kinetic, attention-grabbing. Made for scroll-stopping social ads.',
    subtle_breathe: 'Almost imperceptible motion. Soft light breathing effect, subtle depth shift, gentle glow pulse. Premium stillness with life. Luxury, calm, sophisticated feel.',
  };

  const modeNote = config.inputMode === 'multiple'
    ? 'Smooth cinematic transitions between each image. Each image holds for approximately 1-1.5 seconds. Seamless flow throughout.'
    : 'Single continuous motion on one image. Full 5 seconds of smooth movement.';

  const name = config.productName || 'the product';
  const cat = config.productCategory ? ` (${config.productCategory})` : '';
  const motion = stylePrompts[config.motionStyle] || stylePrompts.cinematic_reveal;

  return `5-second product advertisement video for ${name}${cat}.\n\nMOTION: ${motion}\n\nSTRUCTURE: ${modeNote}\n\nFORMAT: ${config.aspectRatio} aspect ratio.\n\nQUALITY RULES:\n- Product must remain clearly visible throughout the entire video\n- No text or watermarks in the video\n- Smooth motion, no jarring cuts\n- Professional commercial quality\n- Colors true to the product`;
}

// ── Try-On prompt ──

export function buildTryOnPrompt(config: {
  gender: string;
  body: string;
  skin: string;
  pose: string;
  age?: string;
  style?: string;
  background: string;
}): string {
  const poseMap: Record<string, string> = {
    standing: 'standing naturally, facing forward, relaxed confident posture',
    walking: 'walking naturally, slight movement, one foot forward',
    sitting: 'sitting relaxed, full body visible, natural casual pose',
    dynamic: 'dynamic confident pose, fashion-forward, editorial energy',
  };
  const bodyMap: Record<string, string> = {
    slim: 'slim athletic build',
    average: 'average healthy build',
    plus: 'plus size curvy build',
  };
  const skinMap: Record<string, string> = {
    fair: 'fair porcelain complexion',
    light: 'light skin tone',
    medium: 'medium brown skin tone',
    tan: 'tan olive skin tone',
    dark: 'deep dark skin tone',
  };
  const bgMap: Record<string, string> = {
    studio_white: 'clean white studio background',
    studio_grey: 'neutral grey studio background',
    lifestyle: 'lifestyle environment background',
    transparent: 'clean background',
  };

  const parts = [
    `${config.gender} fashion model`,
    bodyMap[config.body] || 'average healthy build',
    skinMap[config.skin] || 'medium brown skin tone',
  ];
  if (config.age) parts.push(`approximately ${config.age} years old`);
  parts.push(poseMap[config.pose] || 'standing naturally');
  if (config.style) parts.push(`${config.style} fashion photography style`);
  parts.push(bgMap[config.background] || 'clean studio background');
  parts.push('professional fashion photography, full body shot, well lit');

  return parts.join(', ');
}
