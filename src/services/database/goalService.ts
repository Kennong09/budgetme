import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class GoalService {
  /**
   * Get all goals for a user
   */
  static async getUserGoals(
    userId: string,
    status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  ) {
    return await prisma.goal.findMany({
      where: {
        userId,
        ...(status && { status })
      },
      orderBy: [
        { priority: 'desc' },
        { targetDate: 'asc' }
      ]
    });
  }

  /**
   * Get goal with contributions
   */
  static async getGoalWithContributions(goalId: string, userId: string) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        transactions: {
          where: { type: 'contribution' },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!goal) {
      throw new Error('Goal not found or unauthorized');
    }

    return goal;
  }

  /**
   * Create a new goal
   */
  static async createGoal(
    userId: string,
    data: {
      goalName: string;
      targetAmount: number;
      targetDate: Date;
      priority?: 'low' | 'medium' | 'high';
      notes?: string;
    }
  ) {
    return await prisma.goal.create({
      data: {
        ...data,
        targetAmount: new Decimal(data.targetAmount),
        priority: data.priority || 'medium',
        user: {
          connect: { id: userId }
        }
      }
    });
  }

  /**
   * Update a goal
   */
  static async updateGoal(
    goalId: string,
    userId: string,
    data: Partial<{
      goalName: string;
      targetAmount: number;
      targetDate: Date;
      priority: 'low' | 'medium' | 'high';
      notes: string;
      status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
    }>
  ) {
    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId }
    });

    if (!existing) {
      throw new Error('Goal not found or unauthorized');
    }

    return await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...data,
        ...(data.targetAmount && { 
          targetAmount: new Decimal(data.targetAmount) 
        })
      }
    });
  }

  /**
   * Contribute to a goal
   */
  static async contributeToGoal(
    goalId: string,
    userId: string,
    amount: number,
    accountId?: string,
    notes?: string
  ) {
    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId }
    });

    if (!goal) {
      throw new Error('Goal not found or unauthorized');
    }

    return await prisma.$transaction(async (tx: any) => {
      // Create contribution transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'contribution',
          amount: new Decimal(amount),
          notes: notes || `Contribution to goal: ${goal.goalName}`,
          user: {
            connect: { id: userId }
          },
          goal: {
            connect: { id: goalId }
          },
          ...(accountId && {
            account: {
              connect: { id: accountId }
            }
          })
        }
      });

      // Update goal current amount
      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: {
            increment: new Decimal(amount)
          }
        }
      });

      // Check if goal is completed
      if (updatedGoal.currentAmount.gte(updatedGoal.targetAmount)) {
        await tx.goal.update({
          where: { id: goalId },
          data: {
            status: 'completed'
          }
        });
      }

      // Deduct from account if specified
      if (accountId) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: new Decimal(amount)
            }
          }
        });
      }

      return { transaction, goal: updatedGoal };
    });
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string, userId: string) {
    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId }
    });

    if (!existing) {
      throw new Error('Goal not found or unauthorized');
    }

    return await prisma.goal.delete({
      where: { id: goalId }
    });
  }

  /**
   * Get goal progress statistics
   */
  static async getGoalProgress(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId }
    });

    const stats = {
      total: goals.length,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalTarget: new Decimal(0),
      totalCurrent: new Decimal(0)
    };

    goals.forEach((goal: any) => {
      const statusKey = goal.status === 'not_started' ? 'notStarted' : goal.status;
      (stats as any)[statusKey]++;
      stats.totalTarget = stats.totalTarget.add(goal.targetAmount);
      stats.totalCurrent = stats.totalCurrent.add(goal.currentAmount);
    });

    const overallProgress = stats.totalTarget.toNumber() > 0
      ? (stats.totalCurrent.toNumber() / stats.totalTarget.toNumber()) * 100
      : 0;

    return {
      ...stats,
      overallProgress
    };
  }

  /**
   * Get upcoming goals (due within 30 days)
   */
  static async getUpcomingGoals(userId: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return await prisma.goal.findMany({
      where: {
        userId,
        status: 'in_progress',
        targetDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      },
      orderBy: { targetDate: 'asc' }
    });
  }
}
