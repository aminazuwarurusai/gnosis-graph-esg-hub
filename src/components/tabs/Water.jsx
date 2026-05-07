import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Droplets, Activity, Waves, FlaskConical } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { pivotByDate, aggregateByMonth, countBy, avg, round, fmt, toPieData, filterRows } from '../../utils/dataUtils'
import config from '../../config'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const STATUS_COLORS = { Normal: '#22C55E', Warning: '#F59E0B', Critical: '#EF4444' }
const locColor = loc => config.locationColors[loc] || '#6B7280'

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

  const locations    = useMemo(() => [...new Set(rows.map(r => r.Location))].sort(), [rows])
  const statusCounts = useMemo(() => countBy(rows, 'Status'), [rows])
  const statusPie    = useMemo(() => toPieData(statusCounts, STATUS_COLORS), [statusCounts])
  const phTrend      = useMemo(() => pivotByDate(rows, 'Date', 'Location', 'pH', 3), [rows])
  const turbMonth    = useMemo(() => aggregateByMonth(rows, 'Date', 'Turbidity'), [rows])
  const doMonth      = useMemo(() => aggregateByMonth(rows, 'Date', 'DO'), [rows])
  const condTrend    = useMemo(() => pivotByDate(rows, 'Date', 'Location', 'Conductivity', 3), [rows])

  const normalPct = useMemo(() => {
    const n = statusCounts['Normal'] || 0
    return rows.length ? round((n / rows.length) * 100) : 0
  }, [rows, statusCounts])

  const statusStats = useMemo(() =>
    statusPie.map(s => ({
      ...s,
      pct: Math.round((s.value / (rows.length || 1)) * 100),
    }))
  , [statusPie, rows.length])

  const noData = rows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No water data for the selected filter. Water sensors are at Campus Lake and Colleges.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Avg pH"       value={kpiAvgs.ph   || '—'} subtitle="Ideal: 6.5 – 8.5" color="#6366F1" icon={FlaskConical}
          trend={rows.length ? { value: normalPct + '% normal', label: 'readings', up: normalPct >= 60 } : undefined}
          valueColor={kpiAvgs.ph != null ? (kpiAvgs.ph >= 6.5 && kpiAvgs.ph <= 8.5 ? undefined : kpiAvgs.ph >= 6.0 && kpiAvgs.ph <= 9.0 ? '#F59E0B' : '#EF4444') : undefined} />
        <KPICard title="Turbidity"    value={kpiAvgs.turb || '—'} unit="NTU" subtitle="Lower = clearer" color="#06B6D4" icon={Waves}
          valueColor={kpiAvgs.turb != null ? (kpiAvgs.turb < 5 ? undefined : kpiAvgs.turb <= 25 ? '#F59E0B' : '#EF4444') : undefined} />
        <KPICard title="Dissolved O₂" value={kpiAvgs.do_  || '—'} unit="mg/L" subtitle="Target ≥ 6 mg/L" color="#22C55E" icon={Droplets}
          valueColor={kpiAvgs.do_ != null ? (kpiAvgs.do_ >= 6 ? undefined : kpiAvgs.do_ >= 4 ? '#F59E0B' : '#EF4444') : undefined} />
        <KPICard title="Conductivity" value={kpiAvgs.cond ? fmt(kpiAvgs.cond, 0) : '—'} unit="µS/cm" subtitle="Avg across locations" color="#8B5CF6" icon={Activity}
          valueColor={kpiAvgs.cond != null ? (kpiAvgs.cond < 500 ? undefined : kpiAvgs.cond <= 1000 ? '#F59E0B' : '#EF4444') : undefined} />
      </div>

      {/* Status donut + pH trend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Status Distribution" subtitle="Filtered readings">
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius="56%"
                  outerRadius="82%"
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v, n) => [`${v} readings`, n]} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: '#9CA3AF', paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-x-0 top-[70px] flex flex-col items-center pointer-events-none">
              <span className="text-2xl font-black text-emerald-400 leading-none">{normalPct}%</span>
              <span className="text-[10px] text-gray-500 mt-1">Normal</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1E293B] pt-3 text-center">
            {statusStats.map(s => (
              <div key={s.name} className="rounded-lg bg-[#0A0F1E] border border-[#1E293B] px-2 py-2">
                <div className="text-sm font-bold" style={{ color: s.fill }}>{s.pct}%</div>
                <div className="text-[10px] text-gray-500">{s.name}</div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="pH Level Trend" subtitle="Sampled every 3 days — per location" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={phTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[4, 10]} tick={AX} axisLine={false} tickLine={false} />
              <ReferenceLine y={6.5} stroke="#22C55E" strokeDasharray="3 3" label={{ value:'pH 6.5', fill:'#22C55E', fontSize:9, position:'insideRight' }} />
              <ReferenceLine y={8.5} stroke="#22C55E" strokeDasharray="3 3" label={{ value:'pH 8.5', fill:'#22C55E', fontSize:9, position:'insideRight' }} />
              <Tooltip contentStyle={TT} formatter={(v, n) => [`pH ${v}`, n]} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              {locations.map((loc, i) => (
                <Line key={loc} type="monotone" dataKey={loc} stroke={locColor(loc)} strokeWidth={2} dot={false} />
              ))}
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
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {turbMonth.map((entry, i) => (
                  <Cell key={i} fill={config.monthColors[entry.month] || '#06B6D4'} />
                ))}
              </Bar>
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
      <ChartCard title="Conductivity Trend" subtitle="µS/cm — sampled every 3 days — per location">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={condTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={AX} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT} formatter={(v, n) => [`${v} µS/cm`, n]} />
            <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
            {locations.map((loc, i) => (
              <Line key={loc} type="monotone" dataKey={loc} stroke={locColor(loc)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default Water
