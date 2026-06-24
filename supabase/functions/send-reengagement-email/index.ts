import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inactiveUsers, error } = await supabase
    .from("profiles")
    .select("id, name, email, last_seen, last_reengagement_email")
    .eq("visible", true)
    .eq("is_real", true)
    .lt("last_seen", threeDaysAgo)
    .or(`last_reengagement_email.is.null,last_reengagement_email.lt.${sevenDaysAgo}`);

  if (error) {
    console.error("Error fetching inactive users:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Found ${inactiveUsers?.length || 0} inactive users to re-engage`);

  let sent = 0;
  let skipped = 0;

  for (const user of inactiveUsers || []) {
    if (!user.email) { skipped++; continue; }

    const { count: likeCount } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("to_user", user.id);

    const { count: matchCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

    const { count: newUsersCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("visible", true)
      .eq("is_real", true)
      .neq("id", user.id)
      .gt("created_at", user.last_seen || sevenDaysAgo);

    const firstName = user.name?.split(" ")[0] || "there";
    const likesLine = likeCount && likeCount > 0
      ? `<p style="font-size:16px;color:#1a3a2a;"><strong>${likeCount} ${likeCount === 1 ? "person has" : "people have"} liked your profile</strong> 💚</p>`
      : "";
    const newUsersLine = newUsersCount && newUsersCount > 0
      ? `<p style="font-size:15px;color:#4a5e4a;">${newUsersCount} new plant-based ${newUsersCount === 1 ? "person has" : "people have"} joined near you recently 🌱</p>`
      : "";
    const matchLine = matchCount && matchCount > 0
      ? `<p style="font-size:15px;color:#4a5e4a;">You have ${matchCount} ${matchCount === 1 ? "match" : "matches"} waiting to hear from you 💬</p>`
      : "";

    if (!likeCount && !newUsersCount && !matchCount) { skipped++; continue; }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f4ec;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,58,42,0.08);">
    <div style="background:linear-gradient(135deg,#1a3a2a,#2d6a4f);padding:32px 28px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🌱</div>
      <div style="font-family:Georgia,serif;font-size:22px;color:white;font-weight:700;">Miss you, ${firstName}!</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Here's what's been happening on MeetFree</div>
    </div>
    <div style="padding:28px;">
      ${likesLine}
      ${newUsersLine}
      ${matchLine}
      <div style="text-align:center;margin-top:24px;">
        <a href="https://app.meetfree.uk" style="display:inline-block;background:#52b788;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">See what's waiting 💚</a>
      </div>
    </div>
    <div style="padding:16px 28px 28px;text-align:center;border-top:1px solid rgba(82,183,136,0.1);">
      <p style="font-size:11px;color:#8fa58f;margin:0;">You're receiving this because you have a MeetFree account.<br>
      <a href="https://app.meetfree.uk" style="color:#52b788;">Visit MeetFree</a> · <a href="mailto:hello@meetfree.uk" style="color:#52b788;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MeetFree <hello@meetfree.uk>",
        to: user.email,
        subject: likeCount ? `💚 ${likeCount} ${likeCount === 1 ? "person has" : "people have"} liked you on MeetFree` : "🌱 Come back and see what's new on MeetFree",
        html,
      }),
    });

    if (res.ok) {
      await supabase.from("profiles").update({ last_reengagement_email: new Date().toISOString() }).eq("id", user.id);
      sent++;
      console.log(`Sent re-engagement email to ${user.email}`);
    } else {
      const err = await res.text();
      console.error(`Failed to send to ${user.email}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent, skipped, total: inactiveUsers?.length || 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
