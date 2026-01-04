const { createClient } = require('@supabase/supabase-js');

// You can set these as environment variables or hardcode them temporarily
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables');
  console.log('\nYou can set them temporarily by running:');
  console.log('$env:REACT_APP_SUPABASE_URL="your-url"');
  console.log('$env:REACT_APP_SUPABASE_ANON_KEY="your-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
  const userEmail = 'pczceducation@gmail.com';
  
  console.log('🔍 Checking data for user:', userEmail);
  console.log('='.repeat(60));
  
  try {
    // 1. Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', userEmail)
      .single();
    
    if (userError) {
      console.error('❌ Error finding user:', userError.message);
      return;
    }
    
    if (!userData) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:');
    console.log('   ID:', userData.id);
    console.log('   Name:', userData.full_name);
    console.log('');
    
    const userId = userData.id;
    
    // 2. Get all transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (txError) {
      console.error('❌ Error fetching transactions:', txError.message);
      return;
    }
    
    console.log(`📊 Total transactions: ${transactions?.length || 0}`);
    console.log('');
    
    if (!transactions || transactions.length === 0) {
      console.log('❌ No transactions found for this user');
      return;
    }
    
    // 3. Analyze by type
    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    console.log(`💰 Income transactions: ${income.length}`);
    console.log(`💸 Expense transactions: ${expenses.length}`);
    console.log('');
    
    // 4. Analyze by month
    const monthlyData = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0, count: 0 };
      }
      
      monthlyData[monthKey].count++;
      if (tx.type === 'income') {
        monthlyData[monthKey].income += Number(tx.amount);
      } else if (tx.type === 'expense') {
        monthlyData[monthKey].expense += Number(tx.amount);
      }
    });
    
    console.log('📅 Transactions by Month:');
    console.log('='.repeat(60));
    
    const sortedMonths = Object.keys(monthlyData).sort();
    sortedMonths.forEach(month => {
      const data = monthlyData[month];
      console.log(`   ${month}:`);
      console.log(`      Total: ${data.count} transactions`);
      console.log(`      Income: ₱${data.income.toFixed(2)}`);
      console.log(`      Expense: ₱${data.expense.toFixed(2)}`);
      console.log('');
    });
    
    // 5. Check if trends can be calculated
    const expenseMonths = sortedMonths.filter(month => monthlyData[month].expense > 0);
    
    console.log('='.repeat(60));
    console.log('🎯 Trends Analysis:');
    console.log(`   Months with expense data: ${expenseMonths.length}`);
    
    if (expenseMonths.length >= 2) {
      console.log('   ✅ SUFFICIENT DATA - Trends should display');
    } else if (expenseMonths.length === 1) {
      console.log('   ⚠️  ONLY 1 MONTH - Need at least 2 months for trends');
    } else {
      console.log('   ❌ NO EXPENSE DATA - Cannot calculate trends');
    }
    
    // 6. Show recent transactions
    console.log('');
    console.log('='.repeat(60));
    console.log('📝 Recent Transactions (last 5):');
    console.log('='.repeat(60));
    
    transactions.slice(0, 5).forEach(tx => {
      console.log(`   ${tx.date} | ${tx.type.toUpperCase()} | ₱${Number(tx.amount).toFixed(2)} | ${tx.notes || 'No notes'}`);
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkUserData();
