import React, { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Tooltip as LeafletTooltip } from 'react-leaflet'
import { Layers } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// â”€â”€â”€ Campus locations (from Location_Master.csv) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOCATIONS = [
  { name: 'Admin Block',         lat: 1.4651, lng: 110.4272 },
  { name: 'Engineering Faculty', lat: 1.4635, lng: 110.4290 },
  { name: 'Campus Lake',         lat: 1.4620, lng: 110.4250 },
  { name: 'Main Gate',           lat: 1.4680, lng: 110.4310 },
  { name: 'Cafeteria',           lat: 1.4640, lng: 110.4265 },
  { name: 'Colleges',            lat: 1.4610, lng: 110.4240 },
]

const CAMPUS_CENTER = [1.4645, 110.4270]
const DEFAULT_ZOOM  = 16

const STATUS_COLOR = { normal: '#22C55E', warning: '#F59E0B', critical: '#EF4444' }

const aqiColor  = v => v <= 50 ? '#22C55E' : v <= 100 ? '#F59E0B' : '#EF4444'
const aqiLabel  = v => v <= 50 ? 'Good' : v <= 100 ? 'Moderate' : v <= 150 ? 'Unhealthy' : 'Hazardous'
const wasteColor = v => v >= 90 ? '#EF4444' : v >= 70 ? '#F59E0B' : '#22C55E'
const energyColor = v => v >= 170 ? '#EF4444' : v >= 130 ? '#F59E0B' : '#3B82F6'
const dotColor  = s => s === 'Normal' || s === 'Good' || s === 'OK' ? '#22C55E'
                    : s === 'Warning' ? '#F59E0B'
                    : s === 'High' || s === 'Critical' ? '#EF4444'
                    : '#6B7280'

const isRecoveredWasteAlert = (alert, latestWaste) => {
  const type = String(alert?.Incident_Type || '').toLowerCase()
  return type.includes('waste') && type.includes('full') && latestWaste?.Status === 'OK'
}

const OVERLAYS = {
  aqi: {
    label: 'AQI',
    value: loc => loc.aqi,
    color: aqiColor,
    radius: value => value * 1.4,
    display: value => `${value} AQI - ${aqiLabel(value)}`,
  },
  waste: {
    label: 'Waste Fill',
    value: loc => loc.fillLevel,
    color: wasteColor,
    radius: value => 35 + value * 1.2,
    display: (value, loc) => `${value}% full - ${loc.wasteStatus || 'No status'}`,
  },
  energy: {
    label: 'Energy Load',
    value: loc => loc.energyKW,
    color: energyColor,
    radius: value => 35 + value * 0.9,
    display: (value, loc) => `${value} kW - ${loc.energyStatus || 'No status'}`,
  },
}

// â”€â”€â”€ Per-location sensor summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildLocationData(data) {
  const { air = [], energy = [], water = [], waste = [], soil = [], alerts = [] } = data

  // Helper: latest row by Date for a given location key
  const latest = (rows, locKey, locName) => {
    const filtered = rows.filter(r => r[locKey] === locName)
    if (!filtered.length) return null
    return filtered.reduce((a, b) => (a.Date > b.Date ? a : b))
  }

  return LOCATIONS.map(loc => {
    const latestAir    = latest(air,    'Location', loc.name)
    const latestEnergy = latest(energy, 'Building', loc.name)
    const latestWater  = latest(water,  'Location', loc.name)
    const latestWaste  = latest(waste,  'Location', loc.name)
    const latestSoil   = latest(soil,   'Location', loc.name)

    // Active (unresolved) alerts for this location
    const activeAlerts = alerts.filter(
      a => a.Location === loc.name &&
        a.Status !== 'Resolved' &&
        !isRecoveredWasteAlert(a, latestWaste)
    )
    const hasCritical = activeAlerts.some(a => a.Severity === 'Critical')
    const hasWarning  = activeAlerts.length > 0

    // Sensor-level warnings
    const sensorWarning = [
      latestAir?.Status, latestEnergy?.Status,
      latestWater?.Status, latestWaste?.Status,
    ].some(s => s === 'Warning' || s === 'High')

    const sensorCritical = [
      latestAir?.Status, latestWater?.Status,
    ].some(s => s === 'Critical')

    let status = 'normal'
    if (hasCritical || sensorCritical) status = 'critical'
    else if (hasWarning || sensorWarning)  status = 'warning'

    return {
      ...loc,
      status,
      aqi:          latestAir?.AQI,
      pm25:         latestAir?.['PM2.5'],
      airStatus:    latestAir?.Status,
      energyKW:     latestEnergy?.Power_kW,
      energyStatus: latestEnergy?.Status,
      waterPH:      latestWater?.pH,
      waterStatus:  latestWater?.Status,
      fillLevel:    latestWaste?.Fill_Level,
      wasteStatus:  latestWaste?.Status,
      moisture:     latestSoil?.Moisture_Percentage,
      soilStatus:   latestSoil?.Health_Status,
      activeAlerts,
    }
  })
}

