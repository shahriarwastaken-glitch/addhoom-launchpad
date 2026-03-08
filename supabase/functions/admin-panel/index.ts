import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";

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
          { data: planBreakdown },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("workspaces").select("*", { count: "exact", head: true }),
          supabase.from("ad_creatives").select("*", { count: "exact", head: true }),
          supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "success"),
          supabase.from("payments").select("amount_bdt, plan_purchased, created_at, status").order("created_at", { ascending: false }).limit(10),
          supabase.rpc("get_plan_breakdown").catch(() => ({ data: null })),
        ]);

        // Manual plan breakdown if RPC doesn't exist
        const { data: allProfiles } = await supabase.from("profiles").select("plan");
        const plans: Record<string, number> = {};
        allProfiles?.forEach((p: any) => { plans[p.plan] = (plans[p.plan] || 0) + 1; });

        // Usage stats (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recentUsage } = await supabase
          .from("usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        // Revenue
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

        // Get roles for these users
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

        // Prevent removing own admin role
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

      default:
        return errorResponse(400, "অজানা অ্যাকশন।", "Unknown action.");
    }
  } catch (e) {
    console.error("admin-panel error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
