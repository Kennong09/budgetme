import React, { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/helpers';
import { useGoalRealtime } from '../../hooks/useGoalRealtime';
import { useToast } from '../../utils/ToastContext';

interface Goal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  status: string;
}

interface RealtimeGoalProgressProps {
  goal: Goal;
  onGoalUpdate?: (updatedGoal: Goal) => void;
}

const RealtimeGoalProgress: React.FC<RealtimeGoalProgressProps> = ({
  goal,
  onGoalUpdate
}) => {
  const { showSuccessToast, showInfoToast } = useToast();
  const [currentGoal, setCurrentGoal] = useState<Goal>(goal);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const { isConnected, connectionStatus } = useGoalRealtime({
    goalId: goal.id,
    onGoalUpdate: (payload) => {
      console.log('Real-time goal update:', payload);
      
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedGoal = payload.new as Goal;
        setCurrentGoal(updatedGoal);
        setLastUpdate(new Date());
        setUpdateCount(prev => prev + 1);
        
        // Notify parent component
        if (onGoalUpdate) {
          onGoalUpdate(updatedGoal);
        }
        
        // Show toast notification for significant updates
        if (updatedGoal.current_amount !== currentGoal.current_amount) {
          const difference = updatedGoal.current_amount - currentGoal.current_amount;
          if (difference > 0) {
            showSuccessToast(`Goal updated! +${formatCurrency(difference)} contributed`);
          }
        }
        
        if (updatedGoal.status === 'completed' && currentGoal.status !== 'completed') {
          showSuccessToast(`🎉 Congratulations! Goal "${updatedGoal.goal_name}" completed!`);
        }
      }
    },
    onContributionUpdate: (payload) => {
      console.log('Real-time contribution update:', payload);
      
      if (payload.eventType === 'INSERT' && payload.new) {
        showInfoToast(`New contribution received: ${formatCurrency(payload.new.amount)}`);
        setLastUpdate(new Date());
        setUpdateCount(prev => prev + 1);
      }
    },
    onError: (error) => {
      console.error('Real-time subscription error:', error);
    }
  });

  // Update local state when prop changes
  useEffect(() => {
    setCurrentGoal(goal);
  }, [goal]);

  const progressPercentage = (currentGoal.current_amount / currentGoal.target_amount) * 100;
  const remainingAmount = currentGoal.target_amount - currentGoal.current_amount;
  const isCompleted = currentGoal.status === 'completed' || progressPercentage >= 100;

  return (
    <div className="card border-left-primary shadow h-100 py-2">
      <div className="card-body">
        <div className="row no-gutters align-items-center">
          <div className="col mr-2">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                {currentGoal.goal_name}
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <div className="h5 mb-1 font-weight-bold text-gray-800">
                  {formatCurrency(currentGoal.current_amount)} / {formatCurrency(currentGoal.target_amount)}
                </div>
                <div className="text-xs text-muted">
                  {isCompleted ? 'Goal Completed!' : `${formatCurrency(remainingAmount)} remaining`}
                </div>
              </div>
              <div className="col-md-6">
                <div className="progress mb-2" style={{ height: '8px' }}>
                  <div 
                    className={`progress-bar ${
                      isCompleted ? 'bg-success' : progressPercentage > 75 ? 'bg-info' : 'bg-primary'
                    }`}
                    role="progressbar" 
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                  </div>
                </div>
                <div className="text-xs text-center">
                  {formatPercentage(progressPercentage)} complete
                </div>
              </div>
            </div>
            
            {lastUpdate && (
              <div className="text-xs text-muted mt-2">
                <i className="fas fa-sync-alt mr-1"></i>
                Last updated: {lastUpdate.toLocaleTimeString()}
                {updateCount > 0 && (
                  <span className="badge badge-success badge-sm ml-2">
                    {updateCount} update{updateCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="col-auto">
            <i className={`fas ${isCompleted ? 'fa-check-circle text-success' : 'fa-bullseye text-primary'} fa-2x`}></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeGoalProgress;