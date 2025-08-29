import React, { FC, useState } from 'react';
import AccountForm from './AccountForm';
import AccountsList from './AccountsList';
import { Account, UserProfile } from '../../types';
import { supabase } from '../../../../utils/supabaseClient';
import { useAuth } from '../../../../utils/AuthContext';

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
}) => {
  const { user } = useAuth();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAccountForm, setShowAccountForm] = useState<boolean>(false);
  const [accountFormError, setAccountFormError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleAddAccount = () => {
    setEditingAccount({
      id: "",
      user_id: user?.id || "",
      account_name: "",
      account_type: "checking",
      balance: 0,
      // currency removed - always PHP
      status: "active",
      is_default: profile.accounts.length === 0,
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
      
      if (!user) {
        setErrorMessage("You must be logged in to delete accounts");
        return;
      }
      
      if (profile.accounts.length <= 1) {
        setErrorMessage("You must have at least one account");
        setIsSaving(false);
        return;
      }
      
      const isDefaultAccount = profile.accounts.find(account => account.id === accountId)?.is_default;
      
      if (accountId.length >= 36) {
        const { error } = await supabase
          .from('accounts')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', accountId)
          .eq('user_id', user.id);
        
        if (error) {
          throw new Error(`Error deleting account: ${error.message}`);
        }
      }
      
      const updatedAccounts = profile.accounts.filter(account => account.id !== accountId);
      
      if (isDefaultAccount && updatedAccounts.length > 0) {
        updatedAccounts[0].is_default = true;
        
        if (updatedAccounts[0].id.length >= 36) {
          await supabase
            .from('accounts')
            .update({ is_default: true, updated_at: new Date().toISOString() })
            .eq('id', updatedAccounts[0].id)
            .eq('user_id', user.id);
        }
      }
      
      setProfile(prev => ({
        ...prev,
        accounts: updatedAccounts
      }));
      
      setShowAccountForm(false);
      setSuccessMessage("Account deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrorMessage(`Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (!editingAccount) return;
    
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = parseFloat(value);
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
    
    if (!editingAccount || !user) return;
    
    setIsSaving(true);
    
    try {
      if (!editingAccount.account_name.trim()) {
        setAccountFormError("Account name is required");
        setIsSaving(false);
        return;
      }
      
      if (isNaN(editingAccount.balance)) {
        setAccountFormError("Please enter a valid balance amount");
        setIsSaving(false);
        return;
      }
      
      const updatedAccounts = [...profile.accounts];
      let savedAccount: Account | null = null;
      
      if (editingAccount.id && editingAccount.id.length >= 36) {
        const { data, error } = await supabase
          .from('accounts')
          .update({
            account_name: editingAccount.account_name,
            account_type: editingAccount.account_type,
            balance: editingAccount.balance,
            // currency removed - always PHP
            is_default: editingAccount.is_default,
            color: editingAccount.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAccount.id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) {
          throw new Error(`Error updating account: ${error.message}`);
        }
        
        savedAccount = data;
        
        if (editingAccount.is_default) {
          await supabase
            .from('accounts')
            .update({ is_default: false, updated_at: new Date().toISOString() })
            .neq('id', editingAccount.id)
            .eq('user_id', user.id);
        }
      } else {
        const accountData = {
          user_id: user.id,
          account_name: editingAccount.account_name,
          account_type: editingAccount.account_type, 
          balance: editingAccount.balance,
          // currency removed - always PHP
          status: 'active' as const,
          is_default: editingAccount.is_default,
          color: editingAccount.color,
          created_at: new Date().toISOString()
        };
        
        if (editingAccount.is_default) {
          await supabase
            .from('accounts')
            .update({ is_default: false, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        }
        
        const { data, error } = await supabase
          .from('accounts')
          .insert(accountData)
          .select()
          .single();
          
        if (error) {
          throw new Error(`Error creating account: ${error.message}`);
        }
        
        savedAccount = data;
      }
      
      if (savedAccount) {
        if (editingAccount.id) {
          const index = updatedAccounts.findIndex(a => a.id === editingAccount.id);
          if (index !== -1) {
            updatedAccounts[index] = savedAccount;
            
            if (savedAccount.is_default) {
              updatedAccounts.forEach((account, i) => {
                if (i !== index) {
                  account.is_default = false;
                }
              });
            }
          }
        } else {
          if (savedAccount.is_default) {
            updatedAccounts.forEach(account => {
              account.is_default = false;
            });
          }
          
          updatedAccounts.push(savedAccount);
        }
        
        setProfile(prev => ({
          ...prev,
          accounts: updatedAccounts
        }));
        
        setShowAccountForm(false);
        setEditingAccount(null);
        setSuccessMessage(`Account ${editingAccount.id ? "updated" : "added"} successfully!`);
        setTimeout(() => setSuccessMessage(""), 5000);
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
  };

  return (
    <div className="settings-section animate__animated animate__fadeIn animate__faster">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h5 text-gray-700 mb-0">Accounts</h2>
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
      
      <div className="mb-4">
        <AccountsList
          accounts={profile.accounts}
          onEdit={handleEditAccount}
          onDelete={handleDeleteAccount}
          isFormVisible={showAccountForm}
        />
      </div>
    </div>
  );
};

export default AccountsSettings;
