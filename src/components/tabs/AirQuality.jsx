import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Wind, Thermometer, AlertCircle } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import { aggregateByMonth, aggregateByLocation, pivotByDate, countBy, avg, round, fmt, toPieData, filterRows } from '../../utils/dataUtils'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const STATUS_COLORS = { Good: '#22C55E', Moderate: '#F59E0B', Unhealthy: '#EF4444', Poor: '#EF4444' }
const LOC_COLORS    = ['#06B6D4','#22C55E','#F59E0B','#8B5CF6','#3B82F6']

const aqiLabel = aqi => aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy' : 'Hazardous'
const aqiColor = aqi => aqi <= 50 ? '#22C55E' : aqi <= 100 ? '#F59E0B' : '#EF4444'

const AirQuality = ({ data, filters }) => {
  const rows = useMemo(() =>
    filterRows(data.air || [], filters, 'Location', 'Date')
  , [data.air, filters])

  const kpiAvgs = useMemo(() => ({
    aqi:   round(avg(rows.map(r => r.AQI).filter(Boolean))),
    pm25:  round(avg(rows.map(r => r['PM2.5']).filter(Boolean))),
    co2:   round(avg(rows.map(r => r.CO2).filter(Boolean)), 0),
    temp:  round(avg(rows.map(r => r.Temp).filter(Boolean))),
    humid: round(avg(rows.map(r => r.Humidity).filter(Boolean))),
  }), [rows])

  const locations     = useMemo(() => [...new Set(rows.map(r => r.Location))], [rows])
  const dailyAQI      = useMemo(() => pivotByDate(rows, 'Date', 'Location', 'AQI', 5), [rows])
  const pm25ByLoc     = useMemo(() => aggregateByLocation(rows, 'Location', 'PM2.5'), [rows])
  const co2Monthly    = useMemo(() => aggregateByMonth(rows, 'Date', 'CO2'), [rows])
  const statusCounts  = useMemo(() => countBy(rows, 'Status'), [rows])
  const statusPie     = useMemo(() => toPieData(statusCounts, STATUS_COLORS), [statusCounts])
  const statusStats   = useMemo(() =>
    statusPie.map(s => ({
      ...s,
      pct: Math.round((s.value / (rows.length || 1)) * 100),
    }))
  , [statusPie, rows.length])
  const topStatus     = useMemo(() =>
    statusStats.reduce((best, item) => item.pct > (best?.pct ?? -1) ? item : best, null)
  , [statusStats])

  const noData = rows.length === 0

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
          No air quality data for the selected filter. Campus Lake and Main Gate do not have air sensors.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Avg AQI"    value={kpiAvgs.aqi  || '—'} subtitle={kpiAvgs.aqi ? aqiLabel(kpiAvgs.aqi) : 'No data'} color={aqiColor(kpiAvgs.aqi || 0)} icon={Wind} />
        <KPICard title="Avg PM2.5"  value={kpiAvgs.pm25 || '—'} unit="µg/m³" subtitle="Fine particles"       color="#F59E0B" icon={AlertCircle} />
        <KPICard title="Avg CO₂"    value={kpiAvgs.co2  || '—'} unit="ppm"   subtitle="Target < 700 ppm"     color="#8B5CF6" icon={Wind} />
        <KPICard title="Temp / Humid" value={kpiAvgs.temp ? `${kpiAvgs.temp}°C` : '—'} subtitle={kpiAvgs.humid ? `${kpiAvgs.humid}% RH` : ''} color="#06B6D4" icon={Thermometer} />
      </div>

      {/* AQI trend + donut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="AQI Trend by Location" subtitle="Sampled every 5 days" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyAQI} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis domain={[0, 160]} tick={AX} axisLine={false} tickLine={false} />
              <ReferenceLine y={50}  stroke="#22C55E" strokeDasharray="4 4" label={{ value:'Good',     fill:'#22C55E', fontSize:9, position:'insideRight' }} />
              <ReferenceLine y={100} stroke="#F59E0B" strokeDasharray="4 4" label={{ value:'Moderate', fill:'#F59E0B', fontSize:9, position:'insideRight' }} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
              {locations.map((loc, i) => (
                <Line key={loc} type="monotone" dataKey={loc} stroke={LOC_COLORS[i % LOC_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution" subtitle="All filtered readings">
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
            {topStatus && (
              <div className="absolute inset-x-0 top-[70px] flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black leading-none" style={{ color: topStatus.fill }}>{topStatus.pct}%</span>
                <span className="text-[10px] text-gray-500 mt-1">{topStatus.name}</span>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1E293B] pt-3 text-center">
            {statusStats.map(s => (
              <div key={s.name} className="rounded-lg bg-[#0A0F1E] border border-[#1E293B] px-2 py-2">
                <div className="text-sm font-bold" style={{ color: s.fill }}>{s.pct}%</div>
                <div className="text-[10px] text-gray-500">{s.name}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* PM2.5 + CO2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="PM2.5 by Location" subtitle="Average µg/m³ — filtered">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pm25ByLoc} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" tick={AX} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="location" tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} formatter={v => [`${v} µg/m³`, 'PM2.5']} />
              <Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CO₂ Monthly Trend" subtitle="Average ppm — target < 700 ppm">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={co2Monthly} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={AX} axisLine={false} tickLine={false} />
              <YAxis tick={AX} axisLine={false} tickLine={false} />
              <ReferenceLine y={700} stroke="#F59E0B" strokeDasharray="4 4" label={{ value:'700 ppm', fill:'#F59E0B', fontSize:10, position:'insideTopRight' }} />
              <Tooltip contentStyle={TT} formatter={v => [`${v} ppm`, 'CO₂']} />
              <Line type="monotone" dataKey="avg" name="CO₂" stroke="#8B5CF6" strokeWidth={2.5}
                dot={{ fill: '#8B5CF6', r: 5, strokeWidth: 0 }}
                label={{ position: 'top', fill: '#8B5CF6', fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default AirQuality
