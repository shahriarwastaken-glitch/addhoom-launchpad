// DEPRECATED: PiAPI has been replaced by WaveSpeed AI.
// This file re-exports from wavespeed.ts for backward compatibility.
// Any remaining callers should be updated to import from wavespeed.ts directly.

import { wavespeedGenerateImage, downloadFile } from './wavespeed.ts';

/**
 * @deprecated Use wavespeedGenerateImage from wavespeed.ts instead.
 */
export async function piapiGenerateImage(opts: {
  prompt: string;
  sourceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  return wavespeedGenerateImage({
    prompt: opts.prompt,
    sourceImageUrl: opts.sourceImageUrl,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution?.toLowerCase(),
  });
}

/**
 * @deprecated Use downloadFile from wavespeed.ts instead.
 */
export async function downloadImage(url: string): Promise<Uint8Array> {
  return downloadFile(url);
}
