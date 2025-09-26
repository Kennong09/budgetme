// Mock data for BudgetMe application

// Users
export const users = [
  {
    id: 1,
    username: "mockdata",
    email: "mockdata@gmail.com",
    password_hash: "hashedpassword",
    created_at: "2024-01-15",
    last_login: "2025-06-01",
    user_role: "admin",
    is_active: true,
  },
  {
    id: 2,
    username: "mockdata2",
    email: "mockdata2@gmail.com",
    password_hash: "hashedpassword",
    created_at: "2024-02-10",
    last_login: "2025-05-28",
    user_role: "viewer",
    is_active: true,
  },
  {
    id: 3,
    username: "mockdata3",
    email: "mockdata3@gmail.com",
    password_hash: "hashedpassword",
    created_at: "2024-03-05",
    last_login: "2025-05-30",
    user_role: "viewer",
    is_active: true,
  },
];

export const familyInvitations = [
  {
    id: 1,
    family_id: 1,
    invited_user_email: "mockdata3@gmail.com",
    inviter_user_id: 1,
    role: "viewer",
    status: "pending", // pending, accepted, rejected
    created_at: "2025-06-02",
  },
];

// Accounts
export const accounts = [
  {
    id: 1,
    user_id: 1,
    account_name: "Primary Checking",
    account_type: "checking",
    balance: 5234.65,
    created_at: "2024-01-15",
    status: "active",
  },
  {
    id: 2,
    user_id: 1,
    account_name: "Savings Account",
    account_type: "savings",
    balance: 12750.42,
    created_at: "2024-01-15",
    status: "active",
  },
  {
    id: 3,
    user_id: 1,
    account_name: "Credit Card",
    account_type: "credit",
    balance: -1250.3,
    created_at: "2024-01-15",
    status: "active",
  },
  {
    id: 4,
    user_id: 2,
    account_name: "Jane Checking",
    account_type: "checking",
    balance: 3245.18,
    created_at: "2024-02-10",
    status: "active",
  },
];

// Income Categories
export const incomeCategories = [
  {
    id: 1,
    user_id: 1,
    category_name: "Salary",
    icon: "cash",
    is_default: true,
  },
  {
    id: 2,
    user_id: 1,
    category_name: "Freelance",
    icon: "briefcase",
    is_default: true,
  },
  {
    id: 3,
    user_id: 1,
    category_name: "Investments",
    icon: "trending-up",
    is_default: true,
  },
  { id: 4, user_id: 1, category_name: "Gifts", icon: "gift", is_default: true },
  {
    id: 5,
    user_id: 1,
    category_name: "Other Income",
    icon: "plus-circle",
    is_default: true,
  },
];

// Expense Categories
export const expenseCategories = [
  {
    id: 1,
    user_id: 1,
    category_name: "Housing",
    icon: "home",
    is_default: true,
  },
  {
    id: 2,
    user_id: 1,
    category_name: "Utilities",
    icon: "zap",
    is_default: true,
  },
  {
    id: 3,
    user_id: 1,
    category_name: "Groceries",
    icon: "shopping-cart",
    is_default: true,
  },
  {
    id: 4,
    user_id: 1,
    category_name: "Transportation",
    icon: "truck",
    is_default: true,
  },
  {
    id: 5,
    user_id: 1,
    category_name: "Dining Out",
    icon: "coffee",
    is_default: true,
  },
  {
    id: 6,
    user_id: 1,
    category_name: "Entertainment",
    icon: "film",
    is_default: true,
  },
  {
    id: 7,
    user_id: 1,
    category_name: "Healthcare",
    icon: "activity",
    is_default: true,
  },
  {
    id: 8,
    user_id: 1,
    category_name: "Education",
    icon: "book",
    is_default: true,
  },
  {
    id: 9,
    user_id: 1,
    category_name: "Shopping",
    icon: "shopping-bag",
    is_default: true,
  },
  {
    id: 10,
    user_id: 1,
    category_name: "Personal Care",
    icon: "user",
    is_default: true,
  },
  {
    id: 11,
    user_id: 1,
    category_name: "Travel",
    icon: "map",
    is_default: true,
  },
  {
    id: 12,
    user_id: 1,
    category_name: "Subscriptions",
    icon: "repeat",
    is_default: true,
  },
  {
    id: 13,
    user_id: 1,
    category_name: "Contribution",
    icon: "piggy-bank",
    is_default: true,
  },
  {
    id: 14,
    user_id: 1,
    category_name: "Other Expenses",
    icon: "more-horizontal",
    is_default: true,
  },
];

