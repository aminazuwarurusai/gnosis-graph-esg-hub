import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, CheckCircle, Clock, MapPin, Filter, Download, ArrowUpDown } from 'lucide-react'
import KPICard from '../KPICard'
import ChartCard from '../ChartCard'
import StatusBadge from '../StatusBadge'
import { countBy, toPieData, filterAlerts } from '../../utils/dataUtils'
import config from '../../config'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }
const AX = { fill: '#6B7280', fontSize: 11 }
const SEV_COLORS    = { Critical: '#EF4444', Warning: '#F59E0B' }
const STATUS_COLORS = { Resolved: '#22C55E', Assigned: '#F59E0B', 'On Route': '#06B6D4' }
const TYPE_COLORS   = ['#3B82F6','#818CF8','#06B6D4','#2DD4BF','#A78BFA','#64748B']

const AlertCentre = ({ data, filters }) => {
  const [sevFilter,    setSevFilter]    = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey,      setSortKey]      = useState(null)
  const [sortDir,      setSortDir]      = useState('asc')

  // Apply global location+month filter
  const globalFiltered = useMemo(() =>
    filterAlerts(data.alerts || [], filters)
  , [data.alerts, filters])

  // Apply local severity+status filter on top of global
  const filtered = useMemo(() => globalFiltered.filter(r => {
    const okSev    = sevFilter    === 'All' || r.Severity === sevFilter
    const okStatus = statusFilter === 'All' || r.Status   === statusFilter
    return okSev && okStatus
  }), [globalFiltered, sevFilter, statusFilter])

  // Apply column sort
  const rows = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const downloadCSV = () => {
    const headers = ['Timestamp', 'Location', 'Incident_Type', 'Severity', 'Status']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'UNIMAS_Alerts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const sevCounts    = useMemo(() => countBy(globalFiltered, 'Severity'),      [globalFiltered])
  const statusCounts = useMemo(() => countBy(globalFiltered, 'Status'),        [globalFiltered])
  const typeCounts   = useMemo(() => countBy(globalFiltered, 'Incident_Type'), [globalFiltered])
  const locCounts    = useMemo(() => countBy(globalFiltered, 'Location'),      [globalFiltered])

  const sevPie    = useMemo(() => toPieData(sevCounts,    SEV_COLORS),    [sevCounts])
  const statusPie = useMemo(() => toPieData(statusCounts, STATUS_COLORS), [statusCounts])
  const typeBar   = useMemo(() =>
    Object.entries(typeCounts).map(([name, value], i) => ({ name, value, fill: TYPE_COLORS[i % TYPE_COLORS.length] }))
  , [typeCounts])
  const locBar    = useMemo(() =>
    Object.entries(locCounts).map(([name, value]) => ({ name, value, fill: config.locationColors[name] || '#6B7280' }))
  , [locCounts])

  const FilterBtn = ({ label, active, onClick }) => (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : 'text-gray-400 border-[#1E293B] hover:text-gray-200 hover:bg-gray-800'
      }`}>{label}</button>
  )

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* KPIs — based on global filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Total Alerts" value={globalFiltered.length} subtitle="Filtered selection" icon={AlertTriangle}
          color={globalFiltered.length === 0 ? '#6B7280' : sevCounts.Critical > 0 ? '#EF4444' : '#F59E0B'}
          valueColor={globalFiltered.length === 0 ? undefined : sevCounts.Critical > 0 ? '#EF4444' : '#F59E0B'} />
        <KPICard title="Critical"  value={sevCounts.Critical    || 0} subtitle="Immediate action"    color="#EF4444" icon={AlertTriangle} />
        <KPICard title="Warning"   value={sevCounts.Warning     || 0} subtitle="Monitoring required" color="#F59E0B" icon={Clock} />
        <KPICard title="Resolved"  value={statusCounts.Resolved || 0} subtitle={`${globalFiltered.length - (statusCounts.Resolved||0)} still open`} color="#22C55E" icon={CheckCircle} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="By Severity">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={sevPie} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={5} dataKey="value" strokeWidth={0}>
                {sevPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Status">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={5} dataKey="value" strokeWidth={0}>
                {statusPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Location">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={locBar} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" tick={AX} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Incident type bar */}
      <ChartCard title="Alerts by Incident Type" subtitle="Filtered occurrences">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={typeBar} margin={{ top: 5, right: 10, left: 0, bottom: 30 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="name" tick={{ ...AX, fontSize: 9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
            <YAxis tick={AX} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {typeBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Full alert log */}
      <ChartCard
        title="Alert Log"
        subtitle={`Showing ${rows.length} of ${globalFiltered.length} filtered alerts`}
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1">
              <Filter size={11} className="text-gray-500" />
              {['All','Critical','Warning'].map(f => (
                <FilterBtn key={f} label={f} active={sevFilter === f} onClick={() => setSevFilter(f)} />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {['All','Resolved','Assigned','On Route'].map(f => (
                <FilterBtn key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
              ))}
            </div>
            <button
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-[#1E293B] text-gray-400 hover:text-gray-200 hover:bg-[#1E293B] disabled:opacity-30 transition-colors"
              title="Download as CSV"
            >
              <Download size={11} />
              CSV
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-[#1E293B]">
                {[
                  { label: 'Timestamp',     key: 'Timestamp'     },
                  { label: 'Location',      key: 'Location'      },
                  { label: 'Incident Type', key: 'Incident_Type' },
                  { label: 'Severity',      key: 'Severity'      },
                  { label: 'Status',        key: 'Status'        },
                ].map(({ label, key }, i) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`text-left py-2 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors ${i < 4 ? 'pr-4' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortKey === key
                        ? <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        : <ArrowUpDown size={9} className="text-gray-600" />
                      }
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No alerts match the selected filters.</td></tr>
              )}
              {rows.map((a, i) => (
                <tr key={i} className="border-b border-[#1E293B]/50 hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-4 text-gray-400 font-mono whitespace-nowrap">{a.Timestamp}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1 text-gray-300">
                      <MapPin size={10} className="text-gray-500 flex-shrink-0" />{a.Location}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-white font-medium">{a.Incident_Type}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={a.Severity} /></td>
                  <td className="py-2.5"><StatusBadge status={a.Status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default AlertCentre
