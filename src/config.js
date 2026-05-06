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
  esgScoring: {
    note: 'Scores are configured for the current dashboard and should be recalculated when the scoring model changes.',
    composite: {
      formula: [
        { metric: 'Energy score', weight: 25 },
        { metric: 'Air quality score', weight: 20 },
        { metric: 'Water quality score', weight: 20 },
        { metric: 'Waste management score', weight: 20 },
        { metric: 'Soil health score', weight: 15 },
      ],
      explanation: 'Composite ESG score is a weighted average of the configured domain scores.',
    },
    energy: {
      formula: [
        { metric: 'Grid efficiency performance', weight: 35 },
        { metric: 'Solar share against 30% target', weight: 30 },
        { metric: 'Building consumption performance', weight: 20 },
        { metric: 'Estimated Scope 2 emissions performance', weight: 15 },
      ],
      methodology: [
        'Grid efficiency performance',
        'Solar share against the 30% renewable energy target',
        'Total electricity consumption by building',
        'Estimated Scope 2 carbon emissions',
      ],
      explanation: 'Energy score is driven by high grid efficiency and renewable contribution, with deductions when solar share is below target or consumption remains high.',
    },
    air: {
      formula: [
        { metric: 'Average AQI performance', weight: 40 },
        { metric: 'PM2.5 performance', weight: 25 },
        { metric: 'CO2 performance', weight: 20 },
        { metric: 'Good/moderate/unhealthy status distribution', weight: 15 },
      ],
      methodology: [
        'Average AQI level',
        'PM2.5 concentration',
        'CO2 concentration',
        'Share of readings by air quality status',
      ],
      explanation: 'Air score reflects AQI and pollutant readings across monitored campus locations.',
    },
    water: {
      formula: [
        { metric: 'Normal water status share', weight: 35 },
        { metric: 'pH range performance', weight: 25 },
        { metric: 'Dissolved oxygen performance', weight: 25 },
        { metric: 'Turbidity and conductivity performance', weight: 15 },
      ],
      methodology: [
        'Share of normal water quality readings',
        'pH performance against safe range',
        'Dissolved oxygen level',
        'Turbidity and conductivity readings',
      ],
      explanation: 'Water score reflects how consistently readings remain within safe operating ranges.',
    },
    waste: {
      formula: [
        { metric: 'Average fill level performance', weight: 35 },
        { metric: 'Full bin count performance', weight: 25 },
        { metric: 'Near-full bin count performance', weight: 20 },
        { metric: 'Bin temperature and collection risk', weight: 20 },
      ],
      methodology: [
        'Average bin fill level',
        'Number of full and near-full bins',
        'Waste collection risk by location',
        'Bin temperature trend',
      ],
      explanation: 'Waste score decreases when more bins are full or near full and when collection risk rises.',
    },
    soil: {
      formula: [
        { metric: 'Normal moisture status share', weight: 45 },
        { metric: 'Dry reading risk', weight: 25 },
        { metric: 'Wet reading risk', weight: 15 },
        { metric: 'Irrigation status performance', weight: 15 },
      ],
      methodology: [
        'Share of normal soil moisture readings',
        'Wet and dry reading distribution',
        'Irrigation status',
      ],
      explanation: 'Soil score reflects moisture stability and irrigation health for monitored areas.',
    },
  },
}

export default config
