import React from 'react'
import config from '../config'

const LoadingScreen = ({ error }) => (
  <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center gap-6">
    {/* Logo / icon */}
    <div className="bg-white rounded-xl px-4 py-2.5 shadow-lg">
      <img
        src={config.university.logo}
        alt={config.university.shortName}
        className="h-10 w-auto object-contain"
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    </div>

    {error ? (
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <p className="text-red-400 font-semibold text-sm">Failed to load sensor data</p>
        <p className="text-gray-500 text-xs">{error}</p>
        <p className="text-gray-600 text-xs">Ensure CSV files are present in <code className="text-gray-400">/public/data/</code></p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3">
        {/* Indeterminate sliding progress bar */}
        <div className="w-52 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-emerald-500 rounded-full" style={{ animation: 'loadingBar 1.4s ease-in-out infinite' }} />
        </div>
        <p className="text-gray-400 text-sm">
          {config.university.shortName} — Loading sensor data…
        </p>
        <p className="text-gray-600 text-xs">{config.dashboard.period}</p>
      </div>
    )}
  </div>
)

export default LoadingScreen
