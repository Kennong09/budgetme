import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class BudgetService {
  /**
   * Get all budgets for a user
   */
  static async getUserBudgets(userId: string, period?: 'month' | 'quarter' | 'year') {
    const where: any = {
      userId,
      ...(period && { period })
    };

    return await prisma.budget.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { startDate: 'desc' }
    });
  }

  /**
   * Get active budgets for current period
   */
  static async getActiveBudgets(userId: string) {
    const now = new Date();
    
    return await prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Create a new budget
   */
  static async createBudget(
    userId: string,
    data: {
      categoryId: string;
      amount: number;
      period: 'month' | 'quarter' | 'year';
      startDate: Date;
      endDate: Date;
    }
  ) {
    // Check if budget already exists for this category and period
    const existing = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId: data.categoryId,
        startDate: { lte: data.endDate },
        endDate: { gte: data.startDate }
      }
    });

    if (existing) {
      throw new Error('Budget already exists for this category and period');
    }

    return await prisma.budget.create({
      data: {
        userId: userId,
        categoryId: data.categoryId,
        amount: new Decimal(data.amount),
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Update a budget
   */
  static async updateBudget(
    budgetId: string,
    userId: string,
    data: Partial<{
      amount: number;
      startDate: Date;
      endDate: Date;
    }>
  ) {
    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: { id: budgetId, userId }
    });

    if (!existing) {
      throw new Error('Budget not found or unauthorized');
    }

    return await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(data.amount && { amount: new Decimal(data.amount) }),
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate })
      },
      include: {
        category: true
      }
    });
  }

  /**
   * Delete a budget
   */
  static async deleteBudget(budgetId: string, userId: string) {
    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: { id: budgetId, userId }
    });

    if (!existing) {
      throw new Error('Budget not found or unauthorized');
    }

    return await prisma.budget.delete({
      where: { id: budgetId }
    });
  }

  /**
   * Calculate budget spending
   */
  static async calculateBudgetSpending(budgetId: string, userId: string) {
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: { category: true }
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    // Get all expenses for this category in the budget period
    const expenses = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'expense',
        category: budget.category.categoryName,
        date: {
          gte: budget.startDate,
          lte: budget.endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    const spent = expenses._sum.amount || new Decimal(0);
    const remaining = budget.amount.sub(spent);
    const percentage = budget.amount.toNumber() > 0 
      ? (spent.toNumber() / budget.amount.toNumber()) * 100 
      : 0;

    return {
      budget,
      spent,
      remaining,
      percentage
    };
  }

  /**
   * Get budget overview for dashboard
   */
  static async getBudgetOverview(userId: string) {
    const activeBudgets = await this.getActiveBudgets(userId);
    
    const overview = await Promise.all(
      activeBudgets.map(async (budget: any) => {
        const spending = await this.calculateBudgetSpending(budget.id, userId);
        return {
          ...budget,
          spent: spending.spent,
          remaining: spending.remaining,
          percentage: spending.percentage
        };
      })
    );

    const totalBudgeted = overview.reduce(
      (sum: Decimal, b: any) => sum.add(b.amount),
      new Decimal(0)
    );
    
    const totalSpent = overview.reduce(
      (sum: Decimal, b: any) => sum.add(b.spent),
      new Decimal(0)
    );

    return {
      budgets: overview,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted.sub(totalSpent)
    };
  }
}
