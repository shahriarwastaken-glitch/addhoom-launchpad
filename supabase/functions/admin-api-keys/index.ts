import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAdmin, verifySuperAdmin } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service definitions
const SERVICES = [
  {
    service_name: 'gemini',
    display_name: 'Google Gemini API',
    description: 'Ad copy, Dhoom Score, prompt enhancement, AI chat, Shop DNA extraction, Account Doctor (gemini-3.1-flash-lite-preview)',
    docs_url: 'https://aistudio.google.com/apikey',
    icon: '🤖',
    is_critical: true,
  },
  {
    service_name: 'piapi',
    display_name: 'PiAPI (Nano Banana Pro + Kling 3.0)',
    description: 'Image generation (Nano Banana Pro), AI Motion Video (Kling 3.0), Image upscaling',
    docs_url: 'https://piapi.ai/docs',
    icon: '🎨',
    is_critical: true,
  },
  {
    service_name: 'fashn',
    display_name: 'Fashn.ai',
    description: 'Virtual Try-On, background removal for apparel',
    docs_url: 'https://docs.fashn.ai',
    icon: '👗',
    is_critical: true,
  },
  {
    service_name: 'sslcommerz',
    display_name: 'SSLCommerz Payment Gateway',
    description: 'bKash, Nagad, Rocket, Card payments',
    docs_url: 'https://developer.sslcommerz.com',
    icon: '💳',
    is_critical: true,
  },
  {
    service_name: 'shotstack',
    display_name: 'Shotstack Video API',
    description: 'Slideshow video ad rendering',
    docs_url: 'https://shotstack.io/docs',
    icon: '🎬',
    is_critical: false,
  },
  {
    service_name: 'meta_ad_library',
    display_name: 'Meta Ad Library API',
    description: 'Competitor ad intelligence',
    docs_url: 'https://www.facebook.com/ads/library/api',
    icon: '🔍',
    is_critical: false,
  },
  {
    service_name: 'resend',
    display_name: 'Resend Email API',
    description: 'Transactional emails and notifications',
    docs_url: 'https://resend.com/docs',
    icon: '📧',
    is_critical: false,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    // Verify admin for all actions
    const admin = await verifyAdmin(req, supabase);

    switch (action) {
      case 'get_api_keys':
        return await getApiKeys(supabase);

      case 'get_services':
        return jsonResponse({ services: SERVICES });

      case 'add_api_key':
        await verifySuperAdmin(req, supabase);
        return await addApiKey(supabase, params, admin.id);

      case 'test_api_key':
        return await testApiKey(supabase, params, admin.id);

      case 'test_all_keys':
        return await testAllKeys(supabase, admin.id);

      case 'rotate_api_key':
        await verifySuperAdmin(req, supabase);
        return await rotateApiKey(supabase, params, admin.id);

      case 'update_api_key_status':
        return await updateApiKeyStatus(supabase, params, admin.id);

      case 'update_api_key':
        await verifySuperAdmin(req, supabase);
        return await updateApiKey(supabase, params, admin.id);

      case 'delete_api_key':
        await verifySuperAdmin(req, supabase);
        return await deleteApiKey(supabase, params, admin.id);

      case 'get_key_logs':
        return await getKeyLogs(supabase, params);

      case 'get_usage_stats':
        return await getUsageStats(supabase, params);

      case 'seed_services':
        return await seedServices(supabase, admin.id);

      default:
        throw { code: 400, message_en: 'Invalid action' };
    }
  } catch (error: any) {
    console.error('Admin API Keys Error:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message_bn: error.message_bn || 'কিছু সমস্যা হয়েছে।',
        message_en: error.message_en || error.message || 'Something went wrong.',
      }),
      { status: error.code || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getApiKeys(supabase: any) {
  // Get all keys (never return key_value)
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, service_name, display_name, key_preview, environment, status, last_tested_at, last_test_result, last_test_error, expires_at, monthly_limit, monthly_usage, notes, description, docs_url, icon, is_critical, created_at, updated_at, rotated_at')
    .order('is_critical', { ascending: false })
    .order('service_name');

  if (error) throw error;

  // Auto-create placeholder rows for services missing from the table
  const existingServices = new Set((keys || []).map((k: any) => k.service_name));
  const missingServices = SERVICES.filter(s => !existingServices.has(s.service_name));

  // Check env secrets for missing services to mark them as active
  const SECRET_MAP: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    piapi: 'PIAPI_KEY',
    fashn: 'FASHN_API_KEY',
    sslcommerz: 'SSLCOMMERZ_STORE_ID',
    resend: 'RESEND_API_KEY',
    meta_ad_library: 'META_ACCESS_TOKEN',
    shotstack: 'SHOTSTACK_API_KEY',
  };

  if (missingServices.length > 0) {
    const inserts = missingServices.map(s => {
      const envKey = SECRET_MAP[s.service_name];
      const secretValue = envKey ? Deno.env.get(envKey) : null;
      const hasSecret = !!secretValue && secretValue !== '';
      return {
        service_name: s.service_name,
        display_name: s.display_name,
        key_value: secretValue || 'PLACEHOLDER',
        key_preview: hasSecret ? '...' + secretValue!.slice(-4) : '...NONE',
        description: s.description,
        docs_url: s.docs_url,
        icon: s.icon,
        is_critical: s.is_critical,
        status: hasSecret ? 'active' : 'inactive',
      };
    });
    await supabase.from('api_keys').insert(inserts);

    // Re-fetch to include newly inserted rows
    const { data: allKeys, error: err2 } = await supabase
      .from('api_keys')
      .select('id, service_name, display_name, key_preview, environment, status, last_tested_at, last_test_result, last_test_error, expires_at, monthly_limit, monthly_usage, notes, description, docs_url, icon, is_critical, created_at, updated_at, rotated_at')
      .order('is_critical', { ascending: false })
      .order('service_name');
    if (!err2 && allKeys) {
      return getApiKeysWithUsage(supabase, allKeys);
    }
  }

  return getApiKeysWithUsage(supabase, keys || []);
}

async function getApiKeysWithUsage(supabase: any, keys: any[]) {
  // Get last 7 days usage for each service
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: usageData } = await supabase
    .from('api_usage_stats')
    .select('*')
    .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('stat_date');

  // Group usage by service
  const usageByService: Record<string, any[]> = {};
  (usageData || []).forEach((stat: any) => {
    if (!usageByService[stat.service_name]) {
      usageByService[stat.service_name] = [];
    }
    usageByService[stat.service_name].push(stat);
  });

  // Attach usage to each key
  const keysWithUsage = keys.map((key: any) => ({
    ...key,
    usage_last_7_days: usageByService[key.service_name] || [],
    total_calls_this_month: calculateMonthlyTotal(usageByService[key.service_name] || []),
  }));

  return jsonResponse({ keys: keysWithUsage, services: SERVICES });
}

