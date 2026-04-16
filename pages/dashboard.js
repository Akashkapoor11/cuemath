import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";

const STORAGE_KEY = "cuemath_interviews";
const HR_PIN = "2408";  // HR access PIN — change this before going to production

/* ─── Demo seed data — 3 realistic interviews shown to evaluators on first visit ─── */
const DEMO_DATA = [
  {
    id: "demo_1",
    _demo: true,
    name: "Shreya Malhotra",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 387,
    transcript: [],
    report: {
      overall: "Move Forward",
      summary: "Shreya demonstrated exceptional communication clarity and a natural warmth toward student learning. Her explanation of fractions using 'pizza slices' was age-appropriate and creative. She showed genuine empathy when discussing struggling students, drawing from real classroom experience.",
      scores: {
        "Communication Clarity": 9,
        "Warmth & Patience": 9,
        "Ability to Simplify": 8,
        "English Fluency": 8,
        "Teaching Aptitude": 9,
      },
      strengths: [
        "Outstanding natural rapport-building with students",
        "Creative use of real-world analogies (pizza for fractions)",
        "Proactive approach to resistant learners — changes method, not pressure",
      ],
      concerns: [
        "Limited experience beyond Class 8; may need support for advanced topics",
      ],
      quotes: [
        { text: "I'd ask them to put the worksheet aside and tell me what the problem reminds them of in real life.", dimension: "Teaching Aptitude", label: "positive" },
        { text: "A fraction is just how many slices of pizza you've eaten out of the whole — even a 6-year-old gets that.", dimension: "Ability to Simplify", label: "positive" },
        { text: "I once had a student who cried every session. I just kept showing up with the same energy.", dimension: "Warmth & Patience", label: "positive" },
      ],
      recommendation: "Strongly recommend advancing to next round — rare combination of warmth, clarity, and pedagogical thinking.",
    },
  },
  {
    id: "demo_2",
    _demo: true,
    name: "Rahul Verma",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    duration: 312,
    transcript: [],
    report: {
      overall: "Hold",
      summary: "Rahul has solid subject knowledge and adequate communication skills, but his teaching approach leans on re-explanation rather than adaptation. His fraction analogy was accurate but too abstract for a 9-year-old. He struggled to articulate what separates a great teacher from a good one.",
      scores: {
        "Communication Clarity": 7,
        "Warmth & Patience": 6,
        "Ability to Simplify": 5,
        "English Fluency": 7,
        "Teaching Aptitude": 6,
      },
      strengths: [
        "Strong subject knowledge across math topics",
        "Clear, grammatically correct English",
        "Professional, composed demeanor throughout",
      ],
      concerns: [
        "Simplification examples were too abstract for the target age group",
        "Response to resistant students was re-explanation, not adaptation",
      ],
      quotes: [
        { text: "A fraction is a ratio of two integers where the denominator is non-zero.", dimension: "Ability to Simplify", label: "negative" },
        { text: "I would go through the problem step by step again, more slowly this time.", dimension: "Teaching Aptitude", label: "negative" },
        { text: "I am comfortable teaching mathematics up to Class 10.", dimension: "Communication Clarity", label: "positive" },
      ],
      recommendation: "Put on hold — good on knowledge but needs development on student-centred teaching; suggest a case-study follow-up.",
    },
  },
  {
    id: "demo_3",
    _demo: true,
    name: "Anjali Singh",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 198,
    transcript: [],
    report: {
      overall: "Not Recommended",
      summary: "Anjali's responses were frequently under-developed — single-sentence answers to questions requiring depth. Her fraction explanation was unclear and her approach to a struggling student ('just keep trying') suggests limited pedagogical awareness. English fluency was adequate but inconsistent.",
      scores: {
        "Communication Clarity": 4,
        "Warmth & Patience": 5,
        "Ability to Simplify": 3,
        "English Fluency": 5,
        "Teaching Aptitude": 3,
      },
      strengths: [
        "Showed willingness to try new approaches when prompted",
        "Completed all six questions without disengaging",
      ],
      concerns: [
        "Fraction explanation would confuse rather than help a child",
        "Very short answers — minimal elaboration despite follow-up probes",
        "No concrete strategies for student resistance",
      ],
      quotes: [
        { text: "Fractions are when you divide something. Like, it's a part of a whole.", dimension: "Ability to Simplify", label: "negative" },
        { text: "I would just tell them to keep trying and not give up.", dimension: "Warmth & Patience", label: "negative" },
        { text: "I think patience is the most important thing for a teacher.", dimension: "Teaching Aptitude", label: "positive" },
      ],
      recommendation: "Not recommended at this stage — significant development needed in simplification ability and pedagogical depth.",
    },
  },
];

