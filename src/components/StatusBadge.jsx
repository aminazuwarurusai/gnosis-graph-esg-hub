import React from 'react'
import { statusBadge } from '../utils/dataUtils'

const VARIANTS = {
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  red:   'bg-red-500/15  text-red-400   border-red-500/30',
  blue:  'bg-cyan-500/15 text-cyan-400  border-cyan-500/30',
  gray:  'bg-gray-700    text-gray-300  border-gray-600',
}

/**
 * Color-coded status badge.
 * @param {string} status - Raw status string from CSV
 * @param {string} variant - Override auto-detected variant
 */
const StatusBadge = ({ status, variant }) => {
  const v = variant || statusBadge(status)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${VARIANTS[v] || VARIANTS.gray}`}>
      {status}
    </span>
  )
}

export default StatusBadge
