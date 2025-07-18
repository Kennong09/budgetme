import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import { useNavigate } from 'react-router-dom';

const ExpenseTrackingDetails: React.FC = () => {
  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();

  // Handle login and register buttons
  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/signup');
  };

  return (
    <div className="feature-details-page">
      <Helmet>
        <title>Transaction Management | BudgetMe</title>
        <meta name="description" content="Learn about BudgetMe's powerful income and expense tracking features" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero expense-tracking-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="bx bxs-wallet-alt"></i>
              <span>Transaction Management</span>
            </div>
            <h1>Track Income and Expenses with Precision</h1>
            <p>Gain complete control over your finances with our powerful transaction tracking system</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-chart"></i>
              </div>
              <div className="overview-text">
                <h3>Complete Financial Visibility</h3>
                <p>Track both income and expenses with comprehensive spending reports and analytics</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-category-alt"></i>
              </div>
              <div className="overview-text">
                <h3>Smart Categorization</h3>
                <p>Organize transactions with custom income and expense categories for better financial analysis</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-time"></i>
              </div>
              <div className="overview-text">
                <h3>Goal Integration</h3>
                <p>Link transactions to your financial goals and track progress toward achievement</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Comprehensive Transaction Management</h2>
            <p>
              BudgetMe's transaction tracking system gives you unprecedented control over your finances. 
              Our intuitive interface makes it easy to log both income and expenses, categorize transactions, 
              and analyze your spending patterns. Whether you're a meticulous planner or just getting started with 
              budgeting, our tools adapt to your financial management style.
            </p>
            <div className="feature-image">
              <img src="/images/transaction.png" alt="Expense Tracking Dashboard" />
              <div className="image-caption">BudgetMe's comprehensive transaction dashboard</div>
            </div>
            <p>
              With BudgetMe, you can track transactions across multiple accounts, linking each to specific 
              categories and even financial goals. The system provides detailed views of each transaction, 
              including impact analysis that shows how individual transactions compare to your averages 
              within the same category.
            </p>
          </div>

          <div className="feature-section">
            <h2>Detailed Transaction Management</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-plus-circle"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Quick and Easy Entry</h3>
                  <p>
                    Add new transactions with our intuitive form interface. Toggle between income and expense types, 
                    select from your accounts and categories, and optionally link to financial goals.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-edit"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Full Editing Capabilities</h3>
                  <p>
                    Edit any transaction details at any time. The system automatically updates account balances 
                    and goal progress when changes are made to amount, type, or linked goals.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-search-alt"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Detailed Transaction Views</h3>
                  <p>
                    See complete information about each transaction, including category impact analysis and 
                    related transactions in the same category for context and comparison.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-trash"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Safe Transaction Deletion</h3>
                  <p>
                    Remove transactions when needed with our safe deletion system that automatically adjusts 
                    account balances and goal progress to maintain data integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Financial Summary at a Glance</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-trending-up"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Income & Expense Analysis</h3>
                  <p>
                    See your total income, expenses, and net cashflow for any selected period. 
                    Understand your spending-to-income ratio with color-coded indicators for financial health.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-pie-chart"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Category Distribution</h3>
                  <p>
                    Interactive pie charts show exactly where your money goes, highlighting your largest 
                    expense categories to help you identify areas for potential savings.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-calendar"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Time-Based Analysis</h3>
                  <p>
                    View your finances by day, month, or year with customizable date ranges. Track your 
                    progress over time with intuitive line charts comparing income and expenses.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-pulse"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Financial Health Indicators</h3>
                  <p>
                    Get automatic health assessments of your financial situation based on spending habits, 
                    savings rate, and income-to-expense ratio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Key Features of Our Transaction Management</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-filter-alt"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Advanced Filtering and Sorting</h3>
                  <p>
                    Filter transactions by type (income/expense), category, account, date range, and amount. 
                    Sort by date, amount, or category to quickly find the information you need.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-line-chart"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Visual Analytics</h3>
                  <p>
                    Interactive charts display your spending patterns and category distribution, helping you 
                    identify trends and make better financial decisions.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-tag"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Multi-Account Management</h3>
                  <p>
                    Track transactions across all your accounts in one place, with automatic balance updates 
                    when you add income or expenses. Monitor your financial position across your entire portfolio.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-flag"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Goal Contribution Tracking</h3>
                  <p>
                    Link transactions directly to your financial goals, automatically tracking progress and updating 
                    goal status as you add relevant transactions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Visual Analytics for Better Understanding</h2>
            <p>
              Understanding your spending patterns is crucial for making informed financial decisions. 
              BudgetMe provides comprehensive visual analytics that help you see trends, identify areas 
              for improvement, and celebrate your progress.
            </p>
            <div className="feature-image">
              <img src="/images/transaction-d.png" alt="Expense Analytics" />
              <div className="image-caption">Intuitive charts and graphs show your spending patterns</div>
            </div>
            <p>
              Our transaction impact analysis shows how each transaction compares to your average and highest 
              spending in the same category. Category breakdown charts visualize proportional spending, 
              helping you identify where your money goes and optimize your budget accordingly.
            </p>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Take Control of Your Finances?</h2>
            <p>
              Join thousands of users who have transformed their financial lives with BudgetMe's 
              transaction tracking tools. Sign up today and start your journey toward financial clarity.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start Tracking Now</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>Can I track both income and expenses?</h3>
                <p>
                  Yes! BudgetMe allows you to track both income and expenses, with different categorization options for each. 
                  You can toggle between income and expense when adding new transactions.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I link transactions to my financial goals?</h3>
                <p>
                  Absolutely! When adding or editing a transaction, you can associate it with any of your active financial goals. 
                  The transaction will automatically contribute to the progress of that goal.
                </p>
              </div>
              <div className="faq-item">
                <h3>Is my financial data secure?</h3>
                <p>
                  Yes, we use bank-level 256-bit encryption for all data. Your privacy and security are our top priorities.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I see detailed analytics of my spending?</h3>
                <p>
                  Yes, BudgetMe provides comprehensive analytics including category breakdowns, transaction impact analysis, 
                  and comparison to your average spending habits within categories.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-sidebar">
          <div className="sidebar-cta">
            <h3>Start Your Free Trial</h3>
            <p>No credit card required. Cancel anytime.</p>
            <a href="/signup" className="btn-primary btn-block">Sign Up Free</a>
          </div>
          
          <div className="sidebar-widget">
            <h3>Related Features</h3>
            <ul className="related-features">
              <li>
                <a href="/features/smart-budgeting">
                  <i className="bx bxs-pie-chart-alt-2"></i>
                  <span>Smart Budgeting</span>
                </a>
              </li>
              <li>
                <a href="/features/financial-goals">
                  <i className="bx bxs-flag-alt"></i>
                  <span>Financial Goals</span>
                </a>
              </li>
              <li>
                <a href="/features/financial-reports">
                  <i className="bx bxs-report"></i>
                  <span>Financial Reports</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-testimonial">
            <div className="testimonial-content">
              <i className="bx bxs-quote-left"></i>
              <p>"BudgetMe's expense tracking changed how I manage money. I finally know where every dollar goes and can link my spending to my financial goals!"</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/mariz.png" alt="Mariz Legaspi Diaz" />
              <div>
                <h4>Mariz Legaspi Diaz</h4>
                <p>BudgetMe User</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExpenseTrackingDetails;