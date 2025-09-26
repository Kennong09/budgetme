import React, { FC, useState, useEffect } from 'react';
import { EmailMonitoringService } from '../../services/emailMonitoringService';
import { EmailDeliveryConfigService } from '../../services/emailDeliveryConfigService';
import { getEmailDeliveryStats } from '../../utils/authService';

const EmailDeliveryMonitor: FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(EmailDeliveryConfigService.getConfig());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    try {
      const deliveryStats = getEmailDeliveryStats();
      const deliveryAnalytics = EmailDeliveryConfigService.getDeliveryAnalytics();
      
      setStats(deliveryStats);
      setAnalytics(deliveryAnalytics);
    } catch (error) {
      console.error('Failed to load email delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = (key: string, value: any) => {
    const updates = { [key]: value };
    EmailDeliveryConfigService.updateConfig(updates);
    setConfig(EmailDeliveryConfigService.getConfig());
  };

  const resetConfig = () => {
    EmailDeliveryConfigService.resetToDefaults();
    setConfig(EmailDeliveryConfigService.getConfig());
  };

  if (loading) {
    return (
      <div className=\"email-monitor-loading\">
        <i className=\"bx bx-loader-alt bx-spin\"></i>
        <span>Loading email delivery data...</span>
      </div>
    );
  }

  return (
    <div className=\"email-delivery-monitor\">
      <div className=\"monitor-header\">
        <h2><i className=\"bx bx-envelope\"></i> Email Delivery Monitor</h2>
        <p>Track and optimize authentication email performance</p>
      </div>

      {/* Delivery Statistics */}
      <div className=\"stats-grid\">
        <div className=\"stat-card\">
          <div className=\"stat-icon success\">
            <i className=\"bx bx-check-circle\"></i>
          </div>
          <div className=\"stat-content\">
            <h3>{stats?.totalDelivered || 0}</h3>
            <p>Emails Delivered</p>
          </div>
        </div>

        <div className=\"stat-card\">
          <div className=\"stat-icon info\">
            <i className=\"bx bx-time\"></i>
          </div>
          <div className=\"stat-content\">
            <h3>{stats?.averageDeliveryTime || 0}s</h3>
            <p>Avg Delivery Time</p>
          </div>
        </div>

        <div className=\"stat-card\">
          <div className=\"stat-icon warning\">
            <i className=\"bx bx-error\"></i>
          </div>
          <div className=\"stat-content\">
            <h3>{stats?.totalFailed || 0}</h3>
            <p>Failed Deliveries</p>
          </div>
        </div>

        <div className=\"stat-card\">
          <div className=\"stat-icon primary\">
            <i className=\"bx bx-percentage\"></i>
          </div>
          <div className=\"stat-content\">
            <h3>{stats?.deliveryRate || 0}%</h3>
            <p>Success Rate</p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className=\"analytics-section\">
          <h3>Delivery Analytics</h3>
          <div className=\"analytics-grid\">
            <div className=\"analytics-card\">
              <h4>Performance Overview</h4>
              <div className=\"analytics-item\">
                <span>Total Emails:</span>
                <strong>{analytics.totalEmails}</strong>
              </div>
              <div className=\"analytics-item\">
                <span>Success Rate:</span>
                <strong className={analytics.successRate > 95 ? 'success' : analytics.successRate > 85 ? 'warning' : 'error'}>
                  {analytics.successRate}%
                </strong>
              </div>
              <div className=\"analytics-item\">
                <span>Avg Delivery:</span>
                <strong>{analytics.averageDeliveryTime}s</strong>
              </div>
            </div>

            {analytics.commonErrors.length > 0 && (
              <div className=\"analytics-card\">
                <h4>Common Issues</h4>
                <ul className=\"error-list\">
                  {analytics.commonErrors.slice(0, 3).map((error: string, index: number) => (
                    <li key={index} className=\"error-item\">
                      <i className=\"bx bx-error-circle\"></i>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className=\"config-section\">
        <h3>Email Delivery Configuration</h3>
        <div className=\"config-grid\">
          <div className=\"config-item\">
            <label>Delivery Timeout (seconds)</label>
            <input
              type=\"number\"
              value={config.deliveryTimeout / 1000}
              onChange={(e) => handleConfigUpdate('deliveryTimeout', parseInt(e.target.value) * 1000)}
              min=\"60\"
              max=\"600\"
            />
          </div>

          <div className=\"config-item\">
            <label>Rate Limit Window (seconds)</label>
            <input
              type=\"number\"
              value={config.rateLimitWindow / 1000}
              onChange={(e) => handleConfigUpdate('rateLimitWindow', parseInt(e.target.value) * 1000)}
              min=\"10\"
              max=\"300\"
            />
          </div>

          <div className=\"config-item\">
            <label>Max Retries</label>
            <input
              type=\"number\"
              value={config.maxRetries}
              onChange={(e) => handleConfigUpdate('maxRetries', parseInt(e.target.value))}
              min=\"1\"
              max=\"10\"
            />
          </div>

          <div className=\"config-item checkbox-item\">
            <label>
              <input
                type=\"checkbox\"
                checked={config.monitoringEnabled}
                onChange={(e) => handleConfigUpdate('monitoringEnabled', e.target.checked)}
              />
              <span>Enable Monitoring</span>
            </label>
          </div>

          <div className=\"config-item checkbox-item\">
            <label>
              <input
                type=\"checkbox\"
                checked={config.debugMode}
                onChange={(e) => handleConfigUpdate('debugMode', e.target.checked)}
              />
              <span>Debug Mode</span>
            </label>
          </div>
        </div>

        <div className=\"config-actions\">
          <button className=\"btn-secondary\" onClick={resetConfig}>
            <i className=\"bx bx-reset\"></i> Reset to Defaults
          </button>
          <button className=\"btn-primary\" onClick={loadData}>
            <i className=\"bx bx-refresh\"></i> Refresh Data
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className=\"recommendations-section\">
        <h3>Optimization Recommendations</h3>
        <div className=\"recommendations\">
          {stats?.deliveryRate < 90 && (
            <div className=\"recommendation warning\">
              <i className=\"bx bx-warning\"></i>
              <div>
                <strong>Low Success Rate Detected</strong>
                <p>Consider switching to a custom SMTP provider for better deliverability.</p>
              </div>
            </div>
          )}
          
          {stats?.averageDeliveryTime > 120 && (
            <div className=\"recommendation info\">
              <i className=\"bx bx-time\"></i>
              <div>
                <strong>Slow Delivery Times</strong>
                <p>Email delivery is slower than optimal. Consider using the optimized email template.</p>
              </div>
            </div>
          )}
          
          {stats?.deliveryRate > 95 && stats?.averageDeliveryTime < 60 && (
            <div className=\"recommendation success\">
              <i className=\"bx bx-check-circle\"></i>
              <div>
                <strong>Excellent Performance</strong>
                <p>Your email delivery is performing optimally!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDeliveryMonitor;