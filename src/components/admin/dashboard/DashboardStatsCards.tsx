import React, { FC } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "./types";

interface DashboardStatsCardsProps {
  statCards: StatCard[];
  loading?: boolean;
}

const DashboardStatsCards: FC<DashboardStatsCardsProps> = ({ statCards, loading = false }) => {
  if (loading) {
    return (
      <div className="row">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
            <div className="card border-left-primary shadow h-100 py-2 admin-card">
              <div className="card-body py-2 px-3 py-sm-2 px-sm-3">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      <i className="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      --
                    </div>
                  </div>
                  <div className="col-auto d-none d-sm-block">
                    <i className="fas fa-spinner fa-spin fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="row">
      {statCards.map((card, index) => (
        <div key={index} className="col-xl-3 col-md-6 col-sm-12 mb-4">
          <div className={`card border-left-${card.color} shadow h-100 py-2 admin-card`}>
            <div className="card-body py-2 px-3 py-sm-2 px-sm-3">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className={`text-xs font-weight-bold text-${card.color} text-uppercase mb-1`}>
                    {card.title}
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {card.value}
                  </div>
                  {card.change && (
                    <div className={`text-xs mt-2 font-weight-bold ${
                      card.changeType === "increase" ? "text-success" : 
                      card.changeType === "decrease" ? "text-danger" : "text-muted"
                    }`}>
                      <i className={`fas ${
                        card.changeType === "increase" ? "fa-arrow-up" :
                        card.changeType === "decrease" ? "fa-arrow-down" : "fa-equals"
                      } mr-1`}></i>
                      {card.change} since last month
                    </div>
                  )}
                </div>
                <div className="col-auto d-none d-sm-block">
                  <i className={`fas ${card.icon} fa-2x text-gray-300`}></i>
                </div>
              </div>
            </div>
            <Link to={card.link} className="card-footer text-center small text-primary">
              <span>View Details</span>
              <i className="fas fa-chevron-right ml-2"></i>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStatsCards;