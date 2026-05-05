import React, { useState } from 'react'
import { useAllData }   from './hooks/useAllData'
import LoadingScreen    from './components/LoadingScreen'
import Header           from './components/Header'
import TabNav           from './components/TabNav'
import FilterBar        from './components/FilterBar'
import Overview         from './components/tabs/Overview'
import Energy           from './components/tabs/Energy'
import AirQuality       from './components/tabs/AirQuality'
import Water            from './components/tabs/Water'
import Waste            from './components/tabs/Waste'
import Soil             from './components/tabs/Soil'
import AlertCentre      from './components/tabs/AlertCentre'

const TAB_COMPONENTS = {
  overview: Overview,
  energy:   Energy,
  air:      AirQuality,
  water:    Water,
  waste:    Waste,
  soil:     Soil,
  alerts:   AlertCentre,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters]     = useState({ location: 'All', month: 'All' })
  const { data, loading, error }  = useAllData()

  if (loading || error) return <LoadingScreen error={error} />

  const ActiveComponent = TAB_COMPONENTS[activeTab] || Overview
  const alertCount      = (data?.alerts || []).filter(a => a.Status !== 'Resolved').length

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans">
      <Header />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alertCount} />
      <FilterBar filters={filters} setFilters={setFilters} />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-12">
        {/* key={} resets tab scroll position on tab switch */}
        <ActiveComponent data={data} filters={filters} key={activeTab} />
      </main>
    </div>
  )
}
