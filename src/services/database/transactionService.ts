import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class TransactionService {
  /**
   * Get all transactions for a user
   */
  static async getUserTransactions(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: 'income' | 'expense' | 'transfer' | 'contribution';
      accountId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = {
      userId,
      ...(options?.startDate && { date: { gte: options.startDate } }),
      ...(options?.endDate && { date: { lte: options.endDate } }),
      ...(options?.type && { type: options.type }),
      ...(options?.accountId && { accountId: options.accountId })
    };

    return await prisma.transaction.findMany({
      where,
      include: {
        account: true,
        goal: true
      },
      orderBy: { date: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0
    });
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(
    userId: string,
    data: any
  ) {
    // Start a transaction to update account balance
    return await prisma.$transaction(async (tx: any) => {
      // Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          ...data,
          user: {
            connect: { id: userId }
          }
        }
      });

      // Update account balance if linked to an account
      if (transaction.accountId) {
        const amount = transaction.amount;
        const adjustment = transaction.type === 'income' 
          ? amount 
          : transaction.type === 'expense' 
            ? amount.mul(-1) 
            : new Decimal(0);

        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              increment: adjustment
            }
          }
        });
      }

      // Update goal if it's a contribution
      if (transaction.goalId && transaction.type === 'contribution') {
        await tx.goal.update({
          where: { id: transaction.goalId },
          data: {
            currentAmount: {
              increment: transaction.amount
            }
          }
        });
      }

      return transaction;
    });
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(
    transactionId: string,
    userId: string,
    data: any
  ) {
    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, userId }
    });

    if (!existing) {
      throw new Error('Transaction not found or unauthorized');
    }

    return await prisma.transaction.update({
      where: { id: transactionId },
      data
    });
  }

  /**
   * Delete a transaction
   */
  static async deleteTransaction(transactionId: string, userId: string) {
    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, userId }
    });

    if (!existing) {
      throw new Error('Transaction not found or unauthorized');
    }

    return await prisma.$transaction(async (tx: any) => {
      // Reverse account balance if needed
      if (existing.accountId) {
        const reverseAdjustment = existing.type === 'income'
          ? existing.amount.mul(-1)
          : existing.type === 'expense'
            ? existing.amount
            : new Decimal(0);

        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              decrement: reverseAdjustment
            }
          }
        });
      }

      // Reverse goal contribution if needed
      if (existing.goalId && existing.type === 'contribution') {
        await tx.goal.update({
          where: { id: existing.goalId },
          data: {
            currentAmount: {
              decrement: existing.amount
            }
          }
        });
      }

      // Delete the transaction
      return await tx.transaction.delete({
        where: { id: transactionId }
      });
    });
  }

  /**
   * Get transaction summary
   */
  static async getTransactionSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const transactions = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    return transactions.reduce((acc: any, curr: any) => {
      acc[curr.type] = {
        total: curr._sum.amount || new Decimal(0),
        count: curr._count
      };
      return acc;
    }, {} as Record<string, { total: Decimal; count: number }>);
  }
}
