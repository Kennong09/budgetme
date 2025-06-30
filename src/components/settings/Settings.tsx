import React, { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useCurrency } from "../../utils/CurrencyContext";
import { getCurrentUserData } from "../../data/mockData";
import { supabase } from "../../utils/supabaseClient";
import ErrorBoundary from "../ErrorBoundary";
import "./settings.css";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'archived';
  color?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UserProfile {
  name: string;
  email: string;
  profilePicture: string;
  currency: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  accounts: Account[];
}

interface SettingsTab {
  id: string;
  label: string;
  icon: string;
}

const Settings: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setCurrency: setGlobalCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    profilePicture: "",
    currency: "PHP",
    language: "en",
    theme: "light",
    notifications: {
      email: true,
      push: true,
    },
    accounts: [],
  });
  
  // State for account form
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAccountForm, setShowAccountForm] = useState<boolean>(false);
  const [accountFormError, setAccountFormError] = useState<string>("");

  // Tabs for settings
  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "accounts", label: "Accounts", icon: "fa-wallet" },
    { id: "appearance", label: "Appearance", icon: "fa-palette" },
    { id: "preferences", label: "Preferences", icon: "fa-sliders-h" },
    { id: "notifications", label: "Notifications", icon: "fa-bell" },
  ];

  // Fetch accounts from Supabase
  const fetchAccounts = async () => {
    try {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error("Error fetching accounts:", error);
        return [];
      }
      
      // Add default colors if not present
      const accountColors = ["#4e73df", "#1cc88a", "#e74a3b", "#f6c23e", "#36b9cc"];
      return data.map((account, index) => ({
        ...account,
        color: account.color || accountColors[index % accountColors.length]
      }));
    } catch (error) {
      console.error("Error in fetchAccounts:", error);
      return [];
    }
  };

  useEffect(() => {
    // Load user profile data
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        
        // Default accounts in case Supabase fetch fails
        const defaultAccounts: Account[] = [
          {
            id: "1",
            user_id: user?.id || "default",
            account_name: "Primary Checking",
            account_type: "checking",
            balance: 5234.65,
            currency: "PHP",
            status: "active",
            is_default: true,
            color: "#4e73df",
            created_at: new Date().toISOString()
          },
          {
            id: "2",
            user_id: user?.id || "default",
            account_name: "Savings Account",
            account_type: "savings",
            balance: 12750.42,
            currency: "PHP",
            status: "active",
            is_default: false,
            color: "#1cc88a",
            created_at: new Date().toISOString()
          },
          {
            id: "3",
            user_id: user?.id || "default",
            account_name: "Credit Card",
            account_type: "credit",
            balance: -1250.3,
            currency: "PHP",
            status: "active",
            is_default: false,
            color: "#e74a3b",
            created_at: new Date().toISOString()
          }
        ];
        
        // Fetch accounts from database
        let userAccounts = defaultAccounts;
        
        if (user) {
          // Try to fetch real account data from Supabase
          const fetchedAccounts = await fetchAccounts();
          
          if (fetchedAccounts && fetchedAccounts.length > 0) {
            userAccounts = fetchedAccounts;
          }
          
          setProfile({
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email || "user@example.com",
            profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png",
            currency: "PHP", // Default values for the rest
            language: "en",
            theme: "light",
            notifications: {
              email: true,
              push: true,
            },
            accounts: userAccounts,
          });
        } else {
          // Use mock data as fallback
          const userData = getCurrentUserData();
          
          if (userData && userData.user) {
            const mockUser = userData.user as any;
            setProfile({
              name: mockUser.name || mockUser.full_name || "User",
              email: mockUser.email || "user@example.com",
              profilePicture: mockUser.profilePicture || mockUser.avatar || "../images/placeholder.png",
              currency: "PHP", 
              language: "en",
              theme: "light",
              notifications: {
                email: true,
                push: true,
              },
              accounts: userAccounts,
            });
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        setErrorMessage("Failed to load user profile data");
      } finally {
        setLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Clear any messages when changing tabs
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If currency is changing, update the global context
    if (name === 'currency') {
      setGlobalCurrency(value);
    }
    
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name.includes(".")) {
      // Handle nested properties like notifications.email
      const [parent, child] = name.split(".");
      
      if (parent === "notifications") {
        setProfile(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [child]: checked
          }
        }));
      }
    } else {
      setProfile(prev => ({ ...prev, [name]: checked }));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setSuccessMessage("");
      setErrorMessage("");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would save the data to your backend here
      console.log("Saving settings:", profile);
      
      // Show success message
      setSuccessMessage("Settings saved successfully!");
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setErrorMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Account management functions
  const handleAddAccount = () => {
    setEditingAccount({
      id: "",
      user_id: user?.id || "",
      account_name: "",
      account_type: "checking",
      balance: 0,
      currency: profile.currency,
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
      
      // Check if this is the last account
      if (profile.accounts.length <= 1) {
        setErrorMessage("You must have at least one account");
        setIsSaving(false);
        return;
      }
      
      const isDefaultAccount = profile.accounts.find(account => account.id === accountId)?.is_default;
      
      // In database, we'll soft delete by setting status to inactive
      if (accountId.length >= 36) { // Real UUID from database
        const { error } = await supabase
          .from('accounts')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', accountId)
          .eq('user_id', user.id);
        
        if (error) {
          throw new Error(`Error deleting account: ${error.message}`);
        }
      }
      
      // Update local state
      const updatedAccounts = profile.accounts.filter(account => account.id !== accountId);
      
      // If deleting the default account, set the first account as default
      if (isDefaultAccount && updatedAccounts.length > 0) {
        updatedAccounts[0].is_default = true;
        
        // Update in database if it's a real account
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
      // Validate form
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
        // Update existing account in database
        const { data, error } = await supabase
          .from('accounts')
          .update({
            account_name: editingAccount.account_name,
            account_type: editingAccount.account_type,
            balance: editingAccount.balance,
            currency: editingAccount.currency,
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
        
        // If setting this account as default, remove default flag from others in database
        if (editingAccount.is_default) {
          await supabase
            .from('accounts')
            .update({ is_default: false, updated_at: new Date().toISOString() })
            .neq('id', editingAccount.id)
            .eq('user_id', user.id);
        }
      } else {
        // Create new account in database
        const accountData = {
          user_id: user.id,
          account_name: editingAccount.account_name,
          account_type: editingAccount.account_type, 
          balance: editingAccount.balance,
          currency: editingAccount.currency,
          status: 'active' as const,
          is_default: editingAccount.is_default,
          color: editingAccount.color,
          created_at: new Date().toISOString()
        };
        
        // If setting this account as default, remove default flag from others in database
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
      
      // Update local state
      if (savedAccount) {
        // For existing account
        if (editingAccount.id) {
          const index = updatedAccounts.findIndex(a => a.id === editingAccount.id);
          if (index !== -1) {
            updatedAccounts[index] = savedAccount;
            
            // Update is_default status for all accounts
            if (savedAccount.is_default) {
              updatedAccounts.forEach((account, i) => {
                if (i !== index) {
                  account.is_default = false;
                }
              });
            }
          }
        } else {
          // For new account
          // If setting this account as default, remove default flag from others
          if (savedAccount.is_default) {
            updatedAccounts.forEach(account => {
              account.is_default = false;
            });
          }
          
          updatedAccounts.push(savedAccount);
        }
        
        // Update profile with new accounts
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



  // Render loading state
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5 py-5 animate__animated animate__fadeIn">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <h5 className="mt-4 text-gray-600 font-weight-light">
            Loading Settings
          </h5>
          <p className="text-gray-500">Please wait while we load your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container-fluid animate__animated animate__fadeIn animate__faster">
        <h1 className="h3 mb-4 text-gray-800">
          <i className="fas fa-cog mr-2"></i>
          Settings
        </h1>

        {/* Alert Messages */}
        {successMessage && (
          <div className="alert alert-success animate__animated animate__fadeIn" role="alert">
            <i className="fas fa-check-circle mr-2"></i>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger animate__animated animate__fadeIn" role="alert">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {errorMessage}
          </div>
        )}

        <div className="row">
          {/* Settings Navigation */}
          <div className="col-lg-3 mb-4">
            <div className="card shadow border-0">
              <div className="card-body p-0">
                <div className="list-group list-group-flush settings-nav">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`list-group-item list-group-item-action ${
                        activeTab === tab.id ? "active" : ""
                      }`}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      <i className={`fas ${tab.icon} mr-2`}></i>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="col-lg-9">
            <div className="card shadow border-0 mb-4">
              <div className="card-body">
                <form onSubmit={handleSaveSettings}>
                  {/* Profile Settings */}
                  {activeTab === "profile" && (
                    <div className="settings-section animate__animated animate__fadeIn animate__faster">
                      <h2 className="h5 mb-4 text-gray-700">Profile Settings</h2>
                      
                      <div className="mb-4 text-center">
                        <div className="profile-picture-container mx-auto">
                          <img
                            src={profile.profilePicture || "https://via.placeholder.com/150"}
                            alt="Profile"
                            className="profile-picture rounded-circle img-thumbnail"
                          />
                          <div className="profile-picture-overlay">
                            <button type="button" className="btn btn-sm btn-primary">
                              <i className="fas fa-camera mr-1"></i> Change
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="form-group row">
                        <label htmlFor="name" className="col-sm-3 col-form-label">Full Name</label>
                        <div className="col-sm-9">
                          <input
                            type="text"
                            className="form-control"
                            id="name"
                            name="name"
                            value={profile.name}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      
                      <div className="form-group row">
                        <label htmlFor="email" className="col-sm-3 col-form-label">Email Address</label>
                        <div className="col-sm-9">
                          <input
                            type="email"
                            className="form-control"
                            id="email"
                            name="email"
                            value={profile.email}
                            onChange={handleInputChange}
                            disabled
                          />
                          <small className="form-text text-muted">
                            Contact support to change your email address
                          </small>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Accounts Settings */}
                  {activeTab === "accounts" && (
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
                      
                      {accountFormError && (
                        <div className="alert alert-danger" role="alert">
                          <i className="fas fa-exclamation-circle mr-2"></i>
                          {accountFormError}
                        </div>
                      )}
                      
                      {/* Account Form */}
                      {showAccountForm && editingAccount && (
                        <div className="card shadow-sm border-left-primary mb-4 animate__animated animate__fadeIn">
                          <div className="card-body">
                            <h5 className="card-title text-primary">
                              {editingAccount.id ? "Edit Account" : "Add New Account"}
                            </h5>
                            <form onSubmit={handleAccountFormSubmit}>
                              <div className="form-group row">
                                <label htmlFor="accountName" className="col-sm-3 col-form-label">Account Name</label>
                                <div className="col-sm-9">
                                  <input
                                    type="text"
                                    className="form-control"
                                    id="accountName"
                                    name="account_name"
                                    value={editingAccount.account_name}
                                    onChange={handleAccountFormChange}
                                    placeholder="e.g. Cash, Bank, Credit Card"
                                    required
                                  />
                                </div>
                              </div>
                              
                              <div className="form-group row">
                                <label htmlFor="accountType" className="col-sm-3 col-form-label">Account Type</label>
                                <div className="col-sm-9">
                                  <select
                                    className="form-control"
                                    id="accountType"
                                    name="account_type"
                                    value={editingAccount.account_type}
                                    onChange={handleAccountFormChange}
                                  >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                    <option value="credit">Credit Card</option>
                                    <option value="cash">Cash</option>
                                    <option value="investment">Investment</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div className="form-group row">
                                <label htmlFor="accountBalance" className="col-sm-3 col-form-label">Current Balance</label>
                                <div className="col-sm-9">
                                  <div className="input-group">
                                    <div className="input-group-prepend">
                                      <span className="input-group-text">
                                        {editingAccount.currency === "PHP" ? "₱" : 
                                         editingAccount.currency === "USD" ? "$" :
                                         editingAccount.currency === "EUR" ? "€" :
                                         editingAccount.currency === "GBP" ? "£" : 
                                         editingAccount.currency === "JPY" ? "¥" : "$"}
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      className="form-control"
                                      id="accountBalance"
                                      name="balance"
                                      value={editingAccount.balance}
                                      onChange={handleAccountFormChange}
                                      step="0.01"
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="form-group row">
                                <label htmlFor="accountCurrency" className="col-sm-3 col-form-label">Currency</label>
                                <div className="col-sm-9">
                                  <select
                                    className="form-control"
                                    id="accountCurrency"
                                    name="currency"
                                    value={editingAccount.currency}
                                    onChange={handleAccountFormChange}
                                  >
                                    <option value="PHP">PHP (₱)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="JPY">JPY (¥)</option>
                                    <option value="CAD">CAD ($)</option>
                                    <option value="AUD">AUD ($)</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div className="form-group row">
                                <label htmlFor="accountColor" className="col-sm-3 col-form-label">Account Color</label>
                                <div className="col-sm-9">
                                  <input
                                    type="color"
                                    className="form-control form-control-color"
                                    id="accountColor"
                                    name="color"
                                    value={editingAccount.color || "#4e73df"}
                                    onChange={handleAccountFormChange}
                                    title="Choose your account color"
                                  />
                                </div>
                              </div>
                              
                              <div className="form-group row">
                                <div className="col-sm-9 offset-sm-3">
                                  <div className="custom-control custom-checkbox">
                                    <input
                                      type="checkbox"
                                      className="custom-control-input"
                                      id="isDefault"
                                      name="is_default"
                                      checked={editingAccount.is_default}
                                      onChange={handleAccountFormChange}
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
                                  <button type="button" className="btn btn-secondary" onClick={cancelAccountForm}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                      
                      {/* Accounts List */}
                      <div className="mb-4">
                        {profile.accounts.length === 0 ? (
                          <div className="alert alert-info">
                            <i className="fas fa-info-circle mr-2"></i>
                            You haven't added any accounts yet. Click the "Add Account" button to get started.
                          </div>
                        ) : (
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
                                {profile.accounts.map(account => (
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
                                      {account.currency === "PHP" ? "₱" : 
                                       account.currency === "USD" ? "$" :
                                       account.currency === "EUR" ? "€" :
                                       account.currency === "GBP" ? "£" : 
                                       account.currency === "JPY" ? "¥" : "$"}
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
                                        onClick={() => handleEditAccount(account)}
                                        disabled={showAccountForm}
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteAccount(account.id)}
                                        disabled={showAccountForm}
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Appearance Settings */}
                  {activeTab === "appearance" && (
                    <div className="settings-section animate__animated animate__fadeIn animate__faster">
                      <h2 className="h5 mb-4 text-gray-700">Appearance Settings</h2>
                      
                      <div className="form-group row">
                        <label htmlFor="theme" className="col-sm-3 col-form-label">Theme</label>
                        <div className="col-sm-9">
                          <select
                            className="form-control"
                            id="theme"
                            name="theme"
                            value={profile.theme}
                            onChange={handleInputChange}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="form-group row">
                        <label className="col-sm-3 col-form-label">Theme Preview</label>
                        <div className="col-sm-9">
                          <div className={`theme-preview ${profile.theme}`}>
                            <div className="theme-preview-header">
                              <span className="theme-preview-title">Sample Dashboard</span>
                            </div>
                            <div className="theme-preview-body">
                              <div className="theme-preview-sidebar"></div>
                              <div className="theme-preview-content">
                                <div className="theme-preview-card"></div>
                                <div className="theme-preview-card"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preferences Settings */}
                  {activeTab === "preferences" && (
                    <div className="settings-section animate__animated animate__fadeIn animate__faster">
                      <h2 className="h5 mb-4 text-gray-700">Preferences</h2>
                      
                      <div className="form-group row">
                        <label htmlFor="currency" className="col-sm-3 col-form-label">Currency</label>
                        <div className="col-sm-9">
                          <select
                            className="form-control"
                            id="currency"
                            name="currency"
                            value={profile.currency}
                            onChange={handleInputChange}
                          >
                            <option value="PHP">PHP (₱)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="CAD">CAD ($)</option>
                            <option value="AUD">AUD ($)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="form-group row">
                        <label htmlFor="language" className="col-sm-3 col-form-label">Language</label>
                        <div className="col-sm-9">
                          <select
                            className="form-control"
                            id="language"
                            name="language"
                            value={profile.language}
                            onChange={handleInputChange}
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notification Settings */}
                  {activeTab === "notifications" && (
                    <div className="settings-section animate__animated animate__fadeIn animate__faster">
                      <h2 className="h5 mb-4 text-gray-700">Notification Settings</h2>
                      
                      <div className="form-group">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="emailNotifications"
                            name="notifications.email"
                            checked={profile.notifications.email}
                            onChange={handleCheckboxChange}
                          />
                          <label className="custom-control-label" htmlFor="emailNotifications">
                            Email Notifications
                          </label>
                        </div>
                        <small className="form-text text-muted ml-4 mt-1">
                          Receive budget alerts and weekly reports via email
                        </small>
                      </div>
                      
                      <div className="form-group">
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="pushNotifications"
                            name="notifications.push"
                            checked={profile.notifications.push}
                            onChange={handleCheckboxChange}
                          />
                          <label className="custom-control-label" htmlFor="pushNotifications">
                            Push Notifications
                          </label>
                        </div>
                        <small className="form-text text-muted ml-4 mt-1">
                          Receive in-app alerts and notifications
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="form-group row mt-5">
                    <div className="col-sm-9 offset-sm-3">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-1"></i> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Settings; 