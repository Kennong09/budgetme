import React, { ChangeEvent, FormEvent } from 'react';
import { Goal as GoalType } from '../../../../types';
import { Account } from '../../../settings/types';
import { ContributionData } from '../types/ContributionTypes';
import { formatCurrency, formatPercentage, formatDate, getRemainingDays } from '../../../../utils/helpers';
import AccountSelector from '../../../transactions/components/AccountSelector';

interface ContributionFormStepProps {
  selectedGoal: GoalType;
  contributionData: ContributionData;
  selectedAccount: Account | null;
  error: string | null;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAccountSelect: (account: Account | null) => void;
  onBackToSelection: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onAmountChange: (amount: string) => void;
}

const ContributionFormStep: React.FC<ContributionFormStepProps> = ({
  selectedGoal,
  contributionData,
  selectedAccount,
  error,
  onInputChange,
  onAccountSelect,
  onBackToSelection,
  onSubmit,
  onAmountChange
}) => {
  const getQuickAmountButtons = () => [
    {
      label: 'Complete Goal',
      className: 'px-3 py-1 text-sm border border-green-500 text-green-600 hover:bg-green-50 rounded transition-colors',
      amount: (selectedGoal.target_amount - selectedGoal.current_amount).toFixed(2)
    },
    {
      label: 'Half Remaining',
      className: 'px-3 py-1 text-sm border border-blue-500 text-blue-600 hover:bg-blue-50 rounded transition-colors',
      amount: ((selectedGoal.target_amount - selectedGoal.current_amount) / 2).toFixed(2)
    },
    {
      label: 'Quarter',
      className: 'px-3 py-1 text-sm border border-blue-500 text-blue-600 hover:bg-blue-50 rounded transition-colors',
      amount: ((selectedGoal.target_amount - selectedGoal.current_amount) / 4).toFixed(2)
    }
  ];

  const getFixedAmountButtons = () => [
    { label: '₱100', amount: '100', className: 'px-3 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded transition-colors' },
    { label: '₱500', amount: '500', className: 'px-3 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded transition-colors' },
    { label: '₱1,000', amount: '1000', className: 'px-3 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded transition-colors' },
    { label: '₱5,000', amount: '5000', className: 'px-3 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded transition-colors' }
  ];

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
          <div className="flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Selected Goal Display */}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <i className="fas fa-lightbulb text-lg text-blue-600 mr-3 mt-0.5"></i>
          <div>
            <div className="font-semibold text-blue-800 mb-1">Smart Suggestion</div>
            <div className="text-sm text-blue-700">
              Just {formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)} more to complete this goal!
              {selectedGoal.target_date && (() => {
                const remainingDays = getRemainingDays(selectedGoal.target_date);
                const dailyRequired = remainingDays > 0 ? (selectedGoal.target_amount - selectedGoal.current_amount) / remainingDays : 0;
                return remainingDays > 0 ? (
                  <span className="block mt-1">
                    Contribute {formatCurrency(dailyRequired)} per day to meet your deadline on {formatDate(selectedGoal.target_date)}
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-bold text-gray-700 mb-2">
              Amount <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₱</span>
              </div>
              <input
                type="number"
                id="amount"
                name="amount"
                value={contributionData.amount}
                onChange={onInputChange}
                className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="mt-3">
              <small className="text-gray-500 block mb-2 text-sm">Quick amounts:</small>
              <div className="flex flex-wrap gap-2 mb-2">
                {getQuickAmountButtons().map((button, index) => (
                  <button
                    key={index}
                    type="button"
                    className={button.className}
                    onClick={() => onAmountChange(button.amount)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {getFixedAmountButtons().map((button, index) => (
                  <button
                    key={index}
                    type="button"
                    className={button.className}
                    onClick={() => onAmountChange(button.amount)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
            
            <small className="text-gray-500 text-xs mt-2 block">
              Enter the amount you want to contribute towards this goal
            </small>
          </div>
        </div>

        <div>
          <AccountSelector
            selectedAccountId={contributionData.account_id}
            onAccountSelect={onAccountSelect}
            required={true}
            label="From Account"
            showBalance={true}
            showAccountType={true}
            autoSelectDefault={true}
          />
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="notes"
          name="notes"
          value={contributionData.notes}
          onChange={onInputChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          rows={3}
          placeholder="Add any notes about this contribution"
        ></textarea>
        <small className="text-gray-500 text-xs mt-1 block">
          Briefly describe this contribution (optional)
        </small>
      </div>

      {/* Desktop Footer - Hidden on mobile since mobile footer handles navigation */}
      <div className="hidden md:flex justify-between pt-6 border-t border-gray-200">
        <button 
          type="button" 
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200"
          onClick={onBackToSelection}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Goals
        </button>
        <button 
          type="submit" 
          className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Continue to Review
          <i className="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </form>
  );
};

export default ContributionFormStep;
