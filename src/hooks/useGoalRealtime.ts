import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/AuthContext';

interface UseGoalRealtimeOptions {
  goalId?: string;
  onGoalUpdate?: (payload: any) => void;
  onContributionUpdate?: (payload: any) => void;
  onError?: (error: Error) => void;
}

interface UseGoalRealtimeReturn {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: () => void;
  unsubscribe: () => void;
}

export const useGoalRealtime = (options: UseGoalRealtimeOptions = {}): UseGoalRealtimeReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { goalId, onGoalUpdate, onContributionUpdate, onError } = options;

  const subscribe = () => {
    if (!user || channelRef.current) return;

    try {
      setConnectionStatus('connecting');
      
      // Create channel name based on whether we're subscribing to specific goal or all user goals
      const channelName = goalId 
        ? `goal-${goalId}-${user.id}` 
        : `goals-${user.id}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goals',
            filter: goalId ? `id=eq.${goalId}` : `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Goal update received:', payload);
            if (onGoalUpdate) {
              onGoalUpdate(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'goal_contributions',
            filter: goalId ? `goal_id=eq.${goalId}` : `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Goal contribution update received:', payload);
            if (onContributionUpdate) {
              onContributionUpdate(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setConnectionStatus('error');
            if (onError) {
              onError(new Error('Real-time subscription failed'));
            }
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      setConnectionStatus('error');
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown subscription error'));
      }
    }
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  // Auto-subscribe when user is available and auto-unsubscribe on cleanup
  useEffect(() => {
    if (user) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [user, goalId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    subscribe,
    unsubscribe,
  };
};