import React, { FC } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../../../utils/helpers";
import { BudgetFormData, ExpenseCategory } from "../../types";

interface BudgetReviewProps {
  budget: BudgetFormData;
  category: ExpenseCategory | undefined;
  onBackToEdit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  backToPath?: string;
  backToText?: string;
}

const BudgetReview: FC<BudgetReviewProps> = ({
  budget,
  category,
  onBackToEdit,
  onSubmit,
  isSubmitting,
  submitButtonText = "Create Budget",
  backToPath = "/budgets",
  backToText = "Cancel"
}) => {
  const getEndDate = (): string => {
    const [year, month] = budget.startDate.split("-").map(Number);

    if (budget.period === "month") {
      return new Date(year, month, 0).toISOString().slice(0, 10);
    } else if (budget.period === "quarter") {
      return new Date(year, month + 2, 0).toISOString().slice(0, 10);
    } else {
      return new Date(year, month + 11, 0).toISOString().slice(0, 10);
    }
  };

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Review Budget</h1>
        <Link to={backToPath} className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> {backToText}
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Budget Details</h6>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                            Category
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {category ? category.category_name : "Unknown Category"}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-tag fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-success shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                            Budget Amount
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {formatCurrency(parseFloat(budget.amount))}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-solid fa-peso-sign fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="row mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                            Period
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800 text-capitalize">
                            {budget.period}ly
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-calendar-alt fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-warning shadow h-100 py-2">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                            Start Date
                          </div>
                          <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {budget.startDate}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-calendar fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card bg-primary text-white shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                        Budget Period Coverage
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-white">
                        From {new Date(budget.startDate + "-01").toLocaleDateString()} to {new Date(getEndDate()).toLocaleDateString()}
                      </div>
                      <div className="text-white-50 small mt-2">
                        {budget.period === "month" ? "Monthly" : budget.period === "quarter" ? "Quarterly" : "Yearly"} budget allocation
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-chart-pie fa-2x text-white-50"></i>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <button onClick={onBackToEdit} className="btn btn-light btn-icon-split mr-2">
                  <span className="icon text-gray-600">
                    <i className="fas fa-arrow-left"></i>
                  </span>
                  <span className="text">Back to Edit</span>
                </button>
                <button 
                  onClick={onSubmit} 
                  disabled={isSubmitting}
                  className="btn btn-success btn-icon-split"
                >
                  <span className="icon text-white-50">
                    <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                  </span>
                  <span className="text">{isSubmitting ? "Creating..." : submitButtonText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetReview;
