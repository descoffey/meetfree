import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";

const theme = {
  greenDeep: "#1a3a2a", greenMid: "#2d6a4f", greenBright: "#52b788",
  greenLight: "#95d5b2", cream: "#f8f4ec", warmWhite: "#fdfaf5",
  accent: "#e07a5f", gold: "#f4a829", textDark: "#1a2418",
  textMid: "#4a5e4a", textLight: "#8fa58f",
};


const INTEREST_GROUPS = [
  { group: "📚 Books & Reading", icon: "📚", items: ["📚 Fiction", "📚 Non-fiction", "📚 Sci-fi", "📚 Fantasy", "📚 Biography", "📚 Self-help", "📚 Philosophy", "📚 Poetry"] },
  { group: "🎵 Music", icon: "🎵", items: ["🎵 Live gigs", "🎵 Playing music", "🎵 Festivals", "🎵 Vinyl & records", "🎵 Singing"] },
  { group: "💪 Sport & Fitness", icon: "💪", items: ["⚽ Football", "🚴 Cycling", "🏃 Running", "🧘 Yoga", "🏊 Swimming", "🏔️ Hiking", "🧗 Climbing", "🏋️ Gym", "⚽ Team sports"] },
  { group: "🎨 Arts & Creativity", icon: "🎨", items: ["🎨 Visual art", "✍️ Writing", "📸 Photography", "🎬 Film making", "🎭 Theatre", "🖶 Crafts"] },
  { group: "🍳 Food & Drink", icon: "🍳", items: ["🍳 Cooking", "🌱 Baking", "☕ Coffee", "🍵 Tea", "🍷 Wine & drinks", "🌍 Food travel"] },
  { group: "🌍 Travel & Outdoors", icon: "🌍", items: ["✈️ Travel", "🏕️ Camping", "🌱 Gardening", "🐾 Nature walks", "🌊 Beach & sea"] },
  { group: "🎬 Screen & Gaming", icon: "🎬", items: ["🎬 Film", "📺 TV & series", "🎮 Gaming", "🎲 Board games", "📻 Podcasts"] },
  { group: "🌿 Lifestyle & Wellbeing", icon: "🌿", items: ["🧘 Meditation", "🌿 Wellness", "🐾 Animals & pets", "🌱 Sustainability", "🌍 Activism", "🧠 Personal growth"] },
  { group: "🖥️ Technology", icon: "🖥️", items: ["🖥️ Tech & gadgets", "💻 Coding", "🤖 AI & science", "🚀 Space"] },
];
const ALL_INTERESTS = INTEREST_GROUPS.flatMap(g => g.items);

const PROFILES = [];

const FREE_SWIPE_LIMIT = 5;

// ─── UTILITIES ─────────────────────────────────────────────────────────────── v2

const parseInterests = (interests) => {
  if (Array.isArray(interests)) return interests;
  if (!interests) return [];
  const s = String(interests).trim();
  if (s.startsWith("[")) { try { return JSON.parse(s); } catch(e) {} }
  return s.split(",").map(i => i.trim()).filter(Boolean);
};

const isRealProfile = (p) => typeof p.id === "string" && p.id.length > 10;

// Resize Supabase storage images on the fly — keeps bandwidth low on mobile
const resizePhoto = (url, width = 400) => {
  if (!url) return url;
  if (!url.includes("supabase.co/storage")) return url; // don't touch external URLs
  const base = url.split("?")[0];
  return `${base}?width=${width}&quality=80&resize=cover`;
};

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

// ─── PAYWALL ──────────────────────────────────────────────────────────────────

