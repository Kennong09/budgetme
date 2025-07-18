import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useOnboarding } from '../../utils/OnboardingContext';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import './onboarding.css';

// Define steps for each route
const getStepsByRoute = (route: string): Step[] => {
  if (route === 'dashboard') {
    return [
      {
        target: '.dashboard-welcome',
        title: 'Welcome to Your Dashboard',
        content: 'This is your personal finance dashboard. Here you can see an overview of your finances at a glance.',
        disableBeacon: true,
        placement: 'center'
      },
      {
        target: '.summary-cards',
        content: 'These cards show your overall financial status, including income, expenses, and savings rate.',
        disableBeacon: true,
      },
      {
        target: '.monthly-chart',
        content: 'This chart shows your income and expenses over time, helping you track your financial trends.',
        disableBeacon: true,
      },
      {
        target: '.category-chart',
        content: 'See where your money goes with this breakdown of your spending by category.',
        disableBeacon: true,
      },
      {
        target: '.budget-progress',
        content: 'Track your budget progress here. Stay within budget to achieve your financial goals.',
        disableBeacon: true,
      },
      {
        target: '.recent-transactions',
        content: 'Your most recent transactions appear here. Click on any transaction for more details.',
        disableBeacon: true,
      },
      {
        target: '.insights-section',
        content: 'These insights are generated based on your spending patterns to help you make better financial decisions.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'budgets') {
    return [
      {
        target: '.budgets-heading',
        title: 'Budget Management',
        content: 'This is where you manage your budgets. Setting budgets helps you control spending and reach your goals.',
        disableBeacon: true,
        placement: 'center'
      },
      {
        target: '.budget-list',
        content: 'Here you can see all your active budgets and their progress.',
        disableBeacon: true,
      },
      {
        target: '.create-budget-button',
        content: 'Click here to create a new budget for any spending category.',
        disableBeacon: true,
      },
      {
        target: '.budget-card',
        content: 'Each budget card shows your spending against your limit. Click on a card to see details or make adjustments.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'budgets/create') {
    return [
      {
        target: '.budget-form',
        title: 'Create New Budget',
        content: 'Fill out this form to create a new budget. Give it a name, set a spending limit, and choose a category.',
        disableBeacon: true,
      },
      {
        target: '.budget-amount-field',
        content: 'Enter the maximum amount you want to spend in this category.',
        disableBeacon: true,
      },
      {
        target: '.budget-category-field',
        content: 'Choose a spending category for this budget.',
        disableBeacon: true,
      },
      {
        target: '.budget-submit-btn',
        content: 'Click here to save your budget when you\'re done.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'goals') {
    return [
      {
        target: '.goals-header',
        title: 'Financial Goals',
        content: 'This is where you set and track your financial goals. Setting goals helps you stay motivated and focused on your financial journey.',
        disableBeacon: true,
        placement: 'center'
      },
      {
        target: '.goal-list',
        content: 'Here you can see all your active goals and their progress.',
        disableBeacon: true,
      },
      {
        target: '.create-goal-button',
        content: 'Click here to create a new financial goal such as saving for a vacation or paying off debt.',
        disableBeacon: true,
      },
      {
        target: '.goal-card',
        content: 'Each goal card shows your progress towards your goal. Click on a card to see details or make adjustments.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'transactions') {
    return [
      {
        target: '.transactions-header',
        title: 'Transaction Management',
        content: 'This is where you record and track all your income and expenses. Recording transactions is the foundation of your financial records.',
        disableBeacon: true,
        placement: 'center'
      },
      {
        target: '.add-transaction-button',
        content: 'Click here to add a new income or expense to your records.',
        disableBeacon: true,
      },
      {
        target: '.transaction-filters',
        content: 'Filter transactions by date, category, or type to find specific transactions easily.',
        disableBeacon: true,
      },
      {
        target: '.transaction-table',
        content: 'All your transactions are listed here. Click on any transaction to view details or edit it.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'transactions/add') {
    return [
      {
        target: '.transaction-form',
        title: 'Add New Transaction',
        content: 'Use this form to record your income and expenses. Select the type (income or expense), enter the amount, choose a category, and click save.',
        disableBeacon: true,
      },
      {
        target: '.transaction-type-field',
        content: 'Select whether this is income or an expense.',
        disableBeacon: true,
      },
      {
        target: '.transaction-amount-field',
        content: 'Enter the amount of the transaction.',
        disableBeacon: true,
      },
      {
        target: '.transaction-category-field',
        content: 'Choose a category for this transaction. Categories help you track where your money is going.',
        disableBeacon: true,
      },
      {
        target: '.transaction-submit-btn',
        content: 'Click here to save your transaction. After saving, you can add another transaction or return to the dashboard.',
        disableBeacon: true,
      }
    ];
  } else if (route === 'reports') {
    return [
      {
        target: '.reports-header',
        title: 'Financial Reports',
        content: 'This is where you analyze your spending patterns and financial progress. Reports help you understand your financial habits and make informed decisions.',
        disableBeacon: true,
        placement: 'center'
      },
      {
        target: '.report-charts',
        content: 'These charts provide visual insights into your financial data. Analyze trends and patterns to improve your financial habits.',
        disableBeacon: true,
      }
    ];
  }
  return [
    {
      target: '.sidebar-brand',
      title: 'Welcome to BudgetMe!',
      content: 'Let\'s get started by exploring the dashboard. This is your personal finance management system.',
      disableBeacon: true,
      placement: 'right'
    }
  ];
};

const TutorialJoyride: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    showTutorial,
    setShowTutorial,
    tutorialStep,
    setTutorialStep,
    completeTutorial,
    updateOnboardingStatus,
    onboardingStatus
  } = useOnboarding();
  
  const [steps, setSteps] = useState<Step[]>([]);
  const [run, setRun] = useState(false);
  const [currentTutorialRoute, setCurrentTutorialRoute] = useState('/dashboard');

  // Debug log for current state
  useEffect(() => {
    // console.log('TutorialJoyride state:', { 
    //   showTutorial, 
    //   run, 
    //   currentTutorialRoute, 
    //   tutorialStep, 
    //   stepsLength: steps.length,
    //   currentPath: location.pathname
    // });
  }, [showTutorial, run, currentTutorialRoute, tutorialStep, steps.length, location.pathname]);

  // Update steps when route changes
  useEffect(() => {
    if (showTutorial) {
      const newSteps = getStepsByRoute(currentTutorialRoute);
      // console.log(`Setting steps for route ${currentTutorialRoute}:`, newSteps);
      setSteps(newSteps);
    }
  }, [currentTutorialRoute, showTutorial]);

  // Start or stop the joyride
  useEffect(() => {
    setRun(showTutorial);
  }, [showTutorial]);
  
  // Synchronize the currentTutorialRoute with the actual location pathname
  useEffect(() => {
    if (showTutorial) {
      const currentPath = location.pathname;
      const routes = ['/dashboard', '/budgets', '/budgets/create', '/transactions', '/transactions/add', '/goals', '/reports'];
      
      // Find the best matching route for the current path
      let bestMatch = '';
      for (const route of routes) {
        if (currentPath === route || currentPath.startsWith(route + '/')) {
          // If we find an exact match or a path that starts with the route, use it
          if (route.length > bestMatch.length) {
            bestMatch = route;
          }
        }
      }
      
      // If we found a matching route and it's different from the current one, update it
      if (bestMatch && bestMatch !== currentTutorialRoute) {
        // console.log(`Synchronizing tutorial route: ${currentTutorialRoute} -> ${bestMatch} (current path: ${currentPath})`);
        setCurrentTutorialRoute(bestMatch);
        setTutorialStep(0); // Reset step when changing routes
        
        // Force run to true to make sure the tutorial continues
        setTimeout(() => {
          setRun(true);
        }, 300);
      }
    }
  }, [location.pathname, showTutorial, currentTutorialRoute, setTutorialStep]);

  // Mark appropriate section as seen when route changes
  useEffect(() => {
    if (onboardingStatus && showTutorial) {
      const currentPath = location.pathname;
      let updates: Partial<typeof onboardingStatus> = {};
      
      if (currentPath === '/dashboard' && !onboardingStatus.dashboard_seen) {
        updates.dashboard_seen = true;
      } else if (currentPath === '/budgets' && !onboardingStatus.budget_seen) {
        updates.budget_seen = true;
      } else if (currentPath === '/goals' && !onboardingStatus.goals_seen) {
        updates.goals_seen = true;
      } else if (currentPath === '/transactions' && !onboardingStatus.transactions_seen) {
        updates.transactions_seen = true;
      } else if (currentPath === '/reports' && !onboardingStatus.reports_seen) {
        updates.reports_seen = true;
      }
      
      if (Object.keys(updates).length > 0) {
        updateOnboardingStatus(updates);
      }
    }
  }, [location.pathname, onboardingStatus, showTutorial, updateOnboardingStatus]);

  // Handle joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    
    // console.log('Joyride callback:', { 
    //   action, 
    //   index, 
    //   status, 
    //   type, 
    //   currentTutorialRoute, 
    //   stepsLength: steps.length, 
    //   pathname: location.pathname,
    //   tutorialStep
    // });
    
    // Update current step in database
    if (type === 'step:after' && action !== 'close') {
      setTutorialStep(index + 1);
      updateOnboardingStatus({ current_step: index + 1 });
    }

    // Handle "Last" button click at the end of a section
    if (action === 'next' && type === 'step:after') {
      const routes = ['/dashboard', '/budgets', '/budgets/create', '/transactions', '/transactions/add', '/goals', '/reports'];
      const currentIndex = routes.indexOf(currentTutorialRoute);
      
      // If this is the last step in the current section
      if (index === steps.length - 1) {
        // console.log(`Last step in section ${currentTutorialRoute}. Current index: ${index}, Total steps: ${steps.length}`);
        
        if (currentIndex < routes.length - 1) {
          // Move to next section
          const nextRoute = routes[currentIndex + 1];
          // console.log(`Last button clicked on final step. Moving to: ${nextRoute}`);
          
          // Mark the current section as seen
          if (currentTutorialRoute === '/dashboard') {
            updateOnboardingStatus({ dashboard_seen: true });
          } else if (currentTutorialRoute === '/budgets' || currentTutorialRoute === '/budgets/create') {
            updateOnboardingStatus({ budget_seen: true });
          } else if (currentTutorialRoute === '/transactions' || currentTutorialRoute === '/transactions/add') {
            updateOnboardingStatus({ transactions_seen: true });
          } else if (currentTutorialRoute === '/goals') {
            updateOnboardingStatus({ goals_seen: true });
          } else if (currentTutorialRoute === '/reports') {
            updateOnboardingStatus({ reports_seen: true });
          }
          
          // Force navigation with a small delay to ensure UI updates properly
          setTimeout(() => {
            // console.log(`Navigating to ${nextRoute} and updating tutorial route`);
            setCurrentTutorialRoute(nextRoute);
            navigate(nextRoute);
            
            // Reset step to 0 for the new section
            setTutorialStep(0);
            updateOnboardingStatus({ current_step: 0 });
            
            // Force run to true to make sure the tutorial continues
            setRun(true);
            // console.log(`Navigation complete. Current route: ${nextRoute}, Steps: ${getStepsByRoute(nextRoute).length}`);
          }, 800); // Increased delay for better reliability
          
          // Return early to prevent the status === 'finished' block from executing
          return;
        }
      }
    }

    // Handle tour completion for a section
    if (status === 'finished') {
      // If finished with the current section
      const routes = ['/dashboard', '/budgets', '/budgets/create', '/transactions', '/transactions/add', '/goals', '/reports'];
      const currentIndex = routes.indexOf(currentTutorialRoute);
      
      if (currentIndex < routes.length - 1) {
        // Move to next section
        const nextRoute = routes[currentIndex + 1];
        // console.log(`Section finished. Moving to next section: ${nextRoute}`);
        
        // Force navigation with a small delay to ensure UI updates properly
        setTimeout(() => {
          setCurrentTutorialRoute(nextRoute);
          navigate(nextRoute);
          
          // Reset step to 0 for the new section
          setTutorialStep(0);
          updateOnboardingStatus({ current_step: 0 });
          
          // Force run to true to make sure the tutorial continues
          setRun(true);
          // console.log(`Navigation complete. Current route: ${nextRoute}, Steps: ${getStepsByRoute(nextRoute).length}`);
        }, 500); // Increased delay for better reliability
      } else {
        // Finished all sections
        completeTutorial();
        // console.log('Tutorial completed - all sections finished');
      }
    }

    // Handle tour skip or manual close
    if (action === 'close' || status === 'skipped') {
      completeTutorial();
      // console.log('Tutorial skipped or closed manually');
    }
  };

  // Define joyride styles
  const joyrideStyles = {
    options: {
      primaryColor: '#4e73df',
      backgroundColor: '#ffffff',
      arrowColor: '#ffffff',
      textColor: '#3a3b45',
    },
    tooltip: {
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
    },
    tooltipTitle: {
      fontSize: '1.1rem',
      fontWeight: 600,
      marginBottom: '10px',
    },
    buttonNext: {
      backgroundColor: '#4e73df',
      color: '#ffffff',
      fontWeight: 500,
    },
    buttonBack: {
      color: '#4e73df',
      marginRight: '10px',
    },
  };

  if (!showTutorial) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      styles={joyrideStyles}
      callback={handleJoyrideCallback}
      stepIndex={tutorialStep}
    />
  );
};

export default TutorialJoyride; 