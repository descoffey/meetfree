import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const VAPID_PUBLIC_KEY = "BE8wDhmjv5Ahta8yM2HkMowLQ6Ul6cvzgGoGjZ3jKO6Wj72EUZhLgJh9Z_4usJmVTE2vxMaT3aZ8r_cVacmCGbE";
const VAPID_PRIVATE_KEY = "9aVMwfJPGeQXZQqjCYASQxT9xpNf6k1J9AsGs9LD6Do";

webpush.setVapidDetails("mailto:hello@meetfree.uk", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { recipientId, title, body, url, matchId } = await req.json();

  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", recipientId)
    .maybeSingle();

  if (!sub?.subscription) return new Response(
    JSON.stringify({ skipped: true, reason: "no subscription" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  const subscription = typeof sub.subscription === "string"
    ? JSON.parse(sub.subscription)
    : sub.subscription;

  if (!subscription?.endpoint) {
    console.error("No endpoint:", subscription);
    return new Response(
      JSON.stringify({ skipped: true, reason: "no endpoint" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Group notifications per conversation using matchId as tag
  // If no matchId, fall back to a generic MeetFree tag
  const tag = matchId ? `meetfree-match-${matchId}` : "meetfree-messages";

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: title || "MeetFree",
      body,
      url: url || "https://app.meetfree.uk",
      tag,           // Groups notifications — same tag = same bundle on Android/Chrome
      renotify: true, // Still vibrate/sound even when updating an existing grouped notification
    }));

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch(e) {
    console.error("Push error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
