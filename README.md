# 🎓 Cuemath AI Tutor Screener

**Problem 3 — The AI Tutor Screener**

> An end-to-end AI screening system that replaces 10-minute human phone screens with a structured voice interview, instant multi-dimensional assessment, and an HR dashboard for managing all candidates — built as a take-home challenge for Cuemath's 2nd round assessment.

---

## Live Demo
🔗 **[Live URL — add after deployment](https://your-app.vercel.app)**
📹 **[Video Walkthrough](https://loom.com/your-link)** (2–5 min)

---

## What I Built

The product has two sides:

**Candidate-facing (`/`)**
A voice-first interview interface where a candidate enters their name, then speaks with **"Priya"** — a warm, structured AI interviewer. Priya asks 6 carefully chosen questions, adapts when an answer is too short, and closes naturally when done. The full transcript is then sent to a stronger AI model for deep analysis. The candidate sees a structured report in seconds — complete with dimension scores, strengths, concerns, and direct evidence quotes. Candidates who move forward get a confetti celebration.

**HR-facing (`/dashboard`)**
A persistent dashboard where Cuemath's recruiting team can review every completed interview — filter by verdict, sort by score, search by name, and expand any candidate for their full assessment. Ships with 3 realistic demo candidates so evaluators can see the full value immediately without completing a real interview.

---

## The Three Pages

| Route | Purpose |
|-------|---------|
| `/` | Candidate interview — voice or text |
| `/dashboard` | HR dashboard — all completed interviews |
| `/api/interview` | Serverless API — proxies to Groq, keeps key server-side |

---

## Key Technical Decisions & Tradeoffs

### 1. Two-model architecture — speed vs. depth
The interview conversation uses **`llama-3.3-70b-versatile`** via Groq (sub-second latency) so Chitti's replies feel instantaneous — like a real phone call. Assessment generation uses the same model with a stricter prompt and lower temperature so the HR report is thorough and evidence-backed.

Both stages use the same model (`llama-3.3-70b-versatile`) but with different parameters: `temperature: 0.75` for conversation (natural, warm replies) vs `temperature: 0.4` for assessment (consistent, evidence-backed scoring). The architecture is designed so the assessment prompt can be swapped to a larger model (e.g., llama-3.1-405b) with no code changes.

### 2. Browser Speech APIs — not server-side Whisper
Used the **Web Speech Recognition API** instead of streaming audio to a Whisper endpoint.

**Pros**: Zero latency (transcription runs parallel to speaking), zero server cost, no audio transmitted.  
**Cons**: Less accurate on heavy accents or noisy environments; Chrome-only for best results.

For a one-week demo, this is the right trade. For production: Whisper via a streaming WebSocket.

### 3. Six fixed questions, not fully adaptive
Fully dynamic interviews create assessment inconsistency — different candidates answer different questions, making scores incomparable across the cohort. Six fixed questions, each mapped to one assessment dimension, ensures every candidate is evaluated on the same rubric.

The model can still probe within each question if an answer is too short. That's adaptive enough without losing comparability.

### 4. localStorage persistence — demo-appropriate
Rather than spinning up Postgres for a one-week prototype, completed interviews are stored in `localStorage`. The HR dashboard reads this immediately, with no backend setup.

**Tradeoff**: Data is device-local and doesn't survive a browser clear. For production: Supabase or PlanetScale with a simple `interviews` table, JWT auth for the dashboard route.

### 5. Calibrated assessment rubric in the prompt
The assessment system prompt includes an explicit scoring rubric (9–10 exceptional, 7–8 strong, 5–6 adequate…) and tells Claude to be *conservative* with high scores. Without this, Claude tends to give generic 7s across the board — the rubric makes scores meaningful and differentiated.

### 6. Demo seeding for evaluator UX
The dashboard seeds 3 realistic synthetic candidates on first visit. This matters: evaluators won't sit through a full interview before forming an impression of the product. Seeing a rich, populated HR dashboard immediately communicates the full value of the system.

### 7. No audio recording — by design
The app captures transcribed text only, not audio. Privacy-respecting (no audio leaves the browser) and simpler to deploy. A real production version would offer optional audio recording with explicit candidate consent, stored encrypted server-side.

---

## What I'd Add With More Time

1. **Auth for the dashboard** — The `/dashboard` route should require a Cuemath HR login. A candidate shouldn't be able to open it.
2. **Webhook on "Move Forward"** — Auto-push advancing candidates to an ATS (Greenhouse, Lever) via a serverless function.
3. **Multi-language support** — Many Cuemath tutors aren't English-native. An interview mode in Hindi or Tamil would significantly expand the candidate pool.
4. **Calibration mode** — HR shows the system 20 real interviews they've manually scored. Claude uses those as few-shot examples, making future scores match the company's actual bar.
5. **Server-side Whisper** — Streaming audio → Whisper API for better transcription on accented speech and noisy environments.
6. **Question bank** — Different question sets for math tutors, reading tutors, test-prep specialists — each mapped to dimension-specific rubrics.
7. **Candidate consent flow** — GDPR-compliant consent screen, explicit data retention policy, one-click data deletion.

---

## Interesting Technical Challenges

### Voice synthesis race condition
`window.speechSynthesis.getVoices()` returns an empty array on the first call — voices load asynchronously after page load. This caused Chitti's voice to fall back to the browser default on the first message, sounding robotic.

**Fix**: Added an `onvoiceschanged` event handler that fires once when voices are ready, picks the preferred voice, then nullifies itself. Subsequent calls hit the cache directly.

### Stale closures in React
The `send` function was memoized with `useCallback` but referenced `callAPI`, which was recreated on every render. The closure captured the stale reference.

**Fix**: Moved `callAPI` to module scope — it only uses `fetch` and has no component dependencies. Now it's truly stable.

### Double-stop in voice recording
When `recognitionRef.current.stop()` is called, the browser fires `onend` in addition to the stop callback — triggering `stopRecording` twice. The second call would try to `send` an empty string.

**Fix**: Added an `isStoppingRef` boolean guard. The second invocation sees the flag is set and returns immediately.

### Elapsed time in async closure
The interview timer updates `elapsed` state every second. When the interview completes, `clearInterval` is called — but by the time `generateAssessment` runs (after a 2.8s delay), the `elapsed` value in the closure would be stale.

**Fix**: Maintained a parallel `elapsedRef` kept in sync via React's functional update form, giving the guaranteed current value at capture time.

### JSON extraction from the LLM
Despite prompt instructions, `llama-3.3-70b-versatile` occasionally wraps JSON in markdown code fences (` ```json `). A strict `JSON.parse` would throw, leaving the candidate on the generating screen forever.

**Fix**: Strip fences with `.replace(/```json|```/g, '').trim()` before parsing. Plus a complete fallback report object — so the app *always* renders a report, even if parsing fails.

### isSpeaking state for UI feedback
`isSpeakingRef` is a ref (not state) — perfect for preventing race conditions in async callbacks, but it doesn't trigger re-renders. The speaking indicator UI needs to update reactively.

**Fix**: Maintained both `isSpeakingRef` (for logic) and `setIsSpeaking` state (for UI). Both are updated in the `speak()` function's `onend`/`onerror` callbacks.

---

## File Structure

```
tutor-screener/
├── pages/
│   ├── _app.js          # Global CSS import
│   ├── index.js         # Candidate interview UI (welcome → interview → report)
│   ├── dashboard.js     # HR dashboard (reads localStorage, seeds demo data)
│   └── api/
│       └── interview.js # Serverless function — Groq API proxy
├── styles/
│   └── globals.css      # Keyframes, reset, scrollbar, utility classes
├── next.config.js
├── vercel.json          # 30s timeout for API route
├── package.json
├── .gitignore           # Excludes .env.local, node_modules, .next
└── .env.local.example   # Template — copy to .env.local and add your key
```

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 | Server API routes keep the key server-only; React for UI |
| AI — Interview | `llama-3.3-70b-versatile` via Groq | Sub-second latency essential for voice UX |
| AI — Assessment | `llama-3.3-70b-versatile` via Groq | Same model, lower temperature (0.4) for consistent HR reports |
| Voice Input | Web Speech API (SpeechRecognition) | Zero cost, zero latency, in-browser (Chrome recommended) |
| Voice Output | Web Speech API (SpeechSynthesis) | Chitti speaks back — real conversation feel |
| Persistence | localStorage | No DB needed for demo; trivial to swap for Postgres |
| Deployment | Vercel | Serverless functions, free tier, 60-second deploy |

---

## Security

- `GROQ_API_KEY` lives only in Vercel's server environment — **never** in the browser bundle
- All LLM calls go through `/api/interview` (Next.js serverless function)
- `.env.local` is in `.gitignore` and is never committed
- No candidate audio is recorded or transmitted
- localStorage data never leaves the user's device
- HR dashboard is PIN-protected — candidates cannot access interviewer data

---

## Deploy in 5 Minutes

### 1. Test locally first
```bash
# Install dependencies (if not already done)
npm install

# Create .env.local from the example
copy .env.local.example .env.local
# → Open .env.local and replace your-groq-key-here with your real key from console.groq.com

# Start dev server
npm run dev

# Open http://localhost:3000
```

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "feat: Cuemath AI Tutor Screener — Problem 3"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cuemath-tutor-screener.git
git push -u origin main
```

### 3. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **Add New Project** → import your repo
3. Under **Environment Variables**, add:
   - Key: `GROQ_API_KEY`
   - Value: your key from [console.groq.com](https://console.groq.com)
4. Click **Deploy** — live in ~60 seconds

### 4. Update this README
Replace the Live Demo URL above with your actual Vercel URL.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from the example
copy .env.local.example .env.local
# Add your GROQ_API_KEY inside (get one free at console.groq.com)

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3000 in Chrome for the best voice experience
```

> **Chrome on desktop is required** for voice recognition. Firefox and Safari do not support the Web Speech API reliably. The app will display a clear warning and offer text-input fallback for non-Chrome users.
