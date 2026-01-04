import { 
  SystemActivityData, 
  UserEngagementData, 
  FinancialSystemHealth, 
  AIMLAnalytics, 
  ChatbotAnalytics,
  AdminDashboardSummary 
} from '../hooks/useAdminReportsData';

export interface ProcessedReportData {
  chartData: any[];
  tableData: any[];
  summaryStats: { [key: string]: any };
}

export interface AdminReportTypeData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

// Process system activity data for charts and tables
export const processSystemActivityData = (
  activityData: SystemActivityData[]
): ProcessedReportData => {
  // Group by activity type for pie chart
  const activityTypeGroups: { [key: string]: number } = {};
  const dateGroups: { [key: string]: number } = {};
  
  activityData.forEach(item => {
    // Activity type distribution
    if (!activityTypeGroups[item.activity_type]) {
      activityTypeGroups[item.activity_type] = 0;
    }
    activityTypeGroups[item.activity_type] += item.count;
    
    // Daily activity for trend chart
    if (!dateGroups[item.activity_date]) {
      dateGroups[item.activity_date] = 0;
    }
    dateGroups[item.activity_date] += item.count;
  });
  
  // Chart data for activity type pie chart
  const chartData = Object.keys(activityTypeGroups).map((type, index) => ({
    name: formatActivityType(type),
    y: activityTypeGroups[type],
    color: getActivityTypeColor(type, index)
  }));
  
  // Table data for detailed breakdown
  const tableData = activityData.map(item => ({
    activity_type: formatActivityType(item.activity_type),
    count: item.count,
    activity_date: new Date(item.activity_date).toLocaleDateString(),
    severity: item.severity || 'info'
  }));
  
  // Summary statistics
  const totalActivities = Object.values(activityTypeGroups).reduce((sum, count) => sum + count, 0);
  const mostActiveType = Object.keys(activityTypeGroups).reduce((a, b) => 
    activityTypeGroups[a] > activityTypeGroups[b] ? a : b
  );
  
  return {
    chartData,
    tableData,
    summaryStats: {
      totalActivities,
      uniqueActivityTypes: Object.keys(activityTypeGroups).length,
      mostActiveType: formatActivityType(mostActiveType),
      avgDailyActivities: Math.round(totalActivities / Object.keys(dateGroups).length)
    }
  };
};

// Process user engagement data
export const processUserEngagementData = (
  engagementData: UserEngagementData
): ProcessedReportData => {
  // Chart data for user growth
  const chartData = [
    { name: 'Total Users', y: engagementData.total_users, color: '#4e73df' },
    { name: 'Active This Week', y: engagementData.active_users_week, color: '#1cc88a' },
    { name: 'Active This Month', y: engagementData.active_users_month, color: '#36b9cc' },
    { name: 'New Users Today', y: engagementData.new_users_today, color: '#f6c23e' }
  ];
  
  // Table data for engagement metrics
  const tableData = [
    { metric: 'Total Users', value: engagementData.total_users, change: '+' + engagementData.new_users_today + ' today' },
    { metric: 'Active Users (Week)', value: engagementData.active_users_week, change: calculatePercentage(engagementData.active_users_week, engagementData.total_users) + '% of total' },
    { metric: 'Active Users (Month)', value: engagementData.active_users_month, change: calculatePercentage(engagementData.active_users_month, engagementData.total_users) + '% of total' },
    { metric: 'New Users Today', value: engagementData.new_users_today, change: 'New registrations' }
  ];
  
  // Summary statistics
  const activeUserRate = calculatePercentage(engagementData.active_users_week, engagementData.total_users);
  const monthlyActiveRate = calculatePercentage(engagementData.active_users_month, engagementData.total_users);
  
  return {
    chartData,
    tableData,
    summaryStats: {
      totalUsers: engagementData.total_users,
      activeUserRate,
      monthlyActiveRate,
      newUsersToday: engagementData.new_users_today
    }
  };
};

