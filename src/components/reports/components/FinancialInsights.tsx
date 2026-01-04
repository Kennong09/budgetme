import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Category, getTransactionCategoryId } from '../hooks';
import { ReportType } from './ReportControls';
import { formatCurrency } from '../../../utils/helpers';
import { useAuth } from '../../../utils/AuthContext';
import { supabase } from '../../../utils/supabaseClient';
import { toast } from 'react-toastify';
import { env } from '../../../utils/env';

interface FinancialInsightsProps {
  reportType: ReportType;
  reportData: any;
  transactions: Transaction[];
  categories: Category[];
  timeframe?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  onInsightsChange?: (insights: Insight[]) => void;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  icon: string;
  title: string;
  description: string;
  actionable?: boolean;
  actionText?: string;
}

/**
 * Replaces currency symbols in text with PHP symbol.
 * Handles: $, USD, US$, dollar signs before numbers
 * 
 * @param text - Text to sanitize
 * @returns Text with PHP currency symbols
 */
const replaceCurrencySymbols = (text: string): string => {
  if (!text) return text;
  
  // Replace common USD patterns
  let sanitized = text;
  
  // Replace $X,XXX or $X with ₱X,XXX or ₱X
  sanitized = sanitized.replace(/\$\s*(\d)/g, '₱$1');
  
  // Replace USD X,XXX with ₱X,XXX
  sanitized = sanitized.replace(/USD\s*(\d)/g, '₱$1');
  
  // Replace US$ X,XXX with ₱X,XXX
  sanitized = sanitized.replace(/US\$\s*(\d)/g, '₱$1');
  
  // Replace standalone $ that might be missed
  sanitized = sanitized.replace(/\$/g, '₱');
  
  // Replace "USD" or "dollars" mentions
  sanitized = sanitized.replace(/\bUSD\b/g, 'PHP');
  sanitized = sanitized.replace(/\bdollars?\b/gi, 'pesos');
  
  return sanitized;
};

/**
 * Sanitizes AI response to ensure all currency symbols are PHP (₱).
 * Replaces USD, $, and other currency symbols with ₱.
 * 
 * @param insights - Array of insights from AI
 * @returns Sanitized insights with PHP currency
 */
const sanitizeCurrencyInResponse = (insights: Insight[]): Insight[] => {
  let replacementCount = 0;
  
  const sanitized = insights.map(insight => {
    const originalTitle = insight.title;
    const originalDescription = insight.description;
    
    const sanitizedInsight = {
      ...insight,
      title: replaceCurrencySymbols(insight.title),
      description: replaceCurrencySymbols(insight.description),
      actionText: insight.actionText ? replaceCurrencySymbols(insight.actionText) : undefined
    };
    
    if (originalTitle !== sanitizedInsight.title || 
        originalDescription !== sanitizedInsight.description) {
      replacementCount++;
    }
    
    return sanitizedInsight;
  });
  
  if (replacementCount > 0) {
    console.warn(`[Currency Fix] Replaced USD symbols in ${replacementCount} insights`);
  }
  
  return sanitized;
};

/**
 * Generates report-type-specific prompts for AI analysis.
 * Each report type gets a unique prompt tailored to its data and purpose.
 * 
 * @param reportType - Type of report being analyzed
 * @param context - Prepared financial context
 * @returns Specialized prompt for the report type
 */
