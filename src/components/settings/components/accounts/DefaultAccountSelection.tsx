import React, { FC, useState } from 'react';
import { Account } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface DefaultAccountSelectionProps {
  accounts: Account[];
  onDefaultAccountChange: (accountId: string) => Promise<void>;
  isUpdating: boolean;
  onClose?: () => void;
}

const DefaultAccountSelection: FC<DefaultAccountSelectionProps> = ({
  accounts,
  onDefaultAccountChange,
  isUpdating,
  onClose
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // Get current default account
  const currentDefaultAccount = accounts.find(account => account.is_default);
  
  // Get active accounts for selection
  const activeAccounts = accounts.filter(account => account.status === 'active');

  // Helper function to get account type icon
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'checking': return 'fas fa-university';
      case 'savings': return 'fas fa-piggy-bank';
      case 'credit': return 'fas fa-credit-card';
      case 'investment': return 'fas fa-chart-line';
      case 'cash': return 'fas fa-money-bill-wave';
      case 'other': return 'fas fa-wallet';
      default: return 'fas fa-bank';
    }
  };

  // Helper function to format balance
  const formatBalance = (balance: number) => {
    return `${getCurrencySymbol('PHP')}${Math.abs(balance).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Handle account selection
  const handleAccountSelection = (accountId: string) => {
    if (accountId === currentDefaultAccount?.id) {
      return; // No change needed
    }
    
    setSelectedAccountId(accountId);
    setShowConfirmation(true);
  };

  // Confirm selection change
  const handleConfirmChange = async () => {
    if (selectedAccountId) {
      await onDefaultAccountChange(selectedAccountId);
      setShowConfirmation(false);
      setSelectedAccountId('');
    }
  };

  // Cancel selection change
  const handleCancelChange = () => {
    setShowConfirmation(false);
    setSelectedAccountId('');
  };

  if (activeAccounts.length === 0) {
    return (
      <div className="card border-left-warning shadow h-100 py-2 mb-4 animate__animated animate__fadeIn">
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                <i className="fas fa-bank mr-2"></i>
                Set as Default Account
              </div>
              <div className="row no-gutters align-items-center">
                <div className="col-auto">
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    <i className="fas fa-exclamation-triangle text-warning mr-2"></i>
                    No Active Accounts Available
                  </div>
                </div>
              </div>
              <p className="text-muted mt-2 mb-0">
                Please add at least one active account to set a default.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-left-info shadow h-100 py-2 mb-4 animate__animated animate__fadeIn">
      <div className="card-body">
        {/* Section Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="text-xs font-weight-bold text-primary text-uppercase">
            <i className="fas fa-bank mr-2"></i>
            Set as Default Account
          </div>
          {onClose && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Current Default Display */}
        {currentDefaultAccount && (
          <div className="mb-4">
            <div className="h6 mb-2 font-weight-bold text-gray-800">Current Default</div>
            <div className="d-flex align-items-center p-3 bg-light rounded border-left-success">
              <div 
                className="account-color-indicator rounded-circle mr-3 d-flex align-items-center justify-content-center"
                style={{ 
                  backgroundColor: currentDefaultAccount.color || "#4e73df", 
                  width: "36px", 
                  height: "36px",
                  minWidth: "36px"
                }}
              >
                <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} text-white`}></i>
              </div>
              <div className="flex-grow-1">
                <div className="font-weight-bold text-gray-800">{currentDefaultAccount.account_name}</div>
                <small className="text-gray-600">
                  {currentDefaultAccount.account_type === 'credit' ? 'Credit Card' : 
                   currentDefaultAccount.account_type.charAt(0).toUpperCase() + currentDefaultAccount.account_type.slice(1)} 
                  {currentDefaultAccount.institution_name && ` • ${currentDefaultAccount.institution_name}`}
                </small>
              </div>
              <div className="text-right">
                <div className="font-weight-bold text-success">
                  {formatBalance(currentDefaultAccount.balance)}
                </div>
                <span className="badge badge-success">
                  <i className="fas fa-star mr-1"></i>
                  Default
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Selection */}
        <div className="mb-4">
          <div className="h6 mb-3 font-weight-bold text-gray-800">Choose Default Account</div>
          <div className="form-group">
            {activeAccounts.map((account, index) => (
              <div 
                key={account.id} 
                className={`custom-control custom-radio mb-2 animate__animated animate__fadeIn`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <input
                  type="radio"
                  className="custom-control-input"
                  id={`account-${account.id}`}
                  name="defaultAccount"
                  value={account.id}
                  checked={account.is_default}
                  onChange={() => account.id && handleAccountSelection(account.id)}
                  disabled={isUpdating}
                />
                <label className="custom-control-label w-100" htmlFor={`account-${account.id}`}>
                  <div className="d-flex align-items-center justify-content-between p-2 rounded border" 
                       style={{ backgroundColor: account.is_default ? '#e3f2fd' : 'transparent' }}>
                    <div className="d-flex align-items-center">
                      <div 
                        className="account-color-indicator rounded-circle mr-3 d-flex align-items-center justify-content-center"
                        style={{ 
                          backgroundColor: account.color || "#4e73df", 
                          width: "32px", 
                          height: "32px",
                          minWidth: "32px"
                        }}
                      >
                        <i className={`${getAccountTypeIcon(account.account_type)} text-white fa-sm`}></i>
                      </div>
                      <div>
                        <div className="font-weight-medium text-gray-800">{account.account_name}</div>
                        <small className="text-gray-600">
                          {account.account_type === 'credit' ? 'Credit Card' : 
                           account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                        </small>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-weight-medium text-gray-700">
                        {formatBalance(account.balance)}
                      </div>
                      {account.is_default && (
                        <span className="badge badge-success badge-sm">
                          <i className="fas fa-star mr-1"></i>
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Explanation */}
        <div className="alert alert-info border-left-info mb-3">
          <div className="d-flex">
            <div className="mr-3">
              <i className="fas fa-info-circle text-info"></i>
            </div>
            <div>
              <div className="font-weight-bold text-info mb-1">Auto-selected for new transactions</div>
              <p className="text-info mb-2" style={{ fontSize: '0.9rem' }}>
                When you create a new transaction, this account will be automatically selected as the default 
                source or destination, saving you time during data entry.
              </p>
              <div className="d-flex align-items-center text-info" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-lock mr-2"></i>
                <span>If not set, you'll need to manually select an account for each transaction.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isUpdating && (
          <div className="d-flex align-items-center justify-content-center py-3">
            <div className="spinner-border spinner-border-sm text-primary mr-2" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <span className="text-primary">Updating default account...</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content animate__animated animate__fadeIn animate__faster">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-star text-warning mr-2"></i>
                    Confirm Default Account Change
                  </h5>
                  <button 
                    type="button" 
                    className="close" 
                    onClick={handleCancelChange}
                    disabled={isUpdating}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to change your default account?</p>
                  
                  {currentDefaultAccount && (
                    <div className="mb-3">
                      <strong>Current Default:</strong>
                      <div className="mt-1 p-2 bg-light rounded">
                        <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} mr-2`}></i>
                        {currentDefaultAccount.account_name}
                      </div>
                    </div>
                  )}
                  
                  {selectedAccountId && (
                    <div className="mb-3">
                      <strong>New Default:</strong>
                      <div className="mt-1 p-2 bg-primary text-white rounded">
                        {(() => {
                          const selectedAccount = activeAccounts.find(acc => acc.id === selectedAccountId);
                          return selectedAccount ? (
                            <>
                              <i className={`${getAccountTypeIcon(selectedAccount.account_type)} mr-2`}></i>
                              {selectedAccount.account_name}
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="alert alert-info mb-0">
                    <i className="fas fa-info-circle mr-2"></i>
                    This account will be automatically selected for new transactions.
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancelChange}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleConfirmChange}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-star mr-1"></i>
                        Set as Default
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
};

export default DefaultAccountSelection;