import React, { FC } from "react";

const Footer: FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="landing-logo">
              <div className="rotate-n-15">
                <i className="fas fa-wallet text-primary-landing text-4xl"></i>
              </div>
              <span>BudgetMe</span>
            </div>
            <p>
              Take control of your finances with our easy-to-use budgeting and
              expense tracking solution.
            </p>
            <div className="social-icons">
              <a href="https://facebook.com" aria-label="Facebook">
                <i className="bx bxl-facebook"></i>
              </a>
              <a href="https://twitter.com" aria-label="Twitter">
                <i className="bx bxl-twitter"></i>
              </a>
              <a href="https://instagram.com" aria-label="Instagram">
                <i className="bx bxl-instagram"></i>
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn">
                <i className="bx bxl-linkedin"></i>
              </a>
            </div>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <nav className="footer-nav">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it Works</a>
              <a href="#testimonials">Testimonials</a>
              <a href="#modules">Modules</a>
            </nav>
          </div>

          <div className="footer-links">
            <h4>Legal</h4>
            <nav className="footer-nav">
              <a href="/#terms">Terms of Service</a>
              <a href="/#privacy">Privacy Policy</a>
              <a href="/#cookies">Cookie Policy</a>
              <a href="/#security">Security Policy</a>
            </nav>
          </div>
          
          <div className="footer-links">
            <h4>Subscribe</h4>
            <p className="subscribe-text">Get updates on new features and announcements</p>
            <div className="footer-subscribe">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="footer-subscribe-input"
                aria-label="Email for newsletter"
              />
              <button className="footer-subscribe-button">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} BudgetMe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 