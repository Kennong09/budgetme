import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import './featureDetails.css';
import { useNavigate } from 'react-router-dom';

const SmartBudgetingDetails: React.FC = () => {
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
        <title>Smart Budgeting | BudgetMe</title>
        <meta name="description" content="Learn about BudgetMe's comprehensive budgeting tools" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero budgeting-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="fas fa-chart-pie"></i>
              <span>Smart Budgeting</span>
            </div>
            <h1>Manage Your Money with Precision</h1>
            <p>Create customizable budgets for different categories with flexible time periods and detailed tracking</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-calculator"></i>
              </div>
              <div className="overview-text">
                <h3>Flexible Budget Periods</h3>
                <p>Create monthly, quarterly, or yearly budgets to match your financial planning needs</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="overview-text">
                <h3>Visual Progress Tracking</h3>
                <p>Monitor your spending with interactive charts and progress indicators</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-bell"></i>
              </div>
              <div className="overview-text">
                <h3>Category-Based Budgeting</h3>
                <p>Organize your budgets by expense categories for better financial management</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Comprehensive Budget Management</h2>
            <p>
              BudgetMe's budgeting system gives you complete control over your financial planning. 
              Create detailed budgets for specific expense categories, set target amounts, and track 
              your progress throughout the budget period. Our intuitive interface makes it easy to 
              visualize your spending and stay on track with your financial goals.
            </p>
            <div className="feature-image">
              <img src="/images/budget.png" alt="Budget Management Dashboard" />
              <div className="image-caption">BudgetMe's intuitive budgeting interface</div>
            </div>
            <p>
              Whether you're saving for a specific goal, trying to reduce spending in certain categories, 
              or simply want better visibility into your finances, our budgeting tools provide the 
              flexibility and insights you need. Monitor your budget utilization with color-coded progress 
              indicators that instantly show if you're on track, approaching your limit, or over budget.
            </p>
          </div>

          <div className="feature-section">
            <h2>Key Features of Our Budgeting System</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-plus"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Flexible Budget Periods</h3>
                  <p>
                    Create budgets that match your financial rhythm—weekly, monthly, quarterly, or yearly periods. 
                    This flexibility accommodates different income schedules and spending patterns, allowing you 
                    to plan according to your unique financial situation.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-edit"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Real-time Progress Tracking</h3>
                  <p>
                    Monitor your spending against your budget with visual progress bars and percentage indicators. 
                    Color-coded status alerts instantly show if you're under budget (green), approaching your limit (yellow), 
                    or over budget (red), helping you make informed spending decisions.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-trash"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Interactive Visualizations</h3>
                  <p>
                    Understand your budget allocation and spending patterns through interactive charts and graphs. 
                    Compare budget vs. actual spending across categories, visualize budget distribution, and identify 
                    trends to optimize your financial planning.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Transaction Integration</h3>
                  <p>
                    View all transactions related to a specific budget category in one place. See exactly where your 
                    money is going, identify unexpected expenses, and understand how individual purchases impact your 
                    overall budget performance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Detailed Budget Analysis</h2>
            <p>
              BudgetMe provides comprehensive analytics for each of your budgets. View detailed breakdowns 
              of your spending within categories, track budget utilization over time, and compare performance 
              across different budget periods. Our powerful visualization tools make it easy to understand 
              your financial patterns at a glance.
            </p>
            <div className="feature-image">
              <img src="/images/budget-d.png" alt="Budget Analysis Dashboard" />
              <div className="image-caption">Gain insights with detailed budget analytics</div>
            </div>
            <p>
              Each budget includes a complete transaction history, showing every expense that contributes 
              to your category total. You can see what percentage of your budget each transaction represents, 
              helping you identify major expenses and understand their impact on your overall financial plan.
            </p>
          </div>

          <div className="feature-section">
            <h2>Budget Health Indicators</h2>
            <p>
              Stay informed about your budget status with our intuitive health indicators. BudgetMe 
              automatically categorizes your budgets as "On Track," "Caution," or "Attention" based on 
              your spending patterns and remaining budget amounts.
            </p>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="fas fa-check-circle"></i>
                <h3>On Track</h3>
                <p>Less than 75% of your budget has been used, indicating healthy spending</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Caution</h3>
                <p>Between 75-90% of your budget has been used, suggesting closer monitoring</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-times-circle"></i>
                <h3>Attention</h3>
                <p>Over 90% of your budget has been used, indicating potential overspending</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-chart-bar"></i>
                <h3>Overall Health</h3>
                <p>Composite score showing your overall budget management effectiveness</p>
              </div>
            </div>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Take Control of Your Finances?</h2>
            <p>
              Join thousands of users who are using BudgetMe to create, track, and optimize their budgets. 
              Our comprehensive tools make it easier than ever to understand your spending patterns and 
              make informed financial decisions that align with your goals.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start Budgeting Now</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>How do I create a new budget?</h3>
                <p>
                  Creating a budget is simple. Navigate to the Budgets section, click "Create Budget," 
                  then select a category, enter your budget amount, choose a time period (monthly, quarterly, 
                  or yearly), and select a start date. Review your settings and confirm to create your budget.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I have different budgets for different time periods?</h3>
                <p>
                  Yes! You can create multiple budgets with different time periods. For example, you can have 
                  monthly budgets for regular expenses like groceries, quarterly budgets for utilities, and 
                  yearly budgets for larger expenses like insurance or subscriptions.
                </p>
              </div>
              <div className="faq-item">
                <h3>How does BudgetMe track my spending against budgets?</h3>
                <p>
                  BudgetMe automatically matches your transactions to the appropriate budget category. When you 
                  record an expense, the system updates your budget progress in real-time, showing you how much 
                  you've spent and how much remains in your budget for that period.
                </p>
              </div>
              <div className="faq-item">
                <h3>What happens if I go over budget?</h3>
                <p>
                  If you exceed your budget, BudgetMe will highlight the overage with a red indicator. You'll 
                  be able to see exactly how much you've overspent, and the system will continue to track 
                  additional expenses against that budget. This helps you understand your spending patterns 
                  and adjust future budgets accordingly.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-sidebar">
          <div className="sidebar-cta">
            <h3>Create Your First Budget</h3>
            <p>Get started with personalized budget tracking.</p>
            <a href="/signup" className="btn-primary btn-block">Sign Up Free</a>
          </div>
          
          <div className="sidebar-widget">
            <h3>Features</h3>
            <ul className="sidebar-list">
              <li>
                <i className="fas fa-calculator"></i>
                <span>Smart Budget Creation</span>
              </li>
              <li>
                <i className="fas fa-chart-bar"></i>
                <span>Real-Time Progress Tracking</span>
              </li>
              <li>
                <i className="fas fa-bell"></i>
                <span>Overspending Alerts</span>
              </li>
            </ul>
          </div>

          
          <div className="sidebar-widget">
            <h3>Related Features</h3>
            <ul className="related-features">
              <li>
                <a href="/features/expense-tracking">
                  <i className="fas fa-wallet"></i>
                  <span>Expense Tracking</span>
                </a>
              </li>
              <li>
                <a href="/features/financial-goals">
                  <i className="fas fa-flag"></i>
                  <span>Financial Goals</span>
                </a>
              </li>
              <li>
                <a href="/features/financial-reports">
                  <i className="fas fa-file-alt"></i>
                  <span>Financial Reports</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-testimonial">
            <div className="testimonial-content">
              <i className="fas fa-quote-left"></i>
              <p>"BudgetMe's budgeting tools helped me identify where my money was going and take control of my spending. I've saved over $300 per month!"</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/marcus.png" alt="Marcus Chen" />
              <div>
                <h4>Marcus Chen</h4>
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

export default SmartBudgetingDetails; 