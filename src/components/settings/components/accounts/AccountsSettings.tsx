import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AccountForm from './AccountForm';
import AccountsList from './AccountsList';
import SetDefaultAccountModal from './SetDefaultAccountModal';
import AccountHistory from './AccountHistory';
import InlineAccountCreationForm from './InlineAccountCreationForm';
import { Account, UserProfile } from '../../types';
import { AccountService } from '../../../../services/database/accountService';
import { useAuth } from '../../../../utils/AuthContext';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface AccountsSettingsProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setSuccessMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}

const AccountsSettings: FC<AccountsSettingsProps> = ({ 
  profile, 
  setProfile, 
  setSuccessMessage, 
  setErrorMessage 
}): JSX.Element => {
  const { user } = useAuth();
  
  // Component state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAccountForm, setShowAccountForm] = useState<boolean>(false);
  const [accountFormError, setAccountFormError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState<boolean>(false);
  const [showDefaultModal, setShowDefaultModal] = useState<boolean>(false);
  const [modalCurrentDefaultId, setModalCurrentDefaultId] = useState<string>("");
  const [showAccountHistory, setShowAccountHistory] = useState<boolean>(false);
  const [historyAccountId, setHistoryAccountId] = useState<string>("");
  const [historyAccountName, setHistoryAccountName] = useState<string>("");
  const [showInlineAccountForm, setShowInlineAccountForm] = useState<boolean>(false);
  
  // Real-time state for accounts to avoid stale data
  const [localAccounts, setLocalAccounts] = useState<Account[]>(profile.accounts || []);

  // Fetch accounts on component mount and sync with profile
  useEffect(() => {
    if (user?.id) {
      fetchAccounts();
    }
  }, [user?.id]);

  // Sync local accounts with profile accounts
  useEffect(() => {
    setLocalAccounts(profile.accounts || []);
  }, [profile.accounts]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        setErrorMessage("User authentication required");
        setLoading(false);
        return;
      }

      const result = await AccountService.fetchUserAccounts(user.id);
      
      if (result.success) {
        const accounts = result.data || [];
        setLocalAccounts(accounts);
        setProfile(prev => ({
          ...prev,
          accounts
        }));
        
        // Ensure user has at least one default account
        if (accounts.length > 0) {
          await AccountService.ensureDefaultAccount(user.id);
        }
      } else {
        setErrorMessage(result.error || "Failed to fetch accounts");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setErrorMessage("Failed to load accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    // Use the new inline account creation form
    setShowInlineAccountForm(true);
  };

  const handleAddAccountLegacy = () => {
    // Keep the old form functionality for emergency fallback
    setEditingAccount({
      user_id: user?.id || "",
      account_name: "",
      account_type: "checking",
      balance: 0,
      initial_balance: 0,
      currency: "PHP",
      status: "active",
      is_default: localAccounts.length === 0,
      color: "#4e73df"
    });
    setShowAccountForm(true);
    setAccountFormError("");
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount({...account});
    setShowAccountForm(true);
    setAccountFormError("");
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      setIsSaving(true);
      
      if (!user?.id) {
        setErrorMessage("You must be logged in to delete accounts");
        return;
      }
      
      const result = await AccountService.deleteAccount(accountId, user.id);
      
      if (result.success) {
        // Update local state by removing the deleted account
        const updatedAccounts = localAccounts.filter(account => account.id !== accountId);
        
        // If a new default was set, update that account in the list
        if (result.newDefaultAccountId) {
          const accountIndex = updatedAccounts.findIndex(acc => acc.id === result.newDefaultAccountId);
          if (accountIndex !== -1) {
            updatedAccounts[accountIndex] = {
              ...updatedAccounts[accountIndex],
              is_default: true
            };
          }
        }
        
        setLocalAccounts(updatedAccounts);
        setProfile(prev => ({
          ...prev,
          accounts: updatedAccounts
        }));
        
        setShowAccountForm(false);
        setDeleteConfirmId(null);
        setSuccessMessage("Account deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(result.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrorMessage(`Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDefaultAccountChange = async (accountId: string) => {
    try {
      setIsUpdatingDefault(true);
      
      if (!user?.id) {
        setErrorMessage("You must be logged in to change default account");
        return;
      }
      
      const result = await AccountService.setDefaultAccount(accountId, user.id);
      
      if (result.success && result.data) {
        // Update local state - unset all defaults and set the new one
        const updatedAccounts = localAccounts.map(account => ({
          ...account,
          is_default: account.id === accountId
        }));
        
        setLocalAccounts(updatedAccounts);
        setProfile(prev => ({
          ...prev,
          accounts: updatedAccounts
        }));
        
        setSuccessMessage("Default account updated successfully!");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(result.error || "Failed to update default account");
      }
    } catch (error) {
      console.error("Error updating default account:", error);
      setErrorMessage(`Failed to update default account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const handleSetAsDefault = (accountId: string) => {
    setModalCurrentDefaultId(accountId);
    setShowDefaultModal(true);
  };

  const handleDefaultAccountClick = (currentDefaultId: string) => {
    setModalCurrentDefaultId(currentDefaultId);
    setShowDefaultModal(true);
  };

  const handleAccountFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    console.log('📝 AccountsSettings: Form field changed', {
      fieldName: name,
      fieldValue: value,
      fieldType: type,
      accountId: editingAccount?.id
    });
    
    if (!editingAccount) return;
    
    let parsedValue: any = value;
    
    // Special handling for balance field to ensure proper number parsing
    if (name === 'balance') {
      // Handle empty values for balance - allow empty value to represent 0 for both add and edit
      if (value === '' || value === null || value === undefined) {
        // Store as 0 for calculations while allowing empty display in form
        parsedValue = 0;
      } else {
        const numValue = parseFloat(value);
        parsedValue = isNaN(numValue) ? 0 : numValue;
      }
      
      console.log('💰 AccountsSettings: Balance field processing', {
        originalValue: value,
        parsedValue,
        isValid: !isNaN(parsedValue),
        isNewAccount: !editingAccount?.id,
        isExistingAccount: !!editingAccount?.id
      });
    }
    else if (type === 'number') {
      // Handle other number fields
      if (value === '' || value === null || value === undefined) {
        parsedValue = 0;
      } else {
        const numValue = parseFloat(value);
        parsedValue = isNaN(numValue) ? 0 : numValue;
      }
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    setEditingAccount(prev => ({
      ...prev!,
      [name]: parsedValue
    }));
    
    console.log('🔄 AccountsSettings: Updated editing account', {
      fieldName: name,
      newValue: parsedValue,
      fullAccount: { ...editingAccount, [name]: parsedValue }
    });
  };

  const handleAccountFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAccount || !user?.id) return;
    
    console.log('💾 AccountsSettings: Form submission started', {
      isUpdate: !!editingAccount.id,
      accountId: editingAccount.id,
      accountData: editingAccount,
      userId: user.id
    });
    
    setIsSaving(true);
    
    try {
      let result;
      
      // Check if this is an update (has id) or create (no id)
      if (editingAccount.id && editingAccount.id.trim() !== '') {
        // Update existing account
        console.log('🔄 AccountsSettings: Updating existing account', {
          accountId: editingAccount.id,
          updateData: editingAccount
        });
        
        result = await AccountService.updateAccount(editingAccount.id, editingAccount, user.id);
      } else {
        // Create new account - remove id field to avoid UUID errors
        const { id, ...accountDataWithoutId } = editingAccount;
        
        console.log('➕ AccountsSettings: Creating new account', {
          accountData: accountDataWithoutId
        });
        
        result = await AccountService.createAccount({
          ...accountDataWithoutId,
          user_id: user.id
        });
      }
      
      console.log('📊 AccountsSettings: Service result', {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        resultData: result.data
      });
      
      if (result.success && result.data) {
        const savedAccount = result.data;
        let updatedAccounts: Account[];
        
        if (editingAccount.id) {
          // Update existing account in list
          updatedAccounts = localAccounts.map(account => 
            account.id === editingAccount.id ? savedAccount : account
          );
          
          // If this account was set as default, unset others
          if (savedAccount.is_default) {
            updatedAccounts = updatedAccounts.map(account => 
              account.id === savedAccount.id ? account : { ...account, is_default: false }
            );
          }
        } else {
          // Add new account to list
          updatedAccounts = [...localAccounts];
          
          // If this account is set as default, unset others
          if (savedAccount.is_default) {
            updatedAccounts = updatedAccounts.map(account => ({ ...account, is_default: false }));
          }
          
          updatedAccounts.push(savedAccount);
        }
        
        setLocalAccounts(updatedAccounts);
        setProfile(prev => ({
          ...prev,
          accounts: updatedAccounts
        }));
        
        setShowAccountForm(false);
        setEditingAccount(null);
        setAccountFormError("");
        setSuccessMessage(`Account ${editingAccount.id ? "updated" : "added"} successfully!`);
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setAccountFormError(result.error || "Failed to save account");
      }
    } catch (error) {
      console.error("Error saving account:", error);
      setAccountFormError(`Failed to save account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelAccountForm = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
    setAccountFormError("");
    setDeleteConfirmId(null);
  };

  const handleViewHistory = (accountId: string, accountName: string) => {
    setHistoryAccountId(accountId);
    setHistoryAccountName(accountName);
    setShowAccountHistory(true);
  };

  const handleCloseHistory = () => {
    setShowAccountHistory(false);
    setHistoryAccountId("");
    setHistoryAccountName("");
  };

  const handleInlineAccountCreated = (account: Account) => {
    console.log('Account created via inline form:', account);
    setShowInlineAccountForm(false);
    // Refresh accounts after creation
    fetchAccounts();
  };

  const handleCloseInlineForm = () => {
    setShowInlineAccountForm(false);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="animate__animated animate__fadeIn animate__faster">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm md:text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <i className="fas fa-wallet text-blue-500 text-xs md:text-sm"></i>
            </div>
            Financial Accounts
          </h2>
        </div>
        <div className="py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs md:text-sm text-gray-500 font-medium">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render empty state
  if (localAccounts.length === 0) {
    return (
      <div className="settings-section animate__animated animate__fadeIn animate__faster">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <i className="fas fa-wallet text-blue-500 text-xs md:text-sm"></i>
              </div>
              Financial Accounts
            </h2>
          </div>
        </div>
        
        {showAccountForm && editingAccount && (
          <div className="p-4">
            <AccountForm
              editingAccount={editingAccount}
              onSubmit={handleAccountFormSubmit}
              onChange={handleAccountFormChange}
              onCancel={cancelAccountForm}
              error={accountFormError}
              isSaving={isSaving}
            />
          </div>
        )}
        
        {!showAccountForm && (
          <div className="p-4">
            <div className="text-center py-8 md:py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-bank text-gray-400 text-2xl md:text-3xl"></i>
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-gray-800 mb-2">No Accounts Found</h3>
              <p className="text-xs md:text-sm text-gray-500 mb-4 max-w-md mx-auto">
                Add your first account to start tracking your finances.
              </p>
              <button 
                type="button" 
                className="px-4 py-2 md:px-6 md:py-3 bg-indigo-500 text-white text-sm md:text-base font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-md"
                onClick={handleAddAccount}
              >
                <i className="fas fa-plus mr-2 text-xs"></i>
                Add Your First Account
              </button>
              <p className="text-[9px] md:text-xs text-gray-400 mt-4">
                <i className="fas fa-info-circle mr-1"></i>
                You can add checking, savings, credit cards, and more
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      {/* Mobile Header */}
      <div className="block md:hidden px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <i className="fas fa-wallet text-blue-500 text-xs"></i>
            </div>
            Financial Accounts
            <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
              {localAccounts.length}
            </span>
          </h2>
          <button 
            type="button" 
            className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
            onClick={handleAddAccount}
            disabled={showAccountForm || showInlineAccountForm}
          >
            <i className="fas fa-plus text-xs"></i>
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 ml-9">Manage your bank accounts and cards</p>
      </div>

      {/* Desktop Header */}
      <div className="d-none d-md-flex card-header py-3 flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary">
          <i className="fas fa-wallet mr-2"></i>
          Financial Accounts
          <span className="badge badge-primary ml-2">{localAccounts.length}</span>
        </h6>
        <button 
          type="button" 
          className="btn btn-primary btn-sm"
          onClick={handleAddAccount}
          disabled={showAccountForm || showInlineAccountForm}
        >
          <i className="fas fa-plus mr-1"></i>
          Add Account
        </button>
      </div>

      {/* Mobile Content */}
      <div className="block md:hidden p-4">
        {/* Inline Account Creation Form */}
        <InlineAccountCreationForm
          isVisible={showInlineAccountForm}
          onClose={handleCloseInlineForm}
          onAccountCreated={handleInlineAccountCreated}
          existingAccounts={localAccounts}
        />

        {showAccountForm && editingAccount && (
          <AccountForm
            editingAccount={editingAccount}
            onSubmit={handleAccountFormSubmit}
            onChange={handleAccountFormChange}
            onCancel={cancelAccountForm}
            error={accountFormError}
            isSaving={isSaving}
          />
        )}
        
        {/* Set Default Account Modal */}
        {showDefaultModal && (
          <SetDefaultAccountModal
            accounts={localAccounts}
            currentDefaultId={modalCurrentDefaultId}
            onSetDefault={handleDefaultAccountChange}
            onClose={() => setShowDefaultModal(false)}
            isUpdating={isUpdatingDefault}
          />
        )}
        
        <AccountsList
          accounts={localAccounts}
          onEdit={handleEditAccount}
          onDelete={(accountId) => setDeleteConfirmId(accountId)}
          onSetAsDefault={handleSetAsDefault}
          onDefaultAccountClick={handleDefaultAccountClick}
          onViewHistory={handleViewHistory}
          isFormVisible={showAccountForm}
          isInlineFormVisible={showInlineAccountForm}
        />
      </div>

      {/* Desktop Content */}
      <div className="hidden md:block card-body">
        {/* Inline Account Creation Form */}
        <InlineAccountCreationForm
          isVisible={showInlineAccountForm}
          onClose={handleCloseInlineForm}
          onAccountCreated={handleInlineAccountCreated}
          existingAccounts={localAccounts}
        />

        {showAccountForm && editingAccount && (
          <AccountForm
            editingAccount={editingAccount}
            onSubmit={handleAccountFormSubmit}
            onChange={handleAccountFormChange}
            onCancel={cancelAccountForm}
            error={accountFormError}
            isSaving={isSaving}
          />
        )}
        
        {/* Set Default Account Modal */}
        {showDefaultModal && (
          <SetDefaultAccountModal
            accounts={localAccounts}
            currentDefaultId={modalCurrentDefaultId}
            onSetDefault={handleDefaultAccountChange}
            onClose={() => setShowDefaultModal(false)}
            isUpdating={isUpdatingDefault}
          />
        )}
        
        <AccountsList
          accounts={localAccounts}
          onEdit={handleEditAccount}
          onDelete={(accountId) => setDeleteConfirmId(accountId)}
          onSetAsDefault={handleSetAsDefault}
          onDefaultAccountClick={handleDefaultAccountClick}
          onViewHistory={handleViewHistory}
          isFormVisible={showAccountForm}
          isInlineFormVisible={showInlineAccountForm}
        />
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 1060 }}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4" style={{ zIndex: 1065 }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                Confirm Account Deletion
              </h3>
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSaving}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">Are you sure you want to delete this account?</p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <i className="fas fa-exclamation-triangle text-red-500 mr-2 mt-0.5"></i>
                  <div>
                    <div className="font-medium text-red-800 mb-1">Warning:</div>
                    <div className="text-red-700 text-sm">
                      This action will deactivate the account and may affect transaction history.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button 
                type="button" 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                onClick={() => handleDeleteAccount(deleteConfirmId)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-1"></i>
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Account History Modal */}
      {showAccountHistory && historyAccountId && (
        <AccountHistory
          accountId={historyAccountId}
          accountName={historyAccountName}
          isOpen={showAccountHistory}
          onClose={handleCloseHistory}
        />
      )}

    </div>
  );
};

export default AccountsSettings;