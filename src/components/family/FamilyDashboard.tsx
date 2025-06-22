import React, { useState, useEffect, FC, useRef } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import {
  family,
  familyMembers,
  users,
  getCurrentUserData,
  sortByDate,
  getTransactionsByDate,
  getTotalIncome,
  getTotalExpenses,
  getFamilyBudgetPerformance,
  getGoalContributionsByMember,
} from "../../data/mockData";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "../../utils/highchartsInit";
import ErrorBoundary from "../ErrorBoundary";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import shared dashboard styles
import "../dashboard/dashboard.css";

// --- INTERFACES ---

interface User {
  id: number;
  username: string;
  email: string;
  last_login: string;
  profilePicture?: string;
}

interface Family {
  id: number;
  family_name: string;
  created_at: string;
  owner_user_id: number;
}

interface FamilyMember {
  id: number;
  family_id: number;
  member_user_id: number;
  role: "admin" | "viewer";
  join_date: string;
  user?: User;
}

interface Transaction {
  id: number;
  user_id: number;
  date: string;
  amount: number;
  notes: string;
  type: "income" | "expense";
  category_id?: number;
  account_id: number;
}

interface Goal {
  id: number;
  user_id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: "high" | "medium" | "low";
  category: string;
  description?: string;
  contributors?: Contributor[];
}

interface Contributor {
  userId: number;
  username: string;
  profilePicture: string;
  amount: number;
}

