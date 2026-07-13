import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { matchId, senderName, recipientId } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get the match and check last_read_at and last_emailed_at
  const { data: match } = await supabase
    .from("matches")
    .select("last_read_at, last_emailed_at")
    .eq("id", matchId)
    .single();

  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const lastRead = match?.last_read_at ? new Date(match.last_read_at) : null;
  const lastEmailed = match?.last_emailed_at ? new Date(match.last_emailed_at) : null;

  // Skip if recipient has been active in the last 30 minutes
  if (lastRead && lastRead > thirtyMinsAgo) {
    return new Response(JSON.stringify({ skipped: true, reason: "recently active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Skip if we already sent an email for this match in the last hour — batching
  if (lastEmailed && lastEmailed > oneHourAgo) {
    return new Response(JSON.stringify({ skipped: true, reason: "already emailed recently" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get recipient email and name
  const { data: recipient } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", recipientId)
    .single();

  if (!recipient?.email) {
    return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Count how many unread messages there are from this sender in this match
  const { count: unreadCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .neq("sender_id", recipientId)
    .gt("created_at", match?.last_read_at || new Date(0).toISOString());

  const msgText = unreadCount && unreadCount > 1
    ? `${senderName} has sent you ${unreadCount} messages`
    : `${senderName} has sent you a message`;

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MeetFree <hello@meetfree.uk>",
      to: recipient.email,
      subject: `💬 You have new messages on MeetFree!`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fdf9;border-radius:16px;">
          <h1 style="color:#1a3a2a;font-size:24px;">You've got messages! 💬</h1>
          <p style="color:#4a7c59;font-size:16px;">Hi ${recipient.name},</p>
          <p style="color:#4a7c59;font-size:16px;"><strong>${msgText}</strong> on MeetFree. Log in to read and reply!</p>
          <a href="https://app.meetfree.uk?chat=${matchId}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#52b788;color:white;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">Read your messages 🌱</a>
          <p style="color:#aaa;font-size:12px;margin-top:32px;">Questions? Email hello@meetfree.uk</p>
        </div>
      `,
    }),
  });

  if (res.ok) {
    // Record when we last emailed for this match to prevent further batching
    await supabase
      .from("matches")
      .update({ last_emailed_at: new Date().toISOString() })
      .eq("id", matchId);
  }

  const data = await res.json();
  return new Response(JSON.stringify({ success: true, resend: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
