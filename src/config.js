/**
 * University configuration — edit this file to deploy to a new university.
 * All university-specific values live here; components read from this object.
 */
const config = {
  university: {
    name: 'Universiti Malaysia Sarawak',
    shortName: 'UNIMAS',
    institute: 'ISuRE',
    instituteFullName: 'Institute of Sustainable and Renewable Energy',
    campus: 'Kota Samarahan, Sarawak, Malaysia',
    logo: '/unimas-logo.png',   // replace with new logo path when deploying to another university
  },
  dashboard: {
    title: 'Smart Campus ESG Dashboard',
    subtitle: 'Environmental · Social · Governance',
    version: '1.0.0',
    dataPath: '/data',        // Path to CSV files in /public
    period: 'Q1 2026 (Jan – Mar)',
  },
  theme: {
    colors: {
      // Semantic
      good: '#22C55E',
      warning: '#F59E0B',
      critical: '#EF4444',
      // Domain
      energy: '#3B82F6',
      air: '#06B6D4',
      water: '#6366F1',
      waste: '#F97316',
      soil: '#84CC16',
      solar: '#FBBF24',
      // Surface
      bg: '#0A0F1E',
      panel: '#111827',
      border: '#1E293B',
      borderLight: '#374151',
      textMuted: '#6B7280',
      // Chart rotation palette
      palette: ['#22C55E', '#06B6D4', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#F97316'],
    },
  },
  csvFiles: {
    energy:    'UNIMAS_Energy_Expanded.csv',
    air:       'UNIMAS_Air_Expanded.csv',
    water:     'UNIMAS_Water_Expanded.csv',
    waste:     'UNIMAS_Waste_Expanded.csv',
    soil:      'UNIMAS_Soil_Moisture.csv',
    alerts:    'UNIMAS_Alert_Center.csv',
    smartGrid: 'UNIMAS_Smart_Grid.csv',
    locations: 'UNIMAS_Location_Master.csv',
  },
  // Pre-calculated ESG scores for gauge/radar
  esgScore: {
    composite: 75,
    energy: 78,
    air: 72,
    water: 70,
    waste: 68,
    soil: 82,
  },
}

export default config
