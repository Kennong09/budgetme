import React from 'react';
import { ModalStep, GoalAnalytics } from '../types/ContributionTypes';
import { Goal as GoalType } from '../../../../types';
import { Account } from '../../../settings/types';
import { formatCurrency, formatPercentage, formatDate, getRemainingDays } from '../../../../utils/helpers';
import { ContributionValidation } from '../utils/ContributionValidation';

interface ContributionSidebarProps {
  currentStep: ModalStep;
  selectedGoal?: GoalType | null;
  selectedAccount?: Account | null;
  contributionAmount?: string;
  eligibleGoals?: GoalType[];
  onTipClick?: (tipId: string, event?: React.MouseEvent) => void;
}

const ContributionSidebar: React.FC<ContributionSidebarProps> = ({
  currentStep,
  selectedGoal,
  selectedAccount,
  contributionAmount,
  eligibleGoals = [],
  onTipClick
}) => {
  const renderSelectionSidebar = () => (
    <>
      {/* Contribution Tips */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center text-gray-800 font-semibold">
            <i className="fas fa-lightbulb text-blue-600 mr-2"></i>
            <span>Smart Tips</span>
            {onTipClick && (
              <i 
                className="fas fa-info-circle ml-2 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors"
                onClick={(e) => onTipClick('contribution-tips', e)}
              ></i>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-chart-line text-sm"></i>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Prioritize High Impact</div>
                <div className="text-gray-500 text-xs">Focus on goals closest to completion</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-clock text-sm"></i>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Mind the Deadlines</div>
                <div className="text-gray-500 text-xs">Urgent goals need immediate attention</div>
              </div>
            </div>
          </div>

          <div className="mb-0">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-coins text-sm"></i>
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Regular Contributions</div>
                <div className="text-gray-500 text-xs">Small, consistent amounts work best</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Analytics Summary */}
      {eligibleGoals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center text-gray-800 font-semibold">
              <i className="fas fa-chart-bar text-blue-600 mr-2"></i>
              <span>Your Goals Overview</span>
              {onTipClick && (
                <i 
                  className="fas fa-info-circle ml-2 text-gray-400 cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={(e) => onTipClick('goal-analytics', e)}
                ></i>
              )}
            </div>
          </div>
          <div className="p-4">
            {(() => {
              const stats = ContributionValidation.calculateGoalStatistics(eligibleGoals);
              return (
                <>
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">Total Goals</span>
                      <span className="font-bold text-blue-600">{stats.totalGoals}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">Total Target</span>
                      <span className="font-bold text-green-600">{formatCurrency(stats.totalTarget)}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">Current Total</span>
                      <span className="font-bold text-cyan-600">{formatCurrency(stats.totalCurrent)}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase">Remaining</span>
                      <span className="font-bold text-orange-600">{formatCurrency(stats.totalRemaining)}</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(stats.overallProgress, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    <small className="text-gray-500">
                      Overall Progress: {formatPercentage(stats.overallProgress)}
                    </small>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );

  const renderContributionSidebar = () => (
    <>
      {/* Goal Tips */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h6 className="text-gray-800 font-semibold">Goal Tips</h6>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-piggy-bank text-sm"></i>
              </div>
              <p className="font-semibold text-gray-800 mb-0">Regular Contributions</p>
            </div>
            <p className="text-sm text-gray-500 ml-11">Small regular contributions add up quickly</p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-calendar-check text-sm"></i>
              </div>
              <p className="font-semibold text-gray-800 mb-0">Set Up Auto-Savings</p>
            </div>
            <p className="text-sm text-gray-500 ml-11">Automate transfers to meet goal deadlines</p>
          </div>

          <div className="mb-0">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <i className="fas fa-bolt text-sm"></i>
              </div>
              <p className="font-semibold text-gray-800 mb-0">Bonus Contributions</p>
            </div>
            <p className="text-sm text-gray-500 ml-11">Add windfalls or bonuses to accelerate progress</p>
          </div>
        </div>
      </div>
      
      {/* Goal Summary Card */}
      {selectedGoal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h6 className="text-gray-800 font-semibold">Goal Summary</h6>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <div className="text-xs font-bold text-blue-600 uppercase mb-2">Current Progress</div>
              <div className="mb-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 75 ? "bg-green-500" : 
                      ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 40 ? "bg-yellow-500" : 
                      "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <small className="text-gray-500">
                    {formatCurrency(selectedGoal.current_amount)}
                  </small>
                  <small className="text-gray-500">
                    {formatCurrency(selectedGoal.target_amount)}
                  </small>
                </div>
              </div>
              
              <div className="flex justify-between mt-3">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Remaining</div>
                  <div className="font-bold text-gray-800">{formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">Target Date</div>
                  <div className="font-bold text-gray-800">{formatDate(selectedGoal.target_date)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderReviewSidebar = () => (
    <>
      {/* Contribution Summary */}
      {selectedGoal && selectedAccount && contributionAmount && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h6 className="text-gray-800 font-semibold">Contribution Summary</h6>
          </div>
          <div className="p-4">
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Amount</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(parseFloat(contributionAmount))}</div>
            </div>
            
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">From Account</div>
              <div className="font-bold text-gray-800">{selectedAccount.account_name}</div>
              <div className="text-xs text-gray-500 mt-1">Balance: {formatCurrency(selectedAccount.balance)}</div>
            </div>
            
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Goal</div>
              <div className="font-bold text-gray-800">{selectedGoal.goal_name}</div>
            </div>
            
            <div className="mb-0">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Target Date</div>
              <div className="font-bold text-gray-800">{formatDate(selectedGoal.target_date)}</div>
              {selectedGoal.target_date && (() => {
                const daysRemaining = getRemainingDays(selectedGoal.target_date);
                return (
                  <div className={`text-xs mt-1 ${
                    daysRemaining < 0 ? 'text-red-600' :
                    daysRemaining <= 30 ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` :
                     daysRemaining === 0 ? 'Due today' :
                     `${daysRemaining} days remaining`}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Goal Impact */}
      {selectedGoal && contributionAmount && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-green-50 rounded-t-lg">
            <h6 className="text-green-800 font-semibold">Goal Impact</h6>
          </div>
          <div className="p-4">
            {(() => {
              const amount = parseFloat(contributionAmount);
              const newProgress = ContributionValidation.calculateNewProgress(selectedGoal, amount);
              
              return (
                <>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="fas fa-chart-line text-sm"></i>
                      </div>
                      <p className="font-semibold text-gray-800 mb-0">Progress Boost</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">
                      Your goal will increase by {formatPercentage((amount / selectedGoal.target_amount) * 100)}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="fas fa-bullseye text-sm"></i>
                      </div>
                      <p className="font-semibold text-gray-800 mb-0">Remaining Amount</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">
                      {formatCurrency(newProgress.remainingAfterContribution)} left after this contribution
                    </p>
                  </div>

                  <div className="mb-0">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="fas fa-check-circle text-sm"></i>
                      </div>
                      <p className="font-semibold text-gray-800 mb-0">Completion Status</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">
                      {ContributionValidation.getCompletionStatusMessage(newProgress.newProgress)}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {currentStep === 'selection' && renderSelectionSidebar()}
      {currentStep === 'contribution' && renderContributionSidebar()}
      {currentStep === 'review' && renderReviewSidebar()}
    </>
  );
};

export default ContributionSidebar;
