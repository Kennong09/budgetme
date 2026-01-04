import React, { FC, memo } from "react";
import { useAuth } from "../../../utils/AuthContext";

interface WelcomeMessageProps {
  show: boolean;
  userName: string;
  onClose: () => void;
}

const WelcomeMessage: FC<WelcomeMessageProps> = memo(({
  show,
  userName,
  onClose,
}) => {
  const { user } = useAuth();
  
  if (!show) {
    return null;
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get avatar URL from user metadata
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Welcome - Compact banner matching sidebar header colors */}
      <div className="block md:hidden mb-3 animate__animated animate__fadeInDown">
        <div className="relative overflow-hidden rounded-xl shadow-md mobile-welcome-gradient">
          <div className="relative px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="w-9 h-9 rounded-xl object-cover border-2 border-white/30"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-9 h-9 rounded-xl bg-white/20 items-center justify-center text-white text-sm font-bold border-2 border-white/30 ${avatarUrl ? 'hidden' : 'flex'}`}
              >
                {userInitial}
              </div>
              
              {/* Greeting text */}
              <div className="min-w-0">
                <p className="text-white/70 text-[9px] font-medium leading-none m-0">{getGreeting()}</p>
                <h4 className="text-white text-xs font-bold truncate max-w-[140px] leading-none m-0">
                  {userName}!
                </h4>
              </div>
            </div>
            
            {/* Close button */}
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Welcome - Original style */}
      <div
        className="alert animate__animated animate__fadeIn shadow-sm border-0 mb-3 hidden md:block"
        role="alert"
        style={{
          borderLeft: '4px solid #6366f1',
          borderRadius: '8px',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent)'
        }}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <div className="d-flex align-items-center">
          <div className="welcome-icon mr-3" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
            <i className="fas fa-chart-line fa-2x text-primary"></i>
          </div>
          <div>
            <h4 className="alert-heading font-weight-bold mb-1 text-gray-800 h5">
              Welcome back, {userName}!
            </h4>
            <p className="mb-0 text-gray-600">Here's a summary of your finances. You're doing great!</p>
          </div>
        </div>
      </div>

      {/* CSS for mobile gradient matching sidebar */}
      <style>{`
        .mobile-welcome-gradient {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
        }
      `}</style>
    </>
  );
});

WelcomeMessage.displayName = 'WelcomeMessage';

export default WelcomeMessage;
