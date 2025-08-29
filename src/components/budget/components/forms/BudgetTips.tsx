import React, { FC } from "react";

const BudgetTips: FC = () => {
  const tips = [
    {
      icon: "piggy-bank",
      color: "primary",
      title: "50/30/20 Rule",
      description: "Allocate 50% for needs, 30% for wants, and 20% for savings"
    },
    {
      icon: "chart-pie",
      color: "success",
      title: "Zero-Based Budget",
      description: "Assign every dollar a purpose"
    },
    {
      icon: "balance-scale",
      color: "warning",
      title: "Be Realistic",
      description: "Set achievable budget goals based on your spending history"
    },
    {
      icon: "arrows-alt-h",
      color: "info",
      title: "Adjust As Needed",
      description: "Review and update your budget regularly"
    }
  ];

  return (
    <div className="col-lg-4 d-none d-lg-block">
      <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">Budgeting Tips</h6>
        </div>
        <div className="card-body">
          {tips.map((tip, index) => (
            <div key={tip.title} className={index < tips.length - 1 ? "mb-3" : "mb-0"}>
              <div className="d-flex align-items-center mb-2">
                <div 
                  className={`rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center`}
                  style={{ 
                    backgroundColor: `rgba(${
                      tip.color === 'primary' ? '78, 115, 223' :
                      tip.color === 'success' ? '28, 200, 138' :
                      tip.color === 'warning' ? '246, 194, 62' :
                      '54, 185, 204'
                    }, 0.2)`, 
                    width: "32px", 
                    height: "32px" 
                  }}
                >
                  <i className={`fas fa-${tip.icon} text-${tip.color}`}></i>
                </div>
                <p className="font-weight-bold mb-0">{tip.title}</p>
              </div>
              <p className="text-sm ml-5 mb-0">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetTips;