// Process financial health data
export const processFinancialHealthData = (
  financialData: FinancialSystemHealth
): ProcessedReportData => {
  // Chart data for financial overview
  const chartData = [
    { name: 'Total Transactions', y: financialData.total_transactions, color: '#4e73df' },
    { name: 'Active Budgets', y: financialData.active_budgets, color: '#1cc88a' },
    { name: 'Active Goals', y: financialData.active_goals, color: '#36b9cc' },
    { name: 'Total Families', y: financialData.total_families, color: '#f6c23e' }
  ];
  
  // Table data for financial metrics
  const tableData = [
    { metric: 'Total Transactions', value: financialData.total_transactions, change: '+' + financialData.transactions_today + ' today' },
    { metric: 'Transactions This Week', value: financialData.transactions_week, change: 'weekly activity' },
    { metric: 'Active Budgets', value: financialData.active_budgets, change: 'currently active' },
    { metric: 'Active Goals', value: financialData.active_goals, change: 'in progress' },
    { metric: 'Total Families', value: financialData.total_families, change: 'registered families' },
    { metric: 'Avg Transaction', value: '$' + Number(financialData.avg_transaction_amount).toFixed(2), change: 'system average' }
  ];
  
  // Summary statistics
  const weeklyTransactionRate = financialData.total_transactions > 0 ? 
    (financialData.transactions_week / financialData.total_transactions) * 100 : 0;
  
  return {
    chartData,
    tableData,
    summaryStats: {
      totalTransactions: financialData.total_transactions,
      transactionsToday: financialData.transactions_today,
      transactionsWeek: financialData.transactions_week,
      activeBudgets: financialData.active_budgets,
      activeGoals: financialData.active_goals,
      totalFamilies: financialData.total_families,
      weeklyTransactionRate: Math.round(weeklyTransactionRate * 100) / 100,
      avgTransactionAmount: Number(financialData.avg_transaction_amount)
    }
  };
};

// Process AI/ML analytics data
export const processAIMLAnalyticsData = (
  aiData: AIMLAnalytics
): ProcessedReportData => {
  // Chart data for AI service usage
  const serviceData = Object.keys(aiData.ai_service_distribution).map((service, index) => ({
    name: service.charAt(0).toUpperCase() + service.slice(1),
    y: aiData.ai_service_distribution[service],
    color: getServiceColor(service, index)
  }));
  
  // Chart data for predictions vs insights
  const usageData = [
    { name: 'Predictions', y: aiData.total_predictions, color: '#4e73df' },
    { name: 'AI Insights', y: aiData.total_insights, color: '#1cc88a' }
  ];
  
  // Table data for AI metrics
  const tableData = [
    { metric: 'Total Predictions', value: aiData.total_predictions, change: '+' + aiData.predictions_today + ' today' },
    { metric: 'Total AI Insights', value: aiData.total_insights, change: '+' + aiData.insights_today + ' today' },
    { metric: 'Avg Confidence Score', value: (aiData.avg_confidence_score * 100).toFixed(1) + '%', change: 'system average' },
    { metric: 'Weekly Predictions', value: aiData.predictions_week, change: 'last 7 days' },
    { metric: 'Active AI Services', value: Object.keys(aiData.ai_service_distribution).length, change: 'service types' }
  ];
  
  return {
    chartData: serviceData.length > 0 ? serviceData : usageData,
    tableData,
    summaryStats: {
      totalPredictions: aiData.total_predictions,
      totalInsights: aiData.total_insights,
      predictionsToday: aiData.predictions_today,
      insightsToday: aiData.insights_today,
      avgConfidenceScore: aiData.avg_confidence_score,
      activeServices: Object.keys(aiData.ai_service_distribution).length
    }
  };
};

// Process chatbot analytics data
export const processChatbotAnalyticsData = (
  chatData: ChatbotAnalytics
): ProcessedReportData => {
  // Chart data for sentiment distribution
  const sentimentData = Object.keys(chatData.sentiment_distribution).map((sentiment, index) => ({
    name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    y: chatData.sentiment_distribution[sentiment],
    color: getSentimentColor(sentiment, index)
  }));
  
  // Chart data for session types
  const sessionTypeData = Object.keys(chatData.session_type_distribution).map((type, index) => ({
    name: formatSessionType(type),
    y: chatData.session_type_distribution[type],
    color: getSessionTypeColor(type, index)
  }));
  
  // Table data for chatbot metrics
  const tableData = [
    { metric: 'Total Sessions', value: chatData.total_sessions, change: 'all time' },
    { metric: 'Active Sessions', value: chatData.active_sessions, change: 'currently active' },
    { metric: 'Total Messages', value: chatData.total_messages, change: '+' + chatData.messages_today + ' today' },
    { metric: 'Messages Today', value: chatData.messages_today, change: 'today\'s activity' },
    { metric: 'Avg Satisfaction', value: chatData.avg_session_rating.toFixed(1) + '/5', change: 'user rating' }
  ];
  
  return {
    chartData: sentimentData.length > 0 ? sentimentData : sessionTypeData,
    tableData,
    summaryStats: {
      totalSessions: chatData.total_sessions,
      activeSessions: chatData.active_sessions,
      totalMessages: chatData.total_messages,
      messagesToday: chatData.messages_today,
      avgSatisfaction: chatData.avg_session_rating,
      sessionTypes: Object.keys(chatData.session_type_distribution).length,
      sentimentTypes: Object.keys(chatData.sentiment_distribution).length
    }
  };
};

