import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// RLS Policy SQL statements
const rlsPolicies = `
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Families table policies
CREATE POLICY "Users can view public families" ON public.families
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own families" ON public.families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
      AND family_members.status = 'active'
    )
  );

CREATE POLICY "Family admins can update family" ON public.families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'admin'
      AND family_members.status = 'active'
    )
  );

-- Family members policies
CREATE POLICY "Users can view family members of their families" ON public.family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'active'
    )
  );

CREATE POLICY "Family admins can manage members" ON public.family_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
      AND fm.status = 'active'
    )
  );

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- Income categories policies
CREATE POLICY "Users can view own income categories" ON public.income_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own income categories" ON public.income_categories
  FOR ALL USING (auth.uid() = user_id);

-- Expense categories policies
CREATE POLICY "Users can view own expense categories" ON public.expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own expense categories" ON public.expense_categories
  FOR ALL USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id);
`;

async function applyRLS() {
  try {
    console.log('🔒 Applying Row Level Security policies...');
    
    // Execute RLS policies
    await prisma.$executeRawUnsafe(rlsPolicies);
    
    console.log('✅ RLS policies applied successfully');
    
    // Apply additional SQL files from src/sql if needed
    const sqlDir = path.join(__dirname, '..', 'src', 'sql');
    const additionalSqlFiles = [
      'add-helper-functions.sql',
      'create-views.sql',
      'create-triggers.sql'
    ];
    
    for (const file of additionalSqlFiles) {
      const filePath = path.join(sqlDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`📄 Applying ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await prisma.$executeRawUnsafe(sql);
        console.log(`✅ ${file} applied`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  applyRLS().catch(console.error);
}

export { applyRLS };
