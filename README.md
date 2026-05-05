# UNIMAS Smart Campus ESG Dashboard

**Client:** Universiti Malaysia Sarawak (UNIMAS) — ISuRE  
**Stack:** React 18 · Vite · Recharts · Tailwind CSS · PapaParse  
**Data period:** Q1 2026 (January – March)

---

## Quick Start

```bash
cd dashboard
npm install
npm run dev
```

Opens at **http://localhost:3000**

---

## Project Structure

```
dashboard/
├── public/
│   └── data/                   ← 8 CSV sensor files (served statically)
│       ├── UNIMAS_Energy_Expanded.csv
│       ├── UNIMAS_Air_Expanded.csv
│       ├── UNIMAS_Water_Expanded.csv
│       ├── UNIMAS_Waste_Expanded.csv
│       ├── UNIMAS_Soil_Moisture.csv
│       ├── UNIMAS_Alert_Center.csv
│       ├── UNIMAS_Smart_Grid.csv
│       └── UNIMAS_Location_Master.csv
├── src/
│   ├── config.js               ← ⭐ University config (name, colours, file paths)
│   ├── App.jsx                 ← Root component + tab router
│   ├── hooks/
│   │   └── useAllData.js       ← Loads all 8 CSVs (cached in memory)
│   ├── utils/
│   │   └── dataUtils.js        ← Pure data helpers (groupBy, avg, pivot…)
│   └── components/
│       ├── Header.jsx          ← Sticky header + live clock
│       ├── TabNav.jsx          ← 7-tab navigation bar
│       ├── KPICard.jsx         ← Reusable metric card
│       ├── ChartCard.jsx       ← Chart wrapper panel
│       ├── StatusBadge.jsx     ← Colour-coded status pill
│       ├── LoadingScreen.jsx   ← Loading / error state
│       └── tabs/
│           ├── Overview.jsx    ← ESG gauge · radar · KPIs · alerts summary
│           ├── Energy.jsx      ← kWh bars · smart grid · battery gauge
│           ├── AirQuality.jsx  ← AQI lines · PM2.5 · CO₂ · status donut
│           ├── Water.jsx       ← pH · turbidity · DO · conductivity
│           ├── Waste.jsx       ← Fill levels · bin temps · status
│           ├── Soil.jsx        ← Moisture trend · health pie · irrigation
│           └── AlertCentre.jsx ← Full log table · severity/status charts
```

---

## Deploying to Another University

1. **Edit `src/config.js`** — change `university.*`, `dashboard.period`, `esgScore.*`, and `csvFiles.*` keys.
2. **Replace CSV files** in `public/data/` with the new university's sensor exports.
3. Run `npm run build` → deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, IIS).

---

## Build for Production

```bash
npm run build     # outputs to dist/
npm run preview   # preview the production build locally
```

---

## Tech Versions

| Package     | Version |
|-------------|---------|
| React       | 18.x    |
| Vite        | 6.x     |
| Recharts    | 2.x     |
| Tailwind    | 3.x     |
| PapaParse   | 5.x     |
| Lucide React| 0.462   |
