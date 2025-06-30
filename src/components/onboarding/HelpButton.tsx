import React, { FC } from 'react';
import { useOnboarding } from '../../utils/OnboardingContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface HelpButtonProps {
  compactMode?: boolean;
}

const HelpButton: FC<HelpButtonProps> = ({ compactMode }) => {
  const { 
    setShowTutorial, 
    updateOnboardingStatus, 
    setTutorialStep,
    onboardingStatus 
  } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  const handleHelpClick = () => {
    console.log('Help button clicked, showing tutorial for current section');
    
    // Get the current path to determine which tutorial to show
    const currentPath = location.pathname;
    
    // Reset the current step to 0 for the current section
    setTutorialStep(0);
    
    // Update the onboarding status to not completed, so the tutorial will show
    updateOnboardingStatus({
      tutorial_completed: false,
      current_step: 0
    });
    
    // Set the appropriate section as seen based on current path
    if (currentPath.startsWith('/dashboard')) {
      updateOnboardingStatus({ dashboard_seen: true });
    } else if (currentPath.startsWith('/budgets')) {
      updateOnboardingStatus({ budget_seen: true });
    } else if (currentPath.startsWith('/transactions')) {
      updateOnboardingStatus({ transactions_seen: true });
    } else if (currentPath.startsWith('/goals')) {
      updateOnboardingStatus({ goals_seen: true });
    } else if (currentPath.startsWith('/reports')) {
      updateOnboardingStatus({ reports_seen: true });
    }
    
    // Show the tutorial for the current section
    setShowTutorial(true);
  };

  if (compactMode !== undefined) {
    return (
      <button
        className="nav-link btn btn-link text-left w-100"
        onClick={handleHelpClick}
        type="button"
      >
        <i className="fas fa-question-circle fa-fw"></i>
        {!compactMode && <span>Help & Tour</span>}
      </button>
    );
  }

  return (
    <button
      className="btn btn-primary btn-circle btn-lg"
      onClick={handleHelpClick}
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 1000,
        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      }}
      title="Help & Tutorial"
    >
      <i className="fas fa-question"></i>
    </button>
  );
};

export default HelpButton;
