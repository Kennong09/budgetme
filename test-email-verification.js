#!/usr/bin/env node

/**
 * Simple Email Verification Test for BudgetMe
 * This script tests the email verification with your actual email
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ryoujebxyvvazvtxjhlf.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b3VqZWJ4eXZ2YXp2dHhqaGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzQ5MzYsImV4cCI6MjA2NDg1MDkzNn0.RhHY62oiflpKuv6jcV6xkXiCWerrAodRibQDP0TxXrM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailVerification() {
  console.log('🧪 Testing Email Verification with your email: ashrifmussalam@gmail.com');
  console.log('================================================================');
  
  try {
    // Test resend verification for existing email
    console.log('\n📧 Attempting to resend verification email...');
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: 'ashrifmussalam@gmail.com',
      options: {
        emailRedirectTo: `${process.env.REACT_APP_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) {
      console.log('❌ Error:', error.message);
      
      // If user doesn't exist or email already confirmed, let's check user status
      console.log('\n🔍 Checking user status...');
      
      // Try to sign in to see current status
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'ashrifmussalam@gmail.com',
        password: 'dummy' // This will fail but give us info about the user
      });
      
      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          console.log('⚠️  User exists but email not confirmed');
          console.log('📧 Try signing up again or use the resend button in the app');
        } else if (signInError.message.includes('Invalid login credentials')) {
          console.log('✅ User might exist - try logging in with correct password');
        } else {
          console.log('❌ Error checking user status:', signInError.message);
        }
      }
    } else {
      console.log('✅ Resend verification email sent successfully!');
      console.log('📧 Check your inbox (and spam folder) for the verification email');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check your email inbox for verification email');
  console.log('2. Check your spam/junk folder');
  console.log('3. If no email, try the solutions in EMAIL_VERIFICATION_TROUBLESHOOTING.md');
  console.log('4. Consider setting up custom SMTP in Supabase for better delivery');
}

testEmailVerification().catch(console.error);