const getReportSpecificPrompt = (reportType: ReportType, context: any): string => {
  const baseInstructions = `IMPORTANT CURRENCY INSTRUCTIONS:
- All monetary amounts MUST use Philippine Peso (₱) currency symbol
- NEVER use USD, $, or any other currency symbol
- Format amounts as: ₱X,XXX.XX (e.g., ₱15,000.00)
- The user is based in the Philippines and all amounts are in PHP

IMPORTANT TRANSACTION CATEGORIZATION RULES:
- Goal contributions and transfers are NOT uncategorized - they don't need categories
- Goal contributions are linked to specific financial goals
- Transfers are just moving money between accounts
- Only count expenses and income transactions without categories as "uncategorized"
- If uncategorizedCount is 0, DO NOT mention uncategorized transactions at all

OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "type": "success" | "warning" | "info" | "tip",
    "title": "string (max 10 words)",
    "description": "string (max 50 words, use ₱ for amounts)",
    "actionable": boolean,
    "actionText": "string (optional, if actionable is true)"
  }
]`;

  switch (reportType) {
    case 'spending':
      return `You are a financial advisor specializing in SPENDING ANALYSIS. Analyze the user's spending patterns and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR SPENDING REPORT:
1. Top spending categories - identify where most money goes
2. Spending concentration - is spending too focused on one category?
3. Discretionary vs essential spending balance
4. Unusual or concerning spending patterns
5. Opportunities to reduce spending in specific categories
6. Comparison of category spending to typical budgets

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Which categories consume the most budget
- Whether spending distribution is healthy
- Specific categories where user could save money
- Red flags in spending patterns
- Positive spending habits to maintain`;

    case 'income-expense':
      return `You are a financial advisor specializing in INCOME vs EXPENSE ANALYSIS. Analyze the user's cash flow patterns and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR INCOME-EXPENSE REPORT:
1. Monthly cash flow trends - is income growing or declining?
2. Expense trends - are expenses increasing faster than income?
3. Income stability - consistent or volatile?
4. Expense control - are expenses under control?
5. Cash flow gaps - months with negative cash flow
6. Income diversification opportunities

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Income vs expense balance over time
- Months with surplus or deficit
- Trends in income growth or decline
- Expense growth patterns
- Cash flow stability and predictability
- Recommendations for improving cash flow`;

    case 'savings':
      return `You are a financial advisor specializing in SAVINGS ANALYSIS. Analyze the user's savings behavior and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR SAVINGS REPORT:
1. Savings rate - compare to 20% benchmark
2. Savings consistency - regular or sporadic?
3. Savings trends - improving or declining?
4. Emergency fund adequacy (3-6 months expenses)
5. Savings goals alignment
6. Opportunities to increase savings rate

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Current savings rate vs recommended 20%
- Savings consistency month-over-month
- Whether savings are growing or shrinking
- Emergency fund status
- Specific ways to increase savings
- Celebrate good savings habits`;

    case 'trends':
      return `You are a financial advisor specializing in FINANCIAL TREND ANALYSIS. Analyze spending trends across categories and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR TRENDS REPORT:
1. Categories with biggest increases - why are they growing?
2. Categories with biggest decreases - positive or concerning?
3. Seasonal patterns in spending
4. Emerging spending habits (new categories)
5. Trend sustainability - are changes temporary or permanent?
6. Proactive recommendations based on trends

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Which categories show the most significant changes
- Whether spending trends are positive or negative
- Potential reasons for major changes
- Categories requiring immediate attention
- Trends that indicate good financial habits
- Predictions about future spending if trends continue`;

    case 'goals':
      return `You are a financial advisor specializing in FINANCIAL GOALS ANALYSIS. Analyze the user's progress toward financial goals and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR GOALS REPORT:
1. Goal progress rate - on track or behind?
2. Goal prioritization - are high-priority goals funded adequately?
3. Budget allocation to goals - sufficient or insufficient?
4. Goal timeline feasibility - realistic or need adjustment?
5. Goal contribution consistency
6. Recommendations for accelerating goal achievement

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Which goals are progressing well
- Which goals need more attention or funding
- Whether goal timelines are realistic
- Budget allocation efficiency for goals
- Strategies to accelerate goal completion
- Celebrate milestones and progress`;

    case 'predictions':
      return `You are a financial advisor specializing in FINANCIAL FORECASTING. Analyze predicted future income and expenses and provide 3-5 actionable insights.

${baseInstructions}

FOCUS AREAS FOR PREDICTIONS REPORT:
1. Future cash flow projections - surplus or deficit expected?
2. Expense trajectory - sustainable or concerning?
3. Income stability in projections
4. Potential financial risks in coming months
5. Opportunities to improve future financial position
6. Proactive steps to take now for better future outcomes

Context:
${JSON.stringify(context, null, 2)}

Provide insights specifically about:
- Expected financial position in coming months
- Potential cash flow problems to prepare for
- Opportunities to improve projected outcomes
- Whether current spending is sustainable
- Recommendations for adjusting current behavior
- Long-term financial health indicators`;

    default:
      return `You are a financial advisor analyzing user's financial data. Based on the provided data, generate 3-5 actionable insights.

${baseInstructions}

Context:
${JSON.stringify(context, null, 2)}

Be specific, use actual numbers from the data with ₱ symbol, and provide realistic advice.`;
  }
};

