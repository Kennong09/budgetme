import React from 'react';
import { RecentActivity } from '../types';
import { formatDate } from '../../../utils/helpers';

interface ActivityTabProps {
  recentActivity: RecentActivity[];
}

const ActivityTab: React.FC<ActivityTabProps> = ({ recentActivity }) => {
  return (
    <div className="animate__animated animate__fadeIn">
      {recentActivity.length > 0 ? (
        <ul className="list-group list-group-flush">
          {recentActivity.map(activity => (
            <li key={activity.id} className="list-group-item d-flex align-items-center">
              <div 
                className={`mr-3 text-white rounded-circle d-flex align-items-center justify-content-center bg-primary`} 
                style={{width: '40px', height: '40px'}}
              >
                <i className={`fas ${activity.icon}`}></i>
              </div>
              <div>
                <strong>{activity.user}</strong> {activity.description}
                <div className="small text-gray-500">{formatDate(activity.date)}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center p-4">
          <div className="mb-3">
            <i className="fas fa-history fa-3x text-gray-300"></i>
          </div>
          <h5 className="text-gray-500 font-weight-light">No recent activity</h5>
          <p className="text-gray-500 mb-3 small">
            Family activity feed will be shown here as you and your family members take financial actions.
          </p>
          <div className="row justify-content-center">
            <div className="col-md-4">
              <div className="card bg-light mb-3 shadow-sm">
                <div className="card-body text-center py-3">
                  <i className="fas fa-user-plus text-primary mb-2"></i>
                  <p className="mb-0 small">Add family members</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light mb-3 shadow-sm">
                <div className="card-body text-center py-3">
                  <i className="fas fa-money-bill-alt text-success mb-2"></i>
                  <p className="mb-0 small">Record transactions</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light mb-3 shadow-sm">
                <div className="card-body text-center py-3">
                  <i className="fas fa-flag-checkered text-warning mb-2"></i>
                  <p className="mb-0 small">Create shared goals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
