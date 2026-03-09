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

    const body = await req.json();
    const { action, workspace_id, product_id, product, product_ids, active_only } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify workspace ownership
    if (workspace_id) {
      const { data: ws } = await supabase.from("workspaces").select("id").eq("id", workspace_id).single();
      if (!ws) {
        return new Response(
          JSON.stringify({ success: false, message: "Workspace not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    switch (action) {
      case "list": {
        let query = supabase.from("workspace_products").select("*").eq("workspace_id", workspace_id).order("display_order");
        if (active_only !== false) query = query.eq("is_active", true);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, products: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "add": {
        const { data, error } = await supabase.from("workspace_products").insert({
          workspace_id,
          ...product,
        }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, product: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const { data, error } = await supabase.from("workspace_products")
          .update(product).eq("id", product_id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, product: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        // Check if product has been used in ads
        const { count } = await supabaseAdmin.from("ad_creatives")
          .select("id", { count: "exact", head: true })
          .eq("product_name", product_id);
        
        if (count && count > 0) {
          // Soft delete
          await supabase.from("workspace_products").update({ is_active: false }).eq("id", product_id);
        } else {
          await supabase.from("workspace_products").delete().eq("id", product_id);
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reorder": {
        if (Array.isArray(product_ids)) {
          for (let i = 0; i < product_ids.length; i++) {
            await supabase.from("workspace_products")
              .update({ display_order: i }).eq("id", product_ids[i]);
          }
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("workspace-products error:", error);
    return new Response(JSON.stringify(serverError("en")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
