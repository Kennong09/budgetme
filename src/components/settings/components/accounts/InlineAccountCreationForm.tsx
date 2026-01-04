import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../utils/AuthContext';
import { useToast } from '../../../../utils/ToastContext';
import { AccountService } from '../../../../services/database/accountService';
import { TransactionService } from '../../../../services/database/transactionService';
import { AccountAuditService } from '../../../../services/database/accountAuditService';
import { Account } from '../../types';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

// Types for the inline form
interface AccountFormData {
  account_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other';
  initial_balance: number;
  description: string;
  institution_name: string;
  color: string;
  is_default: boolean;
}

interface CashInFormData {
  amount: number;
  description: string;
  date: string;
  source: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onAccountCreated: (account: Account) => void;
  existingAccounts: Account[];
}

// Validation Engine (simplified version from AccountSetupModal)
class ValidationEngine {
  static validateAccountData(accountData: AccountFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    // Account name validation
    if (!accountData.account_name?.trim()) {
      errors.account_name = 'Account name is required';
    } else if (accountData.account_name.trim().length < 2) {
      errors.account_name = 'Account name must be at least 2 characters long';
    } else if (accountData.account_name.trim().length > 50) {
      errors.account_name = 'Account name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z0-9\s\-_'.()]+$/.test(accountData.account_name.trim())) {
      errors.account_name = 'Account name contains invalid characters';
    }

    // Account type validation
    if (!accountData.account_type) {
      errors.account_type = 'Please select an account type';
    }

    // Initial balance validation
    if (accountData.initial_balance === null || accountData.initial_balance === undefined) {
      errors.initial_balance = 'Initial balance is required';
    } else if (isNaN(accountData.initial_balance)) {
      errors.initial_balance = 'Please enter a valid amount';
    } else {
      // Credit account specific validation
      if (accountData.account_type === 'credit' && accountData.initial_balance > 0) {
        errors.initial_balance = 'Credit card balance should be zero or negative (representing debt)';
      }
      
      // General balance limits
      if (accountData.initial_balance < -999999999.99) {
        errors.initial_balance = 'Balance cannot be less than -₱999,999,999.99';
      } else if (accountData.initial_balance > 999999999.99) {
        errors.initial_balance = 'Balance cannot exceed ₱999,999,999.99';
      }
    }

    // Institution name validation (optional)
    if (accountData.institution_name && accountData.institution_name.length > 100) {
      errors.institution_name = 'Institution name cannot exceed 100 characters';
    }

    // Description validation (optional)
    if (accountData.description && accountData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    return errors;
  }

  static validateCashInData(cashInData: CashInFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    // Amount validation
    if (cashInData.amount === null || cashInData.amount === undefined) {
      errors.cash_in_amount = 'Cash-in amount is required';
    } else if (isNaN(cashInData.amount)) {
      errors.cash_in_amount = 'Please enter a valid amount';
    } else if (cashInData.amount <= 0) {
      errors.cash_in_amount = 'Cash-in amount must be greater than zero';
    } else if (cashInData.amount < 0.01) {
      errors.cash_in_amount = 'Minimum cash-in amount is ₱0.01';
    } else if (cashInData.amount > 999999999.99) {
      errors.cash_in_amount = 'Cash-in amount cannot exceed ₱999,999,999.99';
    }

    // Description validation
    if (!cashInData.description?.trim()) {
      errors.cash_in_description = 'Description is required for cash-in transactions';
    } else if (cashInData.description.trim().length < 3) {
      errors.cash_in_description = 'Description must be at least 3 characters long';
    } else if (cashInData.description.trim().length > 200) {
      errors.cash_in_description = 'Description cannot exceed 200 characters';
    }

    // Date validation
    if (!cashInData.date) {
      errors.cash_in_date = 'Date is required';
    } else {
      const selectedDate = new Date(cashInData.date);
      const today = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days in future

      if (selectedDate > futureLimit) {
        errors.cash_in_date = 'Date cannot be more than 7 days in the future';
      }

      const pastLimit = new Date();
      pastLimit.setFullYear(today.getFullYear() - 10); // Allow up to 10 years in past

      if (selectedDate < pastLimit) {
        errors.cash_in_date = 'Date cannot be more than 10 years in the past';
      }
    }

    // Source validation (optional)
    if (cashInData.source && cashInData.source.length > 100) {
      errors.cash_in_source = 'Source cannot exceed 100 characters';
    }

    return errors;
  }

