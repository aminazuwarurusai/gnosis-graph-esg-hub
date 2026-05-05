import React from 'react'
import { LayoutDashboard, Zap, Wind, Droplets, Trash2, Leaf, Bell } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview',      icon: LayoutDashboard },
  { id: 'energy',   label: 'Energy',        icon: Zap             },
  { id: 'air',      label: 'Air Quality',   icon: Wind            },
  { id: 'water',    label: 'Water',         icon: Droplets        },
  { id: 'waste',    label: 'Waste',         icon: Trash2          },
  { id: 'soil',     label: 'Soil',          icon: Leaf            },
  { id: 'alerts',   label: 'Alert Centre',  icon: Bell            },
]

const TabNav = ({ activeTab, setActiveTab, alertCount = 0 }) => (
  <nav className="sticky top-14 z-40 bg-[#0A0F1E]/95 border-b border-[#1E293B] backdrop-blur-md">
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
      <div className="flex gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                active
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
              }`}
            >
              <Icon size={13} />
              {label}
              {id === 'alerts' && alertCount > 0 && (
                <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  </nav>
)

export default TabNav