// Transactions
export const transactions = [
  {
    id: 1,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4500.0,
    date: "2023-04-01",
    notes: "Monthly salary",
    created_at: "2023-04-01",
  },
  {
    id: 2,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1200.0,
    date: "2023-04-02",
    notes: "Rent payment",
    created_at: "2023-04-02",
  },
  {
    id: 3,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 185.75,
    date: "2023-04-05",
    notes: "Weekly groceries",
    created_at: "2023-04-05",
  },
  {
    id: 4,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 95.62,
    date: "2023-04-05",
    notes: "Electricity bill",
    created_at: "2023-04-05",
  },
  {
    id: 5,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 65.32,
    date: "2023-04-07",
    notes: "Dinner with friends",
    created_at: "2023-04-07",
  },
  {
    id: 6,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Freelance
    goal_id: null,
    type: "income",
    amount: 850.0,
    date: "2023-04-12",
    notes: "Website design project",
    created_at: "2023-04-12",
  },
  {
    id: 7,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 1, // Japan Trip
    type: "expense",
    amount: 500.0,
    date: "2023-04-15",
    notes: "Transfer to savings for Japan trip",
    created_at: "2023-04-15",
  },
  {
    id: 8,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 45.0,
    date: "2023-04-09",
    notes: "Fuel",
    created_at: "2023-04-09",
  },
  {
    id: 9,
    user_id: 1,
    account_id: 1,
    category_id: 7, // Healthcare
    goal_id: null,
    type: "expense",
    amount: 120.0,
    date: "2023-04-20",
    notes: "Doctor appointment",
    created_at: "2023-04-20",
  },
  {
    id: 10,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 29.99,
    date: "2023-04-22",
    notes: "Streaming services",
    created_at: "2023-04-22",
  },
  {
    id: 11,
    user_id: 1,
    account_id: 3,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 215.48,
    date: "2023-04-24",
    notes: "New clothes",
    created_at: "2023-04-24",
  },
  {
    id: 12,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 134.27,
    date: "2023-04-26",
    notes: "Weekly groceries",
    created_at: "2023-04-26",
  },
  {
    id: 13,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 2, // Emergency Fund
    type: "expense",
    amount: 200.0,
    date: "2023-04-28",
    notes: "Transfer to emergency fund",
    created_at: "2023-04-28",
  },
  {
    id: 14,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 89.5,
    date: "2023-04-29",
    notes: "Concert tickets",
    created_at: "2023-04-29",
  },
  {
    id: 15,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4500.0,
    date: "2023-05-01",
    notes: "Monthly salary",
    created_at: "2023-05-01",
  },
  {
    id: 16,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1200.0,
    date: "2023-05-02",
    notes: "Rent payment",
    created_at: "2023-05-02",
  },
  {
    id: 17,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 192.45,
    date: "2023-05-04",
    notes: "Weekly groceries",
    created_at: "2023-05-04",
  },
  {
    id: 18,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 78.50,
    date: "2023-05-06",
    notes: "Birthday dinner",
    created_at: "2023-05-06",
  },
  {
    id: 19,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 145.32,
    date: "2023-05-08",
    notes: "Combined utilities",
    created_at: "2023-05-08",
  },
  {
    id: 20,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Freelance
    goal_id: null,
    type: "income",
    amount: 950.0,
    date: "2023-05-10",
    notes: "UI/UX design project",
    created_at: "2023-05-10",
  },
  {
    id: 21,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 45.99,
    date: "2023-05-12",
    notes: "Movie night",
    created_at: "2023-05-12",
  },
  {
    id: 22,
    user_id: 1,
    account_id: 3,
    category_id: 11, // Travel
    goal_id: null,
    type: "expense",
    amount: 345.67,
    date: "2023-05-15",
    notes: "Flight tickets",
    created_at: "2023-05-15",
  },
  {
    id: 23,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 1, // Japan Trip
    type: "expense",
    amount: 500.0,
    date: "2023-05-15",
    notes: "Transfer to savings for Japan trip",
    created_at: "2023-05-15",
  },
  {
    id: 24,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 167.82,
    date: "2023-05-18",
    notes: "Weekly groceries",
    created_at: "2023-05-18",
  },
  {
    id: 25,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 75.00,
    date: "2023-05-20",
    notes: "Fuel",
    created_at: "2023-05-20",
  },
  {
    id: 26,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Investments
    goal_id: null,
    type: "income",
    amount: 120.50,
    date: "2023-05-22",
    notes: "Stock dividends",
    created_at: "2023-05-22",
  },
  {
    id: 27,
    user_id: 1,
    account_id: 1,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 189.99,
    date: "2023-05-24",
    notes: "New shoes",
    created_at: "2023-05-24",
  },
  {
    id: 28,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 14.99,
    date: "2023-05-25",
    notes: "Music subscription",
    created_at: "2023-05-25",
  },
  {
    id: 29,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 2, // Emergency Fund
    type: "expense",
    amount: 300.0,
    date: "2023-05-28",
    notes: "Transfer to emergency fund",
    created_at: "2023-05-28",
  },
  {
    id: 30,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4600.0,
    date: "2023-06-01",
    notes: "Monthly salary with small raise",
    created_at: "2023-06-01",
  },
  {
    id: 31,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1200.0,
    date: "2023-06-02",
    notes: "Rent payment",
    created_at: "2023-06-02",
  },
  {
    id: 32,
    user_id: 1,
    account_id: 1,
    category_id: 8, // Education
    goal_id: null,
    type: "expense",
    amount: 299.99,
    date: "2023-06-03",
    notes: "Online course subscription",
    created_at: "2023-06-03",
  },
  {
    id: 33,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 210.34,
    date: "2023-06-05",
    notes: "Weekly groceries",
    created_at: "2023-06-05",
  },
  {
    id: 34,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 120.0,
    date: "2023-06-06",
    notes: "Car maintenance",
    created_at: "2023-06-06",
  },
  {
    id: 35,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 85.45,
    date: "2023-06-08",
    notes: "Dinner with colleagues",
    created_at: "2023-06-08",
  },
  {
    id: 36,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 110.55,
    date: "2023-06-10",
    notes: "Water and electricity",
    created_at: "2023-06-10",
  },
  {
    id: 37,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 3, // New Laptop
    type: "expense",
    amount: 250.0,
    date: "2023-06-12",
    notes: "Saving for new laptop",
    created_at: "2023-06-12",
  },
  {
    id: 38,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Freelance
    goal_id: null,
    type: "income",
    amount: 1200.0,
    date: "2023-06-15",
    notes: "Website development project",
    created_at: "2023-06-15",
  },
  {
    id: 39,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 178.92,
    date: "2023-06-18",
    notes: "Weekly groceries",
    created_at: "2023-06-18",
  },
  {
    id: 40,
    user_id: 1,
    account_id: 3,
    category_id: 10, // Personal Care
    goal_id: null,
    type: "expense",
    amount: 89.50,
    date: "2023-06-20",
    notes: "Haircut and products",
    created_at: "2023-06-20",
  },
  {
    id: 41,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 65.00,
    date: "2023-06-22",
    notes: "Concert tickets",
    created_at: "2023-06-22",
  },
  {
    id: 42,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Gifts
    goal_id: null,
    type: "income",
    amount: 100.0,
    date: "2023-06-23",
    notes: "Birthday gift from parents",
    created_at: "2023-06-23",
  },
  {
    id: 43,
    user_id: 1,
    account_id: 1,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 145.67,
    date: "2023-06-25",
    notes: "Clothing purchase",
    created_at: "2023-06-25",
  },
  {
    id: 44,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 1, // Japan Trip
    type: "expense",
    amount: 500.0,
    date: "2023-06-28",
    notes: "Transfer to savings for Japan trip",
    created_at: "2023-06-28",
  },
  {
    id: 45,
    user_id: 1,
    account_id: 1,
    category_id: 7, // Healthcare
    goal_id: null,
    type: "expense",
    amount: 55.00,
    date: "2023-06-30",
    notes: "Pharmacy prescription",
    created_at: "2023-06-30",
  },
  // Add July 2023 transactions
  {
    id: 46,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4600.0,
    date: "2023-07-01",
    notes: "Monthly salary",
    created_at: "2023-07-01",
  },
  {
    id: 47,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1200.0,
    date: "2023-07-02",
    notes: "Rent payment",
    created_at: "2023-07-02",
  },
  {
    id: 48,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 224.87,
    date: "2023-07-03",
    notes: "Weekly groceries and BBQ supplies",
    created_at: "2023-07-03",
  },
  {
    id: 49,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 120.50,
    date: "2023-07-04",
    notes: "Holiday celebration",
    created_at: "2023-07-04",
  },
  {
    id: 50,
    user_id: 1,
    account_id: 3,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 175.25,
    date: "2023-07-05",
    notes: "Summer clothes shopping",
    created_at: "2023-07-05",
  },
  {
    id: 51,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 68.35,
    date: "2023-07-07",
    notes: "Dinner with friends",
    created_at: "2023-07-07",
  },
  {
    id: 52,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Investments
    goal_id: null,
    type: "income",
    amount: 135.80,
    date: "2023-07-08",
    notes: "Stock dividends",
    created_at: "2023-07-08",
  },
  {
    id: 53,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 135.45,
    date: "2023-07-10",
    notes: "Electricity and internet",
    created_at: "2023-07-10",
  },
  {
    id: 54,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 183.65,
    date: "2023-07-12",
    notes: "Weekly groceries",
    created_at: "2023-07-12",
  },
  {
    id: 55,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 80.00,
    date: "2023-07-14",
    notes: "Fuel",
    created_at: "2023-07-14",
  },
  {
    id: 56,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Freelance
    goal_id: null,
    type: "income",
    amount: 1350.0,
    date: "2023-07-15",
    notes: "Mobile app design project",
    created_at: "2023-07-15",
  },
  {
    id: 57,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 1, // Japan Trip
    type: "expense",
    amount: 600.0,
    date: "2023-07-15",
    notes: "Transfer to savings for Japan trip",
    created_at: "2023-07-15",
  },
  {
    id: 58,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 49.99,
    date: "2023-07-16",
    notes: "Software subscription renewal",
    created_at: "2023-07-16",
  },
  {
    id: 59,
    user_id: 1,
    account_id: 3,
    category_id: 7, // Healthcare
    goal_id: null,
    type: "expense",
    amount: 150.00,
    date: "2023-07-18",
    notes: "Dentist appointment",
    created_at: "2023-07-18",
  },
  {
    id: 60,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 195.32,
    date: "2023-07-19",
    notes: "Weekly groceries",
    created_at: "2023-07-19",
  },
  {
    id: 61,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 3, // New Laptop
    type: "expense",
    amount: 300.0,
    date: "2023-07-20",
    notes: "Saving for new laptop",
    created_at: "2023-07-20",
  },
  {
    id: 62,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 85.75,
    date: "2023-07-22",
    notes: "Music festival tickets",
    created_at: "2023-07-22",
  },
  {
    id: 63,
    user_id: 1,
    account_id: 1,
    category_id: 10, // Personal Care
    goal_id: null,
    type: "expense",
    amount: 45.99,
    date: "2023-07-24",
    notes: "Personal care products",
    created_at: "2023-07-24",
  },
  {
    id: 64,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 95.42,
    date: "2023-07-25",
    notes: "Anniversary dinner",
    created_at: "2023-07-25",
  },
  {
    id: 65,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 178.45,
    date: "2023-07-26",
    notes: "Weekly groceries",
    created_at: "2023-07-26",
  },
  {
    id: 66,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 2, // Emergency Fund
    type: "expense",
    amount: 300.0,
    date: "2023-07-28",
    notes: "Transfer to emergency fund",
    created_at: "2023-07-28",
  },
  {
    id: 67,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Gifts
    goal_id: null,
    type: "income",
    amount: 50.0,
    date: "2023-07-30",
    notes: "Gift card from friend",
    created_at: "2023-07-30",
  },
  {
    id: 68,
    user_id: 1,
    account_id: 1,
    category_id: 11, // Travel
    goal_id: null,
    type: "expense",
    amount: 250.35,
    date: "2023-07-31",
    notes: "Weekend getaway booking",
    created_at: "2023-07-31",
  },
  // Add May 2023 utility transactions
  {
    id: 101,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 110.45,
    date: "2023-05-05",
    notes: "Electricity bill - May",
    created_at: "2023-05-05",
  },
  {
    id: 102,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 65.25,
    date: "2023-05-10",
    notes: "Water bill - May",
    created_at: "2023-05-10",
  },
  {
    id: 103,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 55.75,
    date: "2023-05-15",
    notes: "Internet bill - May",
    created_at: "2023-05-15",
  },
  // February 2025 transactions
  {
    id: 101,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4100.0,
    date: "2025-02-01",
    notes: "Monthly salary - February",
    created_at: "2025-02-01",
  },
  {
    id: 102,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1250.0,
    date: "2025-02-02",
    notes: "Rent payment - February",
    created_at: "2025-02-02",
  },
  {
    id: 103,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 480.0,
    date: "2025-02-05",
    notes: "Groceries - Week 1",
    created_at: "2025-02-05",
  },
  {
    id: 104,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 205.0,
    date: "2025-02-08",
    notes: "Utilities - February",
    created_at: "2025-02-08",
  },
  {
    id: 105,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 195.0,
    date: "2025-02-12",
    notes: "Groceries - Week 2",
    created_at: "2025-02-12",
  },
  {
    id: 106,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 120.0,
    date: "2025-02-14",
    notes: "Valentine's Day dinner",
    created_at: "2025-02-14",
  },
  {
    id: 107,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 210.0,
    date: "2025-02-19",
    notes: "Groceries - Week 3",
    created_at: "2025-02-19",
  },
  {
    id: 108,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 150.0,
    date: "2025-02-22",
    notes: "Fuel and transport - February",
    created_at: "2025-02-22",
  },
  {
    id: 109,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 85.0,
    date: "2025-02-25",
    notes: "Movie night",
    created_at: "2025-02-25",
  },
  {
    id: 110,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 175.0,
    date: "2025-02-26",
    notes: "Groceries - Week 4",
    created_at: "2025-02-26",
  },
  {
    id: 111,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 75.0,
    date: "2025-02-28",
    notes: "Monthly subscriptions",
    created_at: "2025-02-28",
  },
  
  // March 2025 transactions
  {
    id: 201,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4200.0,
    date: "2025-03-01",
    notes: "Monthly salary - March",
    created_at: "2025-03-01",
  },
  {
    id: 202,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1250.0,
    date: "2025-03-02",
    notes: "Rent payment - March",
    created_at: "2025-03-02",
  },
  {
    id: 203,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 520.0,
    date: "2025-03-05",
    notes: "Groceries - Week 1",
    created_at: "2025-03-05",
  },
  {
    id: 204,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 215.0,
    date: "2025-03-08",
    notes: "Utilities - March",
    created_at: "2025-03-08",
  },
  {
    id: 205,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 205.0,
    date: "2025-03-12",
    notes: "Groceries - Week 2",
    created_at: "2025-03-12",
  },
  {
    id: 206,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 180.0,
    date: "2025-03-15",
    notes: "Concert tickets",
    created_at: "2025-03-15",
  },
  {
    id: 207,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 225.0,
    date: "2025-03-19",
    notes: "Groceries - Week 3",
    created_at: "2025-03-19",
  },
  {
    id: 208,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 160.0,
    date: "2025-03-22",
    notes: "Fuel and transport - March",
    created_at: "2025-03-22",
  },
  {
    id: 209,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 110.0,
    date: "2025-03-25",
    notes: "Dinner with friends",
    created_at: "2025-03-25",
  },
  {
    id: 210,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 185.0,
    date: "2025-03-26",
    notes: "Groceries - Week 4",
    created_at: "2025-03-26",
  },
  {
    id: 211,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 75.0,
    date: "2025-03-28",
    notes: "Monthly subscriptions",
    created_at: "2025-03-28",
  },
  
  // April 2025 transactions
  {
    id: 301,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4300.0,
    date: "2025-04-01",
    notes: "Monthly salary - April",
    created_at: "2025-04-01",
  },
  {
    id: 302,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1250.0,
    date: "2025-04-02",
    notes: "Rent payment - April",
    created_at: "2025-04-02",
  },
  {
    id: 303,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 490.0,
    date: "2025-04-04",
    notes: "Groceries - Week 1",
    created_at: "2025-04-04",
  },
  {
    id: 304,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 195.0,
    date: "2025-04-08",
    notes: "Utilities - April",
    created_at: "2025-04-08",
  },
  {
    id: 305,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 180.0,
    date: "2025-04-11",
    notes: "Groceries - Week 2",
    created_at: "2025-04-11",
  },
  {
    id: 306,
    user_id: 1,
    account_id: 1,
    category_id: 7, // Healthcare
    goal_id: null,
    type: "expense",
    amount: 95.0,
    date: "2025-04-15",
    notes: "Doctor visit",
    created_at: "2025-04-15",
  },
  {
    id: 307,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 210.0,
    date: "2025-04-18",
    notes: "Groceries - Week 3",
    created_at: "2025-04-18",
  },
  {
    id: 308,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 140.0,
    date: "2025-04-20",
    notes: "Fuel and transport - April",
    created_at: "2025-04-20",
  },
  {
    id: 309,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 70.0,
    date: "2025-04-22",
    notes: "Movie tickets",
    created_at: "2025-04-22",
  },
  {
    id: 310,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 195.0,
    date: "2025-04-25",
    notes: "Groceries - Week 4",
    created_at: "2025-04-25",
  },
  {
    id: 311,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 75.0,
    date: "2025-04-28",
    notes: "Monthly subscriptions",
    created_at: "2025-04-28",
  },
  
  // May 2025 transactions
  {
    id: 401,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4450.0,
    date: "2025-05-01",
    notes: "Monthly salary - May",
    created_at: "2025-05-01",
  },
  {
    id: 402,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1250.0,
    date: "2025-05-02",
    notes: "Rent payment - May",
    created_at: "2025-05-02",
  },
  {
    id: 403,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 505.0,
    date: "2025-05-05",
    notes: "Groceries - Week 1",
    created_at: "2025-05-05",
  },
  {
    id: 404,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 220.0,
    date: "2025-05-08",
    notes: "Utilities - May",
    created_at: "2025-05-08",
  },
  {
    id: 405,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 210.0,
    date: "2025-05-12",
    notes: "Groceries - Week 2",
    created_at: "2025-05-12",
  },
  {
    id: 406,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 145.0,
    date: "2025-05-15",
    notes: "Birthday dinner",
    created_at: "2025-05-15",
  },
  {
    id: 407,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 230.0,
    date: "2025-05-19",
    notes: "Groceries - Week 3",
    created_at: "2025-05-19",
  },
  {
    id: 408,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 170.0,
    date: "2025-05-22",
    notes: "Fuel and transport - May",
    created_at: "2025-05-22",
  },
  {
    id: 409,
    user_id: 1,
    account_id: 1,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 225.0,
    date: "2025-05-24",
    notes: "New clothes",
    created_at: "2025-05-24",
  },
  {
    id: 410,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 215.0,
    date: "2025-05-26",
    notes: "Groceries - Week 4",
    created_at: "2025-05-26",
  },
  {
    id: 411,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 80.0,
    date: "2025-05-28",
    notes: "Monthly subscriptions",
    created_at: "2025-05-28",
  },
  
  // June 2025 transactions - already in the file at different IDs, keep them

  // ... rest of the existing transactions ...
  
  // June 2025 transactions
  {
    id: 501,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Salary
    goal_id: null,
    type: "income",
    amount: 4500.0,
    date: "2025-06-01",
    notes: "Monthly salary - June",
    created_at: "2025-06-01",
  },
  {
    id: 502,
    user_id: 1,
    account_id: 1,
    category_id: 1, // Housing
    goal_id: null,
    type: "expense",
    amount: 1250.0,
    date: "2025-06-02",
    notes: "Rent payment - June",
    created_at: "2025-06-02",
  },
  {
    id: 503,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 195.75,
    date: "2025-06-05",
    notes: "Weekly groceries",
    created_at: "2025-06-05",
  },
  {
    id: 504,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 115.62,
    date: "2025-06-05",
    notes: "Electricity bill",
    created_at: "2025-06-05",
  },
  {
    id: 505,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 85.32,
    date: "2025-06-07",
    notes: "Dinner with friends",
    created_at: "2025-06-07",
  },
  {
    id: 506,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 55.0,
    date: "2025-06-09",
    notes: "Fuel",
    created_at: "2025-06-09",
  },
  {
    id: 507,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 75.0,
    date: "2025-06-10",
    notes: "Movie tickets and dinner",
    created_at: "2025-06-10",
  },
  {
    id: 508,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 210.25,
    date: "2025-06-12",
    notes: "Weekly groceries",
    created_at: "2025-06-12",
  },
  {
    id: 509,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 85.00,
    date: "2025-06-14",
    notes: "Water bill",
    created_at: "2025-06-14",
  },
  {
    id: 510,
    user_id: 1,
    account_id: 1,
    category_id: 7, // Healthcare
    goal_id: null,
    type: "expense",
    amount: 45.00,
    date: "2025-06-15",
    notes: "Pharmacy",
    created_at: "2025-06-15",
  },
  {
    id: 511,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Freelance
    goal_id: null,
    type: "income",
    amount: 850.0,
    date: "2025-06-15",
    notes: "Website project",
    created_at: "2025-06-15",
  },
  {
    id: 512,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 185.60,
    date: "2025-06-19",
    notes: "Weekly groceries",
    created_at: "2025-06-19",
  },
  {
    id: 513,
    user_id: 1,
    account_id: 1,
    category_id: 5, // Dining Out
    goal_id: null,
    type: "expense",
    amount: 65.45,
    date: "2025-06-20",
    notes: "Lunch with colleagues",
    created_at: "2025-06-20",
  },
  {
    id: 514,
    user_id: 1,
    account_id: 1,
    category_id: 9, // Shopping
    goal_id: null,
    type: "expense",
    amount: 135.75,
    date: "2025-06-21",
    notes: "Clothing",
    created_at: "2025-06-21",
  },
  {
    id: 515,
    user_id: 1,
    account_id: 1,
    category_id: 2, // Utilities
    goal_id: null,
    type: "expense",
    amount: 95.00,
    date: "2025-06-22",
    notes: "Internet bill",
    created_at: "2025-06-22",
  },
  {
    id: 516,
    user_id: 1,
    account_id: 1,
    category_id: 3, // Groceries
    goal_id: null,
    type: "expense",
    amount: 205.40,
    date: "2025-06-26",
    notes: "Weekly groceries",
    created_at: "2025-06-26",
  },
  {
    id: 517,
    user_id: 1,
    account_id: 1,
    category_id: 4, // Transportation
    goal_id: null,
    type: "expense",
    amount: 60.00,
    date: "2025-06-28",
    notes: "Fuel",
    created_at: "2025-06-28",
  },
  {
    id: 518,
    user_id: 1,
    account_id: 1,
    category_id: 6, // Entertainment
    goal_id: null,
    type: "expense",
    amount: 120.00,
    date: "2025-06-29",
    notes: "Concert tickets",
    created_at: "2025-06-29",
  },
  {
    id: 519,
    user_id: 1,
    account_id: 1,
    category_id: 12, // Subscriptions
    goal_id: null,
    type: "expense",
    amount: 50.00,
    date: "2025-06-30",
    notes: "Streaming services",
    created_at: "2025-06-30",
  },
  
  // Home Down Payment transactions
  {
    id: 601,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 4, // Home Down Payment
    type: "expense",
    amount: 750.0,
    date: "2023-05-01",
    notes: "Initial contribution to Home Down Payment",
    created_at: "2023-05-01",
  },
  {
    id: 602,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 4, // Home Down Payment
    type: "expense",
    amount: 1000.0,
    date: "2023-06-15",
    notes: "Monthly contribution to Home Down Payment",
    created_at: "2023-06-15",
  },
  {
    id: 603,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 4, // Home Down Payment
    type: "expense",
    amount: 1000.0,
    date: "2023-07-15",
    notes: "Monthly contribution to Home Down Payment",
    created_at: "2023-07-15",
  },
  {
    id: 604,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 4, // Home Down Payment
    type: "expense",
    amount: 1000.0,
    date: "2025-06-01",
    notes: "Recent contribution to Home Down Payment",
    created_at: "2025-06-01",
  },

  // New Car transactions
  {
    id: 605,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 5, // New Car
    type: "expense",
    amount: 500.0,
    date: "2023-04-01",
    notes: "Initial contribution to New Car fund",
    created_at: "2023-04-01",
  },
  {
    id: 606,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 5, // New Car
    type: "expense",
    amount: 350.0,
    date: "2023-05-15",
    notes: "Monthly contribution to New Car fund",
    created_at: "2023-05-15",
  },
  {
    id: 607,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 5, // New Car
    type: "expense",
    amount: 350.0,
    date: "2023-06-15",
    notes: "Monthly contribution to New Car fund",
    created_at: "2023-06-15",
  },
  {
    id: 608,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 5, // New Car
    type: "expense",
    amount: 500.0,
    date: "2025-05-20",
    notes: "Recent contribution to New Car fund",
    created_at: "2025-05-20",
  },
  {
    id: 609,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 5, // New Car
    type: "expense",
    amount: 500.0,
    date: "2025-06-01",
    notes: "Recent contribution to New Car fund",
    created_at: "2025-06-01",
  },

  // Vacation Fund transactions
  {
    id: 610,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 6, // Vacation Fund
    type: "expense",
    amount: 300.0,
    date: "2023-05-10",
    notes: "Initial contribution to Vacation Fund",
    created_at: "2023-05-10",
  },
  {
    id: 611,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 6, // Vacation Fund
    type: "expense",
    amount: 250.0,
    date: "2023-06-10",
    notes: "Monthly contribution to Vacation Fund",
    created_at: "2023-06-10",
  },
  {
    id: 612,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 6, // Vacation Fund
    type: "expense",
    amount: 250.0,
    date: "2023-07-10",
    notes: "Monthly contribution to Vacation Fund",
    created_at: "2023-07-10",
  },
  {
    id: 613,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 6, // Vacation Fund
    type: "expense",
    amount: 250.0,
    date: "2025-05-15",
    notes: "Recent contribution to Vacation Fund",
    created_at: "2025-05-15",
  },

  // Wedding Fund transactions
  {
    id: 614,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 7, // Wedding Fund
    type: "expense",
    amount: 1000.0,
    date: "2023-01-20",
    notes: "Initial contribution to Wedding Fund",
    created_at: "2023-01-20",
  },
  {
    id: 615,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 7, // Wedding Fund
    type: "expense",
    amount: 750.0,
    date: "2023-03-15",
    notes: "Quarterly contribution to Wedding Fund",
    created_at: "2023-03-15",
  },
  {
    id: 616,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 7, // Wedding Fund
    type: "expense",
    amount: 750.0,
    date: "2023-06-15",
    notes: "Quarterly contribution to Wedding Fund",
    created_at: "2023-06-15",
  },
  {
    id: 617,
    user_id: 1,
    account_id: 1,
    category_id: null,
    goal_id: 7, // Wedding Fund
    type: "expense",
    amount: 1000.0,
    date: "2025-05-01",
    notes: "Recent contribution to Wedding Fund",
    created_at: "2025-05-01",
  },
  {
    id: 618,
    user_id: 1,
    account_id: 2,
    category_id: null,
    goal_id: 7, // Wedding Fund
    type: "expense",
    amount: 1000.0,
    date: "2025-06-01",
    notes: "Recent contribution to Wedding Fund",
    created_at: "2025-06-01",
  },
  
  // ... rest of the existing transactions ...
];

