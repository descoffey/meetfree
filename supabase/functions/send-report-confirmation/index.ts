import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
serve(async (req) => {
  const { to, name, reportedName, reason } = await req.json();
  if (!to) return new Response("No recipient", { status: 400 });
  const firstName = name?.split(" ")[0] || "there";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8f4ec;font-family:Arial,sans-serif;"><div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#1a3a2a,#2d6a4f);padding:32px 28px;text-align:center;"><div style="font-size:36px;">🛡</div><div style="font-family:Georgia,serif;font-size:22px;color:white;font-weight:700;">Report received</div><div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Thank you for helping keep MeetFree safe</div></div><div style="padding:28px;"><p style="font-size:15px;color:#1a3a2a;">Hi ${firstName},</p><p style="font-size:14px;color:#4a5e4a;line-height:1.7;">We've received your report about <strong>${reportedName}</strong> for: <em>${reason}</em>.</p><p style="font-size:14px;color:#4a5e4a;line-height:1.7;">Our team will review this within <strong>48 hours</strong>. If we find a violation of our community guidelines, we'll take appropriate action.</p><p style="font-size:14px;color:#4a5e4a;line-height:1.7;">The user has been blocked from appearing in your Discover feed.</p><div style="background:rgba(82,183,136,0.08);border-radius:12px;padding:16px;margin-bottom:24px;"><p style="font-size:13px;color:#2d6a4f;margin:0;">If you feel unsafe, contact emergency services on <strong>999</strong> or visit the <a href="https://www.suzylamplugh.org" style="color:#52b788;">Suzy Lamplugh Trust</a>.</p></div><div style="text-align:center;"><a href="https://meetfree.uk" style="display:inline-block;background:#52b788;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">Back to MeetFree 🌱</a></div></div><div style="padding:16px 28px;text-align:center;border-top:1px solid rgba(82,183,136,0.1);"><p style="font-size:11px;color:#8fa58f;margin:0;">MeetFree · <a href="mailto:hello@meetfree.uk" style="color:#52b788;">hello@meetfree.uk</a></p></div></div></body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "MeetFree <hello@meetfree.uk>", to, subject: "🛡 Your report has been received — MeetFree", html }),
  });
  const result = await res.json();
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