function calculateMonthlyTotal(usageData: any[]): number {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return usageData
    .filter((s) => new Date(s.stat_date) >= firstOfMonth)
    .reduce((sum, s) => sum + (s.calls_made || 0), 0);
}

async function addApiKey(supabase: any, params: any, adminId: string) {
  const { service_name, key_value, environment = 'production', expires_at, monthly_limit, notes } = params;

  // Validate service_name
  const service = SERVICES.find((s) => s.service_name === service_name);
  if (!service) {
    throw { code: 400, message_en: 'Invalid service name', message_bn: 'অবৈধ সার্ভিস নাম।' };
  }

  // Generate key_preview
  const key_preview = '...' + key_value.slice(-4);

  // Check if key already exists for this service + environment
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id')
    .eq('service_name', service_name)
    .eq('environment', environment)
    .single();

  if (existing) {
    throw { code: 400, message_en: 'Key already exists for this service', message_bn: 'এই সার্ভিসের জন্য কী আগে থেকে আছে।' };
  }

  // Insert key
  const { data: newKey, error } = await supabase
    .from('api_keys')
    .insert({
      service_name,
      display_name: service.display_name,
      key_value,
      key_preview,
      environment,
      expires_at,
      monthly_limit,
      notes,
      description: service.description,
      docs_url: service.docs_url,
      icon: service.icon,
      is_critical: service.is_critical,
      created_by: adminId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  // Log the action
  await logAction(supabase, newKey.id, service_name, 'created', adminId, 'success', `Key added for ${service.display_name}`);

  // Test the new key
  const testResult = await performKeyTest(supabase, newKey.id, service_name, key_value, adminId);

  return jsonResponse({
    success: true,
    key_id: newKey.id,
    test_result: testResult,
    message_bn: 'API কী যোগ হয়েছে!',
  });
}

async function testApiKey(supabase: any, params: any, adminId: string) {
  const { key_id } = params;

  // Fetch key including key_value (server-side only)
  const { data: key, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', key_id)
    .single();

  if (error || !key) {
    throw { code: 404, message_en: 'Key not found', message_bn: 'কী পাওয়া যায়নি।' };
  }

  const result = await performKeyTest(supabase, key.id, key.service_name, key.key_value, adminId);

  return jsonResponse(result);
}

async function performKeyTest(supabase: any, keyId: string, serviceName: string, keyValue: string, adminId: string) {
  const startTime = Date.now();
  let testResult = 'unknown';
  let testError: string | null = null;
  let status = 'active';

  try {
    switch (serviceName) {
      case 'gemini':
        await testGeminiKey(keyValue);
        testResult = 'success';
        break;

      case 'piapi':
        await testPiapiKey(keyValue);
        testResult = 'success';
        break;

      case 'resend':
        await testResendKey(keyValue);
        testResult = 'success';
        break;

      case 'shotstack':
        await testShotstackKey(keyValue);
        testResult = 'success';
        break;

      case 'meta_ad_library':
        await testMetaKey(keyValue);
        testResult = 'success';
        break;

      case 'sslcommerz':
        // SSLCommerz uses store_id and password, just mark as active for now
        testResult = 'success';
        break;

      default:
        testResult = 'unknown';
    }
  } catch (e: any) {
    testResult = 'failed';
    testError = e.message || 'Test failed';
    status = 'error';
  }

  const responseTime = Date.now() - startTime;

  // Update key with test results
  await supabase
    .from('api_keys')
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_result: testResult,
      last_test_error: testError,
      status: testResult === 'success' ? 'active' : 'error',
    })
    .eq('id', keyId);

  // Log the test
  await logAction(supabase, keyId, serviceName, 'tested', adminId, testResult, testError);

  // Track usage
  await trackUsage(supabase, serviceName, 1, testResult === 'failed' ? 1 : 0, responseTime);

  return {
    success: testResult === 'success',
    test_result: testResult,
    response_time_ms: responseTime,
    error: testError,
    message_bn: testResult === 'success' ? 'পরীক্ষা সফল!' : 'পরীক্ষা ব্যর্থ!',
  };
}

async function testGeminiKey(apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say exactly: OK' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limited - key valid but over quota');
    }
    throw new Error(data.error?.message || 'Gemini test failed');
  }
}

