import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
serve(async (req) => {
  const { to, name, isGold } = await req.json();
  if (!to) return new Response("No recipient", { status: 400 });
  const firstName = name?.split(" ")[0] || "there";
  const goldItems = [["👁","See who liked you"],["⭐","Send Super Likes"],["🔄","Unlimited likes per day"],["🚀","Boost your profile once a week"],["🎯","Up to 10 interests on your profile"],["↩️","Rewind your last swipe"]];
  const goldFeatures = `<div style="margin:20px 0;"><div style="font-size:15px;font-weight:700;color:#1a3a2a;margin-bottom:12px;">⭐ Your Gold features:</div>${goldItems.map(([icon,text])=>`<div style="padding:8px 0;border-bottom:1px solid rgba(82,183,136,0.1);font-size:14px;color:#4a5e4a;">${icon} ${text}</div>`).join("")}</div>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8f4ec;font-family:Arial,sans-serif;"><div style="max-width:480px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;"><div style="background:#1a3a2a;padding:24px 28px;text-align:center;"><img src="https://meetfree.uk/meetfree-logo.png" alt="MeetFree" style="width:100%;max-width:440px;height:auto;border-radius:8px;" /></div><div style="padding:28px;"><p style="font-size:15px;color:#1a3a2a;">Hi ${firstName},</p><p style="font-size:14px;color:#4a5e4a;line-height:1.7;">Welcome to MeetFree — the free dating and friendship app for plant-based singles across the UK.</p>${isGold?`<p style="font-size:14px;color:#4a5e4a;line-height:1.7;">As one of our founding members, you've been given <strong>free Gold membership</strong> — our way of saying thank you for joining early. 💚</p>${goldFeatures}`:`<p style="font-size:14px;color:#4a5e4a;line-height:1.7;">Complete your profile to start getting matches — add a photo, write a bio and set your interests.</p>`}<div style="text-align:center;margin-top:24px;"><a href="https://app.meetfree.uk" style="display:inline-block;background:#52b788;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">Go to MeetFree 🌱</a></div></div><div style="padding:16px 28px;text-align:center;border-top:1px solid rgba(82,183,136,0.1);"><p style="font-size:11px;color:#8fa58f;margin:0;">MeetFree · <a href="mailto:hello@meetfree.uk" style="color:#52b788;">hello@meetfree.uk</a></p></div></div></body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "MeetFree <hello@meetfree.uk>", to, subject: isGold ? "🌟 Welcome to MeetFree — you're on Gold!" : "🌱 Welcome to MeetFree!", html }),
  });
  const result = await res.json();
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