/**
 * Generates AI-powered financial insights using OpenRouter API.
 * 
 * @param reportType - Type of report being analyzed
 * @param reportData - Processed report data
 * @param transactions - Raw transaction data
 * @param categories - Available categories
 * @returns Array of insights
 */
const generateInsights = async (
  reportType: ReportType,
  reportData: any,
  transactions: Transaction[],
  categories: Category[]
): Promise<Insight[]> => {
  try {
    const apiKey = env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      // Return fallback insights if API not available
      return generateFallbackInsights(reportType, reportData, transactions);
    }

    // Prepare context for AI
    const context = prepareContextForAI(reportType, reportData, transactions, categories);

    // Get report-specific prompt
    const prompt = getReportSpecificPrompt(reportType, context);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BudgetMe - Financial Insights'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const rawInsights = JSON.parse(jsonMatch[0]);
    
    // Add icons and IDs
    const insightsWithIcons = rawInsights.map((insight: any, index: number) => ({
      id: `insight-${index}`,
      ...insight,
      icon: getIconForType(insight.type)
    }));
    
    // Sanitize currency symbols in response
    return sanitizeCurrencyInResponse(insightsWithIcons);

  } catch (error) {
    console.error('Error generating insights:', error);
    return generateFallbackInsights(reportType, reportData, transactions);
  }
};

/**
 * Formats report data to include PHP currency symbols.
 * 
 * @param reportType - Type of report
 * @param reportData - Raw report data
 * @returns Formatted report data with currency
 */
const formatReportData = (reportType: ReportType, reportData: any): any => {
  if (!reportData) return reportData;
  
  if (reportType === 'spending' && Array.isArray(reportData)) {
    return reportData.slice(0, 5).map(item => ({
      ...item,
      value: item.value,
      formattedValue: formatCurrency(item.value)
    }));
  }
  
  if (reportType === 'savings' && Array.isArray(reportData)) {
    return reportData.map(item => ({
      ...item,
      income: item.income,
      expenses: item.expenses,
      savings: item.savings,
      formattedIncome: formatCurrency(item.income),
      formattedExpenses: formatCurrency(item.expenses),
      formattedSavings: formatCurrency(item.savings)
    }));
  }
  
  return reportData;
};

/**
 * Prepares financial context for AI analysis.
 * Formats all monetary amounts with PHP currency symbol.
 */
const prepareContextForAI = (
  reportType: ReportType,
  reportData: any,
  transactions: Transaction[],
  categories: Category[]
): any => {
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  // Count uncategorized transactions, excluding goal contributions and transfers
  // Goal contributions and transfers don't need categories
  const uncategorizedCount = transactions.filter(t => 
    !getTransactionCategoryId(t) && t.type !== 'contribution' && t.type !== 'transfer'
  ).length;
  
  const categorizedPercentage = transactions.length > 0
    ? ((transactions.length - uncategorizedCount) / transactions.length) * 100
    : 0;

  return {
    currency: 'PHP',
    currencySymbol: '₱',
    reportType,
    totalTransactions: transactions.length,
    totalIncome: formatCurrency(totalIncome),
    totalIncomeRaw: totalIncome,
    totalExpenses: formatCurrency(totalExpenses),
    totalExpensesRaw: totalExpenses,
    netSavings: formatCurrency(totalIncome - totalExpenses),
    netSavingsRaw: totalIncome - totalExpenses,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    uncategorizedCount,
    categorizedPercentage,
    reportData: formatReportData(reportType, reportData)
  };
};

/**
 * Generates fallback insights using heuristics when AI is unavailable.
 * Now includes report-type-specific insights.
 */
