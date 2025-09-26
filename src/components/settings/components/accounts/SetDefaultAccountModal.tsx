import React, { FC, useState } from 'react';
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

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content animate__animated animate__fadeIn animate__faster">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-star text-warning mr-2"></i>
                Set Default Account
              </h5>
              <button 
                type="button" 
                className="close" 
                onClick={onClose}
                disabled={isUpdating}
              >
                <span>&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="text-center mb-4">
                <i className="fas fa-star text-warning" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 mb-2">Set as Default Account?</h5>
                <p className="text-muted mb-0">
                  This account will be automatically selected for new transactions.
                </p>
              </div>

              {/* Account Display */}
              {(() => {
                const selectedAccount = accounts.find(acc => acc.id === (selectedAccountId !== currentDefaultId ? selectedAccountId : currentDefaultId));
                return selectedAccount ? (
                  <div className="d-flex align-items-center justify-content-center p-3 bg-light rounded">
                    <div 
                      className="account-color-indicator rounded-circle mr-3 d-flex align-items-center justify-content-center"
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
                      <div className="font-weight-bold text-gray-800">{selectedAccount.account_name}</div>
                      <small className="text-gray-600">
                        {selectedAccount.account_type === 'credit' ? 'Credit Card' : 
                         selectedAccount.account_type.charAt(0).toUpperCase() + selectedAccount.account_type.slice(1)}
                      </small>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isUpdating}
              >
                No, Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-warning"
                onClick={handleConfirm}
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
                    Yes, Set as Default
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default SetDefaultAccountModal;