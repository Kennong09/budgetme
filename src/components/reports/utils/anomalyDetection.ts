import { Transaction } from '../hooks';

export interface Anomaly {
  id: string;
  type: 'duplicate' | 'unusual_amount' | 'missing_transaction' | 'spending_spike' | 'data_error';
  severity: 'warning' | 'info' | 'error';
  message: string;
  transactions?: Transaction[];
  details?: any;
  actionable: boolean;
}

/**
 * Detects various types of anomalies in transaction data.
 * 
 * @param transactions - All transactions to analyze
 * @returns Array of detected anomalies
 */
export const detectAnomalies = (transactions: Transaction[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  // 1. Detect duplicate transactions
  const duplicates = findDuplicateTransactions(transactions);
  duplicates.forEach((group, index) => {
    anomalies.push({
      id: `duplicate-${index}`,
      type: 'duplicate',
      severity: 'warning',
      message: `Possible duplicate: ${group[0].description || 'Transaction'} (₱${group[0].amount.toLocaleString()}) appears ${group.length} times on ${new Date(group[0].date).toLocaleDateString()}`,
      transactions: group,
      actionable: true
    });
  });

  // 2. Detect unusual amounts (statistical outliers)
  const unusualAmounts = findUnusualAmounts(transactions);
  unusualAmounts.forEach((tx, index) => {
    const avgAmount = calculateAverageAmount(transactions);
    const isHigh = tx.amount > avgAmount * 2;
    
    anomalies.push({
      id: `unusual-${index}`,
      type: 'unusual_amount',
      severity: 'info',
      message: `Unusually ${isHigh ? 'high' : 'low'} ${tx.type}: ₱${tx.amount.toLocaleString()} (${isHigh ? 'above' : 'below'} typical amount)`,
      transactions: [tx],
      details: {
        averageAmount: avgAmount,
        deviation: Math.abs(tx.amount - avgAmount)
      },
      actionable: false
    });
  });

  // 3. Detect missing expected transactions (e.g., monthly income)
  const missingIncome = detectMissingIncomeTransactions(transactions);
  if (missingIncome.length > 0) {
    anomalies.push({
      id: 'missing-income',
      type: 'missing_transaction',
      severity: 'warning',
      message: `No income recorded for ${missingIncome.join(', ')}. This may indicate missing data.`,
      details: { missingMonths: missingIncome },
      actionable: true
    });
  }

  // 4. Detect spending spikes
  const spikes = detectSpendingSpikes(transactions);
  spikes.forEach((spike, index) => {
    anomalies.push({
      id: `spike-${index}`,
      type: 'spending_spike',
      severity: 'warning',
      message: `Spending spike detected in ${spike.month}: ₱${spike.amount.toLocaleString()} (${spike.percentageIncrease.toFixed(0)}% increase from average)`,
      details: spike,
      actionable: false
    });
  });

  // 5. Detect data errors (negative amounts, future dates, etc.)
  const dataErrors = detectDataErrors(transactions);
  dataErrors.forEach((error, index) => {
    anomalies.push({
      id: `error-${index}`,
      type: 'data_error',
      severity: 'error',
      message: error.message,
      transactions: [error.transaction],
      actionable: true
    });
  });

  return anomalies;
};

/**
 * Finds duplicate transactions (same amount, date, and description within 1 day).
 * 
 * @param transactions - Transactions to check
 * @returns Arrays of duplicate transaction groups
 */
const findDuplicateTransactions = (transactions: Transaction[]): Transaction[][] => {
  const duplicates: Transaction[][] = [];
  const seen = new Map<string, Transaction[]>();

  transactions.forEach(tx => {
    // Create a key based on amount, date, and description
    const date = new Date(tx.date).toDateString();
    const key = `${tx.amount}-${date}-${tx.description || ''}`.toLowerCase();

    if (seen.has(key)) {
      seen.get(key)!.push(tx);
    } else {
      seen.set(key, [tx]);
    }
  });

  // Only return groups with more than one transaction
  seen.forEach(group => {
    if (group.length > 1) {
      duplicates.push(group);
    }
  });

  return duplicates;
};

/**
 * Finds transactions with unusual amounts (>2 standard deviations from mean).
 * 
 * @param transactions - Transactions to analyze
 * @returns Array of unusual transactions
 */
const findUnusualAmounts = (transactions: Transaction[]): Transaction[] => {
  if (transactions.length < 10) {
    return []; // Need sufficient data for statistical analysis
  }

  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  
  // Calculate standard deviation
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Find outliers (>2 standard deviations)
  return transactions.filter(tx => {
    const zScore = Math.abs(tx.amount - mean) / stdDev;
    return zScore > 2;
  }).slice(0, 5); // Limit to top 5 outliers
};

/**
 * Calculates average transaction amount.
 * 
 * @param transactions - Transactions to average
 * @returns Average amount
 */
const calculateAverageAmount = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 0;
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  return total / transactions.length;
};

