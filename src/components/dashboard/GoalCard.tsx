import React, { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getRemainingDays,
} from "../../utils/helpers";
import { Goal } from "../../types";

interface GoalCardProps {
  goal: Goal & {
    goal_name?: string;
    target_date: string;
    current_amount: number;
    target_amount: number;
    priority?: "high" | "medium" | "low";
  };
}

const GoalCard: FC<GoalCardProps> = ({ goal }) => {
  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const daysRemaining = getRemainingDays(goal.target_date);

  // Determine status color and icon
  let statusColor: string, statusIcon: ReactNode;
  if (progressPercentage >= 75) {
    statusColor = "success";
    statusIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  } else if (progressPercentage >= 40) {
    statusColor = "warning";
    statusIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  } else {
    statusColor = "danger";
    statusIcon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-text-color flex items-center">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-2 bg-${statusColor}-color bg-opacity-10 text-${statusColor}-color`}
            >
              {statusIcon}
            </span>
            <Link
              to={`/goals/${goal.id}`}
              className="hover:text-primary-color transition-colors"
            >
              {goal.goal_name || goal.name}
            </Link>
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${goal.priority === "high" ? "bg-danger-color bg-opacity-10 text-danger-color" : "bg-warning-color bg-opacity-10 text-warning-color"}`}
          >
            {goal.priority === "high" ? "High" : "Medium"} Priority
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
          <div className="flex flex-col">
            <span className="text-text-muted">Target</span>
            <span className="font-medium">
              {formatCurrency(
                Number(goal.target_amount || goal.targetAmount || 0)
              )}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Current</span>
            <span className="font-medium">
              {formatCurrency(
                Number(goal.current_amount || goal.currentAmount || 0)
              )}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Due Date</span>
            <span className="font-medium">
              {formatDate(goal.target_date || goal.deadline || "")}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted">Time Left</span>
            <span
              className={`font-medium ${daysRemaining < 7 ? "text-danger-color" : ""}`}
            >
              {daysRemaining} days
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="progress-container">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className={`font-medium text-${statusColor}-color`}>
              {formatPercentage(progressPercentage)}
            </span>
            <span className="text-text-muted">
              {formatCurrency(goal.target_amount - goal.current_amount)} to go
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress ${statusColor}`}
              style={{
                width: `${progressPercentage > 100 ? 100 : progressPercentage}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
