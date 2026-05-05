import React, { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import { Zap, Sun, Battery, TrendingUp } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { aggregateByMonth, pivotByDate, avg, round, fmt, filterRows } from '../../utils/dataUtils'

const TT  = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX  = { fill: '#6B7280', fontSize: 11 }
const BUILDINGS = ['Admin Block', 'Engineering Faculty', 'Colleges']
const B_COLORS  = { 'Admin Block': '#3B82F6', 'Engineering Faculty': '#06B6D4', 'Colleges': '#8B5CF6' }

const Energy = ({ data, filters }) => {
  // ── Filtered rows ────────────────────────────────────────────────────────
  const energyRows = useMemo(() =>
    filterRows(data.energy    || [], filters, 'Building', 'Date')
  , [data.energy, filters])

  const gridRows = useMemo(() =>
    filterRows(data.smartGrid || [], filters, null, 'Date') // campus-wide — skip location filter
  , [data.smartGrid, filters])

  // ── KPI values from filtered data ────────────────────────────────────────
  const totalKWh = useMemo(() =>
    Math.round(energyRows.reduce((s, r) => s + (r.Energy_kWh || 0), 0))
  , [energyRows])

  const peakKW = useMemo(() =>
    Math.max(...energyRows.map(r => r.Power_kW || 0), 0)
  , [energyRows])

  const avgBattery = useMemo(() =>
    round(avg(gridRows.map(r => r.Battery_Level_Percentage).filter(Boolean)))
  , [gridRows])

  const solarTotal = useMemo(() =>
    Math.round(gridRows.reduce((s, r) => s + (r.Solar_PV_MWh || 0), 0))
  , [gridRows])

  // ── Building energy bar (from filtered rows) ─────────────────────────────
  const buildingKWh = useMemo(() => {
    const byBuilding = {}
    energyRows.forEach(r => {
      byBuilding[r.Building] = (byBuilding[r.Building] || 0) + (r.Energy_kWh || 0)
    })
    return Object.entries(byBuilding).map(([building, kWh]) => ({
      building: building.replace(' Faculty', ' Fac.'),
      kWh: Math.round(kWh),
      fill: B_COLORS[building] || '#6B7280',
    }))
  }, [energyRows])

  // ── Daily power line (sampled every 3 days) ──────────────────────────────
  const dailyPower = useMemo(() =>
    pivotByDate(energyRows, 'Date', 'Building', 'Power_kW', 3)
  , [energyRows])

  // ── Monthly aggregates from filtered rows ────────────────────────────────
  const monthlyEnergy = useMemo(() =>
    aggregateByMonth(energyRows, 'Date', 'Energy_kWh')
  , [energyRows])

  const monthlySolar = useMemo(() =>
    aggregateByMonth(gridRows, 'Date', 'Solar_PV_MWh')
  , [gridRows])

  const monthlyGrid = useMemo(() =>
    aggregateByMonth(gridRows, 'Date', 'Grid_Intake_MWh')
  , [gridRows])

  // Efficiency_Rate in CSV is 0–1 decimal; multiply by 100 for display
  const monthlyEff = useMemo(() =>
    aggregateByMonth(gridRows, 'Date', 'Efficiency_Rate')
      .map(d => ({ ...d, avg: round(d.avg * 100, 1) }))
  , [gridRows])

  const gridChartData = useMemo(() =>
    monthlyGrid.map((g, i) => ({
      month: g.month,
      grid:  g.avg,
      solar: monthlySolar[i]?.avg || 0,
    }))
  , [monthlyGrid, monthlySolar])

  const batteryData = [{ name: 'Battery', value: avgBattery || 90, fill: '#22C55E' }]

  const noData = energyRows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No energy data for the selected filter. Try a different location or month.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Total Energy"    value={fmt(totalKWh)} unit="kWh" subtitle="Filtered selection" color="#3B82F6" icon={Zap} />
        <KPICard title="Peak Power"      value={fmt(peakKW)}   unit="kW"  subtitle="Highest single reading" color="#F97316" icon={TrendingUp} />
        <KPICard title="Solar Generated" value={fmt(solarTotal)} unit="MWh" subtitle="PV generation" color="#FBBF24" icon={Sun} />
        <KPICard title="Avg Battery"     value={avgBattery || '—'} unit="%" subtitle="Storage level" color="#22C55E" icon={Battery} />
      </div>

      {/* Building energy + Daily power */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Energy by Building" subtitle="Total kWh — filtered selection">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buildingKWh} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="building" tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} formatter={v => [`${fmt(v)} kWh`, 'Energy']} />
              <Bar dataKey="kWh" radius={[4, 4, 0, 0]}>
                {buildingKWh.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Power Consumption" subtitle="kW per building — sampled every 3 days">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyPower} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              {(filters.location === 'All' ? BUILDINGS : [filters.location]).map(b => (
                <Line key={b} type="monotone" dataKey={b} stroke={B_COLORS[b] || '#6B7280'} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Smart Grid area + Battery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Smart Grid — Solar vs Grid" subtitle="Monthly MWh" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={gridChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSolar2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FBBF24" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGrid2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} formatter={(v, n) => [`${fmt(v)} MWh`, n]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Area type="monotone" dataKey="grid"  name="Grid Intake" stroke="#3B82F6" fill="url(#gGrid2)"  strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
              <Area type="monotone" dataKey="solar" name="Solar PV"    stroke="#FBBF24" fill="url(#gSolar2)" strokeWidth={2} dot={{ fill: '#FBBF24', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Battery Level" subtitle={`Avg ${avgBattery || 90}% — campus storage`}>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" barSize={20}
                data={batteryData} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: '#1E293B' }} clockWise dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-12">
              <div className="text-3xl font-black text-emerald-400">{avgBattery || 90}%</div>
              <div className="text-xs text-gray-500">Average</div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Efficiency trend */}
      <ChartCard title="Grid Efficiency Rate" subtitle="Monthly — target ≥ 95%">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyEff} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
            <YAxis domain={[93, 100]} tick={AX} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={TT} formatter={v => [`${v}%`, 'Efficiency']} />
            <Line type="monotone" dataKey="avg" name="Efficiency" stroke="#22C55E" strokeWidth={2.5}
              dot={{ fill: '#22C55E', r: 5, strokeWidth: 0 }}
              label={{ position: 'top', fill: '#22C55E', fontSize: 11, formatter: v => v ? `${v}%` : '' }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default Energy
