import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import solidGauge from 'highcharts/modules/solid-gauge';

// Initialize Highcharts modules
solidGauge(Highcharts);

interface ProgressGaugeProps {
  value: number;
  title: string;
  subtitle?: string;
  maxValue?: number;
  color?: string;
  height?: string;
  chartRef?: React.RefObject<HighchartsReact.RefObject>;
  showTooltip?: boolean;
  tooltipFormatter?: () => string;
}

export const ProgressGauge: React.FC<ProgressGaugeProps> = ({
  value,
  title,
  subtitle,
  maxValue = 100,
  color,
  height = '400px',
  chartRef,
  showTooltip = true,
  tooltipFormatter
}) => {
  // Determine color based on value if not provided
  const getStatusColor = (val: number) => {
    if (val >= 90) return '#1cc88a'; // Green
    if (val >= 75) return '#4e73df'; // Blue
    if (val >= 50) return '#f6c23e'; // Yellow
    return '#e74a3b'; // Red
  };

  const gaugeColor = color || getStatusColor(value);

  const chartOptions = {
    chart: {
      type: 'solidgauge',
      height: height,
      backgroundColor: 'transparent',
      margin: [0, 0, 0, 0]
    },
    title: {
      text: title,
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#5a5c69'
      },
      y: 40
    },
    subtitle: subtitle ? {
      text: subtitle,
      style: {
        fontSize: '12px',
        color: '#858796'
      }
    } : undefined,
    pane: {
      center: ['50%', '70%'],
      size: '80%',
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor: '#f8f9fc',
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    tooltip: {
      enabled: showTooltip,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      useHTML: true,
      formatter: tooltipFormatter || function() {
        return `
          <div style="padding: 10px;">
            <strong>${title}</strong><br/>
            <strong>Score:</strong> ${value}/${maxValue}<br/>
            <strong>Progress:</strong> ${((value / maxValue) * 100).toFixed(1)}%
          </div>
        `;
      }
    },
    yAxis: {
      min: 0,
      max: maxValue,
      title: {
        text: '',
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          color: gaugeColor
        },
        y: 60
      },
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
          },
          format: `<div style="text-align:center"><div style="background: linear-gradient(135deg, ${gaugeColor} 0%, ${gaugeColor}dd 100%);color:white;padding:12px 16px;border-radius:20px;font-weight:600;box-shadow:0 8px 25px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.1);display:inline-block;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);"><div style="font-size:24px;line-height:0.9;font-weight:700;margin-bottom:2px;text-shadow:0 1px 2px rgba(0,0,0,0.2)">{y}</div><div style="font-size:10px;line-height:1;opacity:0.9;font-weight:500;letter-spacing:0.5px;text-transform:uppercase">out of ${maxValue}</div></div></div>`
        },
        animation: {
          duration: 1500
        }
      }
    },
    series: [{
      name: title,
      data: [{
        y: Math.round(value),
        color: gaugeColor
      }],
      tooltip: {
        valueSuffix: ` / ${maxValue}`
      }
    }],
    credits: {
      enabled: false
    }
  };

  return (
    <HighchartsReact 
      highcharts={Highcharts} 
      options={chartOptions}
      ref={chartRef} 
    />
  );
};

export default ProgressGauge;