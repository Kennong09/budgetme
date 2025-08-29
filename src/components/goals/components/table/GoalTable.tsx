import React, { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Goal, FilterState } from '../../types';
import { formatCurrency, formatDate, formatPercentage, getRemainingDays, calculateMonthlySavingsForGoal } from '../../../../utils/helpers';
import { formatStatusName } from '../../utils/goalUtils';
import { useAuth } from '../../../../utils/AuthContext';
import GoalFilters from '../filters/GoalFilters';

interface GoalTableProps {
  filteredGoals: Goal[];
  isFiltering: boolean;
  filter: FilterState;
  onFilterChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onResetFilters: () => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleTip: (tipId: string, event?: React.MouseEvent) => void;
  isFamilyMember: boolean;
}

const GoalTable: React.FC<GoalTableProps> = ({
  filteredGoals,
  isFiltering,
  filter,
  onFilterChange,
  onResetFilters,
  onDeleteGoal,
  onToggleTip,
  isFamilyMember
}) => {
  const { user } = useAuth();

  return (
    <div className="card shadow mb-4 transaction-table">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          Goal List
          <div className="ml-2 position-relative">
            <i 
              className="fas fa-info-circle text-gray-400 cursor-pointer" 
              onClick={(e) => onToggleTip('goalList', e)}
              aria-label="Goal list information"
              style={{ cursor: "pointer" }}
            ></i>
          </div>
        </h6>
        <div>
          <button 
            className="btn btn-sm btn-outline-secondary mr-2" 
            onClick={onResetFilters}
            disabled={isFiltering}
          >
            <i className="fas fa-undo fa-sm mr-1"></i> Reset Filters
          </button>
          <button className="btn btn-sm btn-outline-primary">
            <i className="fas fa-download fa-sm mr-1"></i> Export
          </button>
        </div>
      </div>
      
      {/* Integrated Filters Section */}
      <GoalFilters
        filter={filter}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        isFiltering={isFiltering}
        isFamilyMember={isFamilyMember}
        showAsCard={false}
      />

      {/* Table Section */}
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered" width="100%" cellSpacing="0">
            <thead>
              <tr>
                <th>Goal Name</th>
                <th>Target Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFiltering ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    <p className="text-gray-600 mt-3">Filtering goals...</p>
                  </td>
                </tr>
              ) : filteredGoals.length > 0 ? (
                filteredGoals.map((goal) => {
                  const progressPercentage = Math.min(goal.percentage, 100);
                  const priorityClass = goal.priority === "high" ? "text-danger" : 
                                       goal.priority === "medium" ? "text-warning" : "text-info";
                  const statusClass = goal.status === "completed" ? "badge-success" : 
                                     goal.status === "in_progress" ? "badge-primary" :
                                     goal.status === "not_started" ? "badge-secondary" : "badge-danger";
                  
                  const monthlySavingsNeeded: number = calculateMonthlySavingsForGoal({
                    target_amount: goal.target_amount,
                    current_amount: goal.current_amount,
                    target_date: goal.target_date
                  });

                  return (
                    <tr key={goal.id}>
                      <td>
                        <div className="font-weight-bold">
                          {goal.goal_name}
                        </div>
                        {goal.is_shared && (
                          <div className="small mt-1">
                            <span className="badge badge-info">
                              <i className="fas fa-users mr-1"></i> Family
                            </span>
                            {goal.shared_by_name && (
                              <span className="badge badge-light ml-1 small">
                                {goal.shared_by_name}
                              </span>
                            )}
                          </div>
                        )}
                        {!goal.is_shared && (
                          <div className="small mt-1">
                            <span className="badge badge-secondary">
                              <i className="fas fa-user mr-1"></i> Personal
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{formatDate(goal.target_date)}</div>
                        <div className="small text-gray-600">
                          {getRemainingDays(goal.target_date) > 0 ? 
                            `${getRemainingDays(goal.target_date)} days left` : 
                            <span className="text-danger">Past due</span>
                          }
                        </div>
                      </td>
                      <td>
                        <span className={`font-weight-bold ${priorityClass}`}>
                          <i className={`fas fa-flag mr-1 ${priorityClass}`}></i>
                          {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {formatStatusName(goal.status)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress mr-2" style={{ height: '10px', width: '80px' }}>
                            <div 
                              className={`progress-bar ${
                                progressPercentage >= 90 ? "bg-success" : 
                                progressPercentage >= 50 ? "bg-info" : 
                                progressPercentage >= 25 ? "bg-warning" : 
                                "bg-danger"
                              }`}
                              role="progressbar" 
                              style={{ width: `${progressPercentage}%` }}
                              aria-valuenow={progressPercentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>
                          <span>{formatPercentage(progressPercentage)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="font-weight-bold">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </span>
                          <small className="text-gray-600">
                            {formatCurrency(monthlySavingsNeeded)} monthly
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex justify-content-center align-items-center">
                          <Link
                            to={`/goals/${goal.id}`}
                            className="btn btn-info btn-circle btn-sm mx-1"
                            title="View Goal"
                          >
                            <i className="fas fa-eye"></i>
                          </Link>
                          {/* Show edit and delete buttons for personal goals */}
                          {!goal.is_shared && (
                            <>
                              <Link
                                to={`/goals/${goal.id}/edit`}
                                className="btn btn-primary btn-circle btn-sm mx-1"
                                title="Edit Goal"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                              <button
                                className="btn btn-danger btn-circle btn-sm mx-1"
                                onClick={() => onDeleteGoal(goal.id)}
                                title="Delete Goal"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                          {/* Allow editing shared goals if user is the owner */}
                          {goal.is_shared && goal.user_id === user?.id && (
                            <>
                              <Link
                                to={`/goals/${goal.id}/edit`}
                                className="btn btn-primary btn-circle btn-sm mx-1"
                                title="Edit Goal"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                              <button
                                className="btn btn-danger btn-circle btn-sm mx-1"
                                onClick={() => onDeleteGoal(goal.id)}
                                title="Delete Goal"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    <i className="fas fa-filter fa-2x text-gray-300 mb-3 d-block"></i>
                    <p className="text-gray-500">No goals found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GoalTable;