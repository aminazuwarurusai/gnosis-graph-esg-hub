import React from 'react'
import { MapPin, Calendar, X } from 'lucide-react'

const LOCATIONS = [
  'All',
  'Admin Block',
  'Engineering Faculty',
  'Campus Lake',
  'Main Gate',
  'Cafeteria',
  'Colleges',
]

const MONTHS = ['All', 'Jan', 'Feb', 'Mar']
const MONTH_LABELS = { All: 'All Months', Jan: 'January', Feb: 'February', Mar: 'March' }

const Pill = ({ label, active, color = 'emerald', onClick }) => {
  const activeClass = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    blue:    'bg-blue-500/20 text-blue-400 border-blue-500/40',
  }[color]

  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border transition-all duration-150 ${
        active
          ? activeClass
          : 'text-gray-400 border-[#1E293B] hover:border-[#374151] hover:text-gray-200 hover:bg-[#1E293B]'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Global filter bar — location + month.
 * Sits between TabNav and main content (sticky).
 */
const FilterBar = ({ filters, setFilters }) => {
  const isFiltered = filters.location !== 'All' || filters.month !== 'All'

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const clear = () => setFilters({ location: 'All', month: 'All' })

  return (
    <div className="sticky top-[96px] z-30 bg-[#0A0F1E]/96 border-b border-[#1E293B] backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">

          {/* ── Location ─────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <MapPin size={12} className="text-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Location</span>
          </div>
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {LOCATIONS.map(loc => (
              <Pill
                key={loc}
                label={loc === 'All' ? 'All' : loc}
                active={filters.location === loc}
                color="blue"
                onClick={() => set('location', loc)}
              />
            ))}
          </div>

          {/* ── Divider ──────────────────────────────── */}
          <div className="hidden lg:block w-px h-5 bg-[#1E293B] flex-shrink-0" />

          {/* ── Month ────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar size={12} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Period</span>
          </div>
          <div className="flex gap-1">
            {MONTHS.map(m => (
              <Pill
                key={m}
                label={m === 'All' ? 'All' : m}
                active={filters.month === m}
                color="emerald"
                onClick={() => set('month', m)}
              />
            ))}
          </div>

          {/* ── Active filter summary + clear ────────── */}
          {isFiltered && (
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span className="text-xs text-gray-500">
                {filters.location !== 'All' && <span className="text-blue-400">{filters.location}</span>}
                {filters.location !== 'All' && filters.month !== 'All' && <span className="text-gray-600"> · </span>}
                {filters.month !== 'All' && <span className="text-emerald-400">{MONTH_LABELS[filters.month]}</span>}
              </span>
              <button
                onClick={clear}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
              >
                <X size={10} />
                Clear
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default FilterBar
