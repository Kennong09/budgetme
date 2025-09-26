# Email Delivery Troubleshooting Guide

This guide helps diagnose and fix common email delivery issues in your Supabase application.

## Common Issues and Solutions

### 1. Not Receiving Signup Confirmation Emails

#### Symptoms:
- User signs up successfully but never receives confirmation email
- No error shown in the UI
- User cannot log in because email is not verified

#### Diagnosis Steps:

1. **Check the browser console** for any error messages during signup
2. **Verify the email address** was entered correctly
3. **Check spam/junk folder** in the email account
4. **Use the diagnostics tool** to check for delivery issues

```javascript
// Run this in the browser console to check recent email deliveries
EmailDiagnostics.printReport();
```

#### Solutions:

1. **Wait a few minutes** - Email delivery can sometimes take 1-5 minutes
2. **Check spam/junk folder** - Automated emails often end up there
3. **Resend verification email** using the resend feature
4. **Check SMTP configuration** in Supabase dashboard

### 2. Rate Limit Errors (429)

#### Symptoms:
- "Too many requests" errors during signup
- "Please wait X seconds" messages
- Signup process fails repeatedly

#### Solutions:

1. **Implement client-side rate limiting** (already done in this app)
2. **Increase rate limit windows** in EmailDeliveryConfigService
3. **Switch to a professional SMTP provider** (recommended)

### 3. Server Errors (504, 502)

#### Symptoms:
- "Server temporarily unavailable" messages
- "Request timed out" errors
- Intermittent signup failures

#### Solutions:

1. **Check Supabase status** at https://status.supabase.com
2. **Retry the operation** after a few minutes
3. **Check network connectivity**
4. **Review server logs** in Supabase dashboard

## Supabase Email Configuration

### Current Setup Issues

Your application is likely using Gmail SMTP which has several limitations:
- Strict rate limits (500 emails/day for free accounts)
- Higher chance of emails going to spam
- Poor deliverability for automated emails

### Recommended Solutions

#### Option 1: Upgrade to Supabase Pro ($25/month)
- Includes built-in transactional email service
- No SMTP configuration needed
- Better deliverability and no rate limits

#### Option 2: Use Professional SMTP Provider

**Resend (Recommended)**
- Free tier: 3,000 emails/month
- Setup in Supabase Auth settings:
  ```
  Host: smtp.resend.com
  Port: 587
  Username: resend
  Password: [Your Resend API key]
  ```

**SendGrid**
- Free tier: 100 emails/day
- Setup in Supabase Auth settings:
  ```
  Host: smtp.sendgrid.net
  Port: 587
  Username: apikey
  Password: [Your SendGrid API key]
  ```

## Diagnostic Tools

### Using the Email Diagnostics Tool

```javascript
// Import the diagnostics tool
import { EmailDiagnostics } from '../utils/emailDiagnostics';

// Generate and print a full report
EmailDiagnostics.printReport();

// Get specific information
const report = EmailDiagnostics.generateReport();
console.log('Issues:', report.issues);
console.log('Recommendations:', report.recommendations);

// Check if a specific email was sent recently
const wasSent = EmailDiagnostics.wasEmailSentRecently('user@example.com');
console.log('Email sent recently:', wasSent);

// Get detailed info about a specific email
const emailInfo = EmailDiagnostics.getEmailInfo('user@example.com');
console.log('Email info:', emailInfo);
```

### Manual Verification Steps

1. **Check Supabase Dashboard**
   - Go to Supabase Dashboard > Authentication > Users
   - Verify the user account was created
   - Check if email is marked as confirmed

2. **Check Email Templates**
   - Review custom email templates in `email-template/` directory
   - Ensure links and redirects are properly configured

3. **Test with Different Email Providers**
   - Try signing up with Gmail, Outlook, and other email providers
   - Some providers have stricter spam filters

## Code-Level Troubleshooting

### Check Redirect URLs

Ensure your redirect URLs are correctly configured:

```typescript
// In EmailDeliveryConfigService.ts
static getOptimizedAuthOptions(siteUrl: string) {
  return {
    emailRedirectTo: `${siteUrl}/auth/callback`, // Make sure this is correct
    data: undefined,
    captchaToken: undefined,
  };
}
```

### Verify Environment Variables

Check that `REACT_APP_SITE_URL` is set correctly:

```bash
# In your .env file
REACT_APP_SITE_URL=https://your-app.vercel.app
```

## Testing Email Delivery

### Manual Testing Process

1. **Clear local storage** to reset rate limiting:
   ```javascript
   localStorage.clear();
   ```

2. **Try signing up** with a new email address

3. **Wait 2-5 minutes** for email delivery

4. **Check all email folders** (inbox, spam, junk, promotions)

5. **Use the resend feature** if email doesn't arrive

### Automated Testing

```javascript
// Test email delivery
async function testEmailDelivery() {
  try {
    // Clear previous tracking data
    EmailDiagnostics.clearTrackingData();
    
    // Attempt signup
    const result = await signUpWithEmail(
      'test@example.com', 
      'password123', 
      { full_name: 'Test User' }
    );
    
    console.log('Signup result:', result);
    
    // Wait for email delivery
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
    
    // Check delivery status
    const deliveryInfo = EmailDiagnostics.getEmailInfo('test@example.com');
    console.log('Delivery info:', deliveryInfo);
    
    // Generate report
    EmailDiagnostics.printReport();
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

## Emergency Workarounds

If users can't receive emails:

1. **Enable Email Confirmations Disabled** in Supabase Auth settings
   - This allows users to log in without email confirmation
   - Security risk - only use temporarily

2. **Manually confirm user emails** in Supabase Dashboard
   - Go to Authentication > Users
   - Find the user and manually set email as confirmed

3. **Provide alternative contact method**
   - Offer support email for manual account verification

## Prevention Best Practices

1. **Use professional SMTP providers** instead of Gmail
2. **Implement proper rate limiting** (already done)
3. **Monitor email delivery metrics** regularly
4. **Test with multiple email providers** regularly
5. **Keep email templates updated** and tested
6. **Provide clear user instructions** for email verification

## Contact Support

If issues persist:

1. **Gather diagnostic information** using the tools above
2. **Check Supabase status page** for ongoing issues
3. **Contact Supabase support** with detailed information
4. **Consider upgrading your Supabase plan** for better email deliverability