// Utility functions
const formatActivityType = (type: string): string => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatSessionType = (type: string): string => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const calculatePercentage = (value: number, total: number): number => {
  return total > 0 ? Math.round((value / total) * 100) : 0;
};

const getActivityTypeColor = (type: string, index: number): string => {
  // Admin theme colors from admin.css
  const colors = ['#e74a3b', '#1cc88a', '#36b9cc', '#f6c23e', '#d52a1a', '#858796', '#5a5c69'];
  
  // Specific colors for common activity types using admin theme
  const typeColors: { [key: string]: string } = {
    'login': '#1cc88a',        // Admin success
    'logout': '#36b9cc',       // Admin info
    'transaction_created': '#e74a3b', // Admin primary
    'user_created': '#f6c23e', // Admin warning
    'admin_action': '#d52a1a', // Admin primary dark
    'error': '#e74a3b',        // Admin danger
    'system_event': '#858796'  // Admin secondary
  };
  
  return typeColors[type] || colors[index % colors.length];
};

const getServiceColor = (service: string, index: number): string => {
  // Admin theme colors
  const colors = ['#e74a3b', '#1cc88a', '#36b9cc', '#f6c23e', '#d52a1a'];
  return colors[index % colors.length];
};

const getSentimentColor = (sentiment: string, index: number): string => {
  const sentimentColors: { [key: string]: string } = {
    'positive': '#1cc88a',    // Admin success
    'negative': '#e74a3b',    // Admin danger
    'neutral': '#36b9cc'      // Admin info
  };
  
  return sentimentColors[sentiment] || '#e74a3b'; // Default to admin primary
};

const getSessionTypeColor = (type: string, index: number): string => {
  // Admin theme colors
  const colors = ['#e74a3b', '#1cc88a', '#36b9cc', '#f6c23e', '#d52a1a'];
  return colors[index % colors.length];
};

