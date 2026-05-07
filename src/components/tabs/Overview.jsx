import React, { useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Zap, Wind, Droplets, Trash2, Leaf, AlertTriangle, Activity, Sun } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import StatusBadge from '../StatusBadge'
import CampusMap from '../CampusMap'
import config from '../../config'
import {
  countBy, filterAlerts, filterRows, aggregateByMonth, avg, round, fmt, statusColor,
} from '../../utils/dataUtils'

const RADAR_DATA = [
  { subject: 'Energy',      score: config.esgScore.energy, color: '#3B82F6' },
  { subject: 'Air Quality', score: config.esgScore.air,    color: '#06B6D4' },
  { subject: 'Water',       score: config.esgScore.water,  color: '#6366F1' },
  { subject: 'Waste Mgmt',  score: config.esgScore.waste,  color: '#F97316' },
  { subject: 'Soil Health', score: config.esgScore.soil,   color: '#22C55E' },
]

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }

const ESGGauge = ({ score }) => {
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444'
  const gaugeData = [{ value: score, fill: color }, { value: 100 - score, fill: '#1e293b' }]
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={gaugeData} cx="50%" cy="75%" startAngle={180} endAngle={0}
            innerRadius="55%" outerRadius="80%" paddingAngle={0} dataKey="value" strokeWidth={0}>
            {gaugeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <div className="text-4xl font-black" style={{ color }}>{score}</div>
        <div className="text-sm text-gray-400">/100</div>
        <div className="text-xs text-gray-500 mt-0.5">ESG Composite</div>
      </div>
    </div>
  )
}

const aqiLabel = aqi => aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy'

