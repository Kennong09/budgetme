import React, { FC, useState, useEffect } from 'react';
import { useOnboarding } from '../../utils/OnboardingContext';
import TutorialModal from './TutorialModal';
import TutorialJoyride from './TutorialJoyride';
import { useNavigate, useLocation } from 'react-router-dom';

const OnboardingController: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    showTutorial, 
    setShowTutorial, 
    onboardingStatus,
    updateOnboardingStatus,
    completeTutorial,
    tutorialStep
  } = useOnboarding();
  
  const [showInitialModal, setShowInitialModal] = useState<boolean>(false);
  const [joyrideStarted, setJoyrideStarted] = useState<boolean>(false);
  
  // Check if we should show initial welcome modal
  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.tutorial_completed && !onboardingStatus.dashboard_seen) {
      setShowInitialModal(true);
    }
  }, [onboardingStatus]);
  
  // Start joyride when showTutorial is set to true
  useEffect(() => {
    if (showTutorial) {
      setJoyrideStarted(true);
      
      // No automatic navigation to dashboard
      // We will respect the current path and show the appropriate tutorial
      console.log(`Starting tutorial on current path: ${location.pathname}`);
      
      // Mark current section as seen
      const currentPath = location.pathname;
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
    }
  }, [showTutorial, navigate, location.pathname, updateOnboardingStatus]);
  
  // Log tutorial state changes for debugging
  useEffect(() => {
    console.log('Tutorial state updated:', { 
      showTutorial, 
      joyrideStarted, 
      tutorialStep, 
      currentPath: location.pathname,
      tutorialCompleted: onboardingStatus?.tutorial_completed 
    });
  }, [showTutorial, joyrideStarted, tutorialStep, location.pathname, onboardingStatus]);
  
  // Start tutorial handler
  const handleStartTutorial = () => {
    setJoyrideStarted(true);
    setShowTutorial(true);
    
    // Navigate to dashboard to start tutorial
    navigate('/dashboard');
    
    // Mark the dashboard as seen
    updateOnboardingStatus({
      dashboard_seen: true,
      tutorial_completed: false,
      current_step: 0
    });
    
    console.log('Tutorial started manually');
  };
  
  // Skip tutorial handler
  const handleSkipTutorial = () => {
    completeTutorial();
    setShowInitialModal(false);
    console.log('Tutorial skipped manually');
  };
  
  if (!onboardingStatus) return null;
  
  return (
    <>
      {/* Show the welcome modal if user hasn't completed the tutorial */}
      {showInitialModal && !onboardingStatus.tutorial_completed && !joyrideStarted && (
        <TutorialModal
          onStartTutorial={handleStartTutorial}
          onSkipTutorial={handleSkipTutorial}
        />
      )}
      
      {/* Show the joyride component if tutorial is active */}
      {showTutorial && <TutorialJoyride />}
    </>
  );
};

export default OnboardingController; 