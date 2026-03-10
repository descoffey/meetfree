import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const theme = {
  greenDeep: "#1a3a2a", greenMid: "#2d6a4f", greenBright: "#52b788",
  greenLight: "#95d5b2", cream: "#f8f4ec", warmWhite: "#fdfaf5",
  accent: "#e07a5f", gold: "#f4a829", textDark: "#1a2418",
  textMid: "#4a5e4a", textLight: "#8fa58f",
};

const PROFILES = [
  { id: 1, name: "Sophie", age: 28, city: "London", emoji: "🌿", diet: "Vegan", years: 4, bio: "Yoga teacher, keen cook and passionate about animal rights. Looking for friends and connections who love exploring vegan restaurants and making new connections!", interests: ["Yoga", "Cooking", "Travel"], bg: "#d8f3dc" },
  { id: 2, name: "James", age: 31, city: "Bristol", emoji: "🥑", diet: "Vegetarian", years: 7, bio: "Software dev by day, amateur chef by night. My roasted veg tikka masala has won awards (from my flatmates).", interests: ["Cycling", "Music", "Cooking"], bg: "#e9f5db" },
  { id: 3, name: "Priya", age: 26, city: "Manchester", emoji: "🫐", diet: "Vegan", years: 3, bio: "PhD student studying sustainable food systems. I want to change the world one meal at a time.", interests: ["Reading", "Hiking", "Activism"], bg: "#d4edda" },
  { id: 4, name: "Ravi", age: 30, city: "Birmingham", emoji: "🏃", diet: "Vegan", years: 2, bio: "Marathon runner and outdoor enthusiast. Went vegan after reading about factory farming and never looked back.", interests: ["Running", "Hiking", "Photography"], bg: "#dcf5e7" },
  { id: 5, name: "Aisha", age: 29, city: "Edinburgh", emoji: "🎨", diet: "Vegan", years: 6, bio: "Artist and illustrator. I paint, I cook, I hike. Life is better without cruelty.", interests: ["Art", "Travel", "Meditation"], bg: "#d8f3dc" },
];

const CHATS = [
  { id: 1, name: "Sophie", emoji: "🌿", lastMsg: "That place sounds amazing! 🌱", time: "2m", unread: 2 },
  { id: 2, name: "James", emoji: "🥑", lastMsg: "I'll bring the hummus 😄", time: "1h", unread: 0 },
  { id: 3, name: "Priya", emoji: "🫐", lastMsg: "Have you tried Mana in Manchester?", time: "3h", unread: 1 },
];

const MESSAGES = [
  { id: 1, from: "them", text: "Hey! I saw you're also into hiking 🌿" },
  { id: 2, from: "me", text: "Yes! I did the Pembrokeshire coast path last summer, it was incredible" },
  { id: 3, from: "them", text: "Oh wow! I've always wanted to do that one. Did you find good vegan food along the way?" },
  { id: 4, from: "me", text: "Better than expected! There's a great little café in St Davids 🥗" },
  { id: 5, from: "them", text: "That place sounds amazing! 🌱" },
];

const FREE_SWIPE_LIMIT = 5;

// ─── AD BANNER ────────────────────────────────────────────────────────────────