// Budgets
export const budgets = [
  // June 2025 budgets
  {
    id: 1,
    user_id: 1,
    category_id: 1, // Housing
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 1350.0,
  },
  {
    id: 2,
    user_id: 1,
    category_id: 2, // Utilities
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 300.0,
  },
  {
    id: 3,
    user_id: 1,
    category_id: 3, // Groceries
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 800.0,
  },
  {
    id: 4,
    user_id: 1,
    category_id: 4, // Transportation
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 150.0,
  },
  {
    id: 5,
    user_id: 1,
    category_id: 5, // Dining Out
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 200.0,
  },
  {
    id: 6,
    user_id: 1,
    category_id: 6, // Entertainment
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 200.0,
  },
  {
    id: 7,
    user_id: 1,
    category_id: 7, // Healthcare
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 150.0,
  },
  {
    id: 8,
    user_id: 1,
    category_id: 9, // Shopping
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 300.0,
  },
  {
    id: 9,
    user_id: 1,
    category_id: 12, // Subscriptions
    period_start: "2025-06-01",
    period_end: "2025-06-30",
    amount: 50.0,
  },

  // May 2025 budgets
  {
    id: 10,
    user_id: 1,
    category_id: 1, // Housing
    period_start: "2025-05-01",
    period_end: "2025-05-31",
    amount: 1350.0,
  },
  {
    id: 11,
    user_id: 1,
    category_id: 2, // Utilities
    period_start: "2025-05-01",
    period_end: "2025-05-31",
    amount: 275.0,
  },
  {
    id: 12,
    user_id: 1,
    category_id: 3, // Groceries
    period_start: "2025-05-01",
    period_end: "2025-05-31",
    amount: 750.0,
  },
  // ... existing budgets with updated dates ...
];

