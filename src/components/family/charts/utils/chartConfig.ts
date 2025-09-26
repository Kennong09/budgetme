import { colorSystem } from './colorSystem';

// Base chart configuration for consistent styling
export const baseChartConfig = {
  chart: {
    backgroundColor: colorSystem.background.transparent,
    borderRadius: 10,
    height: 400,
    style: {
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  },
  title: {
    style: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#5a5c69'
    }
  },
  subtitle: {
    style: {
      fontSize: '12px',
      color: '#858796'
    }
  },
  credits: {
    enabled: false
  }
};

// Gauge-specific configuration
export const gaugeConfig = {
  ...baseChartConfig,
  chart: {
    ...baseChartConfig.chart,
    type: 'solidgauge',
    margin: [0, 0, 0, 0]
  },
  pane: {
    center: ['50%', '70%'],
    size: '80%',
    startAngle: -90,
    endAngle: 90,
    background: {
      backgroundColor: colorSystem.background.light,
      innerRadius: '60%',
      outerRadius: '100%',
      shape: 'arc'
    }
  },
  yAxis: {
    min: 0,
    max: 100,
    lineWidth: 0,
    tickWidth: 0,
    minorTickInterval: null,
    tickAmount: 2,
    labels: {
      y: 16,
      style: {
        fontSize: '12px'
      }
    }
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: 5,
        borderWidth: 0,
        useHTML: true,
        style: {
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white'
        }
      },
      animation: {
        duration: 1500
      }
    }
  }
};

// Tooltip configuration
export const tooltipConfig = {
  enabled: true,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderWidth: 1,
  borderRadius: 8,
  shadow: true,
  useHTML: true
};

// KPI Card styling constants
export const kpiCardStyles = {
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#5a5c69'
  },
  value: {
    fontSize: '24px',
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: '12px'
  },
  progressBar: {
    height: '4px'
  },
  spacing: {
    cardPadding: '15px',
    cardMargin: '12px',
    cardMinHeight: 'auto'
  }
};

// Layout dimensions
export const layoutDimensions = {
  container: {
    height: '400px',
    splitRatio: '50-50'
  },
  leftSection: {
    width: '50%'
  },
  rightSection: {
    width: '50%'
  },
  responsiveBreakpoints: {
    mobile: '768px',
    tablet: '1024px'
  }
};

export default {
  baseChartConfig,
  gaugeConfig,
  tooltipConfig,
  kpiCardStyles,
  layoutDimensions
};