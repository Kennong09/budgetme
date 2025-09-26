import React, { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useCurrency } from "../../utils/CurrencyContext";
import { getCurrentUserData } from "../../data/mockData";
import { UserOnboardingService } from "../../services/userOnboardingService";
import { supabase } from "../../utils/supabaseClient";
import "./settings.css";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

// Import types and constants
import { Account, UserProfile, SettingsTab, ACCOUNT_COLORS } from './types';

// Import shared components
import LoadingState from './components/shared/LoadingState';
import AlertMessage from './components/shared/AlertMessage';
import TabNavigation from './components/shared/TabNavigation';

// Import settings components
import ProfileSettings from './components/ProfileSettings';
import PreferencesSettings from './components/PreferencesSettings';
import NotificationSettings from './components/NotificationSettings';
import AccountsSettings from './components/accounts/AccountsSettings';

const Settings: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setCurrency: setGlobalCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [loading, setLoading] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    profilePicture: "",
    // currency removed - always PHP
    language: "en",
    notifications: {
      email: true,
      push: true,
    },
    accounts: [],
  });

  // Tabs for settings
  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "accounts", label: "Accounts", icon: "fa-wallet" },
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
      return data.map((account, index) => ({
        ...account,
        color: account.color || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
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

        // Fetch accounts from database or service defaults
        let userAccounts: Account[] = [];

        if (user) {
          // Ensure user has complete setup first
          await UserOnboardingService.ensureUserSetup(user.id);
          
          // Try to fetch real account data from Supabase
          const fetchedAccounts = await fetchAccounts();

          if (fetchedAccounts && fetchedAccounts.length > 0) {
            userAccounts = fetchedAccounts;
          } else {
            // If no accounts found, try to get service defaults
            const defaultAccounts = await UserOnboardingService.getUserDefaultAccounts(user.id);
            userAccounts = defaultAccounts.map((account, index) => ({
              ...account,
              color: account.color || ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
            }));
          }

          setProfile({
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email || "user@example.com",
            profilePicture: user.user_metadata?.avatar_url || "../images/placeholder.png",
            // currency removed - always PHP
            language: "en",
            notifications: {
              email: true,
              push: true,
            },
            accounts: userAccounts,
          });
        } else {
          // Use mock data as fallback for unauthenticated users
          const userData = getCurrentUserData();

          if (userData && userData.user) {
            const mockUser = userData.user as any;
            setProfile({
              name: mockUser.name || mockUser.full_name || "User",
              email: mockUser.email || "user@example.com",
              profilePicture: mockUser.profilePicture || mockUser.avatar || "../images/placeholder.png",
              // currency removed - always PHP
              language: "en",
              notifications: {
                email: true,
                push: true,
              },
              accounts: [], // No accounts for unauthenticated users
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

    // Currency change removed - always PHP
    // Global currency context is now fixed to PHP

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleInputChange(e);
  };
  
  // Handler to update accounts in profile state
  const handleAccountsUpdate = (updatedAccounts: Account[]) => {
    setProfile(prev => ({
      ...prev,
      accounts: updatedAccounts
    }));
  };

  // Render loading state
  if (loading) {
    return <LoadingState />;
  }

  return (
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
              <div>
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
                  <AccountsSettings 
                    profile={profile}
                    setProfile={setProfile}
                    setSuccessMessage={setSuccessMessage}
                    setErrorMessage={setErrorMessage}
                  />
                )}

                {/* Preferences Settings */}
                {activeTab === "preferences" && (
                  <PreferencesSettings profile={profile} onInputChange={handleInputChange} />
                )}

                {/* Notification Settings */}
                {activeTab === "notifications" && (
                  <NotificationSettings profile={profile} onCheckboxChange={handleCheckboxChange} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 