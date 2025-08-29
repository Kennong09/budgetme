import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import './featureDetails.css';
import { useNavigate } from 'react-router-dom';

const AIInsightsDetails: React.FC = () => {
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
        <title>AI Insights & Predictions | BudgetMe</title>
        <meta name="description" content="Discover BudgetMe's powerful AI-driven financial insights and predictive analytics features" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero ai-insights-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="fas fa-brain"></i>
              <span>AI Insights & Predictions</span>
            </div>
            <h1>Intelligent Financial Predictions Powered by AI</h1>
            <p>Leverage advanced artificial intelligence to predict spending patterns, optimize budgets, and make smarter financial decisions</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="overview-text">
                <h3>Spending Pattern Recognition</h3>
                <p>AI algorithms analyze your transaction history to identify spending patterns and predict future expenses</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div className="overview-text">
                <h3>Smart Budget Optimization</h3>
                <p>Get AI-powered recommendations to optimize your budget based on your spending habits and financial goals</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="overview-text">
                <h3>Financial Risk Alerts</h3>
                <p>Receive proactive alerts about potential overspending and financial risks before they impact your budget</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>AI-Powered Financial Intelligence</h2>
            <p>
              BudgetMe's AI insights transform your financial data into actionable intelligence. Our advanced machine learning 
              algorithms analyze your spending patterns, income trends, and financial behaviors to provide personalized 
              recommendations that help you make smarter money decisions. Whether you're looking to save more, spend wisely, 
              or plan for the future, our AI insights guide you every step of the way.
            </p>
            <div className="feature-image">
              <img src="/images/ai-prediction.png" alt="AI Insights Dashboard" />
              <div className="image-caption">BudgetMe's AI-powered financial insights dashboard</div>
            </div>
            <p>
              The AI system continuously learns from your financial behavior, becoming more accurate and personalized over time. 
              It identifies trends you might miss, predicts upcoming expenses, and suggests optimal times for major purchases 
              based on your income cycles and spending patterns.
            </p>
          </div>

          <div className="feature-section">
            <h2>Key Features of Our AI Insights System</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Monthly Expense Projections</h3>
                  <p>
                    Accurate predictions of your upcoming monthly expenses based on historical patterns. 
                    Our AI analyzes your spending behavior to forecast future expenses, helping you plan 
                    better and avoid financial surprises.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Budget Variance Forecasting</h3>
                  <p>
                    Early warnings when you're likely to exceed budget categories. The AI monitors your 
                    spending velocity and alerts you before you go over budget, giving you time to adjust 
                    your spending behavior.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-search"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Savings Opportunity Detection</h3>
                  <p>
                    AI identifies potential areas where you can reduce spending without impacting your 
                    lifestyle. Discover hidden savings opportunities and optimize your budget allocation 
                    for maximum financial efficiency.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Income Trend Analysis</h3>
                  <p>
                    Predictions about income fluctuations and optimal saving periods. The AI analyzes your 
                    income patterns to recommend the best times to save more or when to be more conservative 
                    with spending.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>AI-Powered Analytics Dashboard</h2>
            <p>
              BudgetMe's AI insights transform your financial data into actionable intelligence through an 
              intuitive dashboard that makes complex analytics easy to understand and act upon.
            </p>
            <div className="feature-image">
              <img src="/images/ai-prediction-d.png" alt="AI Prediction Analytics" />
              <div className="image-caption">Advanced predictive analytics and trend forecasting</div>
            </div>
            <p>
              The AI continuously learns from your financial behavior, becoming more accurate and personalized 
              over time. It identifies trends you might miss, predicts upcoming expenses, and suggests optimal 
              times for major purchases based on your income cycles and spending patterns.
            </p>
          </div>

          <div className="feature-section">
            <h2>Smart Financial Recommendations</h2>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="fas fa-bullseye"></i>
                <h3>Budget Optimization</h3>
                <p>AI suggests optimal budget allocations to maximize savings potential</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-clock"></i>
                <h3>Timing Recommendations</h3>
                <p>Get advice on the best times to make purchases or investments</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-chart-line"></i>
                <h3>Growth Strategies</h3>
                <p>Receive personalized strategies to accelerate financial growth</p>
              </div>
              <div className="feature-grid-item">
                <i className="fas fa-bell"></i>
                <h3>Smart Alerts</h3>
                <p>Intelligent notifications about spending patterns and opportunities</p>
              </div>
            </div>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Experience AI-Powered Financial Intelligence?</h2>
            <p>
              Join thousands of users who are already making smarter financial decisions with BudgetMe's 
              AI insights. Transform your financial data into actionable intelligence and optimize your 
              money management with cutting-edge artificial intelligence.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start AI Analysis</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>How does the AI analyze my financial data?</h3>
                <p>
                  Our AI uses advanced machine learning algorithms to analyze your transaction history, spending patterns, 
                  and financial behaviors. It identifies trends, seasonal patterns, and behavioral correlations to provide 
                  personalized insights and predictions. All analysis is done securely and your data remains private.
                </p>
              </div>
              <div className="faq-item">
                <h3>How accurate are the AI predictions?</h3>
                <p>
                  Our AI predictions become more accurate over time as the system learns from your financial behavior. 
                  Typically, expense predictions are 85-90% accurate after the first month of data, and improve to 
                  95%+ accuracy after three months of transaction history.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I customize the AI recommendations?</h3>
                <p>
                  Yes! You can set preferences for the types of recommendations you want to receive, adjust risk tolerance 
                  for alerts, and specify which categories you want the AI to focus on. The system adapts to your 
                  preferences while maintaining its predictive accuracy.
                </p>
              </div>
              <div className="faq-item">
                <h3>Is my financial data secure with AI analysis?</h3>
                <p>
                  Absolutely. All AI processing is done with bank-level encryption and security protocols. Your data 
                  is never shared with third parties, and all machine learning models run on secure, isolated systems. 
                  We follow strict privacy standards to protect your financial information.
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
            <h3>Features</h3>
            <ul className="sidebar-list">
              <li>
                <i className="fas fa-brain"></i>
                <span>Smart Pattern Recognition</span>
              </li>
              <li>
                <i className="fas fa-chart-line"></i>
                <span>Predictive Analytics</span>
              </li>
              <li>
                <i className="fas fa-lightbulb"></i>
                <span>AI-Powered Recommendations</span>
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
              <p>"The AI insights helped me identify spending patterns I never noticed. I've optimized my budget and increased my savings by 25% in just three months!"</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/kenneth.png" alt="Kenneth Buela" />
              <div>
                <h4>Kenneth Buela</h4>
                <p>Software Engineer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AIInsightsDetails;
