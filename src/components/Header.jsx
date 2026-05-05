import React, { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import config from '../config'

const Header = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const dateStr = now.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="sticky top-0 z-50 bg-[#0A0F1E]/95 border-b border-[#1E293B] backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-white rounded-lg px-2 py-1">
              <img
                src={config.university.logo}
                alt={`${config.university.shortName} Logo`}
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block w-px h-7 bg-[#1E293B]" />
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{config.university.shortName}</p>
                <span className="text-xs text-gray-500 font-medium">{config.university.institute}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{config.dashboard.title}</p>
            </div>
          </div>

          {/* Right — powered-by + clock + live badge */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Powered by URUS AI — desktop only */}
            <div className="hidden lg:flex items-center gap-2 pr-2 border-r border-[#1E293B]">
              <div className="bg-white rounded-md px-1.5 py-0.5 flex-shrink-0">
                <img
                  src="/urus-ai-logo.png"
                  alt="URUS AI"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="leading-none">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Powered by</p>
                <p className="text-[11px] font-semibold text-gray-300 tracking-wide">URUS AI SDN BHD</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-gray-500">
              <Activity size={12} />
              <span className="text-xs">{config.dashboard.period}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-gray-500 text-right">{dateStr}</p>
              <p className="text-xs font-mono text-gray-300 text-right">{timeStr}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              <span className="text-xs font-semibold text-emerald-400">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