// Generate chart options for different report types
export const generateAdminChartOptions = (
  reportType: string,
  chartType: 'pie' | 'column' | 'line' | 'area',
  data: any[]
): any => {
  // Ensure data is valid and not empty
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  const baseOptions = {
    chart: {
      type: chartType === 'column' ? 'column' : chartType,
      height: 350,
      backgroundColor: '#ffffff',
      style: {
        fontFamily: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
      }
    },
    colors: ['#e74a3b', '#1cc88a', '#36b9cc', '#f6c23e', '#d52a1a', '#858796', '#5a5c69'],
    credits: {
      enabled: false
    },
    title: {
      text: getChartTitle(reportType),
      style: {
        color: '#5a5c69',
        fontSize: '18px',
        fontWeight: '700'
      }
    },
    subtitle: {
      style: {
        color: '#858796'
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#e3e6f0',
      borderRadius: 8,
      shadow: true,
      style: {
        color: '#5a5c69',
        fontSize: '13px'
      },
      pointFormat: chartType === 'pie' ? 
        '{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' :
        '{series.name}: <b>{point.y}</b>'
    },
    legend: {
      itemStyle: {
        color: '#5a5c69',
        fontSize: '13px',
        fontWeight: '600'
      },
      itemHoverStyle: {
        color: '#e74a3b'
      }
    },
    accessibility: {
      enabled: false
    }
  };
  
  if (chartType === 'pie') {
    return {
      ...baseOptions,
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%'
          },
          showInLegend: true
        }
      },
      series: [{
        name: getSeriesName(reportType),
        colorByPoint: true,
        data
      }]
    };
  }
  
  if (chartType === 'column') {
    return {
      ...baseOptions,
      xAxis: {
        categories: data.map(item => item.name),
        title: {
          text: null
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px',
            fontWeight: '600'
          }
        },
        lineColor: '#e3e6f0',
        tickColor: '#e3e6f0'
      },
      yAxis: {
        title: {
          text: getYAxisTitle(reportType),
          style: {
            color: '#5a5c69',
            fontSize: '13px',
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px'
          }
        },
        gridLineColor: '#e3e6f0'
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            style: {
              color: '#5a5c69',
              fontSize: '12px',
              fontWeight: '600'
            }
          }
        }
      },
      series: [{
        name: getSeriesName(reportType),
        data: data.map(item => ({ name: item.name, y: item.y, color: item.color }))
      }]
    };
  }
  
  if (chartType === 'line') {
    return {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'line' },
      xAxis: {
        categories: data.map(item => item.name),
        title: {
          text: null
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px',
            fontWeight: '600'
          }
        },
        lineColor: '#e3e6f0',
        tickColor: '#e3e6f0'
      },
      yAxis: {
        title: {
          text: getYAxisTitle(reportType),
          style: {
            color: '#5a5c69',
            fontSize: '13px',
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px'
          }
        },
        gridLineColor: '#e3e6f0'
      },
      plotOptions: {
        line: {
          dataLabels: {
            enabled: true,
            style: {
              color: '#5a5c69',
              fontSize: '12px',
              fontWeight: '600'
            }
          },
          enableMouseTracking: true,
          marker: {
            enabled: true,
            radius: 4,
            lineWidth: 2,
            lineColor: '#ffffff'
          }
        }
      },
      series: [{
        name: getSeriesName(reportType),
        data: data.map(item => ({ name: item.name, y: item.y, color: item.color })),
        color: '#e74a3b'
      }]
    };
  }
  
  if (chartType === 'area') {
    return {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'area' },
      xAxis: {
        categories: data.map(item => item.name),
        title: {
          text: null
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px',
            fontWeight: '600'
          }
        },
        lineColor: '#e3e6f0',
        tickColor: '#e3e6f0'
      },
      yAxis: {
        title: {
          text: getYAxisTitle(reportType),
          style: {
            color: '#5a5c69',
            fontSize: '13px',
            fontWeight: '600'
          }
        },
        labels: {
          style: {
            color: '#5a5c69',
            fontSize: '12px'
          }
        },
        gridLineColor: '#e3e6f0'
      },
      plotOptions: {
        area: {
          fillOpacity: 0.7,
          dataLabels: {
            enabled: true,
            style: {
              color: '#5a5c69',
              fontSize: '12px',
              fontWeight: '600'
            }
          },
          enableMouseTracking: true,
          marker: {
            enabled: true,
            radius: 4,
            lineWidth: 2,
            lineColor: '#ffffff'
          }
        }
      },
      series: [{
        name: getSeriesName(reportType),
        data: data.map(item => ({ name: item.name, y: item.y })),
        color: '#e74a3b',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(231, 74, 59, 0.8)'],
            [1, 'rgba(231, 74, 59, 0.1)']
          ]
        }
      }]
    };
  }
  
  // Default to column chart
  return {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'column' },
    xAxis: {
      categories: data.map(item => item.name),
      title: {
        text: null
      },
      labels: {
        style: {
          color: '#5a5c69',
          fontSize: '12px',
          fontWeight: '600'
        }
      },
      lineColor: '#e3e6f0',
      tickColor: '#e3e6f0'
    },
    yAxis: {
      title: {
        text: getYAxisTitle(reportType),
        style: {
          color: '#5a5c69',
          fontSize: '13px',
          fontWeight: '600'
        }
      },
      labels: {
        style: {
          color: '#5a5c69',
          fontSize: '12px'
        }
      },
      gridLineColor: '#e3e6f0'
    },
    plotOptions: {
      column: {
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          style: {
            color: '#5a5c69',
            fontSize: '12px',
            fontWeight: '600'
          }
        }
      }
    },
    series: [{
      name: getSeriesName(reportType),
      data: data.map(item => ({ name: item.name, y: item.y, color: item.color }))
    }]
  };
};

const getChartTitle = (reportType: string): string => {
  const titles: { [key: string]: string } = {
    'system-activity': 'System Activity Distribution',
    'user-engagement': 'User Engagement Overview',
    'financial-health': 'Financial System Health',
    'aiml-analytics': 'AI/ML Service Usage',
    'chatbot-analytics': 'Chatbot Analytics'
  };
  
  return titles[reportType] || 'Admin Analytics';
};

const getSeriesName = (reportType: string): string => {
  const seriesNames: { [key: string]: string } = {
    'system-activity': 'Activities',
    'user-engagement': 'Users',
    'financial-health': 'Amount',
    'aiml-analytics': 'Requests',
    'chatbot-analytics': 'Messages'
  };
  
  return seriesNames[reportType] || 'Data';
};

const getYAxisTitle = (reportType: string): string => {
  const yAxisTitles: { [key: string]: string } = {
    'system-activity': 'Count',
    'user-engagement': 'Number of Users',
    'financial-health': 'Amount ($)',
    'aiml-analytics': 'Number of Requests',
    'chatbot-analytics': 'Count'
  };
  
  return yAxisTitles[reportType] || 'Value';
};

export type AdminReportType = 'system-activity' | 'user-engagement' | 'financial-health' | 'aiml-analytics' | 'chatbot-analytics';