const AdBanner = ({ onUpgrade }) => {
  const [dismissed, setDismissed] = useState(false);
  const ads = [
    { brand: "Allplants", copy: "🌱 Get 20% off your first plant-based meal box", cta: "Claim offer", bg: "#e8f5e9", accent: theme.greenMid },
    { brand: "Oatly", copy: "☕ The original oat drink. Try Oatly today.", cta: "Learn more", bg: "#fff8e1", accent: "#f4a829" },
    { brand: "Vegan Life", copy: "📖 Subscribe to Vegan Life magazine — from £3.99", cta: "Subscribe", bg: "#fce4ec", accent: "#e07a5f" },
  ];
  const [adIdx] = useState(Math.floor(Math.random() * ads.length));
  const ad = ads[adIdx];
  if (dismissed) return null;
  return (
    <div style={{ margin: "0 16px 12px", borderRadius: 14, background: ad.bg, border: `1px solid ${ad.accent}22`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: theme.textLight, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Sponsored · {ad.brand}</div>
        <div style={{ fontSize: 13, color: theme.textDark, fontWeight: 500, lineHeight: 1.4 }}>{ad.copy}</div>
      </div>
      <button style={{ background: ad.accent, color: "white", border: "none", borderRadius: 50, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>{ad.cta}</button>
      <button onClick={() => setDismissed(true)} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", fontSize: 14, color: theme.textLight, cursor: "pointer", lineHeight: 1 }}>✕</button>
    </div>
  );
};

// ─── INTERSTITIAL AD ─────────────────────────────────────────────────────────

const InterstitialAd = ({ onClose, onUpgrade }) => (
  <div style={{ position: "absolute", inset: 0, background: "rgba(26,58,42,0.85)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: 24, borderRadius: 44 }}>
    <div style={{ background: "white", borderRadius: 24, overflow: "hidden", width: "100%" }}>
      <div style={{ background: "linear-gradient(135deg,#e8f5e9,#d4edda)", padding: "28px 24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: theme.textLight, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Advertisement</div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: theme.greenDeep, marginBottom: 6 }}>Allplants Meal Boxes</div>
        <p style={{ fontSize: 14, color: theme.textMid, lineHeight: 1.55 }}>100% plant-based meals delivered to your door. Chef-crafted, frozen fresh. <strong>20% off your first box.</strong></p>
      </div>
      <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={{ ...btnPrimary, background: theme.greenMid }}>Claim 20% off →</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 50, border: `1px solid rgba(82,183,136,0.25)`, background: "none", color: theme.textMid, fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Skip ad</button>
          <button onClick={onUpgrade} style={{ flex: 1, padding: "10px", borderRadius: 50, border: "none", background: theme.greenDeep, color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove ads 👑</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── PAYWALL ──────────────────────────────────────────────────────────────────

const Paywall = ({ onClose, onSubscribe, trigger = "generic" }) => {
  const [selected, setSelected] = useState("quarterly");
  const triggerMessages = {
    swipes:   { icon: "💚", title: "You're out of daily likes!", sub: "Free members get 5 likes per day. Upgrade for unlimited." },
    wholiked: { icon: "👀", title: "See who liked you", sub: "12 people have already liked your profile. Find out who!" },
    rewind:   { icon: "↩️", title: "Oops! Undo that swipe", sub: "Upgrade to rewind your last swipe anytime." },
    generic:  { icon: "👑", title: "Upgrade to MeetFree Gold", sub: "Get the most out of your plant-based dating journey." },
  };
  const msg = triggerMessages[trigger] || triggerMessages.generic;
  const plans = [
    { id: "monthly",   label: "1 Month",   price: "£9.99", per: "/month",  badge: null },
    { id: "quarterly", label: "3 Months",  price: "£6.99", per: "/month",  badge: "Most popular" },
    { id: "annual",    label: "12 Months", price: "£4.99", per: "/month",  badge: "Best value" },
  ];
  const features = ["💚 Unlimited daily likes","👀 See who liked you","↩️ Unlimited rewinds","🚀 1 free boost/week","⭐ 5 Super Likes/day","🔍 Advanced filters","🚫 No ads, ever","📍 Change location"];

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(26,58,42,0.7)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: 44, overflow: "hidden" }}>
      <div style={{ background: theme.warmWhite, borderRadius: "28px 28px 0 0", maxHeight: "90%", overflowY: "auto" }}>
        <div style={{ background: `linear-gradient(135deg,${theme.greenDeep},${theme.greenMid})`, padding: "32px 24px 28px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{msg.icon}</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 700, color: "white", marginBottom: 6 }}>{msg.title}</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{msg.sub}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: theme.gold, borderRadius: 50, padding: "5px 14px", marginTop: 12 }}>
            <span style={{ fontSize: 13 }}>👑</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em" }}>MEETFREE GOLD</span>
          </div>
        </div>

        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px", marginBottom: 18 }}>
            {features.map(f => <div key={f} style={{ fontSize: 12, color: theme.textDark }}>{f}</div>)}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {plans.map(p => (
              <div key={p.id} onClick={() => setSelected(p.id)} style={{ flex: 1, borderRadius: 14, border: `2px solid ${selected === p.id ? theme.greenDeep : "rgba(82,183,136,0.2)"}`, background: selected === p.id ? theme.greenDeep : "white", padding: "10px 6px", textAlign: "center", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                {p.badge && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: theme.gold, color: "white", fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 50, whiteSpace: "nowrap" }}>{p.badge.toUpperCase()}</div>}
                <div style={{ fontSize: 10, fontWeight: 600, color: selected === p.id ? "rgba(255,255,255,0.65)" : theme.textLight, marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, color: selected === p.id ? "white" : theme.greenDeep }}>{p.price}</div>
                <div style={{ fontSize: 9, color: selected === p.id ? "rgba(255,255,255,0.55)" : theme.textLight }}>{p.per}</div>
              </div>
            ))}
          </div>

          <button onClick={() => onSubscribe(selected)} style={{ ...btnPrimary, background: `linear-gradient(135deg,${theme.greenDeep},${theme.greenMid})`, boxShadow: "0 8px 24px rgba(45,106,79,0.3)" }}>✨ Start my Gold membership</button>

          <div style={{ marginTop: 14, marginBottom: 4 }}>
            <div style={sectionLabel}>Or buy individually</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ icon: "🚀", label: "Boost", desc: "30 min top spot", price: "£1.99" }, { icon: "⭐", label: "Super Likes", desc: "Pack of 5", price: "£2.49" }, { icon: "↩️", label: "Rewind", desc: "Undo last swipe", price: "£0.99" }].map(item => (
                <div key={item.label} style={{ flex: 1, background: "white", borderRadius: 12, padding: "10px 6px", textAlign: "center", border: "1px solid rgba(82,183,136,0.15)", cursor: "pointer" }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{item.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.textDark }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: theme.textLight, marginBottom: 4 }}>{item.desc}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.greenMid }}>{item.price}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 10, color: theme.textLight, margin: "12px 0 22px", lineHeight: 1.5 }}>Cancel anytime. Billed via App Store / Google Play. Prices in GBP.</p>
        </div>
      </div>
    </div>
  );
};

// ─── WHO LIKED YOU TEASER ─────────────────────────────────────────────────────

const WhoLikedYou = ({ onUpgrade }) => (
  <div style={{ margin: "0 16px 10px", borderRadius: 14, background: "white", border: "1px solid rgba(82,183,136,0.12)", overflow: "hidden" }}>
    <div style={{ padding: "8px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textDark }}>💚 12 people liked you</div>
      <span style={{ fontSize: 10, background: theme.gold, color: "white", padding: "2px 7px", borderRadius: 50, fontWeight: 700 }}>GOLD</span>
    </div>
    <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", position: "relative", alignItems: "center" }}>
      {["🌿","🥑","🫐","🏃"].map((e, i) => (
        <div key={i} style={{ width: 48, height: 48, borderRadius: "50%", background: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, filter: "blur(5px)", userSelect: "none" }}>{e}</div>
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={onUpgrade} style={{ background: theme.greenDeep, color: "white", border: "none", borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>👑 Unlock</button>
      </div>
    </div>
  </div>
);

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

const PhoneShell = ({ children, statusBar = true }) => (
  <div style={{ width: 390, minHeight: 844, maxHeight: 844, background: theme.warmWhite, borderRadius: 44, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 40px 100px rgba(26,58,42,0.25), 0 0 0 1px rgba(26,58,42,0.08)" }}>
    {statusBar && (
      <div style={{ background: theme.warmWhite, padding: "14px 28px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.textDark }}>9:41</span>
        <div style={{ width: 120, height: 30, background: "#111", borderRadius: 20, margin: "0 auto" }} />
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span style={{ fontSize: 11 }}>●●●</span><span style={{ fontSize: 13, fontWeight: 600 }}>📶</span></div>
      </div>
    )}
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>{children}</div>
  </div>
);

const BottomNav = ({ active, onNav, isPremium }) => (
  <div style={{ display: "flex", borderTop: `1px solid rgba(82,183,136,0.15)`, background: "rgba(253,250,245,0.97)", backdropFilter: "blur(12px)", padding: "8px 0 20px", flexShrink: 0 }}>
    {[{ id: "swipe", icon: "💚", label: "Discover" }, { id: "chat", icon: "💬", label: "Messages" }, { id: "profile", icon: "🌿", label: "Profile" }, { id: "settings", icon: "⚙️", label: "Settings" }].map(t => (
      <button key={t.id} onClick={() => onNav(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" }}>
        <span style={{ fontSize: 22 }}>{t.icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: active === t.id ? theme.greenMid : theme.textLight, textTransform: "uppercase" }}>{t.label}</span>
        {active === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: theme.greenBright }} />}
      </button>
    ))}
  </div>
);

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

const SignInForm = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) { alert("Please enter your email and password"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { alert("Sign in failed: " + error.message); return; }
    onSuccess(data.user);
  };

  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
      </div>
      <button onClick={handleSignIn} disabled={loading} style={{ width:"100%", padding:"14px", borderRadius:50, border:"none", background:theme.greenDeep, color:"white", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:10, opacity:loading ? 0.7 : 1 }}>
        {loading ? "Signing in..." : "Sign in 🌱"}
      </button>
      <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:50, border:"2px solid rgba(82,183,136,0.2)", background:"none", color:theme.textMid, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
        Cancel
      </button>
    </div>
  );
};

const Onboarding = ({ onFinish, onShowSignIn }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ diet: "Vegan", name: "", age: "", city: "", interests: [], lookingFor: "", email: "", password: "" });
  const steps = [
    () => (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "1rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🌱</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, color: theme.greenDeep, lineHeight: 1.1, marginBottom: 12 }}>Meet<span style={{ color: theme.greenBright, fontStyle: "italic" }}>Free</span></div>
        <p style={{ color: theme.textMid, fontSize: 14, lineHeight: 1.5, maxWidth: 280, marginBottom: 24 }}>Connect with like-minded people who care — about animals, the planet, and each other.</p>
 <div style={{ width:"100%", marginBottom:16, background:"rgba(82,183,136,0.08)", borderRadius:16, padding:"16px", border:"1px solid rgba(82,183,136,0.2)", textAlign:"center" }}>
  <div style={{ fontSize:15, fontWeight:700, color:theme.greenDeep, marginBottom:6 }}>🎉 First 1,000 sign-ups get 3 months FREE Gold access!</div>
  <div style={{ fontSize:13, color:theme.textMid }}>Join today — it's completely free 🌱</div>
</div>
<button onClick={() => setStep(1)} style={btnPrimary}>Get started →</button>
        <p style={{ marginTop: 16, color: theme.textLight, fontSize: 13 }}>Already have an account? <span onClick={onShowSignIn} style={{ color: theme.greenMid, fontWeight: 600, cursor: "pointer" }}>Sign in</span></p>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem" }}>
        <ProgressBar step={1} total={5} />
        <h2 style={heading}>I eat a <span style={{ color: theme.greenBright, fontStyle: "italic" }}>{data.diet.toLowerCase()}</span> diet</h2>
        <p style={subText}>This helps us match you with like-minded people</p>
        {["Vegan","Vegetarian","Whole-food plant-based","Raw vegan"].map(d => (
          <button key={d} onClick={() => setData(p => ({ ...p, diet: d }))} style={{ ...optionBtn, background: data.diet === d ? theme.greenDeep : "white", color: data.diet === d ? "white" : theme.textDark, borderColor: data.diet === d ? theme.greenDeep : "rgba(82,183,136,0.25)" }}>
            {d === "Vegan" ? "🌱" : d === "Vegetarian" ? "🥗" : d === "Whole-food plant-based" ? "🥦" : "🥬"} {d}
          </button>
        ))}
        <button onClick={() => setStep(2)} style={{ ...btnPrimary, marginTop: 24 }}>Continue →</button>
      </div>
    ),
    () => (
      <div style={{ flex:1, padding:"2rem" }}>
        <ProgressBar step={2} total={5} />
        <h2 style={heading}>I am here to find <span style={{ color:theme.greenBright, fontStyle:"italic" }}>{data.lookingFor || "..."}</span></h2>
        <p style={subText}>You can always change this later</p>
        {[
          { id:"Friends", icon:"🤝", desc:"Meet like-minded plant-based people" },
          { id:"Dating", icon:"💚", desc:"Find a partner who shares your values" },
          { id:"Both", icon:"🌱", desc:"Open to friendship and romance" },
          { id:"Community", icon:"🌍", desc:"Events, groups and local connections" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setData(p => ({...p, lookingFor:opt.id}))} style={{ width:"100%", padding:"14px 18px", borderRadius:14, border:`2px solid ${data.lookingFor===opt.id ? theme.greenDeep : "rgba(82,183,136,0.25)"}`, background:data.lookingFor===opt.id ? theme.greenDeep : "white", color:data.lookingFor===opt.id ? "white" : theme.textDark, fontSize:15, fontWeight:500, cursor:"pointer", textAlign:"left", marginBottom:10, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{opt.icon}</span>
            <div><div style={{ fontWeight:700 }}>{opt.id}</div><div style={{ fontSize:12, opacity:0.7 }}>{opt.desc}</div></div>
          </button>
        ))}
        <button onClick={() => setStep(3)} disabled={!data.lookingFor} style={{ ...btnPrimary, marginTop:16, opacity:data.lookingFor ? 1 : 0.5 }}>Continue →</button>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem" }}>
        <ProgressBar step={3} total={5} />
        <h2 style={heading}>Tell us about <span style={{ color: theme.greenBright, fontStyle: "italic" }}>you</span></h2>
        <p style={subText}>Your profile info</p>
        {[{ label: "First name", key: "name", placeholder: "e.g. Sophie", type: "text" }, { label: "Age", key: "age", placeholder: "e.g. 28", type: "number" }, { label: "City", key: "city", placeholder: "e.g. London", type: "text" }, { label: "Email", key: "email", placeholder: "your@email.com", type: "email" }, { label: "Password", key: "password", placeholder: "Min 6 characters", type: "password" }].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.textMid, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={data[f.key]} onChange={e => setData(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
          </div>
        ))}
        <button onClick={() => setStep(4)} style={{ ...btnPrimary, marginTop: 8 }}>Continue →</button>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem" }}>
        <ProgressBar step={4} total={5} />
        <h2 style={heading}>What are you <span style={{ color: theme.greenBright, fontStyle: "italic" }}>into?</span></h2>
        <p style={subText}>Pick up to 5 interests</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {["🧘 Yoga","🚴 Cycling","🎨 Art","🏃 Running","🍳 Cooking","✈️ Travel","🌍 Activism","📚 Reading","🎵 Music","🏔️ Hiking","📸 Photography","🌱 Gardening"].map(i => {
            const active = data.interests.includes(i);
            return <button key={i} onClick={() => setData(p => ({ ...p, interests: active ? p.interests.filter(x => x !== i) : p.interests.length < 5 ? [...p.interests, i] : p.interests }))} style={{ padding: "10px 16px", borderRadius: 50, border: `2px solid ${active ? theme.greenDeep : "rgba(82,183,136,0.25)"}`, background: active ? theme.greenDeep : "white", color: active ? "white" : theme.textDark, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>{i}</button>;
          })}
        </div>
        <button onClick={() => setStep(5)} style={{ ...btnPrimary, marginTop: 24 }}>Continue →</button>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <ProgressBar step={5} total={5} />
        <div style={{ fontSize: 72, marginBottom: 16 }}>📸</div>
        <h2 style={{ ...heading, textAlign: "center" }}>Add your <span style={{ color: theme.greenBright, fontStyle: "italic" }}>photo</span></h2>
        <p style={{ ...subText, textAlign: "center", marginBottom: 12 }}>Profiles with photos get 8× more matches</p>
        <div style={{ width: 160, height: 160, borderRadius: "50%", background: "linear-gradient(135deg,rgba(82,183,136,0.15),rgba(149,213,178,0.1))", border: `3px dashed rgba(82,183,136,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, cursor: "pointer", marginBottom: 12 }}>➕</div>
        <button onClick={() => onFinish(data)} style={btnPrimary}>Let's go! 🌱</button>
        <button onClick={() => onFinish(data)} style={{ ...btnGhost, marginTop: 12 }}>Skip for now</button>
      </div>
    ),
  ];
  return (
    <PhoneShell statusBar={false}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.warmWhite }}>{steps[step]()}</div>
    </PhoneShell>
  );
};

const ProgressBar = ({ step, total }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
    {Array.from({ length: total }).map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? theme.greenBright : "rgba(82,183,136,0.15)", transition: "background 0.3s" }} />)}
  </div>
);

// ─── SWIPE SCREEN ─────────────────────────────────────────────────────────────

const SwipeScreen = ({ onNav, isPremium, onUpgrade }) => {
  const [idx, setIdx] = useState(0);
  const [action, setAction] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [swipesLeft, setSwipesLeft] = useState(FREE_SWIPE_LIMIT);
  const [showAd, setShowAd] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState(null);
  const [swipeCount, setSwipeCount] = useState(0);

  const profile = PROFILES[idx % PROFILES.length];

  const handleSwipe = (dir) => {
    if (!isPremium && swipesLeft <= 0) { setPaywallTrigger("swipes"); return; }
    setAction(dir);
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);
    setTimeout(() => {
      setAction(null); setIdx(i => i + 1); setExpanded(false);
      if (!isPremium) { setSwipesLeft(s => s - 1); if (newCount % 3 === 0) setShowAd(true); }
    }, 380);
  };

  return (
    <PhoneShell>
      {paywallTrigger && <Paywall trigger={paywallTrigger} onClose={() => setPaywallTrigger(null)} onSubscribe={() => { setPaywallTrigger(null); onUpgrade(); }} />}
      {showAd && <InterstitialAd onClose={() => setShowAd(false)} onUpgrade={() => { setShowAd(false); setPaywallTrigger("generic"); }} />}

      <div style={{ padding: "12px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: theme.greenDeep }}>
          Meet<span style={{ color: theme.greenBright, fontStyle: "italic" }}>Free</span>
          {isPremium && <span style={{ marginLeft: 8, fontSize: 11, background: theme.gold, color: "white", padding: "2px 7px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>👑 GOLD</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isPremium && <div style={{ fontSize: 12, color: swipesLeft <= 2 ? theme.accent : theme.textLight, fontWeight: 600 }}>{swipesLeft}/{FREE_SWIPE_LIMIT} left</div>}
          <button onClick={() => setPaywallTrigger("wholiked")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>🔔</button>
        </div>
      </div>

      {!isPremium && <WhoLikedYou onUpgrade={() => setPaywallTrigger("wholiked")} />}
      {!isPremium && <AdBanner onUpgrade={() => setPaywallTrigger("generic")} />}

      <div style={{ flex: 1, padding: "0 16px 8px", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, borderRadius: 28, overflow: "hidden", position: "relative", background: `linear-gradient(135deg,${profile.bg},${profile.bg}dd)`, boxShadow: "0 16px 48px rgba(26,58,42,0.15)", transform: action === "like" ? "rotate(8deg) translateX(40px)" : action === "pass" ? "rotate(-8deg) translateX(-40px)" : "none", opacity: action ? 0 : 1, transition: "all 0.35s ease", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
          <div style={{ height: expanded ? 160 : 270, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 90, transition: "height 0.3s ease" }}>{profile.emoji}</div>
          {action === "like" && <div style={{ position: "absolute", top: 30, left: 20, border: "4px solid #52b788", borderRadius: 12, padding: "6px 16px", transform: "rotate(-15deg)" }}><span style={{ fontSize: 20, fontWeight: 800, color: "#52b788" }}>LIKE 💚</span></div>}
          {action === "pass" && <div style={{ position: "absolute", top: 30, right: 20, border: "4px solid #e07a5f", borderRadius: 12, padding: "6px 16px", transform: "rotate(15deg)" }}><span style={{ fontSize: 20, fontWeight: 800, color: "#e07a5f" }}>PASS ✕</span></div>}
          <div style={{ background: "rgba(253,250,245,0.97)", padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 700, color: theme.greenDeep }}>{profile.name}, {profile.age}</div>
                <div style={{ color: theme.textMid, fontSize: 12, marginTop: 2 }}>📍 {profile.city} · {profile.diet} {profile.years}yr</div>
              </div>
              <span style={{ background: profile.diet === "Vegan" ? theme.greenDeep : "rgba(82,183,136,0.15)", color: profile.diet === "Vegan" ? "white" : theme.greenMid, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>{profile.diet === "Vegan" ? "🌱" : "🥗"} {profile.diet}</span>
            </div>
            {expanded && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 13, color: theme.textMid, lineHeight: 1.6, marginBottom: 8 }}>{profile.bio}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{profile.interests.map(i => <span key={i} style={{ background: "rgba(82,183,136,0.1)", color: theme.greenMid, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>{i}</span>)}</div>
              </div>
            )}
            <div style={{ color: theme.textLight, fontSize: 11, textAlign: "center", marginTop: 6 }}>{expanded ? "▲ collapse" : "▼ more"}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "10px 0 4px" }}>
          <button onClick={() => !isPremium ? setPaywallTrigger("rewind") : (idx > 0 && setIdx(i => i - 1))} title="Rewind" style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${isPremium ? "rgba(244,168,41,0.4)" : "rgba(82,183,136,0.15)"}`, background: "white", fontSize: 18, cursor: "pointer", color: isPremium ? theme.gold : theme.textLight }}>↩️</button>
          <button onClick={() => handleSwipe("pass")} style={{ width: 58, height: 58, borderRadius: "50%", border: "2px solid rgba(224,122,95,0.3)", background: "white", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>✕</button>
          <button onClick={() => !isPremium ? setPaywallTrigger("generic") : null} style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${isPremium ? "rgba(244,168,41,0.4)" : "rgba(82,183,136,0.15)"}`, background: "white", fontSize: 18, cursor: "pointer" }}>⭐</button>
          <button onClick={() => handleSwipe("like")} style={{ width: 58, height: 58, borderRadius: "50%", border: "2px solid rgba(82,183,136,0.3)", background: !isPremium && swipesLeft <= 0 ? "#ccc" : theme.greenBright, fontSize: 22, cursor: "pointer", boxShadow: "0 8px 24px rgba(82,183,136,0.35)" }}>💚</button>
        </div>

        {!isPremium && swipesLeft <= 2 && swipesLeft > 0 && (
          <div style={{ textAlign: "center", paddingBottom: 4 }}>
            <button onClick={() => setPaywallTrigger("swipes")} style={{ background: "none", border: "none", color: theme.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>⚡ Only {swipesLeft} like{swipesLeft !== 1 ? "s" : ""} left — upgrade for unlimited</button>
          </div>
        )}
      </div>
      <BottomNav active="swipe" onNav={onNav} isPremium={isPremium} />
    </PhoneShell>
  );
};

// ─── CHAT LIST ────────────────────────────────────────────────────────────────

const ChatList = ({ onNav, onOpenChat, isPremium, onUpgrade }) => (
  <PhoneShell>
    <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, color: theme.greenDeep }}>Messages</h1>
      <button style={iconBtn}>🔍</button>
    </div>
    {!isPremium && <AdBanner onUpgrade={onUpgrade} />}
    <div style={{ padding: "0 24px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.textLight, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>New Matches</div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
        {PROFILES.slice(0, 4).map(p => (
          <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(135deg,${p.bg},${p.bg}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: `3px solid ${theme.greenBright}`, position: "relative" }}>
              {p.emoji}
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 13, height: 13, borderRadius: "50%", background: "#4ade80", border: "2px solid white" }} />
            </div>
            <span style={{ fontSize: 10, color: theme.textMid, fontWeight: 500 }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ height: 1, background: "rgba(82,183,136,0.1)", margin: "0 24px" }} />
    <div style={{ flex: 1 }}>
      {CHATS.map(c => (
        <div key={c.id} onClick={() => onOpenChat(c)} style={{ display: "flex", gap: 14, padding: "13px 24px", alignItems: "center", cursor: "pointer" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{c.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontWeight: 700, color: theme.textDark, fontSize: 15 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: theme.textLight }}>{c.time}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: c.unread ? theme.textDark : theme.textLight, fontWeight: c.unread ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{c.lastMsg}</span>
              {c.unread > 0 && <span style={{ background: theme.greenBright, color: "white", fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.unread}</span>}
            </div>
          </div>
        </div>
      ))}
      {!isPremium && (
        <div style={{ margin: "6px 20px 14px", background: "rgba(244,168,41,0.08)", border: "1px solid rgba(244,168,41,0.25)", borderRadius: 14, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.textDark }}>👑 See read receipts</div>
            <div style={{ fontSize: 11, color: theme.textLight }}>Know when your message is seen</div>
          </div>
          <button onClick={onUpgrade} style={{ background: theme.gold, border: "none", color: "white", borderRadius: 50, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Gold</button>
        </div>
      )}
    </div>
    <BottomNav active="chat" onNav={onNav} isPremium={isPremium} />
  </PhoneShell>
);

// ─── CHAT DETAIL ──────────────────────────────────────────────────────────────

const ChatDetail = ({ chat, onBack }) => {
  const [msgs, setMsgs] = useState(MESSAGES);
  const [text, setText] = useState("");
  const send = () => { if (!text.trim()) return; setMsgs(m => [...m, { id: Date.now(), from: "me", text }]); setText(""); };
  return (
    <PhoneShell>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(82,183,136,0.1)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{chat.emoji}</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: theme.textDark, fontSize: 16 }}>{chat.name}</div><div style={{ fontSize: 11, color: theme.greenBright, fontWeight: 500 }}>● Online</div></div>
        <button style={iconBtn}>⋯</button>
      </div>
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        <div style={{ textAlign: "center", fontSize: 11, color: theme.textLight, marginBottom: 8 }}>You matched with {chat.name} 🌱 · Today</div>
        {msgs.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "72%", padding: "10px 14px", borderRadius: m.from === "me" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.from === "me" ? theme.greenDeep : "white", color: m.from === "me" ? "white" : theme.textDark, fontSize: 14, lineHeight: 1.5, boxShadow: "0 2px 8px rgba(26,58,42,0.08)" }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px 28px", display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid rgba(82,183,136,0.1)", background: "white" }}>
        <button style={{ ...iconBtn, fontSize: 22 }}>😊</button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Message..." style={{ flex: 1, padding: "10px 16px", borderRadius: 50, border: "2px solid rgba(82,183,136,0.2)", background: theme.warmWhite, fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" }} />
        <button onClick={send} style={{ width: 40, height: 40, borderRadius: "50%", background: theme.greenBright, border: "none", fontSize: 18, cursor: "pointer" }}>↑</button>
      </div>
    </PhoneShell>
  );
};

// ─── PROFILE ──────────────────────────────────────────────────────────────────

const ProfileScreen = ({ onNav, isPremium, onUpgrade, currentUser }) => {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      if (data) { setUser(data); setEditData(data); }
    };
    loadProfile();
  }, []);

  const saveProfile = async () => {
    const authUser = currentUser;
    if (!authUser) return;
    await supabase.from("profiles").update({
      name: editData.name,
      age: parseInt(editData.age),
      city: editData.city,
      bio: editData.bio,
    }).eq("id", authUser.id);
    setUser({...user, ...editData});
    setEditing(false);
  };

  if (!user) return (
    <PhoneShell>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:theme.textMid, fontSize:14 }}>Loading profile...</div>
      </div>
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} />
    </PhoneShell>
  );

  if (editing) return (
    <PhoneShell>
      <div style={{ padding:"16px 24px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ fontFamily:"Georgia,serif", fontSize:26, fontWeight:700, color:theme.greenDeep }}>Edit Profile</h1>
        <button onClick={() => setEditing(false)} style={iconBtn}>✕</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
        {[
          { label:"Name", key:"name", type:"text" },
          { label:"Age", key:"age", type:"number" },
          { label:"City", key:"city", type:"text" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{f.label}</label>
            <input type={f.type} value={editData[f.key] || ""} onChange={e => setEditData(p => ({...p, [f.key]:e.target.value}))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Bio</label>
          <textarea value={editData.bio || ""} onChange={e => setEditData(p => ({...p, bio:e.target.value}))} rows={4} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", resize:"none" }} />
        </div>
        <button onClick={saveProfile} style={{ ...btnPrimary, width:"100%", marginBottom:10 }}>Save changes</button>
      </div>
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} />
    </PhoneShell>
  );

  return (
    <PhoneShell>
      <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, color: theme.greenDeep }}>My Profile</h1>
        <button onClick={() => setEditing(true)} style={iconBtn}>✏️</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 14px" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#d8f3dc,#b7e4c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, border: `4px solid ${isPremium ? theme.gold : theme.greenBright}`, marginBottom: 10, boxShadow: isPremium ? `0 8px 24px rgba(244,168,41,0.3)` : "0 8px 24px rgba(82,183,136,0.2)" }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: theme.greenDeep }}>{user.name}, {user.age}</div>
          <div style={{ color: theme.textMid, fontSize: 13, marginTop: 3 }}>📍 {user.city}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ background: theme.greenDeep, color: "white", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>🌱 {user.diet || "Vegan"}</span>
            {isPremium && <span style={{ background: theme.gold, color: "white", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>👑 Gold</span>}
          </div>
        </div>
        <div style={{ display: "flex", margin: "0 20px 14px", background: "rgba(82,183,136,0.06)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.12)" }}>
          {[["12","Likes"],["3","Matches"],["86%","Complete"]].map(([n,l]) => (
            <div key={l} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: "1px solid rgba(82,183,136,0.12)" }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, color: theme.greenDeep }}>{n}</div>
              <div style={{ fontSize: 9, color: theme.textLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ margin: "0 20px 12px" }}>
          <div style={sectionLabel}>About me</div>
          <p style={{ fontSize: 14, color: theme.textMid, lineHeight: 1.7 }}>{user.bio || "No bio yet — tap edit to add one!"}</p>
        </div>
        <div style={{ margin: "0 20px 14px" }}>
          <div style={sectionLabel}>Interests</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {(user.interests || []).map(i => <span key={i} style={{ background: "rgba(82,183,136,0.1)", color: theme.greenMid, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 50 }}>{i}</span>)}
          </div>
        </div>
        {!isPremium ? (
          <div onClick={onUpgrade} style={{ margin: "0 20px 16px", background: `linear-gradient(135deg,${theme.greenDeep},${theme.greenMid})`, borderRadius: 18, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div><div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>👑 Upgrade to Gold</div><div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 3 }}>Unlimited likes · No ads · See who likes you</div></div>
            <div style={{ background: theme.gold, color: "white", fontWeight: 700, padding: "7px 14px", borderRadius: 50, fontSize: 13 }}>From £4.99</div>
          </div>
        ) : (
          <div style={{ margin: "0 20px 16px", background: `linear-gradient(135deg,${theme.gold},#f5b942)`, borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>👑 You're a Gold member!</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Renews 4 Mar 2027 · Manage subscription</div>
          </div>
        )}
        {!isPremium && <AdBanner onUpgrade={onUpgrade} />}
      </div>
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} />
    </PhoneShell>
  );
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

const SettingsScreen = ({ onNav, onLogout, isPremium, onUpgrade }) => {
  const [notifs, setNotifs] = useState(true);
  const [loc, setLoc] = useState(true);
  const [distance, setDistance] = useState(25);
  const Toggle = ({ on, toggle }) => (
    <div onClick={toggle} style={{ width: 46, height: 25, borderRadius: 13, background: on ? theme.greenBright : "rgba(82,183,136,0.2)", position: "relative", cursor: "pointer", transition: "background 0.25s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 24 : 3, width: 19, height: 19, borderRadius: "50%", background: "white", transition: "left 0.25s", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
    </div>
  );
  const Row = ({ label, sub, right, locked }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid rgba(82,183,136,0.08)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: locked ? theme.textLight : theme.textDark, display: "flex", alignItems: "center", gap: 6 }}>{label}{locked && <span style={{ fontSize: 10, background: theme.gold, color: "white", padding: "1px 6px", borderRadius: 50, fontWeight: 700 }}>GOLD</span>}</div>
        {sub && <div style={{ fontSize: 11, color: theme.textLight, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
  return (
    <PhoneShell>
      <div style={{ padding: "16px 24px 8px" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, color: theme.greenDeep }}>Settings</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!isPremium && (
          <div onClick={onUpgrade} style={{ margin: "6px 18px 10px", background: `linear-gradient(135deg,${theme.gold},#f5b942)`, borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div><div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>👑 Upgrade to Gold</div><div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Unlock all features from £4.99/mo</div></div>
            <span style={{ color: "white", fontSize: 18 }}>›</span>
          </div>
        )}
        <div style={{ margin: "4px 18px 8px" }}>
          <div style={sectionLabel}>Discovery</div>
          <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.1)" }}>
            <Row label="Match with" right={<span style={{ fontSize: 13, color: theme.greenMid, fontWeight: 600 }}>Everyone ›</span>} />
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(82,183,136,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: theme.textDark }}>Distance</span>
                <span style={{ fontSize: 13, color: theme.greenMid, fontWeight: 600 }}>{distance} mi</span>
              </div>
              <input type="range" min={1} max={100} value={distance} onChange={e => setDistance(e.target.value)} style={{ width: "100%", accentColor: theme.greenBright }} />
            </div>
            <Row label="Change location" sub="Search anywhere" locked={!isPremium} right={isPremium ? <span style={{ fontSize: 13, color: theme.greenMid }}>›</span> : <button onClick={onUpgrade} style={{ background: theme.gold, border: "none", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 50, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Unlock</button>} />
          </div>
        </div>
        <div style={{ margin: "4px 18px 8px" }}>
          <div style={sectionLabel}>Notifications</div>
          <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.1)" }}>
            <Row label="Push notifications" sub="Matches and messages" right={<Toggle on={notifs} toggle={() => setNotifs(n => !n)} />} />
            <Row label="Location services" right={<Toggle on={loc} toggle={() => setLoc(l => !l)} />} />
          </div>
        </div>
        <div style={{ margin: "4px 18px 8px" }}>
          <div style={sectionLabel}>Account</div>
          <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.1)" }}>
            <Row label="Privacy policy" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => handleNav("privacy")} />
            <Row label="Terms of service" right={<span style={{ color: theme.textLight }}>›</span>} />
            <Row label="Block & report" right={<span style={{ color: theme.textLight }}>›</span>} />
            <div onClick={onLogout} style={{ padding: "13px 18px", cursor: "pointer" }}><span style={{ color: theme.accent, fontWeight: 600, fontSize: 14 }}>Sign out</span></div>
          </div>
        </div>
        <div style={{ padding: "8px 0 24px", textAlign: "center", color: theme.textLight, fontSize: 11 }}>MeetFree v1.0.0 · Made with 🌱</div>
      </div>
      <BottomNav active="settings" onNav={onNav} isPremium={isPremium} />
    </PhoneShell>
  );
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const btnPrimary = { width: "100%", padding: "15px 0", borderRadius: 50, border: "none", background: theme.greenDeep, color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.01em" };
const btnGhost = { width: "100%", padding: "12px 0", borderRadius: 50, border: `2px solid rgba(82,183,136,0.25)`, background: "transparent", color: theme.greenDeep, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" };
const optionBtn = { width: "100%", padding: "14px 18px", borderRadius: 14, border: "2px solid", marginBottom: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif" };
const inputStyle = { width: "100%", padding: "13px 16px", borderRadius: 14, border: `2px solid rgba(82,183,136,0.2)`, fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: "none", background: "white", color: theme.textDark, boxSizing: "border-box" };
const iconBtn = { width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(82,183,136,0.2)", background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const heading = { fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, color: theme.greenDeep, lineHeight: 1.2, marginBottom: 8 };
const subText = { color: theme.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 12 };
const sectionLabel = { fontSize: 11, fontWeight: 700, color: theme.textLight, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 };

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [showSignIn, setShowSignIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleNav = (s) => { setScreen(s); setActiveChat(null); };
  const handleUpgrade = () => setShowPaywall(true);
  const handleSubscribe = () => { setIsPremium(true); setShowPaywall(false); };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#e8f5e9 0%,#f1f8e9 50%,#e0f2f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input[type=range] { height: 4px; border-radius: 2px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* Screen tabs */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { id: "onboarding", label: "🌱 Onboarding" },
            { id: "swipe", label: "💚 Discover" },
            { id: "chat", label: "💬 Messages" },
            { id: "profile", label: "🌿 Profile" },
            { id: "settings", label: "⚙️ Settings" },
            { id: "paywall", label: "👑 Paywall" },
          ].map(s => (
            <button key={s.id} onClick={() => { if (s.id === "paywall") { setShowPaywall(true); if (screen === "onboarding") setScreen("swipe"); } else handleNav(s.id); }} style={{ padding: "7px 16px", borderRadius: 50, border: "none", background: screen === s.id && s.id !== "paywall" ? theme.greenDeep : "rgba(255,255,255,0.75)", color: screen === s.id && s.id !== "paywall" ? "white" : theme.textMid, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: screen === s.id && s.id !== "paywall" ? "0 4px 16px rgba(26,58,42,0.25)" : "none" }}>{s.label}</button>
          ))}
        </div>

        {/* Free / Gold toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", padding: "6px 16px", borderRadius: 50 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textMid }}>Preview as:</span>
          <button onClick={() => setIsPremium(false)} style={{ padding: "4px 12px", borderRadius: 50, border: "none", background: !isPremium ? theme.greenDeep : "transparent", color: !isPremium ? "white" : theme.textMid, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Free</button>
          <button onClick={() => setIsPremium(true)} style={{ padding: "4px 12px", borderRadius: 50, border: "none", background: isPremium ? theme.gold : "transparent", color: isPremium ? "white" : theme.textMid, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>👑 Gold</button>
        </div>

        {/* Phone */}
        <div style={{ position: "relative" }}>
          {showPaywall && (
            <div style={{ position: "absolute", inset: 0, zIndex: 100, borderRadius: 44, overflow: "hidden" }}>
              <Paywall trigger="generic" onClose={() => setShowPaywall(false)} onSubscribe={handleSubscribe} />
            </div>
          )}
          {showSignIn && (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
    <div style={{ background:"white", borderRadius:24, padding:"28px", width:"100%", maxWidth:380 }}>
      <h2 style={{ fontFamily:"Georgia,serif", fontSize:24, color:theme.greenDeep, marginBottom:8 }}>Welcome back 🌱</h2>
      <p style={{ color:theme.textMid, fontSize:14, marginBottom:20 }}>Sign in to your MeetFree account</p>
      <SignInForm onSuccess={(user) => { setCurrentUser(user); setShowSignIn(false); setScreen("swipe"); }} onClose={() => setShowSignIn(false)} />
    </div>
  </div>
)}
{screen === "onboarding" && <Onboarding onShowSignIn={() => setShowSignIn(true)} onFinish={async (profileData) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: profileData.email,
      password: profileData.password,
    });
    if (authError) { alert("Signup error: " + authError.message); return; }
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: profileData.email,
      name: profileData.name,
      age: parseInt(profileData.age),
      city: profileData.city,
      diet: profileData.diet,
      looking_for: profileData.lookingFor,
      interests: profileData.interests,
    });
    if (profileError) console.error("Profile error:", profileError);
    setCurrentUser(authData.user);
    setScreen("swipe");
  } catch(e) { console.error(e); setScreen("swipe"); }
}} />}
          {screen === "swipe" && <SwipeScreen onNav={handleNav} isPremium={isPremium} onUpgrade={handleUpgrade} />}
          {screen === "chat" && !activeChat && <ChatList onNav={handleNav} onOpenChat={c => setActiveChat(c)} isPremium={isPremium} onUpgrade={handleUpgrade} />}
          {screen === "chat" && activeChat && <ChatDetail chat={activeChat} onBack={() => setActiveChat(null)} />}
          {screen === "profile" && <ProfileScreen onNav={handleNav} isPremium={isPremium} onUpgrade={handleUpgrade} currentUser={currentUser} />}
          {screen === "settings" && <SettingsScreen onNav={handleNav} onLogout={() => setScreen("onboarding")} isPremium={isPremium} onUpgrade={handleUpgrade} />}
          {screen === "privacy" && (
            <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
              <button onClick={() => setScreen("settings")} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
              <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, color:theme.greenDeep, marginBottom:6 }}>Privacy Policy</h2>
              <p style={{ fontSize:11, color:theme.textLight, marginBottom:24 }}>Last updated: March 2026</p>
              {[
                ["Who We Are", "MeetFree is a plant-based connections app helping people find friends, dates and community. This policy explains how we handle your personal data."],
                ["What We Collect", "We collect your email address when you join our waiting list, and profile information (name, age, city, interests) when you register."],
                ["Why We Collect It", "We use your data to provide the MeetFree service, match you with other users, and send you relevant notifications. We will never sell your data."],
                ["Legal Basis", "We process your data based on your explicit consent given during registration. You can withdraw consent at any time by deleting your account."],
                ["Data Storage", "Your data is stored securely. We use industry-standard encryption and security practices to protect your information."],
                ["How Long We Keep It", "We keep your data for as long as your account is active. If you delete your account, your data is permanently removed within 30 days."],
                ["Your Rights", "Under GDPR you have the right to access, correct or delete your data at any time. Email us at descoffey@gmail.com and we will respond within 30 days."],
                ["Cookies", "We use minimal cookies only to keep you logged in. We do not use tracking or advertising cookies."],
                ["Contact Us", "For any privacy questions email descoffey@gmail.com or write to us at the address provided in our Terms & Conditions."],
              ].map(([title, text]) => (
                <div key={title} style={{ marginBottom:20 }}>
                  <div style={{ fontWeight:700, color:theme.greenDeep, fontSize:15, marginBottom:6 }}>{title}</div>
                  <div style={{ color:theme.textMid, fontSize:13, lineHeight:1.7 }}>{text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
