function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate an image via PiAPI Nano Banana Pro.
 * Returns the remote image URL from PiAPI CDN.
 */
export async function piapiGenerateImage(opts: {
  prompt: string;
  sourceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  const PIAPI_KEY = Deno.env.get('PIAPI_KEY');
  if (!PIAPI_KEY) throw new Error('PIAPI_KEY not configured');

  const taskType = opts.sourceImageUrl ? 'img2img' : 'txt2img';
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio || '1:1',
    resolution: opts.resolution || '1K',
  };
  if (opts.sourceImageUrl) {
    input.image_urls = [opts.sourceImageUrl];
  }

  const createRes = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'x-api-key': PIAPI_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      task_type: taskType,
      input,
      config: { webhook_config: { endpoint: '', secret: '' } },
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`PiAPI start failed [${createRes.status}]: ${errBody}`);
  }

  const createData = await createRes.json();
  const taskId = createData?.data?.task_id;
  if (!taskId) throw new Error(`No task_id returned: ${JSON.stringify(createData)}`);

  console.log('PiAPI image task started:', taskId);

  const delays = [2000, 3000, 5000, 8000, 12000, 18000, 25000];
  for (const delay of delays) {
    await sleep(delay);
    const statusRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
      headers: { 'x-api-key': PIAPI_KEY },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData?.data?.status;

    if (status === 'completed') {
      const imageUrl = statusData?.data?.output?.image_urls?.[0];
      if (!imageUrl) throw new Error('No image URL in completed result');
      return imageUrl;
    }
    if (status === 'failed') {
      throw new Error(`PiAPI generation failed: ${statusData?.data?.error || 'Unknown'}`);
    }
  }
  throw new Error('PiAPI image generation timed out');
}

/**
 * Download an image from a URL and return as Uint8Array.
 */
export async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
