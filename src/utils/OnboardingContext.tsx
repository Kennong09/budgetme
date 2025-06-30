import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { UserOnboarding, OnboardingContextType } from '../types';
import { useToast } from './ToastContext';

// Create context with default values
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Hook for components to access the context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

// Provider component
export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [onboardingStatus, setOnboardingStatus] = useState<UserOnboarding | null>(null);
  const { user } = useAuth();
  const { showErrorToast, showSuccessToast } = useToast();

  // Fetch onboarding status when user changes
  useEffect(() => {
    if (user) {
      fetchOnboardingStatus();
    } else {
      setOnboardingStatus(null);
    }
  }, [user]);

  // Check if we should show the tutorial on initial login
  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.tutorial_completed) {
      setShowTutorial(true);
    }
  }, [onboardingStatus]);

  // Function to fetch onboarding status from the database
  const fetchOnboardingStatus = async (): Promise<void> => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching onboarding status:', error);
        
        // Check if record doesn't exist yet (initialize it)
        if (error.code === 'PGRST116') {
          await createOnboardingRecord();
        } else {
          showErrorToast('Failed to fetch onboarding status');
        }
      } else if (data) {
        setOnboardingStatus(data as UserOnboarding);
      }
    } catch (error) {
      console.error('Unexpected error fetching onboarding status:', error);
      showErrorToast('Failed to fetch onboarding status');
    }
  };

  // Create initial onboarding record if not exists
  const createOnboardingRecord = async (): Promise<void> => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .insert([{ user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating onboarding record:', error);
        showErrorToast('Failed to initialize onboarding');
      } else if (data) {
        setOnboardingStatus(data as UserOnboarding);
      }
    } catch (error) {
      console.error('Unexpected error creating onboarding status:', error);
      showErrorToast('Failed to initialize onboarding');
    }
  };

  // Update onboarding status in the database
  const updateOnboardingStatus = async (data: Partial<UserOnboarding>): Promise<void> => {
    if (!user || !onboardingStatus) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .update(data)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating onboarding status:', error);
        showErrorToast('Failed to update onboarding status');
      } else {
        // Update local state
        setOnboardingStatus(prevState => {
          if (!prevState) return null;
          return { ...prevState, ...data };
        });
      }
    } catch (error) {
      console.error('Unexpected error updating onboarding status:', error);
      showErrorToast('Failed to update onboarding status');
    }
  };

  // Mark tutorial as completed
  const completeTutorial = async (): Promise<void> => {
    await updateOnboardingStatus({ 
      tutorial_completed: true,
      current_step: 0
    });
    
    setShowTutorial(false);
    showSuccessToast('Tutorial completed! You can access it anytime from the Help button.');
  };

  // Context value
  const value: OnboardingContextType = {
    showTutorial,
    setShowTutorial,
    tutorialStep,
    setTutorialStep,
    onboardingStatus,
    fetchOnboardingStatus,
    updateOnboardingStatus,
    completeTutorial
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}; 