import React, { FC, useState, useEffect } from 'react';
import AccountForm from './AccountForm';
import AccountsList from './AccountsList';
import SetDefaultAccountModal from './SetDefaultAccountModal';
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
    
    if (!editingAccount) return;
    
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = parseFloat(value) || 0;
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    setEditingAccount(prev => ({
      ...prev!,
      [name]: parsedValue
    }));
  };

  const handleAccountFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAccount || !user?.id) return;
    
    setIsSaving(true);
    
    try {
      let result;
      
      // Check if this is an update (has id) or create (no id)
      if (editingAccount.id && editingAccount.id.trim() !== '') {
        // Update existing account
        result = await AccountService.updateAccount(editingAccount.id, editingAccount, user.id);
      } else {
        // Create new account - remove id field to avoid UUID errors
        const { id, ...accountDataWithoutId } = editingAccount;
        result = await AccountService.createAccount({
          ...accountDataWithoutId,
          user_id: user.id
        });
      }
      
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

  // Render loading state
  if (loading) {
    return (
      <div className="animate__animated animate__fadeIn animate__faster">
        <div className="text-center my-4 py-4">
          <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600 font-weight-light">Loading Financial Accounts...</p>
          <small className="text-gray-500">Please wait while we fetch your account information</small>
        </div>
      </div>
    );
  }

  // Render empty state
  if (localAccounts.length === 0) {
    return (
      <div className="settings-section animate__animated animate__fadeIn animate__faster">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h5 text-gray-700 mb-0">Financial Accounts</h2>
        </div>
        
        {showAccountForm && editingAccount && (
          <AccountForm
            editingAccount={editingAccount}
            onSubmit={handleAccountFormSubmit}
            onChange={handleAccountFormChange}
            onCancel={cancelAccountForm}
            error={accountFormError}
          />
        )}
        
        {!showAccountForm && (
          <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
            <div className="mb-4">
              <i className="fas fa-bank fa-3x text-gray-300"></i>
            </div>
            <h3 className="mb-3 font-weight-bold text-gray-800">No Accounts Found</h3>
            <p className="mb-4 text-gray-600">
              You haven't added any financial accounts yet. Get started by adding your first account to track your finances effectively.
            </p>
            <div className="mb-3">
              <button 
                type="button" 
                className="btn btn-primary btn-icon-split"
                onClick={handleAddAccount}
              >
                <span className="icon text-white-50">
                  <i className="fas fa-plus"></i>
                </span>
                <span className="text">Add Your First Account</span>
              </button>
            </div>
            <div className="mt-4">
              <small className="text-muted">
                <i className="fas fa-info-circle mr-1 text-gray-400"></i>
                You can add checking, savings, credit cards, and other account types
              </small>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h5 text-gray-700 mb-0 d-flex align-items-center">
            <i className="fas fa-wallet text-primary mr-2"></i>
            Financial Accounts
            <span className="badge badge-primary ml-2">{localAccounts.length}</span>
          </h2>
          <small className="text-gray-500">Manage your bank accounts, credit cards, and other financial accounts</small>
        </div>
        <button 
          type="button" 
          className="btn btn-primary btn-sm"
          onClick={handleAddAccount}
          disabled={showAccountForm}
        >
          <i className="fas fa-plus mr-1"></i> Add Account
        </button>
      </div>
      
      {showAccountForm && editingAccount && (
        <AccountForm
          editingAccount={editingAccount}
          onSubmit={handleAccountFormSubmit}
          onChange={handleAccountFormChange}
          onCancel={cancelAccountForm}
          error={accountFormError}
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
      
      <div className="mb-4">
        <AccountsList
          accounts={localAccounts}
          onEdit={handleEditAccount}
          onDelete={(accountId) => setDeleteConfirmId(accountId)}
          onSetAsDefault={handleSetAsDefault}
          onDefaultAccountClick={handleDefaultAccountClick}
          isFormVisible={showAccountForm}
        />
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal fade show" style={{ display: 'block' }} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle text-warning mr-2"></i>
                  Confirm Account Deletion
                </h5>
                <button 
                  type="button" 
                  className="close" 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isSaving}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p className="mb-3">Are you sure you want to delete this account?</p>
                <div className="alert alert-warning" role="alert">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Warning:</strong> This action will deactivate the account and may affect transaction history.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => handleDeleteAccount(deleteConfirmId)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash mr-1"></i> Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal backdrop */}
      {deleteConfirmId && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default AccountsSettings;