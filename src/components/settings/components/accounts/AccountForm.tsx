import React, { FC } from 'react';
import FormGroup from '../shared/FormGroup';
import { Account, ACCOUNT_TYPE_OPTIONS } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

interface AccountFormProps {
  editingAccount: Account;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onCancel: () => void;
  error?: string;
}

const AccountForm: FC<AccountFormProps> = ({ 
  editingAccount, 
  onSubmit, 
  onChange, 
  onCancel, 
  error 
}) => {
  return (
    <div className="card shadow-sm border-left-primary mb-4 animate__animated animate__fadeIn">
      <div className="card-body">
        <h5 className="card-title text-primary">
          {editingAccount.id ? "Edit Account" : "Add New Account"}
        </h5>
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <FormGroup label="Account Name" htmlFor="accountName">
            <input
              type="text"
              className="form-control"
              id="accountName"
              name="account_name"
              value={editingAccount.account_name}
              onChange={onChange}
              placeholder="e.g. Cash, Bank, Credit Card"
              required
            />
          </FormGroup>
          
          <FormGroup label="Account Type" htmlFor="accountType">
            <select
              className="form-control"
              id="accountType"
              name="account_type"
              value={editingAccount.account_type}
              onChange={onChange}
            >
              {ACCOUNT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormGroup>
          
          <FormGroup label="Current Balance" htmlFor="accountBalance">
            <div className="input-group">
              <div className="input-group-prepend">
                <span className="input-group-text">
                  {getCurrencySymbol('PHP')}
                </span>
              </div>
              <input
                type="number"
                className="form-control"
                id="accountBalance"
                name="balance"
                value={editingAccount.balance}
                onChange={onChange}
                step="0.01"
                required
              />
            </div>
          </FormGroup>
          
          {/* Currency is now fixed to PHP - display only */}
          <FormGroup label="Currency" htmlFor="accountCurrency">
            <div className="form-control-static">
              <div className="d-flex align-items-center">
                <i className="fas fa-peso-sign text-success mr-2"></i>
                <span className="font-weight-bold">PHP - Philippine Peso (₱)</span>
                <span className="badge badge-primary ml-2">Fixed</span>
              </div>
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              All accounts now use Philippine Pesos for consistency.
            </small>
          </FormGroup>
          
          <FormGroup label="Account Color" htmlFor="accountColor">
            <input
              type="color"
              className="form-control form-control-color"
              id="accountColor"
              name="color"
              value={editingAccount.color || "#4e73df"}
              onChange={onChange}
              title="Choose your account color"
            />
          </FormGroup>
          
          <div className="form-group row">
            <div className="col-sm-9 offset-sm-3">
              <div className="custom-control custom-checkbox">
                <input
                  type="checkbox"
                  className="custom-control-input"
                  id="isDefault"
                  name="is_default"
                  checked={editingAccount.is_default}
                  onChange={onChange}
                />
                <label className="custom-control-label" htmlFor="isDefault">
                  Set as default account
                </label>
                <small className="form-text text-muted">
                  This account will be selected by default for new transactions
                </small>
              </div>
            </div>
          </div>
          
          <div className="form-group row mt-4">
            <div className="col-sm-9 offset-sm-3">
              <button type="submit" className="btn btn-primary mr-2">
                <i className="fas fa-save mr-1"></i> Save Account
              </button>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
