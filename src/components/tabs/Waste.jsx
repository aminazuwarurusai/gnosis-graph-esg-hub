import React, { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Trash2, Thermometer, Package, AlertTriangle } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { aggregateByLocation, aggregateByDate, countBy, avg, round, fmt, toPieData, filterRows } from '../../utils/dataUtils'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const fillColor  = v => v >= 90 ? '#EF4444' : v >= 70 ? '#F59E0B' : '#22C55E'
const STATUS_COLORS = { OK: '#22C55E', 'Near Full': '#F59E0B', Full: '#EF4444' }

const Waste = ({ data, filters }) => {
  const rows = useMemo(() =>
    filterRows(data.waste || [], filters, 'Location', 'Date')
  , [data.waste, filters])

  const kpiAvgs = useMemo(() => ({
    fill:   round(avg(rows.map(r => r.Fill_Level).filter(Boolean))),
    weight: round(avg(rows.map(r => r.Weight).filter(Boolean))),
    temp:   round(avg(rows.map(r => r.Temp).filter(Boolean))),
  }), [rows])

  const statusCounts = useMemo(() => countBy(rows, 'Status'), [rows])
  const statusPie    = useMemo(() => toPieData(statusCounts, STATUS_COLORS), [statusCounts])
  const tempTrend    = useMemo(() => aggregateByDate(rows, 'Date', 'Temp', 3), [rows])

  const locationFill = useMemo(() =>
    aggregateByLocation(rows, 'Location', 'Fill_Level').map(d => ({
      ...d,
      fill: fillColor(d.value),
    }))
  , [rows])

  const byBin = useMemo(() => {
    const bins = {}
    rows.forEach(r => {
      if (!bins[r.Bin_ID]) bins[r.Bin_ID] = { bin: r.Bin_ID, location: r.Location, vals: [] }
      bins[r.Bin_ID].vals.push(r.Fill_Level)
    })
    return Object.values(bins)
      .map(b => ({ bin: b.bin, location: b.location, fill: round(avg(b.vals)) }))
      .sort((a, b) => b.fill - a.fill)
      .slice(0, 12)
  }, [rows])

  const noData = rows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No waste data for the selected filter. Waste sensors are at Cafeteria, Colleges, and Engineering Faculty.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Avg Fill Level" value={kpiAvgs.fill || '—'} unit="%" subtitle="Filtered bins" color="#F97316" icon={Trash2} />
        <KPICard title="Full Bins"      value={statusCounts.Full || 0} subtitle="≥ 90% fill level" color="#EF4444" icon={AlertTriangle} />
        <KPICard title="Near Full"      value={statusCounts['Near Full'] || 0} subtitle="70–89% fill" color="#F59E0B" icon={Package} />
        <KPICard title="Avg Bin Temp"   value={kpiAvgs.temp || '—'} unit="°C" subtitle="Ambient temperature" color="#06B6D4" icon={Thermometer} />
      </div>

      {/* Fill by location + status donut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Avg Fill Level by Location" subtitle="% — filtered" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={locationFill} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="location" tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={AX} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" label={{ value:'70%', fill:'#F59E0B', fontSize:9, position:'insideRight' }} />
              <ReferenceLine y={90} stroke="#EF4444" strokeDasharray="4 4" label={{ value:'90%', fill:'#EF4444', fontSize:9, position:'insideRight' }} />
              <Tooltip contentStyle={TT} formatter={v => [`${v}%`, 'Fill Level']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {locationFill.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution" subtitle="Filtered bins">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {statusPie.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: s.fill }} /><span className="text-gray-400">{s.name}</span></div>
                <span className="font-bold text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Top bins */}
      <ChartCard title="Top Bins by Fill Level" subtitle="Sorted descending — filtered">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byBin} layout="vertical" margin={{ top: 5, right: 40, left: 70, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={AX} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="bin" tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
            <Tooltip contentStyle={TT} formatter={(v, _, p) => [`${v}%`, p.payload.location]} />
            <Bar dataKey="fill" radius={[0, 4, 4, 0]}>
              {byBin.map((e, i) => <Cell key={i} fill={fillColor(e.fill)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Temp trend */}
      <ChartCard title="Bin Temperature Trend" subtitle="°C — elevated = decomposition activity">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={tempTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={AX} axisLine={false} tickLine={false} unit="°C" />
            <ReferenceLine y={40} stroke="#EF4444" strokeDasharray="4 4" label={{ value:'Alert 40°C', fill:'#EF4444', fontSize:10, position:'insideTopRight' }} />
            <Tooltip contentStyle={TT} formatter={v => [`${v}°C`, 'Bin Temp']} />
            <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default Waste