const generateFallbackInsights = (
  reportType: ReportType,
  reportData: any,
  transactions: Transaction[]
): Insight[] => {
  const insights: Insight[] = [];

  // Separate transaction types
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const contributionTransactions = transactions.filter(t => t.type === 'contribution');
  
  // Count uncategorized transactions (only expenses and income need categories)
  const uncategorizedExpenses = expenseTransactions.filter(t => !getTransactionCategoryId(t)).length;
  const uncategorizedIncome = incomeTransactions.filter(t => !getTransactionCategoryId(t)).length;
  const uncategorizedCount = uncategorizedExpenses + uncategorizedIncome;
  
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalContributions = contributionTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Report-type-specific insights
  switch (reportType) {
    case 'spending':
      // Top spending category
      if (Array.isArray(reportData) && reportData.length > 0) {
        const topCategory = reportData[0];
        if (topCategory && topCategory.value) {
          const percentage = (topCategory.value / totalExpenses) * 100;
          insights.push({
            id: 'top-spending',
            type: percentage > 50 ? 'warning' : 'info',
            icon: 'fas fa-chart-pie',
            title: `Highest Spending: ${topCategory.name}`,
            description: `Your ${topCategory.name} expenses account for ${percentage.toFixed(1)}% of total spending (₱${topCategory.value.toLocaleString()}). ${percentage > 50 ? 'This concentration may be risky.' : 'Consider if this aligns with your priorities.'}`,
            actionable: percentage > 50
          });
        }

        // Spending diversity
        if (reportData.length >= 3) {
          const top3Total = reportData.slice(0, 3).reduce((sum: number, cat: any) => sum + cat.value, 0);
          const top3Percentage = (top3Total / totalExpenses) * 100;
          insights.push({
            id: 'spending-diversity',
            type: 'info',
            icon: 'fas fa-layer-group',
            title: 'Spending Distribution',
            description: `Your top 3 categories represent ${top3Percentage.toFixed(0)}% of spending. ${top3Percentage > 80 ? 'Consider diversifying your budget allocation.' : 'Your spending is well-distributed across categories.'}`,
            actionable: false
          });
        }
      }
      break;

    case 'income-expense':
      // Cash flow analysis
      if (Array.isArray(reportData) && reportData.length > 0) {
        const recentMonth = reportData[reportData.length - 1];
        const cashFlow = recentMonth.income - recentMonth.expenses;
        const isPositive = cashFlow > 0;
        
        insights.push({
          id: 'cash-flow',
          type: isPositive ? 'success' : 'warning',
          icon: isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down',
          title: isPositive ? 'Positive Cash Flow' : 'Negative Cash Flow',
          description: `${recentMonth.name}: ${isPositive ? 'Surplus' : 'Deficit'} of ₱${Math.abs(cashFlow).toLocaleString()}. ${isPositive ? 'Great job managing your finances!' : 'Review expenses to improve cash flow.'}`,
          actionable: !isPositive,
          actionText: !isPositive ? 'Review Budget' : undefined
        });

        // Income stability
        if (reportData.length >= 3) {
          const incomes = reportData.slice(-3).map((d: any) => d.income);
          const avgIncome = incomes.reduce((sum: number, val: number) => sum + val, 0) / incomes.length;
          const variance = incomes.reduce((sum: number, val: number) => sum + Math.pow(val - avgIncome, 2), 0) / incomes.length;
          const isStable = variance < (avgIncome * 0.1);
          
          insights.push({
            id: 'income-stability',
            type: isStable ? 'success' : 'info',
            icon: 'fas fa-chart-line',
            title: isStable ? 'Stable Income' : 'Variable Income',
            description: `Your income over the last 3 months ${isStable ? 'has been consistent' : 'shows variation'}. ${isStable ? 'This stability helps with financial planning.' : 'Consider building a larger emergency fund.'}`,
            actionable: false
          });
        }
      }
      break;

    case 'savings':
      // Savings rate analysis
      if (Array.isArray(reportData) && reportData.length > 0) {
        const recentMonth = reportData[reportData.length - 1];
        if (recentMonth && recentMonth.rate !== undefined) {
          const rate = recentMonth.rate;
          let type: 'success' | 'warning' | 'info' = 'info';
          let message = '';
          
          if (rate > 20) {
            type = 'success';
            message = `Your ${rate.toFixed(1)}% savings rate exceeds the 20% benchmark. Excellent work! Consider investing surplus savings.`;
          } else if (rate >= 10) {
            type = 'info';
            message = `Your ${rate.toFixed(1)}% savings rate is decent but below the 20% target. Look for opportunities to increase savings.`;
          } else {
            type = 'warning';
            message = `Your ${rate.toFixed(1)}% savings rate is below recommended levels. Review expenses to find savings opportunities.`;
          }
          
          insights.push({
            id: 'savings-rate',
            type,
            icon: 'fas fa-piggy-bank',
            title: `${rate.toFixed(1)}% Savings Rate`,
            description: message,
            actionable: rate < 20,
            actionText: rate < 20 ? 'Improve Savings' : undefined
          });
        }

        // Savings trend
        if (reportData.length >= 3) {
          const recent3 = reportData.slice(-3);
          const savingsAmounts = recent3.map((d: any) => d.savings);
          const isIncreasing = savingsAmounts[2] > savingsAmounts[0];
          
          insights.push({
            id: 'savings-trend',
            type: isIncreasing ? 'success' : 'warning',
            icon: isIncreasing ? 'fas fa-trending-up' : 'fas fa-trending-down',
            title: isIncreasing ? 'Savings Growing' : 'Savings Declining',
            description: `Your savings ${isIncreasing ? 'increased' : 'decreased'} from ₱${savingsAmounts[0].toLocaleString()} to ₱${savingsAmounts[2].toLocaleString()} over 3 months. ${isIncreasing ? 'Keep up the momentum!' : 'Review your budget to reverse this trend.'}`,
            actionable: !isIncreasing
          });
        }
      }
      break;

    case 'trends':
      // Trend analysis
      if (Array.isArray(reportData) && reportData.length > 0) {
        const biggestIncrease = reportData.find((t: any) => t.change > 0);
        const biggestDecrease = reportData.find((t: any) => t.change < 0);
        
        if (biggestIncrease) {
          insights.push({
            id: 'biggest-increase',
            type: 'warning',
            icon: 'fas fa-arrow-up',
            title: `${biggestIncrease.category} Spending Up`,
            description: `${biggestIncrease.category} increased by ${biggestIncrease.change.toFixed(0)}% (₱${biggestIncrease.previousAmount.toLocaleString()} → ₱${biggestIncrease.currentAmount.toLocaleString()}). Review if this change is intentional.`,
            actionable: true,
            actionText: 'Review Category'
          });
        }
        
        if (biggestDecrease) {
          insights.push({
            id: 'biggest-decrease',
            type: 'success',
            icon: 'fas fa-arrow-down',
            title: `${biggestDecrease.category} Spending Down`,
            description: `${biggestDecrease.category} decreased by ${Math.abs(biggestDecrease.change).toFixed(0)}% (₱${biggestDecrease.previousAmount.toLocaleString()} → ₱${biggestDecrease.currentAmount.toLocaleString()}). Great cost control!`,
            actionable: false
          });
        }
      }
      break;

    case 'goals':
      // Goal contributions
      if (contributionTransactions.length > 0) {
        insights.push({
          id: 'goal-contributions',
          type: 'success',
          icon: 'fas fa-bullseye',
          title: 'Active Goal Progress',
          description: `You've made ${contributionTransactions.length} contribution${contributionTransactions.length > 1 ? 's' : ''} totaling ₱${totalContributions.toLocaleString()} towards your goals. Consistent contributions lead to success!`,
          actionable: false
        });
      }
      
      // Goal progress from reportData
      if (Array.isArray(reportData) && reportData.length > 0) {
        const activeGoals = reportData.filter((g: any) => g.status === 'in_progress');
        const completedGoals = reportData.filter((g: any) => g.status === 'completed');
        
        if (completedGoals.length > 0) {
          insights.push({
            id: 'completed-goals',
            type: 'success',
            icon: 'fas fa-trophy',
            title: 'Goals Achieved!',
            description: `You've completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''}! This demonstrates excellent financial discipline and commitment.`,
            actionable: false
          });
        }
        
        if (activeGoals.length > 0) {
          const avgProgress = activeGoals.reduce((sum: number, g: any) => sum + g.percentage, 0) / activeGoals.length;
          insights.push({
            id: 'goal-progress',
            type: avgProgress > 50 ? 'success' : 'info',
            icon: 'fas fa-tasks',
            title: `${activeGoals.length} Active Goal${activeGoals.length > 1 ? 's' : ''}`,
            description: `Average progress: ${avgProgress.toFixed(0)}%. ${avgProgress > 50 ? 'You\'re more than halfway there!' : 'Keep contributing regularly to reach your targets.'}`,
            actionable: avgProgress < 30,
            actionText: avgProgress < 30 ? 'Increase Contributions' : undefined
          });
        }
      }
      break;

    case 'predictions':
      // Future outlook
      if (Array.isArray(reportData) && reportData.length > 0) {
        const avgProjectedIncome = reportData.reduce((sum: any, d: any) => sum + d.income, 0) / reportData.length;
        const avgProjectedExpenses = reportData.reduce((sum: any, d: any) => sum + d.expenses, 0) / reportData.length;
        const projectedSavings = avgProjectedIncome - avgProjectedExpenses;
        const projectedRate = avgProjectedIncome > 0 ? (projectedSavings / avgProjectedIncome) * 100 : 0;
        
        insights.push({
          id: 'future-outlook',
          type: projectedRate > 15 ? 'success' : 'warning',
          icon: 'fas fa-crystal-ball',
          title: 'Financial Forecast',
          description: `Based on current patterns, expect ${projectedRate > 0 ? 'a' : 'no'} savings rate of ${projectedRate.toFixed(1)}% (₱${Math.abs(projectedSavings).toLocaleString()}/month). ${projectedRate > 15 ? 'Your financial future looks bright!' : 'Consider adjusting spending to improve outlook.'}`,
          actionable: projectedRate < 15,
          actionText: projectedRate < 15 ? 'Adjust Budget' : undefined
        });
      }
      break;
  }

  // Universal insights (apply to all report types)
  
  // Uncategorized transactions warning
  if (uncategorizedCount > 0) {
    const categorizableTransactions = expenseTransactions.length + incomeTransactions.length;
    const percentage = categorizableTransactions > 0 
      ? (uncategorizedCount / categorizableTransactions) * 100 
      : 0;
    
    if (percentage > 10) { // Only show if > 10% uncategorized
      insights.push({
        id: 'uncategorized',
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Uncategorized Transactions',
        description: `${uncategorizedCount} transaction${uncategorizedCount > 1 ? 's' : ''} (${percentage.toFixed(0)}%) need categorization. This improves insights accuracy and helps track spending patterns.`,
        actionable: true,
        actionText: 'Categorize Now'
      });
    }
  }

  // General tip based on report type
  const tips: Record<ReportType, Insight> = {
    'spending': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Spending Tip',
      description: 'Review your top 3 spending categories monthly. Small reductions in major categories create significant savings over time.',
      actionable: false
    },
    'income-expense': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Cash Flow Tip',
      description: 'Maintain at least 3 months of expenses as emergency savings. This buffer protects against income disruptions.',
      actionable: false
    },
    'savings': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Savings Tip',
      description: 'Automate your savings by setting up automatic transfers on payday. "Pay yourself first" ensures consistent savings.',
      actionable: false
    },
    'trends': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Trend Tip',
      description: 'Monitor trends monthly to catch concerning patterns early. Small course corrections prevent major financial issues.',
      actionable: false
    },
    'goals': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Goals Tip',
      description: 'Break large goals into smaller milestones. Celebrating progress keeps you motivated on your financial journey.',
      actionable: false
    },
    'predictions': {
      id: 'tip',
      type: 'tip',
      icon: 'fas fa-lightbulb',
      title: 'Planning Tip',
      description: 'Use predictions to plan major purchases. Knowing your future cash flow helps avoid financial stress.',
      actionable: false
    }
  };

  insights.push(tips[reportType]);

  return insights;
};