const Paywall = ({ onClose, onSubscribe, trigger = "generic", currentUser }) => {
  const [selected, setSelected] = useState("biannual");
  const triggerMessages = {
    swipes:   { icon: "💚", title: "You're out of daily likes!", sub: "Free members get 5 likes per day. Upgrade for unlimited." },
    wholiked: { icon: "👀", title: "See who liked you", sub: "12 people have already liked your profile. Find out who!" },
    rewind:   { icon: "↩️", title: "Oops! Undo that swipe", sub: "Upgrade to rewind your last swipe anytime." },
    notes:    { icon: "📝", title: "Keep private notes", sub: "Jot down anything you want to remember about a match — only you can ever see it." },
    generic:  { icon: "👑", title: "Upgrade to MeetFree Gold", sub: "Get the most out of your plant-based dating journey." },
  };
  const msg = triggerMessages[trigger] || triggerMessages.generic;
  const plans = [
    { id: "monthly",   label: "1 Month",   price: "£4.99", per: "/month",  badge: null },
    { id: "biannual",  label: "6 Months",  price: "£2.99", per: "/month",  badge: "Most popular" },
    { id: "annual",    label: "12 Months", price: "£1.99", per: "/month",  badge: "Best value" },
  ];
  const [activeFeature, setActiveFeature] = useState(null);
  const features = [
    { label: "💚 Unlimited daily likes", desc: "Like as many people as you want, no daily cap" },
    { label: "👀 See who liked you", desc: "View everyone who liked your profile before matching" },
    { label: "↩️ Unlimited rewinds", desc: "Changed your mind? Undo your last pass anytime" },
    { label: "🚀 1 free boost/week", desc: "Jump to the top of Discover for 24 hours" },
    { label: "⭐ 5 Super Likes/day", desc: "Stand out — they'll know you're especially keen" },
    { label: "🔍 Advanced filters", desc: "Filter by interests, postcode, age and more" },
    { label: "🚫 No ads, ever", desc: "A clean, ad-free experience throughout" },
    { label: "📍 Change location", desc: "Browse profiles in any UK city, not just yours" },
    { label: "📝 Private notes", desc: "Keep your own private notes on each match — never visible to anyone but you" },
  ];

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
            {features.map(f => <div key={f.label} onClick={() => setActiveFeature(activeFeature === f.label ? null : f.label)} style={{ fontSize: 12, color: theme.textDark, fontWeight: 500, cursor: "pointer" }}><span>{f.label}</span>{activeFeature === f.label && <div style={{ fontSize: 11, color: theme.textLight, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>}</div>)}
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

          <button onClick={() => { const plan = plans.find(p => p.id === selected); window.location.href=`mailto:hello@meetfree.uk?subject=MeetFree Gold - ${plan.label}&body=Hi, I would like to subscribe to MeetFree Gold (${plan.label} at ${plan.price}/month). My account email is: ${currentUser?.email || ""}`; }} style={{ width:"100%", padding:"15px 0", borderRadius:50, border:"none", background:`linear-gradient(135deg,${theme.greenDeep},${theme.greenMid})`, color:"white", fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, cursor:"pointer", boxShadow:"0 8px 24px rgba(45,106,79,0.3)" }}>✨ Start my Gold membership</button>

          <div style={{ marginTop: 14, marginBottom: 4 }}>
            <div style={sectionLabel}>Or buy individually</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ icon: "🚀", label: "Boost", desc: "24 hour top spot", price: "£1.99" }, { icon: "⭐", label: "Super Likes", desc: "Pack of 5", price: "£2.49" }, { icon: "↩️", label: "Rewind", desc: "Undo last swipe", price: "£0.99" }].map(item => (
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

const WhoLikedYou = ({ onUpgrade, currentUser, isPremium, onLikeBack, show, onDismiss }) => {
  const [likers, setLikers] = useState([]);
  const [likedBack, setLikedBack] = useState({});
  const [viewProfile, setViewProfile] = useState(null);

  const fetchLikers = async () => {
    if (!currentUser) return;
    supabase.from("likes").select("from_user").eq("to_user", currentUser.id).neq("from_user", currentUser.id)
      .then(async ({ data: likeRows, error }) => {
        if (error) { console.error("WhoLikedYou error:", error); return; }
        if (!likeRows?.length) { setLikers([]); return; }
        const ids = likeRows.map(r => r.from_user);
        const [{ data: profiles }, { data: alreadyLiked }] = await Promise.all([
          supabase.from("profiles").select("id,name,photo_url,age,city,postcode,bio,diet,interests,created_at,is_real,is_premium").in("id", ids),
          supabase.from("likes").select("to_user").eq("from_user", currentUser.id).in("to_user", ids),
        ]);
        setLikers(profiles || []);
        const alreadyLikedMap = {};
        (alreadyLiked || []).forEach(r => { alreadyLikedMap[r.to_user] = true; });
        setLikedBack(alreadyLikedMap);
      });
  };

  useEffect(() => {
    fetchLikers();
    const interval = setInterval(fetchLikers, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLikeBack = async (profile) => {
    if (likedBack[profile.id] || !currentUser) return;
    setLikedBack(prev => ({ ...prev, [profile.id]: true }));
    onLikeBack && onLikeBack(profile);
  };

  if (!show) return null;

  return (
    <div style={{ position:"absolute", inset:0, zIndex:250, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", maxHeight:"80%", overflowY:"auto" }}>
        <div style={{ padding:"16px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(82,183,136,0.1)" }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:"#1a3a2a" }}>
            {likers.length === 0 ? "No likes yet" : likers.length + " " + (likers.length === 1 ? "person has" : "people have") + " liked you"}
          </div>
          <button onClick={onDismiss} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#8fa58f" }}>x</button>
        </div>
        {likers.map((p, i) => (
          <div key={p.id} style={{ borderTop: i > 0 ? "1px solid rgba(82,183,136,0.08)" : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px" }}>
              <div onClick={(e) => { e.stopPropagation(); setViewProfile(viewProfile && viewProfile.id === p.id ? null : p); }} style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#d8f3dc,#b7e4c7)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, cursor:"pointer" }}>
                {p.photo_url ? <img src={p.photo_url} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "plant"}
              </div>
              <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => setViewProfile(viewProfile && viewProfile.id === p.id ? null : p)}>
                <div style={{ fontWeight:700, color:"#1a2418", fontSize:15 }}>{p.name}{p.age ? ", " + p.age : ""}</div>
                {p.city && <div style={{ fontSize:11, color:"#8fa58f" }}>{p.city}</div>}
              </div>
              <button onClick={() => handleLikeBack(p)} disabled={!!likedBack[p.id]} style={{ background: likedBack[p.id] ? "#52b788" : "#1a3a2a", color:"white", border:"none", borderRadius:50, padding:"6px 14px", fontSize:12, fontWeight:700, cursor: likedBack[p.id] ? "default" : "pointer", fontFamily:"DM Sans,sans-serif", flexShrink:0 }}>
                {likedBack[p.id] ? "Liked back" : "Like back"}
              </button>
            </div>
            {viewProfile && viewProfile.id === p.id && (
              <div style={{ padding:"0 20px 14px", background:"rgba(82,183,136,0.04)" }}>
                {p.bio && <p style={{ fontSize:13, color:"#4a5e4a", lineHeight:1.6, marginBottom:8 }}>{p.bio}</p>}
                {p.diet && <span style={{ background:"#1a3a2a", color:"white", fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:50, marginRight:6 }}>{p.diet}</span>}
                {parseInterests(p.interests).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                    {parseInterests(p.interests).map(i => <span key={i} style={{ background:"rgba(82,183,136,0.1)", color:"#2d6a4f", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:50 }}>{i}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{ padding:"12px 20px 28px" }}>
          <button onClick={onDismiss} style={{ width:"100%", padding:"12px 0", borderRadius:50, border:"2px solid rgba(82,183,136,0.25)", background:"transparent", color:"#1a3a2a", fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── SOUNDS ──────────────────────────────────────────────────────────────────

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    if (type === "send") {
      o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start(); o.stop(ctx.currentTime + 0.15);
    } else if (type === "receive") {
      o.frequency.setValueAtTime(500, ctx.currentTime);
      o.frequency.setValueAtTime(700, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.25);
    } else if (type === "match") {
      o.type = "sine";
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      o.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
    }
  } catch(e) {}
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

const PhoneShell = ({ children, statusBar = true }) => (
  <div style={{ width: isMobile ? "100vw" : 390, height: isMobile ? "100dvh" : "auto", minHeight: isMobile ? "100dvh" : 844, maxHeight: isMobile ? "100dvh" : 844, background: theme.warmWhite, borderRadius: isMobile ? 0 : 44, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", fontFamily: "'DM Sans',sans-serif", boxShadow: isMobile ? "none" : "0 40px 100px rgba(26,58,42,0.25), 0 0 0 1px rgba(26,58,42,0.08)", overscrollBehavior: "none", paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0 }}>
    {statusBar && !isMobile && (
      <div style={{ background: theme.warmWhite, padding: "14px 28px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.textDark }}>9:41</span>
        <div style={{ width: 120, height: 30, background: "#111", borderRadius: 20, margin: "0 auto" }} />
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span style={{ fontSize: 11 }}>●●●</span><span style={{ fontSize: 13, fontWeight: 600 }}>📶</span></div>
      </div>
    )}
    <div style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column" }}>{children}</div>
  </div>
);

const BottomNav = ({ active, onNav, isPremium, unreadCount = 0 }) => (
  <div style={{ display: "flex", borderTop: `1px solid rgba(82,183,136,0.15)`, background: "rgba(253,250,245,0.97)", backdropFilter: "blur(12px)", padding: "8px 0 20px", flexShrink: 0 }}>
    {[{ id: "swipe", icon: "💚", label: "Discover" }, { id: "chat", icon: "💬", label: "Messages" }, { id: "profile", icon: "🌿", label: "Profile" }, { id: "settings", icon: "⚙️", label: "Settings" }].map(t => (
      <button key={t.id} onClick={() => onNav(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" }}>
        <div style={{ position: "relative" }}><span style={{ fontSize: 22 }} className={t.id === "chat" && unreadCount > 0 ? "bell-active" : ""}>{t.icon}</span>{t.id === "chat" && unreadCount > 0 && (<div style={{ position: "absolute", top: -4, right: -6, background: theme.accent, color: "white", fontSize: 9, fontWeight: 700, borderRadius: 50, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unreadCount > 9 ? "9+" : unreadCount}</div>)}</div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: active === t.id ? theme.greenMid : theme.textLight, textTransform: "uppercase" }}>{t.label}</span>
        {active === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: theme.greenBright }} />}
      </button>
    ))}
  </div>
);


// ─── INTEREST PICKER ─────────────────────────────────────────────────────────

const InterestPicker = ({ selected, onChange, max = 5, onMaxReached }) => {
  const [openGroup, setOpenGroup] = useState(null);
  const [localSelected, setLocalSelected] = useState(selected);
  const [showMaxMsg, setShowMaxMsg] = useState(false);
  const handleChange = (newSelected) => { setLocalSelected(newSelected); onChange(newSelected); };
  
  return (
    <div>
      {INTEREST_GROUPS.map(g => {
        const isOpen = openGroup === g.group;
        const groupSelected = g.items.filter(i => (selected || localSelected).some(s => s.replace(/[^\w\s&]/g, "").trim().toLowerCase() === i.replace(/[^\w\s&]/g, "").trim().toLowerCase()));
        return (
          <div key={g.group} style={{ marginBottom: 6 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpenGroup(isOpen ? null : g.group); }} style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:"2px solid " + (groupSelected.length > 0 ? "#95d5b2" : "rgba(82,183,136,0.2)"), background: groupSelected.length > 0 ? "rgba(82,183,136,0.08)" : "white", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
              <span style={{ fontSize:14, fontWeight:600, color:"#1a2418" }}>{g.icon} {g.group.replace(/^[^\s]+ /, "")}</span>
              <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                {groupSelected.length > 0 && <span style={{ fontSize:11, background:"#95d5b2", color:"white", borderRadius:50, padding:"1px 8px", fontWeight:700 }}>{groupSelected.length}</span>}
                <span style={{ color:"#8fa58f", fontSize:16 }}>{isOpen ? "▲" : "▼"}</span>
              </span>
            </button>
            {isOpen && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:7, padding:"10px 4px 4px" }}>
                {g.items.map(i => {
                  const active = localSelected.includes(i);
                  const atMax = localSelected.length >= max;
                  return (
                    <button key={i} type="button" onClick={(e) => { e.stopPropagation(); if (active) handleChange(localSelected.filter(x => x !== i)); else if (!atMax) handleChange([...localSelected, i]); else { setShowMaxMsg(true); setTimeout(() => setShowMaxMsg(false), 3000); if (onMaxReached) onMaxReached(); } }} style={{ padding:"6px 12px", borderRadius:50, border:"2px solid " + (active ? "#1a3a2a" : "rgba(82,183,136,0.2)"), background:active ? "#1a3a2a" : "white", color:active ? "white" : atMax && !active ? "#8fa58f" : "#4a5e4a", fontSize:12, fontWeight:600, cursor: atMax && !active ? "default" : "pointer", fontFamily:"inherit", opacity: atMax && !active ? 0.5 : 1 }}>{i}</button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize:12, color: localSelected.length >= max ? theme.accent : theme.textLight, marginTop:8, textAlign:"right" }}>{localSelected.length}/{max} selected</div>
      {showMaxMsg && onMaxReached && (
        <div style={{ marginTop:8, padding:"10px 14px", background:"linear-gradient(135deg,rgba(244,168,41,0.1),rgba(244,168,41,0.05))", border:"1px solid rgba(244,168,41,0.3)", borderRadius:12, fontSize:13, color:theme.greenDeep, textAlign:"center" }}>
          ⭐ Upgrade to <strong>Gold</strong> to add up to 10 interests
        </div>
      )}
    </div>
  );
};

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

const SignInForm = ({ onSuccess, onClose, message }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError("Incorrect email or password. If you've recently changed your password, try the new one — or use Forgot password below."); return; }
    onSuccess(data.user);
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address first."); return; }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://app.meetfree.uk",
    });
    setLoading(false);
    if (resetError) { setError("Could not send reset email. Please try again."); return; }
    setResetSent(true);
  };

  if (resetSent) return (
    <div style={{ textAlign:"center", padding:"12px 0" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
      <div style={{ fontFamily:"Georgia,serif", fontSize:18, color:theme.greenDeep, marginBottom:8 }}>Check your inbox</div>
      <p style={{ color:theme.textMid, fontSize:13, lineHeight:1.6, marginBottom:20 }}>We've sent a password reset link to <strong>{email}</strong>.</p>
      <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:50, border:"2px solid rgba(82,183,136,0.2)", background:"none", color:theme.textMid, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Close</button>
    </div>
  );

  return (
    <div>
      {message && <p style={{ fontSize:13, color:theme.greenDeep, background:"rgba(82,183,136,0.1)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontWeight:600 }}>{message}</p>}
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && !forgotMode && handleSignIn()} placeholder="your@email.com" style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
      </div>
      {!forgotMode && (
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Password</label>
          <div style={{ position:"relative" }}>
            <input key={showPw ? "si-text" : "si-pw"} type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} placeholder="Your password" style={{ width:"100%", padding:"12px 44px 12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{showPw ? "Hide" : "Show"}</button>
          </div>
        </div>
      )}
      {error && <div style={{ color:theme.accent, fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(224,122,95,0.08)", borderRadius:8 }}>{error}</div>}
      {!forgotMode ? (
        <>
          <button onClick={handleSignIn} disabled={loading} style={{ width:"100%", padding:"14px", borderRadius:50, border:"none", background:theme.greenDeep, color:"white", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:10, opacity:loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign in 🌱"}
          </button>
          <button onClick={() => { setForgotMode(true); setError(""); }} style={{ width:"100%", padding:"10px", borderRadius:50, border:"none", background:"none", color:theme.greenMid, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>
            Forgot password?
          </button>
        </>
      ) : (
        <>
          <button onClick={handleForgotPassword} disabled={loading} style={{ width:"100%", padding:"14px", borderRadius:50, border:"none", background:theme.greenDeep, color:"white", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:10, opacity:loading ? 0.7 : 1 }}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <button onClick={() => { setForgotMode(false); setError(""); }} style={{ width:"100%", padding:"10px", borderRadius:50, border:"none", background:"none", color:theme.textMid, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>
            ← Back to sign in
          </button>
        </>
      )}
      <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:50, border:"2px solid rgba(82,183,136,0.2)", background:"none", color:theme.textMid, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
        Cancel
      </button>
    </div>
  );
};

const Onboarding = ({ onFinish, onShowSignIn, onClearSignupError }) => {
  const [step, setStep] = useState(0);
  useEffect(() => { if (onClearSignupError) onClearSignupError(); }, [step]);
  const [data, setData] = useState({ diet: "Vegan", name: "", age: "", city: "", postcode: "", bio: "", interests: [], lookingFor: "", email: "", password: "", smoker: false });
  const [uploading, setUploading] = useState(false);
  const [showGold, setShowGold] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");
  const steps = [
    () => (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "1rem 2rem", textAlign: "center" }}>
        <img src="/meetfree-logo.png" alt="MeetFree" style={{ width:"100%", maxWidth:320, borderRadius:12, marginBottom:16 }} />
        <p style={{ color: theme.textMid, fontSize: 14, lineHeight: 1.5, maxWidth: 280, marginBottom: 24 }}>Connect with like-minded people who care — about animals, the planet, and each other.</p>
 <div style={{ width:"100%", marginBottom:16, background:"rgba(82,183,136,0.08)", borderRadius:16, padding:"16px", border:"1px solid rgba(82,183,136,0.2)", textAlign:"center" }}>
  <div style={{ fontSize:15, fontWeight:700, color:theme.greenDeep, marginBottom:6 }}>🎉 First 100 sign-ups get 3 months FREE Gold access!</div>
  <div style={{ fontSize:13, color:theme.textMid }}>Join today — it's completely free 🌱</div>
</div>
<button onClick={() => setStep(1)} style={btnPrimary}>Get started →</button>
        <p style={{ marginTop: 16, color: theme.textLight, fontSize: 13 }}>Already have an account? <span onClick={onShowSignIn} style={{ color: theme.greenMid, fontWeight: 600, cursor: "pointer" }}>Sign in</span></p>
        <p onClick={() => setShowGold(true)} style={{ marginTop: 8, color: theme.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>👑 Learn about Gold membership</p>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem" }}>
        <button onClick={() => setStep(0)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0 }}>← Back</button>
        <ProgressBar step={1} total={7} />
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
      <div style={{ flex:1, padding:"2rem", overflowY:"auto" }}>
        <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0 }}>← Back</button>
        <ProgressBar step={2} total={7} />
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
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <button onClick={() => { setOnboardingError(""); setStep(2); }} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0 }}>← Back</button>
        <ProgressBar step={3} total={7} />
        <h2 style={heading}>Tell us about <span style={{ color: theme.greenBright, fontStyle: "italic" }}>you</span></h2>
        <p style={subText}>Your profile info</p>
        {[{ label: "First name", key: "name", placeholder: "e.g. Sophie", type: "text" }, { label: "Age", key: "age", placeholder: "e.g. 28", type: "number", min: 18, max: 100 }, { label: "Postcode area", key: "postcode", placeholder: "e.g. BH, SO, SW1", type: "text" }, { label: "Email", key: "email", placeholder: "your@email.com", type: "email" }].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.textMid, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} min={f.min} max={f.max} value={data[f.key]} onChange={e => setData(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: theme.textMid, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password</label>
          <div style={{ position:"relative" }}>
            <input type={data.showPassword ? "text" : "password"} placeholder="At least 8 characters" value={data.password} onChange={e => setData(p => ({ ...p, password: e.target.value }))} style={{ ...inputStyle, paddingRight: 44 }} />
            <button type="button" onClick={() => setData(p => ({ ...p, showPassword: !p.showPassword }))} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{data.showPassword ? "Hide" : "Show"}</button>
          </div>
          <div style={{ fontSize:11, color:theme.textLight, marginTop:6, lineHeight:1.5 }}>Must be 8+ characters with at least one lowercase letter, one UPPERCASE letter, one number, and one symbol (e.g. <strong>Plant1!</strong>)</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: theme.textMid, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Confirm Password</label>
          <div style={{ position:"relative" }}>
            <input type={data.showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" value={data.confirmPassword || ""} onChange={e => setData(p => ({ ...p, confirmPassword: e.target.value }))} style={{ ...inputStyle, paddingRight: 44, borderColor: data.confirmPassword && data.confirmPassword !== data.password ? theme.accent : undefined }} />
            <button type="button" onClick={() => setData(p => ({ ...p, showConfirmPassword: !p.showConfirmPassword }))} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{data.showConfirmPassword ? "Hide" : "Show"}</button>
          </div>
          {data.confirmPassword && data.confirmPassword !== data.password && <div style={{ fontSize:11, color:theme.accent, marginTop:4 }}>Passwords don't match</div>}
        </div>
        <div style={{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(82,183,136,0.06)", borderRadius:12, padding:"12px 16px" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:theme.textDark }}>Do you smoke?</div>
            <div style={{ fontSize:12, color:theme.textLight, marginTop:2 }}>This helps match preferences</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setData(p => ({ ...p, smoker: false }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${!data.smoker ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: !data.smoker ? theme.greenBright : "white", color: !data.smoker ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>No</button>
            <button onClick={() => setData(p => ({ ...p, smoker: true }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${data.smoker ? theme.accent : "rgba(82,183,136,0.2)"}`, background: data.smoker ? theme.accent : "white", color: data.smoker ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Yes</button>
          </div>
        </div>
        {onboardingError && <div style={{ color:"#e05a5a", fontSize:13, padding:"10px 14px", background:"rgba(224,90,90,0.1)", borderRadius:10, marginBottom:12 }}>{onboardingError}</div>}
        <button onClick={() => {
          setOnboardingError("");
          if (!data.name.trim()) { setOnboardingError("Please enter your first name."); return; }
          const age = parseInt(data.age);
          if (!data.age || isNaN(age) || age < 18 || age > 100) { setOnboardingError("Please enter a valid age (18–100)."); return; }
          if (data.postcode && !/^[A-Z]{1,2}/.test(data.postcode.toUpperCase().trim())) { setOnboardingError("Please enter a valid UK postcode area (e.g. SP, SO, SW1, BH)."); return; }
          if (!data.email.trim()) { setOnboardingError("Please enter your email address."); return; }
          const pwd = data.password || "";
          if (pwd.length < 8) { setOnboardingError("Password must be at least 8 characters."); return; }
          if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) { setOnboardingError("Password must include a lowercase letter, an UPPERCASE letter, a number, and a symbol (e.g. Plant1!)."); return; }
          if (data.password !== data.confirmPassword) { setOnboardingError("Passwords don't match — please check and try again."); return; }
          setStep(4);
        }} style={{ ...btnPrimary, marginTop: 8 }}>Continue →</button>
      </div>
    ),

    () => (
      <div style={{ flex: 1, padding: "2rem" }}>
        <button onClick={() => setStep(3)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0 }}>← Back</button>
        <ProgressBar step={4} total={7} />
        <h2 style={heading}>About <span style={{ color: theme.greenBright, fontStyle: "italic" }}>you</span></h2>
        <p style={subText}>A short bio helps you get more matches</p>
        <div style={{ fontSize:11, color:theme.textLight, marginBottom:4 }}>Max 300 characters</div>
        <textarea
          placeholder="e.g. Vegan chef, dog lover and hiking enthusiast. Looking for someone to explore plant-based restaurants with! 🌱"
          value={data.bio}
          onChange={e => setData(p => ({ ...p, bio: e.target.value.slice(0, 300) }))}
          rows={5}
          style={{ ...inputStyle, resize: "none", fontSize: 14, lineHeight: 1.6 }}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: (data.bio || "").length > 270 ? theme.accent : theme.textLight, marginTop: 4 }}>{300 - (data.bio || "").length} characters remaining</div>
        <button onClick={() => setStep(5)} style={{ ...btnPrimary, marginTop: 16 }}>Continue →</button>
        <button onClick={() => setStep(5)} style={{ ...btnGhost, marginTop: 10 }}>Skip for now</button>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <button onClick={() => setStep(4)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0 }}>← Back</button>
        <ProgressBar step={5} total={7} />
        <h2 style={heading}>What are you <span style={{ color: theme.greenBright, fontStyle: "italic" }}>into?</span></h2>
        <p style={subText}>Pick up to 5 interests — tap a category to expand</p>
        <InterestPicker selected={data.interests} onChange={interests => setData(p => ({ ...p, interests }))} max={5} />
        <button onClick={() => setStep(6)} style={{ ...btnPrimary, marginTop: 24 }}>Continue →</button>
      </div>
    ),
    () => (
      <div style={{ flex: 1, padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <button onClick={() => setStep(5)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0, alignSelf:"flex-start" }}>← Back</button>
        <ProgressBar step={5} total={7} />
        <div style={{ fontSize: 72, marginBottom: 16 }}>📸</div>
        <h2 style={{ ...heading, textAlign: "center" }}>Add your <span style={{ color: theme.greenBright, fontStyle: "italic" }}>photo</span></h2>
        <p style={{ ...subText, textAlign: "center", marginBottom: 4 }}>Profiles with photos get 8× more matches</p>
        <p style={{ fontSize:12, color:theme.textLight, textAlign:"center", marginBottom:4 }}>A photo of yourself works best — but a pet, favourite place or something that represents you is fine too 🌱</p>
        <p style={{ fontSize:12, color:theme.textLight, textAlign:"center", marginBottom:12 }}>You can add up to 5 photos once you've signed up</p>
        <label style={{ cursor:"pointer" }}>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: data.photoPreview ? "transparent" : "linear-gradient(135deg,rgba(82,183,136,0.15),rgba(149,213,178,0.1))", border: `3px dashed rgba(82,183,136,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 12, overflow:"hidden" }}>
            {data.photoPreview ? <img src={data.photoPreview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "➕"}
          </div>
          <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
            const file = e.target.files[0];
            if (file) {
              setData(p => ({ ...p, photoFile: file, photoPreview: URL.createObjectURL(file) }));
            }
          }} />
        </label>
        {data.photoPreview && <div style={{ fontSize:13, color:theme.greenMid, fontWeight:600, marginBottom:8 }}>✓ Photo selected</div>}
        <button onClick={() => setStep(7)} style={btnPrimary}>Continue →</button>
        <button onClick={() => setStep(7)} style={{ ...btnGhost, marginTop: 12 }}>Skip for now</button>
      </div>
    ),
    () => (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 24px", flex:1 }}>
        <button onClick={() => setStep(6)} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:8, fontFamily:"'DM Sans',sans-serif", padding:0, alignSelf:"flex-start" }}>← Back</button>
        <ProgressBar step={6} total={7} />
        <div style={{ fontSize:72, marginBottom:16 }}>🌍</div>
        <h2 style={{ ...heading, textAlign:"center" }}>One last thing</h2>
        <p style={{ ...subText, textAlign:"center", marginBottom:24 }}>How did you hear about MeetFree?</p>
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
          {["Instagram", "Facebook", "Google search", "Friend / word of mouth", "Vegan Facebook group", "Reddit", "Other", "Prefer not to say"].map(option => (
            <button key={option} onClick={() => setData(p => ({ ...p, referralSource: option }))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:`2px solid ${data.referralSource === option ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: data.referralSource === option ? "rgba(82,183,136,0.1)" : "white", color: data.referralSource === option ? theme.greenDeep : theme.textMid, fontWeight: data.referralSource === option ? 700 : 400, fontSize:14, cursor:"pointer", textAlign:"left", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
              {data.referralSource === option ? "✓ " : ""}{option}
            </button>
          ))}
        </div>
        {onboardingError && <div style={{ color:"#e05a5a", fontSize:13, padding:"10px 14px", background:"rgba(224,90,90,0.1)", borderRadius:10, marginBottom:12, textAlign:"center" }}>{onboardingError}</div>}
        <button onClick={() => { setOnboardingError(""); if (!data.email) { setOnboardingError("Please go back and enter your email address."); return; } const pwd = data.password || ""; if (pwd.length < 8 || !/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) { setOnboardingError("Please go back and check your password meets the requirements (8+ chars, upper, lower, number, symbol)."); return; } if (data.password !== data.confirmPassword) { setOnboardingError("Passwords don't match — please go back and check."); return; } onFinish(data).catch(e => setOnboardingError("Something went wrong: " + e.message)); }} style={btnPrimary}>Let's go! 🌱</button>
        <button onClick={() => { setOnboardingError(""); if (!data.email) { setOnboardingError("Please go back and enter your email address."); return; } const pwd = data.password || ""; if (pwd.length < 8 || !/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) { setOnboardingError("Please go back and check your password meets the requirements (8+ chars, upper, lower, number, symbol)."); return; } onFinish(data).catch(e => setOnboardingError("Something went wrong: " + e.message)); }} style={{ ...btnGhost, marginTop:12 }}>Skip</button>
      </div>
    ),
  ];
  return (
    <PhoneShell statusBar={false}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.warmWhite, overflowY: "auto" }}>{steps[step]()}</div>
      {showGold && <Paywall trigger="generic" onClose={() => setShowGold(false)} onSubscribe={() => setShowGold(false)} />}
    </PhoneShell>
  );
};

const ProgressBar = ({ step, total }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
    {Array.from({ length: total }).map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? theme.greenBright : "rgba(82,183,136,0.15)", transition: "background 0.3s" }} />)}
  </div>
);

// ─── PROFILE CARD ─────────────────────────────────────────────────────────────

const ProfileCard = ({ p, onLike, onPass, onSuperLike, likedProfiles, matchedIds = [], onMessage, isPremium, superLikedProfiles = {}, likesLeft }) => {
  const isReal = isRealProfile(p);
  const key = "supabase_" + p.id;
  const isLiked = likedProfiles[key] || false;
  const isSuperLiked = superLikedProfiles[key] || false;
  const isMatched = isReal && matchedIds.includes(p.id);
  const diet = p.diet || "Vegan";
  const interests = parseInterests(p.interests);

  const photos = (() => {
    const arr = Array.isArray(p.photos) ? p.photos : (p.photos ? (() => { try { return JSON.parse(p.photos); } catch(e) { return []; } })() : []);
    if (arr.length > 0) return arr;
    if (p.photo_url) return [p.photo_url];
    return [];
  })();
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef(null);
  const handlePhotoTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handlePhotoTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 30) return;
    if (dx < 0 && photoIdx < photos.length - 1) setPhotoIdx(i => i + 1);
    if (dx > 0 && photoIdx > 0) setPhotoIdx(i => i - 1);
  };

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,0.10)", background: "white", marginBottom: 22 }}>
      <div onTouchStart={handlePhotoTouchStart} onTouchEnd={handlePhotoTouchEnd} style={{ height: 220, background: "linear-gradient(135deg,#d8f3dc,#b7e4c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 90, position: "relative", overflow:"hidden" }}>
        {photos.length > 0
          ? <img src={resizePhoto(photos[photoIdx], 600)} alt={p.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} onLoad={e => { e.target.style.opacity=1; }} style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0, transition:"opacity 0.3s" }} />
          : null}
        {photos.length > 0
          ? <span style={{ zIndex:1, display:"none", fontSize:90 }}>{p.emoji || "🌿"}</span>
          : <span style={{ zIndex:1 }}>{p.emoji || "🌿"}</span>
        }
        <div style={{ position:"absolute", top:10, right:10, background:theme.greenDeep, color:"white", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:50, zIndex:2 }}>
          {diet === "Vegan" ? "🌱" : "🥗"} {diet}
        </div>
        {p.boosted_until && new Date(p.boosted_until) > new Date() && (
          <div style={{ position:"absolute", top:10, left:10, background:"linear-gradient(135deg,#f4a829,#e07a5f)", color:"white", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:50, zIndex:2 }}>🚀 Boosted</div>
        )}
        {photos.length > 1 && (
          <>
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"40%", zIndex:3, cursor:"pointer" }} onClick={() => setPhotoIdx(i => Math.max(0, i - 1))} />
            <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"40%", zIndex:3, cursor:"pointer" }} onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))} />
            {photoIdx > 0 && (
              <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.max(0, i - 1)); }} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(255,255,255,0.85)", border:"none", borderRadius:"50%", width:28, height:28, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.2)", lineHeight:1 }}>‹</button>
            )}
            {photoIdx < photos.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setPhotoIdx(i => Math.min(photos.length - 1, i + 1)); }} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(255,255,255,0.85)", border:"none", borderRadius:"50%", width:28, height:28, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.2)", lineHeight:1 }}>›</button>
            )}
            <div style={{ position:"absolute", bottom:8, left:0, right:0, display:"flex", justifyContent:"center", gap:5, zIndex:4 }}>
              {photos.map((_, i) => (
                <div key={i} onClick={() => setPhotoIdx(i)} style={{ width: i === photoIdx ? 18 : 6, height:6, borderRadius:3, background: i === photoIdx ? "white" : "rgba(255,255,255,0.5)", transition:"all 0.2s", cursor:"pointer" }} />
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep, marginBottom:2, display:"flex", alignItems:"center", gap:6 }}>{p.name || "Someone"}{p.age ? `, ${p.age}` : ""}{p.is_real && <span title="Verified real person" style={{ fontSize:14, lineHeight:1 }}>✅</span>}{p.created_at && (Date.now() - new Date(p.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 && <span style={{ fontSize:11, background:"linear-gradient(135deg,#52b788,#2d6a4f)", color:"white", borderRadius:50, padding:"2px 8px", fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>New 🌱</span>}</div>
        <div style={{ fontSize:12, color:theme.textMid, marginBottom:4 }}>📍 {p.postcode || p.city || "Somewhere"}</div>
        {lastSeenText(p.last_seen) && <div style={{ fontSize:11, color: lastSeenText(p.last_seen).color, marginBottom:6, fontWeight:600 }}>{lastSeenText(p.last_seen).text}</div>}
        {p.bio && <p style={{ fontSize:13, color:theme.textMid, lineHeight:1.7, marginBottom:10 }}>{p.bio}</p>}
        {interests.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
            {interests.map(int => <span key={int} style={{ background:"rgba(82,183,136,0.1)", color:theme.greenMid, fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:50 }}>{String(int).trim()}</span>)}
          </div>
        )}
        {isLiked ? (
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, padding:"13px", borderRadius:50, border:`2px solid ${theme.greenBright}`, background:theme.greenBright, color:"white", fontSize:14, fontWeight:700, textAlign:"center" }}>✓ Liked</div>
            <button
              onClick={() => onMessage && onMessage(p)}
              style={{ flex:2, padding:"13px", borderRadius:50, border:"none", background:isMatched ? theme.greenMid : theme.textLight, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
            >{isMatched ? `💬 Message ${p.name}` : `⏳ Waiting on ${p.name}`}</button>
          </div>
        ) : isPremium && onSuperLike && !isSuperLiked ? (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => onPass && onPass(p)} style={{ flex:1, padding:"13px 0", borderRadius:50, border:"2px solid rgba(82,183,136,0.15)", background:"white", color:theme.textLight, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✕ Pass</button>
            <button onClick={() => onSuperLike(p)} style={{ flex:1, padding:"13px 0", borderRadius:50, border:"2px solid #f4a829", background:"white", color:"#f4a829", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>⭐ Super</button>
            <button onClick={() => onLike(p)} style={{ flex:1, padding:"13px 0", borderRadius:50, border:"2px solid rgba(82,183,136,0.25)", background:"white", color:theme.greenMid, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>💚 Like</button>
          </div>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            {!isPremium && likesLeft !== undefined && <div style={{ width:"100%", textAlign:"center", fontSize:11, color:theme.textLight, marginBottom:4, position:"absolute", top:-18, left:0 }}>{likesLeft} free {likesLeft === 1 ? "like" : "likes"} remaining today</div>}
            <button
              onClick={() => onPass && onPass(p)}
              style={{ flex:1, padding:"13px", borderRadius:50, border:"2px solid rgba(82,183,136,0.15)", background:"white", color:theme.textLight, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}
            >✕ Pass</button>
            <button
              onClick={() => onLike(p)}
              style={{ flex:2, padding:"13px", borderRadius:50, border:"2px solid rgba(82,183,136,0.25)", background:"white", color:theme.greenMid, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}
            >💚 Like {p.name || "them"}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DISCOVER SCREEN (full list style) ───────────────────────────────────────


const handleShare = () => {
  const text = "I'm on MeetFree — the free dating & friendship app for plant-based people in the UK! Join me at meetfree.uk 🌱";
  if (navigator.share) {
    navigator.share({ title: "MeetFree", text, url: "https://meetfree.uk" }).catch(() => {});
  } else {
    try { navigator.clipboard.writeText("https://meetfree.uk"); alert("Link copied to clipboard!"); } catch(e) {}
  }
};

const getConversationStarters = (myInterests, theirInterests) => {
  const shared = (myInterests || []).filter(i => (theirInterests || []).map(t => t.toLowerCase()).includes(i.toLowerCase()));
  const starters = {
    "Hiking": "What's your favourite trail you've hiked? 🥾",
    "Yoga": "How long have you been practising yoga? 🧘",
    "Cooking": "What's your go-to recipe to impress someone? 🍳",
    "Travel": "What's the best place you've ever visited? ✈️",
    "Reading": "What book has changed your life? 📚",
    "Music": "What's your favourite gig you've ever been to? 🎵",
    "Running": "Do you prefer road or trail running? 🏃",
    "Cycling": "What's the longest ride you've done? 🚴",
    "Gardening": "What's growing in your garden right now? 🌱",
    "Photography": "What's your favourite subject to photograph? 📷",
    "Football": "Who's your team? ⚽",
    "Swimming": "Pool or open water? 🏊",
    "Singing": "Do you sing in a choir or just the shower? 🎤",
    "Art": "What medium do you work in? 🎨",
    "Cinema": "What's the last film that really moved you? 🎬",
    "Poetry": "Do you have a favourite poet? 📝",
    "Tea": "Builder's or fancy loose leaf? ☕",
    "Coffee": "Flat white or oat latte? ☕",
  };
  const suggestions = [];
  for (const interest of shared) {
    const key = Object.keys(starters).find(k => interest.toLowerCase().includes(k.toLowerCase()));
    if (key && !suggestions.find(s => s === starters[key])) suggestions.push(starters[key]);
    if (suggestions.length >= 3) break;
  }
  if (suggestions.length === 0) {
    suggestions.push("What's your favourite plant-based meal? 🌿", "How long have you been plant-based? 💚", "What made you go plant-based? 🌱");
  }
  return suggestions.slice(0, 3);
};

const lastSeenText = (lastSeen) => {
  if (!lastSeen) return null;
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 5) return { text: "🟢 Active now", color: "#52b788" };
  if (hours < 1) return { text: "🟢 Active today", color: "#52b788" };
  if (hours < 24) return { text: "🟡 Active today", color: "#f4a829" };
  if (days < 7) return { text: "🟡 Active this week", color: "#f4a829" };
  return { text: "⚪ Active recently", color: "#aaa" };
};

const SwipeScreen = ({ onNav, isPremium, onUpgrade, onSubscribe, currentUser, likedProfiles, setLikedProfiles, passedProfilesDB = {}, blockedUsers = {}, onLogout, onOpenChat, unreadCount = 0 }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const liked = likedProfiles;
  const setLiked = setLikedProfiles;
  const [matchPopup, setMatchPopup] = useState(null);
  const [waitingPopup, setWaitingPopup] = useState(null);
  const [paywallTrigger, setPaywallTrigger] = useState(null);
  const [likesLeft, setLikesLeft] = useState(() => {
    if (!window.localStorage) return FREE_SWIPE_LIMIT;
    const key = "meetfree_likes_" + new Date().toDateString();
    const stored = localStorage.getItem(key);
    // Clear old keys
    Object.keys(localStorage).filter(k => k.startsWith("meetfree_likes_") && k !== key).forEach(k => localStorage.removeItem(k));
    return stored !== null ? Math.max(0, parseInt(stored)) : FREE_SWIPE_LIMIT;
  });
  const [matchedIds, setMatchedIds] = useState([]);
  const [matchRecords, setMatchRecords] = useState([]); // cached full match rows
  const [passedProfiles, setPassedProfiles] = useState({});
  const [undoToast, setUndoToast] = useState(null);
  const [messageComposer, setMessageComposer] = useState(null);
  const [composerText, setComposerText] = useState("");
  const [likedRealProfiles, setLikedRealProfiles] = useState([]); // full profile objects for liked section
  const [showFilters, setShowFilters] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [lastPassed, setLastPassed] = useState(null);
  const [rewindToast, setRewindToast] = useState(false);
  const [superLikedProfiles, setSuperLikedProfiles] = useState({});
  const [superLikesToday, setSuperLikesToday] = useState(0);
  const [newLikesCount, setNewLikesCount] = useState(0);
  const [userPostcode, setUserPostcode] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [showGoldBanner, setShowGoldBanner] = useState(false);
  useEffect(() => {
    if (!currentUser || !isPremium) return;
    const key = "meetfree_gold_banner_" + currentUser.id;
    if (!localStorage.getItem(key)) { setShowGoldBanner(true); localStorage.setItem(key, "1"); }
  }, [currentUser, isPremium]);
  useEffect(() => { if (currentUser) setShowTip(!localStorage.getItem("meetfree_tip_seen_" + currentUser.id)); }, [currentUser]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [filters, setFilters] = useState({ diet: "", lookingFor: "", ageMin: "", ageMax: "", postcode: "", interests: [], noSmokers: false });
  const [activeFilters, setActiveFilters] = useState({ diet: "", lookingFor: "", ageMin: "", ageMax: "", postcode: "", interests: [], noSmokers: false });

  useEffect(() => {
    if (!currentUser) return;
    // Load profile to check completeness
    supabase.from("profiles").select("photo_url, bio, postcode, interests, name").eq("id", currentUser.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setProfileData(data);
      const missing = !data.photo_url || !data.bio || !data.postcode || !data.interests || data.interests === "[]" || data.interests === "";
      const dismissed = localStorage.getItem("meetfree_checklist_dismissed_" + currentUser.id);
      if (missing && !dismissed) setShowChecklist(true);
    });
    // Show push prompt once if not already subscribed/dismissed
    const pushDismissed = localStorage.getItem("meetfree_push_prompt_" + currentUser.id);
    if (!pushDismissed && "Notification" in window && Notification.permission === "default") {
      setTimeout(() => setShowPushPrompt(true), 3000);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isPremium) return;
    const key = "meetfree_likes_" + new Date().toDateString();
    localStorage.setItem(key, String(likesLeft));
  }, [likesLeft, isPremium]);

  useEffect(() => {
    const handler = () => setActiveFilters(f => ({ ...f }));
    window.addEventListener("meetfree_location_changed", handler);
    return () => window.removeEventListener("meetfree_location_changed", handler);
  }, []);

  useEffect(() => {
    const loadMatches = async () => {
      if (!currentUser) return;
      const { data } = await supabase.from("matches").select("*").or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`);
      if (data) {
        const ids = data.map(m => m.user1 === currentUser.id ? m.user2 : m.user1);
        setMatchedIds(ids);
        setMatchRecords(data);
      }
    };
    loadMatches();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    supabase.from("profiles").select("postcode").eq("id", currentUser.id).maybeSingle().then(({ data }) => {
      if (data?.postcode) setUserPostcode(data.postcode.toUpperCase().trim());
    });

  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const checkNewLikes = async () => {
      const lastVisited = localStorage.getItem("meetfree_liked_me_visited_" + currentUser.id) || "2000-01-01";
      const { data: likeRows } = await supabase.from("likes").select("from_user").eq("to_user", currentUser.id).neq("from_user", currentUser.id).gt("created_at", lastVisited);
      const { data: likedBack } = await supabase.from("likes").select("to_user").eq("from_user", currentUser.id);
      const likedBackIds = new Set((likedBack || []).map(r => r.to_user));
      const realCount = (likeRows || []).filter(r => !likedBackIds.has(r.from_user)).length;

      const lastVisitedTime = localStorage.getItem("meetfree_liked_me_visited_" + currentUser.id) || "2000-01-01";
      setNewLikesCount(realCount);
    };
    checkNewLikes();
    const interval = setInterval(checkNewLikes, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const [refetchTrigger, setRefetchTrigger] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fetchProfiles = async () => {
      if (!currentUser?.id) { setLoading(false); return; } // wait until session is fully ready
      setLoading(true);
      setProfiles([]); // clear immediately so stale results don't show

      // Fetch current user's interests for smart sorting
      let myInterests = [];
      let myProfile = null;
      if (currentUser?.id) {
        const { data: myProfileData } = await supabase.from("profiles").select("interests,visible,postcode,show_me").eq("id", currentUser.id).maybeSingle();
        myProfile = myProfileData;
        if (myProfile?.visible === false) setProfileVisible(false);
        else setProfileVisible(true);
        if (myProfile?.interests) {
          myInterests = parseInterests(myProfile.interests);
        }
      }

      // Helper to count shared interests
      const sharedCount = (p) => {
        if (!myInterests.length) return 0;
        const theirInterests = parseInterests(p.interests);
        return theirInterests.filter(i => myInterests.some(mi => mi.toLowerCase().includes(i.toLowerCase().replace(/^[^\w]+/, '')) || i.toLowerCase().includes(mi.toLowerCase().replace(/^[^\w]+/, '')))).length;
      };

      let query = supabase.from("profiles").select("*");
      if (currentUser?.id) query = query.neq("id", currentUser.id);
      query = query.eq("visible", true);
      if (activeFilters.diet) query = query.eq("diet", activeFilters.diet);
      if (activeFilters.lookingFor) query = query.eq("looking_for", activeFilters.lookingFor);
      const myShowMe = myProfile?.show_me;
      if (myShowMe === "Women") query = query.eq("gender", "Woman");
      else if (myShowMe === "Men") query = query.eq("gender", "Man");
      // "Everyone" or unset — no gender filter applied
      if (activeFilters.ageMin) query = query.gte("age", parseInt(activeFilters.ageMin));
      if (activeFilters.ageMax) query = query.lte("age", parseInt(activeFilters.ageMax));
      const savedSearchDistance = (() => { try { return parseInt(localStorage.getItem("meetfree_search_distance") || "9999"); } catch(e) { return 9999; } })();
      const effectivePostcode = activeFilters.postcode || (isPremium && savedSearchDistance !== 9999 ? (()=>{ try { return localStorage.getItem("meetfree_custom_location") || ""; } catch(e) { return ""; } })() : "");
      if (effectivePostcode) query = query.ilike("postcode", effectivePostcode.toUpperCase() + "%");
      const { data, error } = await query;
      if (error) console.error("Fetch profiles error:", error);

      let dummies = [];
      if (activeFilters.interests?.length) dummies = dummies.filter(p => {
        const theirInterests = parseInterests(p.interests).map(i => i.toLowerCase());
        return activeFilters.interests.some(fi => theirInterests.some(ti => ti.includes(fi.toLowerCase())));
      });

      // Filter real profiles by interests if set
      let real2 = data || [];
      if (activeFilters.noSmokers) real2 = real2.filter(p => !p.smoker);
      if (activeFilters.interests?.length) {
        real2 = real2.filter(p => {
          const theirInterests = parseInterests(p.interests).map(i => i.toLowerCase().trim());
          return activeFilters.interests.some(fi => theirInterests.some(ti => ti === fi.toLowerCase().trim() || ti.includes(fi.toLowerCase().trim())));
        });
      }

      // Sort by shared interests — most compatible first
      // Exclude already-liked real profiles from the discover list — they are shown separately
      const likedRealIds = Object.keys(likedProfiles)
        .filter(k => k.startsWith("supabase_"))
        .map(k => k.replace("supabase_", ""));
      // Fetch passes directly to avoid timing issues with prop loading
      const { data: passRows } = await supabase.from("passes").select("to_user").eq("from_user", currentUser.id);
      const dbPassedIds = (passRows || []).map(r => r.to_user);
      const localPassedIds = Object.keys(passedProfiles).filter(k => k.startsWith("supabase_")).map(k => k.replace("supabase_", ""));
      const passedRealIds = [...new Set([...dbPassedIds, ...localPassedIds])];
      const discoverReal = real2.filter(p => !likedRealIds.includes(p.id) && !passedRealIds.includes(p.id));
      const likedReal = real2.filter(p => likedRealIds.includes(p.id));
      const savedCustomLocation = (() => { try { return localStorage.getItem("meetfree_custom_location") || ""; } catch(e) { return ""; } })();
      const myPostcode = (activeFilters.postcode || (isPremium && savedCustomLocation ? savedCustomLocation : "") || (myProfile ? myProfile.postcode || "" : "") || userPostcode || "").toUpperCase().trim();
      const POSTCODE_COORDS = { "AB":[57.15,-2.11],"AL":[51.75,-0.34],"B":[52.48,-1.9],"BA":[51.38,-2.36],"BB":[53.75,-2.48],"BD":[53.79,-1.75],"BH":[50.72,-1.88],"BL":[53.58,-2.43],"BN":[50.83,-0.14],"BR":[51.37,0.07],"BS":[51.45,-2.6],"CA":[54.89,-2.94],"CB":[52.2,0.12],"CF":[51.48,-3.18],"CH":[53.19,-2.89],"CM":[51.74,0.47],"CO":[51.89,0.9],"CR":[51.37,-0.1],"CT":[51.28,1.08],"CV":[52.41,-1.51],"CW":[53.1,-2.44],"DA":[51.44,0.22],"DD":[56.46,-2.97],"DE":[52.92,-1.48],"DG":[55.07,-3.6],"DH":[54.77,-1.57],"DL":[54.52,-1.55],"DN":[53.52,-1.13],"DT":[50.71,-2.44],"DY":[52.51,-2.09],"E":[51.52,-0.04],"EC":[51.52,-0.1],"EH":[55.95,-3.19],"EN":[51.65,-0.08],"EX":[50.72,-3.53],"FK":[56.01,-3.78],"FY":[53.82,-3.05],"G":[55.86,-4.25],"GL":[51.86,-2.24],"GU":[51.24,-0.57],"HA":[51.58,-0.34],"HD":[53.65,-1.78],"HG":[53.99,-1.54],"HP":[51.76,-0.72],"HR":[52.06,-2.72],"HS":[57.77,-7.02],"HU":[53.74,-0.33],"HX":[53.72,-1.86],"IG":[51.56,0.07],"IP":[52.06,1.16],"IV":[57.48,-4.22],"KA":[55.62,-4.5],"KT":[51.37,-0.3],"KW":[58.44,-3.09],"KY":[56.2,-3.15],"L":[53.41,-2.98],"LA":[54.04,-2.8],"LD":[52.24,-3.38],"LE":[52.63,-1.13],"LL":[53.09,-3.81],"LN":[53.23,-0.54],"LS":[53.8,-1.55],"LU":[51.88,-0.42],"M":[53.48,-2.24],"ME":[51.27,0.52],"MK":[52.04,-0.76],"ML":[55.78,-3.98],"N":[51.55,-0.12],"NE":[54.97,-1.61],"NG":[52.95,-1.14],"NN":[52.24,-0.9],"NP":[51.59,-3.0],"NR":[52.63,1.3],"NW":[51.54,-0.17],"OL":[53.54,-2.12],"OX":[51.75,-1.26],"PA":[55.84,-4.43],"PE":[52.57,-0.24],"PH":[56.39,-3.43],"PL":[50.37,-4.14],"PO":[50.82,-1.08],"PR":[53.76,-2.7],"RG":[51.45,-1.0],"RH":[51.23,-0.19],"RM":[51.54,0.18],"S":[53.38,-1.47],"SA":[51.62,-3.94],"SE":[51.48,-0.05],"SG":[51.9,-0.2],"SK":[53.41,-2.16],"SL":[51.51,-0.6],"SM":[51.4,-0.19],"SN":[51.56,-1.78],"SO":[50.9,-1.4],"SP":[51.07,-1.79],"SR":[54.9,-1.38],"SS":[51.54,0.71],"ST":[52.99,-2.18],"SW":[51.47,-0.16],"SY":[52.71,-2.75],"TA":[51.01,-3.1],"TD":[55.6,-2.43],"TF":[52.7,-2.48],"TN":[51.07,0.26],"TQ":[50.46,-3.53],"TR":[50.26,-5.05],"TS":[54.57,-1.23],"TW":[51.45,-0.33],"UB":[51.53,-0.48],"W":[51.51,-0.19],"WA":[53.39,-2.6],"WC":[51.52,-0.12],"WD":[51.66,-0.42],"WF":[53.68,-1.5],"WN":[53.54,-2.63],"WR":[52.19,-2.22],"WS":[52.58,-2.0],"WV":[52.59,-2.13],"YO":[53.96,-1.08],"ZE":[60.15,-1.15] };
      const getCoords = (pc) => {
        if (!pc) return null;
        const clean = pc.toUpperCase().trim().replace(/\s+/g, "");
        // Extract outward code: up to 2 letters + up to 1 digit e.g. SP6, SO, W1, BH
        const match = clean.match(/^([A-Z]{1,2}[0-9]?)/);
        if (!match) return null;
        const key = match[1];
        // Try full key first, then drop trailing digit
        return POSTCODE_COORDS[key] || POSTCODE_COORDS[key.replace(/[0-9]$/, "")] || null;
      };
      const haversine = (a, b) => {
        if (!a || !b) return 9999;
        const R = 6371, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180;
        const x = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
      };
      const myCoords = getCoords(myPostcode);
      // Apply distance filter
      const savedDistance = (() => { try { return parseInt(localStorage.getItem("meetfree_search_distance") || "9999"); } catch(e) { return 9999; } })();
      const distanceLimit = savedDistance === 9999 ? Infinity : savedDistance;
      const withinDistance = (p) => {
        if (!myCoords) return true; // no coords, show everyone
        const pCoords = getCoords(p.postcode);
        if (!pCoords) return true; // unknown postcode, include them
        return haversine(myCoords, pCoords) <= distanceLimit;
      };
      const filteredDiscover = discoverReal.filter(withinDistance);
      const sortedReal = filteredDiscover.sort((a, b) => {
        const now = new Date();
        const aBoosted = a.boosted_until && new Date(a.boosted_until) > now;
        const bBoosted = b.boosted_until && new Date(b.boosted_until) > now;
        if (bBoosted && !aBoosted) return 1;
        if (aBoosted && !bBoosted) return -1;
        const distA = haversine(myCoords, getCoords(a.postcode));
        const distB = haversine(myCoords, getCoords(b.postcode));
        if (distA !== distB) return distA - distB;
        return sharedCount(b) - sharedCount(a);
      });
      const sortedLiked = likedReal.filter(withinDistance).sort((a, b) => haversine(myCoords, getCoords(a.postcode)) - haversine(myCoords, getCoords(b.postcode)));
      if (cancelled) return; // a newer run has already started — don't overwrite its results
      setLikedRealProfiles(sortedLiked);
      const combined = [...sortedReal, ...dummies];
      setProfiles(combined);
      setLoading(false);
    };
    fetchProfiles();
    return () => { cancelled = true; };
  }, [currentUser, activeFilters, likedProfiles, refetchTrigger]);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("super_likes").select("id", { count: "exact", head: true }).eq("from_user", currentUser.id).gte("created_at", today).then(({ count }) => setSuperLikesToday(count || 0));
    supabase.from("super_likes").select("to_user").eq("from_user", currentUser.id).then(({ data }) => { if (data) { const map = {}; data.forEach(r => { map["supabase_" + r.to_user] = true; }); setSuperLikedProfiles(map); } });
  }, [currentUser]);

  const [liking, setLiking] = useState(false);
  const handleRewind = async () => {
    if (!lastPassed || !isPremium) return;
    const key = "supabase_" + lastPassed.id;
    setPassedProfiles(prev => { const next = { ...prev }; delete next[key]; return next; });
    if (isRealProfile(lastPassed) && currentUser) {
      await supabase.from("passes").delete().eq("from_user", currentUser.id).eq("to_user", lastPassed.id);
    }
    setLastPassed(null);
    setRewindToast(true);
    setTimeout(() => setRewindToast(false), 2000);
    setRefetchTrigger(n => n + 1);
  };

  const handleSuperLike = async (profile) => {
    if (!isPremium || !currentUser) { return; }
    if (superLikesToday >= 5) { alert("You've used all 5 Super Likes for today!"); return; }
    const key = "supabase_" + profile.id;
    setSuperLikedProfiles(prev => ({ ...prev, [key]: true }));
    setSuperLikesToday(n => n + 1);
    setLiked(prev => ({ ...prev, [key]: new Date().toISOString() }));
    setProfiles(prev => prev.filter(p => {
      const pKey = "supabase_" + p.id;
      return pKey !== key;
    }));
    playSound("match");
    try {
      await supabase.from("super_likes").upsert({ from_user: currentUser.id, to_user: profile.id }, { onConflict: "from_user,to_user" });
      await supabase.from("likes").insert({ from_user: currentUser.id, to_user: profile.id });
      const { data: mutual } = await supabase.from("likes").select("id").eq("from_user", profile.id).eq("to_user", currentUser.id).maybeSingle();
      if (mutual) {
        const [u1, u2] = [currentUser.id, profile.id].sort();
        const { data: matchData } = await supabase.from("matches").upsert({ user1: u1, user2: u2 }, { onConflict: "user1,user2" }).select().maybeSingle();
        setMatchPopup({ ...profile, matchId: matchData?.id });
        setMatchedIds(prev => [...prev, profile.id]);
        if (matchData) setMatchRecords(prev => [...prev, matchData]);
      } else {
        setWaitingPopup(profile);
      }
    } catch(e) { console.error("Super like error:", e); }
  };

  const handleLike = (profile) => {
    if (liking) return;
    setLiking(true);
    setTimeout(() => setLiking(false), 1000);
    const isReal = isRealProfile(profile);
    const key = "supabase_" + profile.id;
    if (liked[key]) return;
    if (!isPremium && likesLeft <= 0) { setPaywallTrigger("swipes"); return; }
    setLiked(prev => ({ ...prev, [key]: new Date().toISOString() }));
    if (!isPremium) setLikesLeft(prev => Math.max(0, prev - 1));
    setProfiles(prev => prev.filter(p => {
      const pKey = "supabase_" + p.id;
      return pKey !== key;
    }));
    if (currentUser && isReal) {
      setComposerText("");
      setMessageComposer(profile);
    } else {
      showUndo(profile, "liked");
    }
  };

  const submitLike = async (profile, noteText) => {
    setMessageComposer(null);
    if (!currentUser || !isRealProfile(profile)) return;
    setWaitingPopup(profile);
    try {
      await supabase.from("likes").insert({ from_user: currentUser.id, to_user: profile.id });
      if (noteText && noteText.trim()) {
        await supabase.from("pending_messages").insert({ from_user: currentUser.id, to_user: profile.id, content: noteText.trim() });
      }
      const { data: mutual } = await supabase.from("likes").select("id").eq("from_user", profile.id).eq("to_user", currentUser.id).maybeSingle();
      if (mutual) {
        const [u1, u2] = [currentUser.id, profile.id].sort();
        const { data: matchData } = await supabase.from("matches").upsert({ user1: u1, user2: u2 }, { onConflict: "user1,user2" }).select().maybeSingle();
        setMatchPopup({ ...profile, matchId: matchData?.id }); playSound("match");
        setWaitingPopup(null);
        setMatchedIds(prev => [...prev, profile.id]);
        if (matchData) setMatchRecords(prev => [...prev, matchData]);
        if (matchData?.id) {
          const { data: pending } = await supabase.from("pending_messages").select("*")
            .or(`and(from_user.eq.${currentUser.id},to_user.eq.${profile.id}),and(from_user.eq.${profile.id},to_user.eq.${currentUser.id})`);
          if (pending?.length) {
            await Promise.all(pending.map(pm => supabase.from("messages").insert({ match_id: matchData.id, sender_id: pm.from_user, content: pm.content })));
            await supabase.from("pending_messages").delete()
              .or(`and(from_user.eq.${currentUser.id},to_user.eq.${profile.id}),and(from_user.eq.${profile.id},to_user.eq.${currentUser.id})`);
          }
        }
        try {
          const { data: myProfile } = await supabase.from("profiles").select("name,email").eq("id", currentUser.id).maybeSingle();
          await supabase.functions.invoke("send-match-email", { body: { user1_email: myProfile?.email || currentUser.email, user1_name: myProfile?.name || "Someone", user2_email: profile.email, user2_name: profile.name } });
        } catch(e) {}
      }
    } catch(e) { console.error("Like error:", e); }
  };

  const showUndo = (profile, action) => {
    if (undoToast?.timer) clearTimeout(undoToast.timer);
    const timer = setTimeout(() => setUndoToast(null), 4000);
    setUndoToast({ profile, action, timer });
  };

  const handleUndo = () => {
    if (!undoToast) return;
    const { profile, action, timer } = undoToast;
    clearTimeout(timer);
    setUndoToast(null);
    const key = "supabase_" + profile.id;
    if (action === "passed") {
      setPassedProfiles(prev => { const n = { ...prev }; delete n[key]; return n; });
      if (currentUser && isRealProfile(profile)) supabase.from("passes").delete().eq("from_user", currentUser.id).eq("to_user", profile.id).then(() => {});
    } else if (action === "liked") {
      setLiked(prev => { const n = { ...prev }; delete n[key]; return n; });
      setProfiles(prev => prev.includes(profile) ? prev : [profile, ...prev]);
      if (!isPremium) setLikesLeft(prev => Math.min(FREE_SWIPE_LIMIT, prev + 1));
    }
  };

  // OPT-M10: Extracted onMessage handler
  const handleMessage = async (person) => {
    const isReal = isRealProfile(person);
    if (!isReal) { setWaitingPopup(person); return; }
    let match = matchRecords.find(m =>
      (m.user1 === person.id && m.user2 === currentUser.id) ||
      (m.user2 === person.id && m.user1 === currentUser.id)
    );
    if (!match) {
      const { data, error } = await supabase.from("matches").select("id,user1,user2")
        .or(`and(user1.eq.${currentUser.id},user2.eq.${person.id}),and(user1.eq.${person.id},user2.eq.${currentUser.id})`)
        .maybeSingle();
      if (data) match = data;
    }
    if (match && onOpenChat) { onOpenChat({ ...person, matchId: match.id }); onNav("chat"); }
    else { setWaitingPopup(person); }
  };

  const handlePass = async (profile) => {
    const key = "supabase_" + profile.id;
    setLastPassed(profile);
    setPassedProfiles(prev => ({ ...prev, [key]: true }));
    if (currentUser && isRealProfile(profile)) {
      try {
        const { error } = await supabase.from("passes").upsert({ from_user: currentUser.id, to_user: profile.id }, { onConflict: "from_user,to_user" });
        if (error) console.error("Pass save error:", error.message);
      } catch(e) { console.error("Pass save exception:", e); }
    } else {
      showUndo(profile, "passed");
    }
  };

  if (loading) return (
    <PhoneShell>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 40 }}>🌱</div>
        <div style={{ color: theme.textMid, fontSize: 14 }}>Finding people near you...</div>
      </div>
      <BottomNav active="swipe" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
    </PhoneShell>
  );

  return (
    <PhoneShell>
      {matchPopup && (
        <div style={{ position:"absolute", inset:0, zIndex:200, background:"rgba(26,58,42,0.95)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:44, padding:32, textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:8 }}>🎉</div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:28, fontWeight:700, color:"white", marginBottom:8 }}>It's a match!</div>
          <div style={{ color:"rgba(255,255,255,0.75)", fontSize:15, marginBottom:32 }}>You and {matchPopup.name} both liked each other 💚</div>
          <button onClick={() => { const m = matchPopup; setMatchPopup(null); if (m?.matchId) { onOpenChat({ ...m, matchId: m.matchId }); onNav("chat"); } else { onNav("chat"); } }} style={{ ...btnPrimary, background:theme.greenBright, marginBottom:12 }}>Send a message</button>
          <button onClick={() => setMatchPopup(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Keep browsing</button>
          <button onClick={handleShare} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginTop:8 }}>📣 Share MeetFree with friends</button>
        </div>
      )}
      {waitingPopup && (
        <div style={{ position:"absolute", inset:0, zIndex:200, background:"rgba(26,58,42,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:44, padding:36, textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:12 }}>{waitingPopup.emoji || "🌿"}</div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:700, color:"white", marginBottom:10 }}>Waiting on {waitingPopup.name}</div>
          <div style={{ color:"rgba(255,255,255,0.75)", fontSize:15, lineHeight:1.7, marginBottom:32 }}>When {waitingPopup.name} likes you back you'll both be notified and can start chatting 💚</div>
          <button onClick={() => setWaitingPopup(null)} style={{ ...btnPrimary, background:theme.greenBright }}>Got it</button>
        </div>
      )}
      {rewindToast && <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", background:theme.greenDeep, color:"white", padding:"10px 20px", borderRadius:50, fontSize:13, fontWeight:700, zIndex:200, whiteSpace:"nowrap" }}>↩️ Rewound!</div>}
      {paywallTrigger && <Paywall trigger={paywallTrigger} onClose={() => setPaywallTrigger(null)} onSubscribe={() => { setPaywallTrigger(null); onSubscribe(); }} currentUser={currentUser} />}
      <WhoLikedYou currentUser={currentUser} isPremium={isPremium} onUpgrade={() => setPaywallTrigger("wholiked")} show={showLikers} onDismiss={() => setShowLikers(false)} onLikeBack={async (profile) => { try { await supabase.from("likes").insert({ from_user: currentUser.id, to_user: profile.id }); const [u1, u2] = [currentUser.id, profile.id].sort(); const { data: matchData } = await supabase.from("matches").upsert({ user1: u1, user2: u2 }, { onConflict: "user1,user2" }).select().maybeSingle(); setShowLikers(false); setMatchPopup({ ...profile, matchId: matchData?.id }); playSound("match"); setMatchedIds(prev => [...prev, profile.id]); if (matchData) setMatchRecords(prev => [...prev, matchData]); } catch(e) {} }} />

      {/* Like + note composer */}
      {messageComposer && (
        <div style={{ position:"absolute", inset:0, zIndex:200, background:"rgba(26,58,42,0.85)", display:"flex", flexDirection:"column", justifyContent:"flex-end", borderRadius:44, overflow:"hidden" }}>
          <div style={{ background:theme.warmWhite, borderRadius:"24px 24px 0 0", padding:"24px 20px 32px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:theme.greenDeep }}>{superLikedProfiles["supabase_" + messageComposer.id] ? `Super Like ${messageComposer.name} ⭐` : `Like ${messageComposer.name} 💚`}</div>
              <button onClick={() => submitLike(messageComposer, "")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:theme.textLight }}>✕</button>
            </div>
            <p style={{ fontSize:13, color:theme.textMid, marginBottom:12, lineHeight:1.5 }}>Send an optional note with your like — it'll be delivered if they match with you.</p>
            <textarea
              value={composerText}
              onChange={e => setComposerText(e.target.value.slice(0, 200))}
              placeholder={`Say something to ${messageComposer.name}... (optional)`}
              rows={3}
              style={{ width:"100%", padding:"12px 14px", borderRadius:14, border:"2px solid rgba(82,183,136,0.25)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box", marginBottom:6 }}
            />
            <div style={{ textAlign:"right", fontSize:11, color:theme.textLight, marginBottom:14 }}>{composerText.length}/200</div>
            <button onClick={() => submitLike(messageComposer, composerText)} style={{ ...btnPrimary }}>
              Send like {composerText.trim() ? "& note" : ""} 💚
            </button>
            <button onClick={() => submitLike(messageComposer, "")} style={{ ...btnGhost, marginTop:10 }}>Just like, no note</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "14px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: theme.greenDeep }}>
            Meet<span style={{ color: theme.greenBright, fontStyle: "italic" }}>Free</span>
            {isPremium && <span style={{ marginLeft: 8, fontSize: 11, background: theme.gold, color: "white", padding: "2px 7px", borderRadius: 50, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>👑 GOLD</span>}
          </div>
          {currentUser && <div style={{ fontSize: 10, color: theme.textLight, marginTop: 1 }}>Signed in as {currentUser.email}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          
          {isPremium && lastPassed && <button onClick={handleRewind} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>↩️</button>}
          <button onClick={() => setShowFilters(true)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", position:"relative" }}>
            🔍
            {Object.values(activeFilters).some(v => v) && <span style={{ position:"absolute", top:-2, right:-2, width:8, height:8, borderRadius:"50%", background:theme.gold }} />}
          </button>
          
<button onClick={onLogout} style={{ background: "none", border: "1px solid rgba(224,122,95,0.3)", borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: theme.accent, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>


      {!profileVisible && (
        <div style={{ margin: "0 16px 8px", background: "rgba(244,168,41,0.12)", border: "1px solid rgba(244,168,41,0.3)", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#b8860b" }}>Paused</div>
            <div style={{ fontSize: 11, color: theme.textLight, marginTop: 2 }}>You are hidden from Discover — existing matches can still message you</div>
          </div>
          <button onClick={async () => { setProfileVisible(true); await supabase.from("profiles").update({ visible: true }).eq("id", currentUser.id); }} style={{ background: "none", border: "1px solid rgba(244,168,41,0.4)", borderRadius: 50, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#b8860b", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Resume</button>
        </div>
      )}
      {showTip && (
        <div style={{ margin:"8px 12px 0", padding:"12px 16px", background:"rgba(82,183,136,0.08)", borderRadius:12, border:"1px solid rgba(82,183,136,0.2)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
            <div style={{ fontWeight:700, fontSize:13, color:theme.greenDeep }}>👋 How it works</div>
            <button onClick={() => { localStorage.setItem("meetfree_tip_seen_" + currentUser.id, "1"); setShowTip(false); }} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:theme.textLight, padding:0, lineHeight:1 }}>✕</button>
          </div>
          <div style={{ fontSize:12, color:theme.textMid, lineHeight:1.6 }}>✕ <b>Pass</b> — not for you&nbsp;&nbsp; 💚 <b>Like</b> — interested&nbsp;&nbsp; ⭐ <b>Super Like</b> — really keen!</div>
          <div style={{ fontSize:12, color:theme.textMid, marginTop:4 }}>If they like you back, it's a match 🎉</div>
        </div>
      )}
      {/* Profile checklist */}
      {showChecklist && profileData && (
        <div style={{ margin:"8px 12px 0", padding:"12px 16px", background:"white", borderRadius:14, border:"1px solid rgba(82,183,136,0.2)", boxShadow:"0 2px 8px rgba(82,183,136,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:13, color:theme.greenDeep }}>✨ Complete your profile</div>
            <button onClick={() => { localStorage.setItem("meetfree_checklist_dismissed_" + currentUser.id, "1"); setShowChecklist(false); }} style={{ background:"none", border:"none", fontSize:12, cursor:"pointer", color:theme.textLight, padding:0, lineHeight:1, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Maybe later</button>
          </div>
          {[
            { label: "Write a bio", done: !!profileData.bio, nav: "profile" },
            { label: "Set your postcode", done: !!profileData.postcode, nav: "profile" },
            { label: "Add your interests", done: !!(profileData.interests && profileData.interests !== "[]" && profileData.interests !== ""), nav: "profile" },
            { label: "Add a profile photo", done: !!profileData.photo_url, nav: "profile", optional: true },
          ].map(({ label, done, nav, optional }) => (
            <div key={label} onClick={() => !done && onNav(nav)} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", cursor: done ? "default" : "pointer", borderBottom:"1px solid rgba(82,183,136,0.06)" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background: done ? theme.greenBright : "rgba(82,183,136,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"white", flexShrink:0 }}>{done ? "✓" : ""}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color: done ? theme.textLight : theme.textDark, textDecoration: done ? "line-through" : "none" }}>{label}</div>
                {optional && !done && <div style={{ fontSize:11, color:theme.textLight }}>Optional — you can add one anytime</div>}
              </div>
              {!done && <div style={{ fontSize:11, color:theme.greenBright, fontWeight:600 }}>Add →</div>}
            </div>
          ))}
        </div>
      )}

      {/* Gold welcome banner */}
      {showGoldBanner && (
        <div style={{ position:"absolute", inset:0, zIndex:250, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"28px 20px 36px" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🌟</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:700, color:theme.greenDeep, marginBottom:6 }}>You're on Gold!</div>
              <div style={{ fontSize:14, color:theme.textMid, lineHeight:1.6, marginBottom:16 }}>As one of our founding members, you have free Gold membership. Here's what you get:</div>
            </div>
            {[
              { icon:"👁", text:"See who liked you" },
              { icon:"⭐", text:"Send Super Likes" },
              { icon:"🔄", text:"Unlimited likes per day" },
              { icon:"🚀", text:"Boost your profile once a week" },
              { icon:"🎯", text:"Up to 10 interests on your profile" },
              { icon:"↩️", text:"Rewind your last swipe" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid rgba(82,183,136,0.08)" }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <span style={{ fontSize:14, color:theme.textDark }}>{text}</span>
              </div>
            ))}
            <button onClick={() => setShowGoldBanner(false)} style={{ ...btnPrimary, marginTop:24, background:"linear-gradient(135deg,#f4a829,#e07a5f)" }}>Let's go! ⭐</button>
          </div>
        </div>
      )}

      {/* Push notification prompt */}
      {showPushPrompt && (
        <div style={{ position:"absolute", inset:0, zIndex:250, background:"rgba(26,58,42,0.6)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"28px 20px 36px" }}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🔔</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep, marginBottom:6 }}>Stay in the loop</div>
              <div style={{ fontSize:14, color:theme.textMid, lineHeight:1.6 }}>Get notified instantly when you match or receive a message — don't miss a connection.</div>
            </div>
            <button onClick={async () => {
              localStorage.setItem("meetfree_push_prompt_" + currentUser.id, "1");
              setShowPushPrompt(false);
              try {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                  const reg = await navigator.serviceWorker.ready;
                  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: "BE8wDhmjv5Ahta8yM2HkMowLQ6Ul6cvzgGoGjZ3jKO6Wj72EUZhLgJh9Z_4usJmVTE2vxMaT3aZ8r_cVacmCGbE" });
                  await supabase.from("push_subscriptions").upsert({ user_id: currentUser.id, subscription: JSON.stringify(sub) }, { onConflict: "user_id" });
                }
              } catch(e) { console.error("Push subscription error:", e); }
            }} style={{ ...btnPrimary, marginBottom:10 }}>🔔 Enable notifications</button>
            <button onClick={() => { localStorage.setItem("meetfree_push_prompt_" + currentUser.id, "1"); setShowPushPrompt(false); }} style={{ ...btnGhost }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* New likes banner */}
      {newLikesCount > 0 && (
        <div onClick={() => { localStorage.setItem("meetfree_liked_me_visited_" + currentUser.id, new Date().toISOString()); setNewLikesCount(0); onNav("likedyou"); }} style={{ margin:"8px 12px 0", padding:"10px 16px", background:"linear-gradient(135deg,#52b788,#2d6a4f)", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:"white", fontWeight:700, fontSize:14 }}>{"+"} {newLikesCount} {newLikesCount === 1 ? "person likes" : "people like"} you! 💚</span>
          <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12 }}>See who →</span>
        </div>
      )}
      {/* Profile list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 8px", background: theme.cream }}>


        {profiles.length === 0 && likedRealProfiles.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", padding:32 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🌍</div>
            {activeFilters.interests?.length || activeFilters.diet || activeFilters.lookingFor || activeFilters.ageMin || activeFilters.ageMax || activeFilters.noSmokers ? (
              <>
                <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>No matches found</div>
                <div style={{ color:theme.textMid, fontSize:14, lineHeight:1.6, marginBottom:20 }}>Nobody nearby matches your current filters. Try broadening them.</div>
                <button onClick={() => { const empty = { diet:"", lookingFor:"", ageMin:"", ageMax:"", postcode:"", interests:[], noSmokers:false }; setFilters(empty); setActiveFilters(empty); }} style={{ background:theme.greenBright, color:"white", border:"none", borderRadius:50, padding:"10px 24px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Clear filters</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>No one here yet</div>
                <div style={{ color:theme.textMid, fontSize:14, lineHeight:1.6 }}>Check back soon as more plant-based people join!</div>
              </>
            )}
          </div>
        ) : (() => {
            const getKey = (p) => "supabase_" + p.id;
            const likedDummies = profiles.filter(p => !isRealProfile(p) && liked[getKey(p)] && !passedProfiles[getKey(p)]);
            const discover = profiles.filter(p => !liked[getKey(p)] && !passedProfiles[getKey(p)]);
            const hasLiked = likedRealProfiles.length > 0 || likedDummies.length > 0;
            const allLiked = [...likedRealProfiles, ...likedDummies];

            return (
              <>
                {hasLiked && <div style={{ fontSize:11, fontWeight:700, color:theme.greenBright, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>💚 People you've liked</div>}
                {allLiked.map(p => (
                  <ProfileCard key={String(p.id)+"_liked"} p={p} onLike={handleLike} onPass={handlePass} onSuperLike={handleSuperLike} likedProfiles={liked} matchedIds={matchedIds} onMessage={handleMessage} isPremium={isPremium} superLikedProfiles={superLikedProfiles} likesLeft={likesLeft} />
                ))}
                {discover.length > 0 && hasLiked && <div style={{ fontSize:13, fontWeight:700, color:theme.greenDeep, textTransform:"uppercase", letterSpacing:"0.08em", margin:"20px 0 8px", paddingTop:16, borderTop:"1px solid rgba(82,183,136,0.15)" }}>🔍 Discover more</div>}
                {discover.map(p => (
                  <ProfileCard key={String(p.id)+"_"+( p.name||"")} p={p} onLike={handleLike} onPass={handlePass} onSuperLike={handleSuperLike} likedProfiles={liked} matchedIds={matchedIds} onMessage={handleMessage} isPremium={isPremium} superLikedProfiles={superLikedProfiles} likesLeft={likesLeft} />
                ))}
                {discover.length === 0 && !hasLiked && (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", padding:32 }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>🌍</div>
                    <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>You've seen everyone!</div>
                    <div style={{ color:theme.textMid, fontSize:14, lineHeight:1.6 }}>Check back soon as more plant-based people join 🌱</div>
                  </div>
                )}
              </>
            );
          })()}
      </div>
      <BottomNav active="swipe" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />

      {/* Filter panel */}
      {showFilters && (
        <div style={{ position:"absolute", inset:0, zIndex:300, borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div onClick={() => setShowFilters(false)} style={{ flex:1, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ background:"white", borderRadius:"24px 24px 44px 44px", padding:"24px 24px 40px", maxHeight:"80%", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep }}>Filter people</div>
              <button onClick={() => setShowFilters(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:theme.textLight }}>✕</button>
            </div>

            {/* Diet */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Diet</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["", "Vegan", "Vegetarian", "Whole-food plant-based", "Raw vegan"].map(d => (
                  <button key={d} onClick={() => setFilters(f => ({ ...f, diet: d }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${filters.diet === d ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: filters.diet === d ? theme.greenBright : "white", color: filters.diet === d ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{d || "Any"}</button>
                ))}
              </div>
            </div>

            {/* Looking for */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Looking for</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["", "Dating", "Friendship", "Community", "Activity partner"].map(l => (
                  <button key={l} onClick={() => setFilters(f => ({ ...f, lookingFor: l }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${filters.lookingFor === l ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: filters.lookingFor === l ? theme.greenBright : "white", color: filters.lookingFor === l ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{l || "Any"}</button>
                ))}
              </div>
            </div>

            {/* Age range */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Age range</div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input type="number" placeholder="Min" value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: e.target.value }))} style={{ width:70, padding:"8px 12px", borderRadius:10, border:"2px solid rgba(82,183,136,0.2)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
                <span style={{ color:theme.textLight }}>—</span>
                <input type="number" placeholder="Max" value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: e.target.value }))} style={{ width:70, padding:"8px 12px", borderRadius:10, border:"2px solid rgba(82,183,136,0.2)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
              </div>
            </div>

            {/* Postcode */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Postcode area</div>
              <input type="text" placeholder="e.g. BH, SO, SW1" value={filters.postcode} onChange={e => setFilters(f => ({ ...f, postcode: e.target.value }))} style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"2px solid rgba(82,183,136,0.2)", fontSize:14, fontFamily:"inherit", outline:"none" }} />
              <div style={{ fontSize:11, color:theme.textLight, marginTop:4 }}>Enter the first part of a UK postcode</div>
            </div>

            {/* Smoker preference */}
            <div style={{ marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>No smokers</div>
                <div style={{ fontSize:11, color:theme.textLight, marginTop:2 }}>Hide smokers from Discover</div>
              </div>
              <div onClick={() => setFilters(f => ({ ...f, noSmokers: !f.noSmokers }))} style={{ width:44, height:24, borderRadius:50, background: filters.noSmokers ? theme.greenBright : "rgba(82,183,136,0.2)", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}><div style={{ position:"absolute", top:2, left: filters.noSmokers ? 22 : 2, width:20, height:20, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }} /></div>
            </div>

            {/* Interests */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:theme.textLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Interests <span style={{ fontSize:10, fontWeight:400, textTransform:"none" }}>(select up to 3)</span></div>
              <InterestPicker selected={filters.interests || []} onChange={interests => setFilters(f => ({ ...f, interests }))} max={3} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { const empty = { diet:"", lookingFor:"", ageMin:"", ageMax:"", postcode:"", interests:[], noSmokers:false }; setFilters(empty); setActiveFilters(empty); setShowFilters(false); }} style={{ flex:1, padding:"12px", borderRadius:50, border:`2px solid rgba(82,183,136,0.2)`, background:"white", color:theme.textMid, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
              <button onClick={() => { setActiveFilters({ ...filters }); setShowFilters(false); }} style={{ flex:2, padding:"12px", borderRadius:50, border:"none", background:theme.greenDeep, color:"white", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Apply filters 🌱</button>
            </div>
          </div>
        </div>
      )}
    </PhoneShell>
  );
};

// ─── CHAT LIST ────────────────────────────────────────────────────────────────

const ChatList = ({ onNav, onOpenChat, isPremium, onUpgrade, currentUser, onLogout, unreadCount = 0, defaultTab = "matches" }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(defaultTab);
  const [likedList, setLikedList] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [selectedLiked, setSelectedLiked] = useState(null);
  const [likedYou, setLikedYou] = useState([]);
  const [likedYouBack, setLikedYouBack] = useState({});

  const fetchMatches = async () => {
      if (!currentUser) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`);
      if (error) { console.error("Matches error:", error); setLoading(false); return; }

      // Collect all other user IDs then fetch profiles in one query (fixes N+1)
      const matchRows = data || [];
      const otherIds = matchRows.map(m => m.user1 === currentUser.id ? m.user2 : m.user1);
      if (otherIds.length === 0) { setMatches([]); setLoading(false); return; }

      const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const enriched = matchRows
        .map(m => {
          const otherId = m.user1 === currentUser.id ? m.user2 : m.user1;
          return { ...m, profile: profileMap[otherId] || null };
        })
        .filter(m => m.profile);

      // Fetch latest message per match to detect unread
      const lastMsgs = await Promise.all(enriched.map(m =>
        supabase.from("messages").select("created_at,sender_id").eq("match_id", m.id).neq("sender_id", currentUser.id).order("created_at", { ascending: false }).limit(1)
      ));
      const withUnread = enriched.map((m, i) => {
        // Use database read timestamp instead of localStorage
        const myReadAt = m.user1 === currentUser.id ? m.user1_read_at : m.user2_read_at;
        const lastRead = myReadAt || "1970-01-01";
        const latestMsg = lastMsgs[i]?.data?.[0];
        const hasUnread = latestMsg && new Date(latestMsg.created_at) > new Date(lastRead);
        return { ...m, hasUnread, lastRead };
      });
      setMatches(withUnread);
      setLoading(false);
    };

  useEffect(() => { fetchMatches(); }, [currentUser, tab]);

  useEffect(() => {
    const fetchLiked = async () => {
      if (!currentUser) return;
      setLikedLoading(true);
      const { data: likeRows } = await supabase.from("likes").select("to_user").eq("from_user", currentUser.id);
      if (!likeRows?.length) { setLikedList([]); setLikedLoading(false); return; }
      const ids = likeRows.map(r => r.to_user);
      const [{ data: profiles }, { data: matchRows }, { data: superLikesSent }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("matches").select("*").or(`user1.eq.${currentUser.id},user2.eq.${currentUser.id}`),
        supabase.from("super_likes").select("to_user").eq("from_user", currentUser.id).in("to_user", ids),
      ]);
      const superLikedSet = new Set((superLikesSent || []).map(r => r.to_user));
      const matchedIds = (matchRows || []).map(m => m.user1 === currentUser.id ? m.user2 : m.user1);
      const matchMap = {};
      (matchRows || []).forEach(m => { const otherId = m.user1 === currentUser.id ? m.user2 : m.user1; matchMap[otherId] = m.id; });
      setLikedList((profiles || []).map(p => ({ ...p, isMatched: matchedIds.includes(p.id), matchId: matchMap[p.id], isSuperLike: superLikedSet.has(p.id) })));
      setLikedLoading(false);
    };
    if (tab === "liked") fetchLiked();
    if (tab === "likedyou") fetchLikedYou();
  }, [currentUser, tab]);

  const fetchLikedYou = async () => {
    if (!currentUser) return;
    const { data: likeRows } = await supabase.from("likes").select("from_user").eq("to_user", currentUser.id).neq("from_user", currentUser.id);
    if (!likeRows?.length) { setLikedYou([]); return; }
    const ids = likeRows.map(r => r.from_user);
    const [{ data: profiles }, { data: alreadyLiked }, { data: superLikeRows }] = await Promise.all([
      supabase.from("profiles").select("id,name,photo_url,age,city,postcode,bio,diet,interests,is_real,is_premium").in("id", ids),
      supabase.from("likes").select("to_user").eq("from_user", currentUser.id).in("to_user", ids),
      supabase.from("super_likes").select("from_user").eq("to_user", currentUser.id).in("from_user", ids),
    ]);
    const superLikedMe = new Set((superLikeRows || []).map(r => r.from_user));
    const realProfiles = (profiles || []).map(p => ({ ...p, isSuperLike: superLikedMe.has(p.id) }));
    setLikedYou(realProfiles);
    const map = {};
    (alreadyLiked || []).forEach(r => { map[r.to_user] = true; });
    setLikedYouBack(map);
  };

  return (
    <PhoneShell>
      <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, color: theme.greenDeep }}>Messages</h1>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid rgba(224,122,95,0.3)`, borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: theme.accent, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Sign out</button>
      </div>
      {/* Tab switcher */}
      <div style={{ display:"flex", margin:"0 20px 12px", background:"rgba(82,183,136,0.08)", borderRadius:50, padding:3 }}>
        {[["matches","💬 Matches"],["liked","💚 Liked"],["likedyou","🌟 Liked me"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"8px 0", borderRadius:50, border:"none", background: tab===id ? theme.greenDeep : "transparent", color: tab===id ? "white" : theme.textMid, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}>{label}</button>
        ))}
      </div>
      {!isPremium && tab === "matches" && <AdBanner onUpgrade={onUpgrade} />}
      {tab === "liked" ? (
        likedLoading ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ color:theme.textMid, fontSize:14 }}>Loading...</div>
          </div>
        ) : likedList.length === 0 ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>💚</div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>No likes yet</div>
            <button onClick={() => onNav("swipe")} style={btnPrimary}>Discover people 🌱</button>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:"auto" }}>
            {likedList.map(p => (
              <div key={p.id}>
            <div style={{ display:"flex", gap:14, padding:"13px 24px", alignItems:"center", cursor:"pointer", background: p.isMatched ? "rgba(82,183,136,0.04)" : "white" }} onClick={() => {
                if (p.isMatched && p.matchId) onOpenChat({ ...p, matchId: p.matchId });
                else setSelectedLiked(selectedLiked?.id === p.id ? null : p);
              }}>
                <div style={{ width:50, height:50, borderRadius:"50%", background:"#d8f3dc", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0, overflow:"hidden" }}>
                  {p.photo_url ? <img src={resizePhoto(p.photo_url, 100)} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (p.emoji || "🌿")}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, color:theme.textDark, fontSize:15 }}>{p.isSuperLike ? "⭐ " : ""}{p.name}{p.age ? ", " + p.age : ""}</div>
                  <div style={{ fontSize:12, color:theme.textLight, marginTop:2 }}>{p.isMatched ? "It's a match! 💚" : "Waiting for them to like back"}</div>
                </div>
                {p.isMatched
                  ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:"50%", background:theme.greenBright, flexShrink:0 }}><span style={{ fontSize:16 }}>💬</span></div>
                  : <div style={{ fontSize:11, color:theme.textMid, background:"rgba(82,183,136,0.1)", borderRadius:50, padding:"4px 10px", flexShrink:0 }}>⏳ Waiting</div>
                }
              </div>
              {selectedLiked?.id === p.id && !p.isMatched && <>
                <div style={{ margin:"-8px 24px 8px", background:"rgba(82,183,136,0.06)", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:theme.textDark }}>{p.name}, {p.age}</div>
                    {p.bio && <div style={{ fontSize:12, color:theme.textMid, marginTop:2, lineHeight:1.5 }}>{p.bio.slice(0,80)}{p.bio.length>80?"...":""}</div>}
                  </div>
                  <button onClick={async (e) => { e.stopPropagation(); await supabase.from("likes").delete().eq("from_user", currentUser.id).eq("to_user", p.id); setLikedList(prev => prev.filter(l => l.id !== p.id)); setSelectedLiked(null); }} style={{ background:"rgba(224,122,95,0.1)", border:"1px solid rgba(224,122,95,0.3)", color:theme.accent, borderRadius:50, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0, marginLeft:12 }}>Unlike</button>
                </div>
              </>
              }
            </div>
            ))}
          </div>
        )
      ) : tab === "likedyou" ? (
        <div style={{ flex:1, overflowY:"auto" }}>
          {likedYou.length === 0 ? (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>💚</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>No likes yet</div>
              <p style={{ color:theme.textMid, fontSize:14 }}>When someone likes your profile they'll appear here</p>
            </div>
          ) : likedYou.map((p, i) => (
            <div key={p.id}>
              <div style={{ display:"flex", gap:14, padding:"13px 24px", alignItems:"center", cursor:"pointer" }} onClick={() => setSelectedLiked(selectedLiked?.id === p.id ? null : p)}>
                <div style={{ width:50, height:50, borderRadius:"50%", background:"#d8f3dc", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0, overflow:"hidden" }}>
                  {p.photo_url ? <img src={resizePhoto(p.photo_url, 100)} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, color:theme.textDark, fontSize:15 }}>{p.isSuperLike ? "⭐ " : ""}{p.name}{p.age ? ", " + p.age : ""}</div>
                  <div style={{ fontSize:12, color:theme.textLight, marginTop:2 }}>📍 {p.postcode || p.city || "Somewhere"}</div>
                </div>
                <button onClick={async (e) => { e.stopPropagation(); if (!likedYouBack[p.id] && currentUser) { setLikedYouBack(prev => ({ ...prev, [p.id]: true })); await supabase.from("likes").upsert({ from_user: currentUser.id, to_user: p.id }, { onConflict: "from_user,to_user" }); const [u1, u2] = [currentUser.id, p.id].sort(); await supabase.from("matches").upsert({ user1: u1, user2: u2 }, { onConflict: "user1,user2" }); setTab("matches"); fetchMatches(); } }} disabled={!!likedYouBack[p.id]} style={{ background: likedYouBack[p.id] ? theme.greenBright : theme.greenDeep, color:"white", border:"none", borderRadius:50, padding:"6px 14px", fontSize:12, fontWeight:700, cursor: likedYouBack[p.id] ? "default" : "pointer", fontFamily:"DM Sans,sans-serif", flexShrink:0 }}>{likedYouBack[p.id] ? "✓ Liked back" : "💚 Like back"}</button>
              </div>
              {selectedLiked?.id === p.id && (
                <div style={{ padding:"0 24px 14px", background:"rgba(82,183,136,0.04)" }}>
                  {p.bio && <p style={{ fontSize:13, color:theme.textMid, lineHeight:1.6, marginBottom:8 }}>{p.bio}</p>}
                  {p.diet && <span style={{ background:theme.greenDeep, color:"white", fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:50, marginRight:6 }}>{p.diet}</span>}
                  {parseInterests(p.interests).length > 0 && <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>{parseInterests(p.interests).map(i => <span key={i} style={{ background:"rgba(82,183,136,0.1)", color:theme.greenMid, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:50 }}>{i}</span>)}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
      <>

      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ color: theme.textMid, fontSize: 14 }}>Loading matches...</div>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>💚</div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:theme.greenDeep, marginBottom:8 }}>No matches yet</div>
          <div style={{ color:theme.textMid, fontSize:14, lineHeight:1.6, marginBottom:24 }}>Like someone on Discover to start a conversation 💚</div>
          <button onClick={() => onNav("swipe")} style={btnPrimary}>Discover people 🌱</button>
        </div>
      ) : (
        <>
          <div style={{ height: 1, background: "rgba(82,183,136,0.1)", margin: "0 24px" }} />
          <div style={{ flex: 1, overflowY: "auto" }}>
            {matches.map(m => (
              <div key={m.id} onClick={() => { onOpenChat({ ...m.profile, matchId: m.id }); onNav("chat"); }} style={{ display: "flex", gap: 14, padding: "13px 24px", alignItems: "center", cursor: "pointer", background: m.hasUnread ? "rgba(82,183,136,0.06)" : "white", borderLeft: m.hasUnread ? "3px solid #52b788" : "3px solid transparent" }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow:"hidden" }}>
                  {m.profile.photo_url ? <img src={resizePhoto(m.profile.photo_url, 100)} alt={m.profile.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: theme.textDark, fontSize: 15 }}>{m.profile.name}{m.profile.is_real && <span title="Verified" style={{ marginLeft:4 }}>✅</span>}</span>
                    <span style={{ fontSize: 12, color: m.hasUnread ? theme.greenMid : theme.textLight }}>{m.hasUnread ? "New message! 💚" : ""}</span>
                  </div>
                  <span style={{ fontSize: 13, color: theme.textLight }}></span>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:"50%", background:theme.greenBright, flexShrink:0 }}>
                  <span style={{ fontSize:16 }}>💬</span>
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
        </>
      )}
      </>
      )}
      <BottomNav active="chat" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
    </PhoneShell>
  );
};

// ─── CHAT DETAIL ──────────────────────────────────────────────────────────────

const ChatDetail = ({ chat, onBack, onNav, isPremium, currentUser, unreadCount = 0, onUpgrade }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [showSafetyPrompt, setShowSafetyPrompt] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const isActualMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const [emojiCategory, setEmojiCategory] = useState("faces");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showSafetyTips, setShowSafetyTips] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const bottomRef = useRef(null);
  const [contactRequest, setContactRequest] = useState(null); // {id, status, requester_id, recipient_id}
  const [contactRevealed, setContactRevealed] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState(null); // when the other person last read the chat
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, senderName }
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [swipeMsgId, setSwipeMsgId] = useState(null);
  const [deleteMenuMsgId, setDeleteMenuMsgId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null); // {top, left, right, isMe}
  const [deletingMsg, setDeletingMsg] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(null);
  const SWIPE_THRESHOLD = 60;
  const [reactions, setReactions] = useState({}); // { [messageId]: [{emoji, user_id}] }
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const REACTION_EMOJIS = ["👍","❤️","😂","😮","😢","🙏","🔥","😍","🌱"];

  // Load messages and poll for new ones every 8 seconds
  useEffect(() => {
    if (!chat.matchId) { setLoading(false); return; }
    const fetchMsgs = async () => {
      // Mark chat as read
      try { localStorage.setItem(`meetfree_read_${chat.matchId}`, new Date().toISOString()); } catch(e) {}
      try {
        const { data: matchRow } = await supabase.from("matches").select("user1,user2,user1_read_at,user2_read_at").eq("id", chat.matchId).maybeSingle();
        const col = matchRow?.user1 === currentUser?.id ? "user1_read_at" : "user2_read_at";
        const otherCol = matchRow?.user1 === currentUser?.id ? "user2_read_at" : "user1_read_at";
        const nowIso = new Date().toISOString();
        const { data: updateData, error: updateErr } = await supabase.from("matches").update({ [col]: nowIso }).eq("id", chat.matchId).select();
        console.log('DEBUG readAt:', { matchId: chat.matchId, col, nowIso, updateErr, updatedRows: updateData?.length });
        if (matchRow?.[otherCol]) setOtherReadAt(new Date(matchRow[otherCol]));
      } catch(e) { console.log('DEBUG readAt exception:', e); }
      const { data } = await supabase.from("messages").select("*").eq("match_id", chat.matchId).order("created_at", { ascending: true });
      setMsgs(data || []);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 600);
      // Fetch reactions for this match's messages
      if (data && data.length > 0) {
        const msgIds = data.map(m => m.id);
        const { data: rxData } = await supabase.from("message_reactions").select("*").in("message_id", msgIds);
        if (rxData) {
          const grouped = {};
          rxData.forEach(r => { if (!grouped[r.message_id]) grouped[r.message_id] = []; grouped[r.message_id].push(r); });
          setReactions(grouped);
        }
      }
      // Check for contact request
      const { data: cr } = await supabase.from("contact_requests").select("*").eq("match_id", chat.matchId).maybeSingle();
      if (cr) { setContactRequest(cr); if (cr.status === "accepted") setContactRevealed(true); }
    };
    fetchMsgs();

    const poll = setInterval(async () => {
      const { data } = await supabase.from("messages").select("*").eq("match_id", chat.matchId).order("created_at", { ascending: true });
      if (data) {
        setMsgs(prev => {
          const newMsgs = data.filter(m => !prev.find(p => p.id === m.id) && m.sender_id !== currentUser?.id);
          if (newMsgs.length > 0) playSound("receive");
          return data;
        });
        // Also refresh reactions
        const msgIds = data.map(m => m.id);
        if (msgIds.length > 0) {
          const { data: rxData } = await supabase.from("message_reactions").select("*").in("message_id", msgIds);
          if (rxData) {
            const grouped = {};
            rxData.forEach(r => { if (!grouped[r.message_id]) grouped[r.message_id] = []; grouped[r.message_id].push(r); });
            setReactions(grouped);
          }
        }
      }
      // Also refresh the other person's read_at for read receipts
      try {
        const { data: matchRow } = await supabase.from("matches").select("user1,user2,user1_read_at,user2_read_at").eq("id", chat.matchId).maybeSingle();
        if (matchRow) {
          const otherCol = matchRow.user1 === currentUser?.id ? "user2_read_at" : "user1_read_at";
          if (matchRow[otherCol]) setOtherReadAt(new Date(matchRow[otherCol]));
        }
      } catch(e) {}
    }, 8000);

    return () => clearInterval(poll);
  }, [chat.matchId]);

  // Scroll to bottom on first load (instant), then smooth on new messages
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (prevMsgCount.current === 0 && msgs.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    } else if (msgs.length > prevMsgCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCount.current = msgs.length;
  }, [msgs]);

  const toggleReaction = async (msgId, emoji) => {
    if (!currentUser) return;
    const existing = (reactions[msgId] || []).find(r => r.user_id === currentUser.id);
    if (existing && existing.emoji === emoji) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
      setReactions(prev => ({ ...prev, [msgId]: (prev[msgId] || []).filter(r => r.id !== existing.id) }));
    } else {
      if (existing) await supabase.from("message_reactions").delete().eq("id", existing.id);
      const { data } = await supabase.from("message_reactions").insert({ message_id: msgId, user_id: currentUser.id, emoji }).select().maybeSingle();
      if (data) setReactions(prev => ({ ...prev, [msgId]: [...(prev[msgId] || []).filter(r => r.user_id !== currentUser.id), data] }));
    }
    setReactionPickerMsgId(null);
  };

  const deleteForMe = async (msgId) => {
    if (deletingMsg) return;
    setDeletingMsg(true);
    try {
      const msg = msgs.find(m => m.id === msgId);
      const currentDeletedFor = msg?.deleted_for || [];
      if (!currentDeletedFor.includes(currentUser.id)) {
        const updated = [...currentDeletedFor, currentUser.id];
        const { error } = await supabase.from("messages").update({ deleted_for: updated }).eq("id", msgId);
        if (error) { console.error("Delete for me DB error:", error); alert("Couldn't delete message: " + error.message); }
        else setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, deleted_for: updated } : m));
      }
    } catch(e) { console.error("Delete for me error:", e); }
    setDeletingMsg(false);
    setDeleteMenuMsgId(null);
  };

  const deleteForEveryone = async (msgId) => {
    if (deletingMsg) return;
    setDeletingMsg(true);
    try {
      const { error } = await supabase.from("messages").update({ deleted_for_everyone: true }).eq("id", msgId);
      if (error) { console.error("Delete for everyone DB error:", error); alert("Couldn't delete message: " + error.message); }
      else setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, deleted_for_everyone: true } : m));
    } catch(e) { console.error("Delete for everyone error:", e); }
    setDeletingMsg(false);
    setDeleteMenuMsgId(null);
  };

  const send = async () => {
    if (!text.trim() || !currentUser || !chat.matchId) return;
    const content = text.trim();
    setText("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
    const replyData = replyingTo ? { reply_to_id: replyingTo.id, reply_to_content: replyingTo.content } : {};
    setReplyingTo(null);
    playSound("send");

    // Optimistically add the message immediately so it appears without waiting for the server
    const tempId = `temp-${Date.now()}`;
    const tempMsg = { id: tempId, match_id: chat.matchId, sender_id: currentUser.id, content, created_at: new Date().toISOString(), pending: true, ...replyData };
    setMsgs(prev => [...prev, tempMsg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { data: msgData, error } = await supabase.from("messages").insert({ match_id: chat.matchId, sender_id: currentUser.id, content, ...replyData }).select().maybeSingle();
    if (error) {
      console.error("Send message error:", error);
      setMsgs(prev => prev.filter(m => m.id !== tempId)); // Remove optimistic message on error
      return;
    }
    // Replace the optimistic message with the real one from the server
    setMsgs(prev => prev.map(m => m.id === tempId ? { ...msgData, pending: false } : m));
    try {
      const { data: senderProfile } = await supabase.from("profiles").select("name").eq("id", currentUser.id).maybeSingle();
      const senderName = senderProfile?.name || "Someone";
      const { error: emailErr } = await supabase.functions.invoke("send-message-email", { body: { matchId: chat.matchId, senderName, recipientId: chat.id, senderId: currentUser.id, messageId: msgData?.id } });
      if (emailErr) console.error("Email notify error:", emailErr);
      const { error: pushErr } = await supabase.functions.invoke("send-push-notification", { body: { recipientId: chat.id, title: `💬 New message from ${senderName}`, body: content, url: `https://app.meetfree.uk?chat=${chat.matchId}`, matchId: chat.matchId } });
      if (pushErr) console.error("Push notify error:", pushErr);
    } catch(e) { console.error("Notify error:", e); }
  };

  const handleUnmatch = async () => {
    if (!window.confirm(`Unmatch with ${chat.name}?`)) return;
    await supabase.from("matches").delete().eq("id", chat.matchId);
    onBack();
  };

  return (
    <PhoneShell>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(82,183,136,0.1)", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow:"hidden" }}>
          {chat.photo_url ? <img src={resizePhoto(chat.photo_url, 100)} alt={chat.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: theme.textDark, fontSize: 16 }}>{chat.name}{chat.is_real && <span title="Verified" style={{ marginLeft:4, fontSize:13 }}>✅</span>}</div>
          {lastSeenText(chat.last_seen) && <div style={{ fontSize: 11, color: lastSeenText(chat.last_seen).color, fontWeight: 600 }}>{lastSeenText(chat.last_seen).text}</div>}
        </div>
        <div style={{ position: "relative", display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => setShowSafetyTips(true)} title="Safety tips" style={{ ...iconBtn, fontSize:18, color:"#c0392b" }}>⚠️</button>
          <button onClick={() => setShowMenu(m => !m)} title="Notes, unmatch & report" style={iconBtn}>⋯</button>
          {showMenu && (
            <>
              <div style={{ position:"fixed", inset:0, zIndex:2 }} onClick={() => setShowMenu(false)} />
              <div style={{ position:"absolute", right:0, top:42, background:"white", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", border:"1px solid rgba(82,183,136,0.15)", zIndex:10, minWidth:140, overflow:"hidden" }}>
                <button onClick={() => { setShowMenu(false); if (isPremium) setShowNotes(true); else onUpgrade?.(); }} style={{ display:"block", width:"100%", padding:"12px 16px", background:"none", border:"none", textAlign:"left", fontSize:14, color:theme.textMid, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>📝 Notes{!isPremium && <span style={{ marginLeft:6, fontSize:10, fontWeight:700, color:"#d4a017" }}>GOLD</span>}</button>
                <button onClick={() => { setShowMenu(false); handleUnmatch(); }} style={{ display:"block", width:"100%", padding:"12px 16px", background:"none", border:"none", textAlign:"left", fontSize:14, color:theme.accent, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Unmatch</button>
                <button onClick={() => { setShowMenu(false); onNav("block"); }} style={{ display:"block", width:"100%", padding:"12px 16px", background:"none", border:"none", textAlign:"left", fontSize:14, color:theme.textMid, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Report</button>
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        <div style={{ textAlign: "center", fontSize: 11, color: theme.textLight, marginBottom: 8 }}>You matched with {chat.name} 🌱</div>

        {loading ? (
          <div style={{ textAlign:"center", color: theme.textMid, fontSize:13 }}>Loading messages...</div>
        ) : msgs.length === 0 ? (
          <div>
            <div style={{ textAlign:"center", color: theme.textMid, fontSize:13, marginBottom:16 }}>No messages yet — say hello! 👋</div>
            <div style={{ fontSize:12, color: theme.textLight, textAlign:"center", marginBottom:8, fontWeight:600 }}>Need a conversation starter?</div>
            {getConversationStarters([], typeof chat.interests === "string" ? (() => { try { return JSON.parse(chat.interests || "[]"); } catch(e) { return []; } })() : (chat.interests || [])).map((s, i) => (
              <div key={i} onClick={() => setText(s)} style={{ background:"rgba(82,183,136,0.08)", borderRadius:12, padding:"10px 14px", fontSize:13, color:theme.greenDeep, cursor:"pointer", marginBottom:8, textAlign:"center", border:"1px solid rgba(82,183,136,0.2)" }}>
                {s}
              </div>
            ))}
            <div style={{ fontSize:11, color:theme.textLight, textAlign:"center", marginTop:4 }}>Tap to use as your opening message</div>
          </div>
        ) : (
          msgs.filter(m => !(m.deleted_for || []).includes(currentUser?.id)).map((m, idx) => {
            const isMe = m.sender_id === currentUser?.id;
            const msgDate = m.created_at ? new Date(m.created_at) : null;
            const now = new Date();
            const isToday = msgDate && msgDate.toDateString() === now.toDateString();
            const isThisYear = msgDate && msgDate.getFullYear() === now.getFullYear();
            const time = msgDate ? (isToday ? msgDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : isThisYear ? msgDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + msgDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : msgDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) + " " + msgDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })) : "";
            // Show ticks on all my messages — green/Seen if other person has read past that point
            const myMsgs = msgs.filter(x => x.sender_id === currentUser?.id);
            const isLastMine = isMe && m.id === myMsgs[myMsgs.length - 1]?.id;
            const isSeen = isMe && otherReadAt && msgDate && otherReadAt > msgDate;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", position: "relative" }}
                onTouchStart={(e) => {
                  swipeStartX.current = e.touches[0].clientX;
                  setSwipeMsgId(m.id);
                  if (!m.deleted_for_everyone) {
                    const touch = e.touches[0];
                    e.currentTarget._longPress = setTimeout(() => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setReactionPickerMsgId(m.id);
                      setReactionAnchor({ top: r.top - 60, isMe });
                    }, 500);
                  }
                }}
                onTouchMove={(e) => {
                  if (swipeStartX.current === null || swipeMsgId !== m.id) return;
                  const delta = e.touches[0].clientX - swipeStartX.current;
                  // Cancel long-press if user starts swiping
                  if (Math.abs(delta) > 10) clearTimeout(e.currentTarget._longPress);
                  // Swipe right to reply (works for both sent and received messages)
                  const clamped = Math.max(0, Math.min(delta, 90));
                  setSwipeOffset(clamped);
                }}
                onTouchEnd={(e) => {
                  clearTimeout(e.currentTarget._longPress);
                  if (swipeMsgId === m.id && swipeOffset > SWIPE_THRESHOLD) {
                    setReplyingTo({ id: m.id, content: m.content, senderName: isMe ? "you" : chat.name });
                    inputRef.current?.focus();
                  }
                  setSwipeMsgId(null);
                  setSwipeOffset(0);
                  swipeStartX.current = null;
                }}
                onMouseEnter={() => setHoveredMsgId(m.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {swipeMsgId === m.id && swipeOffset > 15 && (
                  <div style={{ position:"absolute", left: isMe ? "auto" : -40, right: isMe ? -40 : "auto", top:"50%", transform:"translateY(-50%)", width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, background: swipeOffset > SWIPE_THRESHOLD ? theme.greenBright : "rgba(82,183,136,0.2)", color: swipeOffset > SWIPE_THRESHOLD ? "white" : theme.greenMid, opacity: Math.min(swipeOffset / 30, 1), transition:"background 0.15s, color 0.15s" }}>↩</div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%", transform: swipeMsgId === m.id ? `translateX(${swipeOffset}px)` : "translateX(0)", transition: swipeMsgId === m.id ? "none" : "transform 0.2s ease-out" }}>
                  <div onClick={(e) => { if (!isActualMobile && swipeOffset < 15 && !m.deleted_for_everyone) { if (deleteMenuMsgId === m.id) { setDeleteMenuMsgId(null); setMenuAnchor(null); } else { const r = e.currentTarget.getBoundingClientRect(); const menuWidth = 160; const margin = 8; const clampedLeft = Math.min(r.left, window.innerWidth - menuWidth - margin); setMenuAnchor({ top: r.bottom + 4, left: Math.max(margin, clampedLeft), isMe }); setDeleteMenuMsgId(m.id); } } }} style={{ maxWidth: "72%", minWidth: 60, borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.content.startsWith("[img]") ? "transparent" : isMe ? theme.greenDeep : "white", color: isMe ? "white" : theme.textDark, fontSize: 14, lineHeight: 1.5, boxShadow: m.content.startsWith("[img]") ? "none" : "0 2px 8px rgba(26,58,42,0.08)", overflow: "hidden", cursor: "pointer", opacity: m.pending ? 0.7 : 1, transition: "opacity 0.3s" }}>
                  {m.reply_to_content && (
                    <div style={{ margin:"8px 8px 0", padding:"6px 10px", borderLeft:`3px solid ${isMe ? "rgba(255,255,255,0.5)" : theme.greenBright}`, background: isMe ? "rgba(255,255,255,0.15)" : "rgba(82,183,136,0.08)", borderRadius:6, fontSize:11, color: isMe ? "rgba(255,255,255,0.8)" : theme.textMid }}>
                      ↩ {m.reply_to_content.startsWith("[img]") ? "📷 Photo" : m.reply_to_content.slice(0, 60) + (m.reply_to_content.length > 60 ? "…" : "")}
                    </div>
                  )}
                  <div style={{ padding: m.content.startsWith("[img]") ? 0 : "10px 14px", whiteSpace: "pre-wrap" }}>
                    {m.deleted_for_everyone
                      ? <span style={{ fontStyle:"italic", color: isMe ? "rgba(255,255,255,0.6)" : theme.textLight, fontSize:13 }}>🚫 This message was deleted</span>
                      : m.content.startsWith("[img]") && m.content.endsWith("[/img]")
                      ? <img src={m.content.slice(5, -6)} alt="shared" style={{ maxWidth: "220px", maxHeight: "220px", borderRadius: 14, display: "block", objectFit: "cover" }} />
                      : m.content
                    }
                  </div>
                  {isMe && (
                    <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:4, padding:"2px 10px 6px", marginTop:-4 }}>
                      {time && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{time}</div>}
                      {m.pending && <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1 }}>⏱</div>}
                      {!m.pending && !isSeen && <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1 }}>✓✓</div>}
                      {!m.pending && isSeen && !isLastMine && <div style={{ fontSize:11, color:"#00ffaa", fontWeight:700, lineHeight:1 }}>✓✓</div>}
                      {!m.pending && isSeen && isLastMine && <div style={{ fontSize:11, color:"#00ffaa", fontWeight:700, lineHeight:1 }}>Seen</div>}
                    </div>
                  )}
                </div>
                {!m.deleted_for_everyone && (
                  <button onClick={() => { setReplyingTo({ id: m.id, content: m.content, senderName: isMe ? "you" : chat.name }); inputRef.current?.focus(); }} title="Reply" style={{ marginLeft:"auto", background:"rgba(82,183,136,0.12)", border:"none", borderRadius:"50%", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13, color:theme.greenMid, flexShrink:0, opacity: (isActualMobile || hoveredMsgId === m.id) ? 1 : 0, pointerEvents: (isActualMobile || hoveredMsgId === m.id) ? "auto" : "none", transition:"opacity 0.15s" }}>↩</button>
                )}
                {!isMe && !m.deleted_for_everyone && (
                  <button
                    onClick={(e) => {
                      if (isActualMobile) {
                        toggleReaction(m.id, "❤️");
                      } else {
                        const r = e.currentTarget.getBoundingClientRect();
                        setReactionPickerMsgId(reactionPickerMsgId === m.id ? null : m.id);
                        setReactionAnchor({ top: r.top - 60, isMe });
                      }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setReactionPickerMsgId(reactionPickerMsgId === m.id ? null : m.id); setReactionAnchor({ top: r.top - 60, isMe }); }}
                    onTouchStart={(e) => { const btn = e.currentTarget; btn._longPress = setTimeout(() => { const r = btn.getBoundingClientRect(); setReactionPickerMsgId(m.id); setReactionAnchor({ top: r.top - 60, isMe }); }, 500); }}
                    onTouchEnd={(e) => { clearTimeout(e.currentTarget._longPress); }}
                    title={isActualMobile ? "Tap to ❤️ · Hold for more" : "Click to ❤️ · Right-click for more"}
                    style={{ background:"rgba(82,183,136,0.12)", border:"none", borderRadius:"50%", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13, color:theme.greenMid, flexShrink:0, opacity: (isActualMobile || hoveredMsgId === m.id) ? 1 : 0, transition:"opacity 0.15s" }}
                  >🤍</button>
                )}
                {!m.deleted_for_everyone && (
                  <button onClick={(e) => { e.stopPropagation(); if (deleteMenuMsgId === m.id) { setDeleteMenuMsgId(null); setMenuAnchor(null); } else { const r = e.currentTarget.getBoundingClientRect(); const menuWidth = 160; const margin = 8; const clampedLeft = Math.min(r.left, window.innerWidth - menuWidth - margin); setMenuAnchor({ top: r.bottom + 4, left: Math.max(margin, clampedLeft), isMe }); setDeleteMenuMsgId(m.id); } }} title="More options" style={{ background:"rgba(82,183,136,0.12)", border:"none", borderRadius:"50%", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13, color:theme.greenMid, flexShrink:0, opacity: (isActualMobile || hoveredMsgId === m.id || deleteMenuMsgId === m.id) ? 1 : 0, transition:"opacity 0.15s", position:"relative", zIndex: 1000 }}>⋯</button>
                )}
                {deleteMenuMsgId === m.id && menuAnchor && createPortal(
                  <>
                    <div onClick={() => { setDeleteMenuMsgId(null); setMenuAnchor(null); }} style={{ position:"fixed", inset:0, zIndex:998, background:"transparent" }} />
                    <div style={{ position:"fixed", top: menuAnchor.top, left: menuAnchor.left, background:"white", borderRadius:12, boxShadow:"0 4px 16px rgba(26,58,42,0.18)", zIndex:999, minWidth:160, overflow:"hidden" }}>
                      <button onClick={() => { deleteForMe(m.id); setMenuAnchor(null); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 16px", background:"white", border:"none", cursor:"pointer", fontSize:13, color:theme.textDark, fontFamily:"'DM Sans',sans-serif" }}>🗑 Delete for me</button>
                      {isMe && <button onClick={() => { deleteForEveryone(m.id); setMenuAnchor(null); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 16px", background:"white", border:"none", borderTop:"1px solid rgba(82,183,136,0.1)", cursor:"pointer", fontSize:13, color:"#e05a5a", fontFamily:"'DM Sans',sans-serif" }}>🗑 Delete for everyone</button>}
                    </div>
                  </>,
                  document.body
                )}
                </div>
                {/* Reaction display row */}
                {(reactions[m.id] || []).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    {Object.entries((reactions[m.id] || []).reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || []); acc[r.emoji].push(r.user_id); return acc; }, {})).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} style={{ background: users.includes(currentUser?.id) ? "rgba(82,183,136,0.2)" : "rgba(0,0,0,0.06)", border: users.includes(currentUser?.id) ? "1px solid rgba(82,183,136,0.4)" : "1px solid rgba(0,0,0,0.08)", borderRadius:12, padding:"2px 7px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                        {emoji}<span style={{ fontSize:11, color:theme.textMid }}>{users.length > 1 ? users.length : ""}</span>
                      </button>
                    ))}
                    <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setReactionPickerMsgId(reactionPickerMsgId === m.id ? null : m.id); setReactionAnchor({ top: r.top - 60, left: isMe ? "auto" : r.left, right: isMe ? window.innerWidth - r.right : "auto", isMe }); }} style={{ background:"rgba(0,0,0,0.04)", border:"1px solid rgba(0,0,0,0.08)", borderRadius:12, padding:"2px 7px", fontSize:13, cursor:"pointer", color:theme.textLight }}>+</button>
                  </div>
                )}
                {/* Reaction picker popup — centred horizontally, anchored vertically to message */}
                {reactionPickerMsgId === m.id && reactionAnchor && createPortal(
                  <>
                    <div onClick={() => { setReactionPickerMsgId(null); setReactionAnchor(null); }} style={{ position:"fixed", inset:0, zIndex:997, background:"transparent" }} />
                    <div style={{ position:"fixed", top: reactionAnchor.top, left:"50%", transform:"translateX(-50%)", background:"white", borderRadius:50, boxShadow:"0 4px 20px rgba(26,58,42,0.2)", zIndex:998, display:"flex", gap:2, padding:"8px 10px", maxWidth:"95vw", flexWrap:"nowrap" }}>
                      {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => { toggleReaction(m.id, emoji); setReactionAnchor(null); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", padding:"4px 5px", borderRadius:8, transition:"transform 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.transform="scale(1.3)"}
                          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                        >{emoji}</button>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
                {!isMe && time && (
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3, marginBottom:4, paddingLeft:4 }}>
                    <div style={{ fontSize: 10, color: theme.textLight }}>{time}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {contactRequest && contactRequest.status === "pending" && contactRequest.requester_id === currentUser?.id && (
        <div style={{ background: "rgba(82,183,136,0.08)", padding: "10px 16px", textAlign: "center", borderTop: "1px solid rgba(82,183,136,0.1)" }}>
          <div style={{ fontSize: 13, color: theme.greenDeep, fontWeight: 600 }}>☎️ Contact request sent</div>
          <div style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>Waiting for {chat.name} to accept</div>
        </div>
      )}
      {contactRequest && contactRequest.status === "pending" && contactRequest.recipient_id === currentUser?.id && (
        <div style={{ background: "rgba(82,183,136,0.08)", padding: "10px 16px", textAlign: "center", borderTop: "1px solid rgba(82,183,136,0.1)" }}>
          <div style={{ fontSize: 13, color: theme.greenDeep, fontWeight: 600, marginBottom: 8 }}>☎️ {chat.name} wants to share contact details</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={async () => {
              await supabase.from("contact_requests").update({ status: "accepted" }).eq("id", contactRequest.id);
              setContactRequest({ ...contactRequest, status: "accepted" });
              setContactRevealed(true);
            }} style={{ padding: "8px 20px", borderRadius: 50, background: "#52b788", border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Accept</button>
            <button onClick={async () => {
              await supabase.from("contact_requests").update({ status: "declined" }).eq("id", contactRequest.id);
              setContactRequest({ ...contactRequest, status: "declined" });
            }} style={{ padding: "8px 20px", borderRadius: 50, background: "none", border: "1px solid rgba(82,183,136,0.3)", color: theme.textMid, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Decline</button>
          </div>
        </div>
      )}
      {contactRequest && contactRequest.status === "declined" && (
        <div style={{ background: "rgba(224,122,95,0.08)", padding: "10px 16px", textAlign: "center", borderTop: "1px solid rgba(224,122,95,0.2)" }}>
          <div style={{ fontSize: 13, color: "#e07a5f" }}>Contact request was declined</div>
        </div>
      )}
      {contactRevealed && (
        <div style={{ background: "rgba(82,183,136,0.12)", padding: "10px 16px", textAlign: "center", borderTop: "1px solid rgba(82,183,136,0.3)" }}>
          <div style={{ fontSize: 13, color: theme.greenDeep, fontWeight: 700, marginBottom: 2 }}>☎️ Contact details shared!</div>
          <div style={{ fontSize: 13, color: theme.textMid }}>{chat.email || "No email on file"}</div>
        </div>
      )}
      {!loading && msgs.filter(m => !m.deleted_for_everyone).length < 6 && !inputFocused && !contactRequest && !contactRevealed && (
      <div style={{ padding: "6px 16px 2px", display: "flex", gap: 8, background: "white", borderTop: "1px solid rgba(82,183,136,0.1)", flexShrink: 0 }}>
        <button onClick={() => setText("Fancy meeting up sometime? ☕")} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, border: "1px solid rgba(82,183,136,0.3)", background: "white", color: theme.greenMid, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>☕ Suggest meeting up</button>
        <button onClick={() => setShowSafetyPrompt(true)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, border: "1px solid rgba(82,183,136,0.3)", background: "white", color: theme.greenMid, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>☎️ Share number</button>
        {showSafetyPrompt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "white", borderRadius: 20, padding: 28, maxWidth: 320, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🌿</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a3a2a", marginBottom: 12 }}>Stay safe</div>
              <div style={{ fontSize: 14, color: "#4a7c59", lineHeight: 1.6, marginBottom: 20 }}>Only share personal details when you feel ready and trust the other person. Never feel pressured to share your number. MeetFree cannot see or store any details you share in chat.</div>
              <button onClick={async () => {
                setShowSafetyPrompt(false);
                // Create contact request
                const { data: cr, error: crError } = await supabase.from("contact_requests").insert({
                  match_id: chat.matchId,
                  requester_id: currentUser.id,
                  recipient_id: chat.id,
                  status: "pending"
                }).select().maybeSingle();
                if (cr) {
                  setContactRequest(cr);
                  // Email the recipient
                  const { data: myProfile } = await supabase.from("profiles").select("name").eq("id", currentUser.id).maybeSingle();
                  await supabase.functions.invoke("send-contact-request-email", { body: { matchId: chat.matchId, requesterName: myProfile?.name || "Someone", recipientId: chat.id } });
                }
              }} style={{ width: "100%", padding: "12px", borderRadius: 50, background: "#52b788", border: "none", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }}>I understand</button>
              <button onClick={() => setShowSafetyPrompt(false)} style={{ width: "100%", padding: "12px", borderRadius: 50, background: "none", border: "1px solid rgba(82,183,136,0.3)", color: "#4a7c59", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      )}
      {showEmojis && (() => {
        const recentEmojis = (() => { try { return JSON.parse(localStorage.getItem("meetfree_recent_emojis") || "[]"); } catch(e) { return []; } })();
        const emojiCategories = {
          recent: recentEmojis,
          faces: ["😊","😂","🤣","😅","😍","🥰","😘","😏","😌","🤩","😎","🤗","😇","🥳","😋","😜","🤪","😝","😤","😭","😩","🥺","😴","🤔","🤭","🤤","😬","🙄","😲","🤯","🥵","🥶","😷","🤒","🤕","🤑","😈","👿","💀","👻","🤡","💩","🙈","🙉","🙊","😐","😑","🤐","😶","😶‍🌫️","🫡","🤫","🫠","🥴","😵","🤠","🥸","🤥","😿","😾","🙀","😸","😹","😺","😻"],
          hearts: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💝","💘","💟","❣️","💌","🫶","👍","👎","👌","✌️","🤞","🤝","🙏","👋","🤙","💪","🦾","✊","👊","🫵","👆","👇","👈","👉","☝️","🖕","✨","🎉","🔥","⭐","💫","🌟","✅","❌","💯","🆕","🆒","🆓","🔞","⚠️","❗","❓","💢","💥","💦","💨","🕊️","🎯","🏆","🥇","🎀","🎁","🎈","🎊"],
          nature: ["🌱","🌿","🍀","🌺","🌸","🌹","🌷","🌻","🌼","🌾","🍁","🍂","🍃","🌊","🌈","☀️","🌙","⭐","☁️","⚡","🌴","🌵","🎋","🎍","🪴","🌲","🌳","🌦️","🌤️","⛅","🌧️","🌨️","❄️","🌬️","🌀","🌪️","🌫️","🌈","🔆","🔅","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿️","🦔"],
          food: ["🥑","🥦","🥕","🌽","🍅","🍆","🥔","🧅","🧄","🥬","🥒","🫑","🌶️","🫒","🍄","🥗","🍱","🍜","🍛","🫕","🥙","🌮","🌯","🥪","🍕","🍔","🍟","🌭","🥞","🧇","🍳","🥚","🧀","🥛","☕","🍵","🧃","🥤","🍹","🥂","🍷","🍺","🧋","🧊","🍸","🍾","🍶","🫖","🍼","🥃","🍻","🍓","🫐","🍊","🍋","🍇","🍉","🍎","🍏","🍑","🍒","🍌","🍍","🥭","🍐","🫒","🍈","🍒","🫑","🎂","🍰","🧁","🍩","🍪","🍫","🍬","🍭","🍮","🍯","🍡","🍧","🍨","🍦","🥧","🍏","🧆","🥜","🌰","🍞","🥐","🥖","🫓","🥨","🧀","🥗","🍲","🫔","🥘","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡"],
          activities: ["🏃","🚴","🧘","🏋️","🤸","🏊","🧗","🏄","🤾","🏇","🧜","🤺","🏹","🥊","🥋","🎽","🛹","🛼","🛷","⛷️","🏂","🏌️","🏇","🧘","🤾","🏊","🤽","🚵","🎿","⛸️","🥅","⛳","🎣","🤿","🎽","🎯","🎱","🎮","🕹️","🎰","🎲","♟️","🧩","🪆","🪅","🎭","🎨","🖼️","🎪","🎤","🎧","🎼","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🪕","🥁","🪘","📻","📺","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","💻","🖥️","🖨️","⌨️","🖱️","💾","💿","📀","📱","☎️","📲","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧲","🔧","🔨","⚒️","🛠️","⛏️","🪛","🔩","⚙️","🗜️","🔗","⛓️","🪝","🧲","🔫","💣","🪓","🔪","🗡️","⚔️","🛡️","✈️","🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🛻","🚚","🚛","🚜","🏎️","🏍️","🛵","🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️"]
        };
        const cats = [{id:"recent",icon:"🕐"},{id:"faces",icon:"😊"},{id:"hearts",icon:"❤️"},{id:"nature",icon:"🌿"},{id:"food",icon:"🥑"},{id:"activities",icon:"🏃"}];
        return (
          <div style={{ background: "white", borderTop: "1px solid rgba(82,183,136,0.1)" }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(82,183,136,0.1)" }}>
              {cats.map(c => (
                <div key={c.id} onClick={() => setEmojiCategory(c.id)} style={{ flex: 1, textAlign: "center", padding: "6px 0", fontSize: 18, cursor: "pointer", borderBottom: emojiCategory === c.id ? "2px solid #52b788" : "2px solid transparent" }}>{c.icon}</div>
              ))}
            </div>
            <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 150, overflowY: "auto" }}>
              {emojiCategories[emojiCategory].map(emoji => (
                <span key={emoji} onClick={() => {
                  setText(t => t + emoji);
                  inputRef.current?.focus();
                  try {
                    const recent = JSON.parse(localStorage.getItem("meetfree_recent_emojis") || "[]");
                    const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 24);
                    localStorage.setItem("meetfree_recent_emojis", JSON.stringify(updated));
                  } catch(e) {}
                }} style={{ fontSize: 22, cursor: "pointer", padding: 2 }}>{emoji}</span>
              ))}
            </div>
          </div>
        );
      })()}
      <div style={{ padding: "8px 16px 12px", display: "flex", flexDirection:"column", gap: 0, background: "white", flexShrink: 0 }}>
        {replyingTo && (
          <div style={{ background:"rgba(82,183,136,0.08)", borderTop:"1px solid rgba(82,183,136,0.2)", borderBottom:"1px solid rgba(82,183,136,0.1)", padding:"6px 16px", display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:theme.greenMid }}>↩ Replying to {replyingTo.senderName}</div>
              <div style={{ fontSize:12, color:theme.textMid, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{replyingTo.content.startsWith("[img]") ? "📷 Photo" : replyingTo.content.slice(0, 50)}</div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:theme.textLight, padding:0 }}>✕</button>
          </div>
        )}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <button onClick={() => setShowEmojis(e => !e)} style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1px solid rgba(82,183,136,0.2)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>😊</button>
        <label style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1px solid rgba(82,183,136,0.2)", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          📎
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
            const file = e.target.files[0];
            if (!file || !currentUser) return;
            const ext = file.name.split(".").pop().toLowerCase();
            const path = `${currentUser.id}/${chat.matchId}-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from("chat-images").upload(path, file, { upsert: false, contentType: file.type });
            if (error) { alert("Image upload failed — please try again."); return; }
            const { data: { publicUrl } } = supabase.storage.from("chat-images").getPublicUrl(path);
            const imgMsg = { match_id: chat.matchId, sender_id: currentUser.id, content: `[img]${publicUrl}[/img]`, created_at: new Date().toISOString() };
            const { data: sent } = await supabase.from("messages").insert(imgMsg).select().maybeSingle();
            if (sent) { setMsgs(prev => [...prev, sent]); playSound("send"); }
            e.target.value = "";
          }} />
        </label>
        <textarea ref={inputRef} value={text} onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} onKeyDown={e => {
          const enterToSend = (() => { try { return localStorage.getItem("meetfree_enter_to_send") === "true"; } catch(e) { return false; } })();
          if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); send(); }
          if (e.key === "Enter" && e.shiftKey) { /* allow new line */ }
        }} placeholder="Message..." onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} rows={1} style={{ flex: 1, padding: "10px 16px", borderRadius: 20, border: "2px solid rgba(82,183,136,0.2)", background: theme.warmWhite, fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none", resize: "none", overflow: "hidden", lineHeight: 1.4, maxHeight: 120 }} />
        <button onMouseDown={e => e.preventDefault()} onClick={send} style={{ width: 40, height: 40, borderRadius: "50%", background: theme.greenBright, border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>↑</button>
        </div>
      </div>
      {(!inputFocused || !isActualMobile) && <BottomNav active="chat" onNav={(screen) => { if (screen === "chat") onBack(); else onNav(screen); }} isPremium={isPremium} unreadCount={unreadCount} />}
      {showSafetyTips && <SafetyTipsOverlay onClose={() => setShowSafetyTips(false)} />}
      {showNotes && <PrivateNotesOverlay matchId={chat.matchId} matchName={chat.name} currentUser={currentUser} onClose={() => setShowNotes(false)} />}
    </PhoneShell>
  );
};

// ─── ADMIN USER LIST ──────────────────────────────────────────────────────────

const AdminUserList = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, last_seen, created_at, is_premium, visible")
      .eq("is_real", true)
      .order("last_seen", { ascending: false, nullsFirst: false });

    if (!profiles) { setLoading(false); return; }

    const enriched = await Promise.all(profiles.map(async (p) => {
      const [{ count: matchCount }, { count: msgCount }] = await Promise.all([
        supabase.from("matches").select("id", { count: "exact", head: true }).or(`user1.eq.${p.id},user2.eq.${p.id}`),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", p.id),
      ]);
      return { ...p, matchCount: matchCount || 0, msgCount: msgCount || 0 };
    }));

    setUsers(enriched);
    setLoading(false);
    setExpanded(true);
  };

  const formatLastSeen = (ts) => {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 2) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em" }}>👥 Real Users ({users.length || "?"})</div>
        <button onClick={expanded ? () => setExpanded(false) : load} style={{ background:theme.greenBright, color:"white", border:"none", borderRadius:50, padding:"4px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {loading ? "Loading..." : expanded ? "Hide" : "Load"}
        </button>
      </div>
      {expanded && (
        <div style={{ background:"white", borderRadius:14, border:"1px solid rgba(82,183,136,0.15)", overflow:"hidden" }}>
          {users.map((u, i) => (
            <div key={u.id} style={{ padding:"12px 16px", borderBottom: i < users.length - 1 ? "1px solid rgba(82,183,136,0.08)" : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:theme.textDark, display:"flex", alignItems:"center", gap:6 }}>
                    {u.name || "—"}
                    {u.is_premium && <span style={{ fontSize:10, background:theme.gold, color:"white", borderRadius:50, padding:"1px 7px", fontWeight:700 }}>Gold</span>}
                    {!u.visible && <span style={{ fontSize:10, background:theme.textLight, color:"white", borderRadius:50, padding:"1px 7px" }}>Hidden</span>}
                  </div>
                  <div style={{ fontSize:11, color:theme.textLight, marginTop:2 }}>{u.email}</div>
                </div>
                <div style={{ fontSize:11, color: formatLastSeen(u.last_seen) === "Never" ? theme.accent : theme.textMid, textAlign:"right", fontWeight:600 }}>
                  {formatLastSeen(u.last_seen)}
                </div>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:6 }}>
                <div style={{ fontSize:11, color:theme.textMid }}>💬 {u.matchCount} match{u.matchCount !== 1 ? "es" : ""}</div>
                <div style={{ fontSize:11, color:theme.textMid }}>✉️ {u.msgCount} message{u.msgCount !== 1 ? "s" : ""}</div>
                <div style={{ fontSize:11, color:theme.textLight }}>Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"2-digit" })}</div>
              </div>
            </div>
          ))}
          {users.length === 0 && !loading && <div style={{ padding:16, fontSize:13, color:theme.textLight, textAlign:"center" }}>No real users found</div>}
        </div>
      )}
    </div>
  );
};

// ─── PROFILE ──────────────────────────────────────────────────────────────────

const ProfileScreen = ({ onNav, isPremium, onUpgrade, currentUser, onLogout, unreadCount = 0 }) => {
  const [user, setUser] = useState({ id: currentUser?.id, name: "My Profile", age: "", city: "", bio: "", diet: "Vegan", interests: [] });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ id: currentUser?.id, name: "My Profile", age: "", city: "", bio: "", diet: "Vegan", interests: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userPhotos, setUserPhotos] = useState([]); // array of public URLs, max 5
  const [uploadingSlot, setUploadingSlot] = useState(null); // which slot is uploading
  const [photoSaved, setPhotoSaved] = useState(false); // toast confirmation
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [boostedUntil, setBoostedUntil] = useState(null);
  const [stats, setStats] = useState({ likes: 0, matches: 0, complete: 0, missing: [] });
  const [boosting, setBoosting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [photoOffsetY, setPhotoOffsetY] = useState(50);
  const [photoOffsetX, setPhotoOffsetX] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(50);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = (clientY - dragStartY) / 0.96;
      setPhotoOffsetY(Math.max(0, Math.min(100, dragStartOffset + delta)));
    };
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [dragging, dragStartY, dragStartOffset]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const authUser = currentUser;
        if (!authUser) {
          const fallback = { id: currentUser?.id, email: currentUser?.email, name: "My Profile", age: "", city: "", bio: "", diet: "Vegan", interests: [] };
          setUser(fallback); setEditData(fallback); return;
        }
        const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        if (data) {
          const normalized = { ...data, interests: parseInterests(data.interests), photo_url: data.photo_url ? data.photo_url + "?t=" + Date.now() : data.photo_url };
          setUser(normalized); setEditData({ ...data, interests: parseInterests(data.interests) });
          if (data.photo_offset_x != null) setPhotoOffsetX(data.photo_offset_x);
          if (data.photo_offset_y != null) setPhotoOffsetY(data.photo_offset_y);
          // Seed photos array
          const storedPhotos = Array.isArray(data.photos) ? data.photos : (data.photos ? (() => { try { return JSON.parse(data.photos); } catch(e) { return []; } })() : []);
          if (storedPhotos.length > 0) {
            setUserPhotos(storedPhotos);
          } else if (data.photo_url) {
            setUserPhotos([data.photo_url]);
          }
          // Compute profile completeness
          const completenessFields = [
            { key: "photo", label: "Add a photo", value: normalized.photo_url },
            { key: "bio", label: "Write a bio", value: normalized.bio },
            { key: "interests", label: "Add interests", value: (normalized.interests||[]).length > 0 },
            { key: "diet", label: "Set your diet", value: normalized.diet },
            { key: "looking_for", label: "Set what you're looking for", value: normalized.looking_for },
            { key: "age", label: "Add your age", value: normalized.age },
            { key: "postcode", label: "Add your postcode area", value: normalized.postcode },
            { key: "name", label: "Add your name", value: normalized.name },
          ];
          const filled = completenessFields.filter(f => f.value).length;
          const complete = Math.round((filled / completenessFields.length) * 100);
          const missing = completenessFields.filter(f => !f.value);
          // Fetch likes received and matches count
          const [{ count: likesCount }, { count: matchesCount }] = await Promise.all([
            supabase.from("likes").select("id", { count: "exact", head: true }).eq("from_user", authUser.id),
            supabase.from("matches").select("id", { count: "exact", head: true }).or(`user1.eq.${authUser.id},user2.eq.${authUser.id}`),
          ]);
          setStats({ likes: likesCount || 0, matches: matchesCount || 0, complete, missing });
          if (data.boosted_until) setBoostedUntil(new Date(data.boosted_until));
        } else {
          const fallback = { id: authUser.id, email: authUser.email, name: authUser.email?.split("@")[0] || "My Profile", age: "", city: "", bio: "", diet: "Vegan", interests: [] };
          setUser(fallback); setEditData(fallback);
        }
      } catch(e) {
        console.error("Profile load error:", e);
        setLoadError("Could not load profile. Please try again.");
        const fallback = { id: currentUser?.id, email: currentUser?.email, name: "My Profile", age: "", city: "", bio: "", diet: "Vegan", interests: [] };
        setUser(fallback); setEditData(fallback);
      }
    };
    loadProfile();
  }, []);

  const saveProfile = async () => {
    setSaveError(null);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const uid = authUser?.id || currentUser?.id;
    if (!uid) return;
    // Validate age
    const age = parseInt(editData.age);
    if (editData.age && (isNaN(age) || age < 18 || age > 100)) {
      setSaveError("Please enter a valid age between 18 and 100."); return;
    }
    if (editData.postcode && !/^[A-Z]{1,2}/i.test(editData.postcode.trim())) { setSaveError("Please enter a valid UK postcode area (e.g. SP, SO, SW1, BH)."); return; }
    const { error } = await supabase.from("profiles").update({
      name: editData.name,
      age: age || null,
      city: editData.city,
      postcode: editData.postcode ? editData.postcode.toUpperCase() : "",
      looking_for: editData.looking_for || "",
      gender: editData.gender || "",
      show_me: editData.show_me || "Everyone",
      bio: editData.bio?.slice(0, 300) || "",
      smoker: editData.smoker || false,
      diet: editData.diet || "Vegan",
      interests: editData.interests || [],
    }).eq("id", uid);
    if (error) { setSaveError("Failed to save profile. Please try again."); return; }
    if (editData.postcode) {
      // Take just the outward code (before the space) e.g. "SP6 3BP" -> "SP6"
      const postcodeClean = editData.postcode.trim().toUpperCase().split(" ")[0].replace(/[^A-Z0-9]/g, "");
      if (postcodeClean.length < 2 || !/^[A-Z]/.test(postcodeClean)) {
        alert("Please enter a valid UK postcode area (e.g. BH, SO, SW1, EC1A)");
        return;
      }
      editData.postcode = postcodeClean;
    }
    setUser({...user, ...editData});
    setEditing(false);
  };

  const compressImage = (file, maxWidth = 800) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });


  const handleBoost = async () => {
    if (!currentUser || boosting) return;
    const { data: prof } = await supabase.from("profiles").select("last_boosted").eq("id", currentUser.id).maybeSingle();
    if (prof?.last_boosted) {
      const daysSince = (new Date() - new Date(prof.last_boosted)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        const daysLeft = Math.ceil(7 - daysSince);
        alert(`You can boost again in ${daysLeft} day${daysLeft > 1 ? "s" : ""}.`);
        return;
      }
    }
    setBoosting(true);
    const boostedUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await supabase.from("profiles").update({ boosted_until: boostedUntilDate.toISOString(), last_boosted: new Date().toISOString() }).eq("id", currentUser.id);
    setBoostedUntil(boostedUntilDate);
    setBoosting(false);
    alert("Your profile has been boosted for 24 hours! 🚀");
  };

  const handlePhotoUpload = async (e, slotIdx) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedTypes = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedTypes.includes(ext)) { alert("Please upload an image file (jpg, png, webp, gif)."); return; }
    setUploadingSlot(slotIdx);
    setUploading(true);
    setUploadProgress(10);
    const compressed = await compressImage(file);
    // Use timestamp in filename so deleting + re-uploading never overwrites an existing photo
    const path = currentUser.id + "-photo-" + Date.now() + ".jpg";
    const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 300);
    let uploadError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase.storage.from("avatars").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      if (!error) { uploadError = null; break; }
      uploadError = error;
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
    }
    clearInterval(progressInterval);
    if (uploadError) { console.error("Upload failed:", uploadError); setUploading(false); setUploadingSlot(null); setUploadProgress(0); alert("Upload failed. Please try again."); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const bustUrl = publicUrl + "?t=" + Date.now();
    const newPhotos = [...userPhotos];
    newPhotos[slotIdx] = publicUrl;
    setUserPhotos(newPhotos);
    // Slot 0 = main photo_url
    const updates = { photos: newPhotos };
    if (slotIdx === 0) { updates.photo_url = publicUrl; setUser(u => ({ ...u, photo_url: bustUrl })); }
    await supabase.from("profiles").update(updates).eq("id", currentUser.id);
    setUploadProgress(100);
    setTimeout(() => { setUploading(false); setUploadingSlot(null); setUploadProgress(0); }, 500);
    setPhotoSaved(true); setTimeout(() => setPhotoSaved(false), 2500);
  };

  const handlePhotoDelete = async (slotIdx) => {
    if (!window.confirm("Remove this photo?")) return;
    const newPhotos = userPhotos.filter((_, i) => i !== slotIdx);
    setUserPhotos(newPhotos);
    const updates = { photos: newPhotos };
    if (slotIdx === 0) { updates.photo_url = newPhotos[0] || null; setUser(u => ({ ...u, photo_url: newPhotos[0] || null })); }
    await supabase.from("profiles").update(updates).eq("id", currentUser.id);
    setPhotoSaved(true); setTimeout(() => setPhotoSaved(false), 2500);
  };

  if (!user) return (
    <PhoneShell>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
        <div style={{ color:theme.textMid, fontSize:14 }}>Loading profile...</div>
        {loadError && <div style={{ color:theme.accent, fontSize:12, padding:"0 20px", textAlign:"center" }}>{loadError}</div>}
      </div>
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
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
          { label:"Age", key:"age", type:"number", placeholder:"18–100" },
          { label:"Postcode area", key:"postcode", type:"text", placeholder:"e.g. BH, SO, SW1" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{f.label}</label>
            <input id={"edit-" + f.key} type={f.type} placeholder={f.placeholder || ""} min={f.key==="age"?18:undefined} max={f.key==="age"?100:undefined} value={editData[f.key] || ""} onChange={e => setEditData(p => ({...p, [f.key]:e.target.value}))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Diet</label>
          <select value={editData.diet || "Vegan"} onChange={e => setEditData(p => ({...p, diet:e.target.value}))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" }}>
            {["Vegan","Vegetarian","Whole-food plant-based","Raw vegan"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Looking for</label>
          <select value={editData.looking_for || "Dating"} onChange={e => setEditData(p => ({...p, looking_for:e.target.value}))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" }}>
            {["Dating","Friendship","Community","Activity partner"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>I am <span style={{ textTransform:"none", fontWeight:400, color:theme.textLight }}>(optional)</span></label>
          <select value={editData.gender || ""} onChange={e => {
            const g = e.target.value;
            const autoShowMe = g === "Woman" ? "Men" : g === "Man" ? "Women" : g === "Non-binary" ? "Everyone" : "";
            setEditData(p => ({...p, gender: g, show_me: autoShowMe || p.show_me}));
          }} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" }}>
            <option value="">Prefer not to say</option>
            <option value="Woman">Woman</option>
            <option value="Man">Man</option>
            <option value="Non-binary">Non-binary</option>
          </select>
        </div>
        {editData.gender && (
        <div style={{ marginBottom:16, animation:"fadeIn 0.25s ease" }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Show me <span style={{ textTransform:"none", fontWeight:400, color:theme.textLight }}>(optional)</span></label>
          <select value={editData.show_me || "Everyone"} onChange={e => setEditData(p => ({...p, show_me:e.target.value}))} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", background:"white" }}>
            <option value="Everyone">Everyone</option>
            <option value="Women">Women</option>
            <option value="Men">Men</option>
          </select>
        </div>
        )}
                <div style={{ marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(82,183,136,0.06)", borderRadius:12, padding:"12px 16px" }}>
          <div style={{ fontWeight:600, fontSize:14, color:theme.textDark }}>Do you smoke?</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setEditData(p => ({ ...p, smoker: false }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${!editData.smoker ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: !editData.smoker ? theme.greenBright : "white", color: !editData.smoker ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>No</button>
            <button onClick={() => setEditData(p => ({ ...p, smoker: true }))} style={{ padding:"6px 14px", borderRadius:50, border:`2px solid ${editData.smoker ? theme.accent : "rgba(82,183,136,0.2)"}`, background: editData.smoker ? theme.accent : "white", color: editData.smoker ? "white" : theme.textMid, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Yes</button>
          </div>
        </div>
<div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Interests</label>
          <div style={{ fontSize:11, color:theme.textLight, marginBottom:8 }}>Tap a category to expand</div>
          <InterestPicker selected={editData.interests || []} onChange={interests => setEditData(p => ({ ...p, interests }))} max={isPremium ? 10 : 5} onMaxReached={isPremium ? undefined : () => setPaywallTrigger("interests")} />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Bio</label>
          <textarea id="edit-bio" value={editData.bio || ""} onChange={e => setEditData(p => ({...p, bio:e.target.value.slice(0,300)}))} rows={4} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", resize:"none" }} />
          <div style={{ textAlign:"right", fontSize:11, color:(editData.bio||"").length > 270 ? theme.accent : theme.textLight }}>{300-(editData.bio||"").length} characters remaining</div>
        </div>
        {saveError && <div style={{ color:theme.accent, fontSize:12, marginBottom:10, padding:"8px 12px", background:"rgba(224,122,95,0.08)", borderRadius:8 }}>{saveError}</div>}
        <button onClick={saveProfile} style={{ ...btnPrimary, width:"100%", marginBottom:10, marginTop:10 }}>Save changes</button>
      </div>
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
    </PhoneShell>
  );

  return (
    <PhoneShell>
      <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, color: theme.greenDeep }}>My Profile</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPreview(true)} style={{ background:"none", border:"1px solid rgba(82,183,136,0.3)", borderRadius:50, padding:"6px 14px", fontSize:13, fontWeight:600, color:theme.greenMid, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>👁 Preview</button>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid rgba(224,122,95,0.3)", borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: theme.accent, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
          <button onClick={() => setEditing(true)} style={iconBtn}>✏️</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 14px" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:10, width:"100%" }}>
            {/* Multi-photo grid */}
            <div style={{ padding:"0 16px", width:"100%", boxSizing:"border-box", marginBottom:10 }}>
              {photoSaved && (
                <div style={{ background:theme.greenBright, color:"white", fontWeight:700, fontSize:13, textAlign:"center", padding:"8px 16px", borderRadius:10, marginBottom:10, transition:"opacity 0.3s" }}>✓ Photos saved</div>
              )}
              {userPhotos.length < 2 && (
                <div style={{ background:"rgba(82,183,136,0.08)", border:"1px solid rgba(82,183,136,0.2)", borderRadius:12, padding:"10px 14px", marginBottom:12, textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:theme.greenDeep, marginBottom:2 }}>📸 Add up to 5 photos</div>
                  <div style={{ fontSize:12, color:theme.textMid }}>Profiles with more photos get significantly more matches</div>
                </div>
              )}
              <div style={{ fontSize:12, fontWeight:600, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8, textAlign:"center" }}>My Photos <span style={{ fontWeight:400, textTransform:"none", color:theme.textLight }}>(up to 5)</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const url = userPhotos[i];
                  const isUploading = uploadingSlot === i && uploading;
                  return (
                    <div key={i} style={{ position:"relative", paddingBottom:"100%", borderRadius:10, overflow:"visible" }}>
                      <div style={{ position:"absolute", inset:0, borderRadius:10, background: url ? "transparent" : "rgba(82,183,136,0.08)", border: url ? "none" : `2px dashed rgba(82,183,136,0.3)`, overflow:"hidden" }}>
                        {url
                          ? <img src={url + "?t=1"} alt={"photo " + (i+1)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"rgba(82,183,136,0.4)" }}>{isUploading ? "⏳" : i === 0 ? "📷" : "+"}</div>
                        }
                        {isUploading && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:theme.greenMid, fontWeight:700 }}>{uploadProgress}%</div>}
                        {/* Tap to upload */}
                        {!url && !isUploading && userPhotos.length >= i && (
                          <label style={{ position:"absolute", inset:0, cursor:"pointer" }}>
                            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => handlePhotoUpload(e, i)} />
                          </label>
                        )}
                      </div>
                      {/* Delete button */}
                      {url && !isUploading && (
                        <button onClick={() => handlePhotoDelete(i)} style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:theme.accent, border:"2px solid white", color:"white", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:5, lineHeight:1, padding:0, fontFamily:"'DM Sans',sans-serif" }}>✕</button>
                      )}
                      {i === 0 && url && <div style={{ position:"absolute", bottom:-16, left:0, right:0, textAlign:"center", fontSize:9, color:theme.textLight, whiteSpace:"nowrap" }}>Main photo</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:11, color:theme.textLight, textAlign:"center", marginTop:22 }}>Tap an empty slot to add a photo · Tap ✕ to remove</div>
            </div>
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: theme.greenDeep }}>{user.name}, {user.age}</div>
          <div style={{ color: theme.textMid, fontSize: 13, marginTop: 3 }}>📍 {user.city || user.postcode || ""}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ background: theme.greenDeep, color: "white", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>🌱 {user.diet || "Vegan"}</span>
            {isPremium && <span style={{ background: theme.gold, color: "white", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50 }}>👑 Gold</span>}
          </div>
        </div>
        <div style={{ display: "flex", margin: "0 20px 14px", background: "rgba(82,183,136,0.06)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.12)" }}>
          <div onClick={() => onNav("liked")} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: "1px solid rgba(82,183,136,0.12)", cursor: "pointer" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, color: theme.greenDeep }}>{stats.likes}</div>
            <div style={{ fontSize: 9, color: theme.greenMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Likes 👆</div>
          </div>
          <div onClick={() => onNav("matches")} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: "1px solid rgba(82,183,136,0.12)", cursor: "pointer" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, color: theme.greenDeep }}>{stats.matches}</div>
            <div style={{ fontSize: 9, color: theme.greenMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Matches 💬</div>
          </div>
          <div style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 19, fontWeight: 700, color: theme.greenDeep }}>{stats.complete}%</div>
            <div style={{ fontSize: 9, color: theme.textLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Complete</div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(82,183,136,0.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: stats.complete+"%", borderRadius: 2, background: stats.complete === 100 ? "#f4a829" : "#52b788", transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>
        {stats.complete === 100 ? (
          <div style={{ margin: "0 20px 12px", background: "rgba(82,183,136,0.08)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: theme.greenDeep, fontWeight: 600 }}>🌟 Your profile is complete! You're more likely to get matches 💚</div>
          </div>
        ) : (
          <div style={{ margin: "0 20px 12px", background: "rgba(82,183,136,0.08)", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontSize: 13, color: theme.greenDeep, fontWeight: 700, marginBottom: 8 }}>Complete your profile to get more matches:</div>
            {stats.missing?.slice(0, 3).map(f => (
              <div key={f.key} onClick={() => setEditing(true)} style={{ fontSize: 12, color: theme.greenMid, padding: "3px 0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 }}>
                <span style={{ color: "#e07a5f" }}>✗</span> {f.label} <span style={{ fontSize: 11, color: theme.greenBright }}>→ tap to edit</span>
              </div>
            ))}
          </div>
        )}
        <div onClick={handleShare} style={{ margin: "0 20px 12px", background: "rgba(82,183,136,0.08)", borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📣</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.greenDeep }}>Share MeetFree with friends</span>
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
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 12 }}>Active · <span style={{ textDecoration:"underline", cursor:"pointer" }} onClick={async () => { if (window.confirm("Cancel Gold membership? You'll lose all Gold features.")) { await supabase.from("profiles").update({ is_premium: false }).eq("id", currentUser.id); onUpgrade && onUpgrade(); window.location.reload(); } }}>Cancel membership</span></div>
            <button onClick={handleBoost} disabled={boosting || (boostedUntil && boostedUntil > new Date())} style={{ background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)", color: "white", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {boosting ? "Boosting..." : boostedUntil && boostedUntil > new Date() ? "🚀 Boost active!" : "🚀 Boost my profile"}
            </button>
          </div>
        )}
        {!isPremium && <AdBanner onUpgrade={onUpgrade} />}
      </div>
      
      {showPreview && (
        <div style={{ position:"absolute", inset:0, zIndex:300, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", maxHeight:"85%", overflowY:"auto" }}>
            <div style={{ padding:"16px 20px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(82,183,136,0.1)" }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:theme.greenDeep }}>How others see you</div>
              <button onClick={() => setShowPreview(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:theme.textLight }}>x</button>
            </div>
            <div style={{ padding:"20px" }}>
              <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:16 }}>
                <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", background:"linear-gradient(135deg,#d8f3dc,#b7e4c7)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
                  {user.photo_url ? <img src={user.photo_url} alt={user.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🌿"}
                </div>
                <div>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:700, color:theme.textDark }}>{user.name}{user.age ? ", " + user.age : ""}</div>
                  {(user.city || user.postcode) && <div style={{ fontSize:13, color:theme.textLight, marginTop:2 }}>📍 {user.city || user.postcode}</div>}
                  {user.diet && <span style={{ background:theme.greenDeep, color:"white", fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:50, marginTop:6, display:"inline-block" }}>🌱 {user.diet}</span>}
                </div>
              </div>
              {user.bio && <p style={{ fontSize:14, color:theme.textMid, lineHeight:1.7, marginBottom:16 }}>{user.bio}</p>}
              {parseInterests(user.interests).length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {parseInterests(user.interests).map(i => <span key={i} style={{ background:"rgba(82,183,136,0.1)", color:theme.greenMid, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:50 }}>{i}</span>)}
                </div>
              )}
            </div>
            <div style={{ padding:"0 20px 28px" }}>
              <button onClick={() => setShowPreview(false)} style={{ width:"100%", padding:"12px 0", borderRadius:50, border:"2px solid rgba(82,183,136,0.25)", background:"transparent", color:theme.greenDeep, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>Close</button>
            </div>
          </div>
        </div>
      )}
      <BottomNav active="profile" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
    </PhoneShell>
  );
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────



const SettingsScreen = ({ onNav, onLogout, onDeleteAccount, isPremium, onUpgrade, unreadCount = 0, currentUser }) => {
  const [notifs, setNotifs] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [enterToSend, setEnterToSend] = useState(() => { try { return localStorage.getItem("meetfree_enter_to_send") === "true"; } catch(e) { return false; } });
  const VAPID_PUBLIC_KEY = "BE8wDhmjv5Ahta8yM2HkMowLQ6Ul6cvzgGoGjZ3jKO6Wj72EUZhLgJh9Z_4usJmVTE2vxMaT3aZ8r_cVacmCGbE";

  const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const toggleNotifs = async () => {
    if (notifs) {
      // Unsubscribe
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("user_id", currentUser.id);
        setNotifs(false);
      } catch(e) { console.error("Unsubscribe error:", e); }
    } else {
      // Subscribe
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          alert("Push notifications are not supported on this browser.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Please allow notifications to enable this feature.");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        await supabase.from("push_subscriptions").upsert({ user_id: currentUser.id, subscription: sub.toJSON() });
        setNotifs(true);
      } catch(e) { console.error("Subscribe error:", e); alert("Could not enable notifications: " + e.message); }
    }
  };

  // Check if already subscribed on load
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setNotifs(true);
      } catch(e) {}
    })();
  }, [currentUser]);
  const [profileVisible, setProfileVisible] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showChangeLocation, setShowChangeLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState(() => { try { return localStorage.getItem("meetfree_custom_location") || ""; } catch(e) { return ""; } });
  const [searchDistance, setSearchDistance] = useState(() => { try { return parseInt(localStorage.getItem("meetfree_search_distance") || "9999"); } catch(e) { return 9999; } });
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordError("Failed to update password. Please try again."); return; }
    setPasswordSuccess(true);
    setNewPassword(""); setConfirmPassword("");
    setTimeout(() => { setPasswordSuccess(false); setShowChangePassword(false); }, 2000);
  };
  useEffect(() => {
    if (!currentUser) return;
    supabase.from("profiles").select("visible").eq("id", currentUser.id).maybeSingle()
      .then(({ data }) => { if (data && data.visible !== null) setProfileVisible(data.visible !== false); });
  }, [currentUser]);
  const toggleProfileVisible = async () => {
    const newVal = !profileVisible;
    setProfileVisible(newVal);
    await supabase.from("profiles").update({ visible: newVal }).eq("id", currentUser.id);
  };
  const Toggle = ({ on, toggle }) => (
    <div onClick={toggle} style={{ width: 46, height: 25, borderRadius: 13, background: on ? theme.greenBright : "rgba(82,183,136,0.2)", position: "relative", cursor: "pointer", transition: "background 0.25s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 24 : 3, width: 19, height: 19, borderRadius: "50%", background: "white", transition: "left 0.25s", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
    </div>
  );
  const Row = ({ label, sub, right, locked, onPress }) => (
    <div onClick={onPress} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: "1px solid rgba(82,183,136,0.08)", cursor: onPress ? "pointer" : "default" }}>
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
            <Row label="Show my profile" sub={profileVisible ? "Your profile is visible in Discover" : "Your profile is hidden from Discover"} right={<Toggle on={profileVisible} toggle={toggleProfileVisible} />} />
            {isPremium && <Row label="Search area" sub={customLocation ? `From ${customLocation} · ${searchDistance === 9999 ? "Nationwide" : `Within ${searchDistance} miles`}` : searchDistance === 9999 ? "Nationwide" : `Within ${searchDistance} miles`} right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => setShowChangeLocation(true)} />}
          </div>
        </div>
        <div style={{ margin: "4px 18px 8px" }}>
          <div style={sectionLabel}>Notifications</div>
          <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.1)" }}>
            <Row label="Push notifications" sub="Get notified instantly when you match or receive a message. You can turn this off in your browser settings at any time." right={<Toggle on={notifs} toggle={toggleNotifs} />} />
          </div>
        </div>
        <div style={{ margin: "4px 18px 8px" }}>
          <div style={sectionLabel}>Account</div>
          <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(82,183,136,0.1)" }}>
            <Row label="Change password" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => setShowChangePassword(true)} />
            <Row label="⌨️ Enter key sends message" right={<input type="checkbox" checked={enterToSend} onChange={e => { setEnterToSend(e.target.checked); try { localStorage.setItem("meetfree_enter_to_send", e.target.checked ? "true" : "false"); } catch(err) {} }} style={{ width:18, height:18, accentColor:theme.greenBright, cursor:"pointer" }} />} onPress={() => {}} />
            <Row label="🔒 Your privacy" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => setShowPrivacyInfo(true)} />
            <Row label="Privacy policy" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => onNav("privacy")} />
            <Row label="Terms of service" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => onNav("terms")} />
            <Row label="Block & report" right={<span style={{ color: theme.textLight }}>›</span>} onPress={() => onNav("block")} />
            <div onClick={handleShare} style={{ padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid rgba(82,183,136,0.08)", display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:16 }}>📣</span><span style={{ fontWeight: 600, fontSize: 14, color: theme.greenDeep }}>Share MeetFree</span></div>
            <div onClick={onLogout} style={{ padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid rgba(82,183,136,0.08)" }}><span style={{ color: theme.accent, fontWeight: 600, fontSize: 14 }}>Sign out</span></div>
            <div onClick={() => {
              if (window.confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) {
                onDeleteAccount && onDeleteAccount();
              }
            }} style={{ padding: "13px 18px", cursor: "pointer" }}><span style={{ color: "#c0392b", fontWeight: 600, fontSize: 14 }}>Delete account</span></div>
          </div>
        </div>
        {currentUser && currentUser.email === "descoffey@gmail.com" && (
          <div style={{ margin: "4px 18px 8px" }}>
            <div style={sectionLabel}>🛠 Dev / Admin</div>
            <div style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(224,122,95,0.2)" }}>
              {[
                { label: "Reset all likes", sub: "Everyone reappears in Discover", action: async () => { await supabase.from("likes").delete().eq("from_user", currentUser.id); await supabase.from("super_likes").delete().eq("from_user", currentUser.id); } },
                { label: "Reset all passes", sub: "Passed profiles reappear", action: async () => { await supabase.from("passes").delete().eq("from_user", currentUser.id); } },
                { label: "Reset all matches", sub: "Clears matches and messages", action: async () => { await supabase.from("matches").delete().eq("user1", currentUser.id); await supabase.from("matches").delete().eq("user2", currentUser.id); } },
                { label: "Reset all super likes", sub: "Clears your super like history", action: async () => { const { error } = await supabase.from("super_likes").delete().eq("from_user", currentUser.id); if (error) alert("Error: " + error.message); } },
              ].map(({ label, sub, action }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px", borderBottom:"1px solid rgba(82,183,136,0.08)" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:theme.textDark }}>{label}</div>
                    <div style={{ fontSize:11, color:theme.textLight, marginTop:1 }}>{sub}</div>
                  </div>
                  <button onClick={async () => {
                    if (!window.confirm(label + "?")) return;
                    await action();
                    window.location.reload();
                  }} style={{ background:"rgba(224,122,95,0.1)", border:"1px solid rgba(224,122,95,0.3)", color:theme.accent, borderRadius:50, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Reset
                  </button>
                </div>
              ))}
            </div>
            <AdminUserList currentUser={currentUser} />
          </div>
        )}
        <div style={{ padding: "8px 0 24px", textAlign: "center", color: theme.textLight, fontSize: 11 }}>MeetFree v1.0.0 · Made with 🌱</div>
      </div>
      {showChangeLocation && (
        <div style={{ position:"absolute", inset:0, zIndex:250, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:theme.greenDeep }}>📍 Search area</div>
              <button onClick={() => setShowChangeLocation(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:theme.textLight }}>✕</button>
            </div>
            <p style={{ fontSize:13, color:theme.textMid, marginBottom:16, lineHeight:1.6 }}>Browse from a different location, or leave blank to use your own postcode, then choose your search distance below.</p>
            <input autoFocus type="text" placeholder="e.g. SW1, M1, B1 (or leave blank)" value={customLocation} onChange={e => setCustomLocation(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") { try { if (customLocation) localStorage.setItem("meetfree_custom_location", customLocation); else localStorage.removeItem("meetfree_custom_location"); } catch(e) {} } }} style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:20 }} />
            <div style={{ fontSize:13, color:theme.textMid, marginBottom:10 }}>How far should we search?</div>
            {[25, 50, 100, 9999].map(d => (
              <button key={d} onClick={() => { setSearchDistance(d); try { localStorage.setItem("meetfree_search_distance", String(d)); } catch(e) {} }} style={{ width:"100%", padding:"12px 16px", marginBottom:8, borderRadius:12, border:`2px solid ${searchDistance === d ? theme.greenBright : "rgba(82,183,136,0.2)"}`, background: searchDistance === d ? "rgba(82,183,136,0.1)" : "white", color: searchDistance === d ? theme.greenDeep : theme.textDark, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight: searchDistance === d ? 700 : 400, cursor:"pointer", textAlign:"left" }}>
                {d === 9999 ? "🌍 Nationwide" : `${d} miles`}
                {searchDistance === d && <span style={{ float:"right", color:theme.greenBright }}>✓</span>}
              </button>
            ))}
            <button onClick={() => { try { if (customLocation) localStorage.setItem("meetfree_custom_location", customLocation); else localStorage.removeItem("meetfree_custom_location"); } catch(e) {} setShowChangeLocation(false); window.dispatchEvent(new Event("meetfree_location_changed")); }} style={{ ...btnPrimary, marginTop:8 }}>Save</button>
            {customLocation && <button onClick={() => { setCustomLocation(""); try { localStorage.removeItem("meetfree_custom_location"); } catch(e) {} setShowChangeLocation(false); window.dispatchEvent(new Event("meetfree_location_changed")); }} style={{ ...btnGhost, marginTop:8 }}>Reset to my location</button>}
          </div>
        </div>
      )}
      {showChangePassword && (
        <div style={{ position:"absolute", inset:0, zIndex:250, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:theme.greenDeep }}>Change password</div>
              <button onClick={() => { setShowChangePassword(false); setPasswordError(""); setNewPassword(""); setConfirmPassword(""); setShowPw(false); }} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:theme.textLight }}>✕</button>
            </div>
            {passwordSuccess ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                <div style={{ color:theme.greenDeep, fontWeight:700 }}>Password updated!</div>
              </div>
            ) : (
              <>
                <div style={{ position:"relative", marginBottom:12 }}>
                  <input key={showPw ? "cp1-text" : "cp1-pw"} type={showPw ? "text" : "password"} placeholder="New password (min 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width:"100%", padding:"12px 44px 12px 16px", borderRadius:12, border:"2px solid rgba(82,183,136,0.2)", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{showPw ? "Hide" : "Show"}</button>
                </div>
                <div style={{ position:"relative", marginBottom:12 }}>
                  <input key={showPw ? "cp2-text" : "cp2-pw"} type={showPw ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChangePassword()} style={{ width:"100%", padding:"12px 44px 12px 16px", borderRadius:12, border:`2px solid ${confirmPassword && confirmPassword !== newPassword ? theme.accent : "rgba(82,183,136,0.2)"}`, fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{showPw ? "Hide" : "Show"}</button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && <div style={{ fontSize:11, color:theme.accent, marginBottom:8 }}>Passwords don't match</div>}
                {passwordError && <div style={{ color:theme.accent, fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(224,122,95,0.08)", borderRadius:8 }}>{passwordError}</div>}
                <button onClick={handleChangePassword} disabled={savingPassword} style={{ ...btnPrimary, opacity: savingPassword ? 0.7 : 1 }}>{savingPassword ? "Updating..." : "Update password 🌱"}</button>
              </>
            )}
          </div>
        </div>
      )}
      {showPrivacyInfo && <PrivacyInfoOverlay onClose={() => setShowPrivacyInfo(false)} />}
      <BottomNav active="settings" onNav={onNav} isPremium={isPremium} unreadCount={unreadCount} />
    </PhoneShell>
  );
};

// ─── SAFETY TIPS OVERLAY ─────────────────────────────────────────────────────

const SafetyTipsOverlay = ({ onClose }) => (
  <div style={{ position:"absolute", inset:0, zIndex:300, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
    <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px", maxHeight:"85%", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep }}>🛡 Safety Tips</div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:theme.textLight }}>✕</button>
      </div>
      {[
        { icon:"💬", title:"Keep it on MeetFree", body:"Stay on the app until you're comfortable with someone. Be cautious if someone pushes to move to WhatsApp or another platform quickly." },
        { icon:"🏦", title:"Never send money", body:"No genuine match will ever ask you for money, gift cards, or financial help — no matter how convincing the story. This is a scam." },
        { icon:"📍", title:"Meet in public first", body:"For your first meeting, always choose a busy public place. Tell a friend or family member where you're going and who you're meeting." },
        { icon:"🚗", title:"Get your own transport", body:"Arrange your own way to and from a first date. Don't rely on someone you've just met to get you home." },
        { icon:"📱", title:"Trust your instincts", body:"If something feels off, it probably is. You can block or report anyone on MeetFree at any time — no explanation needed." },
        { icon:"🔒", title:"Protect your details", body:"Don't share your home address, workplace, or financial information with someone you haven't met in person and built trust with." },
      ].map(({ icon, title, body }) => (
        <div key={title} style={{ marginBottom:16, padding:"14px 16px", background:"white", borderRadius:14, border:"1px solid rgba(82,183,136,0.12)" }}>
          <div style={{ fontSize:15, fontWeight:700, color:theme.greenDeep, marginBottom:4 }}>{icon} {title}</div>
          <div style={{ fontSize:13, color:theme.textMid, lineHeight:1.6 }}>{body}</div>
        </div>
      ))}
      <div style={{ marginBottom:16, padding:"14px 16px", background:"rgba(224,122,95,0.06)", borderRadius:14, border:"1px solid rgba(224,122,95,0.2)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:theme.accent, marginBottom:4 }}>🆘 Need help?</div>
        <div style={{ fontSize:13, color:theme.textMid, lineHeight:1.6, marginBottom:8 }}>If you ever feel unsafe or are being harassed, help is available:</div>
        <a href="https://www.suzylamplugh.org" target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:13, color:theme.greenMid, fontWeight:600, marginBottom:4 }}>🔗 Suzy Lamplugh Trust — personal safety advice</a>
        <a href="https://www.nationaldahelpline.org.uk" target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:13, color:theme.greenMid, fontWeight:600, marginBottom:4 }}>🔗 National DA Helpline — 0808 2000 247</a>
        <a href="tel:999" style={{ display:"block", fontSize:13, color:theme.accent, fontWeight:700 }}>🚨 Emergency — call 999</a>
      </div>
      <button onClick={onClose} style={{ width:"100%", padding:"14px", background:theme.greenBright, color:"white", border:"none", borderRadius:50, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Got it 🌱</button>
    </div>
  </div>
);

// ─── PRIVATE NOTES OVERLAY ────────────────────────────────────────────────────

const PrivateNotesOverlay = ({ matchId, matchName, currentUser, onClose }) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!matchId || !currentUser) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from("private_notes").select("note,updated_at").eq("user_id", currentUser.id).eq("match_id", matchId).maybeSingle();
      if (data) { setNote(data.note || ""); setSavedAt(data.updated_at); }
      setLoading(false);
    })();
  }, [matchId, currentUser]);

  const save = async () => {
    if (!matchId || !currentUser) return;
    setSaving(true);
    const trimmed = note.trim();
    if (trimmed) {
      await supabase.from("private_notes").upsert({ user_id: currentUser.id, match_id: matchId, note: trimmed, updated_at: new Date().toISOString() }, { onConflict: "user_id,match_id" });
    } else {
      await supabase.from("private_notes").delete().eq("user_id", currentUser.id).eq("match_id", matchId);
    }
    setSaving(false);
    setSavedAt(new Date().toISOString());
  };

  return (
    <div style={{ position:"absolute", inset:0, zIndex:300, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep }}>📝 Notes on {matchName}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:theme.textLight }}>✕</button>
        </div>
        <div style={{ fontSize:12, color:theme.textLight, marginBottom:16 }}>Private — only you can ever see this. Not shown to {matchName} or anyone else.</div>
        {loading ? (
          <div style={{ textAlign:"center", color:theme.textMid, fontSize:13, padding:"20px 0" }}>Loading...</div>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Anything you'd like to remember about ${matchName}...`}
              style={{ width:"100%", minHeight:120, padding:"12px 14px", borderRadius:14, border:"1px solid rgba(82,183,136,0.25)", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:theme.textDark, resize:"vertical", boxSizing:"border-box", marginBottom:8 }}
            />
            <div style={{ fontSize:11, color:theme.textLight, marginBottom:16, minHeight:14 }}>
              {saving ? "Saving..." : savedAt ? `Saved ${new Date(savedAt).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}` : ""}
            </div>
            <button onClick={save} disabled={saving} style={{ width:"100%", padding:"14px", background:theme.greenBright, color:"white", border:"none", borderRadius:50, fontWeight:700, fontSize:15, cursor:saving?"default":"pointer", fontFamily:"'DM Sans',sans-serif", opacity:saving?0.7:1 }}>{saving ? "Saving..." : "Save note"}</button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── PRIVACY INFO OVERLAY ─────────────────────────────────────────────────────

const PrivacyInfoOverlay = ({ onClose }) => (
  <div style={{ position:"absolute", inset:0, zIndex:300, background:"rgba(26,58,42,0.7)", borderRadius:44, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
    <div style={{ background:"#fdfaf5", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px", maxHeight:"85%", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:theme.greenDeep }}>🔒 Your Privacy</div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:theme.textLight }}>✕</button>
      </div>
      <div style={{ fontSize:13, color:theme.textMid, lineHeight:1.6, marginBottom:20 }}>We know putting yourself out there takes courage, so here's exactly what we do — and don't do — with your details.</div>
      {[
        { icon:"📧", title:"Your email stays private", body:"We never show your email to other members — not on your profile, not in chat, not anywhere. It's only ever used to log you in and send you notifications." },
        { icon:"🤝", title:"Nothing is shared unless you choose to", body:"Sharing a phone number happens only when both people agree to it. It's never automatic, and you can decline at any time." },
        { icon:"🎛", title:"You decide how much to reveal", body:"Gender, search distance, even your name on your profile — it's all in your control. Nothing beyond the basics is required to get matching." },
        { icon:"✅", title:"Real people, properly checked", body:"Every profile goes through our verification steps. Reporting or blocking someone takes one tap, any time, no explanation needed." },
      ].map(({ icon, title, body }) => (
        <div key={title} style={{ marginBottom:16, padding:"14px 16px", background:"white", borderRadius:14, border:"1px solid rgba(82,183,136,0.12)" }}>
          <div style={{ fontSize:15, fontWeight:700, color:theme.greenDeep, marginBottom:4 }}>{icon} {title}</div>
          <div style={{ fontSize:13, color:theme.textMid, lineHeight:1.6 }}>{body}</div>
        </div>
      ))}
      <div style={{ marginBottom:16, padding:"14px 16px", background:"rgba(82,183,136,0.06)", borderRadius:14, border:"1px solid rgba(82,183,136,0.2)" }}>
        <div style={{ fontSize:13, color:theme.textMid, lineHeight:1.6 }}>Want to feel extra cautious while you get to know someone? That's completely normal — take your time before sharing contact details, and use our in-chat safety prompts whenever you're ready to take things further.</div>
      </div>
      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ display:"block", textAlign:"center", fontSize:13, color:theme.greenMid, fontWeight:600, marginBottom:16 }}>Read our full Privacy Policy →</a>
      <button onClick={onClose} style={{ width:"100%", padding:"14px", background:theme.greenBright, color:"white", border:"none", borderRadius:50, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Got it 🌱</button>
    </div>
  </div>
);

// ─── BLOCK & REPORT SCREEN ────────────────────────────────────────────────────

const BlockReportScreen = ({ onBack, currentUser }) => {
  const [step, setStep] = useState("form"); // form | submitting | done
  const [reportedName, setReportedName] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const reasons = [
    "Inappropriate photos or content",
    "Harassment or threatening behaviour",
    "Fake profile or impersonation",
    "Spam or scam",
    "Underage user",
    "Other",
  ];

  const handleSubmit = async () => {
    if (!currentUser) { alert("You must be signed in to report a user."); return; }
    if (!reportedName || !reason) return alert("Please fill in all required fields.");
    setStep("submitting");
    try {
      const { data: matchedProfile } = await supabase.from("profiles").select("id").ilike("name", reportedName.trim()).maybeSingle();
      await supabase.from("reports").insert({
        reported_by: currentUser.id,
        reported_name: reportedName,
        reported_user_id: matchedProfile?.id || null,
        reason,
        details,
        created_at: new Date().toISOString(),
      });
      // Send confirmation email to reporter
      try {
        const { data: reporter } = await supabase.from("profiles").select("email, name").eq("id", currentUser.id).maybeSingle();
        if (reporter?.email) {
          await supabase.functions.invoke("send-report-confirmation", {
            body: { to: reporter.email, name: reporter.name, reportedName, reason },
          });
        }
      } catch(e) { console.error("Confirmation email error:", e); }
    } catch(e) {
      console.error("Report error:", e);
    }
    setStep("done");
  };

  return (
    <PhoneShell>
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, color:theme.greenDeep, marginBottom:6 }}>Block & Report</h2>

        {step === "done" ? (
          <div style={{ textAlign:"center", paddingTop:40 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:22, color:theme.greenDeep, marginBottom:10 }}>Report submitted</div>
            <div style={{ color:theme.textMid, fontSize:14, lineHeight:1.7, marginBottom:28 }}>Thank you for helping keep MeetFree safe. We'll review this report within 48 hours. The user has been blocked.</div>
            <button onClick={onBack} style={btnPrimary}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ color:theme.textMid, fontSize:13, lineHeight:1.7, marginBottom:24 }}>Reports are reviewed within 48 hours. Submitting a false report may result in your account being suspended.</p>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Name of person to report *</label>
              <input
                type="text"
                placeholder="e.g. Sophie"
                value={reportedName}
                onChange={e => setReportedName(e.target.value)}
                style={{ ...inputStyle, fontSize:14 }}
              />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>Reason *</label>
              {reasons.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{ width:"100%", padding:"11px 16px", borderRadius:12, border:`2px solid ${reason === r ? theme.greenDeep : "rgba(82,183,136,0.2)"}`, background: reason === r ? theme.greenDeep : "white", color: reason === r ? "white" : theme.textDark, fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"left", fontFamily:"'DM Sans',sans-serif", marginBottom:8 }}>
                  {r}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:700, color:theme.textMid, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Additional details (optional)</label>
              <textarea
                placeholder="Please describe what happened..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={4}
                style={{ ...inputStyle, fontSize:13, resize:"none" }}
              />
            </div>

            <button onClick={handleSubmit} disabled={step === "submitting"} style={{ ...btnPrimary, opacity: step === "submitting" ? 0.7 : 1, marginBottom:12 }}>
              {step === "submitting" ? "Submitting..." : "Submit report & block user"}
            </button>
            <button onClick={onBack} style={btnGhost}>Cancel</button>
          </>
        )}
      </div>
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

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────

const PasswordResetScreen = ({ onDone }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const handleReset = async () => {
    setError("");
    const pwdCheck = password || "";
    if (pwdCheck.length < 8 || !/[a-z]/.test(pwdCheck) || !/[A-Z]/.test(pwdCheck) || !/[0-9]/.test(pwdCheck) || !/[^a-zA-Z0-9]/.test(pwdCheck)) { setError("Password must be 8+ characters with a lowercase letter, an UPPERCASE letter, a number, and a symbol."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      if (updateError.message?.toLowerCase().includes("same password") || updateError.message?.toLowerCase().includes("different")) {
        setError("Your new password must be different from your current one.");
      } else if (updateError.message?.toLowerCase().includes("expired")) {
        setError("This reset link has expired — please go back and request a new one.");
      } else {
        setError("Failed to update password. Your new password must be different from your old one, or the reset link may have expired.");
      }
      return;
    }
    setDone(true);
    setTimeout(() => onDone(), 2000);
  };
  return (
    <PhoneShell statusBar={false}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2rem", textAlign:"center" }}>
        {done ? (
          <>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <h2 style={{ fontFamily:"Georgia,serif", fontSize:24, color:theme.greenDeep, marginBottom:8 }}>Password updated!</h2>
            <p style={{ color:theme.textMid, fontSize:14 }}>Taking you back to the app...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>🔑</div>
            <h2 style={{ fontFamily:"Georgia,serif", fontSize:24, color:theme.greenDeep, marginBottom:8 }}>Choose a new password</h2>
            <p style={{ color:theme.textMid, fontSize:14, marginBottom:24, lineHeight:1.6 }}>Enter a new password for your MeetFree account.</p>
            <div style={{ width:"100%", marginBottom:14, position:"relative" }}>
              <input key={showPw ? "rp1-text" : "rp1-pw"} type={showPw ? "text" : "password"} placeholder="New password (min 6 characters)" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, textAlign:"left", paddingRight:44 }} />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{showPw ? "Hide" : "Show"}</button>
            </div>
            <div style={{ width:"100%", marginBottom:16, position:"relative" }}>
              <input key={showPw ? "rp2-text" : "rp2-pw"} type={showPw ? "text" : "password"} placeholder="Confirm new password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} style={{ ...inputStyle, textAlign:"left", paddingRight:44 }} />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textLight, padding:0 }}>{showPw ? "Hide" : "Show"}</button>
            </div>
            {error && <div style={{ color:theme.accent, fontSize:13, marginBottom:12, padding:"8px 12px", background:"rgba(224,122,95,0.08)", borderRadius:8, width:"100%" }}>{error}</div>}
            <button onClick={handleReset} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Updating..." : "Set new password"}
            </button>
          </>
        )}
      </div>
    </PhoneShell>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // Register service worker on startup
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(e => console.error("SW registration failed:", e));
    }
  }, []);

  // PWA install prompt — let Chrome show its own native prompt on Android
  // On iOS show manual instructions after a delay
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) return;
    const dismissed = localStorage.getItem("meetfree_install_dismissed");
    if (dismissed) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (ios) { setIsIOS(true); setTimeout(() => setShowInstallBanner(true), 4000); }
  }, []);
  const [screen, setScreen] = useState("onboarding");
  const [showSignIn, setShowSignIn] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("signin") === "1"; } catch(e) { return false; }
  });
  const [pendingChatMessage, setPendingChatMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState({});
  const [passedProfilesDB, setPassedProfilesDB] = useState({});
  const [blockedUsers, setBlockedUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const loadLikes = async (userId) => {
    const { data } = await supabase.from("likes").select("to_user, created_at").eq("from_user", userId);
    if (data) {
      const liked = {};
      data.forEach(row => { liked["supabase_" + row.to_user] = row.created_at; });
      setLikedProfiles(liked);
    }
  };

  const loadPasses = async (userId) => {
    const { data } = await supabase.from("passes").select("to_user").eq("from_user", userId);
    if (data) {
      const passed = {};
      data.forEach(row => { passed["supabase_" + row.to_user] = true; });
      setPassedProfilesDB(passed);
    }
  };

  const loadBlocks = async (userId) => {
    const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId);
    if (data) {
      const blocked = {};
      data.forEach(row => { blocked[row.blocked_id] = true; });
      setBlockedUsers(blocked);
    }
  };

  const pollUnread = async (userId) => {
    try {
      const { data: matches } = await supabase.from("matches").select("id,user1,user2,user1_read_at,user2_read_at").or(`user1.eq.${userId},user2.eq.${userId}`);
      if (!matches?.length) { setUnreadCount(0); return; }
      let total = 0;
      await Promise.all(matches.map(async m => {
        const isUser1 = m.user1 === userId;
        const myReadAt = isUser1 ? m.user1_read_at : m.user2_read_at;
        const lastRead = myReadAt ? new Date(new Date(myReadAt).getTime() + 2000).toISOString() : "1970-01-01";
        const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("match_id", m.id).neq("sender_id", userId).gt("created_at", lastRead);
        console.log('DEBUG pollUnread:', { matchId: m.id, myReadAt, lastRead, unreadInThisMatch: count || 0 });
        total += count || 0;
      }));
      setUnreadCount(total);
    } catch(e) { console.error("Poll error:", e); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setLikedProfiles({});
    setPassedProfilesDB({});
    setBlockedUsers({});
    setActiveChat(null);
    setIsPremium(false);
    setUnreadCount(0);
    setScreen("onboarding");
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert("Please sign in again before deleting your account."); return; }
      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (error) { alert("Delete failed: " + error.message + "\n\nEmail hello@meetfree.uk for manual deletion."); return; }
      setCurrentUser(null); setLikedProfiles({}); setPassedProfilesDB({}); setBlockedUsers({});
      setActiveChat(null); setIsPremium(false); setUnreadCount(0); setScreen("onboarding");
    } catch(e) { alert("Something went wrong. Email hello@meetfree.uk to request deletion."); }
  };

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    try {
      if (unreadCount > 0) navigator.setAppBadge(unreadCount).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    } catch(e) { /* Badging API not supported or blocked — fail silently */ }
  }, [unreadCount]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const chatParam = urlParams.get("chat");

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadLikes(session.user.id);
        loadPasses(session.user.id);
        loadBlocks(session.user.id);
        pollUnread(session.user.id);
        supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id).then(() => {});
        supabase.from("profiles").select("is_premium,premium_until").eq("id", session.user.id).maybeSingle().then(({ data }) => { const goldActive = data?.is_premium && (!data?.premium_until || new Date(data.premium_until) > new Date()); if (goldActive || session.user.email === "descoffey@gmail.com") setIsPremium(true); }).finally(async () => {
          if (chatParam) {
            // Find the other user in this match and open the chat
            try {
              const { data: match } = await supabase.from("matches").select("id,user1,user2").eq("id", chatParam).maybeSingle();
              if (match) {
                const otherId = match.user1 === session.user.id ? match.user2 : match.user1;
                const { data: profile } = await supabase.from("profiles").select("id,name,photo_url,age,city,email").eq("id", otherId).maybeSingle();
                if (profile) { setActiveChat({ ...profile, matchId: match.id }); setScreen("chat"); window.history.replaceState({}, "", "/"); return; }
              }
            } catch(e) { console.error("Chat param error:", e); }
          }
          setScreen("swipe");
        });
      } else if (chatParam) {
        // Not logged in — store the chat param and show sign in
        sessionStorage.setItem("pending_chat", chatParam);
        setShowSignIn(true);
        setPendingChatMessage(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setShowPasswordReset(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => pollUnread(currentUser.id), 8000);
    // Update last_seen every 5 minutes while active
    const seenInterval = setInterval(() => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", currentUser.id).then(() => {});
    }, 5 * 60 * 1000);
    return () => { clearInterval(interval); clearInterval(seenInterval); };
  }, [currentUser]);

  const handleNav = async (s) => {
    if (s === "matches") { setScreen("chat"); setActiveChat(null); setUnreadCount(0); return; }

    if (s === "chat" && screen !== "chat" && unreadCount > 0 && currentUser) {
      try {
        const { data: matches } = await supabase.from("matches").select("id,user1,user2").or("user1.eq." + currentUser.id + ",user2.eq." + currentUser.id);
        if (matches && matches.length) {
          const ids = matches.map(m => m.id);
          const { data: messages } = await supabase.from("messages").select("match_id,created_at").in("match_id", ids).neq("sender_id", currentUser.id).order("created_at", { ascending: false });
          if (messages && messages.length) {
            const lastRead = JSON.parse(localStorage.getItem("meetfree_last_read") || "{}");
            const unreadMsg = messages.find(msg => !lastRead[msg.match_id] || new Date(msg.created_at) > new Date(lastRead[msg.match_id]));
            if (unreadMsg) {
              const match = matches.find(m => m.id === unreadMsg.match_id);
              const otherId = match.user1 === currentUser.id ? match.user2 : match.user1;
              const { data: profile } = await supabase.from("profiles").select("id,name,photo_url,age,city,email").eq("id", otherId).maybeSingle();
              if (profile) { setActiveChat({ ...profile, matchId: match.id }); setScreen("chat"); return; }
            }
          }
        }
      } catch(e) { console.error("handleNav error:", e); }
    }
    setScreen(s);
    if (s !== "chat") setActiveChat(null);
  };
  const handleUpgrade = () => setShowPaywall(true);
  const handleSubscribe = async () => { setIsPremium(true); setShowPaywall(false); if (currentUser) await supabase.from("profiles").update({ is_premium: true }).eq("id", currentUser.id); };

  // OPT-M7: Extracted signup handler
  const handleSignup = async (profileData) => {
    setSignupError("");
    setSigningUp(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: profileData.email,
        password: profileData.password,
        options: { emailRedirectTo: "https://app.meetfree.uk?signin=1" },
      });
      if (authError) { setSignupError("Signup failed: " + authError.message); return; }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: profileData.email,
        name: profileData.name,
        age: parseInt(profileData.age) || null,
        city: profileData.city,
        diet: profileData.diet,
        looking_for: profileData.lookingFor,
        postcode: profileData.postcode ? profileData.postcode.toUpperCase() : "",
        interests: profileData.interests,
        bio: profileData.bio?.slice(0, 300) || "",
        referral_source: profileData.referralSource || null,
        is_real: true,
      });
      if (profileError) console.error("Profile insert error:", profileError);

      // Auto-Gold for first 100 members
      try {
        const { count: userCount } = await Promise.race([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
        ]);
        let isGold = false;
        if ((userCount || 0) <= 100) {
          const premiumUntil = new Date();
          premiumUntil.setMonth(premiumUntil.getMonth() + 3);
          await supabase.from("profiles").update({ is_premium: true, premium_until: premiumUntil.toISOString() }).eq("id", authData.user.id);
          isGold = true;
        }
        await Promise.race([
          supabase.functions.invoke("send-welcome-email", { body: { email: profileData.email, name: profileData.name || "there", isGold } }),
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      } catch(e) { console.error("Auto-gold error:", e); }

      // Upload onboarding photo if selected
      if (profileData.photoFile && authData.user?.id) {
        try {
          const ext = profileData.photoFile.name.split(".").pop().toLowerCase();
          const path = authData.user.id + "." + ext;
          const { error: uploadError } = await supabase.storage.from("avatars").upload(path, profileData.photoFile, { upsert: true });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            await supabase.from("profiles").update({ photo_url: publicUrl }).eq("id", authData.user.id);
          }
        } catch(e) { console.error("Onboarding photo upload error:", e); }
      }

      // SEC-C2: Show email verification screen instead of going straight to swipe
      // If Supabase email confirmation is enabled, session will be null until verified
      if (authData.session) {
        setCurrentUser(authData.user);
        await loadLikes(authData.user.id);
        setScreen("swipe");
      } else {
        setAwaitingVerification(true);
      }
    } catch(e) {
      console.error("Signup error:", e);
      setSignupError("Something went wrong. Please try again.");
    } finally {
      setSigningUp(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: isMobile ? theme.warmWhite : "linear-gradient(135deg,#e8f5e9 0%,#f1f8e9 50%,#e0f2f1 100%)", display: "flex", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "center", padding: isMobile ? 0 : "20px 20px", fontFamily: "'DM Sans',sans-serif", overscrollBehavior: "none" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input[type=range] { height: 4px; border-radius: 2px; }
        button, [role=button] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bellShake { 0%,100%{transform:rotate(0) scale(1)} 15%{transform:rotate(20deg) scale(1.2)} 30%{transform:rotate(-15deg) scale(1.2)} 45%{transform:rotate(10deg) scale(1.1)} 60%{transform:rotate(-5deg) scale(1.1)} 75%{transform:rotate(3deg)} }
        @keyframes bellPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        .bell-active { animation: bellShake 0.8s ease infinite; transform-origin: top center; display:inline-block; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* OPT-L3: Dev-only preview tabs — hidden in production */}
        {!currentUser && process.env.NODE_ENV === "development" && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
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
        </div>}

        {/* Dev-only Free/Gold toggle */}
        {!currentUser && process.env.NODE_ENV === "development" && <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", padding: "6px 16px", borderRadius: 50 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textMid }}>Preview as:</span>
          <button onClick={() => setIsPremium(false)} style={{ padding: "4px 12px", borderRadius: 50, border: "none", background: !isPremium ? theme.greenDeep : "transparent", color: !isPremium ? "white" : theme.textMid, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Free</button>
          <button onClick={() => setIsPremium(true)} style={{ padding: "4px 12px", borderRadius: 50, border: "none", background: isPremium ? theme.gold : "transparent", color: isPremium ? "white" : theme.textMid, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>👑 Gold</button>
        </div>}

        {/* Phone */}
        <div style={{ position: "relative" }}>
          {showPaywall && (
            <div style={{ position: "absolute", inset: 0, zIndex: 100, borderRadius: 44, overflow: "hidden" }}>
              <Paywall trigger="generic" onClose={() => setShowPaywall(false)} onSubscribe={handleSubscribe} currentUser={currentUser} />
            </div>
          )}
          {showSignIn && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
              <div style={{ background:"white", borderRadius:24, padding:"28px", width:"100%", maxWidth:380 }}>
                <h2 style={{ fontFamily:"Georgia,serif", fontSize:24, color:theme.greenDeep, marginBottom:8 }}>Welcome back 🌱</h2>
                <p style={{ color:theme.textMid, fontSize:14, marginBottom:20 }}>Sign in to your MeetFree account</p>
                <SignInForm message={pendingChatMessage ? "Please sign in with your own account to view this request 🌱" : undefined} onSuccess={async (user) => { setPendingChatMessage(false); setCurrentUser(user); loadLikes(user.id); loadPasses(user.id); loadBlocks(user.id); setShowSignIn(false); const pendingChat = sessionStorage.getItem("pending_chat"); supabase.from("profiles").select("is_premium,premium_until").eq("id", user.id).maybeSingle().then(({ data }) => { const goldActive = data?.is_premium && (!data?.premium_until || new Date(data.premium_until) > new Date()); if (goldActive || user.email === "descoffey@gmail.com") setIsPremium(true); }).finally(async () => { if (pendingChat) { sessionStorage.removeItem("pending_chat"); try { const { data: match } = await supabase.from("matches").select("id,user1,user2").eq("id", pendingChat).maybeSingle(); if (match) { const otherId = match.user1 === user.id ? match.user2 : match.user1; const { data: profile } = await supabase.from("profiles").select("id,name,photo_url,age,city,email").eq("id", otherId).maybeSingle(); if (profile) { setActiveChat({ ...profile, matchId: match.id }); setScreen("chat"); return; } } } catch(e) {} } setScreen("swipe"); }); }} onClose={() => setShowSignIn(false)} />
              </div>
            </div>
          )}
          {showPasswordReset && <PasswordResetScreen onDone={() => { setShowPasswordReset(false); setScreen("swipe"); }} />}
          {/* PWA Install Banner — iOS only (Android uses Chrome's native prompt) */}
          {showInstallBanner && isIOS && (
            <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", zIndex:500, background:"white", borderRadius:20, padding:"16px 18px", boxShadow:"0 8px 32px rgba(26,58,42,0.2)", border:"1px solid rgba(82,183,136,0.2)", maxWidth:340, width:"92%" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ fontSize:28 }}>📲</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:theme.greenDeep }}>Add MeetFree to your home screen</div>
                  <div style={{ fontSize:11, color:theme.textLight }}>Install for the best experience</div>
                </div>
              </div>
              <div style={{ background:"rgba(82,183,136,0.07)", borderRadius:12, padding:"10px 14px" }}>
                <div style={{ fontSize:12, color:theme.textMid, lineHeight:1.7 }}>
                  Tap the <strong>Share</strong> button <span style={{ fontSize:14 }}>⎋</span> at the bottom of Safari, then tap <strong>"Add to Home Screen"</strong>
                </div>
                <button onClick={() => { localStorage.setItem("meetfree_install_dismissed","1"); setShowInstallBanner(false); }} style={{ marginTop:10, background:"none", border:"none", fontSize:11, color:theme.textLight, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", padding:0 }}>Dismiss</button>
              </div>
            </div>
          )}
          {/* SEC-C2: Email verification holding screen */}
          {!showPasswordReset && awaitingVerification && (
            <PhoneShell statusBar={false}>
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2rem", textAlign:"center" }}>
                <div style={{ fontSize:64, marginBottom:16 }}>📧</div>
                <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, color:theme.greenDeep, marginBottom:8 }}>Check your inbox</h2>
                <p style={{ color:theme.textMid, fontSize:14, lineHeight:1.7, marginBottom:24 }}>We've sent a verification link to your email. Tap it, then close that tab and come back here to sign in.</p>
                <button onClick={() => { setAwaitingVerification(false); setScreen("onboarding"); }} style={btnGhost}>Back to sign in</button>
              </div>
            </PhoneShell>
          )}
          {!showPasswordReset && !awaitingVerification && <>
            {signupError && <div style={{ color:theme.accent, fontSize:13, padding:"10px 16px", background:"rgba(224,122,95,0.1)", borderRadius:10, marginBottom:12, maxWidth:390 }}>{signupError}</div>}
            {signingUp && (
        <div style={{ position:"fixed", inset:0, background:"rgba(26,58,42,0.85)", zIndex:999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ fontSize:48 }}>🌱</div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:22, color:"white", fontWeight:700 }}>Creating your account...</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.75)", textAlign:"center", maxWidth:280 }}>This may take a few seconds — please don't close the app</div>
        </div>
      )}
      {screen === "onboarding" && <Onboarding onShowSignIn={() => setShowSignIn(true)} onFinish={handleSignup} onClearSignupError={() => setSignupError("")} />}
            {screen === "swipe" && <SwipeScreen onNav={handleNav} isPremium={isPremium} onUpgrade={handleUpgrade} onSubscribe={handleSubscribe} currentUser={currentUser} likedProfiles={likedProfiles} setLikedProfiles={setLikedProfiles} unreadCount={unreadCount} onLogout={handleSignOut} onOpenChat={c => setActiveChat(c)} />}
            {(screen === "chat" || screen === "liked" || screen === "likedyou") && !activeChat && <ChatList onNav={handleNav} onOpenChat={c => setActiveChat(c)} isPremium={isPremium} onUpgrade={handleUpgrade} currentUser={currentUser} onLogout={handleSignOut} defaultTab={screen === "liked" ? "liked" : screen === "likedyou" ? "likedyou" : "matches"} />}
            {(screen === "chat" || screen === "liked" || screen === "likedyou") && activeChat && <ChatDetail key={activeChat.matchId} chat={activeChat} onBack={() => { setActiveChat(null); }} onNav={handleNav} isPremium={isPremium} currentUser={currentUser} onUpgrade={handleUpgrade} />}
            {screen === "profile" && <ProfileScreen onNav={handleNav} unreadCount={unreadCount} isPremium={isPremium} onUpgrade={handleUpgrade} currentUser={currentUser} onLogout={handleSignOut} />}
            {screen === "settings" && <SettingsScreen onNav={handleNav} unreadCount={unreadCount} onLogout={handleSignOut} isPremium={isPremium} onUpgrade={handleUpgrade} onDeleteAccount={handleDeleteAccount} currentUser={currentUser} />}
          {screen === "privacy" && (
            <PhoneShell>
              <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
                <button onClick={() => setScreen("settings")} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
                <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, color:theme.greenDeep, marginBottom:6 }}>Privacy Policy</h2>
                <p style={{ fontSize:11, color:theme.textLight, marginBottom:24 }}>Last updated: March 2026</p>
                {[
                  ["Who We Are", "MeetFree is a plant-based connections app helping people find friends, dates and community. This policy explains how we handle your personal data."],
                  ["What We Collect", "We collect your email address when you join our waiting list, and profile information (name, age, city, interests) when you register."],
                  ["Why We Collect It", "We use your data to provide the MeetFree service, match you with other users, and send you relevant notifications. We will never sell your data."],
                  ["Legal Basis", "We process your data based on your explicit consent given during registration. You can withdraw consent at any time by deleting your account."],
                  ["Data Storage", "Your data is stored securely using Supabase infrastructure with industry-standard encryption and security practices."],
                  ["Messages", "Messages between users are stored securely on our servers. They are not end-to-end encrypted, meaning they are accessible to MeetFree administrators for safety and moderation purposes. We do not read your messages unless required for safety investigations."],
                  ["How Long We Keep It", "We keep your data for as long as your account is active. If you delete your account, your data is permanently removed within 30 days."],
                  ["Your Rights", "Under GDPR you have the right to access, correct or delete your data at any time. Email us at hello@meetfree.uk and we will respond within 30 days."],
                  ["Cookies", "We use minimal cookies only to keep you logged in. We do not use tracking or advertising cookies."],
                  ["Contact Us", "For any privacy questions email hello@meetfree.uk or write to us at the address provided in our Terms of Service."],
                ].map(([title, text]) => (
                  <div key={title} style={{ marginBottom:20 }}>
                    <div style={{ fontWeight:700, color:theme.greenDeep, fontSize:15, marginBottom:6 }}>{title}</div>
                    <div style={{ color:theme.textMid, fontSize:13, lineHeight:1.7 }}>{text}</div>
                  </div>
                ))}
              </div>
            </PhoneShell>
          )}
          {screen === "terms" && (
            <PhoneShell>
              <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
                <button onClick={() => setScreen("settings")} style={{ background:"none", border:"none", color:theme.greenMid, fontWeight:700, fontSize:14, cursor:"pointer", marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
                <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, color:theme.greenDeep, marginBottom:6 }}>Terms of Service</h2>
                <p style={{ fontSize:11, color:theme.textLight, marginBottom:24 }}>Last updated: March 2026</p>
                {[
                  ["1. Acceptance", "By creating a MeetFree account you agree to these Terms of Service. If you do not agree, please do not use the app."],
                  ["2. Eligibility", "You must be 18 or older to use MeetFree. By registering you confirm you meet this requirement."],
                  ["3. Your Account", "You are responsible for keeping your account credentials secure. Do not share your password. You are responsible for all activity on your account."],
                  ["4. Acceptable Use", "You agree not to use MeetFree to harass, abuse or harm others; post false or misleading information; impersonate another person; or engage in any unlawful activity."],
                  ["5. Content", "You retain ownership of content you post. By posting you grant MeetFree a licence to display that content within the app. We reserve the right to remove content that violates these terms."],
                  ["6. Subscriptions", "MeetFree Gold subscriptions are billed in advance. You may cancel at any time. Refunds are not provided for partial subscription periods unless required by law."],
                  ["7. Termination", "We reserve the right to suspend or terminate accounts that violate these terms, without notice."],
                  ["8. Limitation of Liability", "MeetFree is provided as-is. We are not liable for any indirect or consequential loss arising from your use of the app."],
                  ["9. Governing Law", "These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales."],
                  ["10. Contact", "For any questions about these terms please email hello@meetfree.uk. Registered address: Ringwood, Hampshire, UK."],
                ].map(([title, text]) => (
                  <div key={title} style={{ marginBottom:20 }}>
                    <div style={{ fontWeight:700, color:theme.greenDeep, fontSize:15, marginBottom:6 }}>{title}</div>
                    <div style={{ color:theme.textMid, fontSize:13, lineHeight:1.7 }}>{text}</div>
                  </div>
                ))}
              </div>
            </PhoneShell>
          )}
          {screen === "block" && <BlockReportScreen onBack={() => setScreen("settings")} currentUser={currentUser} />}
          </>}
        </div>
      </div>
    </div>
  );
}
