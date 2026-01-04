import React, { FC } from 'react';
import { ContributionError } from '../types/ContributionTypes';

interface ContributionErrorModalProps {
  isOpen: boolean;
  error: ContributionError | null;
  onClose: () => void;
  onRetry?: () => void;
}

const ContributionErrorModal: FC<ContributionErrorModalProps> = ({
  isOpen,
  error,
  onClose,
  onRetry
}) => {
  if (!isOpen || !error) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'balance':
        return 'fas fa-wallet text-red-500';
      case 'family_restriction':
        return 'fas fa-users-slash text-orange-500';
      case 'goal_limit':
        return 'fas fa-exclamation-triangle text-yellow-500';
      case 'permission':
        return 'fas fa-lock text-red-500';
      case 'network':
        return 'fas fa-wifi text-gray-500';
      default:
        return 'fas fa-exclamation-circle text-red-500';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'balance':
        return 'border-red-500 bg-red-50';
      case 'family_restriction':
        return 'border-orange-500 bg-orange-50';
      case 'goal_limit':
        return 'border-yellow-500 bg-yellow-50';
      case 'permission':
        return 'border-red-500 bg-red-50';
      case 'network':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-red-500 bg-red-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1070] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-auto animate-fadeIn">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-l-4 ${getErrorColor()} rounded-t-lg`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              <i className={`${getErrorIcon()} text-2xl`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {error.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <i className="fas fa-times text-gray-600"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Main Error Message */}
          <div className="mb-4">
            <p className="text-gray-800 font-medium mb-2">{error.message}</p>
            {error.details && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                  {error.details}
                </p>
              </div>
            )}
          </div>

          {/* Suggested Actions */}
          {error.suggestedActions && error.suggestedActions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
                Suggestions to resolve this:
              </h4>
              <ul className="space-y-2">
                {error.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-600">
                    <i className="fas fa-chevron-right text-blue-500 mr-2 mt-0.5 text-xs flex-shrink-0"></i>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Type Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              error.type === 'family_restriction' ? 'bg-orange-100 text-orange-800' :
              error.type === 'balance' ? 'bg-red-100 text-red-800' :
              error.type === 'goal_limit' ? 'bg-yellow-100 text-yellow-800' :
              error.type === 'permission' ? 'bg-red-100 text-red-800' :
              error.type === 'network' ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {error.type === 'family_restriction' ? 'Family Restriction' :
               error.type === 'goal_limit' ? 'Goal Limit' :
               error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
          
          {error.isRetryable && onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            >
              <i className="fas fa-redo mr-2"></i>
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContributionErrorModal;
