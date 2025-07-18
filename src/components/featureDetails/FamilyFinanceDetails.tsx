import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '../landing/Header';
import Footer from '../landing/Footer';
import '../../assets/css/landing.css';
import { useNavigate } from 'react-router-dom';

const FamilyFinanceDetails: React.FC = () => {
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
        <title>Family Finance | BudgetMe</title>
        <meta name="description" content="Learn about BudgetMe's collaborative family finance management tools" />
      </Helmet>

      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <div className="feature-details-hero family-hero">
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="bx bxs-user-account"></i>
              <span>Family Finance</span>
            </div>
            <h1>Manage Family Finances Together</h1>
            <p>Create a family group, invite members, and track shared financial goals in one unified platform</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div className="feature-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-group"></i>
              </div>
              <div className="overview-text">
                <h3>Collaborative Budgeting</h3>
                <p>Create and manage shared budgets that everyone can contribute to</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-shield"></i>
              </div>
              <div className="overview-text">
                <h3>Privacy Controls</h3>
                <p>Customize what financial information is shared with each family member</p>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon">
                <i className="bx bx-task"></i>
              </div>
              <div className="overview-text">
                <h3>Shared Responsibilities</h3>
                <p>Assign financial tasks and track contributions from each family member</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Financial Management for Modern Families</h2>
            <p>
              Money is often cited as one of the top sources of stress in relationships and families. 
              BudgetMe's family finance tools are designed to reduce that stress by creating transparency, 
              encouraging communication, and simplifying collaboration around your household finances.
            </p>
            <div className="feature-image">
              <img src="/images/family.png" alt="Family Finance Dashboard" />
              <div className="image-caption">BudgetMe's intuitive family finance dashboard</div>
            </div>
            <p>
              Whether you're managing finances with a partner, teaching kids about money, or coordinating 
              across a multi-generational household, our platform adapts to your family's unique structure 
              and needs. BudgetMe creates a shared financial environment while respecting individual 
              privacy and autonomy.
            </p>
          </div>

          <div className="feature-section">
            <h2>Key Features of Family Finance</h2>
            <div className="feature-list-detailed">
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-wallet"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Family Group Creation</h3>
                  <p>
                    Create a dedicated family group with customized settings including name, description, 
                    currency preference, and visibility settings. Make your family public to allow other 
                    users to find and request to join, or keep it private for invite-only membership.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-user-plus"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Member Management</h3>
                  <p>
                    Invite family members and assign them appropriate roles. Administrators can manage 
                    settings and approve join requests, while viewers have limited access to family data. 
                    The family creator maintains complete control over membership and permissions.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-line-chart"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Unified Financial Dashboard</h3>
                  <p>
                    View your family's combined income, expenses, and savings rate in one centralized 
                    dashboard. Track financial performance with interactive charts that show spending patterns 
                    and financial health metrics across all family members.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-item-icon">
                  <i className="bx bx-target-lock"></i>
                </div>
                <div className="feature-item-content">
                  <h3>Shared Financial Goals</h3>
                  <p>
                    Create and track shared family goals that everyone can contribute to. Monitor progress 
                    with visual indicators, track individual contributions, and celebrate together when 
                    targets are reached. Perfect for saving for family vacations, home improvements, or education.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Family Activity Monitoring</h2>
            <p>
              BudgetMe's family dashboard provides a comprehensive activity feed that keeps everyone 
              informed about important financial events. Track who's contributing to family goals,
              monitor recent transactions, and see when new members join.
            </p>
            <div className="feature-image">
              <img src="/images/family-d.png" alt="Family Activity Dashboard" />
              <div className="image-caption">Track all family financial activities in one place</div>
            </div>
            <p>
              The activity timeline makes it easy to stay informed about your family's financial progress 
              without having to ask. Family administrators can see a complete history of financial activities, 
              while members with viewer access get appropriate visibility based on their permissions.
            </p>
          </div>

          <div className="feature-section">
            <h2>Goal Contribution Analytics</h2>
            <p>
              For shared family goals, BudgetMe provides detailed contribution tracking that shows exactly 
              how much each family member has contributed toward reaching your targets.
            </p>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="bx bx-bar-chart"></i>
                <h3>Contribution Charts</h3>
                <p>Visualize each member's contributions with interactive charts</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-donate-heart"></i>
                <h3>Easy Contributions</h3>
                <p>Add funds to family goals with just a few clicks</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-trophy"></i>
                <h3>Progress Tracking</h3>
                <p>See real-time progress toward your shared financial goals</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-history"></i>
                <h3>Contribution History</h3>
                <p>Review a complete history of all goal contributions</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Role-Based Family Membership</h2>
            <p>
              BudgetMe provides a flexible permissions system to ensure every family member has the right level 
              of access. Family creators have full administrative control, while other members can have
              customized roles based on your family's needs.
            </p>
            <div className="features-grid-small">
              <div className="feature-grid-item">
                <i className="bx bx-crown"></i>
                <h3>Admin Privileges</h3>
                <p>Full control over family settings, invitations, and membership</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-user-check"></i>
                <h3>Member Access</h3>
                <p>Customizable access levels for different family members</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-user-plus"></i>
                <h3>Join Requests</h3>
                <p>Approve or deny requests to join your family group</p>
              </div>
              <div className="feature-grid-item">
                <i className="bx bx-exit"></i>
                <h3>Flexible Membership</h3>
                <p>Members can leave the family group when needed</p>
              </div>
            </div>
          </div>

          <div className="feature-section">
            <h2>Public and Private Family Options</h2>
            <p>
              BudgetMe gives you control over who can see and join your family group. Create a public
              family that others can discover and request to join, or keep it private for invite-only
              access.
            </p>
            <div className="feature-image">
              <img src="/images/multi-generational.png" alt="Public and Private Family Options" />
              <div className="image-caption">Choose between public and private visibility for your family</div>
            </div>
            <p>
              Public families appear in search results, allowing friends and extended family to find and
              request to join your group. Private families are hidden from search, ensuring only those
              you specifically invite can access your family's financial information.
            </p>
          </div>

          <div className="feature-cta-section">
            <h2>Ready to Transform Your Family's Financial Life?</h2>
            <p>
              Join thousands of families who are using BudgetMe to collaborate on finances, reduce money 
              stress, and build stronger financial futures together. Our platform brings clarity and 
              cooperation to your household finances.
            </p>
            <div className="feature-cta-buttons">
              <a href="/signup" className="btn-primary">Start Family Planning</a>
              <a href="/demo" className="btn-secondary">See Demo</a>
            </div>
          </div>

          <div className="feature-faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              <div className="faq-item">
                <h3>How do I create a family group?</h3>
                <p>
                  Creating a family group is simple. Navigate to the Family Dashboard, click on "Create Family", 
                  and fill in details like your family name, description, and preferred currency. You can also 
                  choose whether to make your family public (discoverable by others) or private (invite-only).
                </p>
              </div>
              <div className="faq-item">
                <h3>How do I invite family members?</h3>
                <p>
                  From the Family Dashboard, click on "Invite Member" and enter the email address of the person 
                  you want to invite. You can assign them a role (admin or viewer) and include a personalized 
                  message. They'll receive an invitation that they can accept to join your family.
                </p>
              </div>
              <div className="faq-item">
                <h3>Can I be a member of multiple families?</h3>
                <p>
                  Currently, each user can only be a member of one family at a time. If you need to join a different 
                  family, you'll first need to leave your current family group. This helps maintain clear financial 
                  boundaries and simplifies the user experience.
                </p>
              </div>
              <div className="faq-item">
                <h3>What happens to my data if I leave a family?</h3>
                <p>
                  Your personal financial data remains intact when you leave a family. Any contributions you've 
                  made to shared family goals will remain with those goals, but you'll no longer have access 
                  to the family dashboard or shared family data after leaving.
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
                <a href="/features/expense-tracking">
                  <i className="bx bxs-wallet-alt"></i>
                  <span>Expense Tracking</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-testimonial">
            <div className="testimonial-content">
              <i className="bx bxs-quote-left"></i>
              <p>"Creating a family group in BudgetMe has revolutionized how we track our household finances. Being able to see our combined income and expenses, plus contribute to shared goals together has made saving for our future home much easier."</p>
            </div>
            <div className="testimonial-author">
              <img src="/images/peter.png" alt="Peter Justin" />
              <div>
                <h4>Peter Justin</h4>
                <p>Cybersecurity Professional</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FamilyFinanceDetails; 