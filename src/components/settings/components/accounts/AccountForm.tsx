import React, { FC } from 'react';
import FormGroup from '../shared/FormGroup';
import { Account, ACCOUNT_TYPE_OPTIONS } from '../../types';
import { getCurrencySymbol } from '../../utils/currencyHelpers';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

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

  // Helper function to get validation classes
  const getValidationClass = (fieldName: string) => {
    if (fieldName === 'account_name') {
      return editingAccount.account_name?.trim() ? 'is-valid' : 'is-invalid';
    }
    if (fieldName === 'balance') {
      const isValid = !isNaN(editingAccount.balance) && editingAccount.balance !== null;
      // Additional validation for credit accounts
      if (editingAccount.account_type === 'credit' && isValid) {
        return editingAccount.balance <= 0 ? 'is-valid' : 'is-invalid';
      }
      return isValid ? 'is-valid' : '';
    }
    return '';
  };

  return (
    <div className="card shadow-sm border-left-primary mb-4 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
      <div className="card-header py-3">
        <h6 className="m-0 font-weight-bold text-primary d-flex align-items-center">
          <i className={`${getAccountTypeIcon(editingAccount.account_type)} mr-2`}></i>
          {editingAccount.id ? "Edit Account" : "Add New Account"}
        </h6>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger animate__animated animate__shakeX" role="alert">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={onSubmit}>
          <FormGroup label="Account Name" htmlFor="accountName">
            <div className="input-group">
              <div className="input-group-prepend">
                <span className="input-group-text">
                  <i className="fas fa-tag text-gray-600"></i>
                </span>
              </div>
              <input
                type="text"
                className={`form-control ${getValidationClass('account_name')}`}
                id="accountName"
                name="account_name"
                value={editingAccount.account_name}
                onChange={onChange}
                placeholder="e.g. Main Checking, Primary Savings, Travel Fund"
                required
                maxLength={50}
              />
              <div className="valid-feedback">
                Looks good!
              </div>
              <div className="invalid-feedback">
                Please provide a valid account name.
              </div>
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              Choose a descriptive name that helps you identify this account
            </small>
          </FormGroup>
          
          <FormGroup label="Account Type" htmlFor="accountType">
            <div className="input-group">
              <div className="input-group-prepend">
                <span className="input-group-text">
                  <i className={`${getAccountTypeIcon(editingAccount.account_type)} text-gray-600`}></i>
                </span>
              </div>
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
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              Select the type that best describes your account
            </small>
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
                className={`form-control ${getValidationClass('balance')}`}
                id="accountBalance"
                name="balance"
                value={editingAccount.balance}
                onChange={onChange}
                step="0.01"
                placeholder="0.00"
                required
              />
              <div className="valid-feedback">
                Valid amount
              </div>
              <div className="invalid-feedback">
                {editingAccount.account_type === 'credit' 
                  ? 'Credit account balance must be zero or negative' 
                  : 'Please enter a valid amount'}
              </div>
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              {editingAccount.account_type === 'credit' 
                ? 'For credit cards, enter negative amounts (e.g., -1500.00 for ₱1,500 debt)'
                : 'Enter the current balance in Philippine Pesos (₱)'}
            </small>
          </FormGroup>
          
          {/* Currency Information Display */}
          <FormGroup label="Currency" htmlFor="accountCurrency">
            <div className="form-control-static">
              <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                <div className="d-flex align-items-center">
                  <i className="fas fa-peso-sign text-success mr-3 fa-lg"></i>
                  <div>
                    <div className="font-weight-bold text-gray-800">Philippine Peso (PHP)</div>
                    <div className="text-gray-600">₱ - Standard Currency</div>
                  </div>
                </div>
                <span className="badge badge-primary">
                  <i className="fas fa-lock mr-1"></i>
                  Fixed
                </span>
              </div>
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              All accounts use Philippine Pesos for consistency across the platform
            </small>
          </FormGroup>
          
          <FormGroup label="Account Color" htmlFor="accountColor">
            <div className="row">
              <div className="col-md-8">
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text" style={{ backgroundColor: editingAccount.color || "#4e73df" }}>
                      <i className="fas fa-palette text-white"></i>
                    </span>
                  </div>
                  <input
                    type="color"
                    className="form-control form-control-color"
                    id="accountColor"
                    name="color"
                    value={editingAccount.color || "#4e73df"}
                    onChange={onChange}
                    title="Choose your account color"
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={editingAccount.color || "#4e73df"}
                    onChange={(e) => {
                      const event = {
                        target: {
                          name: 'color',
                          value: e.target.value,
                          type: 'text'
                        }
                      } as React.ChangeEvent<HTMLInputElement>;
                      onChange(event);
                    }}
                    placeholder="#4e73df"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div 
                  className="color-preview d-flex align-items-center justify-content-center rounded" 
                  style={{ 
                    backgroundColor: editingAccount.color || "#4e73df", 
                    height: "38px",
                    color: "white",
                    fontWeight: "bold"
                  }}
                >
                  <i className={`${getAccountTypeIcon(editingAccount.account_type)} mr-2`}></i>
                  Preview
                </div>
              </div>
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              Choose a color to help visually identify this account in charts and lists
            </small>
          </FormGroup>
          
          <FormGroup label="Default Account" htmlFor="isDefault">
            <div className="d-flex align-items-center">
              <input
                type="checkbox"
                className="mr-2"
                id="isDefault"
                name="is_default"
                checked={editingAccount.is_default}
                onChange={onChange}
              />
              <label className="mb-0 font-weight-bold" htmlFor="isDefault">
                Auto-selected for new transactions
              </label>
              {editingAccount.is_default && (
                <span className="badge badge-warning ml-2">
                  <i className="fas fa-star mr-1"></i>
                  Current Default
                </span>
              )}
            </div>
            <small className="form-text text-muted">
              <i className="fas fa-info-circle mr-1 text-gray-400"></i>
              When set as default, this account will be automatically selected when creating new transactions
            </small>
          </FormGroup>
          
          <div className="form-group d-flex align-items-center justify-content-end">
            <button type="button" className="btn btn-secondary mr-3" onClick={onCancel}>
              <i className="fas fa-times mr-1"></i>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save mr-1"></i>
              {editingAccount.id ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
