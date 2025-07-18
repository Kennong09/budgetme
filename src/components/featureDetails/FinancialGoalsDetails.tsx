import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import { useNavigate } from 'react-router-dom';

const FinancialGoalsDetails: React.FC = () => {
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
        <title>Financial Goals | BudgetMe</title>
        <meta name="description" content="Track and achieve your financial goals with BudgetMe's comprehensive goal tracking features" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero goals-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="bx bxs-flag-alt"></i>
              <span>Financial Goals</span>
            </div>
            <h1>Set, Track, and Achieve Financial Goals</h1>
            <p>Create personalized goals with flexible timelines, monitor your progress, and stay on track for financial success</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-target-lock"></i>
              </div>
              <div className="overview-text">
                <h3>Personalized Goals</h3>
                <p>Create specific, measurable financial goals with realistic timelines</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-trending-up"></i>
              </div>
              <div className="overview-text">
                <h3>Visual Progress</h3>
                <p>Track your advancement with intuitive charts and real-time updates</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-group"></i>
              </div>
              <div className="overview-text">
                <h3>Family Sharing</h3>
                <p>Share goals with family members for collaborative saving</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Transform Your Financial Aspirations into Reality</h2>
            <p>
              Whether you're saving for a new home, planning a vacation, building an emergency fund, or preparing for retirement, 
              BudgetMe's goal tracking system helps you establish clear targets and maintain consistent progress. Our intuitive 
              tools guide you through setting SMART goals—Specific, Measurable, Achievable, Relevant, and Time-bound—giving you a 
              defined path to financial success.
            </p>
            <div className="feature-image">
              <img src="/images/goal.png" alt="Goal Setting Interface" />
              <div className="image-caption">BudgetMe's intuitive goal creation interface</div>
            </div>
            <p>
              Our goal-setting process walks you through important decisions like target amount, deadline, priority level, and 
              starting balance. You can also choose whether to keep your goal private or share it with family members for 
              collaborative saving. Once created, your goal becomes an integral part of your financial dashboard, keeping your 
              objectives front and center in your financial planning.
            </p>
          </div>

          <div className="feature-section">
            <h2>Key Features of Our Goal Tracking System</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-bullseye"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Customizable Goal Creation</h3>
                  <p>
                    Set up goals with target amounts, deadlines, priority levels, and starting balances. 
                    Personalize each goal with flexible parameters to match your unique financial situation 
                    and aspirations.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-bar-chart-alt-2"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Real-time Progress Tracking</h3>
                  <p>
                    Track your progress with intuitive visual indicators including progress bars, percentage 
                    completion metrics, and color-coded status indicators that update in real-time as you 
                    make contributions.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-calendar-check"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Monthly Saving Recommendations</h3>
                  <p>
                    Receive personalized recommendations for monthly contribution amounts needed to reach your 
                    goal by the target date. Our system automatically calculates this based on your current 
                    progress and remaining timeline.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-transfer"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Direct Goal Contributions</h3>
                  <p>
                    Make direct contributions to your goals from any of your accounts. Each contribution is 
                    tracked and recorded, allowing you to monitor your saving habits and maintain momentum 
                    toward your targets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Comprehensive Goal Dashboard</h2>
            <p>
              BudgetMe provides a powerful goal dashboard that gives you a complete view of your financial 
              objectives. See all your goals at a glance with filtering options by priority, status, and 
              progress. You can also sort your goals by name, target date, progress percentage, or amount.
            </p>
            <div className="feature-image">
              <img src="/images/goal-d.png" alt="Goal Dashboard View" />
              <div className="image-caption">Comprehensive goal dashboard with filtering and sorting options</div>
            </div>
            <p>
              The dashboard also includes summary metrics showing your total saved amount across all goals, 
              combined target amounts, and overall progress percentage. The color-coded "Goal Health" indicator 
              provides a quick assessment of your overall financial goal performance.
            </p>
          </div>

          <div className="feature-section">
            <h2>Collaborative Family Goals</h2>
            <p>
              Financial goals often involve the whole family. BudgetMe allows you to share goals with family 
              members, enabling collaborative saving toward common objectives like vacations, home improvements, 
              or education funds. Everyone can contribute to shared goals and track collective progress.
            </p>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="bx bx-share-alt"></i>
                <h3>Goal Sharing</h3>
                <p>Share specific goals with your family members</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-donate-heart"></i>
                <h3>Multiple Contributors</h3>
                <p>Allow any family member to contribute to shared goals</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-chart"></i>
                <h3>Contribution Tracking</h3>
                <p>See exactly how much each person has contributed</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-badge-check"></i>
                <h3>Shared Achievement</h3>
                <p>Celebrate reaching goals together as a family</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Advanced Goal Analytics</h2>
            <p>
              BudgetMe goes beyond basic progress tracking by providing detailed analytics that help you 
              understand your saving patterns and optimize your approach to reaching your financial goals.
              Our interactive charts and visualizations give you valuable insights into your progress.
            </p>
            <div className="feature-image">
              <img src="/images/goal-analytics.png" alt="Goal Analytics Dashboard" />
              <div className="image-caption">Interactive charts and detailed analytics for each goal</div>
            </div>
            <p>
              Each goal includes multiple visualization types:
            </p>
            <ul className="feature-list-bullets">
              <li>
                <strong>Progress Gauge:</strong> Visual indicator showing percentage completion with color-coded status
              </li>
              <li>
                <strong>Contribution History:</strong> Bar charts showing your contributions over time to identify patterns
              </li>
              <li>
                <strong>Timeline Projections:</strong> Line graphs forecasting your progress toward the target date
              </li>
              <li>
                <strong>Transaction Records:</strong> Detailed logs of all contributions with amounts and dates
              </li>
            </ul>
            <p>
              These analytics help you make data-driven decisions about adjusting contribution amounts, 
              timelines, or priorities to optimize your financial planning strategy.
            </p>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Turn Your Financial Dreams into Reality?</h2>
            <p>
              Join thousands of users who have achieved their financial goals with BudgetMe. From buying 
              first homes to paying off student loans to funding dream vacations, our goal tracking system 
              helps you get there faster.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start Setting Goals</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>How do I create a new financial goal?</h3>
                <p>
                  Creating a goal is simple. Navigate to the Goals section of your dashboard and click "Create Goal." 
                  Fill in details like your goal name, target amount, target date, and priority level. You can also 
                  specify your current progress if you've already saved some money toward this goal.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I share goals with my family members?</h3>
                <p>
                  Yes! If you're part of a family group in BudgetMe, you'll see a "Share with Family" option when 
                  creating or editing a goal. When enabled, the goal will appear in your family dashboard where all 
                  members can view and contribute to it.
                </p>
              </div>
              <div className="faq-item">
                <h3>How do I make contributions to my goals?</h3>
                <p>
                  From any goal's detail page, click the "Contribute" button. You'll be prompted to select which 
                  account to draw funds from and enter the contribution amount. Each contribution is recorded and 
                  will immediately update your progress toward the goal.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I edit my goal details after creation?</h3>
                <p>
                  Absolutely. Life changes, and so can your goals. You can modify any aspect of your goals, including 
                  target amounts, dates, priority levels, and even the goal name at any time. The system will 
                  automatically recalculate your progress and saving recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-sidebar">
          <div className="sidebar-cta">
            <h3>Start Tracking Your Goals</h3>
            <p>Create your first financial goal in minutes.</p>
            <a href="/signup" className="btn-primary btn-block">Sign Up Free</a>
          </div>
          
          <div className="sidebar-widget">
            <h3>Goal Types You Can Create</h3>
            <ul className="sidebar-list">
              <li>
                <i className="bx bxs-home"></i>
                <span>Home Down Payment</span>
              </li>
              <li>
                <i className="bx bxs-plane-take-off"></i>
                <span>Vacation Fund</span>
              </li>
              <li>
                <i className="bx bxs-graduation"></i>
                <span>Education Savings</span>
              </li>
              <li>
                <i className="bx bxs-car"></i>
                <span>Vehicle Purchase</span>
              </li>
              <li>
                <i className="bx bxs-shield-plus"></i>
                <span>Emergency Fund</span>
              </li>
              <li>
                <i className="bx bxs-credit-card"></i>
                <span>Debt Repayment</span>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-widget">
            <h3>Related Features</h3>
            <ul className="related-features">
              <li>
                <a href="/features/expense-tracking">
                  <i className="bx bxs-wallet-alt"></i>
                  <span>Transaction Management</span>
                </a>
              </li>
              <li>
                <a href="/features/smart-budgeting">
                  <i className="bx bxs-pie-chart-alt-2"></i>
                  <span>Smart Budgeting</span>
                </a>
              </li>
              <li>
                <a href="/features/family-sharing">
                  <i className="bx bxs-user-account"></i>
                  <span>Family Finance</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-testimonial">
            <div className="testimonial-content">
              <i className="bx bxs-quote-left"></i>
              <p>"BudgetMe's goal tracking helped me save for my house down payment. The monthly savings recommendations and visual progress tracking kept me motivated throughout the entire journey."</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/marcus.png" alt="Marcus Alexander" />
              <div>
                <h4>Marcus Alexander</h4>
                <p>Financial Analyst</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FinancialGoalsDetails; 