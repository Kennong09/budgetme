import React, { FC, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useOnboarding } from '../../utils/OnboardingContext';
import './onboarding.css';

// Define the tutorial steps for each route
const getStepsByRoute = (route: string): Step[] => {
  console.log(`Getting steps for route: ${route}`);
  
  switch (route) {
    case '/dashboard':
      console.log('Returning dashboard steps');
      return [
        {
          target: '.sidebar-brand',
          content: <div>
            <h4>Welcome to BudgetMe!</h4>
            <p>This is your personal finance management system. Let's explore the key features.</p>
          </div>,
          title: 'Welcome',
          disableBeacon: true,
          placement: 'right',
        },
        {
          target: '#accordionSidebar',
          content: <div>
            <p>Use this sidebar to navigate between different sections of the app.</p>
            <p>You can collapse it using the toggle button if you need more space.</p>
          </div>,
          title: 'Navigation',
          placement: 'right',
        },
        {
          target: '.summary-cards',
          content: <div>
            <p>These cards provide a quick overview of your financial situation.</p>
            <p>Income, expenses, and savings at a glance.</p>
          </div>,
          title: 'Financial Summary',
          placement: 'bottom',
        },
        {
          target: '.recent-transactions',
          content: <div>
            <p>Your most recent transactions appear here.</p>
            <p>Click on any transaction to view more details.</p>
          </div>,
          title: 'Recent Transactions',
          placement: 'top',
        },
        {
          target: '.dashboard-actions',
          content: <div>
            <p>Add new transactions or set up new budgets quickly from the dashboard.</p>
            <p>When you're ready, click the 'Next' button to continue to the Budgets section.</p>
          </div>,
          title: 'Quick Actions',
          placement: 'bottom',
        }
      ];
    case '/budgets':
      console.log('Returning budget steps');
      return [
        {
          target: '.budgets-header',
          content: <div>
            <h4>Budgets Section</h4>
            <p>Create and manage your spending plans here.</p>
          </div>,
          title: 'Budgets',
          disableBeacon: true,
        },
        {
          target: '.create-budget-btn',
          content: <div>
            <p>Let's start by creating your first budget. Click this button to create a new budget.</p>
          </div>,
          title: 'Create Budget',
        },
        {
          target: '.budget-list',
          content: <div>
            <p>Your active budgets will appear here.</p>
            <p>Monitor your spending against each budget target.</p>
          </div>,
          title: 'Budget List',
        }
      ];
    case '/budgets/create':
      return [
        {
          target: '.budget-form',
          content: <div>
            <h4>Create Your First Budget</h4>
            <p>Fill out this form to create your first budget. Give it a name, set a spending limit, and choose a category.</p>
          </div>,
          title: 'Budget Form',
          disableBeacon: true,
        },
        {
          target: '.budget-amount-field',
          content: <div>
            <p>Enter the maximum amount you want to spend in this category.</p>
          </div>,
          title: 'Budget Amount',
        },
        {
          target: '.budget-category-field',
          content: <div>
            <p>Choose a spending category for this budget.</p>
          </div>,
          title: 'Budget Category',
        },
        {
          target: '.budget-submit-btn',
          content: <div>
            <p>Click here to save your budget when you're done.</p>
            <p>After creating your budget, we'll move on to recording your first transaction.</p>
          </div>,
          title: 'Save Budget',
        }
      ];
    case '/goals':
      return [
        {
          target: '.goals-header',
          content: <div>
            <h4>Financial Goals</h4>
            <p>Set and track progress towards your financial goals.</p>
          </div>,
          title: 'Goals',
          disableBeacon: true,
        },
        {
          target: '.create-goal-btn',
          content: <div>
            <p>Click here to create a new financial goal such as saving for a vacation or paying off debt.</p>
          </div>,
          title: 'Create Goal',
        },
        {
          target: '.goal-cards',
          content: <div>
            <p>Your active goals will appear here.</p>
            <p>Track your progress and contribute to your goals.</p>
          </div>,
          title: 'Goal Progress',
        }
      ];
    case '/transactions':
      return [
        {
          target: '.transactions-header',
          content: <div>
            <h4>Transactions</h4>
            <p>Record and track all your income and expenses here.</p>
          </div>,
          title: 'Transactions',
          disableBeacon: true,
        },
        {
          target: '.add-transaction-btn',
          content: <div>
            <p>Let's add your first transaction. Click here to add a new income or expense.</p>
          </div>,
          title: 'Add Transaction',
        },
        {
          target: '.transaction-filters',
          content: <div>
            <p>Filter transactions by date, category, or type.</p>
          </div>,
          title: 'Filter Transactions',
        },
        {
          target: '.transaction-table',
          content: <div>
            <p>All your transactions will be listed here.</p>
            <p>Click on any transaction to view details or edit it.</p>
          </div>,
          title: 'Transaction List',
        }
      ];
    case '/transactions/add':
      return [
        {
          target: '.transaction-form',
          content: <div>
            <h4>Add Your First Transaction</h4>
            <p>Use this form to record your income and expenses.</p>
          </div>,
          title: 'Transaction Form',
          disableBeacon: true,
        },
        {
          target: '.transaction-type-field',
          content: <div>
            <p>Select whether this is income or an expense.</p>
          </div>,
          title: 'Transaction Type',
        },
        {
          target: '.transaction-amount-field',
          content: <div>
            <p>Enter the amount of the transaction.</p>
          </div>,
          title: 'Amount',
        },
        {
          target: '.transaction-category-field',
          content: <div>
            <p>Choose a category for this transaction.</p>
            <p>Categories help you track where your money is going.</p>
          </div>,
          title: 'Category',
        },
        {
          target: '.transaction-submit-btn',
          content: <div>
            <p>Click here to save your transaction.</p>
          </div>,
          title: 'Save Transaction',
        }
      ];
    case '/reports':
      return [
        {
          target: '.reports-header',
          content: <div>
            <h4>Financial Reports</h4>
            <p>Analyze your spending patterns and financial progress.</p>
          </div>,
          title: 'Reports',
          disableBeacon: true,
        },
        {
          target: '.report-charts',
          content: <div>
            <p>These charts provide visual insights into your financial data.</p>
            <p>Analyze trends and patterns to improve your financial habits.</p>
          </div>,
          title: 'Visual Analytics',
        }
      ];
    default:
      return [
        {
          target: '.sidebar-brand',
          content: <div>
            <h4>Welcome to BudgetMe!</h4>
            <p>Let's get started by exploring the dashboard.</p>
          </div>,
          title: 'Welcome',
          disableBeacon: true,
          placement: 'right',
        }
      ];
  }
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
    console.log('TutorialJoyride state:', { 
      showTutorial, 
      run, 
      currentTutorialRoute, 
      tutorialStep, 
      stepsLength: steps.length,
      currentPath: location.pathname
    });
  }, [showTutorial, run, currentTutorialRoute, tutorialStep, steps.length, location.pathname]);

  // Update steps when route changes
  useEffect(() => {
    if (showTutorial) {
      const newSteps = getStepsByRoute(currentTutorialRoute);
      console.log(`Setting steps for route ${currentTutorialRoute}:`, newSteps);
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
        console.log(`Synchronizing tutorial route: ${currentTutorialRoute} -> ${bestMatch} (current path: ${currentPath})`);
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
    
    console.log('Joyride callback:', { 
      action, 
      index, 
      status, 
      type, 
      currentTutorialRoute, 
      stepsLength: steps.length, 
      pathname: location.pathname,
      tutorialStep
    });
    
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
        console.log(`Last step in section ${currentTutorialRoute}. Current index: ${index}, Total steps: ${steps.length}`);
        
        if (currentIndex < routes.length - 1) {
          // Move to next section
          const nextRoute = routes[currentIndex + 1];
          console.log(`Last button clicked on final step. Moving to: ${nextRoute}`);
          
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
            console.log(`Navigating to ${nextRoute} and updating tutorial route`);
            setCurrentTutorialRoute(nextRoute);
            navigate(nextRoute);
            
            // Reset step to 0 for the new section
            setTutorialStep(0);
            updateOnboardingStatus({ current_step: 0 });
            
            // Force run to true to make sure the tutorial continues
            setRun(true);
            console.log(`Navigation complete. Current route: ${nextRoute}, Steps: ${getStepsByRoute(nextRoute).length}`);
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
        console.log(`Section finished. Moving to next section: ${nextRoute}`);
        
        // Force navigation with a small delay to ensure UI updates properly
        setTimeout(() => {
          setCurrentTutorialRoute(nextRoute);
          navigate(nextRoute);
          
          // Reset step to 0 for the new section
          setTutorialStep(0);
          updateOnboardingStatus({ current_step: 0 });
          
          // Force run to true to make sure the tutorial continues
          setRun(true);
          console.log(`Navigation complete. Current route: ${nextRoute}, Steps: ${getStepsByRoute(nextRoute).length}`);
        }, 500); // Increased delay for better reliability
      } else {
        // Finished all sections
        completeTutorial();
        console.log('Tutorial completed - all sections finished');
      }
    }

    // Handle tour skip or manual close
    if (action === 'close' || status === 'skipped') {
      completeTutorial();
      console.log('Tutorial skipped or closed manually');
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