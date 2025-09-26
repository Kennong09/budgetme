import React, { FC } from "react";
import { Link } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Budget } from "./types";

interface BudgetDetailModalProps {
  budget: Budget | null;
  show: boolean;
  onClose: () => void;
  onStatusChange: (budget: Budget, newStatus: "active" | "completed" | "archived") => void;
}

const BudgetDetailModal: FC<BudgetDetailModalProps> = ({
  budget,
  show,
  onClose,
  onStatusChange
}) => {
  if (!show || !budget) return null;

  // Get budget progress chart options
  const getBudgetProgressChartOptions = (budget: Budget) => {
    const remaining = budget.amount - budget.spent;
    
    return {
      chart: {
        type: "pie",
        height: 200
      },
      credits: {
        enabled: false
      },
      title: {
        text: "Budget Utilization"
      },
      tooltip: {
        pointFormat: "{series.name}: <b>${point.y}</b> ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: ${point.y}"
          }
        }
      },
      series: [
        {
          name: "Amount",
          colorByPoint: true,
          data: [
            { name: "Spent", y: budget.spent, color: "#e74a3b" },
            { name: "Remaining", y: remaining > 0 ? remaining : 0, color: "#1cc88a" }
          ]
        }
      ]
    };
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "active": return "badge-primary";
      case "completed": return "badge-success";
      default: return "badge-secondary";
    }
  };

  const getStatusButtonClass = (currentStatus: string, buttonStatus: string) => {
    return currentStatus === buttonStatus ? "btn-" : "btn-outline-";
  };

  return (
    <div
      className="modal fade show"
      style={{
        display: "block",
        backgroundColor: "rgba(0, 0, 0, 0.5)"
      }}
      aria-modal="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Budget Details: {budget.name}
            </h5>
            <button
              type="button"
              className="close"
              onClick={onClose}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <h6 className="font-weight-bold mb-3">Budget Information</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className="font-weight-bold">Budget ID:</td>
                      <td>{budget.id}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Name:</td>
                      <td>{budget.name}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Category:</td>
                      <td>{budget.category}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Amount:</td>
                      <td>${budget.amount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Spent:</td>
                      <td>${budget.spent.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Remaining:</td>
                      <td>${(budget.amount - budget.spent).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Start Date:</td>
                      <td>{new Date(budget.start_date).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">End Date:</td>
                      <td>{new Date(budget.end_date).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Status:</td>
                      <td>
                        <span className={`badge ${getBadgeClass(budget.status)}`}>
                          {budget.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <h6 className="font-weight-bold mb-3 mt-4">User Information</h6>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className="font-weight-bold">User ID:</td>
                      <td>{budget.user_id}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Name:</td>
                      <td>{budget.user_name}</td>
                    </tr>
                    <tr>
                      <td className="font-weight-bold">Email:</td>
                      <td>{budget.user_email}</td>
                    </tr>
                  </tbody>
                </table>
                
                <h6 className="border-bottom pb-2 mb-3 mt-4">Change Status</h6>
                <div className="btn-group">
                  <button 
                    className={`btn btn-sm ${getStatusButtonClass(budget.status, "active")}primary`}
                    onClick={() => onStatusChange(budget, "active")}
                  >
                    <i className="fas fa-play-circle mr-1"></i> Active
                  </button>
                  <button 
                    className={`btn btn-sm ${getStatusButtonClass(budget.status, "completed")}success`}
                    onClick={() => onStatusChange(budget, "completed")}
                  >
                    <i className="fas fa-check-circle mr-1"></i> Completed
                  </button>
                  <button 
                    className={`btn btn-sm ${getStatusButtonClass(budget.status, "archived")}secondary`}
                    onClick={() => onStatusChange(budget, "archived")}
                  >
                    <i className="fas fa-archive mr-1"></i> Archived
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card mb-4">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">Budget Progress</h6>
                  </div>
                  <div className="card-body">
                    <HighchartsReact 
                      highcharts={Highcharts} 
                      options={getBudgetProgressChartOptions(budget)} 
                    />
                    
                    <div className="text-center mt-3">
                      <h4 className="small font-weight-bold">
                        Overall Progress <span className="float-right">
                          {Math.round((budget.spent / budget.amount) * 100)}%
                        </span>
                      </h4>
                      <div className="progress mb-4">
                        <div
                          className="progress-bar bg-danger"
                          role="progressbar"
                          style={{ width: `${Math.round((budget.spent / budget.amount) * 100)}%` }}
                          aria-valuenow={Math.round((budget.spent / budget.amount) * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">Actions</h6>
                  </div>
                  <div className="card-body">
                    <div className="btn-group w-100 mb-3">
                      <button className="btn btn-outline-primary">
                        <i className="fas fa-edit mr-1"></i> Edit Budget
                      </button>
                      <button className="btn btn-outline-danger">
                        <i className="fas fa-trash mr-1"></i> Delete Budget
                      </button>
                    </div>
                    
                    <Link to={`/admin/users/${budget.user_id}`} className="btn btn-info w-100">
                      <i className="fas fa-user mr-1"></i> View User Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDetailModal;