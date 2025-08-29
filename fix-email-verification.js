#!/usr/bin/env node

/**
 * Email Verification Troubleshooting Script for BudgetMe
 * 
 * This script helps diagnose and fix email verification issues with Supabase
 * Run with: node fix-email-verification.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load environment variables if available
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not available, continue without it
}

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzQ5MzYsImV4cCI6MjA2NDg1MDkzNn0.RhHY62oiflpKuv6jcV6xkXiCWerrAodRibQDP0TxXrM';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI3NDkzNiwiZXhwIjoyMDY0ODUwOTM2fQ.q4BiRHda6IsomEWMqc0O_MPy6LRBkoyLr3Ip0BBETu8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseConnection() {
  log('cyan', '\n🔍 Checking Supabase connection...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      log('red', '❌ Supabase connection failed:');
      console.log(error);
      return false;
    }
    log('green', '✅ Supabase connection successful');
    return true;
  } catch (error) {
    log('red', '❌ Supabase connection error:');
    console.log(error.message);
    return false;
  }
}

async function checkAuthSettings() {
  log('cyan', '\n🔍 Checking authentication settings...');
  
  try {
    // Try to get auth settings using admin client
    const { data: settings, error } = await supabaseAdmin.auth.admin.getSettings();
    
    if (error) {
      log('yellow', '⚠️  Could not retrieve auth settings (this is normal for security reasons)');
      log('blue', 'ℹ️  Please check these settings manually in your Supabase dashboard:');
      console.log('   - Go to Settings > Auth');
      console.log('   - Check "Enable email confirmations" is ON');
      console.log('   - Check "Secure email change" setting');
      console.log('   - Review Email Templates in Auth > Email Templates');
    } else {
      log('green', '✅ Auth settings retrieved successfully');
      console.log(JSON.stringify(settings, null, 2));
    }
  } catch (error) {
    log('yellow', '⚠️  Auth settings check skipped (requires admin privileges)');
  }
}

async function testEmailFunctionality() {
  log('cyan', '\n🔍 Testing email functionality...');
  
  const testEmail = 'test-' + Date.now() + '@example.com';
  
  try {
    // Test signup (this should trigger an email)
    log('blue', `📧 Testing signup with email: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123!',
      options: {
        data: { full_name: 'Test User' },
        emailRedirectTo: `${process.env.REACT_APP_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) {
      log('red', '❌ Signup failed:');
      console.log(error);
      return false;
    }
    
    if (data.user) {
      log('green', '✅ Signup successful');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      if (!data.user.email_confirmed_at) {
        log('yellow', '⚠️  Email not confirmed - this is expected if email confirmation is enabled');
        
        // Test resend functionality
        log('blue', '📧 Testing resend verification email...');
        
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: testEmail,
          options: {
            emailRedirectTo: `${process.env.REACT_APP_SITE_URL || 'http://localhost:3000'}/auth/callback`
          }
        });
        
        if (resendError) {
          log('red', '❌ Resend failed:');
          console.log(resendError);
        } else {
          log('green', '✅ Resend successful');
        }
      }
      
      // Clean up test user
      try {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        log('green', '🧹 Test user cleaned up');
      } catch (cleanupError) {
        log('yellow', '⚠️  Could not clean up test user (this is okay)');
      }
      
      return true;
    }
  } catch (error) {
    log('red', '❌ Email functionality test failed:');
    console.log(error);
    return false;
  }
  
  return false;
}

function checkEnvironmentVariables() {
  log('cyan', '\n🔍 Checking environment variables...');
  
  const envFile = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envFile);
  
  if (!envExists) {
    log('yellow', '⚠️  No .env file found');
    log('blue', 'ℹ️  Consider creating a .env file with:');
    console.log('   REACT_APP_SUPABASE_URL=your_supabase_url');
    console.log('   REACT_APP_SUPABASE_ANON_KEY=your_anon_key');
    console.log('   REACT_APP_SITE_URL=http://localhost:3000');
  } else {
    log('green', '✅ .env file found');
  }
  
  const requiredVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log('yellow', `⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    log('blue', 'ℹ️  Using hardcoded values from code');
  } else {
    log('green', '✅ All required environment variables found');
  }
}

function provideSolutions() {
  log('cyan', '\n💡 Troubleshooting Solutions:');
  
  console.log(`
${colors.yellow}Common Issues and Solutions:${colors.reset}

${colors.green}1. Emails not being received:${colors.reset}
   - Check your spam/junk folder
   - Try a different email provider (Gmail, Yahoo, etc.)
   - Check Supabase dashboard > Auth > Users to see if user was created
   
${colors.green}2. Using default Supabase email (limited):${colors.reset}
   - Set up custom SMTP in Supabase dashboard
   - Go to Settings > Auth > SMTP Settings
   - Recommended providers: SendGrid, Mailgun, Amazon SES

${colors.green}3. Email templates not configured:${colors.reset}
   - Go to Supabase dashboard > Auth > Email Templates
   - Customize the "Confirm signup" template
   - Ensure the confirmation URL is correct

${colors.green}4. Rate limiting issues:${colors.reset}
   - Default email provider has strict rate limits
   - Set up custom SMTP for higher limits
   - Implement proper rate limiting in your app

${colors.green}5. Development workaround:${colors.reset}
   - Temporarily disable email confirmations in Supabase
   - Go to Settings > Auth > Email confirmations (turn OFF)
   - Users can sign in immediately without verification

${colors.green}6. Check redirect URLs:${colors.reset}
   - Ensure auth callback URL is correctly configured
   - Check that /auth/callback route exists and works
   - Verify REACT_APP_SITE_URL is set correctly

${colors.blue}For production setup:${colors.reset}
   - Set up custom SMTP provider
   - Configure proper domain and DNS records
   - Test thoroughly with real email addresses
   - Monitor email delivery rates
`);
}

async function main() {
  log('magenta', '🔧 BudgetMe Email Verification Troubleshooter');
  log('magenta', '===========================================');
  
  // Run all checks
  await checkSupabaseConnection();
  checkEnvironmentVariables();
  await checkAuthSettings();
  await testEmailFunctionality();
  provideSolutions();
  
  log('magenta', '\n📚 For more help, check: EMAIL_VERIFICATION_TROUBLESHOOTING.md');
}

// Run the script
main().catch(console.error);