// Goals
export const goals = [
  {
    id: 1,
    user_id: 1,
    goal_name: "Japan Trip",
    target_amount: 5000.0,
    target_date: "2023-12-31",
    priority: "high",
    status: "in_progress",
    created_at: "2023-01-15",
    current_amount: 1500.0,
  },
  {
    id: 2,
    user_id: 1,
    goal_name: "Emergency Fund",
    target_amount: 10000.0,
    target_date: "2023-12-31",
    priority: "high",
    status: "in_progress",
    created_at: "2023-01-15",
    current_amount: 2000.0,
  },
  {
    id: 3,
    user_id: 1,
    goal_name: "New Laptop",
    target_amount: 1500.0,
    target_date: "2023-08-31",
    priority: "medium",
    status: "in_progress",
    created_at: "2023-02-10",
    current_amount: 500.0,
  },
  {
    id: 4,
    user_id: 1,
    goal_name: "Home Down Payment",
    target_amount: 25000.0,
    target_date: "2025-12-31",
    priority: "high",
    status: "in_progress",
    created_at: "2023-04-01",
    current_amount: 3750.0,
  },
  {
    id: 5,
    user_id: 1,
    goal_name: "New Car",
    target_amount: 8000.0,
    target_date: "2024-06-30",
    priority: "medium",
    status: "in_progress",
    created_at: "2023-03-15",
    current_amount: 2200.0,
  },
  {
    id: 6,
    user_id: 1,
    goal_name: "Vacation Fund",
    target_amount: 3000.0,
    target_date: "2023-09-30",
    priority: "low",
    status: "in_progress",
    created_at: "2023-05-10",
    current_amount: 1050.0,
  },
  {
    id: 7,
    user_id: 1,
    goal_name: "Wedding Fund",
    target_amount: 15000.0,
    target_date: "2024-10-15",
    priority: "high",
    status: "in_progress",
    created_at: "2023-01-20",
    current_amount: 4500.0,
  },
];

