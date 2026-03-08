import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(code: number, bn: string, en: string) {
  return new Response(JSON.stringify({ error: true, code, message_bn: bn, message_en: en }), {
    status: code,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    // Check admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) return errorResponse(403, "অ্যাডমিন অ্যাক্সেস নেই।", "Admin access denied.");

    const { action, ...params } = await req.json();

    switch (action) {
      case "get_stats": {
        const [
          { count: totalUsers },
          { count: totalWorkspaces },
          { count: totalAds },
          { count: totalPayments },
          { data: recentPayments },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("workspaces").select("*", { count: "exact", head: true }),
          supabase.from("ad_creatives").select("*", { count: "exact", head: true }),
          supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "success"),
          supabase.from("payments").select("amount_bdt, plan_purchased, created_at, status").order("created_at", { ascending: false }).limit(10),
        ]);

        const { data: allProfiles } = await supabase.from("profiles").select("plan");
        const plans: Record<string, number> = {};
        allProfiles?.forEach((p: any) => { plans[p.plan] = (plans[p.plan] || 0) + 1; });

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recentUsage } = await supabase
          .from("usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        const { data: successPayments } = await supabase
          .from("payments")
          .select("amount_bdt")
          .eq("status", "success");
        const totalRevenue = successPayments?.reduce((sum: number, p: any) => sum + (p.amount_bdt || 0), 0) || 0;

        return jsonResponse({
          total_users: totalUsers || 0,
          total_workspaces: totalWorkspaces || 0,
          total_ads: totalAds || 0,
          total_payments: totalPayments || 0,
          total_revenue_bdt: totalRevenue,
          recent_usage_7d: recentUsage || 0,
          plan_breakdown: plans,
          recent_payments: recentPayments || [],
        });
      }

      case "list_users": {
        const page = params.page || 1;
        const perPage = 20;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const { data: profiles, count } = await supabase
          .from("profiles")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        const userIds = profiles?.map((p: any) => p.id) || [];
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const usersWithRoles = profiles?.map((p: any) => ({
          ...p,
          roles: roles?.filter((r: any) => r.user_id === p.id).map((r: any) => r.role) || [],
        }));

        return jsonResponse({ users: usersWithRoles, total: count, page, per_page: perPage });
      }

      case "add_role": {
        const { target_user_id, role } = params;
        if (!target_user_id || !role) return errorResponse(400, "ইউজার ও রোল প্রয়োজন।", "User and role required.");
        if (!["admin", "moderator", "user"].includes(role)) return errorResponse(400, "অবৈধ রোল।", "Invalid role.");

        const { error } = await supabase.from("user_roles").insert({
          user_id: target_user_id,
          role,
          granted_by: user.id,
        });

        if (error) {
          if (error.code === "23505") return errorResponse(409, "এই রোল আগে থেকেই আছে।", "Role already exists.");
          return errorResponse(500, "রোল যোগ ব্যর্থ।", "Failed to add role.");
        }
        return jsonResponse({ success: true });
      }

      case "remove_role": {
        const { target_user_id: removeUserId, role: removeRole } = params;
        if (!removeUserId || !removeRole) return errorResponse(400, "ইউজার ও রোল প্রয়োজন।", "User and role required.");

        if (removeUserId === user.id && removeRole === "admin") {
          return errorResponse(400, "নিজের অ্যাডমিন রোল মুছতে পারবেন না।", "Cannot remove your own admin role.");
        }

        await supabase.from("user_roles").delete()
          .eq("user_id", removeUserId)
          .eq("role", removeRole);

        return jsonResponse({ success: true });
      }

      case "update_user_plan": {
        const { target_user_id: planUserId, plan, subscription_status } = params;
        if (!planUserId || !plan) return errorResponse(400, "ইউজার ও প্ল্যান প্রয়োজন।", "User and plan required.");

        const updateData: any = { plan };
        if (subscription_status) updateData.subscription_status = subscription_status;
        if (plan !== "free") {
          updateData.subscription_status = "active";
          updateData.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase.from("profiles").update(updateData).eq("id", planUserId);
        return jsonResponse({ success: true });
      }

      // ===== API Keys Management =====
      case "list_api_keys": {
        const { data: keys, error } = await supabase
          .from("api_keys")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) return errorResponse(500, "API কী লোড ব্যর্থ।", "Failed to load API keys.");
        // Never return key_value to frontend
        const safeKeys = (keys || []).map((k: any) => ({ ...k, key_value: undefined }));
        return jsonResponse({ keys: safeKeys });
      }

      case "add_api_key": {
        const { service_name: svcName, key_value: kv, description: desc2, display_name: dn } = params;
        if (!svcName || !kv) return errorResponse(400, "Service name ও key value আবশ্যক।", "Service name and key value required.");

        const keyPreview = "..." + kv.slice(-4);
        const { data: newKey, error } = await supabase
          .from("api_keys")
          .insert({
            service_name: svcName,
            display_name: dn || svcName,
            key_value: kv,
            key_preview: keyPreview,
            description: desc2 || null,
            created_by: user.id,
            status: "active",
          })
          .select()
          .single();

        if (error) {
          console.error("add_api_key error:", error);
          return errorResponse(500, "API কী যোগ ব্যর্থ।", "Failed to add API key.");
        }
        return jsonResponse({ success: true, key: { ...newKey, key_value: undefined } });
      }

      case "update_api_key": {
        const { key_id, key_value: updVal, description: updDesc, status: updStatus } = params;
        if (!key_id) return errorResponse(400, "Key ID আবশ্যক।", "Key ID required.");

        const updateData: any = { updated_at: new Date().toISOString() };
        if (updVal !== undefined) {
          updateData.key_value = updVal;
          updateData.key_preview = "..." + updVal.slice(-4);
        }
        if (updDesc !== undefined) updateData.description = updDesc;
        if (updStatus !== undefined) updateData.status = updStatus;

        const { error } = await supabase.from("api_keys").update(updateData).eq("id", key_id);
        if (error) return errorResponse(500, "API কী আপডেট ব্যর্থ।", "Failed to update API key.");
        return jsonResponse({ success: true });
      }

      case "delete_api_key": {
        const { key_id: deleteKeyId } = params;
        if (!deleteKeyId) return errorResponse(400, "Key ID আবশ্যক।", "Key ID required.");
        const { error } = await supabase.from("api_keys").delete().eq("id", deleteKeyId);
        if (error) return errorResponse(500, "API কী ডিলিট ব্যর্থ।", "Failed to delete API key.");
        return jsonResponse({ success: true });
      }

      // ===== System Prompt Management =====
      case "get_system_prompt": {
        const { data } = await supabase
          .from("api_keys")
          .select("key_value, updated_at")
          .eq("service_name", "system_prompt")
          .eq("status", "active")
          .maybeSingle();

        return jsonResponse({ 
          prompt: data?.key_value || null,
          updated_at: data?.updated_at || null,
          using_default: !data?.key_value
        });
      }

      case "update_system_prompt": {
        const { prompt } = params;
        if (!prompt || typeof prompt !== "string") {
          return errorResponse(400, "প্রম্পট আবশ্যক।", "Prompt is required.");
        }

        const { data: existing } = await supabase
          .from("api_keys")
          .select("id")
          .eq("service_name", "system_prompt")
          .maybeSingle();

        if (existing) {
          await supabase
            .from("api_keys")
            .update({ key_value: prompt, status: "active", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("api_keys")
            .insert({
              service_name: "system_prompt",
              display_name: "AI System Prompt",
              key_value: prompt,
              key_preview: "...prompt",
              description: "AI System Prompt",
              created_by: user.id,
              status: "active",
            });
        }

        return jsonResponse({ success: true });
      }

      case "reset_system_prompt": {
        await supabase
          .from("api_keys")
          .update({ status: "inactive" })
          .eq("service_name", "system_prompt");

        return jsonResponse({ success: true });
      }

      // ===== Image Generation Prompt Management =====
      case "get_image_prompt": {
        const { data } = await supabase
          .from("api_keys")
          .select("key_value, updated_at")
          .eq("service_name", "image_prompt")
          .eq("status", "active")
          .maybeSingle();

        return jsonResponse({ 
          prompt: data?.key_value || null,
          updated_at: data?.updated_at || null,
          using_default: !data?.key_value
        });
      }

      case "update_image_prompt": {
        const { prompt: imgPrompt } = params;
        if (!imgPrompt || typeof imgPrompt !== "string") {
          return errorResponse(400, "প্রম্পট আবশ্যক।", "Prompt is required.");
        }

        const { data: existingImg } = await supabase
          .from("api_keys")
          .select("id")
          .eq("service_name", "image_prompt")
          .maybeSingle();

        if (existingImg) {
          await supabase
            .from("api_keys")
            .update({ key_value: imgPrompt, status: "active", updated_at: new Date().toISOString() })
            .eq("id", existingImg.id);
        } else {
          await supabase
            .from("api_keys")
            .insert({
              service_name: "image_prompt",
              display_name: "Image Generation Master Prompt",
              key_value: imgPrompt,
              key_preview: "...prompt",
              description: "Master prompt for AI image generation",
              created_by: user.id,
              status: "active",
            });
        }

        return jsonResponse({ success: true });
      }

      case "reset_image_prompt": {
        await supabase
          .from("api_keys")
          .update({ status: "inactive" })
          .eq("service_name", "image_prompt");

        return jsonResponse({ success: true });
      }

      default:
        return errorResponse(400, "অজানা অ্যাকশন।", "Unknown action.");
    }
  } catch (e) {
    console.error("admin-panel error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
