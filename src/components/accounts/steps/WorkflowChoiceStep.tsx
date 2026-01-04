import React, { FC, memo, useCallback, useMemo } from 'react';

interface Props {
  userAccounts: any[];
  hasExistingAccounts: boolean;
  workflowMode: 'create_account' | 'cash_in_existing';
  selectedExistingAccount: string | null;
  onWorkflowChoice: (mode: 'create_account' | 'cash_in_existing') => void;
  onExistingAccountSelect: (accountId: string) => void;
  onContinue: () => void;
}

const WorkflowChoiceStep: FC<Props> = memo(({
  userAccounts,
  hasExistingAccounts,
  workflowMode,
  selectedExistingAccount,
  onWorkflowChoice,
  onExistingAccountSelect,
  onContinue
}) => {
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP' 
    }).format(amount);
  }, []);

  const getAccountTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'checking': return 'fas fa-university';
      case 'savings': return 'fas fa-piggy-bank';
      case 'credit': return 'fas fa-credit-card';
      case 'investment': return 'fas fa-chart-line';
      default: return 'fas fa-wallet';
    }
  }, []);

  const canContinue = useMemo(() => workflowMode === 'create_account' || 
    (workflowMode === 'cash_in_existing' && selectedExistingAccount), [workflowMode, selectedExistingAccount]);

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="text-center mb-4 md:mb-8">
        <h2 className="text-lg md:text-2xl font-bold text-gray-800 mb-2 md:mb-4">
          Welcome! Let's manage your finances
        </h2>
        <p className="text-sm md:text-base text-gray-600">
          {hasExistingAccounts 
            ? "You have existing accounts. Would you like to add money to them or create a new account?"
            : "Let's start by creating your first account."
          }
        </p>
      </div>

      {!hasExistingAccounts ? (
        // New user flow - only option is to create account
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-plus text-blue-600"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Create Your First Account
              </h3>
              <p className="text-gray-600 mb-4">
                Start your financial journey by creating your first account. 
                You can choose from checking, savings, credit, or investment accounts.
              </p>
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <i className="fas fa-check-circle"></i>
                <span>Easy setup in just a few steps</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Existing user flow - choice between workflows
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose what you'd like to do:</h3>
          
          {/* Option 1: Cash in to existing account */}
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              workflowMode === 'cash_in_existing'
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 bg-white hover:border-green-300'
            }`}
            onClick={() => onWorkflowChoice('cash_in_existing')}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  workflowMode === 'cash_in_existing' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <i className={`fas fa-money-bill-wave ${
                    workflowMode === 'cash_in_existing' ? 'text-green-600' : 'text-gray-600'
                  }`}></i>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Add Money to Existing Account
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  Cash in money to one of your existing accounts to start tracking your finances.
                </p>
                
                {workflowMode === 'cash_in_existing' && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Select an account:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedExistingAccount === account.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onExistingAccountSelect(account.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <i className={`${getAccountTypeIcon(account.account_type)} text-gray-500`}></i>
                              <div>
                                <div className="font-medium text-gray-800">{account.account_name}</div>
                                <div className="text-sm text-gray-500 capitalize">{account.account_type}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-800">
                                {formatCurrency(account.balance || 0)}
                              </div>
                              {account.balance === 0 && (
                                <div className="text-xs text-red-500">Zero Balance</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Create new account */}
          <div 
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              workflowMode === 'create_account'
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
            onClick={() => onWorkflowChoice('create_account')}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  workflowMode === 'create_account' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <i className={`fas fa-plus ${
                    workflowMode === 'create_account' ? 'text-blue-600' : 'text-gray-600'
                  }`}></i>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Create New Account
                </h4>
                <p className="text-gray-600 text-sm">
                  Set up a new checking, savings, credit, or investment account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button - Desktop only (mobile uses fixed footer) */}
      <div className="hidden md:flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-3 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base ${
            canContinue
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {workflowMode === 'cash_in_existing' ? 'Cash In Money' : 'Create Account'}
          <i className="fas fa-arrow-right ml-2 text-base"></i>
        </button>
      </div>
    </div>
  );
});

WorkflowChoiceStep.displayName = 'WorkflowChoiceStep';

export default WorkflowChoiceStep;