const C = {
  indigo:      "#6366f1",
  indigoLight: "#818cf8",
  indigoGlow:  "rgba(99,102,241,0.30)",
  green:  "#10b981",
  amber:  "#f59e0b",
  red:    "#ef4444",
};

function getVerdict(v) {
  if (v === "Move Forward")  return { label: "Move Forward",    color: "#059669", bg: "#d1fae5", border: "#6ee7b7" };
  if (v === "Hold")          return { label: "Hold",            color: "#d97706", bg: "#fef3c7", border: "#fcd34d" };
  return                            { label: "Not Recommended", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
}

function scoreColor(s) {
  const n = parseFloat(s);
  if (n >= 8) return C.green;
  if (n >= 5) return C.indigo;
  return C.amber;
}

function getAvg(scores) {
  const vals = Object.values(scores || {});
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function formatDuration(s) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* Circular score ring */
function ScoreRing({ score, size = 52 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 10) / 10) * circ;
  const col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={circ.toFixed(2)} strokeDashoffset={offset.toFixed(2)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size > 44 ? 13 : 11, fontWeight: 700, color: col,
      }}>{parseFloat(score).toFixed(1)}</span>
    </div>
  );
}

/* Individual candidate card */
function CandidateCard({ entry, expanded, onToggle, onDelete }) {
  const verdict = getVerdict(entry.report.overall);
  const avg = getAvg(entry.report.scores);
  const scores = entry.report.scores || {};

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${expanded ? "#c7d2fe" : "#e5e7eb"}`,
      borderRadius: 18,
      overflow: "hidden",
      transition: "box-shadow 0.2s, border-color 0.2s",
      boxShadow: expanded ? "0 8px 32px rgba(99,102,241,0.12)" : "0 1px 4px rgba(0,0,0,0.05)",
    }}>

      {/* Card header row — always visible */}
      <div
        onClick={onToggle}
        style={{
          padding: "18px 20px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "#fafafa"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
      >
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 20,
          boxShadow: `0 2px 8px ${C.indigoGlow}`,
        }}>
          {entry.name[0]?.toUpperCase()}
        </div>

        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.name}
            </div>
            {entry._demo && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#6366f1",
                background: "#eef2ff", border: "1px solid #c7d2fe",
                borderRadius: 6, padding: "1px 7px", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
              }}>Demo</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            {formatDate(entry.date)}
            {entry.duration ? ` · ${formatDuration(entry.duration)}` : ""}
          </div>
        </div>

        {/* Dimension score dots */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {Object.values(scores).slice(0, 5).map((s, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: scoreColor(s), opacity: 0.8,
            }} title={s + "/10"} />
          ))}
        </div>

        {/* Score ring */}
        {avg && <ScoreRing score={avg} size={48} />}

        {/* Verdict badge */}
        <div style={{
          padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0,
          background: verdict.bg, color: verdict.color, border: `1px solid ${verdict.border}`,
        }}>
          {verdict.label}
        </div>

        {/* Chevron */}
        <div style={{ color: "#d1d5db", fontSize: 14, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>
          ▾
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>

          {/* Dimension scores */}
          <div style={{ padding: "16px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #f3f4f6" }}>
            {Object.entries(scores).map(([dim, score]) => (
              <div key={dim} style={{
                padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: "#f8f9fa", color: "#374151",
              }}>
                {dim.replace("Ability to ", "").replace("Communication ", "Comm. ")}: {" "}
                <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score}/10</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px 20px 20px" }}>

            {/* Summary */}
            <div style={{
              fontSize: 13, color: "#374151", lineHeight: 1.8,
              background: "#f8f9fa", borderRadius: 10, padding: "12px 14px", marginBottom: 16,
            }}>
              {entry.report.summary}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Strengths */}
              {(entry.report.strengths || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontWeight: 600 }}>Strengths</div>
                  {entry.report.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#374151", marginBottom: 5, display: "flex", gap: 7, lineHeight: 1.5 }}>
                      <span style={{ color: C.green, flexShrink: 0 }}>✓</span> {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Concerns */}
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontWeight: 600 }}>Areas to Watch</div>
                {!(entry.report.concerns || []).length
                  ? <div style={{ fontSize: 13, color: C.green }}>No concerns noted ✓</div>
                  : (entry.report.concerns || []).map((c, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#374151", marginBottom: 5, display: "flex", gap: 7, lineHeight: 1.5 }}>
                      <span style={{ color: C.amber, flexShrink: 0 }}>⚠</span> {c}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Key quotes */}
            {(entry.report.quotes || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontWeight: 600 }}>Notable Quotes</div>
                {entry.report.quotes.slice(0, 2).map((q, i) => (
                  <div key={i} style={{
                    background: q.label === "positive" ? "#f0fdf4" : "#fffbeb",
                    borderLeft: `3px solid ${q.label === "positive" ? C.green : C.amber}`,
                    borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 8,
                    fontSize: 13, color: "#374151", fontStyle: "italic", lineHeight: 1.6,
                  }}>
                    "{q.text}"
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation + delete */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", flex: 1 }}>
                📋 {entry.report.recommendation}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                style={{
                  background: "none", border: "1px solid #fecaca", color: C.red,
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  transition: "background 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PIN Lock Screen ─── */
function PinLock({ onUnlock }) {
  const [digits, setDigits] = useState("");
  const [shake, setShake]   = useState(false);
  const [error, setError]   = useState("");
  const inputRef            = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = (d) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    setError("");
    if (next.length === 4) {
      if (next === HR_PIN) {
        onUnlock();
      } else {
        setShake(true);
        setError("Incorrect PIN — try again");
        setTimeout(() => { setShake(false); setDigits(""); }, 600);
      }
    }
  };

  const handleBackspace = () => { setDigits(d => d.slice(0, -1)); setError(""); };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <>
      <Head>
        <title>HR Access — Cuemath Tutor Screening</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#0c1225 0%,#111827 55%,#0c1225 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif", padding: "20px",
      }}>
        {/* ambient blobs */}
        <div style={{ position: "fixed", top: "10%", left: "5%", width: 420, height: 420, background: "rgba(99,102,241,0.07)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 340, height: 340, background: "rgba(139,92,246,0.06)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>

          {/* Lock icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 24px",
            background: "linear-gradient(135deg,#6366f1,#818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" fill="white" opacity="0.9"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="16" r="1.5" fill="#6366f1"/>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>HR Access Only</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", marginBottom: 8 }}>Dashboard PIN</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 36, lineHeight: 1.7 }}>
            This dashboard is for Cuemath recruiting staff only.<br/>
            Candidates — please go back to your{" "}
            <Link href="/" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>interview page</Link>.
          </p>

          {/* PIN dots */}
          <div
            style={{
              display: "flex", justifyContent: "center", gap: 14,
              marginBottom: 28,
              animation: shake ? "pinShake 0.5s ease" : "none",
            }}
          >
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${i < digits.length ? "#6366f1" : "rgba(255,255,255,0.2)"}`,
                background: i < digits.length ? "#6366f1" : "transparent",
                transition: "all 0.15s ease",
                boxShadow: i < digits.length ? "0 0 12px rgba(99,102,241,0.6)" : "none",
              }} />
            ))}
          </div>

          {/* Error */}
          <div style={{
            height: 20, marginBottom: 20,
            fontSize: 13, color: "#f87171", fontWeight: 500,
            opacity: error ? 1 : 0, transition: "opacity 0.2s",
          }}>{error || "\u00a0"}</div>

          {/* Keypad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto 32px" }}>
            {keys.map((k, idx) => (
              k === "" ? <div key={idx} /> :
              <button
                key={idx}
                onClick={() => k === "⌫" ? handleBackspace() : handleKey(k)}
                style={{
                  height: 60, borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: k === "⌫" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                  color: k === "⌫" ? "#f87171" : "#e2e8f0",
                  fontSize: k === "⌫" ? 20 : 22, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = k === "⌫" ? "rgba(239,68,68,0.22)" : "rgba(99,102,241,0.22)"; e.currentTarget.style.borderColor = k === "⌫" ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = k === "⌫" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                {k}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "#334155" }}>PIN is shared with your HR team</p>
        </div>
      </div>
      <style>{`
        @keyframes pinShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const [interviews, setInterviews] = useState([]);
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState("date");
  const [expanded, setExpanded]     = useState(null);
  const [loaded, setLoaded]         = useState(false);
  const [hasDemo, setHasDemo]       = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  useEffect(() => {
    if (!pinUnlocked) return;   // don't load data until unlocked
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let data = raw ? JSON.parse(raw) : [];

      /* Seed demo data if localStorage is empty */
      if (data.length === 0) {
        data = DEMO_DATA;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_DATA));
        setHasDemo(true);
      } else {
        setHasDemo(data.some(i => i._demo));
      }

      setInterviews(data);
    } catch {
      setInterviews([]);
    }
    setLoaded(true);
  }, [pinUnlocked]);

  const handleLock = () => {
    setPinUnlocked(false);
    setLoaded(false);
    setInterviews([]);
  };

  /* Show PIN screen if not yet unlocked */
  if (!pinUnlocked) return <PinLock onUnlock={() => setPinUnlocked(true)} />;

  const handleDelete = (id) => {
    if (!confirm("Remove this interview record permanently?")) return;
    const updated = interviews.filter(i => i.id !== id);
    setInterviews(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    if (expanded === id) setExpanded(null);
    setHasDemo(updated.some(i => i._demo));
  };

  const handleClearAll = () => {
    if (!confirm(`Delete all ${interviews.length} interview records? This cannot be undone.`)) return;
    setInterviews([]);
    setExpanded(null);
    setHasDemo(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const handleExportCSV = () => {
    if (!interviews.length) return;
    const headers = ["Name","Date","Duration","Verdict","Overall Score","Communication Clarity","Warmth & Patience","Ability to Simplify","English Fluency","Teaching Aptitude","Summary","Recommendation"];
    const rows = interviews.map(iv => {
      const s = iv.report.scores || {};
      const avg = getAvg(s) || "";
      return [
        iv.name,
        new Date(iv.date).toLocaleDateString("en-IN"),
        iv.duration ? `${Math.floor(iv.duration/60)}m ${iv.duration%60}s` : "",
        iv.report.overall,
        avg,
        s["Communication Clarity"] || "",
        s["Warmth & Patience"] || "",
        s["Ability to Simplify"] || "",
        s["English Fluency"] || "",
        s["Teaching Aptitude"] || "",
        (iv.report.summary || "").replace(/,/g, ";"),
        (iv.report.recommendation || "").replace(/,/g, ";"),
      ].map(v => `"${v}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuemath-candidates-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Stats */
  const stats = {
    total:   interviews.length,
    forward: interviews.filter(i => i.report.overall === "Move Forward").length,
    hold:    interviews.filter(i => i.report.overall === "Hold").length,
    not:     interviews.filter(i => i.report.overall === "Not Recommended").length,
  };

  const avgOverall = interviews.length
    ? (
        interviews
          .map(i => parseFloat(getAvg(i.report.scores) || 0))
          .reduce((a, b) => a + b, 0) / interviews.length
      ).toFixed(1)
    : null;

  const advanceRate = stats.total
    ? Math.round((stats.forward / stats.total) * 100)
    : 0;

  /* Filter + sort */
  const filtered = interviews
    .filter(i => {
      const matchV = filter === "All" || i.report.overall === filter;
      const matchS = !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchV && matchS;
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        return parseFloat(getAvg(b.report.scores) || 0) - parseFloat(getAvg(a.report.scores) || 0);
      }
      return new Date(b.date) - new Date(a.date);
    });

  const FILTERS = [
    { key: "All",             label: `All (${stats.total})`,         activeColor: C.indigo },
    { key: "Move Forward",    label: `✓ Forward (${stats.forward})`,  activeColor: "#059669" },
    { key: "Hold",            label: `◌ Hold (${stats.hold})`,        activeColor: "#d97706" },
    { key: "Not Recommended", label: `✗ Not (${stats.not})`,          activeColor: "#dc2626" },
  ];

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#9ca3af", fontFamily: "'Inter', sans-serif" }}>Loading…</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>HR Dashboard — Cuemath Tutor Screening</title>
        <meta name="description" content="Review and manage all completed Cuemath tutor screening interviews." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366f1'/><path d='M16 7l7 4v8l-7 4-7-4V11z' fill='none' stroke='white' stroke-width='1.5'/><circle cx='16' cy='15' r='2.5' fill='white'/><line x1='16' y1='17.5' x2='16' y2='20' stroke='white' stroke-width='1.5'/><line x1='13' y1='20' x2='19' y2='20' stroke='white' stroke-width='1.5'/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f4f6fb", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Top Nav ── */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #e8ecf0",
          padding: "13px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)", position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* SVG Logo */}
            <svg width="38" height="38" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="44" height="44" rx="13" fill="url(#dashLogoGrad)"/>
              <defs>
                <linearGradient id="dashLogoGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#818cf8"/>
                </linearGradient>
              </defs>
              <path d="M22 10l9 5.2v10.4L22 31l-9-5.4V15.2z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
              <rect x="19" y="14" width="6" height="9" rx="3" fill="white"/>
              <path d="M17 21.5c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <line x1="22" y1="26.5" x2="22" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="19" y1="29" x2="25" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>Cuemath <span style={{ color: C.indigo }}>AI Screener</span></div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>HR Dashboard · Candidate Management</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {interviews.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  style={{
                    background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46",
                    padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s", cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#dcfce7")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#f0fdf4")}
                >
                  ⬇ Export CSV
                </button>
                <button
                  onClick={handleClearAll}
                  style={{
                    background: "none", border: "1px solid #fecaca", color: C.red,
                    padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    transition: "background 0.15s", cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  Clear All
                </button>
              </>
            )}
            <button
              onClick={handleLock}
              title="Lock dashboard"
              style={{
                background: "none", border: "1px solid #e5e7eb", color: "#6b7280",
                padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "background 0.15s, color 0.15s", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#374151"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none";    e.currentTarget.style.color = "#6b7280"; }}
            >
              🔒 Lock
            </button>
            <Link href="/" style={{
              padding: "9px 20px",
              background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
              color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600,
              textDecoration: "none", boxShadow: `0 4px 12px ${C.indigoGlow}`,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              + New Interview
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 20px 56px" }}>

          {/* ── Demo data notice ── */}
          {hasDemo && (
            <div style={{
              background: "linear-gradient(135deg,#1e1b4b,#312e81)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 14, padding: "12px 20px", marginBottom: 22,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>Demo data loaded </span>
                <span style={{ fontSize: 13, color: "#6366f1" }}>— </span>
                <span style={{ fontSize: 13, color: "#818cf8" }}>
                  These 3 sample candidates show how the HR dashboard works. Run a real interview to add your own results.
                </span>
              </div>
              <Link href="/" style={{
                fontSize: 12, color: "#a5b4fc", textDecoration: "none",
                padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.35)",
                background: "rgba(99,102,241,0.15)", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                Run Interview →
              </Link>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Screened",  value: stats.total,   color: C.indigo, icon: "👥", sub: "candidates" },
              { label: "Move Forward",    value: stats.forward, color: C.green,  icon: "✅", sub: `${advanceRate}% advance rate` },
              { label: "On Hold",         value: stats.hold,    color: C.amber,  icon: "⏸️", sub: "review needed" },
              { label: "Not Recommended", value: stats.not,     color: C.red,    icon: "❌", sub: "screened out" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
                padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Cohort avg banner */}
          {avgOverall && (
            <div style={{
              background: `linear-gradient(135deg, ${C.indigo}18, ${C.indigoLight}12)`,
              border: `1px solid ${C.indigo}30`, borderRadius: 14,
              padding: "14px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 11, color: C.indigo, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Cohort Avg</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: C.indigo }}>{avgOverall}</span>
                <span style={{ fontSize: 14, color: "#9ca3af" }}>/10</span>
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Across {stats.total} candidate{stats.total !== 1 ? "s" : ""} · {advanceRate}% advance rate ·{" "}
                Best: {Math.max(...interviews.map(i => parseFloat(getAvg(i.report.scores) || 0))).toFixed(1)}/10
              </div>
            </div>
          )}

          {/* ── Filters + Search ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {FILTERS.map(f => {
                const active = filter === f.key;
                return (
                  <button key={f.key}
                    onClick={() => { setFilter(f.key); setExpanded(null); }}
                    style={{
                      padding: "7px 15px", borderRadius: 20,
                      border: `1.5px solid ${active ? f.activeColor : "#e5e7eb"}`,
                      background: active ? `${f.activeColor}14` : "#fff",
                      color: active ? f.activeColor : "#374151",
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      transition: "all 0.15s",
                    }}>
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 9,
                fontSize: 12, fontFamily: "inherit", outline: "none", color: "#374151",
                background: "#fff", cursor: "pointer",
              }}
            >
              <option value="date">Sort: Newest first</option>
              <option value="score">Sort: Highest score</option>
            </select>

            {/* Search */}
            <input
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "8px 14px", border: "1px solid #e5e7eb", borderRadius: 9,
                fontSize: 13, outline: "none", fontFamily: "inherit",
                marginLeft: "auto", width: 200, color: "#374151",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = C.indigo)}
              onBlur={e  => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* ── Candidate List ── */}
          {interviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>🎙️</div>
              <h2 style={{ fontSize: 22, color: "#111827", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>No interviews yet</h2>
              <p style={{ color: "#6b7280", marginBottom: 28, fontSize: 14 }}>
                Complete your first AI screening interview — results will automatically appear here.
              </p>
              <Link href="/" style={{
                padding: "13px 28px",
                background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
                color: "#fff", borderRadius: 12, fontSize: 14, fontWeight: 600,
                textDecoration: "none", boxShadow: `0 4px 16px ${C.indigoGlow}`,
              }}>
                Start First Interview →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 14 }}>No candidates match your current filter.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(entry => (
                <CandidateCard
                  key={entry.id}
                  entry={entry}
                  expanded={expanded === entry.id}
                  onToggle={() => setExpanded(prev => prev === entry.id ? null : entry.id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
