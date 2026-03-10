import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini } from "../_shared/gemini.ts";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──

function extractMetaTag(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const alt = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
  return html.match(re)?.[1] || html.match(alt)?.[1] || null;
}

function extractColors(html: string): Array<{ hex: string; role: string; source: string }> {
  const colors: Map<string, string> = new Map();
  const cssVarMatch = html.match(/--(?:color-primary|brand-color|primary-color|primary|accent)\s*:\s*(#[0-9a-fA-F]{3,6})/gi);
  cssVarMatch?.forEach(m => { const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]; if (hex) colors.set(hex.toLowerCase(), "primary"); });
  const themeColor = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6})["']/i);
  if (themeColor?.[1]) colors.set(themeColor[1].toLowerCase(), "primary");
  const bgMatches = html.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6})/gi) || [];
  bgMatches.slice(0, 10).forEach(m => { const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]; if (hex && !colors.has(hex.toLowerCase())) colors.set(hex.toLowerCase(), "background"); });
  const textMatches = html.match(/(?:^|[;{])\s*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi) || [];
  textMatches.slice(0, 5).forEach(m => { const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0]; if (hex && !colors.has(hex.toLowerCase())) colors.set(hex.toLowerCase(), "text"); });
  return Array.from(colors.entries()).slice(0, 6).map(([hex, role]) => ({ hex, role, source: "extracted" }));
}

