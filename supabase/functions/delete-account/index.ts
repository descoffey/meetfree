import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const id = user.id;

    // Find matches involving this user, to clean up their messages first
    const { data: userMatches } = await supabaseAdmin.from("matches").select("id").or(`user1.eq.${id},user2.eq.${id}`);
    const matchIds = (userMatches || []).map(m => m.id);

    if (matchIds.length > 0) {
      await supabaseAdmin.from("messages").delete().in("match_id", matchIds);
    }
    await supabaseAdmin.from("messages").delete().eq("sender_id", id);
    await supabaseAdmin.from("pending_messages").delete().or(`from_user.eq.${id},to_user.eq.${id}`);
    await supabaseAdmin.from("contact_requests").delete().or(`from_user.eq.${id},to_user.eq.${id}`);
    await supabaseAdmin.from("matches").delete().or(`user1.eq.${id},user2.eq.${id}`);
    await supabaseAdmin.from("likes").delete().or(`from_user.eq.${id},to_user.eq.${id}`);
    await supabaseAdmin.from("super_likes").delete().or(`from_user.eq.${id},to_user.eq.${id}`);
    await supabaseAdmin.from("passes").delete().or(`from_user.eq.${id},to_user.eq.${id}`);
    await supabaseAdmin.from("blocked_users").delete().or(`blocker_id.eq.${id},blocked_id.eq.${id}`);
    await supabaseAdmin.from("reports").delete().or(`reported_by.eq.${id},reported_user_id.eq.${id}`);
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", id);
    await supabaseAdmin.from("profiles").delete().eq("id", id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      console.error("Auth delete error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("Delete account error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
