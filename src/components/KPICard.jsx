import React from 'react'

/**
 * Reusable KPI metric card.
 * @param {string}  title       - Short label above the value
 * @param {*}       value       - Primary numeric/text value
 * @param {string}  unit        - Unit suffix (kWh, %, etc.)
 * @param {string}  subtitle    - Secondary description line
 * @param {string}  color       - Hex accent color
 * @param {React.ElementType} icon  - Lucide icon component
 * @param {object}  trend       - { value, label, up } optional trend line
 */
const KPICard = ({ title, value, unit, subtitle, color = '#22C55E', icon: Icon, trend, className = '' }) => (
  <div className={`bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-2 ${className}`}>
    <div className="flex items-start justify-between">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium leading-tight">{title}</p>
      {Icon && (
        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon size={14} style={{ color }} />
        </div>
      )}
    </div>
    <div className="flex items-end gap-1 mt-1">
      <span className="text-2xl font-bold text-white leading-none">{value}</span>
      {unit && <span className="text-sm text-gray-400 mb-0.5 leading-none">{unit}</span>}
    </div>
    {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
    {trend && (
      <div className="flex items-center gap-1 mt-auto pt-1 border-t border-[#1E293B]">
        <span className="text-xs font-medium" style={{ color: trend.up ? '#22C55E' : '#EF4444' }}>
          {trend.up ? '▲' : '▼'} {trend.value}
        </span>
        <span className="text-xs text-gray-500">{trend.label}</span>
      </div>
    )}
  </div>
)

export default KPICard
