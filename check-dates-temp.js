const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noagsxfixjrgatexuwxm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYWdzeGZpeGpyZ2F0ZXh1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTg3NjQsImV4cCI6MjA3NDQ3NDc2NH0.YZsBQZELvzfSfK-QlKr9iAAJWc_blCrCWqy5WACYZvM';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'ff512b39-c50d-4682-b362-905a9864bd43';

async function checkDateRange() {
  const now = new Date();
  console.log('Current date:', now.toISOString());
  console.log('Current year:', now.getFullYear());
  console.log('Current month:', now.getMonth() + 1);
  console.log('');
  
  // Simulate the timeframe='month' logic from processIncomeExpenseData
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  startDate.setMonth(startDate.getMonth() - 5); // Go back 5 months
  
  console.log('Start date for 6-month view:', startDate.toISOString());
  console.log('End date:', now.toISOString());
  console.log('');
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lte('date', now.toISOString())
    .order('date', { ascending: false });
    
  console.log('Transactions in date range:', transactions?.length || 0);
  console.log('');
  
  // Show date range of transactions
  if (transactions && transactions.length > 0) {
    console.log('Earliest transaction:', transactions[transactions.length - 1].date);
    console.log('Latest transaction:', transactions[0].date);
  }
}

checkDateRange();
