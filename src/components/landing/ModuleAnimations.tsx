import React, { FC, useState } from "react";

interface AnimationProps {
  animated?: boolean;
}

// Dashboard Module Animation
export const DashboardAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(79, 70, 229, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#4F46E5",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-dashboard ${isHovered ? 'bx-tada' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#4F46E5' : 'inherit'
      }}>Dashboard</h3>
      <p>
        Get a quick overview of your financial health with visualizations of
        income, expenses, and savings.
      </p>
    </div>
  );
};

// Transactions Module Animation
export const TransactionsAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(16, 185, 129, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#10B981",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bx-trending-up ${isHovered ? 'bx-fade-up' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#10B981' : 'inherit'
      }}>Transactions</h3>
      <p>
        Record your transactions.
      </p>
    </div>
  );
};

// Budgets Module Animation
export const BudgetsAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp animation-delay-400' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(245, 158, 11, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#F59E0B",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-coin-stack ${isHovered ? 'bx-flashing' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#F59E0B' : 'inherit'
      }}>Budgets</h3>
      <p>
        Create custom budgets.
      </p>
    </div>
  );
};

// Goals Module Animation
export const GoalsAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(236, 72, 153, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#EC4899",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-trophy ${isHovered ? 'bx-tada' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#EC4899' : 'inherit'
      }}>Goals</h3>
      <p>
        Set financial goals.
      </p>
    </div>
  );
};

// Family Module Animation
export const FamilyAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(59, 130, 246, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#3B82F6",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-home-heart ${isHovered ? 'bx-burst' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#3B82F6' : 'inherit'
      }}>Family</h3>
      <p>
        Manage finances together.
      </p>
    </div>
  );
};

// AI Predictions Module Animation
export const AIPredictionsAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp animation-delay-400' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(139, 92, 246, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#8B5CF6",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-rocket ${isHovered ? 'bx-spin' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#8B5CF6' : 'inherit'
      }}>AI Predictions</h3>
      <p>
        Leverage AI to predict.
      </p>
    </div>
  );
};

// Reports Module Animation
export const ReportsAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(239, 68, 68, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#EF4444",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-chart ${isHovered ? 'bx-fade-up' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#EF4444' : 'inherit'
      }}>Reports</h3>
      <p>
        Generate detailed reports and visualizations to understand your spending
        patterns and progress over time.
      </p>
    </div>
  );
};

// Account Module Animation
export const AccountAnimation: FC<AnimationProps> = ({ animated }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`module-animation ${animated ? 'animate__animated animate__fadeInUp animation-delay-200' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isHovered ? '0 10px 25px rgba(14, 165, 233, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="module-icon-animated" 
        style={{ 
          backgroundColor: "#0EA5E9",
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease, background-color 0.3s ease'
        }}
      >
        <i 
          className={`bx bxs-user-circle ${isHovered ? 'bx-tada' : 'animated-pulse'}`} 
          style={{ color: "#ffffff" }}
        ></i>
      </div>
      <h3 style={{ 
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
        color: isHovered ? '#0EA5E9' : 'inherit'
      }}>Account</h3>
      <p>
        Manage your profile, security settings, and preferences in a
        user-friendly interface.
      </p>
    </div>
  );
};
