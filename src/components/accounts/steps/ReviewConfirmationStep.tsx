import React, { FC, memo, useCallback, useMemo } from 'react';
import { ModalState, NavigationHandlers, AccountType } from '../types/AccountSetupTypes';
import { ValidationEngine } from '../utils/ValidationEngine';

interface Props {
  modalState: ModalState;
  navigationHandlers: NavigationHandlers;
  onSubmit: () => void;
}

const ReviewConfirmationStep: FC<Props> = memo(({
  modalState,
  navigationHandlers,
  onSubmit
}) => {
  const getAccountTypeIcon = useCallback((type: AccountType) => {
    switch (type) {
      case 'checking': return 'fas fa-university';
      case 'savings': return 'fas fa-piggy-bank';
      case 'credit': return 'fas fa-credit-card';
      case 'investment': return 'fas fa-chart-line';
      case 'cash': return 'fas fa-money-bill-wave';
      case 'other': return 'fas fa-wallet';
      default: return 'fas fa-bank';
    }
  }, []);

  const formatAccountTypeTitle = useCallback((type: AccountType) => {
    switch (type) {
      case 'checking': return 'Checking Account';
      case 'savings': return 'Savings Account';
      case 'credit': return 'Credit Card';
      case 'investment': return 'Investment Account';
      case 'cash': return 'Cash Wallet';
      case 'other': return 'Other Account';
      default: return 'Account';
    }
  }, []);

  const formatExperienceLevel = useCallback((level: string) => {
    switch (level) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return level;
    }
  }, []);

  const hasCashIn = useMemo(() => modalState.cashInData.amount > 0 && modalState.cashInData.description.trim() !== '', [modalState.cashInData.amount, modalState.cashInData.description]);
  const hasBudgetAllocation = useMemo(() => (modalState.cashInData.budget_allocation?.length || 0) > 0, [modalState.cashInData.budget_allocation]);
  const totalAllocated = (modalState.cashInData.budget_allocation || [])
    .reduce((sum, allocation) => sum + (allocation.allocated_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Review & Confirm
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Please review all the details before creating your account. You can make changes by going back to previous steps.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Account Details */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                style={{ backgroundColor: modalState.accountData.color || '#4e73df' }}
              >
                <i className={`${getAccountTypeIcon(modalState.accountData.account_type)} text-xl text-white`}></i>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Account Details</h3>
                <p className="text-gray-600">{formatAccountTypeTitle(modalState.accountData.account_type)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Name</label>
                  <p className="text-gray-900 font-medium">{modalState.accountData.account_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Initial Balance</label>
                  <p className="text-gray-900 font-medium">
                    {ValidationEngine.formatAmount(modalState.accountData.initial_balance)}
                  </p>
                </div>
              </div>

              {modalState.accountData.institution_name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Institution</label>
                  <p className="text-gray-900">{modalState.accountData.institution_name}</p>
                </div>
              )}

              {modalState.accountData.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900">{modalState.accountData.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Default Account</label>
                  <p className="text-gray-900">
                    {modalState.accountData.is_default ? (
                      <span className="text-green-600">
                        <i className="fas fa-check mr-1"></i>
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Experience Level</label>
                  <p className="text-gray-900">
                    {formatExperienceLevel(modalState.accountTypeChoice?.user_experience_level || '')}
                  </p>
                </div>
              </div>

              {modalState.accountTypeChoice?.choice_reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Purpose</label>
                  <p className="text-gray-900">{modalState.accountTypeChoice.choice_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cash-In Details */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="fas fa-plus-circle text-xl text-green-600"></i>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Initial Funds</h3>
                <p className="text-gray-600">
                  {hasCashIn ? 'Cash-in transaction details' : 'No initial funding'}
                </p>
              </div>
            </div>

            {hasCashIn ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Amount</label>
                    <p className="text-gray-900 font-medium text-lg text-green-600">
                      {ValidationEngine.formatAmount(modalState.cashInData.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date</label>
                    <p className="text-gray-900">
                      {new Date(modalState.cashInData.date).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900">{modalState.cashInData.description}</p>
                </div>

                {modalState.cashInData.source && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Source</label>
                    <p className="text-gray-900">{modalState.cashInData.source}</p>
                  </div>
                )}

                {/* Budget Allocation Summary */}
                {hasBudgetAllocation && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">Budget Planning</h4>
                    <div className="space-y-2">
                      {modalState.cashInData.budget_allocation?.map((allocation, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-blue-800">{allocation.category_name}</span>
                          <span className="font-medium text-blue-900">
                            {ValidationEngine.formatAmount(allocation.allocated_amount)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-blue-200 pt-2 mt-2">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-blue-900">Total Allocated:</span>
                          <span className="text-blue-900">
                            {ValidationEngine.formatAmount(totalAllocated)}
                          </span>
                        </div>
                        {totalAllocated < modalState.cashInData.amount && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-700">Unallocated:</span>
                            <span className="text-blue-700">
                              {ValidationEngine.formatAmount(modalState.cashInData.amount - totalAllocated)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-info-circle text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">
                  No initial funding will be added. You can add funds to your account after it's created.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-blue-50 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-bank text-white"></i>
            </div>
            <h4 className="font-semibold text-blue-900 mb-1">Account Created</h4>
            <p className="text-blue-700 text-sm">
              Your {formatAccountTypeTitle(modalState.accountData.account_type).toLowerCase()} will be set up
            </p>
          </div>

          {hasCashIn && (
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-plus text-white"></i>
              </div>
              <h4 className="font-semibold text-green-900 mb-1">Funds Added</h4>
              <p className="text-green-700 text-sm">
                {ValidationEngine.formatAmount(modalState.cashInData.amount)} will be deposited
              </p>
            </div>
          )}

          <div className="bg-purple-50 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-history text-white"></i>
            </div>
            <h4 className="font-semibold text-purple-900 mb-1">Audit Trail</h4>
            <p className="text-purple-700 text-sm">
              All activities will be logged for your records
            </p>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
            <div>
              <h4 className="font-medium text-yellow-900 mb-2">Important Notes:</h4>
              <ul className="text-yellow-800 text-sm space-y-1">
                <li>• Your account will be created immediately after confirmation</li>
                {hasCashIn && <li>• The cash-in transaction will be recorded in your transaction history</li>}
                <li>• All account activities will be logged in your audit trail</li>
                <li>• You can modify account details later in your account settings</li>
                {modalState.accountData.is_default && <li>• This account will be set as your default account</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons - Desktop only (mobile uses fixed footer) */}
      <div className="hidden md:flex justify-between pt-6">
        <button
          onClick={navigationHandlers.onPrevious}
          disabled={modalState.isSubmitting}
          className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>

        <button
          onClick={onSubmit}
          disabled={modalState.isSubmitting}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {modalState.isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <i className="fas fa-check"></i>
              <span>Create Account</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

ReviewConfirmationStep.displayName = 'ReviewConfirmationStep';

export default ReviewConfirmationStep;