// Family
export const family = [
  {
    id: 1,
    owner_user_id: 1,
    family_name: "Mock Data Family",
    created_at: "2023-01-15",
  },
];

// Family Members
export const familyMembers = [
  {
    family_id: 1,
    member_user_id: 1,
    role: "admin",
    join_date: "2023-01-15",
  },
  {
    family_id: 1,
    member_user_id: 2,
    role: "viewer",
    join_date: "2023-02-15",
  },
  {
    family_id: 1,
    member_user_id: 3,
    role: "viewer",
    join_date: "2023-03-05",
  },
  {
    family_id: 1,
    member_user_id: 3,
    role: "viewer",
    join_date: "2025-05-20",
  },
];

// AI Predictions
export const aiPredictions = [
  {
    id: 1,
    user_id: 1,
    category_id: 3, // Groceries
    predicted_amount: 350.0,
    period_start: "2023-06-01",
    period_end: "2023-06-30",
    model_used: "Prophet",
    confidence_interval: 0.85,
    generated_at: "2023-05-01",
  },
  {
    id: 2,
    user_id: 1,
    category_id: 5, // Dining Out
    predicted_amount: 180.0,
    period_start: "2023-06-01",
    period_end: "2023-06-30",
    model_used: "Prophet",
    confidence_interval: 0.82,
    generated_at: "2023-05-01",
  },
  {
    id: 3,
    user_id: 1,
    category_id: 6, // Entertainment
    predicted_amount: 120.0,
    period_start: "2023-06-01",
    period_end: "2023-06-30",
    model_used: "Prophet",
    confidence_interval: 0.79,
    generated_at: "2023-05-01",
  },
  {
    id: 4,
    user_id: 1,
    category_id: 1, // Income - Salary
    predicted_amount: 4500.0,
    period_start: "2023-06-01",
    period_end: "2023-06-30",
    model_used: "Prophet",
    confidence_interval: 0.95,
    generated_at: "2023-05-01",
  },
];

