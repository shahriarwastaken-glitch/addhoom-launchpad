import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unauthorizedError, serverError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, liked_ids, disliked_ids, liked_tags, disliked_tags } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ success: false, message: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find dominant style from liked tags
    const tagCounts: Record<string, number> = {};
    (liked_tags || []).flat().forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    const dominant_style = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "clean";

    const style_preferences = {
      liked: [...new Set((liked_tags || []).flat())],
      disliked: [...new Set((disliked_tags || []).flat())],
      liked_template_ids: liked_ids || [],
      dominant_style,
    };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current workspace to recalculate DNA score
    const { data: ws } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    const { count: productCount } = await supabaseAdmin.from("workspace_products")
      .select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id).eq("is_active", true);

    const updatedWs = { ...ws, style_preferences };
    
    // Recalculate DNA score
    let score = 0;
    if (updatedWs.shop_name) score += 8;
    if (updatedWs.industry) score += 8;
    if (updatedWs.brand_tone) score += 8;
    if (updatedWs.target_audience) score += 8;
    if (updatedWs.unique_selling) score += 8;
    if (updatedWs.brand_colors?.length > 0) score += 7;
    if (updatedWs.brand_fonts?.heading) score += 6;
    if (updatedWs.brand_logo_url) score += 7;
    if ((productCount || 0) >= 1) score += 10;
    if ((productCount || 0) >= 3) score += 10;
    if ((productCount || 0) >= 5) score += 5;
    if (style_preferences.liked.length > 0) score += 10;
    score = Math.min(score, 100);

    await supabaseAdmin.from("workspaces").update({
      style_preferences,
      dna_score: score,
      dna_last_updated: new Date().toISOString(),
    }).eq("id", workspace_id);

    return new Response(
      JSON.stringify({ success: true, style_preferences, dna_score: score }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("save-style-preferences error:", error);
    return new Response(JSON.stringify(serverError("en")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
