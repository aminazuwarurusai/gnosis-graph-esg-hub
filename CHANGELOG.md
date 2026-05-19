# Changelog

All notable changes to the UNIMAS ISuRE Smart Campus ESG Dashboard.

---

## [Unreleased] — Pending AWS deployment (domain `esg.myurus` SSL cert not yet issued)

---

## 2026-05-19

### Improved
- **Dayang chatbot response quality**
  - Removed repeated greeting ("Hello! Dayang here") on every reply
  - Air quality response now answers with verdict first before supporting data
  - Increased Gemini `max_output_tokens` to 800 — prevents truncation on long answers
  - System prompt updated to enforce direct-answer format (verdict → data → recommendation)

### Changed
- Chatbot input placeholder updated to English: "Ask Dayang about ESG, energy, air quality..."

---

## 2026-05-18

### Security
- **Gemini API key moved server-side** — key never bundled in frontend JS
  - All Gemini calls proxied through FastAPI backend (`/api/chat`)
  - `GEMINI_API_KEY` stored in `.env` (no `VITE_` prefix, not accessible to browser)
  - `.env` added to `.gitignore`, `.env.example` provided as template
- **CORS hardened** — restricted to localhost origins (dev) and `https://esg.myurus` (prod)
- **Rate limiting** — 20 requests/minute per IP via slowapi on `/api/chat`
- **XSS fixed** in `presentation.html` and `campus-esg-intelligence-dashboard.html`
  - Added `escapeHtml()` helper applied to all user input before `innerHTML` insertion
- **Source maps disabled** in Vite production build (`build.sourcemap: false`)

### Added
- FastAPI backend (`backend/`) as secure Gemini proxy
  - `backend/main.py` — app entry point with CORS, rate limiting, dotenv
  - `backend/routers/chat.py` — `/api/chat` endpoint, keyword mock fallback, Gemini integration
  - `backend/requirements.txt` — `fastapi`, `uvicorn`, `google-genai`, `python-dotenv`, `slowapi`
- Vite dev proxy: `/api` → `http://localhost:8000` (no CORS issues in development)
- ESLint config, lint/test scripts in `package.json`

### Changed
- **Chatbot renamed Dayang** — all UI references updated (header, footer, placeholder, window title)
- Gemini model upgraded to `gemini-2.5-flash` (replaces deprecated `gemini-1.5-flash`)
- SDK migrated from `google.generativeai` (deprecated) to `google-genai` (`google.genai.Client`)

---

## 2026-05-17

### Added
- Exception-based KPI card colouring across all tabs
  - Alert Centre: Critical (red), Warning (orange), normal (white)
  - Waste: Full bins (red), Near full (orange)
  - Air Quality: AQI by severity band
  - Energy: Peak power and CO2 exception thresholds
  - Water & Soil: Warning states highlighted, normal stays white
- Domain-specific colours for ESG breakdown bars in Overview tab
- Campus map improvements in presentation HTML

### Changed
- Dashboard colour system refactored on UX colour psychology principles
  - Problem-first colouring: colour signals issues, white signals normal
  - Consistent red → orange → white severity scale across all tabs

---

## 2026-05-16

### Added
- Initial commit: UNIMAS ISuRE Smart Campus ESG Dashboard
  - 7-tab layout: Overview, Energy, Air Quality, Water, Waste, Soil, Alert Centre
  - React 18 + Vite + Tailwind CSS + Recharts
  - PapaParse CSV loading (8 CSVs loaded in parallel via `useAllData.js`)
  - Filter system (location, month, year)
  - ESG composite score: 75/100
  - Q1 2026 IoT sensor data
- Gemini AI chatbot sidebar (initial version, direct API call from frontend)
- Presentation HTML (`presentation.html`, `campus-esg-intelligence-dashboard.html`)

---

## Pending (before AWS deployment)

- [ ] Rotate Gemini API key — old key exposed; get new key from Google AI Studio, set HTTP Referrer restriction `https://esg.myurus/*`
- [ ] Issue SSL cert for `esg.myurus` in AWS ACM (us-east-1)
- [ ] S3 bucket — block all public access, serve via CloudFront OAC only
- [ ] CloudFront — HTTPS redirect, custom domain, SSL cert from ACM
- [ ] CloudFront Response Headers Policy — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
