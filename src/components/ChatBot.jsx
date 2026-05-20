import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import config from '../config'
import { avg, countBy, filterAlerts, filterRows, fmt, groupBy, round, aggregateByMonth } from '../utils/dataUtils'

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || '/api/chat'


const topBy = (rows, key, valueKey, mode = 'sum') => {
  const totals = {}
  ;(rows || []).forEach(row => {
    const group = row[key]
    if (!group) return
    totals[group] = totals[group] || []
    totals[group].push(Number(row[valueKey]) || 0)
  })
  return Object.entries(totals)
    .map(([name, values]) => ({
      name,
      value: mode === 'avg' ? avg(values) : values.reduce((sum, value) => sum + value, 0),
    }))
    .sort((a, b) => b.value - a.value)[0]
}

const pctOf = (count, total) => total ? round((count / total) * 100, 1) : 0
const formulaText = formula =>
  (formula || []).map(item => `${item.weight}% ${item.metric}`).join('; ')

const latestForLocation = (rows, locKey, locName) => {
  const matches = (rows || []).filter(row => row[locKey] === locName)
  if (!matches.length) return null
  return matches.reduce((latest, row) => String(latest.Date || '') > String(row.Date || '') ? latest : row)
}

const mapLocationNames = data => {
  const fromMaster = (data?.locations || []).map(row => row.Building).filter(Boolean)
  const fromData = [
    ...(data?.air || []).map(row => row.Location),
    ...(data?.energy || []).map(row => row.Building),
    ...(data?.water || []).map(row => row.Location),
    ...(data?.waste || []).map(row => row.Location),
    ...(data?.soil || []).map(row => row.Location),
    ...(data?.alerts || []).map(row => row.Location),
  ].filter(Boolean)
  return [...new Set([...fromMaster, ...fromData])]
}

const isRecoveredWasteAlert = (alert, latestWaste) => {
  const type = String(alert?.Incident_Type || '').toLowerCase()
  return type.includes('waste') && type.includes('full') && latestWaste?.Status === 'OK'
}

function buildMapContext(data) {
  return mapLocationNames(data).map(name => {
    const air = latestForLocation(data?.air, 'Location', name)
    const energy = latestForLocation(data?.energy, 'Building', name)
    const water = latestForLocation(data?.water, 'Location', name)
    const waste = latestForLocation(data?.waste, 'Location', name)
    const soil = latestForLocation(data?.soil, 'Location', name)
    const activeAlerts = (data?.alerts || [])
      .filter(alert =>
        alert.Location === name &&
        alert.Status !== 'Resolved' &&
        !isRecoveredWasteAlert(alert, waste)
      )
      .map(alert => `${alert.Incident_Type} (${alert.Severity}, ${alert.Status})`)

    const parts = [
      air ? `AQI ${air.AQI}, PM2.5 ${air['PM2.5']} ug/m3, air ${air.Status}` : null,
      energy ? `energy load ${energy.Power_kW} kW, energy ${energy.Status}` : null,
      water ? `water pH ${water.pH}, water ${water.Status}` : null,
      waste ? `bin fill ${waste.Fill_Level}%, waste ${waste.Status}` : null,
      soil ? `soil moisture ${soil.Moisture_Percentage}%, soil ${soil.Health_Status}` : null,
      activeAlerts.length ? `active alerts: ${activeAlerts.join('; ')}` : 'active alerts: none',
    ].filter(Boolean)

    return `${name}: ${parts.join('; ')}`
  }).join('\n')
}