const Overview = ({ data, filters }) => {

  // ── Filtered domain data ────────────────────────────────────────────────
  const filteredEnergy = useMemo(() =>
    filterRows(data.energy    || [], filters, 'Building', 'Date')
  , [data.energy, filters])

  const filteredAir = useMemo(() =>
    filterRows(data.air       || [], filters, 'Location', 'Date')
  , [data.air, filters])

  const filteredWater = useMemo(() =>
    filterRows(data.water     || [], filters, 'Location', 'Date')
  , [data.water, filters])

  const filteredWaste = useMemo(() =>
    filterRows(data.waste     || [], filters, 'Location', 'Date')
  , [data.waste, filters])

  const filteredSoil = useMemo(() =>
    filterRows(data.soil      || [], filters, 'Location', 'Date')
  , [data.soil, filters])

  const filteredGrid = useMemo(() =>
    filterRows(data.smartGrid || [], filters, null, 'Date')
  , [data.smartGrid, filters])

  // ── KPI computations ────────────────────────────────────────────────────
  const totalKWh = useMemo(() =>
    Math.round(filteredEnergy.reduce((s, r) => s + (r.Energy_kWh || 0), 0))
  , [filteredEnergy])

  const avgAQI = useMemo(() => {
    const vals = filteredAir.map(r => r.AQI).filter(v => v != null && !isNaN(v))
    return vals.length ? round(avg(vals), 1) : null
  }, [filteredAir])

  const solarShare = useMemo(() => {
    const solar = filteredGrid.reduce((s, r) => s + (r.Solar_PV_MWh   || 0), 0)
    const grid  = filteredGrid.reduce((s, r) => s + (r.Grid_Intake_MWh || 0), 0)
    return solar + grid > 0 ? round((solar / (solar + grid)) * 100, 1) : null
  }, [filteredGrid])

  const solarMWh = useMemo(() =>
    Math.round(filteredGrid.reduce((s, r) => s + (r.Solar_PV_MWh || 0), 0))
  , [filteredGrid])

  const gridEff = useMemo(() => {
    const rates = filteredGrid.map(r => r.Efficiency_Rate).filter(v => v != null && !isNaN(v))
    return rates.length ? round(avg(rates) * 100, 1) : null
  }, [filteredGrid])

  const waterNormalPct = useMemo(() => {
    if (!filteredWater.length) return null
    return round((filteredWater.filter(r => r.Status === 'Normal').length / filteredWater.length) * 100, 1)
  }, [filteredWater])

  const avgFillLevel = useMemo(() => {
    const vals = filteredWaste.map(r => r.Fill_Level).filter(v => v != null && !isNaN(v))
    return vals.length ? round(avg(vals)) : null
  }, [filteredWaste])

  const fullBins     = useMemo(() => filteredWaste.filter(r => r.Status === 'Full').length,      [filteredWaste])
  const nearFullBins = useMemo(() => filteredWaste.filter(r => r.Status === 'Near Full').length, [filteredWaste])

  const soilNormalPct = useMemo(() => {
    if (!filteredSoil.length) return null
    return round((filteredSoil.filter(r => r.Health_Status === 'Normal').length / filteredSoil.length) * 100, 1)
  }, [filteredSoil])

  const soilWetPct = useMemo(() => {
    if (!filteredSoil.length) return null
    return round((filteredSoil.filter(r => r.Health_Status === 'Wet').length / filteredSoil.length) * 100, 1)
  }, [filteredSoil])

  const soilDryPct = useMemo(() => {
    if (!filteredSoil.length) return null
    return round((filteredSoil.filter(r => r.Health_Status === 'Dry').length / filteredSoil.length) * 100, 1)
  }, [filteredSoil])

  const waterDominantStatus = useMemo(() => {
    if (!filteredWater.length) return null
    const counts = countBy(filteredWater, 'Status')
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  }, [filteredWater])

  const soilDominantStatus = useMemo(() => {
    if (!filteredSoil.length) return null
    const counts = countBy(filteredSoil, 'Health_Status')
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  }, [filteredSoil])

  // ── Alerts (active = not resolved) ─────────────────────────────────────
  const filteredAlerts = useMemo(() =>
    filterAlerts(data.alerts || [], filters)
  , [data.alerts, filters])

  const activeAlerts = useMemo(() =>
    filteredAlerts.filter(a => a.Status !== 'Resolved')
  , [filteredAlerts])

  const alertCounts = useMemo(() => countBy(activeAlerts, 'Severity'), [activeAlerts])
  const alertStatus = useMemo(() => countBy(filteredAlerts, 'Status'), [filteredAlerts])

  const recentAlerts = useMemo(() => {
    return [...filteredAlerts]
      .sort((a, b) => {
        const parse = ts => {
          const [datePart, timePart = '00:00'] = String(ts || '').split(' ')
          const [d, m, y] = datePart.split('/')
          return new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${timePart}`)
        }
        return parse(b.Timestamp) - parse(a.Timestamp)
      })
      .slice(0, 5)
  }, [filteredAlerts])

  // ── Monthly energy trend (respects location filter, always shows all 3 months) ──
  const trendData = useMemo(() => {
    // Apply location filter but ignore month so all 3 bars always render
    const energyForTrend = filterRows(
      data.energy || [],
      { location: filters.location, month: 'All' },
      'Building', 'Date'
    )
    const energyMonthly = aggregateByMonth(energyForTrend, 'Date', 'Energy_kWh')
    const solarMonthly  = aggregateByMonth(data.smartGrid || [], 'Date', 'Solar_PV_MWh')
    const all = energyMonthly.map((e, i) => ({
      month:  e.month,
      energy: e.sum,
      solar:  Math.round(solarMonthly[i]?.sum || 0),
    }))
    return filters.month === 'All' ? all : all.filter(d => d.month === filters.month)
  }, [data.energy, data.smartGrid, filters])

  const totalAlerts   = activeAlerts.length
  const criticalCount = alertCounts.Critical || 0
  const warningCount  = alertCounts.Warning  || 0
  const totalSeverity = criticalCount + warningCount || 1

  // Returns amber/red for problem states; undefined (white) when normal — exception-based coloring
  const warnColor = status => {
    const c = statusColor(status)
    return c === '#22C55E' ? undefined : c
  }

  const kpis = [
    {
      title: 'Total Energy', value: totalKWh ? fmt(totalKWh) : '—', unit: totalKWh ? 'kWh' : '',
      subtitle: filters.location !== 'All' ? `${filters.location} · Q1 2026` : '3 buildings · Q1 2026',
      color: '#3B82F6', icon: Zap,
    },
    {
      title: 'Avg AQI', value: avgAQI ?? '—', unit: '',
      subtitle: avgAQI != null ? `${aqiLabel(avgAQI)} — filtered` : 'No air sensors at location',
      color: '#06B6D4', icon: Wind,
      valueColor: avgAQI != null ? (avgAQI <= 50 ? undefined : avgAQI <= 100 ? '#F59E0B' : '#EF4444') : undefined,
    },
    {
      title: 'Solar Share', value: solarShare ?? '—', unit: solarShare != null ? '%' : '',
      subtitle: solarMWh ? `${fmt(solarMWh)} MWh generated` : 'No grid data',
      color: '#FBBF24', icon: Sun,
    },
    {
      title: 'Grid Eff.', value: gridEff ?? '—', unit: gridEff != null ? '%' : '',
      subtitle: 'Smart grid average',
      color: '#8B5CF6', icon: Activity,
    },
    {
      title: 'Water Status',
      value: waterDominantStatus ?? '—',
      unit: '',
      subtitle: waterNormalPct != null
        ? `${waterNormalPct}% normal · ${round(100 - waterNormalPct, 1)}% warning`
        : 'No water sensors at location',
      color: '#6366F1', icon: Droplets,
      valueColor: waterDominantStatus ? warnColor(waterDominantStatus) : undefined,
    },
    {
      title: 'Avg Fill Lvl', value: avgFillLevel ?? '—', unit: avgFillLevel != null ? '%' : '',
      subtitle: avgFillLevel != null
        ? `${fullBins} full · ${nearFullBins} near-full bins`
        : 'No waste sensors at location',
      color: '#F97316', icon: Trash2,
      valueColor: avgFillLevel != null ? (avgFillLevel < 50 ? undefined : avgFillLevel <= 75 ? '#F59E0B' : '#EF4444') : undefined,
    },
    {
      title: 'Soil Status',
      value: soilDominantStatus ?? '—',
      unit: '',
      subtitle: soilNormalPct != null
        ? `${soilNormalPct}% normal · ${soilWetPct}% wet · ${soilDryPct}% dry`
        : 'No soil sensors at location',
      color: '#84CC16', icon: Leaf,
      valueColor: soilDominantStatus ? warnColor(soilDominantStatus) : undefined,
    },
    {
      title: 'Active Alerts', value: String(totalAlerts), unit: '',
      subtitle: `${criticalCount} critical · ${warningCount} warning`,
      color: '#EF4444', icon: AlertTriangle,
      valueColor: totalAlerts === 0 ? undefined : criticalCount > 0 ? '#EF4444' : '#F59E0B',
    },
  ]

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">

      {/* Row 1 — ESG Gauge + KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ChartCard
          title="ESG Score"
          subtitle={`${config.university.shortName} Smart Campus · ${config.dashboard.period}`}
          className="lg:col-span-1"
        >
          <ESGGauge score={config.esgScore.composite} />

          {/* Dimension breakdown — mini progress bars */}
          <div className="space-y-2 mt-2">
            {RADAR_DATA.map(d => (
              <div key={d.subject} className="flex items-center gap-2">
                <div className="w-14 text-[10px] text-gray-500 text-right truncate flex-shrink-0">
                  {d.subject.split(' ')[0]}
                </div>
                <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.score}%`, backgroundColor: d.color, transition: 'width 0.8s ease-out' }}
                  />
                </div>
                <div className="text-[11px] font-bold w-6 text-right flex-shrink-0" style={{ color: d.color }}>
                  {d.score}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => <KPICard key={k.title} {...k} />)}
        </div>
      </div>

      {/* Row 2 — Radar + Monthly Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="ESG Dimension Scores" subtitle="Radar view — Q1 2026 average">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#1E293B" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#22C55E" fill="#22C55E" fillOpacity={0.18} strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
              <Tooltip contentStyle={TT} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Monthly Energy Trend"
          subtitle={
            filters.location !== 'All'
              ? `${filters.location} · ${filters.month !== 'All' ? filters.month : 'Jan – Mar'} 2026`
              : filters.month !== 'All' ? `${filters.month} 2026 — filtered` : 'Total kWh · Jan to Mar 2026'
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FBBF24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={AX} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Area yAxisId="left"  type="monotone" dataKey="energy" name="Energy (kWh)" stroke="#3B82F6" fill="url(#gEnergy)" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
              <Area yAxisId="right" type="monotone" dataKey="solar"  name="Solar (MWh)"  stroke="#FBBF24" fill="url(#gSolar)"  strokeWidth={2} dot={{ fill: '#FBBF24', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 — Recent Alerts + Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard
          title="Recent Alerts"
          subtitle={`${recentAlerts.length} of ${filteredAlerts.length} filtered alerts — latest first`}
          className="md:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-[#1E293B]">
                  <th className="text-left py-2 pr-3 font-medium">Timestamp</th>
                  <th className="text-left py-2 pr-3 font-medium">Location</th>
                  <th className="text-left py-2 pr-3 font-medium">Incident</th>
                  <th className="text-left py-2 pr-3 font-medium">Severity</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">No alerts match the selected filters.</td></tr>
                )}
                {recentAlerts.map((a, i) => (
                  <tr key={i} className="border-b border-[#1E293B]/50 hover:bg-white/5 transition-colors">
                    <td className="py-2 pr-3 text-gray-400 whitespace-nowrap font-mono">{a.Timestamp}</td>
                    <td className="py-2 pr-3 text-gray-300">{a.Location}</td>
                    <td className="py-2 pr-3 text-white font-medium">{a.Incident_Type}</td>
                    <td className="py-2 pr-3"><StatusBadge status={a.Severity} /></td>
                    <td className="py-2"><StatusBadge status={a.Status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Alert Summary" subtitle="Active (unresolved) · filtered">
          <div className="space-y-4">
            {[
              { label: 'Critical', count: criticalCount, color: '#EF4444' },
              { label: 'Warning',  count: warningCount,  color: '#F59E0B' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-bold" style={{ color }}>{count}</span>
                </div>
                <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / totalSeverity) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-[#1E293B] grid grid-cols-3 gap-2 text-center">
              {Object.entries(alertStatus).length > 0
                ? Object.entries(alertStatus).map(([s, c]) => (
                    <div key={s}>
                      <div className="text-base font-bold text-white">{c}</div>
                      <div className="text-[10px] text-gray-500">{s}</div>
                    </div>
                  ))
                : <div className="col-span-3 text-xs text-gray-600 py-2">No alerts in selection</div>
              }
            </div>

            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs">
              <span className="text-gray-500">Active (unresolved)</span>
              <span className="font-bold text-white">{totalAlerts}</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4 — Interactive GIS map */}
      <ChartCard
        title="UNIMAS Campus — Live Sensor Map"
        subtitle="Click any marker to see latest sensor readings · Toggle AQI heatmap overlay"
      >
        <CampusMap data={data} filters={filters} />
      </ChartCard>
    </div>
  )
}

export default Overview