interface FamilySummaryData {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

interface RecentActivity {
  id: string;
  type: "join" | "goal" | "transaction";
  description: string;
  date: string;
  icon: string;
  color: string;
  user?: User;
}

// Chart interfaces
interface MonthlyData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

interface BudgetPerformanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

interface CategoryData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

type TabType = "overview" | "members" | "activity" | "goals";

// --- COMPONENT ---

const FamilyDashboard: FC = () => {
  const [familyData, setFamilyData] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [summaryData, setSummaryData] = useState<FamilySummaryData | null>(null);
  const [budgetPerformanceChartData, setBudgetPerformanceChartData] = useState<any | null>(null);
  const [categoryChartData, setCategoryChartData] = useState<any | null>(null);
  const [sharedGoals, setSharedGoals] = useState<Goal[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const budgetPerformanceChartRef = useRef<any>(null);
  const categoryChartRef = useRef<any>(null);

  // --- DATA FETCHING & PROCESSING ---
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Get Family and Members
      const currentFamily = family[0] as unknown as Family;
      setFamilyData(currentFamily);

      const familyMemberDetails = familyMembers
        .filter((fm) => String(fm.family_id) === String(currentFamily.id))
        .map((fm) => {
          const user = users.find(
            (u) => String(u.id) === String(fm.member_user_id)
          ) as unknown as User;
          return { ...fm, id: fm.member_user_id, user, role: fm.role as "admin" | "viewer" } as FamilyMember;
        });
      setMembers(familyMemberDetails);

      // 2. Aggregate data from all members
      let allTransactions: Transaction[] = [];
      let allGoals: Goal[] = [];
      familyMemberDetails.forEach((member) => {
        if (member.user?.id) {
          const memberData = getCurrentUserData(member.user.id);
          if (memberData.transactions) allTransactions.push(...memberData.transactions as unknown as Transaction[]);
          if (memberData.goals) {
            const goalsWithDetails = memberData.goals.map(goal => {
                const contributors = getGoalContributionsByMember(goal.id);
                return {
                    ...goal,
                    category: "General", // Add default category
                    priority: goal.priority as "high" | "medium" | "low",
                    contributors: contributors as Contributor[],
                };
            });
            allGoals.push(...goalsWithDetails as unknown as Goal[]);
          }
        }
      });
      
      // Remove duplicate goals if members share them
      const uniqueGoals = Array.from(new Map(allGoals.map(goal => [goal.id, goal])).values());
      setSharedGoals(uniqueGoals);

      // 3. Calculate financial summaries
      const sortedTransactions = sortByDate(allTransactions);
      const latestTransaction = sortedTransactions[0];
      const currentDate = latestTransaction ? new Date(latestTransaction.date) : new Date();

      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      let totalIncome = 0;
      let totalExpenses = 0;
      familyMemberDetails.forEach(member => {
        if (member.user?.id) {
            totalIncome += getTotalIncome(member.user.id, firstDay, lastDay);
            totalExpenses += getTotalExpenses(member.user.id, firstDay, lastDay);
        }
      });
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
      
      setSummaryData({
        income: totalIncome,
        expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
        savingsRate,
      });

      // 4. Prepare chart data
      const budgetPerformanceData = getFamilyBudgetPerformance(currentFamily.id) as BudgetPerformanceData;
      setBudgetPerformanceChartData(formatBudgetPerformanceForHighcharts(budgetPerformanceData));
      
      const categoryData = calculateFamilyCategoryData(allTransactions, firstDay, lastDay);
      setCategoryChartData(formatCategoryDataForHighcharts(categoryData));

      // 5. Mock recent activity
      setRecentActivity([
        { id: "1", type: "join", user: familyMemberDetails[1]?.user, description: "joined the family.", date: "2025-05-20T10:00:00Z", icon: "fa-user-plus", color: "primary" },
        { id: "2", type: "goal", user: familyMemberDetails[0]?.user, description: "created a new goal 'Summer Vacation'.", date: "2025-05-19T15:30:00Z", icon: "fa-flag-checkered", color: "info" },
        { id: "3", type: "transaction", user: familyMemberDetails[0]?.user, description: "made a large purchase at 'Best Buy'.", date: "2025-05-18T11:45:00Z", icon: "fa-credit-card", color: "warning" },
        { id: "4", type: "goal", user: familyMemberDetails[1]?.user, description: "made a contribution to 'New Car'.", date: "2025-05-17T09:00:00Z", icon: "fa-piggy-bank", color: "success" },
      ]);

      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // --- HELPER FUNCTIONS ---

  const getCategoryName = (categoryId: number): string => {
    const categoryNames: { [key: number]: string } = {
      1: "Housing", 2: "Utilities", 3: "Groceries", 4: "Transportation", 5: "Dining Out",
      6: "Entertainment", 7: "Healthcare", 8: "Education", 9: "Shopping",
      10: "Personal Care", 11: "Travel", 12: "Subscriptions",
    };
    return categoryNames[categoryId] || `Category ${categoryId}`;
  };
  
  const calculateFamilyMonthlyData = (transactions: Transaction[], currentDate: Date): MonthlyData => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      labels.push(months[date.getMonth()]);

      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const monthlyIncome = monthTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const monthlyExpenses = monthTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      incomeData.push(monthlyIncome);
      expenseData.push(monthlyExpenses);
    }

    return {
      labels,
      datasets: [
        { label: "Income", data: incomeData },
        { label: "Expenses", data: expenseData },
      ],
    };
  };

