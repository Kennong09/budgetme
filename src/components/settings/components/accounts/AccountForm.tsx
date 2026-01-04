import React, { FC } from 'react';
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
  isSaving?: boolean;
}

const AccountForm: FC<AccountFormProps> = ({ 
  editingAccount, 
  onSubmit, 
  onChange, 
  onCancel, 
  error,
  isSaving = false
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

  // Helper function to check if form is valid
  const isFormValid = () => {
    const hasValidName = editingAccount.account_name?.trim() !== '';
    const hasValidBalance = !isNaN(editingAccount.balance) && editingAccount.balance !== null;
    const isCreditBalanceValid = editingAccount.account_type !== 'credit' || editingAccount.balance <= 0;
    
    return hasValidName && hasValidBalance && isCreditBalanceValid;
  };

  // Mobile Form Component
  const MobileAccountForm = () => (
    <div className="block md:hidden w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className={`${getAccountTypeIcon(editingAccount.account_type)} text-white`}></i>
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">
                {editingAccount.id ? "Edit Account" : "New Account"}
              </h2>
              <p className="text-indigo-100 text-[10px]">Fill in the details below</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
          >
            <i className="fas fa-times text-white text-xs"></i>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-exclamation-circle text-rose-500 text-sm"></i>
            <span className="text-rose-700 text-xs">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Account Name */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Account Name
          </label>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fas fa-tag text-indigo-500 text-sm"></i>
            </div>
            <input
              type="text"
              name="account_name"
              value={editingAccount.account_name}
              onChange={onChange}
              placeholder="e.g. Main Checking"
              className="flex-1 text-sm text-gray-800 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
              required
              maxLength={50}
            />
          </div>
          {!editingAccount.account_name?.trim() && (
            <p className="text-rose-500 text-[10px] mt-2">Please provide a valid account name</p>
          )}
        </div>

        {/* Account Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Account Type
          </label>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className={`${getAccountTypeIcon(editingAccount.account_type)} text-purple-500 text-sm`}></i>
            </div>
            <select
              name="account_type"
              value={editingAccount.account_type}
              onChange={onChange}
              className="flex-1 text-sm text-gray-800 bg-transparent border-0 focus:ring-0 focus:outline-none"
            >
              {ACCOUNT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Current Balance
          </label>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-500 font-semibold text-sm">{getCurrencySymbol('PHP')}</span>
            </div>
            <input
              type="number"
              name="balance"
              value={editingAccount.balance === 0 ? '' : editingAccount.balance}
              onChange={onChange}
              step="0.01"
              placeholder="0.00"
              className="flex-1 text-sm text-gray-800 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => {
                const currentValue = editingAccount.balance || 0;
                const newValue = currentValue * -1;
                const event = {
                  target: { name: 'balance', value: newValue.toString(), type: 'number' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
              }}
              className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
            >
              <span className="text-gray-600 text-xs font-medium">±</span>
            </button>
          </div>
          {editingAccount.account_type === 'credit' && (
            <p className="text-amber-600 text-[10px] mt-2">
              <i className="fas fa-info-circle mr-1"></i>
              Credit balance should be zero or negative
            </p>
          )}
        </div>

        {/* Currency Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Currency
          </label>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-peso-sign text-green-500 text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Philippine Peso (PHP)</p>
                <p className="text-[10px] text-gray-500">₱ - Standard Currency</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium">
              <i className="fas fa-lock mr-1"></i>Fixed
            </span>
          </div>
        </div>

        {/* Account Color */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Account Color
          </label>
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: editingAccount.color || "#4e73df" }}
            >
              <i className="fas fa-palette text-white text-sm"></i>
            </div>
            <input
              type="color"
              name="color"
              value={editingAccount.color || "#4e73df"}
              onChange={onChange}
              className="w-12 h-10 rounded-lg border-0 cursor-pointer"
            />
            <input
              type="text"
              value={editingAccount.color || "#4e73df"}
              onChange={(e) => {
                const event = {
                  target: { name: 'color', value: e.target.value, type: 'text' }
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
              }}
              className="flex-1 text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border-0"
              placeholder="#4e73df"
            />
          </div>
        </div>

        {/* Default Account Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="fas fa-star text-amber-500 text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Default Account</p>
                <p className="text-[10px] text-gray-500">Auto-selected for transactions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_default"
                checked={editingAccount.is_default}
                onChange={onChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !isFormValid()}
            className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{editingAccount.id ? "Updating..." : "Creating..."}</span>
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                <span>{editingAccount.id ? "Update" : "Create"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // Desktop Form Component
  const DesktopAccountForm = () => (
    <div className="hidden md:block card shadow-sm border-0 animate__animated animate__fadeIn animate__faster">
      <div className="card-header py-3 bg-primary">
        <h6 className="m-0 font-weight-bold text-white">
          <i className={`${getAccountTypeIcon(editingAccount.account_type)} mr-2`}></i>
          {editingAccount.id ? "Edit Account" : "Add New Account"}
        </h6>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={onSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-tag mr-1"></i>
                  Account Name
                </label>
                <input
                  type="text"
                  name="account_name"
                  className={`form-control ${getValidationClass('account_name')}`}
                  value={editingAccount.account_name}
                  onChange={onChange}
                  placeholder="e.g. Main Checking"
                  required
                  maxLength={50}
                />
                <small className="form-text text-muted">Enter a unique name for this account</small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-folder mr-1"></i>
                  Account Type
                </label>
                <select
                  name="account_type"
                  className="form-control"
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
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-coins mr-1"></i>
                  Current Balance
                </label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light">{getCurrencySymbol('PHP')}</span>
                  </div>
                  <input
                    type="number"
                    name="balance"
                    className={`form-control ${getValidationClass('balance')}`}
                    value={editingAccount.balance === 0 ? '' : editingAccount.balance}
                    onChange={onChange}
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        const currentValue = editingAccount.balance || 0;
                        const newValue = currentValue * -1;
                        const event = {
                          target: { name: 'balance', value: newValue.toString(), type: 'number' }
                        } as React.ChangeEvent<HTMLInputElement>;
                        onChange(event);
                      }}
                      title="Toggle positive/negative"
                    >
                      ±
                    </button>
                  </div>
                </div>
                {editingAccount.account_type === 'credit' && (
                  <small className="text-warning">
                    <i className="fas fa-info-circle mr-1"></i>
                    Credit balance should be zero or negative
                  </small>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-globe mr-1"></i>
                  Currency
                </label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-light">
                      <i className="fas fa-peso-sign"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value="Philippine Peso (PHP)"
                    readOnly
                    disabled
                  />
                  <div className="input-group-append">
                    <span className="input-group-text bg-primary text-white">
                      <i className="fas fa-lock"></i>
                    </span>
                  </div>
                </div>
                <small className="text-muted">Currency is fixed to PHP</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-palette mr-1"></i>
                  Account Color
                </label>
                <div className="d-flex align-items-center">
                  <input
                    type="color"
                    name="color"
                    value={editingAccount.color || "#4e73df"}
                    onChange={onChange}
                    className="mr-2"
                    style={{ width: '50px', height: '38px', border: 'none', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    value={editingAccount.color || "#4e73df"}
                    onChange={(e) => {
                      const event = {
                        target: { name: 'color', value: e.target.value, type: 'text' }
                      } as React.ChangeEvent<HTMLInputElement>;
                      onChange(event);
                    }}
                    placeholder="#4e73df"
                  />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label className="small font-weight-bold text-gray-700">
                  <i className="fas fa-star mr-1"></i>
                  Default Account
                </label>
                <div className="custom-control custom-switch mt-2">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="is_default_desktop"
                    name="is_default"
                    checked={editingAccount.is_default}
                    onChange={onChange}
                  />
                  <label className="custom-control-label" htmlFor="is_default_desktop">
                    {editingAccount.is_default ? 'This is the default account' : 'Set as default account'}
                  </label>
                </div>
                <small className="text-muted">Default account is auto-selected for new transactions</small>
              </div>
            </div>
          </div>

          <hr />

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary mr-2"
              onClick={onCancel}
              disabled={isSaving}
            >
              <i className="fas fa-times mr-1"></i>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving || !isFormValid()}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  {editingAccount.id ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-1"></i>
                  {editingAccount.id ? "Update Account" : "Create Account"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <MobileAccountForm />
      <DesktopAccountForm />
    </>
  );
};

export default AccountForm;
