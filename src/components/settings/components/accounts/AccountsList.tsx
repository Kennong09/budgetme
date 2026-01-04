import React, { FC } from 'react';
import { Account } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface AccountsListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onSetAsDefault?: (accountId: string) => void;
  onDefaultAccountClick?: (currentDefaultId: string) => void;
  onViewHistory?: (accountId: string, accountName: string) => void;
  isFormVisible: boolean;
  isInlineFormVisible?: boolean;
}

const AccountsList: FC<AccountsListProps> = ({ 
  accounts, 
  onEdit, 
  onDelete, 
  onSetAsDefault,
  onDefaultAccountClick,
  onViewHistory,
  isFormVisible,
  isInlineFormVisible = false
}) => {
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

  const formatBalance = (balance: number, accountType: string) => {
    const formattedAmount = `${getCurrencySymbol('PHP')}${Math.abs(balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (accountType === 'credit') {
      if (balance < 0) {
        return <span className="text-danger font-weight-bold">-{formattedAmount}</span>;
      } else if (balance === 0) {
        return <span className="text-success font-weight-bold">{formattedAmount}</span>;
      } else {
        return <span className="text-warning font-weight-bold">+{formattedAmount}</span>;
      }
    } else {
      return (
        <span className={`font-weight-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
          {balance >= 0 ? '' : '-'}{formattedAmount}
        </span>
      );
    }
  };

  const totalAssets = accounts
    .filter(acc => acc.account_type !== 'credit')
    .reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0);

  const totalDebt = Math.abs(accounts
    .filter(acc => acc.account_type === 'credit')
    .reduce((sum, acc) => sum + (acc.balance < 0 ? acc.balance : 0), 0));

  // Empty state for both mobile and desktop
  if (accounts.length === 0) {
    return (
      <>
        {/* Mobile Empty State */}
        <div className="block md:hidden text-center py-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-bank text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">No Accounts Found</h3>
          <p className="text-xs text-gray-500 mb-0 max-w-md mx-auto">
            {!isFormVisible && !isInlineFormVisible 
              ? "Add your first account to get started."
              : "Complete the form above to create your first account."
            }
          </p>
        </div>

        {/* Desktop Empty State */}
        <div className="hidden md:block text-center py-5">
          <i className="fas fa-bank text-gray-300" style={{ fontSize: '4rem' }}></i>
          <h4 className="mt-3 text-gray-700">No Accounts Found</h4>
          <p className="text-muted">
            {!isFormVisible && !isInlineFormVisible 
              ? "Add your first account to get started."
              : "Complete the form above to create your first account."
            }
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden w-full">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center mb-1.5">
              <i className="fas fa-wallet text-indigo-500 text-[10px]"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Accounts</p>
            <p className="text-sm font-bold text-gray-800">{accounts.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center mb-1.5">
              <i className="fas fa-plus-circle text-emerald-500 text-[10px]"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Assets</p>
            <p className="text-sm font-bold text-emerald-600 truncate">
              {getCurrencySymbol('PHP')}{totalAssets.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center mb-1.5">
              <i className="fas fa-credit-card text-rose-500 text-[10px]"></i>
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Debt</p>
            <p className="text-sm font-bold text-rose-600 truncate">
              {getCurrencySymbol('PHP')}{totalDebt.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Mobile Account Cards */}
        <div className="space-y-2">
          {accounts.map((account, index) => (
            <div 
              key={account.id} 
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm animate__animated animate__fadeIn"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                    style={{ backgroundColor: account.color || "#4e73df" }}
                  >
                    <i className={`${getAccountTypeIcon(account.account_type)} text-white text-sm`}></i>
                    {account.is_default && (
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center border-0"
                        onClick={() => onDefaultAccountClick && account.id && onDefaultAccountClick(account.id)}
                        disabled={isFormVisible}
                      >
                        <i className="fas fa-star text-white text-[7px]"></i>
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">{account.account_name}</h4>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {account.account_type === 'credit' ? 'Credit Card' : account.account_type}
                      {account.institution_name && ` • ${account.institution_name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    account.account_type === 'credit' 
                      ? (account.balance < 0 ? 'text-rose-600' : account.balance === 0 ? 'text-emerald-600' : 'text-amber-600')
                      : (account.balance >= 0 ? 'text-emerald-600' : 'text-rose-600')
                  }`}>
                    {account.balance < 0 ? '-' : ''}{getCurrencySymbol('PHP')}{Math.abs(account.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  {account.account_type === 'credit' && account.balance < 0 && (
                    <p className="text-[9px] text-gray-400">Debt</p>
                  )}
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100">
                {!account.is_default && onSetAsDefault && (
                  <button
                    type="button"
                    onClick={() => account.id && onSetAsDefault(account.id)}
                    disabled={isFormVisible}
                    className="w-7 h-7 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-colors disabled:opacity-50"
                    title="Set as Default"
                  >
                    <i className="fas fa-star text-[10px]"></i>
                  </button>
                )}
                {onViewHistory && (
                  <button
                    type="button"
                    onClick={() => account.id && onViewHistory(account.id, account.account_name)}
                    disabled={isFormVisible}
                    className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center hover:bg-cyan-100 transition-colors disabled:opacity-50"
                    title="View History"
                  >
                    <i className="fas fa-history text-[10px]"></i>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  disabled={isFormVisible}
                  className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Edit"
                >
                  <i className="fas fa-edit text-[10px]"></i>
                </button>
                <button
                  type="button"
                  onClick={() => account.id && onDelete(account.id)}
                  disabled={isFormVisible}
                  className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <i className="fas fa-trash text-[10px]"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        {/* Desktop Summary Row */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Accounts</div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">{accounts.length}</div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-wallet fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-left-success shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Total Assets</div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {getCurrencySymbol('PHP')}{totalAssets.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-plus-circle fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-left-danger shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">Total Debt</div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {getCurrencySymbol('PHP')}{totalDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-credit-card fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Accounts Table */}
        <div className="card shadow mb-4">
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-list mr-2"></i>
              Your Accounts
            </h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="animate__animated animate__fadeIn">
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle mr-3 d-flex align-items-center justify-content-center"
                            style={{ 
                              backgroundColor: account.color || "#4e73df", 
                              width: "40px", 
                              height: "40px",
                              minWidth: "40px"
                            }}
                          >
                            <i className={`${getAccountTypeIcon(account.account_type)} text-white`}></i>
                          </div>
                          <div>
                            <div className="font-weight-bold">{account.account_name}</div>
                            {account.institution_name && (
                              <small className="text-muted">{account.institution_name}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-light">
                          {account.account_type === 'credit' ? 'Credit Card' : 
                           account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                        </span>
                      </td>
                      <td>{formatBalance(account.balance, account.account_type)}</td>
                      <td>
                        {account.is_default ? (
                          <span className="badge badge-warning">
                            <i className="fas fa-star mr-1"></i>Default
                          </span>
                        ) : (
                          <span className="badge badge-secondary">Active</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          {!account.is_default && onSetAsDefault && (
                            <button
                              type="button"
                              className="btn btn-outline-warning"
                              onClick={() => account.id && onSetAsDefault(account.id)}
                              disabled={isFormVisible}
                              title="Set as Default"
                            >
                              <i className="fas fa-star"></i>
                            </button>
                          )}
                          {onViewHistory && (
                            <button
                              type="button"
                              className="btn btn-outline-info"
                              onClick={() => account.id && onViewHistory(account.id, account.account_name)}
                              disabled={isFormVisible}
                              title="View History"
                            >
                              <i className="fas fa-history"></i>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => onEdit(account)}
                            disabled={isFormVisible}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => account.id && onDelete(account.id)}
                            disabled={isFormVisible}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountsList;