  const calculateFamilyCategoryData = (transactions: Transaction[], startDate: string, endDate: string): CategoryData => {
    const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= new Date(startDate) && txDate <= new Date(endDate);
    });

    const expenseTransactions = monthTransactions.filter(tx => tx.type === 'expense');
    const categoryMap = new Map<number, number>();
    const categoryNames = new Map<number, string>();

    expenseTransactions.forEach(tx => {
      if (tx.category_id) {
        const currentTotal = categoryMap.get(tx.category_id) || 0;
        categoryMap.set(tx.category_id, currentTotal + tx.amount);
        categoryNames.set(tx.category_id, getCategoryName(tx.category_id));
      }
    });

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
      labels,
      datasets: [{ data, backgroundColor }],
    };
  };

  const formatBudgetPerformanceForHighcharts = (data: BudgetPerformanceData | null): any | null => {
    if (!data) return null;
    return {
      chart: { type: "column", style: { fontFamily: 'Nunito, sans-serif' }, backgroundColor: "transparent", height: 350 },
      title: { text: null },
      xAxis: { categories: data.labels, crosshair: true, labels: { style: { color: "#858796" } } },
      yAxis: { min: 0, title: { text: null }, gridLineColor: "#eaecf4", gridLineDashStyle: "dash", labels: { formatter: function () { return formatCurrency((this as any).value); }, style: { color: "#858796" } } },
      tooltip: { shared: true, useHTML: true, headerFormat: '<span style="font-size:10px">{point.key}</span><table>', pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td><td style="padding:0"><b>{point.y:,.2f}</b></td></tr>', footerFormat: '</table>', valuePrefix: "$" },
      plotOptions: { column: { pointPadding: 0.2, borderWidth: 0, borderRadius: 5, grouping: true } },
      credits: { enabled: false },
      series: [
        { name: "Total Budgeted", data: data.datasets[0].data, color: "#4e73df", type: "column" },
        { name: "Total Spent", data: data.datasets[1].data, color: "#e74a3b", type: "column" },
      ],
    };
  };
  
  const formatCategoryDataForHighcharts = (data: CategoryData | null): any | null => {
    if (!data) return null;
    const pieData = data.labels.map((label, index) => ({
      name: label,
      y: data.datasets[0].data[index],
      sliced: index === 0,
      selected: index === 0,
    }));
    return {
      chart: { type: "pie", backgroundColor: "transparent", style: { fontFamily: 'Nunito, sans-serif' }, height: 350 },
      title: { text: null },
      tooltip: { pointFormat: '<b>{point.name}</b>: {point.percentage:.1f}%<br>${point.y:,.2f}' },
      plotOptions: { pie: { allowPointSelect: true, cursor: "pointer", dataLabels: { enabled: true, format: "<b>{point.name}</b>: {point.percentage:.1f}%", style: { fontWeight: 'normal' }, connectorWidth: 0, distance: 30 }, showInLegend: false, size: '85%' } },
      credits: { enabled: false },
      series: [{ name: "Spending", colorByPoint: true, data: pieData }],
    };
  };

  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ top: rect.bottom + window.scrollY, left: rect.left + (rect.width / 2) + window.scrollX });
      }
    }
  };

  const getMemberRoleBadge = (role: "admin" | "viewer") => {
    return role === "admin"
      ? <span className="badge badge-primary">Admin</span>
      : <span className="badge badge-secondary">Viewer</span>;
  };

  // --- RENDER LOGIC ---

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading family dashboard...</p>
        </div>
      </div>
    );
  }

  // Tooltip contents
  const tooltipContent = {
    'family-income': {
      title: 'Family Income',
      description: 'Family Income shows the combined income of all family members for the current month. This includes salaries, freelance work, investments, and other income sources.'
    },
    'family-expenses': {
      title: 'Family Expenses',
      description: 'Family Expenses displays the total amount spent by all family members during the current month. This includes all expenses across different categories.'
    },
    'family-balance': {
      title: 'Family Balance',
      description: 'Family Balance is the difference between total income and total expenses. A positive balance indicates the family is spending less than it earns.'
    },
    'family-savings-rate': {
      title: 'Family Savings Rate',
      description: 'Family Savings Rate shows what percentage of income the family saves. It\'s calculated by dividing the difference between income and expenses by total income.'
    },
    'budget-performance': {
      title: 'Family Budget Performance',
      description: 'The Family Budget Performance chart compares budgeted amounts versus actual spending across different categories for all family members combined.'
    },
    'spending-category': {
      title: 'Spending by Category',
      description: 'The Spending by Category chart shows how the family\'s expenses are distributed across different categories during the current period.'
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800 animate__animated animate__fadeIn">
          {familyData?.family_name}
        </h1>
        <Link to="/family/invite" className="d-none d-sm-inline-block btn btn-primary shadow-sm animate__animated animate__fadeIn">
          <i className="fas fa-user-plus fa-sm text-white-50 mr-2"></i>Invite Member
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Family Income
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-income', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData && formatCurrency(summaryData.income)}
                  </div>
                </div>
                <div className="col-auto"><i className="fas fa-calendar fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Family Expenses
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-expenses', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData && formatCurrency(summaryData.expenses)}
                  </div>
                </div>
                <div className="col-auto"><i className="fas fa-solid fa-peso-signn fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Family Balance
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-balance', e)}
                    ></i>
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {summaryData && formatCurrency(summaryData.balance)}
                  </div>
                </div>
                <div className="col-auto"><i className="fas fa-clipboard-list fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Family Savings Rate
                    <i 
                      className="fas fa-info-circle ml-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('family-savings-rate', e)}
                    ></i>
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto"><div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">{summaryData && formatPercentage(summaryData.savingsRate)}</div></div>
                    <div className="col"><div className="progress progress-sm mr-2"><div className="progress-bar bg-success" role="progressbar" style={{ width: `${summaryData ? summaryData.savingsRate : 0}%` }}></div></div></div>
                  </div>
                </div>
                <div className="col-auto"><i className="fas fa-percentage fa-2x text-gray-300"></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {activeTip && tooltipPosition && (
        <div 
          className="tip-box light" 
          style={{ 
            position: "absolute",
            top: `${tooltipPosition.top}px`, 
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "12px 15px",
            borderRadius: "8px",
            boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
            maxWidth: "300px",
            border: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          {activeTip && (
            <>
              <div className="font-weight-bold mb-2">{tooltipContent[activeTip as keyof typeof tooltipContent].title}</div>
              <p className="mb-0">{tooltipContent[activeTip as keyof typeof tooltipContent].description}</p>
            </>
          )}
        </div>
      )}
      
      {/* Tabs */}
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "overview" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setActiveTab("overview"); }}>
                <i className="fas fa-chart-pie mr-1"></i> Overview
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "goals" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setActiveTab("goals"); }}>
                <i className="fas fa-flag-checkered mr-1"></i> Shared Goals
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "members" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setActiveTab("members"); }}>
                <i className="fas fa-users mr-1"></i> Members ({members.length})
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeTab === "activity" ? "active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setActiveTab("activity"); }}>
                <i className="fas fa-history mr-1"></i> Recent Activity
              </a>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === "overview" && (
            <div className="row animate__animated animate__fadeIn">
              {/* Family Budget Performance Chart */}
              <div className="col-xl-8 col-lg-7">
                <div className="card shadow mb-4">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Family Budget Performance
                      <i 
                        className="fas fa-info-circle ml-1 text-gray-400"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => toggleTip('budget-performance', e)}
                      ></i>
                    </h6>
                  </div>
                  <div className="card-body">
                    {budgetPerformanceChartData ? (
                      <ErrorBoundary>
                        <HighchartsReact highcharts={Highcharts} options={budgetPerformanceChartData} ref={budgetPerformanceChartRef} />
                      </ErrorBoundary>
                    ) : ( <div className="text-center py-5">No data available</div> )}
                  </div>
                </div>
              </div>
              {/* Category Pie Chart */}
              <div className="col-xl-4 col-lg-5">
                <div className="card shadow mb-4">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">
                      Spending by Category
                      <i 
                        className="fas fa-info-circle ml-1 text-gray-400"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => toggleTip('spending-category', e)}
                      ></i>
                    </h6>
                  </div>
                  <div className="card-body">
                    {categoryChartData ? (
                        <ErrorBoundary>
                        <HighchartsReact highcharts={Highcharts} options={categoryChartData} ref={categoryChartRef} />
                      </ErrorBoundary>
                    ) : ( <div className="text-center py-5">No data available</div> )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "goals" && (
            <div className="animate__animated animate__fadeIn">
              {sharedGoals.length > 0 ? (
                <div className="row">
                  {sharedGoals.map((goal) => {
                    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
                    const priorityBadgeClass = goal.priority === "high" ? "badge-danger" : goal.priority === "medium" ? "badge-warning" : "badge-info";
                    const contributorColors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b"];

                    return (
                      <div key={goal.id} className="col-lg-6 mb-4">
                        <div className="card shadow-sm h-100">
                          <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                            <h6 className="m-0 font-weight-bold text-primary">{goal.goal_name}</h6>
                             <span className={`badge ${priorityBadgeClass}`}>{goal.priority}</span>
                          </div>
                          <div className="card-body d-flex flex-column">
                            <div className="mb-2 d-flex justify-content-between">
                                <span className="font-weight-bold text-gray-800">{formatCurrency(goal.current_amount)}</span>
                                <span className="text-gray-600">of {formatCurrency(goal.target_amount)}</span>
                            </div>
                            <div className="progress mb-3" style={{height: '10px'}}>
                                {goal.contributors?.map((c, index) => (
                                    <div 
                                        key={c.userId}
                                        className="progress-bar" 
                                        role="progressbar" 
                                        style={{ width: `${(c.amount / goal.target_amount) * 100}%`, backgroundColor: contributorColors[index % contributorColors.length] }}
                                        data-toggle="tooltip"
                                        title={`${c.username}: ${formatCurrency(c.amount)}`}
                                    >
                                    </div>
                                ))}
                            </div>
                            <div className="d-flex align-items-center mb-3">
                                {goal.contributors?.map((c, index) => (
                                    <img 
                                        key={c.userId}
                                        className="img-profile rounded-circle"
                                        src={c.profilePicture}
                                        alt={c.username}
                                        width="30"
                                        height="30"
                                        style={{ marginLeft: index > 0 ? '-10px' : '0', border: '2px solid white' }}
                                        data-toggle="tooltip"
                                        title={`${c.username} contributed ${formatCurrency(c.amount)}`}
                                    />
                                ))}
                                <span className="ml-2 text-xs text-gray-500">{goal.contributors?.length} contributors</span>
                            </div>

                            <div className="mt-auto">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-gray-600">
                                        <i className="fas fa-calendar-alt mr-1"></i>
                                        {getRemainingDays(goal.target_date)} days left
                                    </small>
                                    <div className="d-flex">
                                        <Link to={`/goals/${goal.id}/contribute`} className="btn btn-success btn-circle btn-sm mr-2" title="Contribute">
                                            <i className="fas fa-plus"></i>
                                        </Link>
                                        <Link to={`/goals/${goal.id}`} className="btn btn-info btn-circle btn-sm" title="View Details">
                                            <i className="fas fa-eye"></i>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-flag-checkered fa-3x text-gray-300 mb-3"></i>
                  <h5 className="text-gray-500">No shared goals found.</h5>
                  <p>Create a goal and share it with family members to track progress together.</p>
                  <button className="btn btn-primary mt-3"><i className="fas fa-plus mr-1"></i> Create Shared Goal</button>
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="table-responsive animate__animated animate__fadeIn">
              <table className="table table-bordered" width="100%" cellSpacing="0">
                <thead><tr><th>User</th><th>Role</th><th>Join Date</th><th>Last Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.member_user_id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img className="img-profile rounded-circle mr-3" src={member.user?.profilePicture || `../images/placeholder.png`} alt={member.user?.username} width="40" height="40" />
                          <div>
                            <div className="font-weight-bold">{member.user?.username}</div>
                            <div className="small text-gray-600">{member.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getMemberRoleBadge(member.role)}</td>
                      <td>{formatDate(member.join_date)}</td>
                      <td>{member.user?.last_login ? formatDate(member.user.last_login) : "Never"}</td>
                      <td>
                        <button className="btn btn-danger btn-circle btn-sm"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="animate__animated animate__fadeIn">
              {recentActivity.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {recentActivity.map(activity => (
                    <li key={activity.id} className="list-group-item d-flex align-items-center">
                      <div className={`mr-3 text-white rounded-circle d-flex align-items-center justify-content-center bg-${activity.color}`} style={{width: '40px', height: '40px'}}>
                          <i className={`fas ${activity.icon}`}></i>
                      </div>
                      <div>
                        <strong>{activity.user?.username}</strong> {activity.description}
                        <div className="small text-gray-500">{formatDate(activity.date)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-history fa-3x text-gray-300 mb-3"></i>
                  <h5 className="text-gray-500">No recent activity.</h5>
                  <p>Family activity feed will be shown here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default FamilyDashboard;
