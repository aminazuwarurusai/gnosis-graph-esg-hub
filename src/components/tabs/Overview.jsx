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
import { countBy, filterAlerts } from '../../utils/dataUtils'

const RADAR_DATA = [
  { subject: 'Energy',       score: config.esgScore.energy },
  { subject: 'Air Quality',  score: config.esgScore.air    },
  { subject: 'Water',        score: config.esgScore.water  },
  { subject: 'Waste Mgmt',   score: config.esgScore.waste  },
  { subject: 'Biodiversity', score: config.esgScore.soil   },
]

const MONTHLY_TREND = [
  { month: 'Jan', energy: 115990, solar: 324 },
  { month: 'Feb', energy: 121728, solar: 337 },
  { month: 'Mar', energy: 126766, solar: 357 },
]

const TT  = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX  = { fill: '#6B7280', fontSize: 11 }

const ESGGauge = ({ score }) => {
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444'
  const gaugeData = [{ value: score, fill: color }, { value: 100 - score, fill: '#1e293b' }]
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
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

const Overview = ({ data, filters }) => {
  // Alerts filtered by global location + month
  const filteredAlerts = useMemo(() =>
    filterAlerts(data.alerts || [], filters)
  , [data.alerts, filters])

  const alertCounts  = useMemo(() => countBy(filteredAlerts, 'Severity'), [filteredAlerts])
  const alertStatus  = useMemo(() => countBy(filteredAlerts, 'Status'),   [filteredAlerts])

  // Sort most-recent first (timestamp "D/M/YYYY HH:MM"), take 5
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

  // Monthly trend — filter to selected month when not "All"
  const trendData = useMemo(() =>
    filters.month === 'All'
      ? MONTHLY_TREND
      : MONTHLY_TREND.filter(d => d.month === filters.month)
  , [filters.month])

  const totalAlerts    = filteredAlerts.length
  const criticalCount  = alertCounts.Critical || 0
  const warningCount   = alertCounts.Warning  || 0
  const totalSeverity  = criticalCount + warningCount || 1

  const kpis = [
    { title: 'Total Energy',  value: '364,484', unit: 'kWh', subtitle: '3 buildings · Q1 2026',      color: '#3B82F6', icon: Zap          },
    { title: 'Avg AQI',       value: '78.0',    unit: '',    subtitle: 'Moderate — rising trend',     color: '#06B6D4', icon: Wind         },
    { title: 'Solar Share',   value: '24.7',    unit: '%',   subtitle: '1,018 MWh generated',         color: '#FBBF24', icon: Sun          },
    { title: 'Grid Eff.',     value: '96.4',    unit: '%',   subtitle: '3,110 MWh grid intake',       color: '#8B5CF6', icon: Activity     },
    { title: 'Water Normal',  value: '68.3',    unit: '%',   subtitle: '31.7% warning readings',      color: '#6366F1', icon: Droplets     },
    { title: 'Avg Fill Lvl',  value: '63',      unit: '%',   subtitle: '51 full · 46 near-full bins', color: '#F97316', icon: Trash2       },
    { title: 'Soil Normal',   value: '58.6',    unit: '%',   subtitle: '35.5% wet · 5.9% dry',        color: '#84CC16', icon: Leaf         },
    { title: 'Active Alerts', value: String(totalAlerts), unit: '',
      subtitle: `${criticalCount} critical · ${warningCount} warning`,                                 color: '#EF4444', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">

      {/* Row 1 — ESG Gauge + KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ChartCard title="ESG Score" subtitle={`${config.university.shortName} Smart Campus · ${config.dashboard.period}`} className="lg:col-span-1">
          <ESGGauge score={config.esgScore.composite} />
          <div className="grid grid-cols-5 gap-1 mt-2">
            {RADAR_DATA.map(d => (
              <div key={d.subject} className="text-center">
                <div className="text-xs font-bold text-emerald-400">{d.score}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{d.subject.split(' ')[0]}</div>
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
          subtitle={filters.month !== 'All' ? `${filters.month} 2026 — filtered` : 'Total kWh · Jan to Mar 2026'}
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
          subtitle={`${recentAlerts.length} of ${totalAlerts} filtered alerts — latest first`}
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

        <ChartCard title="Alert Summary" subtitle="By severity & status — filtered">
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

            {/* Status breakdown */}
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

            {/* Total */}
            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs">
              <span className="text-gray-500">Total filtered</span>
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
