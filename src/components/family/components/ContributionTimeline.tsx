import React from 'react';
import { formatCurrency } from '../../../utils/helpers';

interface ContributionTimelineProps {
  contributions: Array<{
    id: string;
    user_id: string;
    amount: number;
    contribution_date?: string;
    created_at: string;
    notes?: string;
    profiles?: {
      full_name?: string;
      avatar_url?: string;
    };
  }>;
}

/**
 * Formats a date string to relative time (e.g., "2 hours ago", "yesterday")
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
};

/**
 * Gets user initials from full name
 */
const getUserInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

/**
 * Determines color class based on contribution amount
 */
const getAmountColor = (amount: number): string => {
  if (amount >= 5000) return 'text-success'; // Green for large
  if (amount >= 1000) return 'text-info'; // Blue for medium
  return 'text-muted'; // Gray for small
};

const ContributionTimeline: React.FC<ContributionTimelineProps> = ({ contributions }) => {
  // Limit to last 10 contributions
  const displayContributions = contributions.slice(0, 10);
  
  if (displayContributions.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-clock fa-2x text-gray-300 mb-2"></i>
        <p className="text-muted small mb-0">No contribution history yet</p>
      </div>
    );
  }
  
  return (
    <div className="timeline-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {displayContributions.map((contribution, index) => {
        const userName = contribution.profiles?.full_name || 'Unknown';
        const initials = getUserInitials(userName);
        const relativeTime = formatRelativeTime(contribution.contribution_date || contribution.created_at);
        const amountColor = getAmountColor(contribution.amount);
        
        return (
          <div 
            key={contribution.id} 
            className="timeline-item animate__animated animate__fadeInUp mb-3"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="d-flex align-items-start">
              {/* Avatar/Initials */}
              <div 
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mr-3"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
              >
                {initials}
              </div>
              
              {/* Content */}
              <div className="flex-grow-1 border-left pl-3 pb-3" style={{ borderColor: '#e3e6f0' }}>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <div className="font-weight-bold text-gray-800">{userName}</div>
                    <div className="small text-muted">{relativeTime}</div>
                  </div>
                  <div className={`font-weight-bold ${amountColor}`}>
                    {formatCurrency(contribution.amount)}
                  </div>
                </div>
                
                {contribution.notes && (
                  <div className="small text-gray-600 mt-1">
                    <i className="fas fa-comment-dots mr-1"></i>
                    {contribution.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContributionTimeline;
