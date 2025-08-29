import { Transaction, Category, MonthlyData, CategoryData } from '../types';

/**
 * Calculate monthly data from transactions for the past 5 months
 */
export const calculateMonthlyData = (userId: string, transactions: Transaction[]): MonthlyData => {
  const months = [
    "January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October",
    "November", "December"
  ];
  
  const currentDate = new Date();
  const labels: string[] = [];
  const incomeData: number[] = [];
  const expenseData: number[] = [];
  
  // Generate data for past 4 months plus current month
  for (let i = 4; i >= 0; i--) {
    // Calculate month by subtracting i months from current date
    const monthDate = new Date(currentDate);
    monthDate.setMonth(currentDate.getMonth() - i);
    
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const monthName = months[monthDate.getMonth()];
    labels.push(monthName);
    
    // Get transactions for this month
    const monthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });
    
    // Calculate income and expenses
    const monthlyIncome = monthTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    const monthlyExpenses = monthTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
      
    incomeData.push(monthlyIncome);
    expenseData.push(monthlyExpenses);
  }
  
  return {
    labels: labels,
    datasets: [
      {
        label: "Income",
        data: incomeData,
        backgroundColor: "#4CAF50",
        borderColor: "#4CAF50",
        borderWidth: 1,
      },
      {
        label: "Expenses",
        data: expenseData,
        backgroundColor: "#F44336",
        borderColor: "#F44336",
        borderWidth: 1,
      },
    ],
  };
};

/**
 * Calculate category data from filtered transactions
 */
export const calculateCategoryDataFiltered = (
  transactions: Transaction[], 
  expenseCategories: Category[]
): CategoryData => {
  // Filter for expense transactions only
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  
  // Group by category
  const categoryMap = new Map<string, number>();
  const categoryNames = new Map<string, string>();
  
  expenseTransactions.forEach(tx => {
    if (tx.category_id) {
      // Add to category total
      const currentTotal = categoryMap.get(tx.category_id) || 0;
      const amount = parseFloat(tx.amount.toString()) || 0;
      categoryMap.set(tx.category_id, currentTotal + amount);
      
      // Store category name
      const category = expenseCategories.find(cat => cat.id === tx.category_id);
      if (category) {
        categoryNames.set(tx.category_id, category.category_name);
      } else {
        categoryNames.set(tx.category_id, 'Uncategorized');
      }
    }
  });
  
  // Prepare data for chart
  const labels: string[] = [];
  const data: number[] = [];
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#7BC225"];
  
  let colorIndex = 0;
  const backgroundColor: string[] = [];
  
  categoryMap.forEach((amount, categoryId) => {
    labels.push(categoryNames.get(categoryId) || `Category ${categoryId}`);
    data.push(amount);
    backgroundColor.push(colors[colorIndex % colors.length]);
    colorIndex++;
  });
  
  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: backgroundColor,
      },
    ],
  };
};

/**
 * Calculate category data from transactions within a date range
 */
export const calculateCategoryData = (
  userId: string,
  startDate: string,
  endDate: string,
  transactions: Transaction[],
  expenseCategories: Category[]
): CategoryData => {
  // Filter transactions for the current month and type expense
  const expenseTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return tx.type === 'expense' && 
           txDate >= new Date(startDate) && 
           txDate <= new Date(endDate);
  });
  
  // Group by category
  const categoryMap = new Map<string, number>();
  const categoryNames = new Map<string, string>();
  
  expenseTransactions.forEach(tx => {
    if (tx.category_id) {
      // Add to category total
      const currentTotal = categoryMap.get(tx.category_id) || 0;
      const amount = parseFloat(tx.amount.toString()) || 0;
      categoryMap.set(tx.category_id, currentTotal + amount);
      
      // Store category name
      const category = expenseCategories.find(cat => cat.id === tx.category_id);
      if (category) {
        categoryNames.set(tx.category_id, category.category_name);
      } else {
        categoryNames.set(tx.category_id, 'Uncategorized');
      }
    }
  });
  
  // Prepare data for chart
  const labels: string[] = [];
  const data: number[] = [];
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#7BC225"];
  
  let colorIndex = 0;
  const backgroundColor: string[] = [];
  
  categoryMap.forEach((amount, categoryId) => {
    labels.push(categoryNames.get(categoryId) || `Category ${categoryId}`);
    data.push(amount);
    backgroundColor.push(colors[colorIndex % colors.length]);
    colorIndex++;
  });
  
  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: backgroundColor,
      },
    ],
  };
};

/**
 * Get month range text for chart titles
 */
export const getMonthRangeText = (currentDate: Date): string => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const currentMonth = months[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();
  
  // Calculate start month (4 months before)
  const startDate = new Date(currentDate);
  startDate.setMonth(currentDate.getMonth() - 4);
  const startMonth = months[startDate.getMonth()];
  const startYear = startDate.getFullYear();
  
  // Create range text
  return startYear === currentYear 
    ? `${startMonth}-${currentMonth} ${currentYear}` 
    : `${startMonth} ${startYear}-${currentMonth} ${currentYear}`;
};
