const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://noagsxfixjrgatexuwxm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vYWdzeGZpeGpyZ2F0ZXh1d3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTg3NjQsImV4cCI6MjA3NDQ3NDc2NH0.YZsBQZELvzfSfK-QlKr9iAAJWc_blCrCWqy5WACYZvM';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'ff512b39-c50d-4682-b362-905a9864bd43';

async function analyzeMonthlySavings() {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
    
  // Group by month
  const monthlyData = {};
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, contribution: 0 };
    }
    
    if (tx.type === 'income') {
      monthlyData[monthKey].income += parseFloat(tx.amount);
    } else if (tx.type === 'expense') {
      monthlyData[monthKey].expenses += parseFloat(tx.amount);
    } else if (tx.type === 'contribution') {
      monthlyData[monthKey].contribution += parseFloat(tx.amount);
    }
  });
  
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  months.forEach((month, i) => {
    const monthKey = '2025-' + String(i + 6).padStart(2, '0');
    const data = monthlyData[monthKey] || { income: 0, expenses: 0, contribution: 0 };
    const savings = data.income - data.expenses;
    const savingsRate = data.income > 0 ? (savings / data.income) * 100 : 0;
    
    console.log(month + ' 2025:', 
      'Income:', data.income.toFixed(2),
      'Expenses:', data.expenses.toFixed(2),
      'Contribution:', data.contribution.toFixed(2),
      'Savings:', savings.toFixed(2),
      'Rate:', savingsRate.toFixed(1) + '%'
    );
  });
}

analyzeMonthlySavings();
