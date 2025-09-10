import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ActivityData {
  [key: string]: any;
}

export const useUserActivity = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>('');
  const isTrackingRef = useRef<boolean>(false);

  // Generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Initialize session tracking
  const initializeSession = async () => {
    if (!user || isTrackingRef.current) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (dbUser) {
        sessionIdRef.current = generateSessionId();
        isTrackingRef.current = true;

        // Start session in database
        await (supabase as any).rpc('start_user_session', {
          p_user_id: dbUser.id,
          p_session_id: sessionIdRef.current,
          p_ip_address: null, // Could be enhanced to get real IP
          p_user_agent: navigator.userAgent
        });

        // Track page load
        await trackActivity('page_load', {
          page: window.location.pathname,
          referrer: document.referrer
        });
      }
    } catch (error) {
      console.error('Failed to initialize session tracking:', error);
    }
  };

  // Track user activity
  const trackActivity = async (activityType: string, activityData?: ActivityData) => {
    if (!user || !isTrackingRef.current) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (dbUser) {
        await (supabase as any).rpc('track_user_activity', {
          p_user_id: dbUser.id,
          p_activity_type: activityType,
          p_activity_data: activityData ? JSON.stringify(activityData) : null,
          p_session_id: sessionIdRef.current
        });
      }
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  // Track page navigation
  const trackPageView = async (page: string) => {
    await trackActivity('page_view', { page });
  };

  // Track task completion
  const trackTaskCompletion = async (taskId: string, taskTitle: string, reward: number) => {
    await trackActivity('task_complete', {
      task_id: taskId,
      task_title: taskTitle,
      reward_earned: reward
    });
  };

  // Track video watch
  const trackVideoWatch = async (videoId: string, videoTitle: string, duration: number) => {
    await trackActivity('video_watch', {
      video_id: videoId,
      video_title: videoTitle,
      duration_seconds: duration
    });
  };

  // Track deposit
  const trackDeposit = async (amount: number, paymentMethod: string, status: string) => {
    await trackActivity('deposit', {
      amount,
      payment_method: paymentMethod,
      status
    });
  };

  // Track withdrawal
  const trackWithdrawal = async (amount: number, status: string) => {
    await trackActivity('withdrawal', {
      amount,
      status
    });
  };

  // Track VIP upgrade
  const trackVipUpgrade = async (fromLevel: string, toLevel: string, amount: number) => {
    await trackActivity('vip_upgrade', {
      from_level: fromLevel,
      to_level: toLevel,
      amount_paid: amount
    });
  };

  // Track referral
  const trackReferral = async (referredUserId: string, referralCode: string) => {
    await trackActivity('referral_signup', {
      referred_user_id: referredUserId,
      referral_code: referralCode
    });
  };

  // Track financial transaction
  const trackFinancialTransaction = async (type: string, amount: number, description: string) => {
    await trackActivity('financial_transaction', {
      transaction_type: type,
      amount,
      description
    });
  };

  // End session
  const endSession = async () => {
    if (!isTrackingRef.current || !sessionIdRef.current) return;

    try {
      await (supabase as any).rpc('end_user_session', {
        p_session_id: sessionIdRef.current
      });
      
      isTrackingRef.current = false;
      sessionIdRef.current = '';
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (user) {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      if (isTrackingRef.current) {
        endSession();
      }
    };
  }, [user]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackActivity('page_hidden');
      } else {
        trackActivity('page_visible');
      }
    };

    const handleBeforeUnload = () => {
      if (isTrackingRef.current) {
        endSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    trackActivity,
    trackPageView,
    trackTaskCompletion,
    trackVideoWatch,
    trackDeposit,
    trackWithdrawal,
    trackVipUpgrade,
    trackReferral,
    trackFinancialTransaction,
    endSession,
    sessionId: sessionIdRef.current
  };
};
