import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Leaf, Droplets, TreePine, Sun } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { pivotByDate, countBy, avg, round, toPieData, filterRows } from '../../utils/dataUtils'
import config from '../../config'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const HEALTH_COLORS = { Normal: '#22C55E', Wet: '#06B6D4', Dry: '#EF4444' }
const IRRIG_COLORS  = { Active: '#3B82F6', Idle: '#22C55E', Off: '#374151' }
const locColor = loc => config.locationColors[loc] || '#84CC16'

const Soil = ({ data, filters }) => {
  const rows = useMemo(() =>
    filterRows(data.soil || [], filters, 'Location', 'Date')
  , [data.soil, filters])

  const avgMoisture = useMemo(() =>
    round(avg(rows.map(r => r.Moisture_Percentage).filter(Boolean)))
  , [rows])

  const healthCounts  = useMemo(() => countBy(rows, 'Health_Status'),    [rows])
  const irrigCounts   = useMemo(() => countBy(rows, 'Irrigation_Status'),[rows])
  const healthPie     = useMemo(() => toPieData(healthCounts, HEALTH_COLORS), [healthCounts])
  const irrigPie      = useMemo(() => toPieData(irrigCounts,  IRRIG_COLORS),  [irrigCounts])
  const locations     = useMemo(() => [...new Set(rows.map(r => r.Location))], [rows])
  const moistureTrend = useMemo(() => pivotByDate(rows, 'Date', 'Location', 'Moisture_Percentage', 4), [rows])

  const total      = rows.length || 1
  const normalPct  = round(((healthCounts.Normal || 0) / total) * 100)
  const wetPct     = round(((healthCounts.Wet    || 0) / total) * 100)
  const dryPct     = round(((healthCounts.Dry    || 0) / total) * 100)

  const irrigByLoc = useMemo(() => {
    const s = {}
    rows.forEach(r => {
      if (!s[r.Location]) s[r.Location] = { location: r.Location, Active: 0, Idle: 0, Off: 0 }
      const st = r.Irrigation_Status
      if (st in s[r.Location]) s[r.Location][st]++
    })
    return Object.values(s)
  }, [rows])

  const noData = rows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No soil data for the selected filter. Soil sensors are at Engineering Faculty.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Avg Moisture" value={avgMoisture || '—'} unit="%" subtitle="Filtered locations" color="#84CC16" icon={Droplets} />
        <KPICard title="Normal"  value={normalPct} unit="%" subtitle={`${healthCounts.Normal  || 0} readings`} color="#22C55E" icon={Leaf} />
        <KPICard title="Wet"     value={wetPct}    unit="%" subtitle={`${healthCounts.Wet     || 0} readings`} color="#06B6D4" icon={TreePine} />
        <KPICard title="Dry"     value={dryPct}    unit="%" subtitle={`${healthCounts.Dry     || 0} readings — at risk`} color="#EF4444" icon={Sun} />
      </div>

      {/* Moisture trend + health pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Soil Moisture Trend" subtitle="% — sampled every 4 days" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={moistureTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[0, 100]} tick={AX} axisLine={false} tickLine={false} unit="%" />
              <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="3 3" label={{ value:'Dry <30%', fill:'#EF4444', fontSize:9, position:'insideRight' }} />
              <ReferenceLine y={70} stroke="#06B6D4" strokeDasharray="3 3" label={{ value:'Wet >70%', fill:'#06B6D4', fontSize:9, position:'insideRight' }} />
              <Tooltip contentStyle={TT} formatter={v => [`${v}%`, 'Moisture']} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              {locations.map(loc => (
                <Line key={loc} type="monotone" dataKey={loc} stroke={locColor(loc)} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Health Status" subtitle="Normal · Wet · Dry">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={healthPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {healthPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1E293B] pt-3 text-center">
            <div><div className="text-sm font-bold text-emerald-400">{normalPct}%</div><div className="text-[10px] text-gray-500">Normal</div></div>
            <div><div className="text-sm font-bold text-cyan-400">{wetPct}%</div><div className="text-[10px] text-gray-500">Wet</div></div>
            <div><div className="text-sm font-bold text-red-400">{dryPct}%</div><div className="text-[10px] text-gray-500">Dry</div></div>
          </div>
        </ChartCard>
      </div>

      {/* Irrigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Irrigation Status by Location" subtitle="Days per status — filtered">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={irrigByLoc} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="location" tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Bar dataKey="Active" stackId="a" fill="#3B82F6" />
              <Bar dataKey="Idle"   stackId="a" fill="#22C55E" />
              <Bar dataKey="Off"    stackId="a" fill="#374151" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Irrigation Mode Distribution" subtitle="Overall — filtered">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={irrigPie} cx="50%" cy="50%" outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {irrigPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default Soil
