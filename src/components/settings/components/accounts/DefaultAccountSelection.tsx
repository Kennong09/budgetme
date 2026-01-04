import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
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

  // Helper function to format balance for mobile (shorter)
  const formatBalanceMobile = (balance: number) => {
    const absBalance = Math.abs(balance);
    if (absBalance >= 1000000) {
      return `${getCurrencySymbol('PHP')}${(absBalance / 1000000).toFixed(1)}M`;
    } else if (absBalance >= 1000) {
      return `${getCurrencySymbol('PHP')}${(absBalance / 1000).toFixed(1)}K`;
    }
    return `${getCurrencySymbol('PHP')}${absBalance.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
      <>
        {/* Mobile Empty State */}
        <div className="block md:hidden bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">No Active Accounts</h3>
              <p className="text-xs text-amber-600">Please add at least one active account to set a default.</p>
            </div>
          </div>
        </div>

        {/* Desktop Empty State */}
        <div className="hidden md:block alert alert-warning">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <strong>No Active Accounts</strong> - Please add at least one active account to set a default.
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Default Account Selection */}
      <div className="block md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <i className="fas fa-star text-amber-500 text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Default Account</h3>
              <p className="text-[9px] text-gray-500">Auto-selected for transactions</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              <i className="fas fa-times text-gray-500 text-[10px]"></i>
            </button>
          )}
        </div>

        {/* Current Default */}
        {currentDefaultAccount && (
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-2">Current Default</p>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: currentDefaultAccount.color || "#4e73df" }}
              >
                <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} text-white text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{currentDefaultAccount.account_name}</p>
                <p className="text-[10px] text-gray-500 capitalize">
                  {currentDefaultAccount.account_type === 'credit' ? 'Credit Card' : currentDefaultAccount.account_type}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{formatBalanceMobile(currentDefaultAccount.balance)}</p>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-semibold">
                  <i className="fas fa-star text-[6px]"></i>
                  Default
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Selection */}
        <div className="p-4">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-2">Choose Account</p>
          <div className="space-y-2">
            {activeAccounts.map((account, index) => (
              <button
                key={account.id}
                type="button"
                onClick={() => account.id && handleAccountSelection(account.id)}
                disabled={isUpdating || account.is_default}
                className={`w-full p-3 rounded-xl border transition-all text-left ${
                  account.is_default 
                    ? 'border-emerald-300 bg-emerald-50 cursor-default' 
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]'
                } disabled:opacity-50`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: account.color || "#4e73df" }}
                  >
                    <i className={`${getAccountTypeIcon(account.account_type)} text-white text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{account.account_name}</p>
                    <p className="text-[9px] text-gray-500 capitalize">
                      {account.account_type === 'credit' ? 'Credit Card' : account.account_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${account.balance >= 0 ? 'text-gray-700' : 'text-rose-600'}`}>
                      {formatBalanceMobile(account.balance)}
                    </p>
                    {account.is_default && (
                      <i className="fas fa-check-circle text-emerald-500 text-xs"></i>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-blue-500 text-xs mt-0.5"></i>
              <p className="text-[10px] text-blue-700">
                The default account is automatically selected when creating new transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isUpdating && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-indigo-600 font-medium">Updating...</span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Default Account Selection */}
      <div className="hidden md:block card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-warning">
            <i className="fas fa-star mr-2"></i>
            Default Account
          </h6>
          {onClose && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <div className="card-body">
          {/* Current Default */}
          {currentDefaultAccount && (
            <div className="mb-4 p-3 bg-success text-white rounded">
              <small className="text-uppercase font-weight-bold">Current Default</small>
              <div className="d-flex align-items-center mt-2">
                <div 
                  className="rounded-circle mr-3 d-flex align-items-center justify-content-center"
                  style={{ 
                    backgroundColor: currentDefaultAccount.color || "#4e73df", 
                    width: "40px", 
                    height: "40px",
                    minWidth: "40px"
                  }}
                >
                  <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} text-white`}></i>
                </div>
                <div>
                  <div className="font-weight-bold">{currentDefaultAccount.account_name}</div>
                  <small>
                    {currentDefaultAccount.account_type === 'credit' ? 'Credit Card' : 
                     currentDefaultAccount.account_type.charAt(0).toUpperCase() + currentDefaultAccount.account_type.slice(1)}
                  </small>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-weight-bold">{formatBalance(currentDefaultAccount.balance)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Account Selection */}
          <h6 className="text-muted text-uppercase font-weight-bold small mb-3">Choose Account</h6>
          <div className="list-group">
            {activeAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => account.id && handleAccountSelection(account.id)}
                disabled={isUpdating || account.is_default}
                className={`list-group-item list-group-item-action d-flex align-items-center ${
                  account.is_default ? 'active' : ''
                }`}
              >
                <div 
                  className="rounded-circle mr-3 d-flex align-items-center justify-content-center"
                  style={{ 
                    backgroundColor: account.color || "#4e73df", 
                    width: "36px", 
                    height: "36px",
                    minWidth: "36px"
                  }}
                >
                  <i className={`${getAccountTypeIcon(account.account_type)} text-white`}></i>
                </div>
                <div className="flex-grow-1">
                  <div className="font-weight-bold">{account.account_name}</div>
                  <small className="text-muted">
                    {account.account_type === 'credit' ? 'Credit Card' : 
                     account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                  </small>
                </div>
                <div className="text-right">
                  <div className={`font-weight-bold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatBalance(account.balance)}
                  </div>
                  {account.is_default && (
                    <i className="fas fa-check-circle text-success"></i>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="alert alert-info mt-4 mb-0">
            <i className="fas fa-info-circle mr-2"></i>
            The default account is automatically selected when creating new transactions.
          </div>

          {/* Loading State */}
          {isUpdating && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <span className="ml-2 text-primary font-weight-medium">Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Confirmation Modal */}
      {showConfirmation && createPortal(
        <>
          <div className="block md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center" style={{ zIndex: 1060 }}>
            <div className="bg-white rounded-t-3xl w-full max-w-md animate__animated animate__slideInUp animate__faster" style={{ zIndex: 1065 }}>
              <div className="p-6">
                {/* Handle */}
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-star text-amber-500 text-2xl"></i>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Change Default Account?</h3>
                <p className="text-xs text-gray-500 text-center mb-4">This account will be auto-selected for new transactions</p>
                
                {/* Current Account */}
                {currentDefaultAccount && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Current</p>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: currentDefaultAccount.color || "#4e73df" }}
                      >
                        <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} text-white text-xs`}></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{currentDefaultAccount.account_name}</span>
                    </div>
                  </div>
                )}
                
                {/* New Account */}
                {selectedAccountId && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Default</p>
                    {(() => {
                      const selectedAccount = activeAccounts.find(acc => acc.id === selectedAccountId);
                      return selectedAccount ? (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: selectedAccount.color || "#4e73df" }}
                          >
                            <i className={`${getAccountTypeIcon(selectedAccount.account_type)} text-white text-xs`}></i>
                          </div>
                          <span className="text-sm font-semibold text-indigo-700">{selectedAccount.account_name}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                    onClick={handleCancelChange}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    onClick={handleConfirmChange}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Setting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-star text-xs"></i>
                        Set Default
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Confirmation Modal */}
          <div className="hidden md:flex fixed inset-0 bg-black bg-opacity-50 items-center justify-center" style={{ zIndex: 1060 }}>
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4" style={{ zIndex: 1065 }}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-star text-yellow-500 mr-2"></i>
                  Change Default Account
                </h3>
                <button 
                  type="button" 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={handleCancelChange}
                  disabled={isUpdating}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">This account will be auto-selected for new transactions.</p>
                
                {/* Current Account */}
                {currentDefaultAccount && (
                  <div className="mb-4">
                    <small className="text-muted text-uppercase font-weight-bold">Current</small>
                    <div className="d-flex align-items-center mt-2 p-3 bg-light rounded">
                      <div 
                        className="rounded-circle mr-3 d-flex align-items-center justify-content-center"
                        style={{ 
                          backgroundColor: currentDefaultAccount.color || "#4e73df", 
                          width: "36px", 
                          height: "36px" 
                        }}
                      >
                        <i className={`${getAccountTypeIcon(currentDefaultAccount.account_type)} text-white`}></i>
                      </div>
                      <span className="font-weight-medium">{currentDefaultAccount.account_name}</span>
                    </div>
                  </div>
                )}
                
                {/* New Account */}
                {selectedAccountId && (
                  <div className="mb-4">
                    <small className="text-muted text-uppercase font-weight-bold">New Default</small>
                    {(() => {
                      const selectedAccount = activeAccounts.find(acc => acc.id === selectedAccountId);
                      return selectedAccount ? (
                        <div className="d-flex align-items-center mt-2 p-3 bg-primary text-white rounded">
                          <div 
                            className="rounded-circle mr-3 d-flex align-items-center justify-content-center bg-white"
                            style={{ width: "36px", height: "36px" }}
                          >
                            <i className={`${getAccountTypeIcon(selectedAccount.account_type)}`} style={{ color: selectedAccount.color || "#4e73df" }}></i>
                          </div>
                          <span className="font-weight-bold">{selectedAccount.account_name}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
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
                  className="btn btn-warning"
                  onClick={handleConfirmChange}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                      Setting...
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
        </>,
        document.body
      )}
    </>
  );
};

export default DefaultAccountSelection;