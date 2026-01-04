import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

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

  // Mobile modal handlers
  const handleMobileOpen = () => {
    setIsMobileModalOpen(true);
    setSearchTerm("");
  };

  const handleMobileClose = () => {
    setIsMobileModalOpen(false);
    setSearchTerm("");
  };

  const handleMobileAccountSelect = (account: Account) => {
    handleAccountSelect(account);
    setIsMobileModalOpen(false);
  };

  // Mobile Modal Component
  const MobileAccountModal = () => {
    if (!isMobileModalOpen) return null;
    
    return createPortal(
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate__animated animate__fadeIn animate__faster"
        onClick={handleMobileClose}
      >
        <div 
          className="w-full max-h-[85vh] bg-white rounded-t-2xl shadow-xl animate__animated animate__slideInUp animate__faster overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-university text-indigo-500 text-xs"></i>
              Select Account
            </h6>
            <button 
              onClick={handleMobileClose}
              className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          
          {/* Search */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          {/* Account List */}
          <div className="overflow-y-auto max-h-[60vh] pb-4">
            {filteredAccounts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <i className="fas fa-search text-gray-300 text-2xl mb-2"></i>
                <p className="text-sm text-gray-500">No accounts found</p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-3 rounded-xl border transition-all active:scale-[0.98] ${
                      selectedAccount?.id === account.id 
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                    onClick={() => handleMobileAccountSelect(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          selectedAccount?.id === account.id ? 'bg-indigo-500' : 'bg-gray-100'
                        }`}>
                          <i className={`${getAccountTypeIcon(account.account_type)} text-xs ${
                            selectedAccount?.id === account.id ? 'text-white' : 'text-gray-500'
                          }`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold truncate ${
                              selectedAccount?.id === account.id ? 'text-indigo-700' : 'text-gray-800'
                            }`}>
                              {account.account_name}
                            </span>
                            {account.is_default && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-semibold rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 capitalize">{account.account_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${
                          account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(account.balance)}
                        </p>
                        {selectedAccount?.id === account.id && (
                          <i className="fas fa-check-circle text-indigo-500 text-sm mt-0.5"></i>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) {
    return (
      <div className={`form-group ${className}`}>
        {/* Mobile Loading */}
        <div className="block md:hidden">
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-xs text-gray-500">Loading accounts...</span>
          </div>
        </div>
        {/* Desktop Loading */}
        <div className="hidden md:block">
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm text-primary mr-2" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <span className="text-muted">Loading accounts...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`form-group ${className}`}>
        {/* Mobile Error */}
        <div className="block md:hidden">
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
            <i className="fas fa-exclamation-triangle text-rose-500 text-xs"></i>
            <span className="text-xs text-rose-600">{error}</span>
          </div>
        </div>
        {/* Desktop Error */}
        <div className="hidden md:block">
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <div className="alert alert-danger py-2 mb-0">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`form-group ${className}`}>
        {/* Mobile Empty */}
        <div className="block md:hidden">
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <i className="fas fa-info-circle text-amber-500 text-xs"></i>
            <span className="text-xs text-amber-700">No accounts available</span>
          </div>
        </div>
        {/* Desktop Empty */}
        <div className="hidden md:block">
          <label className="font-weight-bold text-gray-800">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <div className="alert alert-warning py-2 mb-0">
            <i className="fas fa-info-circle mr-2"></i>
            No accounts available. Please create an account first.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`form-group selector-container ${className}`}>
      {/* ===== MOBILE VIEW ===== */}
      <div className="block md:hidden">
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        {/* Mobile Selector Button */}
        <div
          className={`flex items-center justify-between p-2.5 bg-white border rounded-xl transition-all active:scale-[0.99] ${
            disabled ? 'opacity-50 bg-gray-50' : 'hover:border-indigo-300'
          } ${selectedAccount ? 'border-indigo-200' : 'border-gray-200'}`}
          onClick={() => !disabled && handleMobileOpen()}
        >
          {selectedAccount ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <i className={`${getAccountTypeIcon(selectedAccount.account_type)} text-indigo-500 text-xs`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-800 truncate">{selectedAccount.account_name}</span>
                  {selectedAccount.is_default && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-semibold rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 capitalize">{selectedAccount.account_type}</span>
                  <span className="text-[10px] text-gray-300">•</span>
                  <span className={`text-[10px] font-semibold ${
                    selectedAccount.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(selectedAccount.balance)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Select account</span>
          )}
          
          <div className="flex items-center gap-1.5">
            {selectedAccount && !disabled && (
              <button
                type="button"
                className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            )}
            <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
          </div>
        </div>

        {/* Mobile Selected Account Details Card */}
        {selectedAccount && showBalance && (
          <div className="mt-2 p-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  selectedAccount.balance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
                }`}>
                  <i className={`fas fa-wallet text-xs ${
                    selectedAccount.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}></i>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 uppercase font-semibold">Current Balance</p>
                  <p className={`text-sm font-bold ${
                    selectedAccount.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(selectedAccount.balance)}
                  </p>
                </div>
              </div>
              {selectedAccount.account_type === 'credit' && selectedAccount.balance > 0 && (
                <div className="px-2 py-1 bg-amber-100 rounded-lg">
                  <i className="fas fa-exclamation-triangle text-amber-600 text-[10px]"></i>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-1.5">
          {showBalance ? "Balance updates automatically" : "Select transaction account"}
        </p>

        {/* Mobile Modal */}
        <MobileAccountModal />
      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
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
                      {formatCurrency(selectedAccount.balance)}
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
    </div>
  );
};

export default AccountSelector;