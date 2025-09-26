import React, { FC } from 'react';
import { Account } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface AccountsListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onSetAsDefault?: (accountId: string) => void;
  onDefaultAccountClick?: (currentDefaultId: string) => void;
  isFormVisible: boolean;
}

const AccountsList: FC<AccountsListProps> = ({ 
  accounts, 
  onEdit, 
  onDelete, 
  onSetAsDefault,
  onDefaultAccountClick,
  isFormVisible 
}) => {
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

  // Helper function to format balance with appropriate styling
  const formatBalance = (balance: number, accountType: string) => {
    const formattedAmount = `${getCurrencySymbol('PHP')}${Math.abs(balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (accountType === 'credit') {
      if (balance < 0) {
        return (
          <span className="text-danger font-weight-bold">
            -{formattedAmount}
          </span>
        );
      } else if (balance === 0) {
        return (
          <span className="text-success font-weight-bold">
            {formattedAmount}
          </span>
        );
      } else {
        return (
          <span className="text-warning font-weight-bold">
            +{formattedAmount}
          </span>
        );
      }
    } else {
      return (
        <span className={`font-weight-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
          {balance >= 0 ? '' : '-'}{formattedAmount}
        </span>
      );
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="card shadow-sm animate__animated animate__fadeIn">
        <div className="card-body text-center py-5">
          <div className="mb-3">
            <i className="fas fa-bank fa-3x text-gray-300"></i>
          </div>
          <h5 className="text-gray-800 mb-2">No Accounts Found</h5>
          <p className="text-gray-600 mb-0">
            You haven't added any accounts yet. Click the "Add Account" button to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm animate__animated animate__fadeIn" style={{ animationDelay: "0.2s" }}>
      <div className="card-header py-3">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          <div>
            <i className="fas fa-list mr-2"></i>
            Your Accounts
            <span className="badge badge-light ml-2">{accounts.length}</span>
          </div>
        </h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="thead-light">
              <tr>
                <th className="border-0 font-weight-bold text-gray-700">
                  <i className="fas fa-tag mr-1"></i>
                  Account Name
                </th>
                <th className="border-0 font-weight-bold text-gray-700">
                  <i className="fas fa-layer-group mr-1"></i>
                  Type
                </th>
                <th className="border-0 font-weight-bold text-gray-700 text-right">
                  <i className="fas fa-peso-sign mr-1"></i>
                  Balance
                </th>
                <th className="border-0 font-weight-bold text-gray-700 text-center">
                  <i className="fas fa-cogs mr-1"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => (
                <tr 
                  key={account.id} 
                  className={`animate__animated animate__fadeIn`}
                  style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                >
                  <td className="align-middle">
                    <div className="d-flex align-items-center">
                      <div 
                        className="account-color-indicator rounded-circle mr-3 d-flex align-items-center justify-content-center position-relative"
                        style={{ 
                          backgroundColor: account.color || "#4e73df", 
                          width: "32px", 
                          height: "32px",
                          minWidth: "32px"
                        }}
                        title={`${account.account_name} - ${account.account_type}`}
                      >
                        <i className={`${getAccountTypeIcon(account.account_type)} text-white fa-sm`}></i>
                        {account.is_default && (
                          <button
                            type="button"
                            className="position-absolute badge badge-warning rounded-circle p-1 border-0" 
                            style={{ 
                              top: "-2px", 
                              right: "-2px", 
                              fontSize: "0.6rem",
                              minWidth: "14px",
                              height: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="Change Default Account"
                            onClick={() => onDefaultAccountClick && account.id && onDefaultAccountClick(account.id)}
                            disabled={isFormVisible}
                          >
                            <i className="fas fa-star" style={{ fontSize: "0.5rem" }}></i>
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="font-weight-bold text-gray-800">{account.account_name}</div>
                        {account.description && (
                          <small className="text-gray-500">{account.description}</small>
                        )}
                        {account.institution_name && (
                          <small className="text-gray-500 d-block">
                            <i className="fas fa-building mr-1"></i>
                            {account.institution_name}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="align-middle">
                    <div className="d-flex align-items-center">
                      <i className={`${getAccountTypeIcon(account.account_type)} text-gray-500 mr-2`}></i>
                      <span className="text-capitalize font-weight-medium">
                        {account.account_type === 'credit' ? 'Credit Card' : account.account_type}
                      </span>
                    </div>
                  </td>
                  <td className="align-middle text-right">
                    <div>
                      {formatBalance(account.balance, account.account_type)}
                    </div>
                    {account.account_type === 'credit' && account.balance < 0 && (
                      <small className="text-muted">
                        Debt Outstanding
                      </small>
                    )}
                    {account.account_type === 'credit' && account.balance === 0 && (
                      <small className="text-success">
                        Paid Off
                      </small>
                    )}
                  </td>
                  <td className="align-middle text-center">
                    <div className="btn-group" role="group">
                      {!account.is_default && onSetAsDefault && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => account.id && onSetAsDefault(account.id)}
                          disabled={isFormVisible}
                          title="Set as Default Account"
                        >
                          <i className="fas fa-star"></i>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEdit(account)}
                        disabled={isFormVisible}
                        title="Edit Account"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => account.id && onDelete(account.id)}
                        disabled={isFormVisible}
                        title="Delete Account"
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
      
      {/* Account Summary Footer */}
      <div className="card-footer bg-light">
        <div className="row text-center">
          <div className="col-md-4">
            <div className="d-flex align-items-center justify-content-center">
              <i className="fas fa-wallet text-primary mr-2"></i>
              <div>
                <div className="font-weight-bold text-gray-800">{accounts.length}</div>
                <small className="text-gray-600">Total Accounts</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex align-items-center justify-content-center">
              <i className="fas fa-plus-circle text-success mr-2"></i>
              <div>
                <div className="font-weight-bold text-success">
                  {formatBalance(
                    accounts
                      .filter(acc => acc.account_type !== 'credit')
                      .reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0),
                    'savings'
                  )}
                </div>
                <small className="text-gray-600">Total Assets</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex align-items-center justify-content-center">
              <i className="fas fa-credit-card text-danger mr-2"></i>
              <div>
                <div className="font-weight-bold text-danger">
                  {formatBalance(
                    Math.abs(accounts
                      .filter(acc => acc.account_type === 'credit')
                      .reduce((sum, acc) => sum + (acc.balance < 0 ? acc.balance : 0), 0)),
                    'credit'
                  )}
                </div>
                <small className="text-gray-600">Total Debt</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsList;
