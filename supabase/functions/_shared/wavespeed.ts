const WAVESPEED_BASE = 'https://api.wavespeed.ai';

const POLL_DELAYS = [2000, 3000, 5000, 8000, 12000, 18000, 25000, 35000];

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function getKey(): string {
  const key = Deno.env.get('WAVESPEED_API_KEY');
  if (!key) throw new Error('WAVESPEED_API_KEY not configured');
  return key;
}

/**
 * Create a WaveSpeed task and return the request ID.
 */
export async function wavespeedCreate(
  endpoint: string,
  body: object
): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE}/api/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`WaveSpeed start failed [${res.status}]: ${errBody}`);
  }

  const json = await res.json();
  if (json.error) throw new Error(`WaveSpeed error: ${json.error}`);
  const id = json?.data?.id;
  if (!id) throw new Error(`No request ID returned: ${JSON.stringify(json)}`);
  console.log('WaveSpeed task started:', id);
  return id;
}

/**
 * Poll a WaveSpeed task until completion.
 * Returns the full result data object.
 */
export async function wavespeedPoll(requestId: string): Promise<any> {
  for (const delay of POLL_DELAYS) {
    await sleep(delay);
    const res = await fetch(
      `${WAVESPEED_BASE}/api/v3/predictions/${requestId}/result`,
      { headers: { 'Authorization': `Bearer ${getKey()}` } }
    );

    if (!res.ok) {
      console.log(`WaveSpeed poll failed: ${res.status}`);
      continue;
    }

    const json = await res.json();
    if (json.error) throw new Error(`WaveSpeed error: ${json.error}`);
    const data = json?.data;
    if (!data) continue;

    if (data.status === 'completed') return data;
    if (data.status === 'failed') {
      throw new Error(`WaveSpeed failed: ${data.error || 'unknown'}`);
    }
    console.log(`WaveSpeed poll: status=${data.status}`);
  }
  throw new Error('WaveSpeed timed out');
}

/**
 * Generate an image via WaveSpeed Nano Banana Pro.
 * Returns the remote image URL.
 */
export async function wavespeedGenerateImage(opts: {
  prompt: string;
  sourceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    enable_base64_output: false,
    enable_sync_mode: false,
    enable_web_search: false,
    output_format: 'png',
    resolution: opts.resolution || '1k',
  };
  if (opts.sourceImageUrl) {
    body.image = opts.sourceImageUrl;
  }

  const requestId = await wavespeedCreate('google/nano-banana-2/text-to-image', body);
  const result = await wavespeedPoll(requestId);
  const imageUrl = result?.outputs?.[0];
  if (!imageUrl) throw new Error('No image URL in completed result');
  return imageUrl;
}

/**
 * Download a file from a URL and return as Uint8Array.
 */
export async function downloadFile(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
