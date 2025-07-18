import React, { FC, useState, FormEvent, useEffect } from "react";
import { Helmet } from "react-helmet";
import Header from "./Header";
import Footer from "./Footer";
import "../../assets/css/landing.css";
import "../featureDetails/featureDetails.css"; // Add feature details CSS
import { useNavigate } from "react-router-dom";

const Contact: FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  
  // Scroll to top when component mounts (like feature pages do)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSuccess(true);
      
      // Reset form after success
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
      
      // Reset success message after a delay
      setTimeout(() => {
        setFormSuccess(false);
      }, 5000);
    }, 1500);
  };
  
  // Handle login and register button clicks
  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/signup');
  };

  return (
    <div className="feature-details-page">
      <Helmet>
        <title>Contact Us | BudgetMe</title>
        <meta name="description" content="Get in touch with our support team" />
      </Helmet>

      {/* Pass forceFeatureHeader prop to Header to make it behave like a feature page header */}
      <Header 
        onLoginClick={handleLoginClick} 
        onRegisterClick={handleRegisterClick} 
        forceFeatureHeader={true}
      />
      
      {/* Hero section styled like feature pages */}
      <div className="feature-details-hero" style={{
        background: "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)"
      }}>
        <div className="feature-details-container">
          <div className="feature-details-hero-content">
            <div className="feature-badge">
              <i className="bx bxs-message-dots"></i>
              <span>Contact Us</span>
            </div>
            <h1>Get in Touch</h1>
            <p>Have a question or need assistance? Our support team is ready to help.</p>
          </div>
        </div>
      </div>

      <div className="feature-details-container">
        <div className="feature-details-content">
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2rem",
            marginTop: "3rem"
          }}>
            <div style={{
              flex: "1 1 350px",
              background: "white",
              borderRadius: "16px",
              padding: "2.5rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
            }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "#1f2937" }}>Send us a message</h3>
              
              {formSuccess ? (
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  borderLeft: "4px solid #10B981",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  marginBottom: "1.5rem"
                }}>
                  <h4 style={{ color: "#10B981", marginBottom: "0.5rem" }}>Message Sent!</h4>
                  <p style={{ color: "#064E3B" }}>
                    Thank you for contacting us. We've received your message and will respond within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#374151" }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border 0.3s ease",
                        fontSize: "1rem"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#4f72ff"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                    />
                  </div>
                  
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#374151" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border 0.3s ease",
                        fontSize: "1rem"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#4f72ff"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                    />
                  </div>
                  
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="subject" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#374151" }}>
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border 0.3s ease",
                        fontSize: "1rem",
                        appearance: "none",
                        backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"%236B7280\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z\"></path></svg>')",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 1rem center",
                        backgroundSize: "1.5em 1.5em"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#4f72ff"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                    >
                      <option value="">Select a topic</option>
                      <option value="Account Help">Account Help</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Billing">Billing</option>
                      <option value="General Question">General Question</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label htmlFor="message" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#374151" }}>
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Type your message here..."
                      rows={5}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border 0.3s ease",
                        fontSize: "1rem",
                        resize: "vertical"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#4f72ff"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: "#4f46e5",
                      color: "white",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.3s ease",
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!isSubmitting) e.currentTarget.style.backgroundColor = "#4338ca";
                    }}
                    onMouseOut={(e) => {
                      if (!isSubmitting) e.currentTarget.style.backgroundColor = "#4f46e5";
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z" fill="white" fillOpacity="0.2"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M10 0C15.5228 0 20 4.47715 20 10H18C18 5.58172 14.4183 2 10 2V0Z" fill="white"/>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-paper-plane"></i> 
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
            
            <div style={{
              flex: "1 1 350px",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}>
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
              }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #4f72ff 0%, #6E8FFE 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem"
                }}>
                  <i className="bx bx-envelope" style={{ fontSize: "28px", color: "white" }}></i>
                </div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "#1f2937" }}>Email Support</h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  Get a response within 24 hours when you email our support team.
                </p>
                <a
                  href="mailto:support@budgetme.com"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#4f46e5",
                    fontWeight: 500,
                    textDecoration: "none"
                  }}
                >
                  support@budgetme.com
                  <i className="bx bx-right-arrow-alt"></i>
                </a>
              </div>
              
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
              }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem"
                }}>
                  <i className="bx bx-chat" style={{ fontSize: "28px", color: "white" }}></i>
                </div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "#1f2937" }}>Live Chat</h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  Chat with our customer service agents in real-time during business hours.
                </p>
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#10B981",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textDecoration: "none"
                  }}
                >
                  Start Live Chat
                  <i className="bx bx-right-arrow-alt"></i>
                </button>
              </div>
              
              <div style={{
                background: "white",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
              }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem"
                }}>
                  <i className="bx bx-book-open" style={{ fontSize: "28px", color: "white" }}></i>
                </div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "#1f2937" }}>Help Center</h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  Find answers to common questions in our comprehensive knowledge base.
                </p>
                <a
                  href="/help"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#F59E0B",
                    fontWeight: 500,
                    textDecoration: "none"
                  }}
                >
                  Visit Help Center
                  <i className="bx bx-right-arrow-alt"></i>
                </a>
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
                <a href="/features/financial-goals">
                  <i className="bx bxs-flag-alt"></i>
                  <span>Financial Goals</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact; 