  static hasValidationErrors(errors: ValidationErrors): boolean {
    return Object.keys(errors).some(key => errors[key] !== undefined && errors[key] !== '');
  }

  static sanitizeAccountName(name: string): string {
    return name
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 50); // Limit length
  }

  static roundToCentavo(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}

const InlineAccountCreationForm: React.FC<Props> = ({ 
  isVisible, 
  onClose, 
  onAccountCreated, 
  existingAccounts 
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();

  // Form state
  const [currentStep, setCurrentStep] = useState<'account_details' | 'cash_in' | 'review'>('account_details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Account form data
  const [accountData, setAccountData] = useState<AccountFormData>({
    account_name: '',
    account_type: 'checking',
    initial_balance: 0,
    description: '',
    institution_name: '',
    color: '#4e73df',
    is_default: existingAccounts.length === 0
  });

  // Cash-in form data
  const [cashInData, setCashInData] = useState<CashInFormData>({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    source: ''
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [includeCashIn, setIncludeCashIn] = useState(false);

  // Validation
  const isAccountStepValid = useMemo(() => {
    const errors = ValidationEngine.validateAccountData(accountData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [accountData]);

  const isCashInStepValid = useMemo(() => {
    if (!includeCashIn || cashInData.amount <= 0) return true;
    const errors = ValidationEngine.validateCashInData(cashInData);
    return !ValidationEngine.hasValidationErrors(errors);
  }, [cashInData, includeCashIn]);

  // Account type options
  const accountTypes = [
    { value: 'checking', label: 'Checking Account', icon: 'fas fa-university', description: 'For daily transactions and bill payments' },
    { value: 'savings', label: 'Savings Account', icon: 'fas fa-piggy-bank', description: 'For saving money and earning interest' },
    { value: 'credit', label: 'Credit Card', icon: 'fas fa-credit-card', description: 'For credit purchases and building credit history' },
    { value: 'investment', label: 'Investment Account', icon: 'fas fa-chart-line', description: 'For stocks, bonds, and other investments' },
    { value: 'cash', label: 'Cash', icon: 'fas fa-money-bill-wave', description: 'For cash on hand and petty expenses' },
    { value: 'other', label: 'Other', icon: 'fas fa-wallet', description: 'For specialized accounts not covered by other types' }
  ];

  // Color options
  const colorOptions = [
    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796',
    '#5a5c69', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
  ];

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) {
      showErrorToast("You must be logged in to create accounts");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Validate account data
      const accountErrors = ValidationEngine.validateAccountData(accountData);
      if (ValidationEngine.hasValidationErrors(accountErrors)) {
        setValidationErrors(accountErrors);
        showErrorToast('Please fix validation errors before submitting');
        return;
      }

      // Validate cash-in data if included
      if (includeCashIn && cashInData.amount > 0) {
        const cashInErrors = ValidationEngine.validateCashInData(cashInData);
        if (ValidationEngine.hasValidationErrors(cashInErrors)) {
          setValidationErrors(cashInErrors);
          showErrorToast('Please fix cash-in validation errors before submitting');
          return;
        }
      }

      // Prepare account data
      const accountPayload = {
        user_id: user.id,
        account_name: ValidationEngine.sanitizeAccountName(accountData.account_name),
        account_type: accountData.account_type,
        balance: ValidationEngine.roundToCentavo(accountData.initial_balance),
        initial_balance: ValidationEngine.roundToCentavo(accountData.initial_balance),
        description: accountData.description?.trim() || undefined,
        institution_name: accountData.institution_name?.trim() || undefined,
        color: accountData.color || '#4e73df',
        is_default: accountData.is_default,
        currency: 'PHP',
        status: 'active' as const,
        created_at: new Date().toISOString()
      };

      // Create account
      const accountResult = await AccountService.createAccount(accountPayload);
      if (!accountResult.success) {
        throw new Error(`Failed to create account: ${accountResult.error}`);
      }

      const createdAccount = accountResult.data;
      if (!createdAccount?.id) {
        throw new Error('Account created but ID not returned');
      }

      // Log account creation audit
      await AccountAuditService.logAccountCreated(
        user.id,
        {
          account_id: createdAccount.id,
          account_name: accountPayload.account_name,
          account_type: accountPayload.account_type,
          initial_balance: accountPayload.balance,
          source: 'inline_account_form'
        },
        navigator.userAgent
      );

      // Create cash-in transaction if included
      if (includeCashIn && cashInData.amount > 0) {
        const transactionData = {
          user_id: user.id,
          account_id: createdAccount.id,
          type: 'cash_in',
          amount: ValidationEngine.roundToCentavo(cashInData.amount),
          date: cashInData.date,
          description: ValidationEngine.sanitizeAccountName(cashInData.description.trim()),
          source: cashInData.source?.trim() || null,
          created_at: new Date().toISOString()
        };

        const transactionResult = await TransactionService.createTransaction(transactionData);
        if (!transactionResult.success) {
          console.error('Failed to create cash-in transaction:', transactionResult.error);
          // Don't fail the whole process if cash-in fails
        } else {
          // Log cash-in audit
          await AccountAuditService.logCashIn(
            user.id,
            {
              account_id: createdAccount.id,
              account_name: accountPayload.account_name,
              amount: cashInData.amount,
              description: cashInData.description.trim(),
              source: 'inline_account_form',
              transaction_id: transactionResult.data?.id
            },
            navigator.userAgent
          );
        }
      }

      showSuccessToast("Account created successfully!");
      onAccountCreated(createdAccount);
      onClose();
      
    } catch (error) {
      console.error('Error creating account:', error);
      showErrorToast(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle step navigation
  const handleNext = () => {
    if (currentStep === 'account_details' && isAccountStepValid) {
      setCurrentStep('cash_in');
    } else if (currentStep === 'cash_in' && isCashInStepValid) {
      setCurrentStep('review');
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'cash_in') {
      setCurrentStep('account_details');
    } else if (currentStep === 'review') {
      setCurrentStep('cash_in');
    }
  };

  // Reset form when closing
  const handleClose = () => {
    setCurrentStep('account_details');
    setAccountData({
      account_name: '',
      account_type: 'checking',
      initial_balance: 0,
      description: '',
      institution_name: '',
      color: '#4e73df',
      is_default: existingAccounts.length === 0
    });
    setCashInData({
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      source: ''
    });
    setValidationErrors({});
    setIncludeCashIn(false);
    onClose();
  };

  if (!isVisible) return null;

  // Mobile Step Indicator Component
  const MobileStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className={`flex items-center gap-1 ${currentStep === 'account_details' ? 'text-indigo-600' : 'text-gray-400'}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          currentStep === 'account_details' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {currentStep === 'account_details' ? '1' : <i className="fas fa-check text-[8px]"></i>}
        </div>
        <span className="text-[10px] font-medium hidden xs:inline">Details</span>
      </div>
      <div className={`w-6 h-0.5 ${currentStep !== 'account_details' ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
      <div className={`flex items-center gap-1 ${currentStep === 'cash_in' ? 'text-indigo-600' : 'text-gray-400'}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          currentStep === 'cash_in' ? 'bg-indigo-500 text-white' : 
          currentStep === 'review' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {currentStep === 'review' ? <i className="fas fa-check text-[8px]"></i> : '2'}
        </div>
        <span className="text-[10px] font-medium hidden xs:inline">Cash In</span>
      </div>
      <div className={`w-6 h-0.5 ${currentStep === 'review' ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
      <div className={`flex items-center gap-1 ${currentStep === 'review' ? 'text-indigo-600' : 'text-gray-400'}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          currentStep === 'review' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          3
        </div>
        <span className="text-[10px] font-medium hidden xs:inline">Review</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Inline Account Creation Form */}
      <div className="block md:hidden mb-4 animate__animated animate__fadeIn">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-plus-circle text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">New Account</h3>
                  <p className="text-indigo-100 text-[10px]">
                    Step {currentStep === 'account_details' ? '1' : currentStep === 'cash_in' ? '2' : '3'} of 3
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                onClick={handleClose}
              >
                <i className="fas fa-times text-white text-xs"></i>
              </button>
            </div>
          </div>

          <div className="p-4">
            <MobileStepIndicator />

            {/* Mobile Step 1: Account Details */}
            {currentStep === 'account_details' && (
              <div className="animate__animated animate__fadeIn">
                {/* Account Name */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Account Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="fas fa-tag text-gray-400 text-xs"></i>
                    </div>
                    <input
                      type="text"
                      className={`w-full pl-9 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        validationErrors.account_name ? 'border-rose-300' : 'border-gray-200'
                      }`}
                      value={accountData.account_name}
                      onChange={(e) => setAccountData(prev => ({ ...prev, account_name: e.target.value }))}
                      placeholder="e.g., Main Checking"
                    />
                  </div>
                  {validationErrors.account_name && (
                    <p className="text-rose-500 text-[10px] mt-1">{validationErrors.account_name}</p>
                  )}
                </div>

                {/* Account Type */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Account Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {accountTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountData(prev => ({ 
                          ...prev, 
                          account_type: type.value as any,
                          initial_balance: type.value === 'credit' ? 0 : prev.initial_balance
                        }))}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          accountData.account_type === type.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <i className={`${type.icon} text-sm mb-1 block`}></i>
                        <span className="text-[9px] font-medium">{type.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Balance */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Initial Balance <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <span className="text-gray-400 text-sm font-medium">₱</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        validationErrors.initial_balance ? 'border-rose-300' : 'border-gray-200'
                      }`}
                      value={accountData.initial_balance || ''}
                      onChange={(e) => setAccountData(prev => ({ 
                        ...prev, 
                        initial_balance: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                  {validationErrors.initial_balance && (
                    <p className="text-rose-500 text-[10px] mt-1">{validationErrors.initial_balance}</p>
                  )}
                  {accountData.account_type === 'credit' && (
                    <p className="text-amber-600 text-[10px] mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Enter 0 or negative for credit debt
                    </p>
                  )}
                </div>

                {/* Institution Name */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Bank/Institution
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="fas fa-building text-gray-400 text-xs"></i>
                    </div>
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      value={accountData.institution_name}
                      onChange={(e) => setAccountData(prev => ({ ...prev, institution_name: e.target.value }))}
                      placeholder="e.g., BPI, BDO"
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Account Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccountData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full transition-all ${
                          accountData.color === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Default Account Toggle */}
                {existingAccounts.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-star text-amber-500 text-sm"></i>
                        <span className="text-xs font-medium text-gray-700">Set as default</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accountData.is_default}
                          onChange={(e) => setAccountData(prev => ({ ...prev, is_default: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Next Button */}
                <button 
                  type="button" 
                  className="w-full py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={handleNext}
                  disabled={!isAccountStepValid}
                >
                  Next: Cash In
                  <i className="fas fa-arrow-right text-xs"></i>
                </button>
              </div>
            )}

            {/* Mobile Step 2: Cash In */}
            {currentStep === 'cash_in' && (
              <div className="animate__animated animate__fadeIn">
                {/* Include Cash In Toggle */}
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-money-bill-wave text-emerald-500 text-sm"></i>
                      <div>
                        <span className="text-xs font-semibold text-emerald-700">Add initial money</span>
                        <p className="text-[9px] text-emerald-600">Optional - can add later</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCashIn}
                        onChange={(e) => setIncludeCashIn(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {includeCashIn && (
                  <>
                    {/* Cash In Amount */}
                    <div className="mb-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Amount <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <span className="text-emerald-500 text-sm font-medium">₱</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          className={`w-full pl-8 pr-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                            validationErrors.cash_in_amount ? 'border-rose-300' : 'border-gray-200'
                          }`}
                          value={cashInData.amount || ''}
                          onChange={(e) => setCashInData(prev => ({ 
                            ...prev, 
                            amount: parseFloat(e.target.value) || 0 
                          }))}
                          placeholder="0.00"
                        />
                      </div>
                      {validationErrors.cash_in_amount && (
                        <p className="text-rose-500 text-[10px] mt-1">{validationErrors.cash_in_amount}</p>
                      )}
                    </div>

                    {/* Cash In Date */}
                    <div className="mb-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                          validationErrors.cash_in_date ? 'border-rose-300' : 'border-gray-200'
                        }`}
                        value={cashInData.date}
                        onChange={(e) => setCashInData(prev => ({ ...prev, date: e.target.value }))}
                      />
                      {validationErrors.cash_in_date && (
                        <p className="text-rose-500 text-[10px] mt-1">{validationErrors.cash_in_date}</p>
                      )}
                    </div>

                    {/* Cash In Description */}
                    <div className="mb-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Description <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                          validationErrors.cash_in_description ? 'border-rose-300' : 'border-gray-200'
                        }`}
                        value={cashInData.description}
                        onChange={(e) => setCashInData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Initial deposit"
                      />
                      {validationErrors.cash_in_description && (
                        <p className="text-rose-500 text-[10px] mt-1">{validationErrors.cash_in_description}</p>
                      )}
                    </div>

                    {/* Cash In Source */}
                    <div className="mb-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Source
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        value={cashInData.source}
                        onChange={(e) => setCashInData(prev => ({ ...prev, source: e.target.value }))}
                        placeholder="e.g., Salary, Transfer"
                      />
                    </div>
                  </>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                    onClick={handlePrevious}
                  >
                    <i className="fas fa-arrow-left text-xs mr-1"></i>
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    onClick={handleNext}
                    disabled={!isCashInStepValid}
                  >
                    Review
                    <i className="fas fa-arrow-right text-xs"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Step 3: Review */}
            {currentStep === 'review' && (
              <div className="animate__animated animate__fadeIn">
                {/* Account Summary Card */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 mb-4 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: accountData.color || '#4e73df' }}
                    >
                      <i className={`${accountTypes.find(t => t.value === accountData.account_type)?.icon} text-white text-lg`}></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-base">{accountData.account_name || 'New Account'}</h4>
                      <p className="text-indigo-200 text-xs">
                        {accountTypes.find(t => t.value === accountData.account_type)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-indigo-200 text-[9px] uppercase">Initial Balance</p>
                      <p className="font-bold text-sm">₱{accountData.initial_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {accountData.institution_name && (
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-indigo-200 text-[9px] uppercase">Institution</p>
                        <p className="font-bold text-sm truncate">{accountData.institution_name}</p>
                      </div>
                    )}
                  </div>
                  {accountData.is_default && (
                    <div className="mt-2 flex items-center gap-1">
                      <i className="fas fa-star text-amber-400 text-xs"></i>
                      <span className="text-xs text-indigo-200">Default Account</span>
                    </div>
                  )}
                </div>

                {/* Cash In Summary */}
                {includeCashIn && cashInData.amount > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-money-bill-wave text-emerald-500 text-sm"></i>
                      <span className="text-xs font-bold text-emerald-700">Initial Cash In</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-gray-500 text-[9px] uppercase">Amount</p>
                        <p className="font-bold text-sm text-emerald-600">₱{cashInData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[9px] uppercase">Date</p>
                        <p className="font-bold text-sm text-gray-800">{new Date(cashInData.date).toLocaleDateString('en-PH')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-info-circle text-blue-500 text-xs mt-0.5"></i>
                    <p className="text-[10px] text-blue-700">
                      {includeCashIn && cashInData.amount > 0
                        ? 'Account will be created with initial cash-in transaction.'
                        : 'You can add money to this account later.'
                      }
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                    onClick={handlePrevious}
                    disabled={isSubmitting}
                  >
                    <i className="fas fa-arrow-left text-xs mr-1"></i>
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check text-xs"></i>
                        Create Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Inline Account Creation Form */}
      <div className="hidden md:block mb-4 animate__animated animate__fadeIn">
        <div className="card shadow-sm border-0">
          <div className="card-header py-3 bg-primary d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-white">
              <i className="fas fa-plus-circle mr-2"></i>
              Create New Account
              <span className="badge badge-light ml-2">
                Step {currentStep === 'account_details' ? '1' : currentStep === 'cash_in' ? '2' : '3'} of 3
              </span>
            </h6>
            <button 
              type="button" 
              className="btn btn-link text-white p-0"
              onClick={handleClose}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="card-body">
            {/* Desktop Step Indicator */}
            <div className="d-flex justify-content-center mb-4">
              <div className="d-flex align-items-center">
                <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                  currentStep === 'account_details' ? 'bg-primary text-white' : 'bg-success text-white'
                }`} style={{ width: '32px', height: '32px' }}>
                  {currentStep === 'account_details' ? '1' : <i className="fas fa-check"></i>}
                </div>
                <span className="ml-2 mr-3 small font-weight-bold">Details</span>
                <div className={`${currentStep !== 'account_details' ? 'bg-success' : 'bg-secondary'}`} style={{ width: '40px', height: '2px' }}></div>
                <div className={`rounded-circle d-flex align-items-center justify-content-center ml-3 ${
                  currentStep === 'cash_in' ? 'bg-primary text-white' : 
                  currentStep === 'review' ? 'bg-success text-white' : 'bg-light text-muted'
                }`} style={{ width: '32px', height: '32px' }}>
                  {currentStep === 'review' ? <i className="fas fa-check"></i> : '2'}
                </div>
                <span className="ml-2 mr-3 small font-weight-bold">Cash In</span>
                <div className={`${currentStep === 'review' ? 'bg-success' : 'bg-secondary'}`} style={{ width: '40px', height: '2px' }}></div>
                <div className={`rounded-circle d-flex align-items-center justify-content-center ml-3 ${
                  currentStep === 'review' ? 'bg-primary text-white' : 'bg-light text-muted'
                }`} style={{ width: '32px', height: '32px' }}>
                  3
                </div>
                <span className="ml-2 small font-weight-bold">Review</span>
              </div>
            </div>

            {/* Desktop Step 1: Account Details */}
            {currentStep === 'account_details' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="small font-weight-bold text-gray-700">
                      <i className="fas fa-tag mr-1"></i>
                      Account Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.account_name ? 'is-invalid' : ''}`}
                      value={accountData.account_name}
                      onChange={(e) => setAccountData(prev => ({ ...prev, account_name: e.target.value }))}
                      placeholder="e.g., Main Checking"
                    />
                    {validationErrors.account_name && (
                      <div className="invalid-feedback">{validationErrors.account_name}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="small font-weight-bold text-gray-700">
                      <i className="fas fa-folder mr-1"></i>
                      Account Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={accountData.account_type}
                      onChange={(e) => setAccountData(prev => ({ 
                        ...prev, 
                        account_type: e.target.value as any,
                        initial_balance: e.target.value === 'credit' ? 0 : prev.initial_balance
                      }))}
                    >
                      {accountTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="small font-weight-bold text-gray-700">
                      <i className="fas fa-coins mr-1"></i>
                      Initial Balance <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text">₱</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${validationErrors.initial_balance ? 'is-invalid' : ''}`}
                        value={accountData.initial_balance || ''}
                        onChange={(e) => setAccountData(prev => ({ 
                          ...prev, 
                          initial_balance: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    {validationErrors.initial_balance && (
                      <small className="text-danger">{validationErrors.initial_balance}</small>
                    )}
                    {accountData.account_type === 'credit' && (
                      <small className="text-warning">
                        <i className="fas fa-info-circle mr-1"></i>
                        Enter 0 or negative for credit debt
                      </small>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="small font-weight-bold text-gray-700">
                      <i className="fas fa-building mr-1"></i>
                      Bank/Institution
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={accountData.institution_name}
                      onChange={(e) => setAccountData(prev => ({ ...prev, institution_name: e.target.value }))}
                      placeholder="e.g., BPI, BDO"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="small font-weight-bold text-gray-700">
                      <i className="fas fa-palette mr-1"></i>
                      Account Color
                    </label>
                    <div className="d-flex flex-wrap">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setAccountData(prev => ({ ...prev, color }))}
                          className={`btn btn-sm m-1 ${accountData.color === color ? 'border-dark' : ''}`}
                          style={{ 
                            backgroundColor: color, 
                            width: '32px', 
                            height: '32px',
                            borderWidth: accountData.color === color ? '2px' : '1px'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  {existingAccounts.length > 0 && (
                    <div className="form-group">
                      <label className="small font-weight-bold text-gray-700">
                        <i className="fas fa-star mr-1"></i>
                        Default Account
                      </label>
                      <div className="custom-control custom-switch mt-2">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="is_default_desktop_inline"
                          checked={accountData.is_default}
                          onChange={(e) => setAccountData(prev => ({ ...prev, is_default: e.target.checked }))}
                        />
                        <label className="custom-control-label" htmlFor="is_default_desktop_inline">
                          {accountData.is_default ? 'This will be the default account' : 'Set as default account'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Step 2: Cash In */}
            {currentStep === 'cash_in' && (
              <div>
                <div className="custom-control custom-switch mb-4">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="include_cash_in_desktop"
                    checked={includeCashIn}
                    onChange={(e) => setIncludeCashIn(e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="include_cash_in_desktop">
                    <i className="fas fa-money-bill-wave text-success mr-2"></i>
                    Add initial cash-in transaction (optional)
                  </label>
                </div>

                {includeCashIn && (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Amount <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-success text-white">₱</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            className={`form-control ${validationErrors.cash_in_amount ? 'is-invalid' : ''}`}
                            value={cashInData.amount || ''}
                            onChange={(e) => setCashInData(prev => ({ 
                              ...prev, 
                              amount: parseFloat(e.target.value) || 0 
                            }))}
                            placeholder="0.00"
                          />
                        </div>
                        {validationErrors.cash_in_amount && (
                          <small className="text-danger">{validationErrors.cash_in_amount}</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className={`form-control ${validationErrors.cash_in_date ? 'is-invalid' : ''}`}
                          value={cashInData.date}
                          onChange={(e) => setCashInData(prev => ({ ...prev, date: e.target.value }))}
                        />
                        {validationErrors.cash_in_date && (
                          <small className="text-danger">{validationErrors.cash_in_date}</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small font-weight-bold text-gray-700">
                          Description <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${validationErrors.cash_in_description ? 'is-invalid' : ''}`}
                          value={cashInData.description}
                          onChange={(e) => setCashInData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="e.g., Initial deposit"
                        />
                        {validationErrors.cash_in_description && (
                          <small className="text-danger">{validationErrors.cash_in_description}</small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small font-weight-bold text-gray-700">Source</label>
                        <input
                          type="text"
                          className="form-control"
                          value={cashInData.source}
                          onChange={(e) => setCashInData(prev => ({ ...prev, source: e.target.value }))}
                          placeholder="e.g., Salary, Transfer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Step 3: Review */}
            {currentStep === 'review' && (
              <div className="row">
                <div className="col-md-6">
                  <div className="card bg-primary text-white mb-3">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <div 
                          className="rounded-circle mr-3 d-flex align-items-center justify-content-center"
                          style={{ 
                            backgroundColor: accountData.color || '#4e73df', 
                            width: '48px', 
                            height: '48px' 
                          }}
                        >
                          <i className={`${accountTypes.find(t => t.value === accountData.account_type)?.icon} text-white`}></i>
                        </div>
                        <div>
                          <h5 className="mb-0">{accountData.account_name || 'New Account'}</h5>
                          <small>{accountTypes.find(t => t.value === accountData.account_type)?.label}</small>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-6">
                          <small className="text-white-50">Initial Balance</small>
                          <div className="h5 mb-0">₱{accountData.initial_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                        </div>
                        {accountData.institution_name && (
                          <div className="col-6">
                            <small className="text-white-50">Institution</small>
                            <div className="font-weight-bold">{accountData.institution_name}</div>
                          </div>
                        )}
                      </div>
                      {accountData.is_default && (
                        <div className="mt-2">
                          <span className="badge badge-warning">
                            <i className="fas fa-star mr-1"></i>Default Account
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  {includeCashIn && cashInData.amount > 0 ? (
                    <div className="card border-success mb-3">
                      <div className="card-header bg-success text-white py-2">
                        <i className="fas fa-money-bill-wave mr-2"></i>
                        Initial Cash In
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-6">
                            <small className="text-muted">Amount</small>
                            <div className="h5 text-success mb-0">₱{cashInData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Date</small>
                            <div className="font-weight-bold">{new Date(cashInData.date).toLocaleDateString('en-PH')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle mr-2"></i>
                      You can add money to this account later.
                    </div>
                  )}
                </div>
              </div>
            )}

            <hr />

            {/* Desktop Navigation Buttons */}
            <div className="d-flex justify-content-between">
              {currentStep !== 'account_details' ? (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  <i className="fas fa-arrow-left mr-1"></i>
                  Back
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
              )}
              
              {currentStep === 'review' ? (
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-1"></i>
                      Create Account
                    </>
                  )}
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={currentStep === 'account_details' ? !isAccountStepValid : !isCashInStepValid}
                >
                  Next
                  <i className="fas fa-arrow-right ml-1"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InlineAccountCreationForm;
