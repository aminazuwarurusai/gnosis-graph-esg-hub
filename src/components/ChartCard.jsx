import React from 'react'

/**
 * Standardised wrapper card for all Recharts containers.
 */
const ChartCard = ({ title, subtitle, children, className = '', action }) => (
  <div className={`bg-[#111827] border border-[#1E293B] rounded-xl p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between mb-1">
        <div>
          {title && <h3 className="text-sm font-semibold text-gray-300">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0 ml-2">{action}</div>}
      </div>
    )}
    <div className={title || subtitle ? 'mt-4' : ''}>{children}</div>
  </div>
)

export default ChartCard
