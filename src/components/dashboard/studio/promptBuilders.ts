// Pure TypeScript template builders — zero API cost

export function buildProductPhotoPrompt(config: {
  productName?: string;
  scene: string;
  sceneConfig: Record<string, string>;
  format: string;
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

  return `Professional product photography of ${name}. ${sceneDesc}. Product appears exactly once, full product visible, same colors and proportions as reference image. No text, watermarks, or labels. 8K resolution, perfect exposure, professional color grading.`;
}

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

export function buildAdImagePrompt(config: {
  productName: string;
  style: string;
  brandColors: string[];
  format: string;
}): string {
  const styleDescriptions: Record<string, string> = {
    clean: `professional studio photography setup, seamless paper backdrop, softbox lighting from upper left, subtle rim light from right, clean empty surface, soft drop shadow`,
    lifestyle: `realistic lifestyle environment, warm natural light, complementary props that enhance the product story, shallow depth of field, soft bokeh background`,
    creative: `smooth bold color gradient background, subtle grain texture overlay, modern editorial advertising aesthetic, clean minimal environment`,
    sale: `vibrant sale campaign aesthetic, bold contrasting colors, dynamic composition, high energy, attention-grabbing commercial photography`,
  };

  const styleDesc = styleDescriptions[config.style] || styleDescriptions.clean;
  const colorNote = config.brandColors.length > 0
    ? `Brand accent colors to incorporate: ${config.brandColors.join(', ')}.`
    : '';

  return `Product advertisement photography of ${config.productName}. ${styleDesc}. The product is centered and perfectly lit, appearing exactly once with natural shadows. ${colorNote} No text, watermarks, or labels anywhere. Ultra sharp, 8K quality, perfect exposure, professional color grading, luxury brand campaign quality.`;
}
