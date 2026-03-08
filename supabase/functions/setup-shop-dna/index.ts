import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini } from "../_shared/gemini.ts";
import { ADDHOOM_SYSTEM_PROMPT } from "../_shared/systemPrompt.ts";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const err = unauthorizedError("bn");
      return new Response(JSON.stringify(err), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const err = unauthorizedError("bn");
      return new Response(JSON.stringify(err), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, shop_url } = await req.json();

    if (!workspace_id || !shop_url) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "workspace_id এবং shop_url আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace belongs to user
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspace_id)
      .single();

    if (!workspace) {
      return new Response(
        JSON.stringify({ success: false, code: 404, message: "Workspace পাওয়া যায়নি" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (workspace.owner_id !== user.id) {
      const err = unauthorizedError("bn");
      return new Response(JSON.stringify(err), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 2 — Fetch URL content
    let cleanedText = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const pageRes = await fetch(shop_url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AdDhoomBot/1.0)",
        },
      });
      clearTimeout(timeout);

      const html = await pageRes.text();
      cleanedText = html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 3000);
    } catch (fetchErr) {
      console.error("URL fetch failed:", fetchErr);
      cleanedText = "(URL could not be loaded — analyze based on URL pattern only)";
    }

    // STEP 3 — Call Gemini
    const prompt = `Analyze this e-commerce shop content from Bangladesh and extract brand information.
Shop URL: ${shop_url}
Page content: ${cleanedText}

Return ONLY a valid JSON object with these exact fields:
{
  "shop_name": "extracted or inferred shop name",
  "industry": "one of: fashion | electronics | beauty | food | home_goods | health | sports | kids | other",
  "brand_tone": "one of: friendly | professional | urgent | humorous",
  "target_audience": "1-2 sentence description of who buys from this shop",
  "key_products": "top 3-5 product types this shop sells, comma separated",
  "unique_selling": "one sentence — what makes this shop different from competitors",
  "price_range": "one of: budget | mid_range | premium"
}

If you cannot extract specific information from the content, make a reasonable inference based on the URL and available context. Always return all fields.`;

    const aiResult = await callGemini(prompt, ADDHOOM_SYSTEM_PROMPT, true);

    if (!aiResult) {
      const err = serverError("bn");
      return new Response(JSON.stringify(err), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 4 — Parse JSON
    let dna: any;
    try {
      dna = JSON.parse(aiResult);
    } catch {
      // Try to extract JSON from string
      const match = aiResult.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          dna = JSON.parse(match[0]);
        } catch {
          const err = serverError("bn");
          return new Response(JSON.stringify(err), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const err = serverError("bn");
        return new Response(JSON.stringify(err), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Save to workspace using service role for column access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("workspaces")
      .update({
        shop_name: dna.shop_name || "My Shop",
        industry: dna.industry || "other",
        brand_tone: dna.brand_tone || "friendly",
        target_audience: dna.target_audience || "",
        key_products: dna.key_products || "",
        unique_selling: dna.unique_selling || "",
        price_range: dna.price_range || "mid_range",
        shop_url: shop_url,
      })
      .eq("id", workspace_id);

    // STEP 5 — Mark onboarding complete
    await supabaseAdmin
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    // STEP 6 — Return success
    return new Response(
      JSON.stringify({
        success: true,
        dna,
        message: "শপের তথ্য সফলভাবে সংরক্ষিত হয়েছে",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("setup-shop-dna error:", error);
    const err = serverError("bn");
    return new Response(JSON.stringify(err), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
