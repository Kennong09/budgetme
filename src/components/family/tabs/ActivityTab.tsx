import React from 'react';
import { RecentActivity } from '../types';
import { formatDate } from '../../../utils/helpers';

interface ActivityTabProps {
  recentActivity: RecentActivity[];
}

const ActivityTab: React.FC<ActivityTabProps> = ({ recentActivity }) => {
  // Get icon background color based on activity type
  const getIconBgClass = (type: string) => {
    switch (type) {
      case 'join': return 'bg-emerald-500';
      case 'goal': return 'bg-amber-500';
      case 'transaction': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getMobileIconBgClass = (type: string) => {
    switch (type) {
      case 'join': return 'bg-emerald-100 text-emerald-600';
      case 'goal': return 'bg-amber-100 text-amber-600';
      case 'transaction': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Mobile Activity View */}
      <div className="block md:hidden">
        {recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map(activity => (
              <div key={activity.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getMobileIconBgClass(activity.type)}`}>
                    <i className={`fas ${activity.icon} text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{activity.user}</span>{' '}
                      <span className="text-gray-600">{activity.description}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      <i className="fas fa-clock mr-1 text-[8px]"></i>
                      {formatDate(activity.date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-history text-gray-400 text-lg"></i>
            </div>
            <h5 className="text-sm text-gray-500 font-medium mb-1">No recent activity</h5>
            <p className="text-[11px] text-gray-400 mb-4 px-4">
              Family activity will appear here as you and your family members take financial actions.
            </p>
            
            {/* Quick action suggestions */}
            <div className="grid grid-cols-3 gap-2 px-3">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1.5">
                  <i className="fas fa-user-plus text-emerald-500 text-xs"></i>
                </div>
                <p className="text-[9px] text-gray-500 text-center">Add members</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-1.5">
                  <i className="fas fa-money-bill-alt text-indigo-500 text-xs"></i>
                </div>
                <p className="text-[9px] text-gray-500 text-center">Record transactions</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-1.5">
                  <i className="fas fa-flag-checkered text-amber-500 text-xs"></i>
                </div>
                <p className="text-[9px] text-gray-500 text-center">Create goals</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Activity View */}
      <div className="d-none d-md-block">
        {recentActivity.length > 0 ? (
          <ul className="list-group list-group-flush">
            {recentActivity.map(activity => (
              <li key={activity.id} className="list-group-item d-flex align-items-center">
                <div 
                  className={`mr-3 text-white rounded-circle d-flex align-items-center justify-content-center ${getIconBgClass(activity.type)}`} 
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
    </div>
  );
};

export default ActivityTab;
