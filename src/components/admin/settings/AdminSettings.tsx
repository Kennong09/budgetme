import React, { useState, useEffect, FC } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import "../admin.css";

interface SystemSettings {
  appName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultCurrency: string;
  logoUrl: string;
  contactEmail: string;
  maxUploadSize: number;
  dateFormat: string;
  version: string;
}

interface SecuritySettings {
  twoFactorAuthRequired: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  emailFromAddress: string;
  emailFromName: string;
  emailSignature: string;
  useSmtp: boolean;
}

interface IntegrationSettings {
  googleAnalyticsId: string;
  stripePublishableKey: string;
  stripeSecretKey: string;
  enableFinancialAI: boolean;
  enableSocialLogin: boolean;
  enableExporting: boolean;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: string;
  backupRetention: number; // days
  lastBackupDate: string; 
}

type SettingsSectionType = 'system' | 'security' | 'email' | 'integrations' | 'backup';

const AdminSettings: FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSectionType>('system');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { showSuccessToast, showErrorToast } = useToast();

  // Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    appName: "BudgetMe",
    maintenanceMode: false,
    registrationEnabled: true,
    defaultCurrency: "PHP",
    logoUrl: "/images/logo.png",
    contactEmail: "support@budgetme.com",
    maxUploadSize: 5, // MB
    dateFormat: "MM/DD/YYYY",
    version: "1.0.0",
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuthRequired: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    sessionTimeout: 30, // minutes
    maxLoginAttempts: 5,
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpUsername: "notifications@budgetme.com",
    smtpPassword: "••••••••••••",
    emailFromAddress: "no-reply@budgetme.com",
    emailFromName: "BudgetMe",
    emailSignature: "The BudgetMe Team",
    useSmtp: true,
  });

  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    googleAnalyticsId: "UA-XXXXXXXXX-X",
    stripePublishableKey: "pk_test_XXXXXXXXXXXXX",
    stripeSecretKey: "••••••••••••••••••••••",
    enableFinancialAI: true,
    enableSocialLogin: true,
    enableExporting: true,
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupFrequency: "daily",
    backupRetention: 30,
    lastBackupDate: "2023-11-15T08:30:00Z",
  });

  // Fetch settings from database on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // In a real application, these would be API calls to fetch the settings
        // For demo purposes, we'll simulate a delay and use the default values
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // If this were a real application, we would fetch settings from the database
        // For example:
        // const { data: systemData, error: systemError } = await supabase
        //   .from('system_settings')
        //   .select('*')
        //   .single();
        
        // if (systemError) throw systemError;
        // setSystemSettings(systemData);
        
        // For now, we'll just use the default values defined above
        setLoading(false);
      } catch (error) {
        console.error("Error fetching settings:", error);
        showErrorToast("Failed to load settings");
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showErrorToast]);

  // Handlers for form changes
  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const numValue = type === 'number' ? parseInt(value) : value;
    
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : numValue
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const numValue = type === 'number' ? parseInt(value) : value;
    
    setEmailSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : numValue
    }));
  };

  const handleIntegrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = e.target.checked;
    
    setIntegrationSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBackupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const numValue = name === 'backupRetention' ? parseInt(value) : value;
    
    setBackupSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : numValue
    }));
  };

  // Save settings
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // In a real app, we would save the settings to the database
      // For example:
      // await supabase.from('system_settings').upsert(systemSettings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccessToast("Settings saved successfully");
      setSaving(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      showErrorToast("Failed to save settings");
      setSaving(false);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    try {
      // Show loading state
      setSaving(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showSuccessToast("Test email sent successfully");
      setSaving(false);
    } catch (error) {
      console.error("Error sending test email:", error);
      showErrorToast("Failed to send test email");
      setSaving(false);
    }
  };

  // Trigger manual backup
  const triggerBackup = async () => {
    try {
      // Show loading state
      setSaving(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update last backup date
      setBackupSettings(prev => ({
        ...prev,
        lastBackupDate: new Date().toISOString()
      }));
      
      showSuccessToast("Manual backup completed successfully");
      setSaving(false);
    } catch (error) {
      console.error("Error performing manual backup:", error);
      showErrorToast("Failed to complete backup");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-gray-600">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">System Settings</h1>
        <button 
          className="d-none d-sm-inline-block btn btn-sm btn-danger shadow-sm"
          onClick={triggerBackup}
          disabled={saving}
        >
          <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Backup System
        </button>
      </div>

      <div className="row">
        {/* Settings Navigation */}
        <div className="col-xl-3 col-md-4 mb-4">
          <div className="card shadow border-0 h-100">
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                <button
                  className={`list-group-item list-group-item-action ${activeSection === 'system' ? 'active' : ''}`}
                  onClick={() => setActiveSection('system')}
                >
                  <i className="fas fa-cog mr-2"></i> System Settings
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeSection === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveSection('security')}
                >
                  <i className="fas fa-shield-alt mr-2"></i> Security
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeSection === 'email' ? 'active' : ''}`}
                  onClick={() => setActiveSection('email')}
                >
                  <i className="fas fa-envelope mr-2"></i> Email Configuration
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeSection === 'integrations' ? 'active' : ''}`}
                  onClick={() => setActiveSection('integrations')}
                >
                  <i className="fas fa-plug mr-2"></i> Integrations
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeSection === 'backup' ? 'active' : ''}`}
                  onClick={() => setActiveSection('backup')}
                >
                  <i className="fas fa-database mr-2"></i> Backup & Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="col-xl-9 col-md-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header">
              <h6 className="m-0 font-weight-bold text-danger">
                {activeSection === 'system' && 'System Settings'}
                {activeSection === 'security' && 'Security Settings'}
                {activeSection === 'email' && 'Email Configuration'}
                {activeSection === 'integrations' && 'Integration Settings'}
                {activeSection === 'backup' && 'Backup & Maintenance'}
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={saveSettings}>
                {/* System Settings */}
                {activeSection === 'system' && (
                  <div className="settings-section">
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Application Name</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="appName"
                          value={systemSettings.appName}
                          onChange={handleSystemChange}
                        />
                        <small className="form-text text-muted">
                          The name of the application as displayed to users
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Default Currency</label>
                      <div className="col-sm-9">
                        <select
                          className="form-control"
                          name="defaultCurrency"
                          value={systemSettings.defaultCurrency}
                          onChange={handleSystemChange}
                        >
                          <option value="PHP">PHP (₱)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="AUD">AUD ($)</option>
                        </select>
                        <small className="form-text text-muted">
                          Default currency for new accounts
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Logo URL</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="logoUrl"
                          value={systemSettings.logoUrl}
                          onChange={handleSystemChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Contact Email</label>
                      <div className="col-sm-9">
                        <input
                          type="email"
                          className="form-control"
                          name="contactEmail"
                          value={systemSettings.contactEmail}
                          onChange={handleSystemChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Date Format</label>
                      <div className="col-sm-9">
                        <select
                          className="form-control"
                          name="dateFormat"
                          value={systemSettings.dateFormat}
                          onChange={handleSystemChange}
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Max Upload Size (MB)</label>
                      <div className="col-sm-9">
                        <input
                          type="number"
                          className="form-control"
                          name="maxUploadSize"
                          value={systemSettings.maxUploadSize}
                          onChange={handleSystemChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="maintenanceMode"
                            name="maintenanceMode"
                            checked={systemSettings.maintenanceMode}
                            onChange={handleSystemChange}
                          />
                          <label className="custom-control-label" htmlFor="maintenanceMode">
                            Maintenance Mode
                          </label>
                        </div>
                        <small className="form-text text-muted">
                          When enabled, only admins can access the site
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="registrationEnabled"
                            name="registrationEnabled"
                            checked={systemSettings.registrationEnabled}
                            onChange={handleSystemChange}
                          />
                          <label className="custom-control-label" htmlFor="registrationEnabled">
                            Enable User Registration
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Version</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="version"
                          value={systemSettings.version}
                          onChange={handleSystemChange}
                          readOnly
                        />
                        <small className="form-text text-muted">
                          Current system version
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeSection === 'security' && (
                  <div className="settings-section">
                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="twoFactorAuthRequired"
                            name="twoFactorAuthRequired"
                            checked={securitySettings.twoFactorAuthRequired}
                            onChange={handleSecurityChange}
                          />
                          <label className="custom-control-label" htmlFor="twoFactorAuthRequired">
                            Require Two-Factor Authentication
                          </label>
                        </div>
                        <small className="form-text text-muted">
                          Forces all users to set up 2FA during registration
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Password Min Length</label>
                      <div className="col-sm-9">
                        <input
                          type="number"
                          className="form-control"
                          name="passwordMinLength"
                          value={securitySettings.passwordMinLength}
                          onChange={handleSecurityChange}
                          min="6"
                          max="32"
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="passwordRequireSpecial"
                            name="passwordRequireSpecial"
                            checked={securitySettings.passwordRequireSpecial}
                            onChange={handleSecurityChange}
                          />
                          <label className="custom-control-label" htmlFor="passwordRequireSpecial">
                            Require Special Characters
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="passwordRequireNumbers"
                            name="passwordRequireNumbers"
                            checked={securitySettings.passwordRequireNumbers}
                            onChange={handleSecurityChange}
                          />
                          <label className="custom-control-label" htmlFor="passwordRequireNumbers">
                            Require Numbers
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Session Timeout (minutes)</label>
                      <div className="col-sm-9">
                        <input
                          type="number"
                          className="form-control"
                          name="sessionTimeout"
                          value={securitySettings.sessionTimeout}
                          onChange={handleSecurityChange}
                        />
                        <small className="form-text text-muted">
                          Time until inactive users are automatically logged out
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Max Login Attempts</label>
                      <div className="col-sm-9">
                        <input
                          type="number"
                          className="form-control"
                          name="maxLoginAttempts"
                          value={securitySettings.maxLoginAttempts}
                          onChange={handleSecurityChange}
                        />
                        <small className="form-text text-muted">
                          Number of failed attempts before account is locked
                        </small>
                      </div>
                    </div>

                    <div className="alert alert-info">
                      <i className="fas fa-info-circle mr-1"></i>
                      Security settings affect all users on the platform. Changes may require users to update their credentials.
                    </div>
                  </div>
                )}

                {/* Email Settings */}
                {activeSection === 'email' && (
                  <div className="settings-section">
                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="useSmtp"
                            name="useSmtp"
                            checked={emailSettings.useSmtp}
                            onChange={handleEmailChange}
                          />
                          <label className="custom-control-label" htmlFor="useSmtp">
                            Use Custom SMTP Server
                          </label>
                        </div>
                        <small className="form-text text-muted">
                          When disabled, system will use default mail service
                        </small>
                      </div>
                    </div>

                    {emailSettings.useSmtp && (
                      <>
                        <div className="form-group row">
                          <label className="col-sm-3 col-form-label">SMTP Host</label>
                          <div className="col-sm-9">
                            <input
                              type="text"
                              className="form-control"
                              name="smtpHost"
                              value={emailSettings.smtpHost}
                              onChange={handleEmailChange}
                            />
                          </div>
                        </div>

                        <div className="form-group row">
                          <label className="col-sm-3 col-form-label">SMTP Port</label>
                          <div className="col-sm-9">
                            <input
                              type="number"
                              className="form-control"
                              name="smtpPort"
                              value={emailSettings.smtpPort}
                              onChange={handleEmailChange}
                            />
                          </div>
                        </div>

                        <div className="form-group row">
                          <label className="col-sm-3 col-form-label">SMTP Username</label>
                          <div className="col-sm-9">
                            <input
                              type="text"
                              className="form-control"
                              name="smtpUsername"
                              value={emailSettings.smtpUsername}
                              onChange={handleEmailChange}
                            />
                          </div>
                        </div>

                        <div className="form-group row">
                          <label className="col-sm-3 col-form-label">SMTP Password</label>
                          <div className="col-sm-9">
                            <input
                              type="password"
                              className="form-control"
                              name="smtpPassword"
                              value={emailSettings.smtpPassword}
                              onChange={handleEmailChange}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">From Email Address</label>
                      <div className="col-sm-9">
                        <input
                          type="email"
                          className="form-control"
                          name="emailFromAddress"
                          value={emailSettings.emailFromAddress}
                          onChange={handleEmailChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">From Name</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="emailFromName"
                          value={emailSettings.emailFromName}
                          onChange={handleEmailChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Email Signature</label>
                      <div className="col-sm-9">
                        <textarea
                          className="form-control"
                          name="emailSignature"
                          value={emailSettings.emailSignature}
                          onChange={handleEmailChange}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <button
                          type="button"
                          className="btn btn-info"
                          onClick={sendTestEmail}
                          disabled={saving}
                        >
                          <i className="fas fa-paper-plane mr-1"></i>
                          Send Test Email
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Integration Settings */}
                {activeSection === 'integrations' && (
                  <div className="settings-section">
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Google Analytics ID</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="googleAnalyticsId"
                          value={integrationSettings.googleAnalyticsId}
                          onChange={handleIntegrationChange}
                          placeholder="UA-XXXXXXXXX-X"
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Stripe Publishable Key</label>
                      <div className="col-sm-9">
                        <input
                          type="text"
                          className="form-control"
                          name="stripePublishableKey"
                          value={integrationSettings.stripePublishableKey}
                          onChange={handleIntegrationChange}
                          placeholder="pk_test_XXXXXXXXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Stripe Secret Key</label>
                      <div className="col-sm-9">
                        <input
                          type="password"
                          className="form-control"
                          name="stripeSecretKey"
                          value={integrationSettings.stripeSecretKey}
                          onChange={handleIntegrationChange}
                        />
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="enableFinancialAI"
                            name="enableFinancialAI"
                            checked={integrationSettings.enableFinancialAI}
                            onChange={handleIntegrationChange}
                          />
                          <label className="custom-control-label" htmlFor="enableFinancialAI">
                            Enable Financial AI Features
                          </label>
                        </div>
                        <small className="form-text text-muted">
                          Predictive analytics and spending recommendations
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="enableSocialLogin"
                            name="enableSocialLogin"
                            checked={integrationSettings.enableSocialLogin}
                            onChange={handleIntegrationChange}
                          />
                          <label className="custom-control-label" htmlFor="enableSocialLogin">
                            Enable Social Login
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="enableExporting"
                            name="enableExporting"
                            checked={integrationSettings.enableExporting}
                            onChange={handleIntegrationChange}
                          />
                          <label className="custom-control-label" htmlFor="enableExporting">
                            Enable Data Exporting
                          </label>
                        </div>
                        <small className="form-text text-muted">
                          Allow users to export their financial data
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Backup & Maintenance */}
                {activeSection === 'backup' && (
                  <div className="settings-section">
                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="autoBackupEnabled"
                            name="autoBackupEnabled"
                            checked={backupSettings.autoBackupEnabled}
                            onChange={handleBackupChange}
                          />
                          <label className="custom-control-label" htmlFor="autoBackupEnabled">
                            Enable Automatic Backups
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Backup Frequency</label>
                      <div className="col-sm-9">
                        <select
                          className="form-control"
                          name="backupFrequency"
                          value={backupSettings.backupFrequency}
                          onChange={handleBackupChange}
                          disabled={!backupSettings.autoBackupEnabled}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Retention Period (days)</label>
                      <div className="col-sm-9">
                        <input
                          type="number"
                          className="form-control"
                          name="backupRetention"
                          value={backupSettings.backupRetention}
                          onChange={handleBackupChange}
                          disabled={!backupSettings.autoBackupEnabled}
                        />
                        <small className="form-text text-muted">
                          Number of days to keep backups before deletion
                        </small>
                      </div>
                    </div>

                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label">Last Backup</label>
                      <div className="col-sm-9">
                        <p className="form-control-static">
                          {new Date(backupSettings.lastBackupDate).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="form-group row">
                      <div className="col-sm-9 offset-sm-3">
                        <button
                          type="button"
                          className="btn btn-warning mr-2"
                          onClick={triggerBackup}
                          disabled={saving}
                        >
                          <i className="fas fa-database mr-1"></i>
                          Run Manual Backup
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={saving}
                        >
                          <i className="fas fa-broom mr-1"></i>
                          Clear Cache
                        </button>
                      </div>
                    </div>

                    <div className="alert alert-warning mt-4">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      <strong>Warning:</strong> Make sure you have sufficient storage space for backups.
                      Estimated size: 250 MB per backup.
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="border-top pt-3 mt-4">
                  <div className="d-flex justify-content-between">
                    <div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-1"></i> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-muted small pt-2">
                      Last updated: {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings; 