function buildDashboardContext(data, filters) {
  const scoring = config.esgScoring || {}
  const activeFilters = `location=${filters?.location || 'All'}, month=${filters?.month || 'All'}`

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const energyRows = filterRows(data?.energy    || [], filters, 'Building', 'Date')
  const airRows    = filterRows(data?.air        || [], filters, 'Location', 'Date')
  const waterRows  = filterRows(data?.water      || [], filters, 'Location', 'Date')
  const wasteRows  = filterRows(data?.waste      || [], filters, 'Location', 'Date')
  const soilRows   = filterRows(data?.soil       || [], filters, 'Location', 'Date')
  const gridRows   = filterRows(data?.smartGrid  || [], filters, null,       'Date')
  const alertRows  = filterAlerts(data?.alerts   || [], filters)

  // Helper: extract numeric column values
  const nums = (rows, col) => rows.map(r => Number(r[col])).filter(v => !isNaN(v) && v !== null)

  // Per-location aggregation helper
  const byLocAvg = (rows, locKey, col, dp = 1) =>
    Object.entries(groupBy(rows, locKey))
      .map(([loc, rs]) => `${loc}: ${round(avg(nums(rs, col)), dp)}`)
      .join(', ')

  // ── Energy ────────────────────────────────────────────────────────────────
  const totalKWh    = Math.round(energyRows.reduce((s, r) => s + (Number(r.Energy_kWh) || 0), 0))
  const avgPowerKW  = round(avg(nums(energyRows, 'Power_kW')), 1)
  const kwhByBldg   = Object.entries(groupBy(energyRows, 'Building'))
    .map(([b, rs]) => `${b}: ${fmt(Math.round(rs.reduce((s, r) => s + (Number(r.Energy_kWh) || 0), 0)))} kWh`)
    .join(' | ')

  // ── Smart Grid ───────────────────────────────────────────────────────────
  const solar      = gridRows.reduce((s, r) => s + (Number(r.Solar_PV_MWh) || 0), 0)
  const gridImport = gridRows.reduce((s, r) => s + (Number(r.Grid_Intake_MWh) || 0), 0)
  const solarShare = solar + gridImport > 0 ? round((solar / (solar + gridImport)) * 100, 1) : null
  const gridEff    = nums(gridRows, 'Efficiency_Rate').length
    ? round(avg(nums(gridRows, 'Efficiency_Rate')) * 100, 1) : null

  // ── Monthly helpers ───────────────────────────────────────────────────────
  const monthlyAvg = (rows, dateKey, col, dp = 1) => {
    const MON = { 1: 'Jan', 2: 'Feb', 3: 'Mar' }
    const byMonth = groupBy(rows, r => {
      const m = String(r[dateKey] || '').split('-')[1]
      return m ? parseInt(m, 10) : null
    })
    return [1, 2, 3].map(m => {
      const rs = byMonth[m] || []
      const vals = nums(rs, col)
      return vals.length ? `${MON[m]}: ${round(avg(vals), dp)}` : null
    }).filter(Boolean).join(', ')
  }

  // ── Air Quality ───────────────────────────────────────────────────────────
  const avgAQI   = airRows.length ? round(avg(nums(airRows, 'AQI')),      1) : null
  const avgPM25  = airRows.length ? round(avg(nums(airRows, 'PM2.5')),    1) : null
  const avgCO2   = airRows.length ? round(avg(nums(airRows, 'CO2')),      0) : null
  const avgTemp  = airRows.length ? round(avg(nums(airRows, 'Temp')),     1) : null
  const avgHumid = airRows.length ? round(avg(nums(airRows, 'Humidity')), 1) : null
  const airStatus = countBy(airRows, 'Status')
  const aqiByLoc  = Object.entries(groupBy(airRows, 'Location'))
    .map(([loc, rs]) =>
      `${loc} — AQI ${round(avg(nums(rs, 'AQI')), 1)}, PM2.5 ${round(avg(nums(rs, 'PM2.5')), 1)} µg/m³, CO2 ${round(avg(nums(rs, 'CO2')), 0)} ppm, Temp ${round(avg(nums(rs, 'Temp')), 1)}°C, Humidity ${round(avg(nums(rs, 'Humidity')), 1)}%`)
    .join(' | ')

  // ── Water ─────────────────────────────────────────────────────────────────
  const waterStatus  = countBy(waterRows, 'Status')
  const waterAvgPH   = waterRows.length ? round(avg(nums(waterRows, 'pH')),          2) : null
  const waterAvgCond = waterRows.length ? round(avg(nums(waterRows, 'Conductivity')), 0) : null
  const waterAvgTurb = waterRows.length ? round(avg(nums(waterRows, 'Turbidity')),   2) : null
  const waterAvgDO   = waterRows.length ? round(avg(nums(waterRows, 'DO')),          2) : null
  const waterByLoc   = Object.entries(groupBy(waterRows, 'Location'))
    .map(([loc, rs]) =>
      `${loc} — pH ${round(avg(nums(rs, 'pH')), 2)}, Conductivity ${round(avg(nums(rs, 'Conductivity')), 0)} µS/cm, Turbidity ${round(avg(nums(rs, 'Turbidity')), 2)} NTU, DO ${round(avg(nums(rs, 'DO')), 2)} mg/L`)
    .join(' | ')

  // ── Waste ─────────────────────────────────────────────────────────────────
  const wasteStatus  = countBy(wasteRows, 'Status')
  const avgFill      = wasteRows.length ? round(avg(nums(wasteRows, 'Fill_Level')), 1) : null
  const avgWeight    = wasteRows.length ? round(avg(nums(wasteRows, 'Weight')),     1) : null
  const avgBinTemp   = wasteRows.length ? round(avg(nums(wasteRows, 'Temp')),       1) : null
  const fillByLoc    = byLocAvg(wasteRows, 'Location', 'Fill_Level')

  // ── Soil ──────────────────────────────────────────────────────────────────
  const soilHealth   = countBy(soilRows, 'Health_Status')
  const irrigStatus  = countBy(soilRows, 'Irrigation_Status')
  const avgMoisture  = soilRows.length ? round(avg(nums(soilRows, 'Moisture_Percentage')), 1) : null
  const moistByLoc   = byLocAvg(soilRows, 'Location', 'Moisture_Percentage')

  // ── Alerts ────────────────────────────────────────────────────────────────
  const activeAlerts   = alertRows.filter(r => r.Status !== 'Resolved')
  const activeSeverity = countBy(activeAlerts, 'Severity')
  const allActiveList  = activeAlerts
    .map(r => `${r.Incident_Type} at ${r.Location} (${r.Severity}, ${r.Status})`)
    .join(' | ') || 'none'

  const mapContext = buildMapContext(data)

  return `You are Dayang, a professional ESG assistant for ${config.university.shortName} ${config.dashboard.title}. Powered by URUS AI SDN BHD. Your name is Dayang. Understand English, Bahasa Malaysia, and Sarawak Malay dialect. When the user writes in Sarawak dialect, respond naturally in light Sarawak Malay while staying clear, respectful, and suitable for stakeholder demos. Do not overuse slang. Never start your reply with your name or a greeting like "Hello", "Hi", "Dayang here", or "I am Dayang" — go straight to answering the question. Always answer the question directly first (e.g. "Yes, it is safe" or "No, it is not") before providing supporting data or explanation.

Use ONLY the current dashboard data summary below. If data is missing for the selected filter, say that the current dashboard selection has no data for that metric.
Current dashboard filters: ${activeFilters}
Dashboard period: ${config.dashboard.period}
ESG scores: composite ${config.esgScore.composite}/100, energy ${config.esgScore.energy}, air ${config.esgScore.air}, water ${config.esgScore.water}, waste ${config.esgScore.waste}, soil ${config.esgScore.soil}.
ESG scoring note: ${scoring.note || 'Scoring methodology is configured separately from raw dashboard data.'}
Composite formula: ${formulaText(scoring.composite?.formula)}. ${scoring.composite?.explanation || ''}
Energy formula: ${formulaText(scoring.energy?.formula)}. Basis: ${(scoring.energy?.methodology || []).join('; ')}. ${scoring.energy?.explanation || ''}
Air formula: ${formulaText(scoring.air?.formula)}. Basis: ${(scoring.air?.methodology || []).join('; ')}. ${scoring.air?.explanation || ''}
Water formula: ${formulaText(scoring.water?.formula)}. Basis: ${(scoring.water?.methodology || []).join('; ')}. ${scoring.water?.explanation || ''}
Waste formula: ${formulaText(scoring.waste?.formula)}. Basis: ${(scoring.waste?.methodology || []).join('; ')}. ${scoring.waste?.explanation || ''}
Soil formula: ${formulaText(scoring.soil?.formula)}. Basis: ${(scoring.soil?.methodology || []).join('; ')}. ${scoring.soil?.explanation || ''}

=== ENERGY (${energyRows.length} rows) ===
Total: ${fmt(totalKWh)} kWh | Avg power: ${avgPowerKW ?? 'no data'} kW
Per building: ${kwhByBldg || 'no data'}

=== SMART GRID (${gridRows.length} rows) ===
Solar: ${fmt(Math.round(solar))} MWh (${solarShare ?? 'no data'}% of total) | Grid import: ${fmt(Math.round(gridImport))} MWh | Grid efficiency: ${gridEff ?? 'no data'}%

=== AIR QUALITY (${airRows.length} rows) ===
Campus avg — AQI: ${avgAQI ?? 'no data'} | PM2.5: ${avgPM25 ?? 'no data'} µg/m³ | CO2: ${avgCO2 ?? 'no data'} ppm | Temp: ${avgTemp ?? 'no data'}°C | Humidity: ${avgHumid ?? 'no data'}%
Status breakdown: Good ${airStatus.Good || 0} | Moderate ${airStatus.Moderate || 0} | Unhealthy ${airStatus.Unhealthy || 0}
Monthly AQI trend: ${monthlyAvg(airRows, 'Date', 'AQI')}
Monthly PM2.5 trend: ${monthlyAvg(airRows, 'Date', 'PM2.5')}
Monthly CO2 trend: ${monthlyAvg(airRows, 'Date', 'CO2', 0)} ppm
Per location: ${aqiByLoc || 'no data'}

=== WATER QUALITY (${waterRows.length} rows) ===
Campus avg — pH: ${waterAvgPH ?? 'no data'} | Conductivity: ${waterAvgCond ?? 'no data'} µS/cm | Turbidity: ${waterAvgTurb ?? 'no data'} NTU | DO: ${waterAvgDO ?? 'no data'} mg/L
Status: Normal ${waterStatus.Normal || 0} (${pctOf(waterStatus.Normal || 0, waterRows.length)}%) | Warning ${waterStatus.Warning || 0} | Critical ${waterStatus.Critical || 0}
Monthly trends & per-location breakdown:
${Object.entries(groupBy(waterRows, 'Location')).map(([loc, rs]) =>
  `${loc} — pH: ${monthlyAvg(rs, 'Date', 'pH', 2)} | Conductivity: ${monthlyAvg(rs, 'Date', 'Conductivity', 0)} µS/cm | Turbidity: ${monthlyAvg(rs, 'Date', 'Turbidity', 2)} NTU | DO: ${monthlyAvg(rs, 'Date', 'DO', 2)} mg/L`
).join('\n') || 'no data'}

=== WASTE MANAGEMENT (${wasteRows.length} rows) ===
Campus avg — Fill: ${avgFill ?? 'no data'}% | Weight: ${avgWeight ?? 'no data'} kg | Bin temp: ${avgBinTemp ?? 'no data'}°C
Status: OK ${wasteStatus.OK || 0} | Near Full ${wasteStatus['Near Full'] || 0} | Full ${wasteStatus.Full || 0}
Monthly fill trend: ${monthlyAvg(wasteRows, 'Date', 'Fill_Level')}%
Fill by location: ${fillByLoc || 'no data'}

=== SOIL HEALTH (${soilRows.length} rows) ===
Avg moisture: ${avgMoisture ?? 'no data'}%
Health status: Normal ${soilHealth.Normal || 0} | Wet ${soilHealth.Wet || 0} | Dry ${soilHealth.Dry || 0}
Irrigation: Active ${irrigStatus.Active || 0} | Idle ${irrigStatus.Idle || 0} | Off ${irrigStatus.Off || 0}
Monthly moisture trend: ${monthlyAvg(soilRows, 'Date', 'Moisture_Percentage')}%
Moisture by location: ${moistByLoc || 'no data'}

=== ALERTS (${alertRows.length} total) ===
Active: ${activeAlerts.length} (Critical: ${activeSeverity.Critical || 0}, Warning: ${activeSeverity.Warning || 0}) | Resolved: ${alertRows.length - activeAlerts.length}
All active alerts: ${allActiveList}

=== CAMPUS MAP (latest reading per location) ===
${mapContext || 'No map data available.'}

Rules: Answer concisely, max 150 words. Reply in the same language as the user. Do not invent data outside this summary.`
}
async function callBackendChat(userMsg, chatHistory, dashboardContext) {
  const history = chatHistory.slice(-6).map(msg => ({
    role: msg.role === 'bot' ? 'assistant' : 'user',
    text: msg.text,
  }))
  const payload = {
    message: userMsg,
    history,
    dashboardContext,
  }
  const res = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Chat API failed (${res.status})`)
  const data = await res.json()
  if (!data?.reply) throw new Error('Chat API returned empty reply')
  return data.reply
}

// â”€â”€â”€ Mock response fallback (used if Gemini API fails) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESPONSES = {
  greeting: `Hello! I am Dayang, your UNIMAS Smart Campus ESG Assistant.

I can help you understand your dashboard data, explain ESG metrics, and suggest improvements.

What would you like to know?`,

  esg: `Our current ESG Score is 75/100.

This is calculated from:
- Energy Efficiency: 78/100 (Grid eff. 96.4%)
- Air Quality: 72/100 (AQI 78 - Moderate)
- Water Quality: 70/100 (68.3% normal)
- Waste Management: 68/100 (63% fill level)
- Soil Health: 82/100

Main area to improve: increase Solar share from 24.7% to 30% target.`,

  air: `Air quality is **mostly safe** for the general public, but at a Moderate level that warrants caution.

Average AQI: 78.0 (Moderate, 51–100 range) — acceptable for most people, but sensitive groups such as those with asthma or respiratory conditions should limit prolonged outdoor exposure.

Monthly trend:
- January: 74.0 (Good to Moderate)
- February: 77.8 (Moderate)
- March: 82.2 (Moderate - rising)

Recommendation: Monitor March trend closely. Engineering Faculty and Cafeteria show the highest readings.`,

  energy: `Total energy used Q1 2026: 364,484 kWh

By building:
- Engineering Faculty: 124,686 kWh (highest)
- Colleges: 122,629 kWh
- Admin Block: 117,169 kWh

Solar share: 24.7% - below 30% target
Grid efficiency: 96.4% (good)

Recommendation: Increase solar panel capacity to close the 5.3% gap to target.`,

  alert: `There are 12 active alerts:

4 Critical:
- Gas Leak - Admin Block
- Critical pH Level - Campus Lake
- Power Surge - Colleges
- Low Dissolved Oxygen - Campus Lake

8 Warning: Various locations

Please check the Alert Centre tab for full details and response status.`,

  water: `Water quality overview (Campus Lake only):

Status: 68.3% Normal, 31.7% Warning
pH range: 6.2 - 8.4 (variable - ideal: 6.5-8.5)
Avg Dissolved Oxygen: 7.2 mg/L (adequate, target >= 6)

2 critical pH alerts detected at Campus Lake.

Recommendation: Increase monitoring frequency and investigate pH fluctuation sources.`,

  waste: `Waste bin fill levels:

By location:
- Cafeteria: 65.9% full (needs attention)
- Colleges: 63.9% full
- Engineering Faculty: 59.1% full

Status summary:
- 51 bins Full (>=90%)
- 46 bins Near Full (70-89%)

Recommendation: Increase collection frequency at Cafeteria - highest fill rate on campus.`,

  carbon: `Estimated Carbon Footprint Q1 2026:

364,484 kWh x 0.585 kgCO2/kWh = approximately 213 tonnes CO2

This is Scope 2 emission (purchased electricity).

To reduce carbon footprint:
- Increase solar usage (current gap: 5.3% to target)
- Implement energy-saving measures in peak hours
- Consider LED upgrade for Engineering Faculty`,

  improve: `Top 3 recommendations to improve ESG score:

1. Increase solar panel capacity
   Current: 24.7% to Target: 30%
   Impact: +3-5 ESG points

2. Fix water quality at Campus Lake
   31.7% warning readings detected
   Impact: +2-4 ESG points

3. Increase waste collection at Cafeteria
   65.9% fill level - highest on campus
   Impact: +1-2 ESG points`,

  bm: `Hai! Saya Pembantu ESG Kampus Pintar UNIMAS.

Saya boleh menjawab soalan anda dalam Bahasa Malaysia.

Sila tanya tentang:
- Skor ESG kampus
- Kualiti udara (AQI)
- Penggunaan tenaga elektrik
- Kualiti air tasik
- Status tong sampah
- Amaran aktif

Apa yang anda ingin tahu?`,

  fallback: `Thank you for your question!

I can help you with information about:
Energy | Air Quality | Water | Waste | Soil | Alerts | ESG Score

Please try asking about any of these topics, or click one of the quick reply buttons below.`,
}

const QUICK_REPLIES = [
  'What is our ESG Score?',
  'Is air quality safe?',
  'Which building uses most energy?',
  'Any critical alerts?',
  'How to improve ESG score?',
  'Soal dalam Bahasa Malaysia',
]

function getMockResponse(msg) {
  const m = msg.toLowerCase()
  if (m.includes('esg') || m.includes('score') || m.includes('skor') || m.includes('composite'))
    return RESPONSES.esg
  if (m.includes('aqi') || m.includes('air quality') || m.includes('udara') || m.includes('pm2') || m.includes('pollution'))
    return RESPONSES.air
  if (m.includes('energy') || m.includes('tenaga') || m.includes('elektrik') || m.includes('power') || m.includes('solar') || m.includes('kwh') ||
      m.includes('build') || m.includes('bangunan') || m.includes('guna') || m.includes('tinggi') || m.includes('banyak') || m.includes('terus') || m.includes('terbanyak'))
    return RESPONSES.energy
  if (m.includes('alert') || m.includes('amaran') || m.includes('critical') || m.includes('warning') || m.includes('incident') || m.includes('bahaya'))
    return RESPONSES.alert
  if (m.includes('water') || m.includes('ph') || m.includes('lake') || m.includes('tasik') || m.includes('dissolved') || m.includes('turbid') || m.includes('conductivity') || m.includes('konduktiviti') || m.includes('do ') || m.includes('kualiti air'))
    return RESPONSES.water
  if (m.includes('waste') || m.includes('sisa') || m.includes('bin') || m.includes('sampah') || m.includes('fill') || m.includes('cafeteria') || m.includes('tong'))
    return RESPONSES.waste
  if (m.includes('carbon') || m.includes('co2') || m.includes('karbon') || m.includes('emission') || m.includes('footprint'))
    return RESPONSES.carbon
  if (m.includes('improve') || m.includes('baik') || m.includes('tingkat') || m.includes('recommendation') || m.includes('cadangan'))
    return RESPONSES.improve
  if (m.includes('bahasa') || m.includes('malaysia') || m.includes('melayu') || m.includes('bm') || m.includes('soal'))
    return RESPONSES.bm
  return RESPONSES.fallback
}

// â”€â”€â”€ Simple Markdown renderer (bold, bullets, line breaks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderMarkdown(text) {
  return text.split('\n').map((line, i) => {
    const bulletMatch = line.match(/^\s*(?:[-*•]|\d+[.)])\s+/)
    const isBullet = Boolean(bulletMatch)
    const content = isBullet ? line.slice(bulletMatch[0].length) : line

    // Convert **bold** to <strong>
    const parts = content.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part
    )

    return (
      <span key={i} className={`block ${isBullet ? 'pl-3' : ''}`}>
        {isBullet ? <>{'- '}{parts}</> : parts}
      </span>
    )
  })
}

// â”€â”€â”€ Typing indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-gray-500"
        style={{ animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
)

// â”€â”€â”€ Message bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Bubble = ({ msg }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <Bot size={13} className="text-emerald-400" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
          isUser
            ? 'bg-emerald-500 text-white rounded-tr-sm'
            : 'bg-[#1E293B] text-gray-200 rounded-tl-sm border border-[#334155]'
        }`}
      >
        {isUser ? msg.text : renderMarkdown(msg.text)}
      </div>
    </div>
  )
}

