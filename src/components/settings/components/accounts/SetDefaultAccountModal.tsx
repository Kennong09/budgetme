import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import { Account } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface SetDefaultAccountModalProps {
  accounts: Account[];
  currentDefaultId: string;
  onSetDefault: (accountId: string) => Promise<void>;
  onClose: () => void;
  isUpdating: boolean;
}

const SetDefaultAccountModal: FC<SetDefaultAccountModalProps> = ({
  accounts,
  currentDefaultId,
  onSetDefault,
  onClose,
  isUpdating
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentDefaultId);

  // Get active accounts for selection
  const activeAccounts = accounts.filter(account => account.status === 'active');
  const currentAccount = accounts.find(acc => acc.id === currentDefaultId);

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

  const handleConfirm = async () => {
    // Always execute the default change since this is a confirmation modal
    const targetAccountId = selectedAccountId !== currentDefaultId ? selectedAccountId : currentDefaultId;
    await onSetDefault(targetAccountId);
    onClose();
  };

  const modalElement = (
    <>
      {/* Mobile Modal */}
      <div className="block md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center" style={{ zIndex: 1060 }}>
        <div className="bg-white rounded-t-3xl w-full max-w-md animate__animated animate__slideInUp animate__faster" style={{ zIndex: 1065 }}>
          <div className="p-6">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-star text-amber-500 text-2xl"></i>
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Set as Default Account?</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              This account will be automatically selected for new transactions.
            </p>
            
            {/* Account Display */}
            {(() => {
              const selectedAccount = accounts.find(acc => acc.id === (selectedAccountId !== currentDefaultId ? selectedAccountId : currentDefaultId));
              return selectedAccount ? (
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selectedAccount.color || "#4e73df" }}
                  >
                    <i className={`${getAccountTypeIcon(selectedAccount.account_type)} text-white text-lg`}></i>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{selectedAccount.account_name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {selectedAccount.account_type === 'credit' ? 'Credit Card' : selectedAccount.account_type}
                    </p>
                  </div>
                </div>
              ) : null;
            })()}
            
            {/* Actions */}
            <div className="flex gap-3">
              <button 
                type="button" 
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                onClick={onClose}
                disabled={isUpdating}
              >
                No, Cancel
              </button>
              <button 
                type="button" 
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleConfirm}
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
                    Yes, Set Default
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 bg-black bg-opacity-50 items-center justify-center" style={{ zIndex: 1060 }}>
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4" style={{ zIndex: 1065 }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <i className="fas fa-star text-yellow-500 mr-2"></i>
              Set Default Account
            </h3>
            <button 
              type="button" 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={onClose}
              disabled={isUpdating}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="text-center mb-6">
              <i className="fas fa-star text-yellow-500" style={{ fontSize: '3rem' }}></i>
              <h4 className="mt-3 mb-2 text-lg font-medium text-gray-900">Set as Default Account?</h4>
              <p className="text-gray-600 mb-0">
                This account will be automatically selected for new transactions.
              </p>
            </div>

            {/* Account Display */}
            {(() => {
              const selectedAccount = accounts.find(acc => acc.id === (selectedAccountId !== currentDefaultId ? selectedAccountId : currentDefaultId));
              return selectedAccount ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <div 
                    className="rounded-full mr-4 flex items-center justify-center"
                    style={{ 
                      backgroundColor: selectedAccount.color || "#4e73df", 
                      width: "40px", 
                      height: "40px",
                      minWidth: "40px"
                    }}
                  >
                    <i className={`${getAccountTypeIcon(selectedAccount.account_type)} text-white`}></i>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{selectedAccount.account_name}</div>
                    <div className="text-sm text-gray-600">
                      {selectedAccount.account_type === 'credit' ? 'Credit Card' : 
                       selectedAccount.account_type.charAt(0).toUpperCase() + selectedAccount.account_type.slice(1)}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button 
              type="button" 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              onClick={onClose}
              disabled={isUpdating}
            >
              No, Cancel
            </button>
            <button 
              type="button" 
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              onClick={handleConfirm}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting...
                </>
              ) : (
                <>
                  <i className="fas fa-star mr-1"></i>
                  Yes, Set as Default
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalElement, document.body);
};

export default SetDefaultAccountModal;