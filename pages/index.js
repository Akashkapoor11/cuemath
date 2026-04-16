import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../lib/supabase";

/* ─── Storage ─── */
const STORAGE_KEY = "cuemath_interviews";

function saveInterview(name, report, transcript, duration) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.unshift({
      id: Date.now().toString(),
      name,
      date: new Date().toISOString(),
      duration,
      transcript,
      report,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch (e) {
    console.warn("Could not save interview to localStorage:", e);
  }
}

/* ─── Design tokens ─── */
const C = {
  indigo:      "#6366f1",
  indigoLight: "#818cf8",
  indigoGlow:  "rgba(99,102,241,0.32)",
  green:  "#10b981",
  amber:  "#f59e0b",
  red:    "#ef4444",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  white:  "#ffffff",
};

/* ─── Stable API helper (module-level to avoid stale closures) ─── */
async function callAPI(messages, task = "interview") {
  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, task }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const d = await res.json();
  return d.content;
}

/* ─── Helpers ─── */
function verdictStyle(v) {
  if (v === "Move Forward")  return { color: "#065f46", bg: "#d1fae5", border: "#6ee7b7" };
  if (v === "Hold")          return { color: "#92400e", bg: "#fef3c7", border: "#fcd34d" };
  return                            { color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" };
}

function scoreColor(s) {
  const n = parseFloat(s);
  if (n >= 8) return C.green;
  if (n >= 5) return C.indigo;
  return C.amber;
}

/* ─── Confetti ─── */
function Confetti() {
  const pieces = useRef(
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 98 + 1}%`,
      color: ["#6366f1","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f97316"][i % 7],
      size: 6 + (i % 5) * 2,
      delay: Math.random() * 1.8,
      duration: 2.2 + Math.random() * 2,
      isRect: i % 3 !== 0,
    }))
  ).current;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: -30, left: p.left,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.isRect ? "2px" : "50%",
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
        }} />
      ))}
    </div>
  );
}

/* ─── ScoreRing ─── */
function ScoreRing({ score, label, animate = false }) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 10) * circ;
  const col = scoreColor(score);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setDisplayed(score), 120);
    return () => clearTimeout(t);
  }, [animate, score]);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={60} height={60} viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={30} cy={30} r={r} fill="none" stroke="#f3f4f6" strokeWidth={5} />
          <circle cx={30} cy={30} r={r} fill="none" stroke={col} strokeWidth={5}
            strokeDasharray={circ.toFixed(2)} strokeDashoffset={offset.toFixed(2)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <span style={{ position: "absolute", fontSize: 14, fontWeight: 700, color: col }}>{displayed}</span>
      </div>
      <div style={{ fontSize: 11, color: C.slate500, marginTop: 5, lineHeight: 1.3, maxWidth: 78 }}>{label}</div>
    </div>
  );
}

/* ─── ScoreBar ─── */
function ScoreBar({ label, score, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const col = scoreColor(score);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score * 10), 200 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{score}/10</span>
      </div>
      <div style={{ height: 7, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${width}%`,
          background: `linear-gradient(90deg,${col},${col}bb)`,
          borderRadius: 4,
          transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

/* ─── Chat bubbles ─── */
function AIBubble({ text }) {
  return (
    <div className="msgFade" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 14,
        boxShadow: `0 4px 12px ${C.indigoGlow}`,
      }}>C</div>
      <div style={{
        maxWidth: "76%", padding: "12px 16px",
        borderRadius: "4px 18px 18px 18px",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#f1f5f9", fontSize: 14, lineHeight: 1.8,
        backdropFilter: "blur(12px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text, initial }) {
  return (
    <div className="msgFade" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: "row-reverse" }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 14,
        boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
      }}>{initial}</div>
      <div style={{
        maxWidth: "76%", padding: "12px 16px",
        borderRadius: "18px 4px 18px 18px",
        background: "#ffffff",
        color: "#1e1b4b", fontSize: 14, lineHeight: 1.8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}>
        {text}
      </div>
    </div>
  );
}

/* Thinking dots */
function ThinkingBubble() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 14,
      }}>C</div>
      <div style={{
        padding: "14px 20px", borderRadius: "4px 18px 18px 18px",
        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", gap: 6,
        backdropFilter: "blur(12px)",
      }}>
        {[0, 0.18, 0.36].map((delay, i) => (
          <div key={i} style={{
            width: 9, height: 9, background: "#a5b4fc", borderRadius: "50%",
            animation: `dotBounce 1.1s ease ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* Speaking indicator */
function SpeakingIndicator() {
  return (
    <div className="msgFade" style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "8px 16px", borderRadius: 12,
      background: "rgba(99,102,241,0.2)", border: "1px solid rgba(165,180,252,0.4)",
      alignSelf: "flex-start",
    }}>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 16 }}>
        {[0, 0.1, 0.2, 0.1, 0].map((d, i) => (
          <div key={i} style={{
            width: 3, background: "#a5b4fc", borderRadius: 2,
            minHeight: 4,
            animation: `pulse 0.65s ease ${d}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#c7d2fe", fontWeight: 500 }}>Chitti is speaking…</span>
    </div>
  );
}

/* ─── Main component ─── */
export default function TutorScreener() {
  const [screen,       setScreen]       = useState("welcome");
  const [name,         setName]         = useState("");
  const [msgs,         setMsgs]         = useState([]);
  const [inputVal,     setInputVal]     = useState("");
  const [disabled,     setDisabled]     = useState(false);
  const [qNum,         setQNum]         = useState(0);
  const [elapsed,      setElapsed]      = useState(0);
  const [isRecording,  setIsRecording]  = useState(false);
  const [interim,      setInterim]      = useState("");
  const [report,       setReport]       = useState(null);
  const [savedCount,   setSavedCount]   = useState(0);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cohortStats,  setCohortStats]  = useState(null);
  const [isChrome,     setIsChrome]     = useState(true);  // assume Chrome until proven otherwise
  const [showHowModal, setShowHowModal] = useState(false);

  const convoRef       = useRef(null);
  const bottomRef      = useRef(null);
  const mediaRecRef    = useRef(null);  // for non-Chrome browsers
  const recognitionRef = useRef(null);
  const silenceRef     = useRef(null);
  const pendingRef     = useRef("");
  const timerRef       = useRef(null);
  const isSpeakingRef  = useRef(false);
  const isStoppingRef  = useRef(false);
  const historyRef     = useRef([]);
  const isSendingRef   = useRef(false);
  const elapsedRef     = useRef(0);
  const genAssessRef   = useRef(null);

  const TOTAL_Q = 6;
  const MAX_DURATION = 600; // 10 minutes — interview auto-submits at this point

  /* Detect Chrome on mount */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent;
      const chrome = /Chrome\//.test(ua) && !/Edg\/|OPR\/|Brave/.test(ua);
      setIsChrome(chrome);
    }
  }, []);

  /* Load saved count + cohort stats on mount */
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setSavedCount(data.length);
      if (data.length > 0) {
        const avgs = data.map(i => {
          const vals = Object.values(i.report?.scores || {});
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        });
        const avgScore = (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1);
        const forward = data.filter(i => i.report?.overall === "Move Forward").length;
        setCohortStats({
          total: data.length,
          avgScore,
          advanceRate: Math.round((forward / data.length) * 100),
        });
      }
    } catch {}
  }, []);

  /* Auto-scroll — always bring the latest message into view */
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, isSpeaking]);

  /* Timer — keeps elapsedRef in sync + auto-submits on timeout */
  useEffect(() => {
    if (screen === "interview") {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          elapsedRef.current = next;
          // Auto-submit when time runs out
          if (next >= MAX_DURATION) {
            clearInterval(timerRef.current);
            setTimeout(() => {
              setScreen("generating");
              genAssessRef.current?.(historyRef.current, next);
            }, 300);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Countdown helpers
  const remaining    = Math.max(MAX_DURATION - elapsed, 0);
  const timerColor   = remaining <= 60 ? C.red : remaining <= 120 ? C.amber : C.green;
  const timerPulse   = remaining <= 60;

  const stripMarkers = (text) =>
    text.replace(/##Q\d##/g, "").replace(/##INTERVIEW_COMPLETE##/g, "").trim();

  /* Speech synthesis with isSpeaking state tracking */
  const speak = useCallback((text, onDone = null) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = stripMarkers(text)
      .replace(/[*_`#]/g, "")
      .trim();
    if (!clean) { onDone?.(); return; }

    const doSpeak = (voice) => {
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 0.95; u.pitch = 1.05;
      if (voice) u.voice = voice;
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      u.onend  = () => { isSpeakingRef.current = false; setIsSpeaking(false); onDone?.(); };
      u.onerror = () => { isSpeakingRef.current = false; setIsSpeaking(false); onDone?.(); };
      window.speechSynthesis.speak(u);
    };

    const pick = voices =>
      voices.find(v => /female|samantha|karen|moira|zira/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en")) || null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(pick(voices));
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak(pick(window.speechSynthesis.getVoices()));
      };
    }
  }, []);

  /* Display helpers */
  const addMsg      = useCallback((type, text) => {
    setMsgs(m => [...m.filter(x => x.type !== "thinking"), { type, text }]);
  }, []);
  const addThinking    = useCallback(() => setMsgs(m => [...m, { type: "thinking" }]), []);
  const removeThinking = useCallback(() => setMsgs(m => m.filter(x => x.type !== "thinking")), []);

  /* Send to Claude */
  const send = useCallback(async (userText) => {
    const t = userText.trim();
    if (!t || isSendingRef.current) return;
    isSendingRef.current = true;
    setDisabled(true);

    addMsg("user", t);
    const newHist = [...historyRef.current, { role: "user", content: t }];
    historyRef.current = newHist;
    // DO NOT increment qNum here — it's updated when AI signals ##Q{N}##
    addThinking();

    try {
      const reply = await callAPI(newHist);
      removeThinking();

      // Detect which main question the AI is now on (##Q1## – ##Q6##)
      const qMatch = reply.match(/##Q(\d)##/);
      if (qMatch) {
        const n = parseInt(qMatch[1], 10);
        setQNum(n - 1); // displayQ = qNum + 1, so Q1 shows when qNum=0
      }

      const displayReply = stripMarkers(reply);
      addMsg("ai", displayReply);

      const updatedHist = [...newHist, { role: "assistant", content: reply }];
      historyRef.current = updatedHist;

      if (reply.includes("##INTERVIEW_COMPLETE##")) {
        clearInterval(timerRef.current);
        const finalDuration = elapsedRef.current;
        // Wait for Chitti to finish speaking, THEN transition
        speak(reply, () => {
          setTimeout(() => {
            setScreen("generating");
            genAssessRef.current?.(updatedHist, finalDuration);
          }, 400); // small pause after speech ends before switching screens
        });
      } else {
        speak(reply);
        setDisabled(false);
      }

    } catch (err) {
      removeThinking();
      addMsg("ai", "I'm having a small technical hiccup — could you repeat that?");
      console.error("Send error:", err);
      setDisabled(false);
    } finally {
      isSendingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMsg, addThinking, removeThinking, speak]);

  /* Start interview */
  const startInterview = async () => {
    if (!name.trim()) { alert("Please enter your name to begin."); return; }
    setScreen("interview");
    setDisabled(true);
    addThinking();

    const openMsg = [{ role: "user", content: `Start the interview now. Greet ${name.trim()} warmly and ask Q1.` }];
    try {
      const reply = await callAPI(openMsg);
      removeThinking();
      // Detect Q1 marker from opening message
      const qMatch = reply.match(/##Q(\d)##/);
      if (qMatch) setQNum(parseInt(qMatch[1], 10) - 1);
      addMsg("ai", reply.replace(/##Q\d##/g, "").trim());
      speak(reply);
      historyRef.current = [...openMsg, { role: "assistant", content: reply }];
      setDisabled(false);
    } catch {
      removeThinking();
      setQNum(0); // fallback: we're on Q1
      addMsg("ai", `Hello ${name.trim()}! Welcome to your Cuemath tutor screening. I'm Chitti. Could you start by telling me a little about yourself and what brought you to tutoring?`);
      setDisabled(false);
    }
  };

  /* Generate assessment + send email */
  const generateAssessment = async (hist, duration) => {
    const assessPrompt = `Based on the complete interview above with candidate named "${name}", generate a structured JSON assessment.\nReturn ONLY valid JSON — no markdown fences, no prose:\n{"overall":"Move Forward|Hold|Not Recommended","summary":"2-3 sentence overall impression","scores":{"Communication Clarity":<1-10>,"Warmth & Patience":<1-10>,"Ability to Simplify":<1-10>,"English Fluency":<1-10>,"Teaching Aptitude":<1-10>},"strengths":["s1","s2","s3"],"concerns":["c1"],"quotes":[{"text":"exact candidate quote","dimension":"dimension name","label":"positive|negative"},{"text":"exact candidate quote 2","dimension":"dim","label":"positive|negative"},{"text":"exact candidate quote 3","dimension":"dim","label":"positive|negative"}],"recommendation":"One sentence hiring recommendation"}`;

    try {
      const raw = await callAPI([...hist, { role: "user", content: assessPrompt }], "assess");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const r = JSON.parse(cleaned);

      saveInterview(name, r, hist, duration);
      setSavedCount(c => c + 1);
      setReport(r);

      // ── Persist to Supabase ──
      supabase.from("interviews").insert([{
        name,
        date: new Date().toISOString(),
        duration,
        transcript: hist,
        report: r,
        _demo: false,
      }]).then(({ error }) => {
        if (error) console.warn("Supabase insert failed:", error.message);
        else console.log("✅ Interview saved to Supabase");
      });

      // Send real email report
      const vals = Object.values(r.scores || {});
      const avg = vals.length ? (vals.reduce((a,b) => a+b,0)/vals.length).toFixed(1) : "—";
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, report: r, avgScore: avg }),
      }).catch(e => console.warn("Email send failed:", e));

      if (r.overall === "Move Forward") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5500);
      }
      setScreen("report");
    } catch (e) {
      console.error("Assessment error:", e);
      const fallback = {
        overall: "Hold",
        summary: "Assessment could not be auto-generated. Please review the interview transcript manually.",
        scores: { "Communication Clarity": 7, "Warmth & Patience": 7, "Ability to Simplify": 7, "English Fluency": 7, "Teaching Aptitude": 7 },
        strengths: ["Completed the full interview"],
        concerns: ["Manual review required — auto-assessment failed"],
        quotes: [],
        recommendation: "Review the interview transcript and assess manually.",
      };
      saveInterview(name, fallback, hist, duration);
      setSavedCount(c => c + 1);
      setReport(fallback);

      // ── Persist fallback to Supabase ──
      supabase.from("interviews").insert([{
        name,
        date: new Date().toISOString(),
        duration,
        transcript: hist,
        report: fallback,
        _demo: false,
      }]).then(({ error }) => {
        if (error) console.warn("Supabase insert failed:", error.message);
      });

      setScreen("report");
    }
  };
  genAssessRef.current = generateAssessment;

  /* Voice recording — stop (handles both SpeechRecognition and MediaRecorder) */
  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setIsRecording(false);
    clearTimeout(silenceRef.current);

    // Stop Web Speech API if running
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder if running (Firefox/Safari)
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch (_) {}
      // onstop handler will handle sending
      mediaRecRef.current = null;
      isStoppingRef.current = false;
      return; // wait for onstop to fire
    }

    const t = pendingRef.current.trim();
    pendingRef.current = "";
    setInterim("");
    isStoppingRef.current = false;
    if (t && t.length > 2) send(t);
  }, [send]);

  /* Start recording — Chrome uses Web Speech API, all others use MediaRecorder + Groq Whisper */
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SR) {
      // ─── Chrome / Edge path (real-time transcript) ───
      if (isSpeakingRef.current) window.speechSynthesis?.cancel();
      pendingRef.current = "";
      const r = new SR();
      r.continuous = true; r.interimResults = true; r.lang = "en-IN";
      r.onstart = () => setIsRecording(true);
      r.onresult = (e) => {
        clearTimeout(silenceRef.current);
        let fin = "", tmp = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
          else                      tmp += e.results[i][0].transcript;
        }
        pendingRef.current += fin;
        setInterim((pendingRef.current + tmp).trim() || "Listening…");
        silenceRef.current = setTimeout(stopRecording, 3000);
      };
      r.onend  = () => { if (recognitionRef.current) stopRecording(); };
      r.onerror = (ev) => { console.warn("Speech error:", ev.error); stopRecording(); };
      recognitionRef.current = r;
      r.start();
    } else {
      // ─── Firefox / Safari path (MediaRecorder + Groq Whisper) ───
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Microphone not supported on this browser. Please type your response.");
        return;
      }
      if (isSpeakingRef.current) window.speechSynthesis?.cancel();
      setInterim("Recording… press Stop when done");

      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/ogg";
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          setInterim("Transcribing…");
          try {
            const blob = new Blob(chunks, { type: mimeType });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = async () => {
              const base64 = reader.result.split(",")[1];
              const resp = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audio: base64, mimeType }),
              });
              const { text } = await resp.json();
              setInterim("");
              isStoppingRef.current = false;
              if (text && text.trim().length > 2) send(text.trim());
            };
          } catch (err) {
            console.error("Transcription error:", err);
            setInterim("");
            isStoppingRef.current = false;
          }
        };
        mediaRecRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      }).catch(() => {
        alert("Microphone access denied. Please allow microphone access or type your response.");
        setIsRecording(false);
      });
    }
  }, [stopRecording, send]);

  const toggleVoice = () => { if (!disabled) isRecording ? stopRecording() : startRecording(); };

  const handleSendText = () => {
    const t = inputVal.trim();
    if (!t || disabled) return;
    setInputVal("");
    if (isSpeakingRef.current) window.speechSynthesis?.cancel();
    send(t);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  };

  const resetAll = () => {
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (_) {} recognitionRef.current = null; }
    clearInterval(timerRef.current);
    historyRef.current = [];
    isSendingRef.current = false;
    setScreen("welcome"); setName(""); setMsgs([]); setInputVal("");
    setDisabled(false); setQNum(0); setElapsed(0); setInterim(""); setReport(null);
    setIsSpeaking(false); setShowConfetti(false);
  };

  /* ═══════════════════ WELCOME ═══════════════════ */
  if (screen === "welcome") return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", display: "flex", flexDirection: "column" }}>
      <Head>
        <title>Cuemath Tutor Screening — AI Interviewer</title>
        <meta name="description" content="Complete a short AI-powered voice interview with Chitti and receive an instant structured assessment." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366f1'/><path d='M16 7l7 4v8l-7 4-7-4V11z' fill='none' stroke='white' stroke-width='1.5'/><circle cx='16' cy='15' r='2.5' fill='white'/><line x1='16' y1='17.5' x2='16' y2='20' stroke='white' stroke-width='1.5'/><line x1='13' y1='20' x2='19' y2='20' stroke='white' stroke-width='1.5'/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          .nav-text-links { display: flex; }
          .nav-divider { display: block; }
          @media (max-width: 600px) {
            .nav-text-links { display: none !important; }
            .nav-divider { display: none !important; }
            .nav-inner { padding: 0 16px !important; }
          }
          @media (max-width: 420px) {
            .hero-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </Head>

      {/* ── Browser compatibility banner ── */}
      {!isChrome && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(90deg,#92400e,#b45309)",
          borderBottom: "1px solid #d97706", padding: "11px 20px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fef3c7" }}>Voice input requires Chrome on desktop. </span>
            <span style={{ fontSize: 13, color: "#fde68a" }}>
              Please open this page in{" "}
              <a href="https://www.google.com/chrome/" target="_blank" rel="noreferrer" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>Google Chrome</a>
              {" "}for the best experience. Text input below still works in any browser.
            </span>
          </div>
        </div>
      )}

      {/* ════ Navbar ════ */}
      <nav className="nav-inner" style={{
        position: "sticky", top: !isChrome ? 48 : 0, zIndex: 100,
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 36px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="13" fill="url(#navLG2)"/>
            <defs><linearGradient id="navLG2" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
            <rect x="19" y="14" width="6" height="9" rx="3" fill="white"/>
            <path d="M17 21.5c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <line x1="22" y1="26.5" x2="22" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="19" y1="29" x2="25" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#1e1b4b", letterSpacing: "-0.03em", lineHeight: 1 }}>Cuemath</div>
            <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Tutor Screener</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Hidden on mobile via CSS */}
          <div className="nav-text-links" style={{ alignItems: "center", gap: 4 }}>
            {[{ label: "How it works", href: "#" }, { label: "About Cuemath", href: "https://cuemath.com", ext: true }].map(n => (
              <a key={n.label} href={n.href}
                onClick={n.label === "How it works" ? (e) => { e.preventDefault(); setShowHowModal(true); } : undefined}
                target={n.ext ? "_blank" : undefined} rel={n.ext ? "noreferrer" : undefined}
                style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, color: "#1e293b", fontWeight: 500, textDecoration: "none", transition: "color 0.15s", cursor: "pointer", whiteSpace: "nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#6366f1")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1e293b")}
              >{n.label}</a>
            ))}
          </div>
          <div className="nav-divider" style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 8px" }} />
          <Link href="/dashboard" style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13, color: "#fff", fontWeight: 700,
            textDecoration: "none",
            background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
            boxShadow: "0 2px 10px rgba(99,102,241,0.35)",
            display: "flex", alignItems: "center", gap: 6,
            transition: "box-shadow 0.2s, transform 0.15s",
            whiteSpace: "nowrap",
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.45)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(99,102,241,0.35)"; e.currentTarget.style.transform = ""; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" fill="white" opacity="0.9"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            </svg>
            HR Portal
          </Link>
        </div>
      </nav>

      {/* ════ Hero ════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 20px 24px",
        background: "linear-gradient(160deg, #e8f4fd 0%, #ecf9f4 50%, #e8f7f0 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 500, height: 500, background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "5%", width: 300, height: 300, background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 560, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>

          {/* Live badge */}
          <div className="fadeIn" style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 40, padding: "5px 14px",
          }}>
            <div style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", animation: "glow 1.5s ease infinite" }} />
            <span style={{ fontSize: 11, color: "#047857", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live Interview · AI Powered</span>
          </div>

          {/* Hero heading */}
          <h1 className="fadeIn" style={{
            fontSize: "clamp(32px,4.5vw,52px)", color: "#1e1b4b",
            lineHeight: 1.08, marginBottom: 10, animationDelay: "0.08s",
            fontWeight: 900, letterSpacing: "-0.04em", fontFamily: "'Inter', sans-serif",
          }}>
            Your AI Interview<br />
            <span style={{
              display: "inline-block",
              backgroundImage: "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Starts Now</span>
          </h1>

          <p className="fadeIn" style={{ color: "#475569", fontSize: 15, lineHeight: 1.6, marginBottom: 14, animationDelay: "0.14s" }}>
            A friendly 5–8 minute voice conversation with{" "}
            <strong style={{ color: "#4f46e5", fontWeight: 700 }}>Chitti</strong>, our AI interviewer.<br />
            Six questions. Be yourself. There are no wrong answers.
          </p>

          {/* Assessment tiles - highlighted card to draw immediate attention */}
          <div className="fadeIn" style={{
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
            border: "2px solid transparent",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), linear-gradient(135deg,#6366f1,#0ea5e9,#10b981)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            borderRadius: 18, padding: "14px 18px", marginBottom: 12,
            textAlign: "left", animationDelay: "0.2s",
            boxShadow: "0 0 0 4px rgba(99,102,241,0.1), 0 8px 24px rgba(14,165,233,0.15)",
          }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontWeight: 700 }}>
              What Chitti evaluates
            </div>
            <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Communication Clarity", icon: "💬", bg: "rgba(14,165,233,0.07)",   bd: "rgba(14,165,233,0.2)" },
                { label: "Warmth & Patience",      icon: "🤝", bg: "rgba(16,185,129,0.07)",  bd: "rgba(16,185,129,0.2)" },
                { label: "Ability to Simplify",    icon: "🎯", bg: "rgba(79,70,229,0.07)",   bd: "rgba(79,70,229,0.18)" },
                { label: "English Fluency",         icon: "🗣️", bg: "rgba(6,182,212,0.07)",   bd: "rgba(6,182,212,0.2)" },
                { label: "Teaching Aptitude",       icon: "📚", bg: "rgba(52,211,153,0.08)",  bd: "rgba(52,211,153,0.22)" },
              ].map(d => (
                <div key={d.label} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10,
                  background: d.bg, border: `1px solid ${d.bd}`,
                  transition: "transform 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "")}
                >
                  <span style={{ fontSize: 14 }}>{d.icon}</span>
                  <span style={{ fontSize: 12, color: "#1e3a5f", fontWeight: 600 }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Name + CTA */}
          <div className="fadeIn" style={{ animationDelay: "0.28s" }}>
            <input
              id="candidate-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startInterview()}
              placeholder="Enter your full name"
              autoComplete="name"
              style={{
                width: "100%", padding: "13px 18px", borderRadius: 14,
                border: "2px solid rgba(99,102,241,0.35)",
                background: "rgba(255,255,255,0.95)", color: "#1e1b4b",
                fontSize: 15, marginBottom: 10, outline: "none",
                fontFamily: "inherit", transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
                boxShadow: "0 0 0 4px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.04)",
              }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.04)"; }}
              onBlur={e  => { e.target.style.borderColor = "rgba(99,102,241,0.35)"; e.target.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.04)"; }}
            />
            <button
              id="start-interview-btn"
              onClick={startInterview}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 16, fontWeight: 700, letterSpacing: "0.01em",
                boxShadow: "0 6px 20px rgba(14,165,233,0.35)",
                transition: "transform 0.18s, box-shadow 0.18s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(14,165,233,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(14,165,233,0.35)"; }}
            >
              <span>Begin Interview</span>
              <span style={{ fontSize: 20, lineHeight: 1 }}>→</span>
            </button>
            <p style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              🔒 Your responses are confidential · Chrome recommended for voice
            </p>
            {savedCount > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                <span style={{ fontWeight: 700, color: "#6366f1" }}>{savedCount}</span> candidate{savedCount !== 1 ? "s" : ""} screened so far
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════ How It Works Modal ════ */}
      {showHowModal && (
        <div
          onClick={() => setShowHowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 24, padding: "36px 32px",
            maxWidth: 460, width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            position: "relative", animation: "fadeIn 0.2s ease",
          }}>
            <button onClick={() => setShowHowModal(false)} style={{
              position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%",
              border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: 20, color: "#94a3b8",
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
            }}>×</button>

            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10,
                background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 40, padding: "5px 14px",
              }}>
                <span style={{ fontSize: 13 }}>⚡</span>
                <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Quick & Simple</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 6px" }}>How the Interview Works</h2>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>A 5–8 minute AI-powered voice screening — no prep needed.</p>
            </div>

            {[
              { step: "01", icon: "✍️", title: "Enter Your Name", desc: "Type your full name and click 'Begin Interview' to get started instantly.", color: "#6366f1", bg: "rgba(99,102,241,0.06)" },
              { step: "02", icon: "🎙️", title: "Talk to Chitti", desc: "Chitti asks 6 questions. Speak naturally — or type if you prefer. Chrome works best for voice.", color: "#0ea5e9", bg: "rgba(14,165,233,0.06)" },
              { step: "03", icon: "📊", title: "Get Instant Results", desc: "Receive a structured assessment: Communication, Fluency, Teaching Aptitude, and more.", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
            ].map(s => (
              <div key={s.step} style={{
                display: "flex", gap: 14, marginBottom: 14, padding: "14px",
                borderRadius: 14, background: s.bg, border: `1px solid ${s.color}33`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Step {s.step}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}

            <button onClick={() => { setShowHowModal(false); }} style={{
              width: "100%", padding: "13px",
              background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
              border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", marginTop: 6,
            }}>Got it — Let&apos;s Start!</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ═══════════════════ INTERVIEW ═══════════════════ */
  if (screen === "interview") {
    const displayQ = Math.min(Math.max(qNum + 1, 1), TOTAL_Q);
    return (
      <>
        <Head><title>Interview in Progress — Cuemath</title></Head>
        <div style={{
          height: "100vh",
          background: "linear-gradient(160deg, #0f0c29 0%, #1a1560 40%, #24243e 100%)",
          display: "flex", flexDirection: "column", position: "fixed",
          inset: 0, overflow: "hidden",
        }}>
          {/* Ambient blobs */}
          <div style={{ position: "fixed", top: "10%", left: "5%", width: 400, height: 400, background: "rgba(99,102,241,0.12)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
          <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 350, height: 350, background: "rgba(139,92,246,0.1)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", width: 300, height: 300, background: "rgba(14,165,233,0.06)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", transform: "translate(-50%,-50%)" }} />

          {/* Header */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "sticky", top: 0, zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: isSpeaking ? "speakPulse 1.2s ease infinite" : "none",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 14c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4S8 3.79 8 6v4c0 2.21 1.79 4 4 4z" fill="#fff"/>
                  <path d="M19 10v.5C19 14.64 15.86 18 12 18s-7-3.36-7-7.5V10H3v.5c0 4.61 3.36 8.47 7.75 9.35V22h2.5v-2.15C17.64 18.97 21 15.11 21 10.5V10h-2z" fill="#fff"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>Chitti — Cuemath AI Interviewer</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Question {displayQ} of {TOTAL_Q}
                  {isSpeaking && <span style={{ color: "#a5b4fc", marginLeft: 8, fontSize: 11 }}>· Speaking…</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: timerColor,
                animation: timerPulse ? "glow 0.7s ease infinite" : "glow 2s ease infinite",
              }} />
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: timerColor,
                animation: timerPulse ? "pulse 0.7s ease infinite" : "none",
                transition: "color 0.5s ease",
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatTime(remaining)}
              </span>
              <span style={{ fontSize: 11, color: "#64748b", marginLeft: 2 }}>left</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
            <div style={{
              height: "100%",
              width: `${Math.min((qNum / TOTAL_Q) * 100, 100)}%`,
              background: `linear-gradient(90deg,${C.indigo},#0ea5e9)`,
              transition: "width 0.6s ease",
              boxShadow: "0 0 8px rgba(99,102,241,0.6)",
            }} />
          </div>

          {/* Low-time warning banner */}
          {remaining <= 120 && remaining > 0 && (
            <div style={{
              background: remaining <= 60
                ? "rgba(239,68,68,0.15)"
                : "rgba(245,158,11,0.12)",
              borderBottom: `1px solid ${remaining <= 60 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
              padding: "8px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ fontSize: 13 }}>{remaining <= 60 ? "🔴" : "⚠️"}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: remaining <= 60 ? "#fca5a5" : "#fcd34d" }}>
                {remaining <= 60
                  ? `Less than 1 minute left — the interview will auto-submit at 0:00`
                  : `About 2 minutes remaining — please wrap up your answers`}
              </span>
            </div>
          )}

          {/* Messages — scrollable area fills remaining space */}
          <div ref={convoRef} className="light-scroll" style={{
            flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              flex: 1, maxWidth: 720, width: "100%", margin: "0 auto",
              padding: "24px 20px",
              display: "flex", flexDirection: "column", gap: 18, justifyContent: "flex-end",
              minHeight: "100%",
            }}>
              <div style={{ flex: 1 }} />
              {msgs.map((m, i) => {
                if (m.type === "thinking") return <ThinkingBubble key={i} />;
                if (m.type === "ai")       return <AIBubble key={i} text={m.text} />;
                return                            <UserBubble key={i} text={m.text} initial={name[0]?.toUpperCase() || "U"} />;
              })}
              {isSpeaking && <SpeakingIndicator />}
              {/* Invisible anchor — always scrolled into view */}
              <div ref={bottomRef} style={{ height: 1 }} />
            </div>
          </div>

          {/* Input bar */}
          <div style={{
            background: "rgba(15,12,41,0.8)",
            backdropFilter: "blur(20px)",
            borderTop: "2px solid rgba(99,102,241,0.4)",
            padding: "14px 20px",
          }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {isRecording && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  padding: "10px 14px",
                  background: "rgba(16,185,129,0.12)",
                  borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)",
                }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 18, flexShrink: 0 }}>
                    {[0, 0.1, 0.2, 0.15, 0.05].map((d, i) => (
                      <div key={i} style={{ width: 3, background: C.green, borderRadius: 2, animation: `pulse 0.7s ease ${d}s infinite`, minHeight: 4 }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {interim || "Listening…"}
                  </span>
                  <button id="stop-recording-btn" onClick={stopRecording}
                    style={{ background: C.red, border: "none", color: "#fff", padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: "pointer" }}>
                    Stop
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  id="response-input"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={disabled}
                  placeholder="Type your response, or click the mic to speak…"
                  style={{
                    flex: 1, padding: "13px 16px",
                    border: "1.5px solid rgba(165,180,252,0.5)", borderRadius: 12,
                    fontSize: 14, resize: "none", height: 50, fontFamily: "inherit",
                    outline: "none", color: "#f1f5f9", lineHeight: 1.5,
                    background: "rgba(255,255,255,0.12)",
                    opacity: disabled ? 0.6 : 1, transition: "border-color 0.2s, box-shadow 0.2s",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
                  }}
                  onFocus={e => { if (!disabled) { e.target.style.borderColor = "#a5b4fc"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.25), inset 0 1px 3px rgba(0,0,0,0.2)"; } }}
                  onBlur={e  => { e.target.style.borderColor = "rgba(165,180,252,0.5)"; e.target.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.2)"; }}
                />

                <button id="toggle-voice-btn" onClick={toggleVoice} disabled={disabled}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                  style={{
                    width: 50, height: 50, borderRadius: 12, flexShrink: 0,
                    border: `2px solid ${isRecording ? C.red : "rgba(165,180,252,0.6)"}`,
                    background: isRecording ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: disabled ? 0.5 : 1, transition: "all 0.2s", cursor: "pointer",
                    boxShadow: isRecording ? "0 0 12px rgba(239,68,68,0.3)" : "0 0 8px rgba(99,102,241,0.2)",
                  }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 14c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4S8 3.79 8 6v4c0 2.21 1.79 4 4 4z" fill={isRecording ? C.red : "#a5b4fc"}/>
                    <path d="M19 10v.5C19 14.64 15.86 18 12 18s-7-3.36-7-7.5V10H3v.5c0 4.61 3.36 8.47 7.75 9.35V22h2.5v-2.15C17.64 18.97 21 15.11 21 10.5V10h-2z" fill={isRecording ? C.red : "#a5b4fc"}/>
                  </svg>
                </button>

                <button id="send-btn" onClick={handleSendText} disabled={disabled || !inputVal.trim()}
                  style={{
                    height: 50, padding: "0 24px", borderRadius: 12, border: "none", flexShrink: 0,
                    background: (!disabled && inputVal.trim())
                      ? `linear-gradient(135deg,${C.indigo},#0ea5e9)` : "rgba(255,255,255,0.1)",
                    color: (!disabled && inputVal.trim()) ? "#fff" : "rgba(255,255,255,0.35)",
                    fontWeight: 700, fontSize: 14,
                    border: (!disabled && inputVal.trim()) ? "none" : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: (!disabled && inputVal.trim()) ? `0 4px 20px rgba(99,102,241,0.5)` : "none",
                    transition: "all 0.2s", cursor: (!disabled && inputVal.trim()) ? "pointer" : "default",
                  }}>
                  Send
                </button>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Enter to send · Shift+Enter for new line · 🎙 mic for voice input
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ═══════════════════ GENERATING ═══════════════════ */
  if (screen === "generating") return (
    <>
      <Head><title>Generating Assessment — Cuemath</title></Head>
      <div style={{
        minHeight: "100vh", background: "linear-gradient(160deg,#0c1225,#111827)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: "rgba(99,102,241,0.07)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{
            width: 88, height: 88, border: `3px solid rgba(99,102,241,0.15)`,
            borderTopColor: C.indigo, borderRadius: "50%",
            animation: "spin 1s linear infinite", margin: "0 auto 32px",
          }} />
          <h2 style={{ color: "#f1f5f9", fontFamily: "'Playfair Display',serif", fontSize: 28, marginBottom: 12, fontWeight: 500 }}>
            Analysing your interview
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>Reviewing responses across 5 dimensions…</p>
          <div style={{ marginTop: 28, display: "flex", gap: 8, justifyContent: "center" }}>
            {[C.indigo, C.indigoLight, "#a5b4fc"].map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, background: c, borderRadius: "50%", animation: `dotBounce 1.1s ease ${i * 0.18}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );

  /* ═══════════════════ REPORT ═══════════════════ */
  if (screen === "report" && report) {
    const vs = verdictStyle(report.overall);
    const scores = report.scores || {};
    const scoreVals = Object.values(scores);
    const avgScore = scoreVals.length
      ? (scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(1) : "—";

    return (
      <>
        {showConfetti && <Confetti />}
        <Head><title>Assessment — {name} — Cuemath</title></Head>
        <div style={{ background: "#f4f6fb", minHeight: "100vh" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px 56px" }}>

            {/* — Report Sent to HR Banner — */}
            <div style={{
              background: "linear-gradient(135deg,#1e3a5f,#1e1b4b)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 16, padding: "14px 22px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 14,
              animation: "fadeIn 0.5s ease",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>📧</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>Report automatically shared with Cuemath HR</div>
                <div style={{ fontSize: 12, color: "#6366f1", marginTop: 2 }}>akashkapoor12004@gmail.com · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Delivered
              </div>
            </div>

            {/* Move Forward celebration banner */}
            {report.overall === "Move Forward" && (
              <div className="celebration" style={{
                background: "linear-gradient(135deg,#064e3b,#065f46)",
                border: "1px solid #059669",
                borderRadius: 16, padding: "18px 24px", marginBottom: 28,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <span style={{ fontSize: 32 }}>🎉</span>
                <div>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: 15 }}>Recommended to Move Forward!</div>
                  <div style={{ color: "#6ee7b7", fontSize: 13, marginTop: 3, lineHeight: 1.6 }}>
                    {name} demonstrated strong tutoring potential across multiple dimensions.
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
              <div style={{
                width: 58, height: 58, borderRadius: 17, flexShrink: 0,
                background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "#fff", fontWeight: 700,
                boxShadow: `0 6px 20px ${C.indigoGlow}`,
              }}>
                {name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{name}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  Tutor Screening · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <div style={{
                padding: "9px 22px", borderRadius: 10,
                background: vs.bg, border: `1.5px solid ${vs.border}`,
                color: vs.color, fontWeight: 700, fontSize: 14,
              }}>
                {report.overall}
              </div>
            </div>

            {/* Score card */}
            <div style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
              padding: "24px 28px", marginBottom: 20,
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, fontWeight: 600 }}>Overall Score</div>
                <div style={{ fontSize: 54, fontWeight: 800, color: scoreColor(avgScore), lineHeight: 1 }}>
                  {avgScore}<span style={{ fontSize: 20, color: "#d1d5db", fontWeight: 400 }}>/10</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontWeight: 600 }}>Recommendation</div>
                <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.75 }}>{report.recommendation}</div>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, fontWeight: 600 }}>Interview Summary</div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.85 }}>{report.summary}</p>
            </div>

            {/* Dimension scores */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 20, fontWeight: 600 }}>Dimension Scores</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                {Object.entries(scores).map(([dim, score]) => <ScoreRing key={dim} label={dim} score={score} animate={true} />)}
              </div>
              {Object.entries(scores).map(([dim, score], i) => <ScoreBar key={dim} label={dim} score={score} delay={i * 120} />)}
            </div>

            {/* Strengths + Concerns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14, fontWeight: 600 }}>Strengths</div>
                {(report.strengths || []).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ color: C.green, fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>✓</span>
                    <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14, fontWeight: 600 }}>Areas to Watch</div>
                {!(report.concerns || []).length
                  ? <div style={{ fontSize: 13, color: C.green }}>No concerns noted ✓</div>
                  : (report.concerns || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ color: C.amber, fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>⚠</span>
                      <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{c}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Key quotes */}
            {(report.quotes || []).length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "20px 24px", marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16, fontWeight: 600 }}>Key Quotes as Evidence</div>
                {report.quotes.map((q, i) => {
                  const isPos = q.label === "positive";
                  return (
                    <div key={i} style={{
                      background: isPos ? "#f0fdf4" : "#fffbeb",
                      borderLeft: `3px solid ${isPos ? C.green : C.amber}`,
                      borderRadius: "0 12px 12px 0", padding: "12px 16px", marginBottom: 10,
                    }}>
                      <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, fontStyle: "italic" }}>"{q.text}"</div>
                      <div style={{ fontSize: 11, color: isPos ? "#065f46" : "#92400e", marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {q.dimension} · {q.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="no-print" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button id="download-pdf-btn" onClick={() => window.print()} style={{
                background: `linear-gradient(135deg,${C.indigo},${C.indigoLight})`,
                border: "none", color: "#fff", padding: "13px 28px", borderRadius: 12,
                fontWeight: 600, fontSize: 14, boxShadow: `0 4px 16px ${C.indigoGlow}`,
                transition: "all 0.2s", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 28px ${C.indigoGlow}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "";              e.currentTarget.style.boxShadow = `0 4px 16px ${C.indigoGlow}`; }}>
                📄 Download Report (PDF)
              </button>

              <button id="copy-summary-btn" onClick={() => {
                const text = [
                  `Cuemath Tutor Screening — ${name}`,
                  `Date: ${new Date().toLocaleDateString("en-IN")}`,
                  `Verdict: ${report.overall} | Score: ${avgScore}/10`,
                  ``,
                  `Summary: ${report.summary}`,
                  ``,
                  `Scores:`,
                  ...Object.entries(report.scores||{}).map(([k,v])=>`  ${k}: ${v}/10`),
                  ``,
                  `Recommendation: ${report.recommendation}`,
                ].join("\n");
                navigator.clipboard.writeText(text).then(() => {
                  const btn = document.getElementById("copy-summary-btn");
                  if(btn){ btn.textContent = "✓ Copied!"; setTimeout(()=>{ btn.textContent="📋 Copy Summary"; },2000); }
                });
              }} style={{
                background: "#fff", border: "1.5px solid #c7d2fe",
                color: C.indigo, padding: "13px 22px", borderRadius: 12,
                fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eef2ff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                📋 Copy Summary
              </button>

              <Link href="/dashboard" style={{
                padding: "13px 22px", borderRadius: 12,
                border: "1.5px solid #c7d2fe", background: "#eef2ff",
                color: C.indigo, fontWeight: 600, fontSize: 14,
                textDecoration: "none", transition: "all 0.2s",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                📊 View All Candidates
              </Link>

              <button id="new-interview-btn" onClick={resetAll} style={{
                background: "#fff", border: "1.5px solid #e5e7eb",
                color: "#374151", padding: "13px 24px", borderRadius: 12,
                fontWeight: 500, fontSize: 14, transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.indigo; e.currentTarget.style.color = C.indigo; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}>
                New Interview
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}
