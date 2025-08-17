import prisma from '@/lib/prisma';

export class UserService {
  /**
   * Get user profile by user ID
   */
  static async getProfile(userId: string) {
    return await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        users: {
          select: {
            email: true,
            createdAt: true
          }
        }
      }
    });
  }

  /**
   * Create or update user profile
   */
  static async upsertProfile(
    userId: string,
    data: any
  ) {
    return await prisma.profile.upsert({
      where: { id: userId },
      update: data,
      create: {
        id: userId,
        ...data
      }
    });
  }

  /**
   * Get user's families
   */
  static async getUserFamilies(userId: string) {
    return await prisma.family.findMany({
      where: {
        members: {
          some: {
            userId,
            status: 'active'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string) {
    const [accounts, goals, transactions, budgets] = await Promise.all([
      prisma.account.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.budget.count({ where: { userId } })
    ]);

    return {
      totalAccounts: accounts,
      totalGoals: goals,
      totalTransactions: transactions,
      totalBudgets: budgets
    };
  }
}
