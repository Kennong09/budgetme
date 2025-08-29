import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import './featureDetails.css';
import { useNavigate } from 'react-router-dom';

const FinancialReportsDetails: React.FC = () => {
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
        <title>Financial Reports | BudgetMe</title>
        <meta name="description" content="Learn about BudgetMe's powerful financial reporting and analytics tools" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero reports-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="fas fa-file-alt"></i>
              <span>Financial Reports</span>
            </div>
            <h1>Transform Financial Data Into Actionable Insights</h1>
            <p>Discover patterns, track progress, and make informed financial decisions with our comprehensive reporting tools</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon reports-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="overview-text">
                <h3>Interactive Visual Reports</h3>
                <p>Dynamic charts and graphs with filtering, zooming, and detailed tooltips for comprehensive analysis</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon reports-icon">
                <i className="fas fa-download"></i>
              </div>
              <div className="overview-text">
                <h3>Multi-Format Export Options</h3>
                <p>Save and share reports in PDF, CSV, and Excel formats for external use and collaboration</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon reports-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="overview-text">
                <h3>Flexible Timeframe Analysis</h3>
                <p>Analyze your finances by day, month, quarter, or year for different perspectives</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Comprehensive Report Types For Every Need</h2>
            <p>
              Understanding your financial situation requires more than just tracking numbers. BudgetMe's 
              reporting tools offer multiple report types that give you a complete picture of your finances from
              different perspectives - helping you see patterns, identify opportunities, and make informed decisions.
            </p>
            <div className="feature-image">
              <img src="/images/report.png" alt="Financial Reports Dashboard" />
              <div className="image-caption">BudgetMe's interactive financial reporting dashboard</div>
            </div>
            <p>
              Choose from six different report types to analyze exactly what you need: Spending breakdowns, Income vs. Expenses,
              Savings Rates, Financial Trends, Goal Allocations, and even AI-powered Financial Predictions. Each report can be
              customized with different timeframes and visualization options to match your specific analysis needs.
            </p>
          </div>

          <div className="feature-section">
            <h2>Key Features of Our Reporting System</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-chart-pie"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Spending Analysis</h3>
                  <p>
                    Visualize your spending patterns with intuitive pie and column charts. Identify your top spending
                    categories, track proportional spending allocation, and discover opportunities for better budget management.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-trending-up"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Income vs. Expenses Tracking</h3>
                  <p>
                    Compare your income and expenses over time with interactive bar, line, or area charts. Calculate savings rates,
                    visualize cash flow trends, and identify months with budget surpluses or deficits.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Financial Trends Analysis</h3>
                  <p>
                    Analyze changes in spending patterns over time. Highlight growing or declining expense categories,
                    detect seasonal patterns, and identify opportunities for cost reduction.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-bullseye"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Goal Progress Reporting</h3>
                  <p>
                    Track progress toward financial goals with visual indicators. Analyze goal contribution patterns,
                    understand the relationship between budgets and goals, and estimate completion dates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Interactive Visualization Tools</h2>
            <p>
              Our reporting module uses advanced Highcharts integration to provide beautiful, interactive charts
              that bring your financial data to life. Choose from multiple chart types—pie charts for spending breakdowns, 
              column charts for comparisons, line charts for trends, and more.
            </p>
            <div className="feature-image">
              <img src="/images/report-d.png" alt="Interactive Financial Charts" />
              <div className="image-caption">Interactive charts with zooming, tooltips, and exportable graphics</div>
            </div>
            <p>
              Unlike static reports, BudgetMe's visualizations are fully interactive. Hover over data points for detailed 
              tooltips, zoom in on specific time periods, toggle data series on and off, and even export chart images 
              directly. All charts are also fully responsive, adapting seamlessly to any screen size from desktop to mobile.
            </p>
          </div>

          <div className="feature-section">
            <h2>Flexible Report Controls</h2>
            <p>
              Every user has unique financial information needs. Our intuitive report controls let you customize your 
              reports on the fly to focus on exactly what matters to you.
            </p>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="fas fa-sliders-h"></i>
                <h3>Report Type Selection</h3>
                <p>Choose from six different report types to analyze different aspects of your finances</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-calendar-alt"></i>
                <h3>Timeframe Control</h3>
                <p>Switch between monthly, quarterly, and yearly views with a single click</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-chart-bar"></i>
                <h3>Chart Type Options</h3>
                <p>Select from pie, column, bar, line, and area charts based on your data</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-table"></i>
                <h3>Table View Option</h3>
                <p>Toggle between visual charts and detailed data tables for in-depth analysis</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Export & Share Your Insights</h2>
            <p>
              When you need to use your financial data outside of BudgetMe, our powerful export options make it simple
              to take your reports with you. Whether you're preparing for tax season, working with a financial advisor,
              or just keeping records, we've got you covered.
            </p>
            <div className="feature-image">
              <img src="/images/tax-preparation.png" alt="Report Export Options" />
              <div className="image-caption">Multiple export formats for all your financial reporting needs</div>
            </div>
            <p>
              Download your reports in three convenient formats: PDF for professional-looking reports with charts and tables,
              CSV for raw data export to any spreadsheet software, or Excel format with pre-formatted worksheets. You can also
              email reports directly to yourself or others without leaving the app - perfect for sharing with family members or
              financial advisors.
            </p>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Gain Financial Clarity?</h2>
            <p>
              Join thousands of users who are using BudgetMe's reporting tools to gain deeper insights 
              into their finances and make more informed decisions. Our powerful yet user-friendly 
              reporting system helps you transform financial data into actionable knowledge.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start Creating Reports</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>What types of reports are available?</h3>
                <p>
                  BudgetMe offers six main report types: Spending by Category, Income vs. Expenses, Savings Rate,
                  Financial Trends, Goal Allocations, and Financial Predictions. Each report type provides different
                  insights into your financial situation and can be customized with various chart options and timeframes.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I customize how my reports look?</h3>
                <p>
                  Yes! You can choose between different chart types (pie, column, bar, line, area) depending on the
                  report type. You can also view your data in a detailed table format instead of charts. All charts 
                  include interactive features like tooltips, zooming, and the ability to toggle data series on/off.
                </p>
              </div>
              <div className="faq-item">
                <h3>What export options are available for reports?</h3>
                <p>
                  You can export reports in three formats: PDF (with professional layouts including charts and summary data),
                  CSV (raw data for use in any spreadsheet program), and Excel (formatted workbook with metadata). You
                  can also email reports directly to yourself or others through the app.
                </p>
              </div>
              <div className="faq-item">
                <h3>How is my data protected in reports?</h3>
                <p>
                  All your financial data is secured with industry-standard encryption. When sharing reports via email, 
                  we never include sensitive account information or credentials. You maintain complete control over what 
                  data is included in your reports and who you share them with.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-sidebar">
          <div className="sidebar-cta">
            <h3>Create Your First Report</h3>
            <p>Sign up now to start analyzing your finances.</p>
            <a href="/signup" className="btn-primary btn-block">Sign Up Free</a>
          </div>
          
          <div className="sidebar-widget">
            <h3>Features</h3>
            <ul className="sidebar-list">
              <li>
                <i className="fas fa-chart-bar"></i>
                <span>Interactive Visual Reports</span>
              </li>
              <li>
                <i className="fas fa-download"></i>
                <span>Multi-Format Export Options</span>
              </li>
              <li>
                <i className="fas fa-calendar-alt"></i>
                <span>Flexible Timeframe Analysis</span>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-widget">
            <h3>Related Features</h3>
            <ul className="related-features">
              <li>
                <a href="/features/expense-tracking">
                  <i className="fas fa-wallet"></i>
                  <span>Transaction Management</span>
                </a>
              </li>
              <li>
                <a href="/features/smart-budgeting">
                  <i className="fas fa-chart-pie"></i>
                  <span>Smart Budgeting</span>
                </a>
              </li>
              <li>
                <a href="/features/financial-goals">
                  <i className="fas fa-flag"></i>
                  <span>Financial Goals</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-testimonial">
            <div className="testimonial-content">
              <i className="fas fa-quote-left"></i>
              <p>"The interactive charts helped me identify where my money was going each month. Being able to export reports for my tax preparer saved me hours of work!"</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/mariz.png" alt="Mariz Legaspi" />
              <div>
                <h4>Mariz Legaspi</h4>
                <p>Marketing Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FinancialReportsDetails; 