// Helper functions to work with mock data
export const getCurrentUserData = (userId = 1) => {
  const user = users.find((u) => u.id === userId);
  const userAccounts = accounts.filter((a) => a.user_id === userId);
  const userTransactions = transactions.filter((t) => t.user_id === userId);
  const userBudgets = budgets.filter((b) => b.user_id === userId);
  const userGoals = goals.filter((g) => g.user_id === userId);
  const userIncomeCats = incomeCategories.filter((c) => c.user_id === userId);
  const userExpenseCats = expenseCategories.filter((c) => c.user_id === userId);
  const userFamily = familyMembers.find((fm) => fm.member_user_id === userId);

  return {
    user,
    accounts: userAccounts,
    transactions: userTransactions,
    budgets: userBudgets,
    goals: userGoals,
    incomeCategories: userIncomeCats,
    expenseCategories: userExpenseCats,
    family: userFamily
      ? family.find((f) => f.id === userFamily.family_id)
      : null,
  };
};

export const getTransactionsByCategory = (userId, categoryId) => {
  return transactions.filter(
    (t) => t.user_id === userId && t.category_id === categoryId
  );
};

export const getTransactionsByDate = (userId, startDate, endDate) => {
  console.log(`getTransactionsByDate - userId: ${userId}, startDate: ${startDate}, endDate: ${endDate}`);
  
  // Parse dates properly, ensuring midnight at start and end of day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  console.log(`Parsed dates - start: ${start.toISOString()}, end: ${end.toISOString()}`);
  
  // Filter transactions by user and date range
  const filteredTransactions = transactions.filter((t) => {
    if (t.user_id !== userId) return false;
    
    const txDate = new Date(t.date);
    txDate.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
    
    const isInRange = txDate >= start && txDate <= end;
    if (isInRange) {
      console.log(`Transaction in range: ${t.date} - ${t.amount} - ${t.notes}`);
    }
    return isInRange;
  });
  
  console.log(`Found ${filteredTransactions.length} transactions in date range`);
  return filteredTransactions;
};

export const getBudgetSpent = (userId, categoryId, startDate, endDate) => {
  console.log(`getBudgetSpent called for userId: ${userId}, categoryId: ${categoryId}, from ${startDate} to ${endDate}`);
  
  // Get transactions within date range
  const periodTransactions = getTransactionsByDate(userId, startDate, endDate);
  console.log(`getBudgetSpent found ${periodTransactions.length} transactions in period`);
  
  // Filter for expenses in the specific category
  const categoryTransactions = periodTransactions.filter(
    (t) => t.category_id === categoryId && t.type === "expense"
  );
  
  console.log(`getBudgetSpent found ${categoryTransactions.length} matching category transactions`);
  
  if (categoryTransactions.length > 0) {
    categoryTransactions.forEach((tx, i) => {
      console.log(`Transaction ${i+1}: ${new Date(tx.date).toISOString().split('T')[0]} - ${tx.amount} - ${tx.notes}`);
    });
  }
  
  // Sum all matching transaction amounts
  const total = categoryTransactions.reduce((total, tx) => total + tx.amount, 0);
  console.log(`getBudgetSpent calculated total: ${total}`);
  
  return total;
};

export const getTotalIncome = (userId, startDate, endDate) => {
  const incomeTransactions = getTransactionsByDate(
    userId,
    startDate,
    endDate
  ).filter((t) => t.type === "income");

  return incomeTransactions.reduce((total, tx) => total + tx.amount, 0);
};

export const getTotalExpenses = (userId, startDate, endDate) => {
  const expenseTransactions = getTransactionsByDate(
    userId,
    startDate,
    endDate
  ).filter((t) => t.type === "expense");

  return expenseTransactions.reduce((total, tx) => total + tx.amount, 0);
};

export const getGoalProgress = (goalId) => {
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return 0;
  return (goal.current_amount / goal.target_amount) * 100;
};

export const getCategoryById = (categoryId, type) => {
  if (type === "income") {
    return incomeCategories.find((c) => c.id === categoryId);
  } else {
    return expenseCategories.find((c) => c.id === categoryId);
  }
};

export const getAccountById = (accountId) => {
  return accounts.find((a) => a.id === accountId);
};

export const getMonthlySpendingData = (userId) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate dataset for chart
  return {
    labels: months.slice(0, 5), // Just show 5 months for demo
    datasets: [
      {
        label: "Income",
        data: [4200, 4300, 4500, 5350, 4500],
        backgroundColor: "#4CAF50",
        borderColor: "#4CAF50",
        borderWidth: 1,
      },
      {
        label: "Expenses",
        data: [2800, 3100, 2900, 3080, 2981],
        backgroundColor: "#F44336",
        borderColor: "#F44336",
        borderWidth: 1,
      },
    ],
  };
};

export const getCategorySpendingData = (userId) => {
  // We're simplifying this for the demo
  return {
    labels: [
      "Housing",
      "Utilities",
      "Groceries",
      "Transportation",
      "Dining Out",
      "Entertainment",
      "Healthcare",
    ],
    datasets: [
      {
        data: [1200, 250, 500, 300, 200, 150, 200],
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#7BC225",
        ],
        borderWidth: 1,
      },
    ],
  };
};

export const getBudgetProgressData = (userId) => {
  return budgets.map((budget) => {
    const category = expenseCategories.find((c) => c.id === budget.category_id);
    const spent = getBudgetSpent(
      userId,
      budget.category_id,
      budget.period_start,
      budget.period_end
    );
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    
    // Determine budget status
    let status;
    if (percentage >= 100) {
      status = "danger";
    } else if (percentage >= 80) {
      status = "warning";
    } else {
      status = "success";
    }

    // Calculate month and year from period start
    const periodStart = new Date(budget.period_start);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = months[periodStart.getMonth()];
    const year = periodStart.getFullYear();

    // Return processed budget data
    return {
      id: budget.id,
      category: category ? category.category_name : "Unknown",
      budget: budget.amount,
      spent: spent,
      remaining: remaining,
      percentage: Math.min(percentage, 100), // Cap at 100% for display purposes
      status,
      month,
      year,
      period_start: budget.period_start,
      period_end: budget.period_end,
      category_id: budget.category_id,
    };
  });
};

