const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noagsxfixjrgatexuwxm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYWdzeGZpeGpyZ2F0ZXh1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTg3NjQsImV4cCI6MjA3NDQ3NDc2NH0.YZsBQZELvzfSfK-QlKr9iAAJWc_blCrCWqy5WACYZvM';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'ff512b39-c50d-4682-b362-905a9864bd43';

async function checkData() {
  console.log('Checking data for user:', userId);
  console.log('='.repeat(60));
  
  // Get transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
    
  if (txError) {
    console.error('Error:', txError.message);
    return;
  }
  
  console.log('Total transactions:', transactions?.length || 0);
  
  if (!transactions || transactions.length === 0) {
    console.log('No transactions found');
    return;
  }
  
  // Analyze by type
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  console.log('Income transactions:', income.length);
  console.log('Expense transactions:', expenses.length);
  console.log('');
  
  // Sample transactions
  console.log('Sample transactions:');
  transactions.slice(0, 10).forEach(tx => {
    console.log(tx.date, '|', tx.type, '|', tx.amount, '| cat_id:', tx.category_id, '| notes:', tx.notes);
  });
  
  // Check categories
  const { data: incomeCategories } = await supabase
    .from('income_categories')
    .select('*');
    
  const { data: expenseCategories } = await supabase
    .from('expense_categories')
    .select('*');
    
  console.log('');
  console.log('Income categories:', incomeCategories?.length || 0);
  console.log('Expense categories:', expenseCategories?.length || 0);
}

checkData();
