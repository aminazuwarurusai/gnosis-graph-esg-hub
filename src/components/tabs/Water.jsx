import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Droplets, Activity, Waves, FlaskConical } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { aggregateByDate, aggregateByMonth, countBy, avg, round, fmt, toPieData, filterRows } from '../../utils/dataUtils'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const STATUS_COLORS = { Normal: '#22C55E', Warning: '#F59E0B', Critical: '#EF4444' }

const Water = ({ data, filters }) => {
  const rows = useMemo(() =>
    filterRows(data.water || [], filters, 'Location', 'Date')
  , [data.water, filters])

  const kpiAvgs = useMemo(() => ({
    ph:   round(avg(rows.map(r => r.pH).filter(Boolean))),
    turb: round(avg(rows.map(r => r.Turbidity).filter(Boolean))),
    do_:  round(avg(rows.map(r => r.DO).filter(Boolean))),
    cond: round(avg(rows.map(r => r.Conductivity).filter(Boolean)), 0),
  }), [rows])

  const statusCounts = useMemo(() => countBy(rows, 'Status'), [rows])
  const statusPie    = useMemo(() => toPieData(statusCounts, STATUS_COLORS), [statusCounts])
  const phTrend      = useMemo(() => aggregateByDate(rows, 'Date', 'pH', 3), [rows])
  const turbMonth    = useMemo(() => aggregateByMonth(rows, 'Date', 'Turbidity'), [rows])
  const doMonth      = useMemo(() => aggregateByMonth(rows, 'Date', 'DO'), [rows])
  const condTrend    = useMemo(() => aggregateByDate(rows, 'Date', 'Conductivity', 3), [rows])

  const normalPct = useMemo(() => {
    const n = statusCounts['Normal'] || 0
    return rows.length ? round((n / rows.length) * 100) : 0
  }, [rows, statusCounts])

  const noData = rows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No water data for the selected filter. Water sensors are only at Campus Lake.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Avg pH"        value={kpiAvgs.ph   || '—'} subtitle="Ideal: 6.5 – 8.5"   color="#6366F1" icon={FlaskConical}
          trend={rows.length ? { value: normalPct + '% normal', label: 'readings', up: normalPct >= 60 } : undefined} />
        <KPICard title="Turbidity"     value={kpiAvgs.turb || '—'} unit="NTU" subtitle="Lower = clearer" color="#06B6D4" icon={Waves} />
        <KPICard title="Dissolved O₂"  value={kpiAvgs.do_  || '—'} unit="mg/L" subtitle="Target ≥ 6 mg/L" color="#22C55E" icon={Droplets} />
        <KPICard title="Conductivity"  value={kpiAvgs.cond ? fmt(kpiAvgs.cond, 0) : '—'} unit="µS/cm" subtitle="Avg across locations" color="#8B5CF6" icon={Activity} />
      </div>

      {/* Status donut + pH trend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Status Distribution" subtitle="Filtered readings">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 border-t border-[#1E293B] pt-3 grid grid-cols-2 gap-3 text-center">
            <div><div className="text-xl font-bold text-emerald-400">{normalPct}%</div><div className="text-xs text-gray-500">Normal</div></div>
            <div><div className="text-xl font-bold text-amber-400">{100 - normalPct}%</div><div className="text-xs text-gray-500">Warning</div></div>
          </div>
        </ChartCard>

        <ChartCard title="pH Level Trend" subtitle="Sampled every 3 days" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={phTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[4, 10]} tick={AX} axisLine={false} tickLine={false} />
              <ReferenceLine y={6.5} stroke="#22C55E" strokeDasharray="3 3" label={{ value:'pH 6.5', fill:'#22C55E', fontSize:9, position:'insideRight' }} />
              <ReferenceLine y={8.5} stroke="#22C55E" strokeDasharray="3 3" label={{ value:'pH 8.5', fill:'#22C55E', fontSize:9, position:'insideRight' }} />
              <Tooltip contentStyle={TT} formatter={v => [`pH ${v}`, 'pH Level']} />
              <Line type="monotone" dataKey="value" name="pH" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Turbidity + DO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Turbidity — Monthly" subtitle="NTU — lower is better">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={turbMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} formatter={v => [`${v} NTU`, 'Turbidity']} />
              <Bar dataKey="avg" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Dissolved Oxygen — Monthly" subtitle="mg/L — target ≥ 6 mg/L">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={doMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
              <YAxis domain={[5, 10]} tick={AX} axisLine={false} tickLine={false} />
              <ReferenceLine y={6} stroke="#F59E0B" strokeDasharray="4 4" label={{ value:'Min 6', fill:'#F59E0B', fontSize:10, position:'insideTopRight' }} />
              <Tooltip contentStyle={TT} formatter={v => [`${v} mg/L`, 'DO']} />
              <Line type="monotone" dataKey="avg" name="DO" stroke="#22C55E" strokeWidth={2.5}
                dot={{ fill: '#22C55E', r: 5, strokeWidth: 0 }} label={{ position: 'top', fill: '#22C55E', fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Conductivity */}
      <ChartCard title="Conductivity Trend" subtitle="µS/cm — sampled every 3 days">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={condTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={AX} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT} formatter={v => [`${v} µS/cm`, 'Conductivity']} />
            <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default Water