// Sort transactions by date (newest first) - Export this function to fix the error
export const sortByDate = (transactions) => {
  return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Gets transaction trends data comparing current month to previous month
 * @param {string} userId - The user ID
 * @returns {Array} - Array of trend objects with category, change percentage, and amounts
 */
export const getTransactionTrends = (userId) => {
  // Get top spending categories from current month data
  const topCategories = getTopBudgetCategories(userId, 4);
  
  // Find the latest transaction date to determine "current" month
  const userTransactions = transactions.filter(t => t.user_id === userId);
  const sortedTransactions = [...userTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestTransaction = sortedTransactions[0];
  
  // Set current and previous month dates
  const currentDate = latestTransaction ? new Date(latestTransaction.date) : new Date();
  const previousDate = new Date(currentDate);
  previousDate.setMonth(currentDate.getMonth() - 1);
  
  // Get spending by category for current month
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const currentMonthTransactions = getTransactionsByDate(
    userId,
    currentMonthStart.toISOString(),
    currentMonthEnd.toISOString()
  );
  
  // Get spending by category for previous month
  const previousMonthStart = new Date(previousDate.getFullYear(), previousDate.getMonth(), 1);
  const previousMonthEnd = new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0);
  const previousMonthTransactions = getTransactionsByDate(
    userId,
    previousMonthStart.toISOString(),
    previousMonthEnd.toISOString()
  );
  
  // Calculate spending by category for both months
  const currentSpendingByCategory = {};
  const previousSpendingByCategory = {};
  
  // Process current month spending by category
  currentMonthTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const categoryId = tx.category_id;
      if (!currentSpendingByCategory[categoryId]) {
        currentSpendingByCategory[categoryId] = 0;
      }
      currentSpendingByCategory[categoryId] += tx.amount;
    });
  
  // Process previous month spending by category
  previousMonthTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const categoryId = tx.category_id;
      if (!previousSpendingByCategory[categoryId]) {
        previousSpendingByCategory[categoryId] = 0;
      }
      previousSpendingByCategory[categoryId] += tx.amount;
    });
  
  // Create trend data for top categories
  return topCategories.map(category => {
    // Get the category ID based on name
    const categoryObj = expenseCategories.find(cat => cat.category_name === category.name);
    const categoryId = categoryObj ? categoryObj.id : null;
    
    // Get current and previous spending
    const currentAmount = category.amount; // We already have this from category
    let previousAmount = previousSpendingByCategory[categoryId] || 0;
    
    // If there's no previous spending for this category, use 80% of current as fallback
    // This ensures we have reasonable data for new spending categories
    if (previousAmount === 0 && currentAmount > 0) {
      previousAmount = currentAmount * 0.8; 
    }
    
    // Calculate change percentage (ensure we don't divide by zero)
    const changePercentage = previousAmount > 0 ? 
      ((currentAmount - previousAmount) / previousAmount) * 100 : 100;
    
    return {
      category: category.name,
      change: changePercentage,
      previousAmount: Math.round(previousAmount * 100) / 100, // Round to 2 decimal places
      currentAmount: Math.round(currentAmount * 100) / 100
    };
  });
};

/**
 * Gets the top budget categories by amount
 * @param {string} userId - The user ID
 * @param {number} limit - Maximum number of categories to return
 * @returns {Array} - Array of budget category objects
 */
export const getTopBudgetCategories = (userId, limit = 4) => {
  const budgets = getBudgetProgressData(userId);
  
  // Sort budgets by amount and take the top ones
  return budgets
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map(budget => ({
      id: budget.id,
      name: budget.category,
      amount: budget.spent
    }));
};

/**
 * Gets monthly transactions for a specific user
 * @param {string|number} userId - The user ID
 * @param {Date} month - Date object for the month (only month and year are used)
 * @returns {Array} - Array of transactions for the specified month
 */
export const getMonthlyTransactions = (userId, month) => {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  
  return getTransactionsByDate(
    userId,
    startDate.toISOString(),
    endDate.toISOString()
  );
};

/**
 * Calculates spending by category for a given set of transactions
 * @param {Array} transactions - Array of transactions
 * @returns {Object} - Object with category IDs as keys and total amounts as values
 */
export const calculateSpendingByCategory = (transactions) => {
  const spendingByCategory = {};
  
  // Filter for expense transactions
  const expenseTransactions = transactions.filter(t => t.type === "expense");
  
  // Sum amounts by category
  expenseTransactions.forEach(transaction => {
    const categoryId = transaction.category_id;
    if (!spendingByCategory[categoryId]) {
      spendingByCategory[categoryId] = 0;
    }
    spendingByCategory[categoryId] += transaction.amount;
  });
  
  return spendingByCategory;
};

/**
 * Calculates if spending patterns are consistent between two months
 * @param {string|number} userId - The user ID
 * @returns {boolean} - True if spending is consistent, false otherwise
 */
export const calculateConsistentSpending = (userId) => {
  // Get current and previous month dates
  const currentMonth = new Date();
  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  // Get transactions for both months
  const currentMonthData = getMonthlyTransactions(userId, currentMonth);
  const previousMonthData = getMonthlyTransactions(userId, previousMonth);
  
  // Calculate spending by category for both months
  const currentSpendingByCategory = calculateSpendingByCategory(currentMonthData);
  const previousSpendingByCategory = calculateSpendingByCategory(previousMonthData);
  
  // Compare spending patterns
  let consistencyScore = 0;
  let categoriesCompared = 0;
  
  for (const categoryId in currentSpendingByCategory) {
    if (previousSpendingByCategory[categoryId]) {
      const currentAmount = currentSpendingByCategory[categoryId];
      const previousAmount = previousSpendingByCategory[categoryId];
      
      // Calculate percentage change
      const percentChange = Math.abs((currentAmount - previousAmount) / previousAmount) * 100;
      
      if (percentChange < 20) {
        consistencyScore++;
      }
      categoriesCompared++;
    }
  }
  
  // If 70% of categories are consistent, return true
  return categoriesCompared > 0 && (consistencyScore / categoriesCompared) >= 0.7;
};

/**
 * Calculates debt reduction compared to previous month
 * @param {string|number} userId - The user ID
 * @returns {number} - Percentage of debt reduction (positive means reduction)
 */
export const calculateDebtReduction = (userId) => {
  // Get current and previous month dates
  const currentMonth = new Date();
  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  // For this mock implementation, we'll return a random value between -10 and 20
  // In a real app, we would calculate this from credit card balance changes
  return Math.floor(Math.random() * 30) - 10;
};

/**
 * Finds unusual transactions that don't match typical spending patterns
 * @param {string|number} userId - The user ID
 * @returns {Array} - Array of unusual transactions
 */
export const findUnusualTransactions = (userId) => {
  const currentMonth = new Date();
  const transactions = getMonthlyTransactions(userId, currentMonth);
  
  // For mock implementation, we'll identify a transaction as unusual if:
  // 1. It's more than double the average transaction amount for that category
  // 2. Or it's a new category not typically used
  
  // Get all user transactions for the past 3 months for comparison
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const historicalTransactions = getTransactionsByDate(
    userId,
    threeMonthsAgo.toISOString(),
    new Date().toISOString()
  ).filter(t => t.type === "expense");
  
  // Calculate average transaction amount by category
  const categoryAverages = {};
  const categoryCounts = {};
  
  historicalTransactions.forEach(transaction => {
    const categoryId = transaction.category_id;
    if (!categoryAverages[categoryId]) {
      categoryAverages[categoryId] = 0;
      categoryCounts[categoryId] = 0;
    }
    categoryAverages[categoryId] += transaction.amount;
    categoryCounts[categoryId]++;
  });
  
  // Calculate actual averages
  for (const categoryId in categoryAverages) {
    categoryAverages[categoryId] /= categoryCounts[categoryId];
  }
  
  // Identify unusual transactions
  return transactions
    .filter(transaction => transaction.type === "expense")
    .filter(transaction => {
      const categoryId = transaction.category_id;
      
      // If this is a new category or the transaction amount is more than double the average
      return (
        !categoryAverages[categoryId] || 
        transaction.amount > categoryAverages[categoryId] * 2
      );
    });
};

