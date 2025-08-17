import React, { FC } from 'react';
import { Account } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

interface AccountsListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  isFormVisible: boolean;
}

const AccountsList: FC<AccountsListProps> = ({ 
  accounts, 
  onEdit, 
  onDelete, 
  isFormVisible 
}) => {
  if (accounts.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="fas fa-info-circle mr-2"></i>
        You haven't added any accounts yet. Click the "Add Account" button to get started.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-hover">
        <thead className="thead-light">
          <tr>
            <th>Account Name</th>
            <th>Type</th>
            <th>Balance</th>
            <th>Currency</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>
                <div className="d-flex align-items-center">
                  <span 
                    className="account-color-indicator mr-2"
                    style={{ 
                      backgroundColor: account.color || "#4e73df", 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%",
                      display: "inline-block"
                    }}
                  ></span>
                  {account.account_name}
                </div>
              </td>
              <td>
                <span className="text-capitalize">
                  {account.account_type}
                </span>
              </td>
              <td>
                {getCurrencySymbol(account.currency)}
                {account.balance.toFixed(2)}
              </td>
              <td>{account.currency}</td>
              <td>
                {account.is_default && (
                  <span className="badge badge-primary">Default</span>
                )}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary mr-1"
                  onClick={() => onEdit(account)}
                  disabled={isFormVisible}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(account.id)}
                  disabled={isFormVisible}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountsList;
