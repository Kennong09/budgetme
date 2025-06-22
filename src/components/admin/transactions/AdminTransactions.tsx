import React, { useState, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
} from "../../../utils/helpers";
import { getCategoryById, getAccountById } from "../../../data/mockData";
import { Transaction } from "../../../types";

// Import any necessary CSS
import "../admin.css";

const AdminTransactions: React.FC = () => {
  // State for transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // State for summary data
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    avgTransactionAmount: 0,
    transactionsByType: {
      income: 0,
      expense: 0
    }
  });

  // Set up filter state
  const [filter, setFilter] = useState({
    type: "all",
    user: "all",
    account: "all",
    category: "all",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    search: "",
    sortBy: "date"
  });

  // Mock users and accounts data for filtering
  const users = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Robert Johnson" },
  ];

  const accounts = [
    { id: "1", name: "Checking Account" },
    { id: "2", name: "Savings Account" },
    { id: "3", name: "Credit Card" },
    { id: "4", name: "Investment Account" },
  ];

  const categories = [
    { id: "1", name: "Salary", type: "income" },
    { id: "2", name: "Investments", type: "income" },
    { id: "3", name: "Food & Dining", type: "expense" },
    { id: "4", name: "Housing", type: "expense" },
    { id: "5", name: "Transportation", type: "expense" },
    { id: "6", name: "Entertainment", type: "expense" },
  ];

  useEffect(() => {
    // Simulate API call to fetch all transactions across users
    const timer = setTimeout(() => {
      // This would normally be an API call to get all transactions
      const mockTransactions = [
        {
          id: "1",
          date: "2023-05-15",
          amount: 3500,
          notes: "May Salary",
          type: "income",
          category_id: 1,
          account_id: 1,
          user_id: "1",
          created_at: "2023-05-15T10:30:00Z"
        },
        {
          id: "2",
          date: "2023-05-20",
          amount: 1200,
          notes: "Monthly Rent Payment",
          type: "expense",
          category_id: 4,
          account_id: 1,
          user_id: "1",
          created_at: "2023-05-20T15:45:00Z"
        },
        {
          id: "3",
          date: "2023-05-22",
          amount: 85,
          notes: "Grocery Shopping",
          type: "expense",
          category_id: 3,
          account_id: 1,
          user_id: "1",
          created_at: "2023-05-22T18:20:00Z"
        },
        {
          id: "4",
          date: "2023-05-25",
          amount: 200,
          notes: "Dividend Payment",
          type: "income",
          category_id: 2,
          account_id: 4,
          user_id: "2",
          created_at: "2023-05-25T09:15:00Z"
        },
        {
          id: "5",
          date: "2023-05-28",
          amount: 150,
          notes: "Dinner with friends",
          type: "expense",
          category_id: 3,
          account_id: 3,
          user_id: "2",
          created_at: "2023-05-28T20:45:00Z"
        },
        {
          id: "6",
          date: "2023-06-01",
          amount: 60,
          notes: "Gas fill-up",
          type: "expense",
          category_id: 5,
          account_id: 3,
          user_id: "3",
          created_at: "2023-06-01T12:30:00Z"
        },
        {
          id: "7",
          date: "2023-06-05",
          amount: 4200,
          notes: "June Salary",
          type: "income",
          category_id: 1,
          account_id: 1,
          user_id: "1",
          created_at: "2023-06-05T09:00:00Z"
        },
        {
          id: "8",
          date: "2023-06-10",
          amount: 120,
          notes: "Concert tickets",
          type: "expense",
          category_id: 6,
          account_id: 3,
          user_id: "3",
          created_at: "2023-06-10T14:20:00Z"
        },
        {
          id: "9",
          date: "2023-06-15",
          amount: 2800,
          notes: "Freelance Project",
          type: "income",
          category_id: 1,
          account_id: 1,
          user_id: "2",
          created_at: "2023-06-15T16:10:00Z"
        },
        {
          id: "10",
          date: "2023-06-18",
          amount: 350,
          notes: "Car repair",
          type: "expense",
          category_id: 5,
          account_id: 1,
          user_id: "3",
          created_at: "2023-06-18T11:45:00Z"
        },
      ] as unknown as Transaction[];

      setTransactions(mockTransactions);
      setFilteredTransactions(mockTransactions);
      
      // Calculate summary data
      calculateSummary(mockTransactions);
      
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Function to calculate transaction summary
  const calculateSummary = (txList: Transaction[]) => {
    const totalIncome = txList.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = txList.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const incomeCount = txList.filter(tx => tx.type === 'income').length;
    const expenseCount = txList.filter(tx => tx.type === 'expense').length;
    
    setSummary({
      totalTransactions: txList.length,
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      avgTransactionAmount: txList.length > 0 ? txList.reduce((sum, tx) => sum + tx.amount, 0) / txList.length : 0,
      transactionsByType: {
        income: incomeCount,
        expense: expenseCount
      }
    });
  };

  // Apply filters when filter state changes
  useEffect(() => {
    if (transactions.length === 0) return;
    
    // Show loading indicator
    setIsFiltering(true);
    
    setTimeout(() => {
      let result = [...transactions];
      
      // Filter by type
      if (filter.type !== "all") {
        result = result.filter(tx => tx.type === filter.type);
      }
      
      // Filter by user
      if (filter.user !== "all") {
        result = result.filter(tx => tx.user_id === filter.user);
      }
      
      // Filter by account
      if (filter.account !== "all") {
        result = result.filter(tx => tx.account_id.toString() === filter.account);
      }
      
      // Filter by category
      if (filter.category !== "all") {
        result = result.filter(tx => tx.category_id?.toString() === filter.category);
      }
      
      // Filter by date range
      if (filter.startDate) {
        result = result.filter(tx => new Date(tx.date) >= new Date(filter.startDate));
      }
      
      if (filter.endDate) {
        result = result.filter(tx => new Date(tx.date) <= new Date(filter.endDate));
      }
      
      // Filter by amount range
      if (filter.minAmount) {
        result = result.filter(tx => tx.amount >= parseFloat(filter.minAmount));
      }
      
      if (filter.maxAmount) {
        result = result.filter(tx => tx.amount <= parseFloat(filter.maxAmount));
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        result = result.filter(tx => 
          tx.notes.toLowerCase().includes(searchTerm)
        );
      }
      
      // Sort results
      result = sortTransactions(result, filter.sortBy);
      
      setFilteredTransactions(result);
      calculateSummary(result);
      setIsFiltering(false);
    }, 300);
  }, [filter, transactions]);

  // Function to sort transactions
  const sortTransactions = (txToSort: Transaction[], sortBy: string): Transaction[] => {
    switch(sortBy) {
      case "date":
        return [...txToSort].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "date-asc":
        return [...txToSort].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "amount":
        return [...txToSort].sort((a, b) => b.amount - a.amount);
      case "amount-asc":
        return [...txToSort].sort((a, b) => a.amount - b.amount);
      default:
        return txToSort;
    }
  };

  // Handle filter changes
  const handleFilterChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    
    setIsFiltering(true);
    
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters to default
  const resetFilters = (): void => {
    setIsFiltering(true);
    
    setFilter({
      type: "all",
      user: "all",
      account: "all",
      category: "all",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      search: "",
      sortBy: "date"
    });
  };

  // Handle transaction deletion
  const handleDeleteClick = (transactionId: string): void => {
    setSelectedTransactionId(transactionId);
    setShowDeleteModal(true);
  };

  const confirmDelete = (): void => {
    if (selectedTransactionId) {
      // In a real app, this would make an API call
      console.log(`Deleting transaction with ID: ${selectedTransactionId}`);
      
      // Filter out the deleted transaction
      const updatedTransactions = transactions.filter(tx => tx.id.toString() !== selectedTransactionId);
      setTransactions(updatedTransactions);
      setFilteredTransactions(filteredTransactions.filter(tx => tx.id.toString() !== selectedTransactionId));
      calculateSummary(updatedTransactions);
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedTransactionId(null);
    }
  };

  // Get user name by ID
  const getUserNameById = (userId: string | number | undefined): string => {
    const user = users.find(u => u.id === userId?.toString());
    return user ? user.name : 'Unknown User';
  };

  // Get account name by ID
  const getAccountNameById = (accountId: number | string | undefined): string => {
    const account = accounts.find(a => a.id === (accountId?.toString()));
    return account ? account.name : 'Unknown Account';
  };

  // Get category name by ID
  const getCategoryNameById = (categoryId: number | undefined, type: string): string => {
    const category = categories.find(c => c.id === categoryId?.toString() && c.type === type);
    return category ? category.name : 'Uncategorized';
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading transaction data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Transaction Management</h1>
        <div>
          <button className="btn btn-sm btn-primary shadow-sm mr-2">
            <i className="fas fa-download fa-sm text-white-50 mr-1"></i> Export Transactions
          </button>
          <Link to="/admin/transactions/add" className="btn btn-sm btn-success shadow-sm">
            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Add Transaction
          </Link>
        </div>
      </div>

      {/* Summary Stats Cards Row */}
      <div className="row">
        {/* Total Transactions Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Transactions
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summary.totalTransactions}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Income
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(summary.totalIncome)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Total Expenses
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(summary.totalExpenses)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Amount Card */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Net Amount
                  </div>
                  <div className={`h5 mb-0 font-weight-bold ${summary.netAmount >= 0 ? "text-success" : "text-danger"}`}>
                    {formatCurrency(summary.netAmount)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-balance-scale fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">Filter Transactions</h6>
          <button onClick={resetFilters} className="btn btn-sm btn-outline-primary">
            <i className="fas fa-redo-alt fa-sm mr-1"></i> Reset
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-3">
              <label htmlFor="type" className="font-weight-bold text-gray-800">Type</label>
              <select
                id="type"
                name="type"
                value={filter.type}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="user" className="font-weight-bold text-gray-800">User</label>
              <select
                id="user"
                name="user"
                value={filter.user}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="account" className="font-weight-bold text-gray-800">Account</label>
              <select
                id="account"
                name="account"
                value={filter.account}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="category" className="font-weight-bold text-gray-800">Category</label>
              <select
                id="category"
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="all">All Categories</option>
                <optgroup label="Income Categories">
                  {categories.filter(cat => cat.type === 'income').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Expense Categories">
                  {categories.filter(cat => cat.type === 'expense').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-md-3 mb-3">
              <label htmlFor="startDate" className="font-weight-bold text-gray-800">From Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filter.startDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="endDate" className="font-weight-bold text-gray-800">To Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filter.endDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="minAmount" className="font-weight-bold text-gray-800">Min Amount</label>
              <input
                type="number"
                id="minAmount"
                name="minAmount"
                value={filter.minAmount}
                onChange={handleFilterChange}
                className="form-control"
                placeholder="0"
              />
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="maxAmount" className="font-weight-bold text-gray-800">Max Amount</label>
              <input
                type="number"
                id="maxAmount"
                name="maxAmount"
                value={filter.maxAmount}
                onChange={handleFilterChange}
                className="form-control"
                placeholder="0"
              />
            </div>

            <div className="col-md-9 mb-3">
              <label htmlFor="search" className="font-weight-bold text-gray-800">Search</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search by description..."
                className="form-control"
              />
            </div>

            <div className="col-md-3 mb-3">
              <label htmlFor="sortBy" className="font-weight-bold text-gray-800">Sort By</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filter.sortBy}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="date">Date (newest first)</option>
                <option value="date-asc">Date (oldest first)</option>
                <option value="amount">Amount (highest first)</option>
                <option value="amount-asc">Amount (lowest first)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Distribution Card */}
      <div className="row mb-4">
        <div className="col-lg-6">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Transaction Type Distribution</h6>
            </div>
            <div className="card-body">
              {/* Income Distribution */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h4 className="small font-weight-bold">Income <span className="float-right">({summary.transactionsByType.income} transactions)</span></h4>
                  <span className="text-xs">{((summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="progress mb-4">
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${(summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100}%` }}
                    aria-valuenow={Number((summary.transactionsByType.income / Math.max(summary.totalTransactions, 1)) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              </div>
              
              {/* Expense Distribution */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h4 className="small font-weight-bold">Expenses <span className="float-right">({summary.transactionsByType.expense} transactions)</span></h4>
                  <span className="text-xs">{((summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="progress mb-4">
                  <div
                    className="progress-bar bg-danger"
                    role="progressbar"
                    style={{ width: `${(summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100}%` }}
                    aria-valuenow={Number((summary.transactionsByType.expense / Math.max(summary.totalTransactions, 1)) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              </div>

              {/* Additional summary information */}
              <div className="mt-4">
                <div className="row">
                  <div className="col-6">
                    <div className="small text-gray-500">Average Transaction Amount</div>
                    <div className="font-weight-bold">{formatCurrency(summary.avgTransactionAmount)}</div>
                  </div>
                  <div className="col-6">
                    <div className="small text-gray-500">Income to Expense Ratio</div>
                    <div className="font-weight-bold">
                      {summary.totalExpenses > 0 
                        ? formatPercentage(summary.totalIncome / summary.totalExpenses * 100) 
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Health Card */}
        <div className="col-lg-6">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Financial Analysis</h6>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="position-relative" style={{ width: "160px", height: "160px", margin: "0 auto" }}>
                  {/* This would be a chart in a real implementation */}
                  <div 
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: `conic-gradient(#1cc88a ${summary.totalIncome > 0 ? (summary.netAmount / summary.totalIncome) * 100 : 0}%, #e74a3b 0%)`
                    }}
                  ></div>
                  <div 
                    style={{
                      position: "absolute",
                      top: "20%",
                      left: "20%",
                      width: "60%",
                      height: "60%",
                      borderRadius: "50%",
                      background: "white",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "column"
                    }}
                  >
                    <div className="font-weight-bold text-gray-800" style={{ fontSize: "1.2rem" }}>
                      {summary.totalIncome > 0 
                        ? formatPercentage((summary.totalIncome - summary.totalExpenses) / summary.totalIncome * 100) 
                        : '0%'}
                    </div>
                    <div className="small text-gray-600">Savings Rate</div>
                  </div>
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-6 text-center">
                  <h4 className="small font-weight-bold">Income</h4>
                  <div className="h5 mb-0 font-weight-bold text-success">{formatCurrency(summary.totalIncome)}</div>
                </div>
                <div className="col-6 text-center">
                  <h4 className="small font-weight-bold">Expenses</h4>
                  <div className="h5 mb-0 font-weight-bold text-danger">{formatCurrency(summary.totalExpenses)}</div>
                </div>
              </div>

              <div className="text-center mt-4">
                <div className={`p-3 rounded ${summary.netAmount >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                  <h6 className="font-weight-bold mb-0">
                    {summary.netAmount >= 0 
                      ? `Net Positive: ${formatCurrency(summary.netAmount)}` 
                      : `Net Negative: ${formatCurrency(summary.netAmount)}`}
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">All Transactions</h6>
        </div>
        <div className="card-body">
          {isFiltering ? (
            <div className="text-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Filtering...</span>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-4">
              <div className="mb-3">
                <i className="fas fa-search fa-3x text-gray-300"></i>
              </div>
              <p className="text-gray-600 mb-0">No transactions found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    return (
                      <tr key={transaction.id} className={transaction.type === 'income' ? 'table-success' : 'table-danger'}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{getUserNameById(transaction.user_id)}</td>
                        <td>
                          <span className={`badge badge-${transaction.type === 'income' ? 'success' : 'danger'} p-2`}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </td>
                        <td className="font-weight-bold">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>{getCategoryNameById(transaction.category_id, transaction.type)}</td>
                        <td>{getAccountNameById(transaction.account_id)}</td>
                        <td>
                          <Link to={`/admin/transactions/${transaction.id}`} className="text-primary">
                            {transaction.notes}
                          </Link>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link to={`/admin/transactions/${transaction.id}`} className="btn btn-sm btn-outline-primary mr-1" title="View">
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link to={`/admin/transactions/${transaction.id}/edit`} className="btn btn-sm btn-outline-warning mr-1" title="Edit">
                              <i className="fas fa-edit"></i>
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(transaction.id.toString())} 
                              className="btn btn-sm btn-outline-danger" 
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-gray-600">Showing {filteredTransactions.length} of {transactions.length} transactions</span>
            </div>
            <div>
              <button className="btn btn-sm btn-outline-primary">
                <i className="fas fa-download fa-sm mr-1"></i> Export Filtered Results
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
                <p className="text-danger font-weight-bold">Note: This will also affect account balances and budgets.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  Delete Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions; 