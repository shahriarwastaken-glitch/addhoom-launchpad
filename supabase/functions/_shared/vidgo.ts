const VIDGO_BASE = 'https://api.vidgo.ai/api';

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function getKey(): string {
  const key = Deno.env.get('VIDGO_API_KEY');
  if (!key) throw new Error('VIDGO_API_KEY not configured');
  return key;
}

/**
 * Submit a task to Vidgo.ai and return the task ID.
 */
export async function vidgoSubmit(
  model: string,
  input: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${VIDGO_BASE}/generate/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Vidgo submit failed [${res.status}]: ${errBody}`);
  }

  const json = await res.json();
  if (json.code !== 200 && json.error) throw new Error(`Vidgo error: ${json.error}`);
  const taskId = json?.data?.task_id;
  if (!taskId) throw new Error(`No task_id returned: ${JSON.stringify(json)}`);
  console.log('Vidgo task started:', taskId);
  return taskId;
}

/**
 * Poll a Vidgo task until completion.
 * Returns the output URL string.
 */
export async function vidgoPoll(taskId: string, maxAttempts = 20): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000);
    const res = await fetch(
      `${VIDGO_BASE}/task/status?task_id=${taskId}`,
      { headers: { 'Authorization': `Bearer ${getKey()}` } }
    );

    if (!res.ok) {
      console.log(`Vidgo poll failed: ${res.status}`);
      continue;
    }

    const json = await res.json();
    const data = json?.data;
    if (!data) continue;

    if (data.status === 'finished') {
      // Extract output URL from various possible response shapes
      const url = data.output?.url
        || data.output?.[0]?.url
        || data.output?.[0]
        || data.outputs?.[0];
      if (!url) throw new Error(`Vidgo finished but no output URL: ${JSON.stringify(data)}`);
      console.log('Vidgo task finished:', taskId);
      return url;
    }
    if (data.status === 'failed') {
      throw new Error(`Vidgo task failed: ${data.error || 'unknown'}`);
    }
    console.log(`Vidgo poll: status=${data.status}`);
  }
  throw new Error('Vidgo task timed out');
}

/**
 * Generate an image via Vidgo Nano Banana 2.
 * Returns the remote image URL.
 */
export async function vidgoGenerateImage(opts: {
  prompt: string;
  sourceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    size: opts.aspectRatio || '1:1',
    resolution: opts.resolution || '2K',
  };
  if (opts.sourceImageUrl) {
    input.image_url = opts.sourceImageUrl;
  }

  const taskId = await vidgoSubmit('nano-banana-2', input);
  return await vidgoPoll(taskId);
}

/**
 * Download a file from a URL and return as Uint8Array.
 */
export async function downloadFile(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
