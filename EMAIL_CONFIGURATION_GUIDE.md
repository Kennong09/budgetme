# Email Configuration Guide - Fixing Gmail SMTP Rate Limits

## Current Issue

You're experiencing 429 "Too Many Requests" errors because Gmail SMTP has strict rate limits that aren't suitable for transactional emails in web applications. This is causing signup failures and poor user experience.

## Immediate Fixes Implemented

✅ **Client-side rate limiting** - Prevents rapid signup attempts  
✅ **Better error handling** - User-friendly error messages  
✅ **Extended rate limit windows** - 2+ minute delays between attempts  
✅ **Improved user feedback** - Clear instructions and wait times  

## Recommended Long-term Solutions

### Option 1: Upgrade Supabase Plan (Recommended)
- **Upgrade to Supabase Pro** ($25/month)
- Includes built-in transactional email service
- No SMTP configuration needed
- Better deliverability and no rate limits
- Professional email templates

### Option 2: Use Professional SMTP Provider

Replace Gmail SMTP with one of these services:

#### A. Resend (Recommended for startups)
- **Free tier**: 3,000 emails/month
- **Pricing**: $20/month for 50,000 emails
- **Setup in Supabase**:
  ```
  Host: smtp.resend.com
  Port: 587
  Username: resend
  Password: [Your Resend API key]
  Minimum interval: 0 seconds
  ```

#### B. SendGrid
- **Free tier**: 100 emails/day
- **Pricing**: $19.95/month for 50,000 emails
- **Setup in Supabase**:
  ```
  Host: smtp.sendgrid.net
  Port: 587
  Username: apikey
  Password: [Your SendGrid API key]
  Minimum interval: 0 seconds
  ```

#### C. Amazon SES
- **Pricing**: $0.10 per 1,000 emails
- **Setup in Supabase**:
  ```
  Host: email-smtp.us-east-1.amazonaws.com
  Port: 587
  Username: [Your SMTP username]
  Password: [Your SMTP password]
  Minimum interval: 0 seconds
  ```

#### D. Postmark
- **Free tier**: 100 emails/month
- **Pricing**: $10/month for 10,000 emails
- **Setup in Supabase**:
  ```
  Host: smtp.postmarkapp.com
  Port: 587
  Username: [Your Server Token]
  Password: [Your Server Token]
  Minimum interval: 0 seconds
  ```

### Option 3: Temporary Gmail Optimization

If you must continue with Gmail (not recommended):

1. **Update Supabase SMTP settings**:
   ```
   Minimum interval between emails: 60 seconds (or higher)
   ```

2. **Create a Gmail App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate new app password
   - Use this instead of your regular password

3. **Enable less secure app access** (if needed):
   - This may be restricted for newer accounts

## Current Configuration Issues

Your current Gmail setup has these problems:
- ❌ Gmail SMTP is designed for personal email, not transactional
- ❌ 1-second minimum interval is too aggressive for Gmail
- ❌ Gmail has daily sending limits (500 emails/day for free accounts)
- ❌ Higher chance of emails going to spam
- ❌ Poor deliverability for automated emails

## Testing Your New Configuration

After changing your SMTP provider:

1. **Test signup flow**:
   ```bash
   # Try signing up with a new email
   # Check email delivery time
   # Verify email links work correctly
   ```

2. **Monitor error rates**:
   ```javascript
   // Check browser console for auth errors
   console.log('Signup success rate:', getEmailDeliveryStats());
   ```

3. **Test multiple signups**:
   - Try 3-5 signups in quick succession
   - Should not hit rate limits with proper SMTP provider

## Implementation Priority

1. **Immediate** (to stop current errors): The code fixes are already applied
2. **This week**: Choose and set up a professional SMTP provider
3. **Optional**: Consider Supabase Pro for all-in-one solution

## Code Changes Applied

The following improvements have been made to your codebase:

### authService.ts
- ✅ Added signup rate limiting (4+ minute delays)
- ✅ Better error handling for 429 responses
- ✅ Improved error messages for users
- ✅ Timestamp-based rate limiting storage

### EmailDeliveryConfigService.ts
- ✅ Increased rate limit window to 2 minutes
- ✅ Added `isSignupAllowed()` method
- ✅ More conservative signup rate limiting

### AuthContext.tsx
- ✅ Better error message handling
- ✅ Rate limit error detection and user feedback

### New Components
- ✅ `RateLimitInfo` component for better user experience
- ✅ Helpful tips and guidance for users

## Next Steps

1. **Choose an SMTP provider** from the options above
2. **Update your Supabase email settings** with the new provider
3. **Test thoroughly** with multiple email addresses
4. **Monitor delivery rates** and user feedback
5. **Consider upgrading to Supabase Pro** for the best experience

## Contact Information

If you need help implementing any of these solutions, the changes are already applied to handle the immediate issue. For the long-term fix, updating your SMTP provider is the most important step.