/**
 * Detects months missing expected income transactions.
 * 
 * @param transactions - All transactions
 * @returns Array of month names missing income
 */
const detectMissingIncomeTransactions = (transactions: Transaction[]): string[] => {
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  
  if (incomeTransactions.length === 0) {
    return []; // No income pattern to check
  }

  // Get all unique months from transactions
  const allMonths = new Set<string>();
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    allMonths.add(monthKey);
  });

  // Check which months have no income
  const missingMonths: string[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  allMonths.forEach(monthKey => {
    const hasIncome = incomeTransactions.some(tx => {
      const date = new Date(tx.date);
      const txMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return txMonthKey === monthKey;
    });

    if (!hasIncome) {
      const [year, month] = monthKey.split('-');
      const monthName = monthNames[parseInt(month) - 1];
      missingMonths.push(`${monthName} ${year}`);
    }
  });

  return missingMonths;
};

/**
 * Detects significant spending spikes (>50% increase from average).
 * 
 * @param transactions - All transactions
 * @returns Array of detected spikes
 */
const detectSpendingSpikes = (transactions: Transaction[]): any[] => {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  if (expenseTransactions.length === 0) {
    return [];
  }

  // Group by month
  const monthlySpending = new Map<string, number>();
  expenseTransactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    monthlySpending.set(
      monthKey,
      (monthlySpending.get(monthKey) || 0) + tx.amount
    );
  });

  // Calculate average monthly spending
  const amounts = Array.from(monthlySpending.values());
  const avgSpending = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

  // Find spikes (>50% above average)
  const spikes: any[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  monthlySpending.forEach((amount, monthKey) => {
    if (amount > avgSpending * 1.5) {
      const [year, month] = monthKey.split('-');
      const monthName = monthNames[parseInt(month) - 1];
      const percentageIncrease = ((amount - avgSpending) / avgSpending) * 100;
      
      spikes.push({
        month: `${monthName} ${year}`,
        amount,
        averageAmount: avgSpending,
        percentageIncrease
      });
    }
  });

  return spikes;
};

/**
 * Detects data errors in transactions.
 * 
 * @param transactions - Transactions to check
 * @returns Array of data errors
 */
const detectDataErrors = (transactions: Transaction[]): any[] => {
  const errors: any[] = [];
  const now = new Date();

  transactions.forEach(tx => {
    // Check for negative amounts
    if (tx.amount < 0) {
      errors.push({
        transaction: tx,
        message: `Negative amount detected: ₱${tx.amount.toLocaleString()} for ${tx.description || 'transaction'}`
      });
    }

    // Check for future dates (more than 1 day ahead)
    const txDate = new Date(tx.date);
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    if (txDate > oneDayFromNow) {
      errors.push({
        transaction: tx,
        message: `Future date detected: ${txDate.toLocaleDateString()} for ${tx.description || 'transaction'}`
      });
    }

    // Check for missing critical data
    if (!tx.account_id) {
      errors.push({
        transaction: tx,
        message: `Missing account information for transaction ${tx.id.substring(0, 8)}...`
      });
    }
  });

  return errors.slice(0, 10); // Limit to top 10 errors
};

/**
 * Gets severity badge color for anomaly type.
 * 
 * @param severity - Anomaly severity
 * @returns Bootstrap color class
 */
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'error': return 'danger';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'secondary';
  }
};