/**
 * Returns appropriate icon for insight type.
 */
const getIconForType = (type: string): string => {
  switch (type) {
    case 'success': return 'fas fa-check-circle';
    case 'warning': return 'fas fa-exclamation-triangle';
    case 'info': return 'fas fa-info-circle';
    case 'tip': return 'fas fa-lightbulb';
    default: return 'fas fa-info-circle';
  }
};

/**
 * Returns color class for insight type.
 */
const getColorForType = (type: string): string => {
  switch (type) {
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'info': return 'info';
    case 'tip': return 'primary';
    default: return 'secondary';
  }
};

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({
  reportType,
  reportData,
  transactions,
  categories,
  timeframe = 'month',
  onInsightsChange
}) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasLoadedCached = useRef(false);

  // Notify parent component when insights change
  useEffect(() => {
    if (onInsightsChange) {
      onInsightsChange(insights);
    }
  }, [insights, onInsightsChange]);

  // Load cached AI reports on component mount
  useEffect(() => {
    if (user?.id && !hasLoadedCached.current) {
      loadCachedAIReports();
      hasLoadedCached.current = true;
    }
  }, [user?.id, reportType]);

  /**
   * Load most recent AI reports from ai_reports table
   */
  const loadCachedAIReports = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      console.log('Loading most recent AI reports from database...', { reportType, timeframe });
      
      // Get the most recent AI report for this user, report type, and timeframe (not expired)
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_type', reportType)
        .eq('timeframe', timeframe)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0) {
        const report = data[0];
        
        console.log('✓ Found cached AI report in database');
        
        // Convert database insights to component format
        const convertedInsights = convertDatabaseInsightsToComponentFormat(report.insights);
        
        if (convertedInsights.length > 0) {
          setInsights(convertedInsights);
          toast.success('Loaded your most recent AI insights');
          
          // Update access tracking
          await supabase
            .from('ai_reports')
            .update({ 
              access_count: (report.access_count || 0) + 1,
              last_accessed_at: new Date().toISOString()
            })
            .eq('id', report.id);
        }
      } else {
        console.log('No cached AI reports found');
      }
    } catch (error) {
      console.error('Error loading cached AI reports:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert database insights format to component format
   */
  const convertDatabaseInsightsToComponentFormat = (dbInsights: any): Insight[] => {
    try {
      // Handle different database formats
      if (dbInsights.recommendations && Array.isArray(dbInsights.recommendations)) {
        return dbInsights.recommendations.slice(0, 5).map((rec: string, index: number) => ({
          id: `insight-${index}`,
          type: 'tip' as const,
          icon: 'fas fa-lightbulb',
          title: `Recommendation ${index + 1}`,
          description: rec,
          actionable: false
        }));
      }
      
      // If it's already in the right format
      if (Array.isArray(dbInsights)) {
        return dbInsights.slice(0, 5).map((insight: any, index: number) => ({
          id: insight.id || `insight-${index}`,
          type: insight.type || 'info',
          icon: insight.icon || getIconForType(insight.type || 'info'),
          title: insight.title || `Insight ${index + 1}`,
          description: insight.description || '',
          actionable: insight.actionable || false,
          actionText: insight.actionText
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error converting database insights:', error);
      return [];
    }
  };

  /**
   * Generate new AI insights
   */
  const handleGenerateInsights = async () => {
    if (!user?.id) {
      toast.error('Please log in to generate AI insights');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🔄 Generating new AI insights for reports...');
      const generated = await generateInsights(reportType, reportData, transactions, categories);
      setInsights(generated);
      
      // Save to database
      await saveInsightsToDatabase(generated);
      
      toast.success('AI insights generated and saved successfully!');
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      toast.error(error.message || 'Failed to generate AI insights');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Save insights to ai_reports table
   */
  const saveInsightsToDatabase = async (insightsToSave: Insight[]) => {
    if (!user?.id) return;

    try {
      const startTime = Date.now();
      
      // Prepare insights data for database
      const insightsData = insightsToSave.map(insight => ({
        id: insight.id,
        type: insight.type,
        icon: insight.icon,
        title: insight.title,
        description: insight.description,
        actionable: insight.actionable,
        actionText: insight.actionText
      }));

      const recommendationsData = insightsToSave.map(i => ({
        title: i.title,
        description: i.description,
        type: i.type,
        actionable: i.actionable
      }));

      const summary = `Financial insights for ${reportType} report (${timeframe} timeframe)`;

      const { error } = await supabase
        .from('ai_reports')
        .insert({
          user_id: user.id,
          report_type: reportType,
          timeframe: timeframe,
          insights: insightsData,
          recommendations: recommendationsData,
          summary: summary,
          ai_service: 'openrouter',
          ai_model: 'anthropic/claude-3.5-sonnet',
          generation_time_ms: Date.now() - startTime,
          confidence_level: 0.8,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          access_count: 0
        });

      if (error) {
        console.error('Error saving AI report to database:', error);
        throw error;
      } else {
        console.log('✅ AI report saved to database');
      }
    } catch (error) {
      console.error('Error saving AI report to database:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <>
        {/* Mobile Loading State */}
        <div className="block md:hidden mb-4">
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Loading AI insights...</p>
                <p className="text-[10px] text-white/70">Checking for cached insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="card shadow mb-4 hidden md:block" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="spinner-border text-white mr-3" role="status">
                <span className="sr-only">Loading insights...</span>
              </div>
              <div className="text-white">
                <h5 className="mb-0">Loading AI insights...</h5>
                <small>Checking for cached insights</small>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Mobile insight type colors
  const getMobileInsightColors = (type: string) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-600' };
      case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-600' };
      case 'info': return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-600' };
      case 'tip': return { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-600' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <>
      {/* Mobile AI Insights */}
      <div className="block md:hidden mb-4">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <i className="fas fa-brain text-white text-sm"></i>
                </div>
                <div>
                  <h6 className="text-sm font-bold text-white">AI Insights</h6>
                  <p className="text-[10px] text-white/70">Personalized recommendations</p>
                </div>
              </div>
              <button
                onClick={handleGenerateInsights}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold rounded-full transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-robot text-[9px]"></i>
                    {insights.length > 0 ? 'Refresh' : 'Generate'}
                  </>
                )}
              </button>
            </div>

            {/* Generating State */}
            {isGenerating && (
              <div className="bg-white/10 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <p className="text-xs font-medium text-white">Analyzing your data...</p>
                    <p className="text-[10px] text-white/70">This may take a moment</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Insights Content */}
          <div className="bg-white rounded-t-3xl p-3">
            {insights.length === 0 && !isGenerating ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-lightbulb text-gray-400 text-xl"></i>
                </div>
                <p className="text-xs font-semibold text-gray-700 mb-1">No insights yet</p>
                <p className="text-[10px] text-gray-500 mb-3">Tap "Generate" to get AI recommendations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((insight) => {
                  const colors = getMobileInsightColors(insight.type);
                  return (
                    <div
                      key={insight.id}
                      className={`${colors.bg} rounded-xl p-3 border ${colors.border}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <i className={`${insight.icon} ${colors.icon} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h6 className="text-xs font-semibold text-gray-800 truncate">{insight.title}</h6>
                            <span className={`${colors.badge} text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0`}>
                              {insight.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 leading-relaxed">{insight.description}</p>
                          {insight.actionable && insight.actionText && (
                            <button className={`mt-2 px-3 py-1 ${colors.badge} text-[10px] font-semibold rounded-full`}>
                              {insight.actionText}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 text-center">
              <p className="text-[9px] text-gray-400">
                <i className="fas fa-robot mr-1"></i>
                Powered by AI · Updated in real-time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop AI Insights */}
      <div className="hidden md:block">
        <div className="card shadow mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <i className="fas fa-brain fa-2x text-white mr-3"></i>
            <div className="text-white">
              <h5 className="mb-0 font-weight-bold">AI Financial Insights</h5>
              <small>Personalized recommendations based on your data</small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-light btn-sm"
              onClick={handleGenerateInsights}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" />
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-robot mr-2"></i>
                  {insights.length > 0 ? 'Regenerate' : 'Generate'} AI Insights
                </>
              )}
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="alert alert-info mb-3">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm text-info mr-3" role="status">
                <span className="sr-only">Generating...</span>
              </div>
              <div>
                <strong>Analyzing your financial data...</strong>
                <br />
                <small>This may take a few moments</small>
              </div>
            </div>
          </div>
        )}

        {insights.length === 0 && !isGenerating && (
          <div className="alert alert-light mb-0">
            <div className="text-center py-3">
              <i className="fas fa-lightbulb fa-3x text-muted mb-3"></i>
              <h6 className="text-muted">No AI insights available yet</h6>
              <p className="text-muted mb-3">Click "Generate AI Insights" to get personalized financial recommendations</p>
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="row">
            {insights.map((insight) => (
              <div key={insight.id} className="col-12 mb-3">
                <div className="card h-100 border-0">
                  <div className="card-body">
                    <div className="d-flex align-items-start">
                      <div className={`text-${getColorForType(insight.type)} mr-3`} style={{ fontSize: '1.5rem' }}>
                        <i className={insight.icon}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="font-weight-bold mb-2">{insight.title}</h6>
                        <p className="mb-2 text-gray-700">{insight.description}</p>
                        {insight.actionable && insight.actionText && (
                          <button className={`btn btn-sm btn-${getColorForType(insight.type)}`}>
                            {insight.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row">
          {insights.map((insight) => (
            <div key={insight.id} className="col-12 mb-3">
              <div className="card h-100 border-0">
                <div className="card-body">
                  <div className="d-flex align-items-start">
                    <div className={`text-${getColorForType(insight.type)} mr-3`} style={{ fontSize: '1.5rem' }}>
                      <i className={insight.icon}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="font-weight-bold mb-2">{insight.title}</h6>
                      <p className="mb-2 text-gray-700">{insight.description}</p>
                      {insight.actionable && insight.actionText && (
                        <button className={`btn btn-sm btn-${getColorForType(insight.type)}`}>
                          {insight.actionText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-2">
          <small className="text-white opacity-75">
            <i className="fas fa-robot mr-1"></i>
            Powered by AI · Updated in real-time
          </small>
        </div>
      </div>
    </div>
    </div>
    </>
  );
};
