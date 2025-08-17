#!/usr/bin/env node
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const STEPS = [
  '1. Validate environment',
  '2. Generate Prisma Client',
  '3. Push schema to database',
  '4. Apply RLS policies',
  '5. Seed initial data'
];

function validateEnvironment() {
  console.log('🔍 Validating environment...');
  
  const requiredVars = ['DATABASE_URL', 'DIRECT_URL'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}\nPlease update your .env file`);
  }
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    console.warn('⚠️  .env file not found. Creating from .env.example...');
    fs.copyFileSync('.env.example', '.env');
    throw new Error('Please update the .env file with your Supabase credentials');
  }
  
  console.log('✅ Environment validated');
}

function runCommand(command: string, description: string) {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    throw error;
  }
}

async function migrate() {
  console.log('🚀 Starting Supabase migration process...\n');
  console.log('Steps:', STEPS.join('\n'));
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    // Step 1: Validate environment
    validateEnvironment();
    
    // Step 2: Generate Prisma Client
    runCommand('npx prisma generate', 'Generating Prisma Client');
    
    // Step 3: Push schema to database
    console.log('\n⚠️  WARNING: This will modify your database schema');
    console.log('Make sure you have a backup before proceeding.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    runCommand('npx prisma db push --skip-generate', 'Pushing schema to database');
    
    // Step 4: Apply RLS policies
    runCommand('npx ts-node prisma/apply-rls.ts', 'Applying RLS policies');
    
    // Step 5: Seed data (optional)
    const seedResponse = await promptUser('Do you want to seed initial data? (y/n): ');
    if (seedResponse.toLowerCase() === 'y') {
      runCommand('npx ts-node prisma/seed.ts', 'Seeding database');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test your database connection with: npx prisma studio');
    console.log('2. Start using Prisma Client in your application');
    console.log('3. Check the PRISMA_SETUP.md for usage examples');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

function promptUser(question: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run migration
if (require.main === module) {
  migrate();
}
