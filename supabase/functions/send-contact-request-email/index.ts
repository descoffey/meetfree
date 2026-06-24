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

  const { matchId, requesterName, recipientId } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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
      subject: `☎️ ${requesterName} wants to share contact details with you`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fdf9;border-radius:16px;">
          <h1 style="color:#1a3a2a;font-size:24px;">Contact request! ☎️</h1>
          <p style="color:#4a7c59;font-size:16px;">Hi ${recipient.name},</p>
          <p style="color:#4a7c59;font-size:16px;"><strong>${requesterName}</strong> would like to share contact details with you on MeetFree.</p>
          <p style="color:#4a7c59;font-size:16px;">Log in to accept or decline — it's completely your choice and you're never obligated to share anything you're not comfortable with. 🌿</p>
          <a href="https://app.meetfree.uk?chat=${matchId}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#52b788;color:white;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">View request 🌱</a>
          <p style="color:#aaa;font-size:12px;margin-top:32px;">Questions? Email hello@meetfree.uk</p>
        </div>
      `,
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify({ success: true, resend: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
