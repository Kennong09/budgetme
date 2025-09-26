/**
 * Email Test Component
 * 
 * A simple component to test email delivery and troubleshoot issues
 */

import React, { useState } from 'react';
import { supabaseAdmin } from '../../utils/supabaseClient';
import { EmailDiagnostics } from '../../utils/emailDiagnostics';
import { EmailMonitoringService } from '../../services/emailMonitoringService';

const EmailTestComponent: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      // Try to trigger a password reset email as a test
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setResult({ success: false, message: `Failed to send test email: ${error.message}` });
      } else {
        setResult({ success: true, message: 'Test email sent successfully. Check your inbox.' });
        EmailMonitoringService.trackEmailSent(testEmail);
      }
    } catch (error: any) {
      setResult({ success: false, message: `Error sending test email: ${error.message}` });
    } finally {
      setIsSending(false);
    }
  };

  const handleRunDiagnostics = () => {
    const report = EmailDiagnostics.generateReport();
    setDiagnostics(report);
  };

  const handleClearDiagnostics = () => {
    EmailDiagnostics.clearTrackingData();
    setDiagnostics(null);
    setResult({ success: true, message: 'Diagnostics data cleared' });
  };

  return (
    <div className="email-test-component" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Email Delivery Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="testEmail" style={{ display: 'block', marginBottom: '5px' }}>
          Test Email Address:
        </label>
        <input
          type="email"
          id="testEmail"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Enter email to test"
          style={{ 
            width: '100%', 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc' 
          }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleSendTestEmail}
          disabled={isSending}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: isSending ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isSending ? 'Sending...' : 'Send Test Email'}
        </button>
        
        <button
          onClick={handleRunDiagnostics}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Run Diagnostics
        </button>
        
        <button
          onClick={handleClearDiagnostics}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Data
        </button>
      </div>
      
      {result && (
        <div
          style={{
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            color: result.success ? '#155724' : '#721c24',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          {result.message}
        </div>
      )}
      
      {diagnostics && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px', 
          padding: '15px',
          marginTop: '20px'
        }}>
          <h3>Diagnostics Report</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Configuration:</strong>
            <pre style={{ fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify(diagnostics.config, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Delivery Stats:</strong>
            <pre style={{ fontSize: '12px', overflowX: 'auto' }}>
              {JSON.stringify(diagnostics.deliveryStats, null, 2)}
            </pre>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>Issues Found:</strong>
            <ul>
              {diagnostics.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <strong>Recommendations:</strong>
            <ul>
              {diagnostics.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTestComponent;