import React, { FC, memo, useMemo } from "react";
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

const BudgetReview: FC<BudgetReviewProps> = memo(({
  budget,
  category,
  onBackToEdit,
  onSubmit,
  isSubmitting,
  submitButtonText = "Create Budget",
  backToPath = "/budgets",
  backToText = "Cancel"
}) => {
  const endDate = useMemo((): string => {
    const [year, month] = budget.startDate.split("-").map(Number);

    if (budget.period === "month") {
      return new Date(year, month, 0).toISOString().slice(0, 10);
    } else if (budget.period === "quarter") {
      return new Date(year, month + 2, 0).toISOString().slice(0, 10);
    } else {
      return new Date(year, month + 11, 0).toISOString().slice(0, 10);
    }
  }, [budget.startDate, budget.period]);

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="d-sm-flex align-items-center justify-content-between mb-3 md:mb-4">
        <h1 className="text-xl md:text-2xl lg:h3 mb-2 md:mb-0 text-gray-800">Review Budget</h1>
        <Link to={backToPath} className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs md:text-sm font-medium rounded shadow-sm transition-colors">
          <i className="fas fa-arrow-left mr-1 md:mr-2 text-xs"></i> {backToText}
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-3 md:mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-header py-2 md:py-3">
              <h6 className="m-0 text-sm md:text-base font-weight-bold text-primary">{budget.budget_name || 'Budget Details'}</h6>
            </div>
            <div className="card-body p-3 md:p-4">
              <div className="row mb-3 md:mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-primary shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-primary text-uppercase mb-1">
                            Budget Name
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                            {budget.budget_name || 'N/A'}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-tag fa-lg md:fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-success shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-success text-uppercase mb-1">
                            Category
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                            {category ? category.category_name : "Unknown Category"}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-layer-group fa-lg md:fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="row mb-3 md:mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-success shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-success text-uppercase mb-1">
                            Budget Amount
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                            {formatCurrency(Number(budget.amount))}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-solid fa-peso-sign fa-lg md:fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-info shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-info text-uppercase mb-1">
                            Period
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800 text-capitalize">
                            {budget.period}ly
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-calendar-alt fa-lg md:fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row mb-3 md:mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                  <div className="card border-left-warning shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-warning text-uppercase mb-1">
                            Start Date
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                            {budget.startDate}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-calendar fa-lg md:fa-2x text-gray-300"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-left-secondary shadow h-100 py-2 md:py-3">
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs md:text-sm font-weight-bold text-secondary text-uppercase mb-1">
                            End Date
                          </div>
                          <div className="text-base md:text-lg lg:h5 mb-0 font-weight-bold text-gray-800">
                            {new Date(endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-calendar-check fa-lg md:fa-2x text-gray-300"></i>
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
                        From {new Date(budget.startDate + "-01").toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
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
              
              <div className="text-center mt-3 md:mt-4 flex flex-col sm:flex-row justify-center gap-2">
                <button 
                  onClick={onBackToEdit} 
                  className="inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm md:text-base font-medium rounded shadow-sm transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2 text-xs md:text-sm"></i>
                  <span>Back to Edit</span>
                </button>
                <button 
                  onClick={onSubmit} 
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 bg-[#1cc88a] hover:bg-[#17a673] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className={`${isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"} mr-2 text-xs md:text-sm`}></i>
                  <span>{isSubmitting ? "Creating..." : submitButtonText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BudgetReview.displayName = 'BudgetReview';

export default BudgetReview;