// â”€â”€â”€ Popup content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PopupRow = ({ label, value, color }) => value != null ? (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
    <span style={{ color: '#9CA3AF', fontSize: 11 }}>{label}</span>
    <span style={{ color: color || '#F8FAFC', fontWeight: 600, fontSize: 11 }}>{value}</span>
  </div>
) : null

const LocationPopup = ({ loc }) => (
  <div style={{
    minWidth: 210, fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    background: '#1E293B', color: '#F8FAFC', padding: '10px 12px', borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[loc.status], flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 13, color: STATUS_COLOR[loc.status] }}>{loc.name}</span>
    </div>

    {/* Sensor rows */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 8 }}>
      <PopupRow label="AQI"        value={loc.aqi      != null ? `${loc.aqi} - ${aqiLabel(loc.aqi)}` : null} color={loc.aqi ? aqiColor(loc.aqi) : null} />
      <PopupRow label="PM2.5"      value={loc.pm25     != null ? `${loc.pm25} ug/m3` : null} color={dotColor(loc.airStatus)} />
      <PopupRow label="Energy"     value={loc.energyKW != null ? `${loc.energyKW} kW - ${loc.energyStatus}` : null} color={dotColor(loc.energyStatus)} />
      <PopupRow label="Water pH"   value={loc.waterPH  != null ? `${loc.waterPH} - ${loc.waterStatus}` : null} color={dotColor(loc.waterStatus)} />
      <PopupRow label="Bin Fill"   value={loc.fillLevel!= null ? `${loc.fillLevel}% - ${loc.wasteStatus}` : null} color={dotColor(loc.wasteStatus)} />
      <PopupRow label="Soil"       value={loc.moisture != null ? `${loc.moisture}% - ${loc.soilStatus}` : null} color={dotColor(loc.soilStatus)} />
    </div>

    {/* Alerts */}
    {loc.activeAlerts.length > 0 ? (
      <div style={{ background: '#450a0a', borderRadius: 6, padding: '5px 8px' }}>
        <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 11, marginBottom: 3 }}>Warning: {loc.activeAlerts.length} Active Alert{loc.activeAlerts.length > 1 ? 's' : ''}</div>
        {loc.activeAlerts.map((a, i) => (
          <div key={i} style={{ color: '#FCA5A5', fontSize: 10, lineHeight: 1.5 }}>
            {a.Incident_Type} - <span style={{ color: a.Severity === 'Critical' ? '#EF4444' : '#F59E0B' }}>{a.Severity}</span> - {a.Status}
          </div>
        ))}
      </div>
    ) : (
      <div style={{ color: '#22C55E', fontSize: 11 }}>No active alerts</div>
    )}
  </div>
)

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CampusMap = ({ data, filters }) => {
  const [overlayMode, setOverlayMode] = useState('off')
  const locationData  = useMemo(() => buildLocationData(data), [data])
  const selectedLoc   = filters?.location !== 'All' ? filters?.location : null
  const activeOverlay = OVERLAYS[overlayMode]

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#1E293B]" style={{ height: 420 }}>
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={true}
        scrollWheelZoom={true}
      >
        {/* Dark CartoDB tiles â€” no API key needed */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Metric overlay circles sized to the selected value */}
        {activeOverlay && locationData.map(loc => {
          const value = activeOverlay.value(loc)
          return value != null && (
            <Circle
              key={`${overlayMode}-${loc.name}`}
              center={[loc.lat, loc.lng]}
              radius={activeOverlay.radius(value)}
              pathOptions={{
                color: activeOverlay.color(value),
                fillColor: activeOverlay.color(value),
                fillOpacity: 0.18, weight: 1, opacity: 0.5,
              }}
              interactive={true}
            >
              <LeafletTooltip sticky direction="top" opacity={0.95}>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontWeight: 700, color: activeOverlay.color(value), marginBottom: 2 }}>{loc.name}</div>
                  <div>{activeOverlay.label}: {activeOverlay.display(value, loc)}</div>
                </div>
              </LeafletTooltip>
            </Circle>
          )
        })}

        {/* Selection ring â€” pulsing outer circle around the selected location */}
        {selectedLoc && locationData.filter(l => l.name === selectedLoc).map(loc => (
          <Circle
            key={`sel-${loc.name}`}
            center={[loc.lat, loc.lng]}
            radius={28}
            pathOptions={{
              color: STATUS_COLOR[loc.status],
              fillColor: 'transparent',
              fillOpacity: 0,
              weight: 2,
              opacity: 0.6,
              dashArray: '4 4',
            }}
          />
        ))}

        {/* Location markers */}
        {locationData.map(loc => {
          const isSelected = selectedLoc === loc.name
          const isDimmed   = selectedLoc != null && !isSelected
          return (
            <CircleMarker
              key={loc.name}
              center={[loc.lat, loc.lng]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                color: isSelected ? STATUS_COLOR[loc.status] : '#0A0F1E',
                fillColor: STATUS_COLOR[loc.status],
                fillOpacity: isDimmed ? 0.28 : 0.92,
                weight: isSelected ? 3 : 2.5,
              }}
            >
              <Popup minWidth={220} className="esg-popup" closeButton={true}>
                <LocationPopup loc={loc} />
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Selected-location badge */}
      {selectedLoc && (
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-lg backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          {selectedLoc}
        </div>
      )}

      {/* Metric overlay selector */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 rounded-lg border border-[#334155] bg-[#1e293b]/90 p-1 shadow-lg backdrop-blur">
        <Layers size={12} className="ml-1 text-gray-500" />
        {[
          ['off', 'Off'],
          ['aqi', 'AQI'],
          ['waste', 'Waste'],
          ['energy', 'Energy'],
        ].map(([mode, label]) => {
          const active = overlayMode === mode
          return (
            <button
              key={mode}
              onClick={() => setOverlayMode(mode)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                active
                  ? 'bg-amber-500/25 text-amber-300'
                  : 'text-gray-400 hover:bg-[#334155] hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-7 left-3 z-[1000] bg-[#1e293b]/90 backdrop-blur border border-[#334155] rounded-lg px-3 py-2 flex items-center gap-4 shadow-lg">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          {activeOverlay ? activeOverlay.label : 'Status'}
        </span>
        {(overlayMode === 'energy'
          ? [['#3B82F6','Low'],['#F59E0B','Medium'],['#EF4444','High']]
          : [['#22C55E','Normal'],['#F59E0B','Warning'],['#EF4444','Critical']]
        ).map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-[#0A0F1E]" style={{ background: c }} />
            <span className="text-xs text-gray-400">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CampusMap



