import React, { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
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
import AccountsSettings from './components/accounts/AccountsSettings';

// Mobile Tab Button Component
interface MobileTabButtonProps {
  tab: SettingsTab;
  isActive: boolean;
  onClick: () => void;
}

const MobileTabButton: FC<MobileTabButtonProps> = ({ tab, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
      isActive
        ? 'bg-indigo-500 text-white shadow-md'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`}
  >
    <i className={`fas ${tab.icon} text-[10px]`}></i>
    {tab.label}
  </button>
);

const Settings: FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
    return (
      <div className="container-fluid">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your settings...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden md:block">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn animate__faster">
      {/* Mobile Page Heading */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">
            <i className="fas fa-cog text-indigo-500 mr-2"></i>
            Settings
          </h1>
        </div>
      </div>

      {/* Desktop Page Heading */}
      <h1 className="h3 mb-4 text-gray-800 hidden md:block">
        <i className="fas fa-cog mr-2"></i>
        Settings
      </h1>

      {/* Mobile Alert Messages */}
      {successMessage && (
        <div className="block md:hidden mb-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2 animate__animated animate__fadeIn">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-check text-emerald-500 text-[10px]"></i>
            </div>
            <span className="text-xs text-emerald-700">{successMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="block md:hidden mb-3">
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2 animate__animated animate__fadeIn">
            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-exclamation text-rose-500 text-[10px]"></i>
            </div>
            <span className="text-xs text-rose-700">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Desktop Alert Messages */}
      {successMessage && (
        <div className="alert alert-success animate__animated animate__fadeIn hidden md:block" role="alert">
          <i className="fas fa-check-circle mr-2"></i>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger animate__animated animate__fadeIn hidden md:block" role="alert">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {errorMessage}
        </div>
      )}

      {/* Mobile Tab Navigation - Horizontal scrollable pills */}
      <div className="block md:hidden mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <MobileTabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile Settings Content */}
      <div className="block md:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div>
            {/* Profile Settings */}
            {activeTab === "profile" && (
              <ProfileSettings 
                profile={profile} 
                onInputChange={handleInputChange}
                setSuccessMessage={setSuccessMessage}
                setErrorMessage={setErrorMessage}
              />
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
          </div>
        </div>
      </div>

      {/* Desktop Layout - Hidden on mobile, visible on md and up */}
      <div className="row" style={{ display: 'none' }} id="desktop-settings-layout">
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
                  <ProfileSettings 
                    profile={profile} 
                    onInputChange={handleInputChange}
                    setSuccessMessage={setSuccessMessage}
                    setErrorMessage={setErrorMessage}
                  />
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

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 