# Email Verification Troubleshooting Guide

## Problem
Users are not receiving verification emails after signing up, and the resend functionality isn't working.

## Root Causes & Solutions

### 1. Supabase Email Configuration

#### Check in Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Auth**
3. Check the following settings:

**Email Settings:**
- **Enable email confirmations**: Should be enabled ✅
- **Secure email change**: Recommended to enable ✅
- **Double confirm email changes**: Optional

**Email Templates:**
- Go to **Auth** > **Email Templates**
- Ensure "Confirm signup" template is configured
- Check that the template contains the correct confirmation link

#### Default Email Provider Issues:
Supabase's default email provider has limitations:
- Rate limiting (few emails per hour)
- May be blocked by spam filters
- Not reliable for production use

### 2. Configure Custom SMTP (Recommended)

#### Step 1: Set up SMTP Provider
Choose one of these providers:
- **SendGrid** (recommended)
- **Mailgun** 
- **Amazon SES**
- **Postmark**

#### Step 2: Configure in Supabase
1. In Supabase dashboard, go to **Settings** > **Auth**
2. Scroll down to **SMTP Settings**
3. Fill in your SMTP provider details:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [Your SendGrid API Key]
   SMTP From: noreply@yourdomain.com
   ```

### 3. Environment Variables Setup

Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=https://ryoujebxyvvazvtxjhlf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_SUPABASE_SERVICE_KEY=your_service_key

# Optional: Custom domain for email redirects
REACT_APP_SITE_URL=http://localhost:3000
```

### 4. Update Auth Configuration

The current redirect URL might be causing issues. Update the auth service:

```typescript
// In src/utils/authService.ts
export const signUpWithEmail = async (email: string, password: string, metadata: { full_name: string }): Promise<AuthResponse> => {
  const siteUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });
  
  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error ? { message: error.message } : null,
  };
};
```

### 5. Check Email Template Content

In Supabase Dashboard > Auth > Email Templates > Confirm signup:

**Subject:** Confirm Your Email - BudgetMe

**Body (HTML):**
```html
<h2>Welcome to BudgetMe!</h2>
<p>Please click the link below to verify your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't sign up for BudgetMe, please ignore this email.</p>
<p>This link will expire in 24 hours.</p>
```

### 6. Testing Steps

#### Local Testing:
1. Clear browser storage/cookies
2. Try signing up with a fresh email
3. Check browser console for errors
4. Try the resend functionality

#### Email Delivery Testing:
1. Check spam/junk folders
2. Try with different email providers (Gmail, Yahoo, Outlook)
3. Use a temporary email service to test

#### Debug Mode:
Add logging to track the verification process:

```typescript
// In EmailVerificationModal.tsx
const handleResendEmail = async () => {
  console.log('Attempting to resend email to:', email);
  
  try {
    const { error } = await resendVerificationEmail(email);
    console.log('Resend result:', { error });
    // ... rest of the function
  } catch (err) {
    console.error('Resend error:', err);
  }
};
```

### 7. Alternative Approaches

#### Option A: Disable Email Confirmation (Development Only)
In Supabase Dashboard > Settings > Auth:
- Temporarily disable "Enable email confirmations"
- Users can sign in immediately without email verification

#### Option B: Custom Email Service
Implement your own email service using:
- Nodemailer + Express backend
- Supabase Edge Functions
- Vercel API routes

### 8. Production Checklist

Before going to production:
- [ ] Set up custom SMTP provider
- [ ] Configure proper domain for email redirects
- [ ] Test email delivery thoroughly
- [ ] Set up proper DNS records (SPF, DKIM)
- [ ] Monitor email delivery rates

## Quick Fix for Development

If you need a immediate solution for development:

1. Go to Supabase Dashboard
2. Settings > Auth
3. Temporarily disable "Enable email confirmations"
4. Users can sign in immediately without verification

## Common Error Messages

**"Email not confirmed"**
- Email confirmation is required but user hasn't verified
- Check if confirmation email was sent/received

**"Rate limit exceeded"**
- Too many requests to resend email
- Wait or implement proper rate limiting

**"Invalid email"**
- Check email format validation
- Ensure email is properly formatted

## Support Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)