import React, { FC, useState, useEffect } from 'react';
import { Account } from "../../settings/types";
import { AccountService } from "../../../services/database/accountService";
import { formatCurrency } from "../../../utils/currencyUtils";
import { useAuth } from "../../../utils/AuthContext";

interface AccountSelectorProps {
  selectedAccountId: string;
  onAccountSelect: (account: Account | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  showBalance?: boolean;
  showAccountType?: boolean;
  autoSelectDefault?: boolean;
}

const AccountSelector: FC<AccountSelectorProps> = ({
  selectedAccountId,
  onAccountSelect,
  required = false,
  disabled = false,
  className = "",
  label = "Account",
  showBalance = true,
  showAccountType = true,
  autoSelectDefault = true
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected account when selectedAccountId changes
  useEffect(() => {
    if (selectedAccountId) {
      const account = accounts.find(acc => acc.id === selectedAccountId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  }, [selectedAccountId, accounts]);

  useEffect(() => {
    fetchAccounts();
  }, [user?.id]);

  const fetchAccounts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await AccountService.fetchUserAccounts(user.id);
      
      if (result.success && result.data) {
        setAccounts(result.data);
        
        // Auto-select default account if enabled and no account is currently selected
        if (autoSelectDefault && !selectedAccountId && result.data.length > 0) {
          const defaultAccount = result.data.find(account => account.is_default);
          const accountToSelect = defaultAccount || result.data[0];
          onAccountSelect(accountToSelect);
        }
      } else {
        setError(result.error || "Failed to load accounts");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    onAccountSelect(account);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedAccount(null);
    onAccountSelect(null);
    setIsOpen(false);
    setSearchTerm("");
  };

  const getBalanceColor = (balance: number, accountType: string) => {
    if (accountType === 'credit') {
      return balance <= 0 ? 'text-success' : 'text-warning';
    } else {
      return balance >= 0 ? 'text-success' : 'text-danger';
    }
  };

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'checking':
        return 'fas fa-university';
      case 'savings':
        return 'fas fa-piggy-bank';
      case 'credit':
        return 'fas fa-credit-card';
      case 'cash':
        return 'fas fa-wallet';
      case 'investment':
        return 'fas fa-chart-line';
      default:
        return 'fas fa-university';
    }
  };

  if (loading) {
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm text-primary mr-2" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <span className="text-muted">Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="alert alert-danger py-2 mb-0">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {error}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="alert alert-warning py-2 mb-0">
          <i className="fas fa-info-circle mr-2"></i>
          No accounts available. Please create an account first.
        </div>
      </div>
    );
  }

  return (
    <div className={`form-group selector-container ${className}`}>
      <label className="font-weight-bold text-gray-800">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      
      <div className="position-relative">
        {/* Selected Account Display */}
        <div
          className={`d-flex align-items-center justify-content-between px-3 py-2 border bg-white ${
            disabled ? 'bg-light' : ''
          } ${
            isOpen ? 'border-primary' : 'border-secondary'
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{ 
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderRadius: '0.375rem',
            minHeight: '38px'
          }}
        >
          {selectedAccount ? (
            <div className="d-flex align-items-center">
              <div>
                <div className="font-weight-medium text-gray-800">
                  {selectedAccount.account_name}
                  {selectedAccount.is_default && (
                    <span className="badge badge-success ml-2">Default</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted">Select account</span>
          )}
          
          <div className="d-flex align-items-center">
            {selectedAccount && !disabled && (
              <button
                type="button"
                className="btn btn-sm text-danger mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                title="Clear selection"
                style={{ border: 'none', background: 'none', padding: '2px 6px' }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`}></i>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div 
            className="position-absolute w-100 bg-white border shadow-lg"
            style={{ 
              zIndex: 1050, 
              maxHeight: '300px', 
              overflowY: 'auto', 
              top: '100%',
              borderRadius: '0.375rem',
              borderColor: '#dee2e6'
            }}
          >
            {/* Search Box */}
            <div className="p-3 border-bottom">
              <input
                type="text"
                className="px-3 py-2 w-100 border"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  borderRadius: '0.25rem',
                  fontSize: '14px',
                  borderColor: '#dee2e6',
                  outline: 'none'
                }}
              />
            </div>

            {/* Account Options */}
            <div className="py-1">
              {filteredAccounts.length === 0 ? (
                <div className="px-3 py-2 text-muted text-center">
                  No accounts found
                </div>
              ) : (
                filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`px-3 py-2 d-flex align-items-center ${
                      selectedAccount?.id === account.id ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => handleAccountSelect(account)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAccount?.id !== account.id) {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAccount?.id !== account.id) {
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    <div className="flex-grow-1">
                      <div className="font-weight-medium">
                        {account.account_name}
                        {account.is_default && (
                          <span className="badge badge-success ml-2">Default</span>
                        )}
                      </div>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <i className="fas fa-check text-white"></i>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Account Details Card */}
      {selectedAccount && (
        <div className="card mt-3 border-left-primary">
          <div className="card-body py-3">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="d-flex align-items-center mb-2">
                  <div>
                    <div className="font-weight-bold text-gray-800">
                      {selectedAccount.account_name}
                      {selectedAccount.is_default && (
                        <span className="badge badge-success ml-2">
                          <i className="fas fa-star mr-1"></i>Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedAccount.account_type.charAt(0).toUpperCase() + 
                       selectedAccount.account_type.slice(1)} Account
                    </div>
                  </div>
                </div>
                
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-xs font-weight-bold text-gray-600 text-uppercase">
                    Current Balance
                  </span>
                  <span className={`font-weight-bold ${getBalanceColor(selectedAccount.balance, selectedAccount.account_type)}`}>
                    {formatCurrency(selectedAccount.balance, 'PHP')}
                  </span>
                </div>

                {/* Credit Account Warning */}
                {selectedAccount.account_type === 'credit' && selectedAccount.balance > 0 && (
                  <div className="mt-2">
                    <div className="alert alert-warning py-2 px-3 mb-0">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      <small>Credit account has a positive balance</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <small className="form-text text-muted">
        {showBalance 
          ? "Select the account for this transaction. Balance will be updated automatically."
          : "Select the account for this transaction."
        }
      </small>
    </div>
  );
};

export default AccountSelector;