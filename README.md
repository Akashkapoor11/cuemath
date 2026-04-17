#  Cuemath AI Tutor Screener

**Problem - The AI Tutor Screener**

> An end-to-end AI screening system that replaces 10-minute human phone screens with a structured voice interview, instant multi-dimensional assessment, and an HR dashboard for managing all candidates .

---
## (DESKTOP MODE RECOMMENDED)  ## Hr lock passward- 2408
## Live Demo
🔗 **[Deployment Link] - (https://cuemath-rho.vercel.app/)**

**[Video Walkthrough](https://loom.com/your-link)** 

---

## Example of getting mail after test 
<img width="1592" height="762" alt="Image" src="https://github.com/user-attachments/assets/bb148728-9bf2-4dbf-9a60-c40f27ba49f6" />

## What I Built

The product has two sides:

**Candidate-facing (`/`)**
A voice-first interview interface where a candidate enters their name, then speaks with **"Chitti"** - a warm, structured AI interviewer. Chitti asks 6 carefully chosen questions, adapts when an answer is too short, and closes naturally when done. The full transcript is then sent to a stronger AI model for deep analysis. The candidate sees a structured report in seconds - complete with dimension scores, strengths, concerns, and direct evidence quotes. Candidates who move forward get a confetti celebration.

**HR-facing (`/dashboard`)**
A persistent dashboard where Cuemath's recruiting team can review every completed interview - filter by verdict, sort by score, search by name, and expand any candidate for their full assessment. Ships with 3 realistic demo candidates so evaluators can see the full value immediately without completing a real interview.

---

## The Three Pages

| Route | Purpose |
|-------|---------|
| `/` | Candidate interview - voice or text |
| `/dashboard` | HR dashboard - all completed interviews |
| `/api/interview` | Serverless API - proxies to Groq, keeps key server-side |
| `/api/transcribe` | Fallback transcription API for non-Chrome browsers |
| `/api/send-email` | Email reporting system for candidate results |

---

<img width="1919" height="912" alt="Image" src="https://github.com/user-attachments/assets/ce97a88e-a8be-4f74-a864-6360dc9e11e7" />
<img width="1919" height="918" alt="Image" src="https://github.com/user-attachments/assets/5fe7c4e2-51c0-4998-bfa8-74f90503a032" />
Hr potal Display above (passward - 2408 )

## Key Technical Decisions & Tradeoffs

### 1. Two-model architecture - speed vs. depth
The interview conversation uses **`llama-3.3-70b-versatile`** via Groq (sub-second latency) so Chitti's replies feel instantaneous - like a real phone call. Assessment generation uses the same model with a stricter prompt and lower temperature so the HR report is thorough and evidence-backed.

Both stages use the same model (`llama-3.3-70b-versatile`) but with different parameters: `temperature: 0.75` for conversation (natural, warm replies) vs `temperature: 0.4` for assessment (consistent, evidence-backed scoring). The architecture is designed so the assessment prompt can be swapped to a larger model (e.g., llama-3.1-405b) with no code changes.

### 2. Browser Speech APIs - not server-side Whisper
Used the **Web Speech Recognition API** instead of streaming audio to a Whisper endpoint.

**Pros**: Zero latency (transcription runs parallel to speaking), zero server cost, no audio transmitted.  
**Cons**: Less accurate on heavy accents or noisy environments; Chrome-only for best results.

For a one-week demo, this is the right trade. For production: Whisper via a streaming WebSocket.

### 3. Six fixed questions, not fully adaptive
Fully dynamic interviews create assessment inconsistency - different candidates answer different questions, making scores incomparable across the cohort. Six fixed questions, each mapped to one assessment dimension, ensures every candidate is evaluated on the same rubric.

The model can still probe within each question if an answer is too short. That's adaptive enough without losing comparability.

### 4. Supabase for production data persistence
Completed interviews are stored in **Supabase PostgreSQL database** for production-ready data persistence. The system provides:
- Real-time synchronization across all devices
- HR dashboard reads from shared database
- Front page displays accurate candidate count from Supabase
- Fallback to localStorage if Supabase is unavailable
- Email integration for candidate result distribution

### 5. Mobile-first responsive design
The interface is fully responsive across all device sizes:
- CSS `clamp()` and `min()` functions for fluid typography and spacing
- Touch-optimized buttons with `clamp(44px, 6vh, 52px)` sizing
- Responsive ambient blobs that adapt to screen dimensions
- Media queries for breakpoints at 768px, 640px, 560px, 480px, and 360px
- Accessibility enhancements with ARIA labels and screen reader support

### 6. Calibrated assessment rubric in the prompt
The assessment system prompt includes an explicit scoring rubric (9–10 exceptional, 7–8 strong, 5–6 adequate…) and tells Claude to be *conservative* with high scores. Without this, Claude tends to give generic 7s across the board - the rubric makes scores meaningful and differentiated.

### 7. Demo seeding for evaluator UX
The dashboard seeds 3 realistic synthetic candidates on first visit. This matters: evaluators won't sit through a full interview before forming an impression of the product. Seeing a rich, populated HR dashboard immediately communicates the full value of the system.

### 8. No audio recording - by design
The app captures transcribed text only, not audio. Privacy-respecting (no audio leaves the browser) and simpler to deploy. A real production version would offer optional audio recording with explicit candidate consent, stored encrypted server-side.

---

<img width="1916" height="954" alt="Image" src="https://github.com/user-attachments/assets/9225b027-8058-414c-800a-0c0e166e4306" />

## Interesting Technical Challenges

### Voice synthesis race condition
`window.speechSynthesis.getVoices()` returns an empty array on the first call - voices load asynchronously after page load. This caused Chitti's voice to fall back to the browser default on the first message, sounding robotic.

**Fix**: Added an `onvoiceschanged` event handler that fires once when voices are ready, picks the preferred voice, then nullifies itself. Subsequent calls hit the cache directly.

### Stale closures in React
The `send` function was memoized with `useCallback` but referenced `callAPI`, which was recreated on every render. The closure captured the stale reference.

**Fix**: Moved `callAPI` to module scope - it only uses `fetch` and has no component dependencies. Now it's truly stable.

### Double-stop in voice recording
When `recognitionRef.current.stop()` is called, the browser fires `onend` in addition to the stop callback - triggering `stopRecording` twice. The second call would try to `send` an empty string.

**Fix**: Added an `isStoppingRef` boolean guard. The second invocation sees the flag is set and returns immediately.

### Elapsed time in async closure
The interview timer updates `elapsed` state every second. When the interview completes, `clearInterval` is called — but by the time `generateAssessment` runs (after a 2.8s delay), the `elapsed` value in the closure would be stale.

**Fix**: Maintained a parallel `elapsedRef` kept in sync via React's functional update form, giving the guaranteed current value at capture time.

### JSON extraction from the LLM
Despite prompt instructions, `llama-3.3-70b-versatile` occasionally wraps JSON in markdown code fences (` ```json `). A strict `JSON.parse` would throw, leaving the candidate on the generating screen forever.

**Fix**: Strip fences with `.replace(/```json|```/g, '').trim()` before parsing. Plus a complete fallback report object - so the app *always* renders a report, even if parsing fails.

### isSpeaking state for UI feedback
`isSpeakingRef` is a ref (not state) - perfect for preventing race conditions in async callbacks, but it doesn't trigger re-renders. The speaking indicator UI needs to update reactively.

**Fix**: Maintained both `isSpeakingRef` (for logic) and `setIsSpeaking` state (for UI). Both are updated in the `speak()` function's `onend`/`onerror` callbacks.

---

## File Structure

```
tutor-screener/
├── pages/
│   ├── _app.js          # Global CSS import
│   ├── index.js         # Candidate interview UI (welcome → interview → report)
│   ├── dashboard.js     # HR dashboard (reads Supabase + localStorage, seeds demo data)
│   └── api/
│       ├── interview.js # Serverless function — Groq API proxy
│       ├── transcribe.js # Fallback transcription API
│       └── send-email.js # Email reporting system
├── lib/
│   └── supabase.js      # Supabase client configuration
├── styles/
│   └── globals.css      # Keyframes, reset, scrollbar, utility classes, mobile responsive CSS
├── public/              # Static assets
├── next.config.js
├── vercel.json          # 30s timeout for API route
├── package.json
├── .gitignore           # Excludes .env.local, node_modules, .next
└── .env.local.example   # Template — copy to .env.local and add your keys
```

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 | Server API routes keep the key server-only; React for UI |
| AI - Interview | `llama-3.3-70b-versatile` via Groq | Sub-second latency essential for voice UX |
| AI - Assessment | `llama-3.3-70b-versatile` via Groq | Same model, lower temperature (0.4) for consistent HR reports |
| Voice Input | Web Speech API (SpeechRecognition) | Zero cost, zero latency, in-browser (Chrome recommended) |
| Voice Output | Web Speech API (SpeechSynthesis) | Chitti speaks back - real conversation feel |
| Database | Supabase PostgreSQL | Production-ready data persistence with real-time sync |
| Email | Nodemailer + Gmail API | Automated candidate result distribution |
| Deployment | Vercel | Serverless functions, free tier, 60-second deploy |
| Styling | CSS Modules + Responsive Design | Mobile-first approach with modern CSS functions |

---

## Security

- `GROQ_API_KEY` lives only in Vercel's server environment - **never** in the browser bundle
- All LLM calls go through `/api/interview` (Next.js serverless function)
- `.env.local` is in `.gitignore` and is never committed
- No candidate audio is recorded or transmitted
- Supabase database uses Row Level Security (RLS) for data protection
- HR dashboard is PIN-protected (2408) - candidates cannot access interviewer data
- Email credentials stored as environment variables, never in client code

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# AI Configuration
GROQ_API_KEY=your_groq_api_key_here

# Database Configuration  
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_specific_password

# Deployment URLs (optional)
NEXT_PUBLIC_BASE_URL=https://cuemath-rho.vercel.app
```

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from the example
copy .env.local.example .env.local
# Add your GROQ_API_KEY inside (get one free at console.groq.com)
# Add Supabase credentials (create free project at supabase.com)
# Add Gmail credentials for email functionality

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3000 in Chrome for the best voice experience
```

> **Chrome on desktop is required** for voice recognition. Firefox and Safari do not support the Web Speech API reliably. The app will display a clear warning and offer text-input fallback for non-Chrome users.

## Production Deployment

The project is configured for seamless deployment on Vercel:

1. Push to GitHub repository
2. Connect repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy automatically on every push

Current production deployment: https://cuemath-rho.vercel.app/

---

## Recent Updates & Improvements

- **Mobile Responsiveness**: Enhanced CSS with responsive breakpoints, touch-optimized buttons, and fluid typography using `clamp()` and `min()` functions
- **Supabase Integration**: Production database for persistent candidate data across all devices
- **Email Reporting**: Automated result distribution to candidates via Gmail API
- **Accessibility**: ARIA labels, screen reader support, and improved keyboard navigation
- **Front Page Sync**: Candidate count now matches HR portal database (fetches from Supabase)
- **Performance**: Optimized API calls and reduced bundle size for faster loading

---

## License

MIT License - see LICENSE file for details.
