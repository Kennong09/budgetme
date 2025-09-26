import React, { FC } from "react";
import { BudgetStats } from "./types";

interface BudgetStatsCardsProps {
  stats: BudgetStats;
  loading?: boolean;
}

const BudgetStatsCards: FC<BudgetStatsCardsProps> = ({ stats, loading = false }) => {
  return (
    <div className="row">
      {/* Total Budgets Card */}
      <div className="col-xl-3 col-md-6 mb-4">
        <div className="card border-left-primary shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                  Total Budgets
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    stats.totalBudgets
                  )}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-calendar fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Budgets Card */}
      <div className="col-xl-3 col-md-6 mb-4">
        <div className="card border-left-success shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                  Active Budgets
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    stats.activeBudgets
                  )}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Categories Card */}
      <div className="col-xl-3 col-md-6 mb-4">
        <div className="card border-left-danger shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                  Budget Categories
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    stats.budgetCategories
                  )}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-tags fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Count Card */}
      <div className="col-xl-3 col-md-6 mb-4">
        <div className="card border-left-info shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                  Users with Budgets
                </div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    stats.usersWithBudgets
                  )}
                </div>
              </div>
              <div className="col-auto">
                <i className="fas fa-users fa-2x text-gray-300"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetStatsCards;