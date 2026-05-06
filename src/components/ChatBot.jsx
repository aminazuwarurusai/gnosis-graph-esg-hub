import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import config from '../config'
import { avg, countBy, filterAlerts, filterRows, fmt, round } from '../utils/dataUtils'

// â”€â”€â”€ Gemini REST API (v1 â€” supports gemini-2.5-flash) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
// Try the rolling latest Flash alias first, then stable fallbacks.
const MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]
const geminiUrl = m => `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${GEMINI_KEY}`

const SYSTEM_TEXT = `You are an ESG assistant for UNIMAS Smart Campus ISuRE dashboard. Powered by URUS AI SDN BHD.

UNIMAS campus data Q1 2026:
- ESG Score: 75/100 (Energy:78, Air:72, Water:70, Waste:68, Soil:82)
- Energy: 364,484 kWh | Engineering Faculty 124,686 kWh (HIGHEST) | Colleges 122,629 | Admin Block 117,169 | Solar 24.7% (target 30%) | Grid eff 96.4%
- Air: AQI 78.0 Moderate avg | Jan 74.0 Feb 77.8 Mar 82.2 rising | Locations: Eng Faculty, Colleges, Admin, Cafeteria
- Water: Campus Lake only | 68.3% Normal 31.7% Warning | pH 6.2-8.4 | DO 7.2mg/L | 2 critical alerts
- Waste: 63% avg fill | Cafeteria 65.9% (highest) | Colleges 63.9% | Eng Faculty 59.1%
- Soil: Eng Faculty only | 58.6% Normal 35.5% Wet 5.9% Dry
- Alerts: 12 active (4 Critical: Gas Leak-Admin, pH-Lake, Power Surge-Colleges, Low DO-Lake | 8 Warning)

Rules: Answer concisely max 120 words. Reply in same language as user. Always use the data above.`


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
  const energyRows = filterRows(data?.energy || [], filters, 'Building', 'Date')
  const airRows = filterRows(data?.air || [], filters, 'Location', 'Date')
  const waterRows = filterRows(data?.water || [], filters, 'Location', 'Date')
  const wasteRows = filterRows(data?.waste || [], filters, 'Location', 'Date')
  const soilRows = filterRows(data?.soil || [], filters, 'Location', 'Date')
  const gridRows = filterRows(data?.smartGrid || [], filters, null, 'Date')
  const alertRows = filterAlerts(data?.alerts || [], filters)

  const totalKWh = Math.round(energyRows.reduce((sum, row) => sum + (Number(row.Energy_kWh) || 0), 0))
  const topEnergy = topBy(energyRows, 'Building', 'Energy_kWh')
  const aqiValues = airRows.map(row => row.AQI).filter(value => value != null && !isNaN(value))
  const avgAQI = aqiValues.length ? round(avg(aqiValues), 1) : null
  const topAQI = topBy(airRows, 'Location', 'AQI', 'avg')
  const solar = gridRows.reduce((sum, row) => sum + (Number(row.Solar_PV_MWh) || 0), 0)
  const grid = gridRows.reduce((sum, row) => sum + (Number(row.Grid_Intake_MWh) || 0), 0)
  const solarShare = solar + grid > 0 ? round((solar / (solar + grid)) * 100, 1) : null
  const gridEffValues = gridRows.map(row => row.Efficiency_Rate).filter(value => value != null && !isNaN(value))
  const gridEff = gridEffValues.length ? round(avg(gridEffValues) * 100, 1) : null
  const waterStatus = countBy(waterRows, 'Status')
  const wasteStatus = countBy(wasteRows, 'Status')
  const soilHealth = countBy(soilRows, 'Health_Status')
  const activeAlerts = alertRows.filter(alert => alert.Status !== 'Resolved')
  const activeSeverity = countBy(activeAlerts, 'Severity')
  const latestAlerts = [...alertRows]
    .slice(-5)
    .map(alert => `${alert.Timestamp} ${alert.Location} ${alert.Incident_Type} (${alert.Severity}, ${alert.Status})`)
  const mapContext = buildMapContext(data)

  return `You are an ESG assistant for ${config.university.shortName} ${config.dashboard.title}. Powered by URUS AI SDN BHD.

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

Current filtered data summary:
- Energy rows: ${energyRows.length}; total energy ${fmt(totalKWh)} kWh; top building ${topEnergy ? `${topEnergy.name} (${fmt(Math.round(topEnergy.value))} kWh)` : 'no data'}.
- Smart grid rows: ${gridRows.length}; solar share ${solarShare ?? 'no data'}%; solar generated ${fmt(Math.round(solar))} MWh; grid efficiency ${gridEff ?? 'no data'}%.
- Air rows: ${airRows.length}; average AQI ${avgAQI ?? 'no data'}; highest average AQI location ${topAQI ? `${topAQI.name} (${round(topAQI.value, 1)})` : 'no data'}.
- Water rows: ${waterRows.length}; Normal ${waterStatus.Normal || 0} (${pctOf(waterStatus.Normal || 0, waterRows.length)}%); Warning ${waterStatus.Warning || 0}; Critical ${waterStatus.Critical || 0}.
- Waste rows: ${wasteRows.length}; average fill ${wasteRows.length ? round(avg(wasteRows.map(row => row.Fill_Level).filter(value => value != null && !isNaN(value))), 1) : 'no data'}%; OK ${wasteStatus.OK || 0}; Near Full ${wasteStatus['Near Full'] || 0}; Full ${wasteStatus.Full || 0}.
- Soil rows: ${soilRows.length}; Normal ${soilHealth.Normal || 0} (${pctOf(soilHealth.Normal || 0, soilRows.length)}%); Wet ${soilHealth.Wet || 0}; Dry ${soilHealth.Dry || 0}.
- Alerts rows: ${alertRows.length}; active unresolved ${activeAlerts.length}; critical active ${activeSeverity.Critical || 0}; warning active ${activeSeverity.Warning || 0}.
- Latest/filtered alerts: ${latestAlerts.length ? latestAlerts.join(' | ') : 'no alerts in current selection'}.

Current campus map marker data, using the latest CSV reading per location:
${mapContext || 'No campus map marker data available.'}

Rules: Answer concisely, max 120 words. Reply in the same language as the user. Do not invent data outside this summary.`
}
async function callGemini(userMsg, chatHistory, dashboardContext) {
  const contents = [
    { role: 'user',  parts: [{ text: dashboardContext }] },
    { role: 'model', parts: [{ text: 'Understood. I am your UNIMAS ESG Assistant.' }] },
    ...chatHistory.slice(-6).map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMsg }] },
  ]

  const body = JSON.stringify({
    contents,
    generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
  })

  // Try each model in order; retry once on overload
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000)) // wait 2s before retry

      const res = await fetch(geminiUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (res.ok) {
        const data = await res.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response.'
      }

      const err = await res.json()
      const msg = err?.error?.message ?? `HTTP ${res.status}`
      const isOverload = msg.toLowerCase().includes('demand') || res.status === 503 || res.status === 429
      const isModelUnavailable = res.status === 404 || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not supported')
      if (isModelUnavailable) break // try the next model name in the list
      if (!isOverload) throw new Error(msg) // hard error, do not retry
      // overloaded â€” loop to retry / next model
    }
  }
  throw new Error('All models busy. Please try again in a moment.')
}

// â”€â”€â”€ Mock response fallback (used if Gemini API fails) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESPONSES = {
  greeting: `Hello! I am your UNIMAS Smart Campus ESG Assistant.

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

  air: `Current average AQI is 78.0 - Moderate (51-100 range).

This means air is acceptable but sensitive groups should limit prolonged outdoor exposure.

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
  if (m.includes('water') || m.includes('ph') || m.includes('lake') || m.includes('tasik') || m.includes('dissolved') || m.includes('turbid'))
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
  }, [isOpen])

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
      reply = await callGemini(trimmed, messages, buildDashboardContext(data, filters))
    } catch (err) {
      console.error('[Gemini error]', err?.message || err)
      reply = `Gemini error: ${err?.message}\n\nLocal response:\n${getMockResponse(trimmed)}`
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
              <p className="text-sm font-semibold text-white">ESG Assistant</p>
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
              placeholder="Ask about ESG, energy, air quality..."
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
            Powered by Gemini AI | URUS AI SDN BHD
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
        aria-label="Toggle ESG Assistant"
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



