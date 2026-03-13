// DEPRECATED: PiAPI → WaveSpeed → Vidgo.ai migration chain.
// This file re-exports from vidgo.ts for backward compatibility.

import { vidgoGenerateImage, downloadFile } from './vidgo.ts';

/**
 * @deprecated Use vidgoGenerateImage from vidgo.ts instead.
 */
export async function piapiGenerateImage(opts: {
  prompt: string;
  sourceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  return vidgoGenerateImage({
    prompt: opts.prompt,
    sourceImageUrl: opts.sourceImageUrl,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution,
  });
}

/**
 * @deprecated Use downloadFile from vidgo.ts instead.
 */
export async function downloadImage(url: string): Promise<Uint8Array> {
  return downloadFile(url);
}