// â”€â”€â”€ Main ChatBot component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChatBot = ({ data, filters }) => {
  const [isOpen,         setIsOpen]         = useState(false)
  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState('')
  const [isTyping,       setIsTyping]       = useState(false)
  const [showQuickReply, setShowQuickReply] = useState(true)
  const [hasOpened,      setHasOpened]      = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Recompute only when data or filters change, not on every message send
  const dashboardContext = useMemo(
    () => buildDashboardContext(data, filters),
    [data, filters]
  )

  // Auto-scroll on new messages or typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Show greeting on first open
  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true)
      setMessages([{ id: Date.now(), role: 'bot', text: RESPONSES.greeting }])
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, hasOpened])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    // Add user message â€” keep last 10
    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMsg].slice(-10))
    setInput('')
    setShowQuickReply(false)
    setIsTyping(true)

    let reply
    try {
      reply = await callBackendChat(trimmed, messages, dashboardContext)
    } catch (err) {
      console.error('[Chat API error]', err?.message || err)
      reply = `I'm having trouble reaching the chat service right now.\n\nLocal response:\n${getMockResponse(trimmed)}`
    }

    setIsTyping(false)
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: reply }].slice(-10))
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <>
      {/* â”€â”€ Sliding panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`fixed bottom-0 right-0 z-[2000] flex flex-col bg-[#111827] border-l border-t border-[#1E293B] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 380, height: '100dvh', maxHeight: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1E293B] bg-[#0A0F1E] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Bot size={15} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dayang</p>
              <p className="text-[10px] text-emerald-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />Online</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot size={13} className="text-emerald-400" />
              </div>
              <div className="bg-[#1E293B] border border-[#334155] rounded-2xl rounded-tl-sm">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        {showQuickReply && !isTyping && (
          <div className="px-3 pb-2 flex-shrink-0">
            <p className="text-[10px] text-gray-600 mb-2 px-1">Quick questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-2.5 py-1 rounded-full text-[11px] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-3 py-3 border-t border-[#1E293B] flex-shrink-0">
          <div className="flex items-center gap-2 bg-[#0A0F1E] border border-[#1E293B] rounded-xl px-3 py-2 focus-within:border-emerald-500/40 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Dayang about ESG, energy, air quality..."
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none"
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="p-1.5 rounded-lg bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors flex-shrink-0"
            >
              <Send size={13} />
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[9px] text-gray-700 mt-2 tracking-wide">
            Dayang · Powered by Gemini AI | URUS AI SDN BHD
          </p>
        </div>
      </div>

      {/* â”€â”€ Floating toggle button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-[2000] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'pointer-events-none opacity-0 scale-75'
            : 'bg-emerald-500 hover:bg-emerald-400 scale-100 hover:scale-105'
        }`}
        aria-label="Toggle Dayang"
      >
        {isOpen
          ? <X size={20} className="text-gray-300" />
          : <MessageCircle size={22} className="text-white" />
        }
        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30"
            style={{ animation: 'pulse 2s ease-in-out infinite' }} />
        )}
      </button>
    </>
  )
}

export default ChatBot


