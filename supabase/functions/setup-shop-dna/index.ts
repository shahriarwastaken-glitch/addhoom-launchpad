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

function extractColors(html: string): Array<{ hex: string; role: string; source: string }> {
  const colors: Map<string, string> = new Map();
  
  // CSS custom properties
  const cssVarMatch = html.match(/--(?:color-primary|brand-color|primary-color|primary|accent)\s*:\s*(#[0-9a-fA-F]{3,6})/gi);
  cssVarMatch?.forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0];
    if (hex) colors.set(hex.toLowerCase(), "primary");
  });

  // Meta theme-color
  const themeColor = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6})["']/i);
  if (themeColor?.[1]) colors.set(themeColor[1].toLowerCase(), "primary");

  // Background colors from inline styles
  const bgMatches = html.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6})/gi) || [];
  bgMatches.slice(0, 10).forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0];
    if (hex && !colors.has(hex.toLowerCase())) colors.set(hex.toLowerCase(), "background");
  });

  // Text colors
  const textMatches = html.match(/(?:^|[;{])\s*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi) || [];
  textMatches.slice(0, 5).forEach(m => {
    const hex = m.match(/#[0-9a-fA-F]{3,6}/)?.[0];
    if (hex && !colors.has(hex.toLowerCase())) colors.set(hex.toLowerCase(), "text");
  });

  return Array.from(colors.entries()).slice(0, 6).map(([hex, role]) => ({ hex, role, source: "extracted" }));
}

function extractFonts(html: string): { heading?: string; body?: string; source: string } {
  const fonts: { heading?: string; body?: string; source: string } = { source: "extracted" };
  
  // Google Fonts link
  const gfMatch = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"&]+)/i);
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|").map(f => f.split(":")[0].replace(/\+/g, " "));
    if (families[0]) fonts.heading = families[0];
    if (families[1]) fonts.body = families[1];
    else if (families[0]) fonts.body = families[0];
  }

  // font-family in CSS
  if (!fonts.heading) {
    const h1Font = html.match(/h1[^{]*\{[^}]*font-family\s*:\s*["']?([^"';,}]+)/i);
    if (h1Font) fonts.heading = h1Font[1].trim();
  }
  if (!fonts.body) {
    const bodyFont = html.match(/body[^{]*\{[^}]*font-family\s*:\s*["']?([^"';,}]+)/i);
    if (bodyFont) fonts.body = bodyFont[1].trim();
  }

  return fonts;
}

function extractLogo(html: string, baseUrl: string): string | null {
  // img in header/nav with "logo" in alt or class
  const logoImg = html.match(/<(?:header|nav)[^>]*>[\s\S]*?<img[^>]*(?:alt|class|id)=[^>]*logo[^>]*src=["']([^"']+)["']/i)
    || html.match(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt|class|id)=[^>]*logo/i);
  if (logoImg?.[1]) {
    const src = logoImg[1];
    return src.startsWith("http") ? src : new URL(src, baseUrl).href;
  }

  // og:image fallback
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage?.[1]) return ogImage[1];

  return null;
}

function extractProducts(html: string, baseUrl: string): Array<any> {
  const products: any[] = [];
  
  // Look for product cards with common patterns
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
      if (imgUrl && !imgUrl.startsWith("http")) {
        try { imgUrl = new URL(imgUrl, baseUrl).href; } catch { imgUrl = null; }
      }

      products.push({
        name,
        price_bdt: price,
        primary_image_url: imgUrl,
        images: imgUrl ? [{ url: imgUrl, is_primary: true }] : [],
        source_url: baseUrl,
        tags: [],
      });
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return products.filter(p => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function parsePriceBDT(text: string): number | null {
  const match = text.match(/(?:৳|BDT|Tk\.?)\s*([0-9,]+)/i);
  if (match) return parseInt(match[1].replace(/,/g, ""));
  return null;
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

// ── Fetch page ──
async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AdDhoomBot/1.0)" },
    });
    clearTimeout(timeout);
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { workspace_id, url: shopUrl, shop_url, platform = "website" } = body;
    const finalUrl = shopUrl || shop_url;

    if (!workspace_id || !finalUrl) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "workspace_id and url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace
    const { data: workspace } = await supabase
      .from("workspaces").select("id, owner_id").eq("id", workspace_id).single();
    if (!workspace || workspace.owner_id !== user.id) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: Multi-page scrape ──
    console.log("Scraping:", finalUrl, "platform:", platform);
    const homepageHtml = await fetchPage(finalUrl);

    // Try to find additional pages
    let aboutHtml = "";
    let productPages: string[] = [];

    if (homepageHtml && platform === "website") {
      // Extract nav links for about and products/shop pages
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

    // ── STEP 2: Visual extraction ──
    const allHtml = homepageHtml + aboutHtml + productPages.join("");
    const brandColors = extractColors(homepageHtml);
    const brandFonts = extractFonts(homepageHtml);
    const brandLogoUrl = extractLogo(homepageHtml, finalUrl);
    const extractedProducts = extractProducts(allHtml, finalUrl);

    const cleanedHomepage = homepageHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000);
    const cleanedAbout = aboutHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 1000);
    const productNames = extractedProducts.map(p => p.name).join(", ");

    // ── STEP 3: Gemini enrichment ──
    const prompt = `Analyze this e-commerce shop from Bangladesh and extract brand information.

SCRAPED CONTENT:
Homepage text: ${cleanedHomepage}
About page text: ${cleanedAbout || "(not available)"}
Product names found: ${productNames || "(none found)"}
Shop URL: ${finalUrl}

EXTRACT AND RETURN ONLY valid JSON:
{
  "shop_name": "The brand name (not URL)",
  "industry": "one of: fashion | electronics | beauty | food | home_goods | health | sports | kids | other",
  "niche_tags": ["3-5 specific niche tags in English, e.g. health supplements, organic products"],
  "brand_tone": "2-3 words: friendly, professional, urgent, humorous, modern, trustworthy",
  "target_audience": "1-2 sentence description of who buys from this shop",
  "key_products": "top 3-5 product types, comma separated",
  "unique_selling": "one sentence — what makes this shop different",
  "price_range": "budget | mid_range | premium"
}

Return ONLY valid JSON. No explanation.`;

    const systemPrompt = "You are a brand analyst specializing in Bangladeshi e-commerce. Extract structured brand information from scraped content. Always return valid JSON.";
    const aiResult = await callGemini(prompt, systemPrompt, true);

    let dna: any = {};
    if (aiResult) {
      try {
        dna = JSON.parse(aiResult);
      } catch {
        const match = aiResult.match(/\{[\s\S]*\}/);
        if (match) try { dna = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    // Ensure niche_tags is an array
    if (!Array.isArray(dna.niche_tags)) {
      dna.niche_tags = dna.industry ? [dna.industry] : [];
    }

    // ── STEP 4: Save workspace ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const workspaceUpdate: any = {
      shop_name: dna.shop_name || "My Shop",
      industry: dna.industry || "other",
      brand_tone: dna.brand_tone || "friendly",
      target_audience: dna.target_audience || "",
      key_products: dna.key_products || "",
      unique_selling: dna.unique_selling || "",
      price_range: dna.price_range || "mid_range",
      shop_url: finalUrl,
      brand_colors: brandColors,
      brand_fonts: brandFonts,
      brand_logo_url: brandLogoUrl,
      niche_tags: dna.niche_tags?.slice(0, 5) || [],
      scrape_data: {
        homepage_length: homepageHtml.length,
        about_found: !!aboutHtml,
        products_extracted: extractedProducts.length,
        platform,
        scraped_at: new Date().toISOString(),
      },
      dna_last_updated: new Date().toISOString(),
    };

    // Calculate initial DNA score (without style preferences)
    workspaceUpdate.dna_score = calculateDNAScore(workspaceUpdate, extractedProducts);

    await supabaseAdmin.from("workspaces").update(workspaceUpdate).eq("id", workspace_id);

    // ── STEP 5: Save products ──
    // Delete existing products before inserting new ones
    await supabaseAdmin.from("workspace_products").delete().eq("workspace_id", workspace_id);

    if (extractedProducts.length > 0) {
      const productRows = extractedProducts.map((p: any, i: number) => ({
        workspace_id,
        name: p.name,
        description: p.description || null,
        price_bdt: p.price_bdt,
        primary_image_url: p.primary_image_url,
        images: p.images || [],
        source_url: p.source_url || finalUrl,
        tags: p.tags || [],
        display_order: i,
      }));

      await supabaseAdmin.from("workspace_products").insert(productRows);
    }

    // Mark onboarding complete
    await supabaseAdmin.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);

    // Fetch saved products
    const { data: savedProducts } = await supabaseAdmin
      .from("workspace_products")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("display_order");

    return new Response(
      JSON.stringify({
        success: true,
        dna: { ...dna, niche_tags: dna.niche_tags?.slice(0, 5) || [] },
        brand_colors: brandColors,
        brand_fonts: brandFonts,
        brand_logo_url: brandLogoUrl,
        products: savedProducts || [],
        dna_score: workspaceUpdate.dna_score,
        message: "Shop DNA extracted successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("setup-shop-dna error:", error);
    return new Response(JSON.stringify(serverError("en")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
