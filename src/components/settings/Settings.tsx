import React, { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useCurrency } from "../../utils/CurrencyContext";
import { getCurrentUserData } from "../../data/mockData";
import ErrorBoundary from "../ErrorBoundary";
import "./settings.css";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";

// Import Animate.css
import "animate.css";

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
  });

  // Tabs for settings
  const tabs: SettingsTab[] = [
    { id: "profile", label: "Profile", icon: "fa-user" },
    { id: "appearance", label: "Appearance", icon: "fa-palette" },
    { id: "preferences", label: "Preferences", icon: "fa-sliders-h" },
    { id: "notifications", label: "Notifications", icon: "fa-bell" },
  ];

  useEffect(() => {
    // Load user profile data
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        
        // In a real app, you would fetch this data from your backend
        // For now, we'll use the mock data and auth context
        const userData = getCurrentUserData();
        
        if (user) {
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
          });
        } else if (userData && userData.user) {
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
          });
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



  // Render loading state
  if (loading) {
    return (
      <div className="text-center my-5 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2 text-gray-600">Loading settings...</p>
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