import React, { FC } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "../admin.css";

const AdminNotFound: FC = () => {
  return (
    <div className="admin-not-found">
      <Helmet>
        <title>Page Not Found | Admin Panel</title>
        <meta name="description" content="The admin page you're looking for cannot be found." />
      </Helmet>

      <div className="not-found-section" style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background design elements with red theme */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: 0.05,
          background: `
            radial-gradient(circle at 15% 50%, rgba(229, 62, 62, 0.4) 0%, transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(197, 48, 48, 0.4) 0%, transparent 25%)
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
          background: "rgba(229, 62, 62, 0.05)",
          zIndex: 0
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "15%",
          left: "10%",
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          background: "rgba(229, 62, 62, 0.05)",
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
              backgroundColor: "#e74a3b",
              borderRadius: "8px",
              transform: "rotate(-15deg)",
              boxShadow: "0 4px 12px rgba(229, 62, 62, 0.2)"
            }}>
              <i className="fas fa-shield-alt" style={{ color: "white", fontSize: "20px" }}></i>
            </div>
            <span style={{ 
              fontSize: "24px", 
              fontWeight: "600",
              color: "#1f2937"
            }}>BudgetMe Admin</span>
          </div>
          
          <div style={{
            fontSize: "120px",
            fontWeight: "bold",
            color: "rgba(229, 62, 62, 0.1)",
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
              <i className="fas fa-exclamation-circle" style={{ color: "#e74a3b" }}></i>
            </div>
            <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#1f2937" }}>Admin Page Not Found</h1>
            <p style={{ fontSize: "1.1rem", color: "#6b7280", marginBottom: "2rem" }}>
              The admin page you're looking for doesn't exist or has been moved.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link
                to="/admin/dashboard"
                style={{
                  backgroundColor: "#e74a3b",
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
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c42f1b"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e74a3b"}
              >
                <i className="fas fa-tachometer-alt"></i> Admin Dashboard
              </Link>
              <Link
                to="/dashboard"
                style={{
                  backgroundColor: "white",
                  color: "#e74a3b",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "2px solid #e74a3b",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#e74a3b";
                  e.currentTarget.style.color = "white";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.color = "#e74a3b";
                }}
              >
                <i className="fas fa-home"></i> User Dashboard
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "2rem", color: "#6b7280" }}>
            <p>If you think this is a mistake, please check the URL or <Link to="/admin/settings" style={{ color: "#e74a3b" }}>contact the system administrator</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotFound; 