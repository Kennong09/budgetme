import React, { FC } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../../assets/css/landing.css";

const NotFound: FC = () => {
  return (
    <div className="landing-page">
      <Helmet>
        <title>Page Not Found | BudgetMe</title>
        <meta name="description" content="The page you're looking for cannot be found." />
      </Helmet>

      <div className="not-found-section" style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        background: "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background design elements for visual appeal */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: 0.05,
          background: `
            radial-gradient(circle at 15% 50%, rgba(69, 39, 160, 0.4) 0%, transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(25, 118, 210, 0.4) 0%, transparent 25%)
          `
        }}></div>

        {/* Shape decorations */}
        <div style={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "rgba(79, 70, 229, 0.05)",
          zIndex: 0
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "15%",
          left: "10%",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "rgba(236, 72, 153, 0.05)",
          zIndex: 0
        }}></div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ 
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#4f46e5",
              borderRadius: "8px",
              transform: "rotate(-15deg)",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
            }}>
              <i className="fas fa-wallet" style={{ color: "white", fontSize: "20px" }}></i>
            </div>
            <span style={{ 
              fontSize: "24px", 
              fontWeight: "600",
              color: "#1f2937"
            }}>BudgetMe</span>
          </div>
          
          <div style={{
            fontSize: "120px",
            fontWeight: "bold",
            color: "rgba(79, 70, 229, 0.1)",
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 0
          }}>404</div>

          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "3rem",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.05)",
            maxWidth: "600px",
            position: "relative",
            zIndex: 1
          }}>
            <div style={{ fontSize: "64px", marginBottom: "1rem" }}>
              <i className="bx bx-error-circle" style={{ color: "#4f46e5" }}></i>
            </div>
            <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#1f2937" }}>Page Not Found</h1>
            <p style={{ fontSize: "1.1rem", color: "#6b7280", marginBottom: "2rem" }}>
              The page you're looking for doesn't exist or has been moved.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link
                to="/"
                style={{
                  backgroundColor: "#4f46e5",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4338ca"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#4f46e5"}
              >
                <i className="bx bx-home"></i> Go to Homepage
              </Link>
              <Link
                to="/contact"
                style={{
                  backgroundColor: "white",
                  color: "#4f46e5",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "2px solid #4f46e5",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#4f46e5";
                  e.currentTarget.style.color = "white";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.color = "#4f46e5";
                }}
              >
                <i className="bx bx-support"></i> Contact Support
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "2rem", color: "#6b7280" }}>
            <p>If you think this is a mistake, please check the URL or <Link to="/contact" style={{ color: "#4f46e5" }}>contact our support team</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 