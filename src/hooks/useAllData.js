import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import config from '../config'

/** In-memory cache so re-mounting a tab never re-fetches */
const _cache = {}

async function fetchCSV(filename) {
  if (_cache[filename]) return _cache[filename]
  const res = await fetch(`${config.dashboard.dataPath}/${filename}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${filename}`)
  const text = await res.text()
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,   // auto-converts numeric strings
  })
  _cache[filename] = data
  return data
}

/**
 * Loads all 8 CSV files in parallel.
 * Returns { data: { energy, air, water, waste, soil, alerts, smartGrid, locations }, loading, error }
 */
export function useAllData() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const f = config.csvFiles
        const [energy, air, water, waste, soil, alerts, smartGrid, locations] =
          await Promise.all([
            fetchCSV(f.energy),
            fetchCSV(f.air),
            fetchCSV(f.water),
            fetchCSV(f.waste),
            fetchCSV(f.soil),
            fetchCSV(f.alerts),
            fetchCSV(f.smartGrid),
            fetchCSV(f.locations),
          ])
        setData({ energy, air, water, waste, soil, alerts, smartGrid, locations })
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { data, loading, error }
}
