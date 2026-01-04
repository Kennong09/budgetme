import React from 'react';
import { Goal as GoalType } from '../../../../types';
import { Account } from '../../../settings/types';
import { ContributionData } from '../types/ContributionTypes';
import { formatCurrency, formatPercentage } from '../../../../utils/helpers';
import { ContributionValidation } from '../utils/ContributionValidation';

interface ReviewStepProps {
  selectedGoal: GoalType;
  selectedAccount: Account;
  contributionData: ContributionData;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  selectedGoal,
  selectedAccount,
  contributionData,
  error,
  isSubmitting,
  onBack,
  onSubmit
}) => {
  const contributionAmount = parseFloat(contributionData.amount);
  const newProgress = ContributionValidation.calculateNewProgress(selectedGoal, contributionAmount);

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
          <div className="flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Contributing To Goal */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          Contributing To Goal
        </label>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4">
              <i className="fas fa-flag text-2xl text-blue-600"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 mb-1">{selectedGoal.goal_name}</h3>
              <div className="text-xs text-gray-600 mb-2">
                Current Progress: {formatPercentage((selectedGoal.current_amount / selectedGoal.target_amount) * 100)} • 
                {' '}{formatCurrency(selectedGoal.current_amount)} of {formatCurrency(selectedGoal.target_amount)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 75 ? 'bg-green-500' :
                    ((selectedGoal.current_amount / selectedGoal.target_amount) * 100) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Suggestions Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <i className="fas fa-check-circle text-lg text-green-600 mr-3 mt-0.5"></i>
          <div>
            <div className="font-semibold text-green-800 mb-1">Ready to Contribute!</div>
            <div className="text-sm text-green-700">
              You're contributing {formatCurrency(contributionAmount)} from {selectedAccount.account_name}.
              {(() => {
                if (newProgress.willComplete) {
                  return <span className="block mt-1">🎉 This will complete your goal!</span>;
                } else {
                  return <span className="block mt-1">Just {formatCurrency(newProgress.remainingAfterContribution)} more to reach your goal!</span>;
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Amount <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">₱</span>
            </div>
            <input
              type="text"
              value={contributionAmount.toFixed(2)}
              className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
              disabled
              readOnly
            />
          </div>
          <small className="text-gray-500 text-xs mt-1 block">
            The amount you're contributing towards this goal
          </small>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            From Account <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={selectedAccount.account_name}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
            disabled
            readOnly
          />
          <small className="text-gray-500 text-xs mt-1 block">
            Available balance: {formatCurrency(selectedAccount.balance)}
          </small>
        </div>
      </div>

      {contributionData.notes && (
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={contributionData.notes}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm resize-none"
            rows={3}
            disabled
            readOnly
          ></textarea>
        </div>
      )}

      {/* New Progress Preview */}
      <div className="bg-white border-l-4 border-l-green-500 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="text-xs font-bold text-green-600 uppercase mb-2 flex items-center">
            <i className="fas fa-arrow-up mr-2"></i>New Goal Progress After Contribution
          </div>
          <div className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-3">
            <span>{formatCurrency(newProgress.newAmount)} / {formatCurrency(selectedGoal.target_amount)}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {formatPercentage(newProgress.newProgress)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-green-600"
              style={{width: `${Math.min(newProgress.newProgress, 100)}%`}}
            ></div>
          </div>
        </div>
      </div>

      {/* Desktop Footer - Hidden on mobile since mobile footer handles navigation */}
      <div className="hidden md:flex justify-between pt-6 border-t border-gray-200">
        <button 
          type="button" 
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Edit
        </button>
        <button 
          onClick={onSubmit} 
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <i className={`fas ${isSubmitting ? "fa-spinner fa-spin" : "fa-check"} mr-2`}></i>
          {isSubmitting ? "Processing..." : "Confirm Contribution"}
        </button>
      </div>
    </>
  );
};

export default ReviewStep;