async function testPiapiKey(apiKey: string) {
  const response = await fetch('https://api.piapi.ai/api/v1/user/profile', {
    headers: { 'x-api-key': apiKey },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key');
    }
    throw new Error('PiAPI test failed');
  }
}

async function testResendKey(apiKey: string) {
  const response = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    throw new Error('Resend test failed');
  }
}

async function testShotstackKey(apiKey: string) {
  const response = await fetch('https://api.shotstack.io/edit/stage/render', {
    headers: { 'x-api-key': apiKey },
  });

  if (response.status === 401) {
    throw new Error('Invalid API key');
  }
  // 200 or empty list is valid
}

async function testMetaKey(accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/ads_archive?access_token=${accessToken}&ad_reached_countries=BD&search_terms=test&limit=1`
  );

  if (!response.ok) {
    const data = await response.json();
    if (data.error?.code === 190) {
      throw new Error('Invalid access token');
    }
    throw new Error(data.error?.message || 'Meta test failed');
  }
}

async function testAllKeys(supabase: any, adminId: string) {
  const { data: keys } = await supabase.from('api_keys').select('id, service_name, key_value');

  const results: Record<string, any> = {};

  await Promise.all(
    (keys || []).map(async (key: any) => {
      const result = await performKeyTest(supabase, key.id, key.service_name, key.key_value, adminId);
      results[key.service_name] = result;
    })
  );

  const passed = Object.values(results).filter((r: any) => r.test_result === 'success').length;
  const total = Object.keys(results).length;

  return jsonResponse({
    results,
    summary: { passed, total },
    message_bn: `${passed}/${total} কী সফলভাবে কাজ করছে`,
  });
}

async function rotateApiKey(supabase: any, params: any, adminId: string) {
  const { key_id, new_key_value, notes } = params;

  // Fetch existing key
  const { data: key, error } = await supabase.from('api_keys').select('*').eq('id', key_id).single();

  if (error || !key) {
    throw { code: 404, message_en: 'Key not found', message_bn: 'কী পাওয়া যায়নি।' };
  }

  const oldPreview = key.key_preview;
  const newPreview = '...' + new_key_value.slice(-4);

  // Update key
  await supabase
    .from('api_keys')
    .update({
      key_value: new_key_value,
      key_preview: newPreview,
      rotated_at: new Date().toISOString(),
      status: 'active',
      last_test_result: 'unknown',
    })
    .eq('id', key_id);

  // Log rotation
  await logAction(
    supabase,
    key_id,
    key.service_name,
    'rotated',
    adminId,
    'success',
    `Rotated from ${oldPreview} to ${newPreview}. Reason: ${notes}`,
    oldPreview,
    newPreview
  );

  // Test new key
  const testResult = await performKeyTest(supabase, key_id, key.service_name, new_key_value, adminId);

  return jsonResponse({
    success: true,
    test_result: testResult,
    rotated_at: new Date().toISOString(),
    message_bn: testResult.success ? 'নতুন কী সফলভাবে রোটেট হয়েছে!' : 'নতুন কী কাজ করছে না!',
  });
}

async function updateApiKeyStatus(supabase: any, params: any, adminId: string) {
  const { key_id, status } = params;

  const { data: key } = await supabase.from('api_keys').select('service_name').eq('id', key_id).single();

  await supabase.from('api_keys').update({ status }).eq('id', key_id);

  await logAction(supabase, key_id, key?.service_name || '', status === 'active' ? 'activated' : 'deactivated', adminId, 'success');

  return jsonResponse({
    success: true,
    message_bn: status === 'active' ? 'কী সক্রিয় করা হয়েছে!' : 'কী নিষ্ক্রিয় করা হয়েছে!',
  });
}

async function updateApiKey(supabase: any, params: any, adminId: string) {
  const { key_id, key_value, expires_at, monthly_limit, notes } = params;

  const updates: any = { expires_at, monthly_limit, notes };

  if (key_value) {
    updates.key_value = key_value;
    updates.key_preview = '...' + key_value.slice(-4);
  }

  const { data: key } = await supabase.from('api_keys').select('service_name').eq('id', key_id).single();

  await supabase.from('api_keys').update(updates).eq('id', key_id);

  await logAction(supabase, key_id, key?.service_name || '', 'updated', adminId, 'success', notes);

  return jsonResponse({ success: true, message_bn: 'API কী আপডেট হয়েছে!' });
}

async function deleteApiKey(supabase: any, params: any, adminId: string) {
  const { key_id } = params;

  const { data: key } = await supabase.from('api_keys').select('service_name, display_name').eq('id', key_id).single();

  await logAction(supabase, key_id, key?.service_name || '', 'deleted', adminId, 'success', `Deleted ${key?.display_name}`);

  await supabase.from('api_keys').delete().eq('id', key_id);

  return jsonResponse({ success: true, message_bn: 'API কী মুছে ফেলা হয়েছে!' });
}

async function getKeyLogs(supabase: any, params: any) {
  const { key_id, limit = 50 } = params;

  let query = supabase
    .from('api_key_logs')
    .select('*, admin:performed_by(email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (key_id) {
    query = query.eq('api_key_id', key_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return jsonResponse({ logs: data || [] });
}

async function getUsageStats(supabase: any, params: any) {
  const { service_name, days = 30 } = params;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from('api_usage_stats')
    .select('*')
    .gte('stat_date', startDate.toISOString().split('T')[0])
    .order('stat_date');

  if (service_name) {
    query = query.eq('service_name', service_name);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Calculate totals
  const totals: Record<string, { calls: number; failed: number; tokens: number; cost: number }> = {};

  (data || []).forEach((stat: any) => {
    if (!totals[stat.service_name]) {
      totals[stat.service_name] = { calls: 0, failed: 0, tokens: 0, cost: 0 };
    }
    totals[stat.service_name].calls += stat.calls_made || 0;
    totals[stat.service_name].failed += stat.calls_failed || 0;
    totals[stat.service_name].tokens += stat.total_tokens_used || 0;
    totals[stat.service_name].cost += parseFloat(stat.estimated_cost_bdt) || 0;
  });

  return jsonResponse({ stats: data || [], totals });
}

async function seedServices(supabase: any, adminId: string) {
  // Check if any keys exist
  const { data: existing } = await supabase.from('api_keys').select('id').limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse({ seeded: false, message: 'Keys already exist' });
  }

  // Seed empty shells for each service
  const inserts = SERVICES.map((s) => ({
    service_name: s.service_name,
    display_name: s.display_name,
    key_value: 'PLACEHOLDER',
    key_preview: '...NONE',
    description: s.description,
    docs_url: s.docs_url,
    icon: s.icon,
    is_critical: s.is_critical,
    status: 'inactive',
    created_by: adminId,
  }));

  await supabase.from('api_keys').insert(inserts);

  return jsonResponse({ seeded: true, message_bn: 'সার্ভিস সীড করা হয়েছে!' });
}

async function logAction(
  supabase: any,
  keyId: string | null,
  serviceName: string,
  action: string,
  adminId: string,
  result: string,
  notes?: string,
  oldPreview?: string,
  newPreview?: string
) {
  await supabase.from('api_key_logs').insert({
    api_key_id: keyId,
    service_name: serviceName,
    action,
    performed_by: adminId,
    result,
    notes,
    old_preview: oldPreview,
    new_preview: newPreview,
  });
}

async function trackUsage(supabase: any, serviceName: string, calls: number, failed: number, responseMs: number) {
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('upsert_api_usage_stats', {
    p_service_name: serviceName,
    p_stat_date: today,
    p_calls_made: calls,
    p_calls_failed: failed,
    p_response_ms: responseMs,
  });
}
