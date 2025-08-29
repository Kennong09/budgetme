import React, { FC } from "react";

export interface UserInfo {
  name: string;
  email: string;
  profilePicture?: string;
}

export interface UserProfileProps {
  userInfo: UserInfo;
  compactMode: boolean;
  className?: string;
  style?: React.CSSProperties;
  variant?: "user" | "admin";
}

const UserProfile: FC<UserProfileProps> = ({
  userInfo,
  compactMode,
  className = "",
  style = {},
  variant = "user"
}) => {
  const isUserVariant = variant === "user";
  const brandText = compactMode ? (isUserVariant ? "BM" : "BM-A") : (isUserVariant ? "BudgetMe" : "BudgetMe Admin");
  const iconClass = isUserVariant ? "fa-wallet" : "fa-shield-alt";
  const rotateClass = isUserVariant ? "rotate-n-15" : "";
  
  return (
    <>
      {/* Sidebar - Brand */}
      <div
        className="sidebar-brand d-flex align-items-center justify-content-center"
      >
        <div className={`sidebar-brand-icon ${rotateClass}`}>
          <i className={`fas ${iconClass}`}></i>
        </div>
        <div className="sidebar-brand-text mx-3">
          {brandText}
        </div>
      </div>
      
      {/* User Profile Card */}
      <div className={`user-profile-compact text-center my-2 
        ${compactMode ? "compact-profile" : "animate__animated animate__fadeIn"} ${className}`}
        style={style}
      >
        <img 
          src={userInfo.profilePicture}
          alt={userInfo.name}
          className="img-profile rounded-circle mx-auto mb-2 border-2 shadow-sm"
          style={{ 
            width: compactMode ? "40px" : "65px", 
            height: compactMode ? "40px" : "65px", 
            border: "2px solid var(--primary-light, rgba(255,255,255,0.3))" 
          }}
        />
        <div className="sidebar-user-details">
          {!compactMode && (
            <>
              <div className="text-white font-weight-bold">{userInfo.name}</div>
              <div className="text-white-50 small">{userInfo.email}</div>
              {variant === "admin" && (
                <div className="mt-1">
                  <span className="badge badge-light">Administrator</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <hr className="sidebar-divider my-0" />
    </>
  );
};

export default UserProfile;