function extractFonts(html: string): { heading?: string; body?: string; source: string } {
  const fonts: { heading?: string; body?: string; source: string } = { source: "extracted" };
  const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"&]+)/i);
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|").map(f => f.split(":")[0].replace(/\+/g, " "));
    if (families[0]) fonts.heading = families[0];
    if (families[1]) fonts.body = families[1]; else if (families[0]) fonts.body = families[0];
  }
  if (!fonts.heading) { const h1Font = html.match(/h1[^{]*\{[^}]*font-family\s*:\s*["']?([^"';,}]+)/i); if (h1Font) fonts.heading = h1Font[1].trim(); }
  if (!fonts.body) { const bodyFont = html.match(/body[^{]*\{[^}]*font-family\s*:\s*["']?([^"';,}]+)/i); if (bodyFont) fonts.body = bodyFont[1].trim(); }
  return fonts;
}

function extractLogo(html: string, baseUrl: string): string | null {
  const logoImg = html.match(/<(?:header|nav)[^>]*>[\s\S]*?<img[^>]*(?:alt|class|id)=[^>]*logo[^>]*src=["']([^"']+)["']/i)
    || html.match(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt|class|id)=[^>]*logo/i);
  if (logoImg?.[1]) { const src = logoImg[1]; return src.startsWith("http") ? src : new URL(src, baseUrl).href; }
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage?.[1]) return ogImage[1];
  return null;
}

function extractProducts(html: string, baseUrl: string): Array<any> {
  const products: any[] = [];
  const productBlocks = html.match(/<div[^>]*(?:product|item)[^>]*>[\s\S]*?<\/div>/gi) || [];
  for (const block of productBlocks.slice(0, 10)) {
    const nameMatch = block.match(/<(?:h[1-6]|a|span)[^>]*>([^<]{3,80})<\//i);
    const priceMatch = block.match(/(?:৳|BDT|Tk\.?)\s*([0-9,]+)/i);
    const imgMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i);
    if (nameMatch) {
      const name = nameMatch[1].replace(/<[^>]*>/g, "").trim();
      if (name.length < 3 || name.length > 100) continue;
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : null;
      let imgUrl = imgMatch?.[1] || null;
      if (imgUrl && !imgUrl.startsWith("http")) { try { imgUrl = new URL(imgUrl, baseUrl).href; } catch { imgUrl = null; } }
      products.push({ name, price_bdt: price, primary_image_url: imgUrl, images: imgUrl ? [{ url: imgUrl, is_primary: true }] : [], source_url: baseUrl, tags: [] });
    }
  }
  const seen = new Set<string>();
  return products.filter(p => { const key = p.name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10);
}

function calculateDNAScore(workspace: any, products: any[]): number {
  let score = 0;
  if (workspace.shop_name) score += 8;
  if (workspace.industry) score += 8;
  if (workspace.brand_tone) score += 8;
  if (workspace.target_audience) score += 8;
  if (workspace.unique_selling) score += 8;
  if (workspace.brand_colors?.length > 0) score += 7;
  if (workspace.brand_fonts?.heading) score += 6;
  if (workspace.brand_logo_url) score += 7;
  if (products.length >= 1) score += 10;
  if (products.length >= 3) score += 10;
  if (products.length >= 5) score += 5;
  const withImages = products.filter((p: any) => p.primary_image_url).length;
  if (withImages > 0) score += 5;
  if (workspace.style_preferences?.liked?.length > 0) score += 10;
  return Math.min(score, 100);
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; AdDhoomBot/1.0)" } });
    clearTimeout(timeout);
    return await res.text();
  } catch { clearTimeout(timeout); return ""; }
}

// ── Platform-specific scrapers ──

async function scrapeFacebookPage(url: string) {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http")) normalizedUrl = `https://www.facebook.com/${normalizedUrl.replace(/^(facebook\.com\/|fb\.com\/)/, '')}`;
  const html = await fetchPage(normalizedUrl);
  return {
    shop_name: extractMetaTag(html, 'og:title'),
    description: extractMetaTag(html, 'og:description'),
    profile_image_url: extractMetaTag(html, 'og:image'),
    source_url: normalizedUrl,
    raw_text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000),
  };
}

async function scrapeDarazStore(url: string) {
  const html = await fetchPage(url);
  const products = extractProducts(html, url);
  return {
    raw_text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000),
    products,
    source_url: url,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { workspace_id, url: shopUrl, shop_url, platform = "website", payload } = body;
    const finalUrl = shopUrl || shop_url;

    if (!workspace_id) {
      return new Response(JSON.stringify({ success: false, code: 400, message: "workspace_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify workspace
    const { data: workspace } = await supabase.from("workspaces").select("id, owner_id").eq("id", workspace_id).single();
    if (!workspace || workspace.owner_id !== user.id) {
      return new Response(JSON.stringify(unauthorizedError("en")), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let dna: any = {};
    let brandColors: any[] = [];
    let brandFonts: any = { source: "extracted" };
    let brandLogoUrl: string | null = null;
    let extractedProducts: any[] = [];
    let extractionQuality = "full";
    let dnaSrc = platform;

    // ── PLATFORM ROUTING ──
    if (platform === "manual") {
      // Manual entry — use form data directly, enrich with Gemini
      const formData = payload?.form_data || {};
      extractionQuality = "manual";

      const enrichPrompt = `Given this manually entered shop information, enrich it and fill in any missing fields.
Input: ${JSON.stringify(formData)}
Return JSON with: shop_name, industry (one of: fashion|electronics|beauty|food|home_goods|health|sports|kids|other), brand_tone, target_audience, key_products, unique_selling, price_range (budget|mid_range|premium), niche_tags (array of 3-5 tags).
Return ONLY valid JSON.`;

      const aiResult = await callGemini(enrichPrompt, "You are a brand analyst. Enrich provided shop data. Return valid JSON only.", true);
      if (aiResult) {
        try { dna = JSON.parse(aiResult); } catch { const m = aiResult.match(/\{[\s\S]*\}/); if (m) try { dna = JSON.parse(m[0]); } catch {} }
      }
      // Merge: prefer user input over AI for fields user provided
      dna = {
        shop_name: formData.shop_name || dna.shop_name || "My Shop",
        industry: formData.industry || dna.industry || "other",
        brand_tone: formData.brand_tone || dna.brand_tone || "friendly",
        target_audience: formData.target_audience || dna.target_audience || "",
        key_products: formData.key_products || dna.key_products || "",
        unique_selling: dna.unique_selling || "",
        price_range: formData.price_range || dna.price_range || "mid_range",
        niche_tags: dna.niche_tags || [],
      };

    } else if (platform === "template") {
      // Template — use provided data directly, no Gemini
      const templateData = payload?.template_data || {};
      const industry = payload?.industry || "other";
      extractionQuality = "template";
      dna = {
        shop_name: "My Shop",
        industry,
        brand_tone: templateData.brand_tone || "friendly",
        target_audience: templateData.target_audience || "",
        key_products: templateData.key_products || "",
        unique_selling: templateData.unique_selling || "",
        price_range: templateData.price_range || "mid_range",
        niche_tags: templateData.niche_tags || [],
      };

    } else if (platform === "photos") {
      // Photo analysis with Gemini Vision
      extractionQuality = "partial";
      const images = payload?.images || [];
      if (images.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "No images provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Build multimodal prompt parts
      const imageParts = images.slice(0, 5).map((img: string) => `[Image data provided]`).join("\n");

      const photoPrompt = `Analyze these ${images.length} product photo(s) and extract brand information.

Look at:
1. What products are shown — name them specifically
2. Product category and industry
3. Quality/price positioning — budget, mid-range, or premium?
4. Visual style — colors, aesthetic, mood
5. Target audience — who would buy this?
6. Brand personality

Return JSON:
{
  "shop_name": "My Shop",
  "industry": "one of: fashion|electronics|beauty|food|home_goods|health|sports|kids|other",
  "brand_tone": "2-3 words",
  "target_audience": "1-2 sentences",
  "key_products": "comma separated",
  "unique_selling": "one sentence",
  "price_range": "budget|mid_range|premium",
  "niche_tags": ["tag1", "tag2", "tag3"],
  "products": [{"name": "...", "description": "..."}],
  "dominant_colors": ["#hex1", "#hex2"]
}
Return ONLY valid JSON.`;

      const aiResult = await callGemini(photoPrompt, "You are a product analyst. Analyze product photos and extract brand info. Return valid JSON only.", true);
      if (aiResult) {
        try { dna = JSON.parse(aiResult); } catch { const m = aiResult.match(/\{[\s\S]*\}/); if (m) try { dna = JSON.parse(m[0]); } catch {} }
      }

      // Extract products from analysis
      if (dna.products) {
        extractedProducts = dna.products.map((p: any, i: number) => ({
          name: p.name || `Product ${i + 1}`,
          description: p.description || null,
          price_bdt: null,
          primary_image_url: null,
          images: [],
          tags: [],
        }));
      }
      if (dna.dominant_colors) {
        brandColors = dna.dominant_colors.map((hex: string, i: number) => ({
          hex, role: i === 0 ? "primary" : i === 1 ? "secondary" : "accent", source: "photo_analysis"
        }));
      }

    } else if (platform === "facebook") {
      // Facebook page
      if (!finalUrl) return new Response(JSON.stringify({ success: false, message: "URL required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      extractionQuality = "partial";
      const fbData = await scrapeFacebookPage(finalUrl);

      const prompt = `Analyze this Facebook page data and extract brand information.
Page name: ${fbData.shop_name || "(unknown)"}
Description: ${fbData.description || "(none)"}
Page text content: ${fbData.raw_text?.substring(0, 2000) || "(none)"}

Return JSON with: shop_name, industry, brand_tone, target_audience, key_products, unique_selling, price_range, niche_tags.
Return ONLY valid JSON.`;

      const aiResult = await callGemini(prompt, "You are a brand analyst for Bangladeshi e-commerce. Return valid JSON.", true);
      if (aiResult) { try { dna = JSON.parse(aiResult); } catch { const m = aiResult.match(/\{[\s\S]*\}/); if (m) try { dna = JSON.parse(m[0]); } catch {} } }
      if (fbData.profile_image_url) brandLogoUrl = fbData.profile_image_url;

    } else if (platform === "daraz") {
      // Daraz store
      if (!finalUrl) return new Response(JSON.stringify({ success: false, message: "URL required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      extractionQuality = "partial";
      const darazData = await scrapeDarazStore(finalUrl);
      extractedProducts = darazData.products;

      const productNames = extractedProducts.map(p => p.name).join(", ");
      const prompt = `Analyze this Daraz store data and extract brand information.
Store URL: ${finalUrl}
Store text: ${darazData.raw_text?.substring(0, 2000) || "(none)"}
Products found: ${productNames || "(none)"}

Return JSON with: shop_name, industry, brand_tone, target_audience, key_products, unique_selling, price_range, niche_tags.
Return ONLY valid JSON.`;

      const aiResult = await callGemini(prompt, "You are a brand analyst for Bangladeshi e-commerce. Return valid JSON.", true);
      if (aiResult) { try { dna = JSON.parse(aiResult); } catch { const m = aiResult.match(/\{[\s\S]*\}/); if (m) try { dna = JSON.parse(m[0]); } catch {} } }

    } else {
      // Website (default) — existing full scrape logic
      if (!finalUrl) return new Response(JSON.stringify({ success: false, message: "URL required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      extractionQuality = "full";

      const homepageHtml = await fetchPage(finalUrl);
      let aboutHtml = "";
      let productPages: string[] = [];

      if (homepageHtml) {
        const aboutLink = homepageHtml.match(/<a[^>]*href=["']([^"']*(?:about|about-us|সম্পর্কে)[^"']*)["']/i);
        const shopLink = homepageHtml.match(/<a[^>]*href=["']([^"']*(?:products?|shop|collection|store)[^"']*)["']/i);
        const baseOrigin = new URL(finalUrl).origin;

        if (aboutLink?.[1]) {
          const aboutUrl = aboutLink[1].startsWith("http") ? aboutLink[1] : `${baseOrigin}${aboutLink[1].startsWith("/") ? "" : "/"}${aboutLink[1]}`;
          aboutHtml = await fetchPage(aboutUrl);
        }
        if (shopLink?.[1]) {
          const shopPageUrl = shopLink[1].startsWith("http") ? shopLink[1] : `${baseOrigin}${shopLink[1].startsWith("/") ? "" : "/"}${shopLink[1]}`;
          const shopHtml = await fetchPage(shopPageUrl);
          if (shopHtml) productPages.push(shopHtml);
        }
      }

      const allHtml = homepageHtml + aboutHtml + productPages.join("");
      brandColors = extractColors(homepageHtml);
      brandFonts = extractFonts(homepageHtml);
      brandLogoUrl = extractLogo(homepageHtml, finalUrl);
      extractedProducts = extractProducts(allHtml, finalUrl);

      const cleanedHomepage = homepageHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000);
      const cleanedAbout = aboutHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 1000);
      const productNames = extractedProducts.map(p => p.name).join(", ");

      const prompt = `Analyze this e-commerce shop from Bangladesh and extract brand information.
Homepage text: ${cleanedHomepage}
About page text: ${cleanedAbout || "(not available)"}
Product names found: ${productNames || "(none found)"}
Shop URL: ${finalUrl}

Return JSON with: shop_name, industry (fashion|electronics|beauty|food|home_goods|health|sports|kids|other), niche_tags (3-5 tags), brand_tone, target_audience, key_products, unique_selling, price_range (budget|mid_range|premium).
Return ONLY valid JSON.`;

      const aiResult = await callGemini(prompt, "You are a brand analyst for Bangladeshi e-commerce. Return valid JSON.", true);
      if (aiResult) { try { dna = JSON.parse(aiResult); } catch { const m = aiResult.match(/\{[\s\S]*\}/); if (m) try { dna = JSON.parse(m[0]); } catch {} } }
    }

    // Ensure defaults
    if (!Array.isArray(dna.niche_tags)) dna.niche_tags = dna.industry ? [dna.industry] : [];
    dna.shop_name = dna.shop_name || "My Shop";
    dna.industry = dna.industry || "other";
    dna.brand_tone = dna.brand_tone || "friendly";
    dna.price_range = dna.price_range || "mid_range";

    // ── Save workspace ──
    const workspaceUpdate: any = {
      shop_name: dna.shop_name,
      industry: dna.industry,
      brand_tone: dna.brand_tone,
      target_audience: dna.target_audience || "",
      key_products: dna.key_products || "",
      unique_selling: dna.unique_selling || "",
      price_range: dna.price_range,
      shop_url: finalUrl || null,
      brand_colors: brandColors,
      brand_fonts: brandFonts,
      brand_logo_url: brandLogoUrl,
      niche_tags: dna.niche_tags?.slice(0, 5) || [],
      dna_source: dnaSrc,
      extraction_quality: extractionQuality,
      scrape_data: {
        platform: dnaSrc,
        scraped_at: new Date().toISOString(),
        products_extracted: extractedProducts.length,
      },
      dna_last_updated: new Date().toISOString(),
    };

    workspaceUpdate.dna_score = calculateDNAScore(workspaceUpdate, extractedProducts);
    await supabaseAdmin.from("workspaces").update(workspaceUpdate).eq("id", workspace_id);

    // ── Save products ──
    if (extractedProducts.length > 0) {
      await supabaseAdmin.from("workspace_products").delete().eq("workspace_id", workspace_id);
      const productRows = extractedProducts.map((p: any, i: number) => ({
        workspace_id,
        name: p.name,
        description: p.description || null,
        price_bdt: p.price_bdt || null,
        primary_image_url: p.primary_image_url || null,
        images: p.images || [],
        source_url: p.source_url || finalUrl || null,
        tags: p.tags || [],
        display_order: i,
      }));
      await supabaseAdmin.from("workspace_products").insert(productRows);
    }

    // Mark onboarding complete
    await supabaseAdmin.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);

    const { data: savedProducts } = await supabaseAdmin.from("workspace_products").select("*").eq("workspace_id", workspace_id).order("display_order");

    return new Response(
      JSON.stringify({
        success: true,
        dna: { ...dna, niche_tags: dna.niche_tags?.slice(0, 5) || [] },
        brand_colors: brandColors,
        brand_fonts: brandFonts,
        brand_logo_url: brandLogoUrl,
        products: savedProducts || [],
        dna_score: workspaceUpdate.dna_score,
        extraction_quality: extractionQuality,
        message: "Shop DNA extracted successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("setup-shop-dna error:", error);
    return new Response(JSON.stringify(serverError("en")), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