/**
 * Get transactions related to a specific goal
 * @param {string|number} goalId - The goal ID
 * @returns {Array} - Array of transactions associated with the goal
 */
export const getTransactionsByGoalId = (goalId) => {
  return transactions.filter(t => t.goal_id && t.goal_id.toString() === goalId.toString());
};

/**
 * Contribute to a goal by creating a transaction and updating balances
 * @param {string|number} goalId - The goal ID
 * @param {number} amount - The contribution amount
 * @param {number} accountId - The account ID to draw funds from
 * @param {string} notes - Optional notes for the transaction
 * @returns {Object} - Result object with success status and transaction data
 */
export const contributeToGoal = (goalId, amount, accountId, notes = "Goal contribution") => {
  try {
    const goal = goals.find(g => g.id.toString() === goalId.toString());
    const account = accounts.find(a => a.id === accountId);
    
    if (!goal) {
      return { success: false, error: "Goal not found" };
    }
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }
    
    if (account.balance < amount) {
      return { success: false, error: "Insufficient funds in account" };
    }
    
    // Create a new transaction
    const newTransactionId = transactions.length + 1;
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    
    const newTransaction = {
      id: newTransactionId,
      user_id: goal.user_id,
      account_id: accountId,
      category_id: null,
      goal_id: goal.id,
      type: "expense", // It's an expense from the account perspective
      amount: amount,
      date: dateString,
      notes: notes,
      created_at: now.toISOString(),
    };
    
    // Add transaction to the transactions array
    transactions.push(newTransaction);
    
    // Update goal's current amount
    const goalIndex = goals.findIndex(g => g.id.toString() === goalId.toString());
    goals[goalIndex].current_amount += amount;
    
    // Update goal status if needed
    if (goals[goalIndex].current_amount >= goals[goalIndex].target_amount) {
      goals[goalIndex].status = "completed";
    }
    
    // Update account balance
    const accountIndex = accounts.findIndex(a => a.id === accountId);
    accounts[accountIndex].balance -= amount;
    
    return { 
      success: true, 
      transaction: newTransaction, 
      updatedGoal: goals[goalIndex],
      updatedAccount: accounts[accountIndex]
    };
  } catch (error) {
    console.error("Error contributing to goal:", error);
    return { success: false, error: "An error occurred during contribution" };
  }
};

/**
 * Get summary of all goals for a user
 * @param {number} userId - The user ID
 * @returns {Object} - Summary stats for all user goals
 */
export const getUserGoalsSummary = (userId) => {
  const userGoals = goals.filter(g => g.user_id === userId);
  
  const totalTargetAmount = userGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrentAmount = userGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalRemainingAmount = totalTargetAmount - totalCurrentAmount;
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
  
  const activeGoals = userGoals.filter(g => g.status === "in_progress").length;
  const completedGoals = userGoals.filter(g => g.status === "completed").length;
  
  // Group goals by priority
  const goalsByPriority = {
    high: userGoals.filter(g => g.priority === "high").length,
    medium: userGoals.filter(g => g.priority === "medium").length,
    low: userGoals.filter(g => g.priority === "low").length,
  };
  
  return {
    totalGoals: userGoals.length,
    activeGoals,
    completedGoals,
    totalTargetAmount,
    totalCurrentAmount,
    totalRemainingAmount,
    overallProgress,
    goalsByPriority,
  };
};

/**
 * Calculate relationship between budgets and goals
 * @param {number} userId - The user ID
 * @returns {Object} - Budget-to-goals relationship metrics
 */
export const calculateBudgetToGoalRelationship = (userId) => {
  const userGoals = goals.filter(g => g.user_id === userId);
  const userBudgets = budgets.filter(b => b.user_id === userId);
  
  // Find goal-related transactions
  const goalTransactions = transactions.filter(t => 
    t.user_id === userId && 
    t.goal_id !== null && 
    t.goal_id !== undefined
  );
  
  // Calculate total budget allocated and total spent on goals
  const totalBudgetAllocated = userBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpentOnGoals = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate percentage of budget dedicated to goals
  const percentageBudgetToGoals = totalBudgetAllocated > 0 ? 
    (totalSpentOnGoals / totalBudgetAllocated) * 100 : 0;
  
  return {
    totalBudgetAllocated,
    totalSpentOnGoals,
    percentageBudgetToGoals,
    goalTransactionsCount: goalTransactions.length,
  };
};

/**
 * Get aggregated budget vs. spending for a family
 * @param {number} familyId - The family ID
 * @returns {Object} - Aggregated data for budget performance chart
 */
export const getFamilyBudgetPerformance = (familyId) => {
  // Get all members of the family
  const members = familyMembers.filter(fm => fm.family_id === familyId);
  const memberIds = members.map(m => m.member_user_id);

  const aggregatedBudgets = {};

  // Aggregate budgets from all family members
  memberIds.forEach(userId => {
    const memberBudgets = getBudgetProgressData(userId);
    memberBudgets.forEach(budget => {
      if (!aggregatedBudgets[budget.category]) {
        aggregatedBudgets[budget.category] = {
          category: budget.category,
          totalBudgeted: 0,
          totalSpent: 0,
        };
      }
      aggregatedBudgets[budget.category].totalBudgeted += budget.budget;
      aggregatedBudgets[budget.category].totalSpent += budget.spent;
    });
  });

  const categories = Object.keys(aggregatedBudgets);
  const totalBudgetedData = categories.map(cat => aggregatedBudgets[cat].totalBudgeted);
  const totalSpentData = categories.map(cat => aggregatedBudgets[cat].totalSpent);

  return {
    labels: categories,
    datasets: [
      {
        label: "Total Budgeted",
        data: totalBudgetedData,
      },
      {
        label: "Total Spent",
        data: totalSpentData,
      },
    ],
  };
};

/**
 * Get aggregated contributions for a specific goal, broken down by family member.
 * @param {number} goalId - The ID of the goal.
 * @returns {Array} - An array of objects, each containing user details and their total contribution.
 */
export const getGoalContributionsByMember = (goalId) => {
  const goalTransactions = getTransactionsByGoalId(goalId);
  const contributions = {};

  goalTransactions.forEach(transaction => {
    const userId = transaction.user_id;
    if (!contributions[userId]) {
      const user = users.find(u => u.id === userId);
      contributions[userId] = {
        userId: userId,
        username: user ? user.username : "Unknown User",
        profilePicture: user ? `../images/placeholder.png` : "",
        amount: 0,
      };
    }
    contributions[userId].amount += transaction.amount;
  });

  // Convert the contributions object to an array
  return Object.values(contributions);
};

export const getPendingInvitations = (email) => {
  return familyInvitations.filter(
    (inv) => inv.invited_user_email === email && inv.status === "pending"
  );
};

export const acceptInvitation = (invitationId) => {
  const invitation = familyInvitations.find((inv) => inv.id === invitationId);
  if (!invitation) return false;

  const user = users.find((u) => u.email === invitation.invited_user_email);
  if (!user) return false;

  invitation.status = "accepted";

  const newFamilyMember = {
    id: familyMembers.length + 1,
    family_id: invitation.family_id,
    member_user_id: user.id,
    role: invitation.role,
    join_date: new Date().toISOString().split("T")[0],
  };

  familyMembers.push(newFamilyMember);
  return true;
};

export const rejectInvitation = (invitationId) => {
  const invitation = familyInvitations.find((inv) => inv.id === invitationId);
  if (invitation) {
    invitation.status = "rejected";
    return true;
  }
  return false;
};
