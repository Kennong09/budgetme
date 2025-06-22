import React, { useState, FC, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  calculateMonthlySavingsForGoal,
} from "../../utils/helpers";
import { useCurrency } from "../../utils/CurrencyContext";

// Import SB Admin CSS (already imported at the app level)
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface GoalFormData {
  goal_name: string;
  target_amount: string;
  target_date: string;
  current_amount: string;
  priority: "low" | "medium" | "high";
  notes: string;
}

const CreateGoal: FC = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const initialFormState: GoalFormData = {
    goal_name: "",
    target_amount: "",
    target_date: "",
    current_amount: "0",
    priority: "medium",
    notes: "",
  };

  const [goal, setGoal] = useState<GoalFormData>(initialFormState);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setGoal((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validation
    if (!goal.goal_name) {
      alert("Please enter a goal name");
      return;
    }

    if (!goal.target_amount || parseFloat(goal.target_amount) <= 0) {
      alert("Please enter a valid target amount");
      return;
    }

    if (!goal.target_date) {
      alert("Please select a target date");
      return;
    }

    const targetDate = new Date(goal.target_date);
    const today = new Date();

    if (targetDate <= today) {
      alert("Target date must be in the future");
      return;
    }

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = (): void => {
    setIsSubmitting(true);
    
    // In a real app, would call API to save goal
    setTimeout(() => {
      console.log("Submitting goal:", goal);
      alert("Goal created successfully!");
      navigate("/goals");
    }, 1000);
  };

  const calculateRecommendation = (): number | null => {
    if (!goal.target_amount || !goal.target_date) return null;

    const targetAmount = parseFloat(goal.target_amount);
    const currentAmount = parseFloat(goal.current_amount) || 0;
    const targetDate = new Date(goal.target_date);
    const today = new Date();

    // Calculate months between today and target date
    const monthsDiff =
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
      (targetDate.getMonth() - today.getMonth());

    if (monthsDiff <= 0) return targetAmount - currentAmount;

    // Calculate monthly contribution needed
    const remaining = targetAmount - currentAmount;
    return remaining / monthsDiff;
  };

  if (viewMode === "review") {
    const monthlySavings = calculateRecommendation();

    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Your Goal</h1>
          <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
          </Link>
        </div>

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Goal Details</h6>
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-12 mb-4">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Goal Name
                    </div>
                    <h4 className="h4 mb-0 font-weight-bold text-gray-800">{goal.goal_name}</h4>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                              Target Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrency(parseFloat(goal.target_amount))}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-bullseye fa-2x text-gray-300"></i>
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
                              Current Amount
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatCurrency(parseFloat(goal.current_amount) || 0)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-piggy-bank fa-2x text-gray-300"></i>
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
                              Target Date
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">
                              {formatDate(goal.target_date)}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-calendar fa-2x text-gray-300"></i>
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
                              Priority
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800 text-capitalize">
                              {goal.priority}
                            </div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-flag fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {monthlySavings && (
                  <div className="card bg-success text-white shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.4s" }}>
                    <div className="card-body">
                      <div className="row no-gutters align-items-center">
                        <div className="col mr-2">
                          <div className="text-xs font-weight-bold text-white text-uppercase mb-1">
                            Recommended Monthly Saving
                          </div>
                          <div className="h3 mb-0 font-weight-bold text-white">
                            {formatCurrency(monthlySavings)}
                          </div>
                          <div className="text-white-50 small mt-2">
                            To reach your goal by {formatDate(goal.target_date)}
                          </div>
                        </div>
                        <div className="col-auto">
                          <i className="fas fa-chart-line fa-3x text-white-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {goal.notes && (
                  <div className="card bg-light mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.5s" }}>
                    <div className="card-body">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Notes
                      </div>
                      <p className="mb-0">{goal.notes}</p>
                    </div>
                  </div>
                )}

                <div className="text-center mt-4">
                  <button onClick={() => setViewMode("form")} className="btn btn-light btn-icon-split mr-2">
                    <span className="icon text-gray-600">
                      <i className="fas fa-arrow-left"></i>
                    </span>
                    <span className="text">Back to Edit</span>
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="btn btn-success btn-icon-split"
                  >
                    <span className="icon text-white-50">
                      <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                    </span>
                    <span className="text">{isSubmitting ? "Creating..." : "Create Goal"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Create New Goal</h1>
        <Link to="/goals" className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Goals
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Goal Information</h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleReview}>
                <div className="form-group">
                  <label htmlFor="goal_name" className="font-weight-bold text-gray-800">
                    Goal Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="goal_name"
                    name="goal_name"
                    value={goal.goal_name}
                    onChange={handleChange}
                    className="form-control form-control-user"
                    placeholder="e.g., Vacation, Emergency Fund, New Car"
                    required
                  />
                  <small className="form-text text-muted">
                    Give your goal a clear, specific name
                  </small>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="target_amount" className="font-weight-bold text-gray-800">
                        Target Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          id="target_amount"
                          name="target_amount"
                          value={goal.target_amount}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="current_amount" className="font-weight-bold text-gray-800">
                        Current Amount (Optional)
                      </label>
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text">₱</span>
                        </div>
                        <input
                          type="number"
                          id="current_amount"
                          name="current_amount"
                          value={goal.current_amount}
                          onChange={handleChange}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <small className="form-text text-muted">
                        Money you've already saved towards this goal
                      </small>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="target_date" className="font-weight-bold text-gray-800">
                        Target Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="target_date"
                        name="target_date"
                        value={goal.target_date}
                        onChange={handleChange}
                        className="form-control"
                        required
                      />
                      <small className="form-text text-muted">
                        When do you want to achieve this goal?
                      </small>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="priority" className="font-weight-bold text-gray-800">
                        Priority <span className="text-danger">*</span>
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={goal.priority}
                        onChange={handleChange}
                        className="form-control"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <small className="form-text text-muted">
                        How important is this goal to you?
                      </small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes" className="font-weight-bold text-gray-800">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={goal.notes}
                    onChange={handleChange}
                    className="form-control"
                    rows={4}
                    placeholder="Add any additional details or motivation for your goal"
                  ></textarea>
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <button type="submit" className="btn btn-primary btn-icon-split">
                    <span className="icon text-white-50">
                      <i className="fas fa-arrow-right"></i>
                    </span>
                    <span className="text">Continue to Review</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Goal Tips Card */}
        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.3s" }}>
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Goal Setting Tips</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-bullseye text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Specific</p>
                </div>
                <p className="text-sm ml-5 mb-0">Clearly define what you want to achieve</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-balance-scale text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Be Realistic</p>
                </div>
                <p className="text-sm ml-5 mb-0">Set achievable targets based on your income</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-clock text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Set Deadlines</p>
                </div>
                <p className="text-sm ml-5 mb-0">Time-bound goals keep you motivated</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(54, 185, 204, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-tasks text-info"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Break it Down</p>
                </div>
                <p className="text-sm ml-5 mb-0">Large goals are easier as monthly targets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGoal;
