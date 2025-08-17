import React, { Component, ErrorInfo, ReactNode, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./utils/AuthContext";
import { ToastProvider } from "./utils/ToastContext";
import { CurrencyProvider } from "./utils/CurrencyContext";
import FloatingChatbot from "./components/chatbot/FloatingChatbot";
import "./App.css";

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by App error boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container" style={{ 
          padding: "2rem", 
          margin: "2rem",
          backgroundColor: "#ffdddd",
          borderRadius: "8px",
          textAlign: "center" 
        }}>
          <h2>Something went wrong</h2>
          <p>We're sorry - there was an error loading the application.</p>
          <p><small>{this.state.error?.message}</small></p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#e74a3b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Try Again
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#4e73df",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginLeft: "1rem"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback loading component
const AppLoading = () => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    height: "100vh",
    flexDirection: "column"
  }}>
    <div 
      style={{ 
        width: "50px", 
        height: "50px", 
        border: "5px solid rgba(231, 74, 59, 0.2)",
        borderTop: "5px solid #e74a3b",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "1rem"
      }} 
    />
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
    <p>Loading BudgetMe...</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoading />}>
    <Router>
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <AppRoutes />
            <FloatingChatbot />
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
