/**
 * Pure data-processing utilities — no side effects.
 * Used by all tab components to transform raw CSV rows into chart data.
 */

export const sum  = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0)
export const avg  = arr => (arr.length ? sum(arr) / arr.length : 0)
export const round = (n, d = 1) => Number(Number(n).toFixed(d))

/** Format number with locale commas — returns '—' for nullish/NaN */
export const fmt = (n, d = 0) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-MY', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

/** Group array by key → { key: [items] } */
export const groupBy = (data, key) =>
  (data || []).reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key]
    if (k !== undefined && k !== null) { acc[k] = acc[k] || []; acc[k].push(item) }
    return acc
  }, {})

/** Count occurrences of each value → { value: count } */
export const countBy = (data, key) =>
  (data || []).reduce((acc, item) => {
    const v = item[key]
    if (v !== undefined && v !== null) acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})

/** Extract month number 1–12 from "YYYY-MM-DD" */
export const getMonthNum = dateStr => {
  const m = String(dateStr || '').split('-')[1]
  return m ? parseInt(m, 10) : null
}

const MON_LABELS = { 1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun',
                     7:'Jul', 8:'Aug', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec' }

/** Aggregate data by month → [{month, avg, sum, count}] for months 1–3 */
export const aggregateByMonth = (data, dateKey, valueKey) => {
  const byMonth = groupBy(data, row => getMonthNum(row[dateKey]))
  return [1, 2, 3].map(m => {
    const rows   = byMonth[m] || []
    const values = rows.map(r => r[valueKey]).filter(v => v !== null && !isNaN(v))
    return {
      month: MON_LABELS[m] || `M${m}`,
      avg:   round(avg(values)),
      sum:   round(sum(values), 0),
      count: values.length,
    }
  })
}

/** Aggregate by location, averaging or summing a numeric column */
export const aggregateByLocation = (data, locKey, valueKey, mode = 'avg') => {
  const byLoc = groupBy(data, locKey)
  return Object.entries(byLoc).map(([location, rows]) => {
    const values = rows.map(r => r[valueKey]).filter(v => v !== null && !isNaN(v))
    return {
      location,
      value: round(mode === 'sum' ? sum(values) : avg(values)),
    }
  })
}

/** Aggregate single value by date → [{date, value}] with optional row sampling */
export const aggregateByDate = (data, dateKey, valueKey, sampleEvery = 1) => {
  const byDate = groupBy(data, dateKey)
  return Object.keys(byDate)
    .sort()
    .filter((_, i) => i % sampleEvery === 0)
    .map(date => {
      const rows   = byDate[date]
      const values = rows.map(r => r[valueKey]).filter(v => v !== null && !isNaN(v))
      return { date: date.substring(5), value: round(avg(values)) }
    })
}

/**
 * Pivot daily CSV data for multi-line charts.
 * From: [{Date, Building, Power_kW}, ...]
 * To:   [{date, 'Admin Block': 131, 'Engineering Faculty': 145, ...}]
 */
export const pivotByDate = (data, dateKey, categoryKey, valueKey, sampleEvery = 1) => {
  const byDate = groupBy(data, dateKey)
  return Object.keys(byDate)
    .sort()
    .filter((_, i) => i % sampleEvery === 0)
    .map(date => {
      const entry = { date: date.substring(5) } // strip year "2026-"
      byDate[date].forEach(row => { entry[row[categoryKey]] = row[valueKey] })
      return entry
    })
}

/** Convert countBy result → pie chart array [{name, value, fill}] */
export const toPieData = (countObj, colorMap = {}) => {
  const defaults = ['#22C55E','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#F97316']
  return Object.entries(countObj).map(([name, value], i) => ({
    name, value,
    fill: colorMap[name] || defaults[i % defaults.length],
  }))
}

/** Month name → number map for filter logic */
export const MONTH_NUM = { All: null, Jan: 1, Feb: 2, Mar: 3 }

/**
 * Filter rows by location and/or month.
 * @param {array}   rows        - raw CSV rows
 * @param {object}  filters     - { location, month }
 * @param {string|null} locationKey - column name for location, or null to skip location filtering
 * @param {string}  dateKey     - column name for date (e.g. 'Date')
 */
export const filterRows = (rows, filters, locationKey = null, dateKey = 'Date') => {
  let r = rows || []
  if (locationKey && filters?.location && filters.location !== 'All')
    r = r.filter(row => row[locationKey] === filters.location)
  if (filters?.month && filters.month !== 'All')
    r = r.filter(row => getMonthNum(row[dateKey]) === MONTH_NUM[filters.month])
  return r
}

/** Filter alert rows (timestamp format: "D/M/YYYY HH:MM") */
export const filterAlerts = (rows, filters) => {
  let r = rows || []
  if (filters?.location && filters.location !== 'All')
    r = r.filter(row => row.Location === filters.location)
  if (filters?.month && filters.month !== 'All') {
    const m = MONTH_NUM[filters.month]
    r = r.filter(row => {
      const parts = String(row.Timestamp || '').split('/')
      return parts.length >= 2 && parseInt(parts[1], 10) === m
    })
  }
  return r
}

/** Hex fill color for a status string */
export const statusColor = status => {
  const s = String(status || '').toLowerCase()
  if (['normal','good','ok','resolved','idle'].includes(s))           return '#22C55E'
  if (['warning','moderate','near full','wet','assigned'].includes(s)) return '#F59E0B'
  if (['critical','full','high','danger','dry'].includes(s))           return '#EF4444'
  if (['on route'].includes(s))                                        return '#06B6D4'
  return '#6B7280'
}

/** Tailwind badge variant for a status string */
export const statusBadge = status => {
  const s = String(status || '').toLowerCase()
  if (['normal','good','ok','resolved','idle'].includes(s))           return 'green'
  if (['warning','moderate','near full','wet','assigned'].includes(s)) return 'amber'
  if (['critical','full','high','danger','dry'].includes(s))           return 'red'
  if (['on route'].includes(s))                                        return 'blue'
  return 'gray'
}
