import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo user (if using local auth)
  const demoUserId = 'demo-user-id-123';
  
  // Create default income categories
  const defaultIncomeCategories = [
    { categoryName: 'Salary', icon: '💼' },
    { categoryName: 'Freelance', icon: '💻' },
    { categoryName: 'Investment', icon: '📈' },
    { categoryName: 'Business', icon: '🏢' },
    { categoryName: 'Rental', icon: '🏠' },
    { categoryName: 'Other Income', icon: '💰' },
  ];

  // Create default expense categories
  const defaultExpenseCategories = [
    { categoryName: 'Housing', icon: '🏠' },
    { categoryName: 'Transportation', icon: '🚗' },
    { categoryName: 'Food & Dining', icon: '🍔' },
    { categoryName: 'Utilities', icon: '💡' },
    { categoryName: 'Healthcare', icon: '🏥' },
    { categoryName: 'Insurance', icon: '🛡️' },
    { categoryName: 'Personal', icon: '👤' },
    { categoryName: 'Entertainment', icon: '🎬' },
    { categoryName: 'Education', icon: '📚' },
    { categoryName: 'Savings', icon: '🏦' },
    { categoryName: 'Debt Payment', icon: '💳' },
    { categoryName: 'Other Expenses', icon: '📦' },
  ];

  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
