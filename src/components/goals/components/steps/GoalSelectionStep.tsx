import React from 'react';
import { Goal as GoalType } from '../../../../types';
import { formatCurrency, formatPercentage, getRemainingDays } from '../../../../utils/helpers';
import { ContributionValidation } from '../utils/ContributionValidation';

interface GoalSelectionStepProps {
  eligibleGoals: GoalType[];
  onGoalSelection: (goal: GoalType) => void;
}

const GoalSelectionStep: React.FC<GoalSelectionStepProps> = ({
  eligibleGoals,
  onGoalSelection
}) => {
  if (eligibleGoals.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mb-6">
          <i className="fas fa-exclamation-circle text-6xl text-yellow-500 animate-pulse"></i>
        </div>
        <h4 className="text-gray-700 mb-4 text-xl font-semibold">No Active Goals Available</h4>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">You don't have any active goals to contribute to. Create a new goal to start tracking your financial objectives.</p>
        <button 
          type="button" 
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <i className="fas fa-plus mr-2"></i>
          <span>Create a New Goal</span>
        </button>
      </div>
    );
  }

  const goalStats = ContributionValidation.calculateGoalStatistics(eligibleGoals);

  return (
    <div>
      {/* Header with Statistics */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-3 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Choose Your Goal
          </h2>
          <p className="text-gray-500 text-sm">You have {eligibleGoals.length} active goal{eligibleGoals.length !== 1 ? 's' : ''} ready for contributions</p>
        </div>
        <div className="text-center md:text-right">
          <div className="text-xs uppercase text-gray-500 font-bold mb-1">Total Progress</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatPercentage(goalStats.overallProgress)}
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="space-y-3">
        {eligibleGoals.map((goal) => {
          const analytics = ContributionValidation.calculateGoalCardAnalytics(goal);
          
          return (
            <div key={goal.id} className="w-full">
              <div 
                className={`bg-white rounded-lg shadow-sm border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                  analytics.isNearComplete ? 'border-l-green-500' : analytics.isUrgent ? 'border-l-yellow-500' : 'border-l-blue-500'
                } border border-gray-200`}
                onClick={() => onGoalSelection(goal)}
              >
                <div className="p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                        analytics.isNearComplete ? 'bg-green-500' : analytics.isUrgent ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}>
                        <i className="fas fa-bullseye text-sm"></i>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-800 text-base leading-tight">{goal.goal_name}</h3>
                        {(analytics.isUrgent || analytics.isNearComplete) && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${
                            analytics.isNearComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {analytics.isNearComplete ? 'Near Complete' : 'Urgent'}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            analytics.progressPercentage >= 75 ? 'bg-green-500' :
                            analytics.progressPercentage >= 40 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(analytics.progressPercentage, 100)}%` }}
                        ></div>
                      </div>
                      
                      {/* Goal Details */}
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase text-gray-500 font-semibold">Progress</span>
                          <span className="text-green-600 text-xs font-medium">{formatPercentage(analytics.progressPercentage)} Complete</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-600 text-sm">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase text-gray-500 font-semibold">Remaining</span>
                          <span className="font-medium text-orange-600 text-sm">
                            {formatCurrency(analytics.remainingAmount)}
                          </span>
                        </div>
                        
                        {analytics.remainingDays !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs uppercase text-gray-500 font-semibold">Days Left</span>
                            <span className={`text-xs font-medium ${
                              analytics.remainingDays <= 30 ? 'text-red-600' : 
                              analytics.remainingDays <= 90 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {analytics.remainingDays > 0 ? `${analytics.remainingDays} days` : 'Overdue'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Insights */}
                      {analytics.remainingDays !== null && analytics.remainingDays > 0 && analytics.dailyTarget && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 flex items-center">
                              <i className="fas fa-lightbulb text-yellow-500 mr-1 text-xs"></i>
                              Daily: {formatCurrency(analytics.dailyTarget)}
                            </span>
                            <span className={`font-medium ${
                              analytics.progressPercentage >= 50 ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {analytics.progressPercentage >= 50 ? 'On Track' : 'Needs Attention'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <i className="fas fa-chevron-right text-gray-400"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoalSelectionStep;
