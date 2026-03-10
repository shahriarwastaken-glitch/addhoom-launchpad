// Client-side prompt builder — mirrors supabase/functions/_shared/imagePrompt.ts
// This is used to pre-fill prompt textareas before sending to the API

import type { SceneKey } from './types';

const SCENE_VARIANTS: Record<SceneKey, {
  name: string;
  surface: string;
  environment: string;
  composition: string;
  style: string;
}> = {
  studio: {
    name: 'Studio',
    surface: 'marble counter with subtle grain texture',
    environment: 'minimalist professional studio, seamless white backdrop, clean empty space',
    composition: 'hero product composition, centered, commanding full attention',
    style: 'premium commercial studio photography, luxury brand campaign',
  },
  lifestyle: {
    name: 'Lifestyle',
    surface: 'natural wooden surface with soft texture',
    environment: 'modern lifestyle interior, warm ambient light, tasteful background details',
    composition: 'product lives naturally in environment, context and lifestyle equally important',
    style: 'aspirational lifestyle photography, Instagram editorial style',
  },
  luxury: {
    name: 'Luxury',
    surface: 'black reflective surface with subtle shadow',
    environment: 'dark premium environment, deep atmospheric background, dramatic depth',
    composition: 'dramatic hero shot, product commands attention with gravitas',
    style: 'high-end luxury advertisement, cinematic premium brand aesthetic',
  },
};

const LIGHTING: Record<string, string> = {
  soft: 'soft diffused studio lighting, gentle shadows, even illumination, softbox quality',
  dramatic: 'dramatic high-contrast lighting, deep shadows, strong directional cinematic light',
  natural: 'natural ambient lighting, warm sunlight feel, realistic soft shadows',
  bright: 'bright clean high-key lighting, minimal shadows, airy commercial feel',
  golden: 'warm golden hour light, rich amber glow, long soft shadows, magic hour photography',
};

const CAMERA: Record<string, string> = {
  front: '85mm product photography, straight-on front angle, symmetrical composition',
  three_quarter: '85mm product photography, 3/4 angle perspective, adds depth and dimension',
  overhead: '50mm overhead flat lay, bird\'s eye view, directly above',
  closeup: 'macro product shot, extreme close-up, texture and detail emphasized',
  cinematic: '50mm cinematic lens, slight low angle, dramatic perspective',
};

const PRODUCT_FIDELITY_BLOCK = `
PRODUCT FIDELITY — ABSOLUTE RULES:
MUST DO:
✓ Product appears EXACTLY ONCE
✓ Same orientation as reference image
✓ Same shape and proportions — no distortion
✓ Same colors — do not shift hues
✓ Same surface texture and finish
✓ Realistic drop shadow matching scene lighting
MUST NOT:
✗ Do not duplicate the product
✗ Do not stylize or reimagine the product
✗ Do not change product colors or shape
✗ Do not add text, watermarks, or labels
✗ Do not crop product at frame edge
✗ Do not make product float unnaturally`;

function buildStructuredPrompt(config: {
  productName: string;
  scene: typeof SCENE_VARIANTS[SceneKey];
  lightingMood: string;
  cameraAngle: string;
  additionalDetails?: string;
}): string {
  return `
${config.productName},
placed on ${config.scene.surface},
${config.scene.environment},
${config.scene.composition},
${LIGHTING[config.lightingMood] || LIGHTING.soft},
${CAMERA[config.cameraAngle] || CAMERA.front},
${config.scene.style},
${config.additionalDetails
    ? config.additionalDetails + ','
    : ''}
ultra realistic, sharp focus, 8K
${config.productName.toLowerCase()} product photography

${PRODUCT_FIDELITY_BLOCK}

NO TEXT: No words, labels, prices,
watermarks, or logos anywhere in the image.
`.replace(/\n{3,}/g, '\n\n').trim();
}

export function buildAdImagePrompts(config: {
  productName: string;
  lightingMood: string;
  cameraAngle: string;
  additionalDetails?: string;
  selectedScenes: SceneKey[];
}): Record<string, string> {
  const sceneConfigs: Record<SceneKey, { lightingMood: string; cameraAngle: string }> = {
    studio: {
      lightingMood: config.lightingMood || 'soft',
      cameraAngle: config.cameraAngle || 'front',
    },
    lifestyle: {
      lightingMood: config.lightingMood === 'dramatic' ? 'dramatic' : 'natural',
      cameraAngle: config.cameraAngle === 'overhead' ? 'overhead' : 'three_quarter',
    },
    luxury: {
      lightingMood: 'dramatic',
      cameraAngle: config.cameraAngle === 'closeup' ? 'closeup' : 'cinematic',
    },
  };

  const result: Record<string, string> = {};

  for (const sceneKey of config.selectedScenes) {
    result[sceneKey] = buildStructuredPrompt({
      productName: config.productName,
      scene: SCENE_VARIANTS[sceneKey],
      lightingMood: sceneConfigs[sceneKey].lightingMood,
      cameraAngle: sceneConfigs[sceneKey].cameraAngle,
      additionalDetails: config.additionalDetails,
    });
  }

  return result;
}
