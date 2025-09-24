import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { taskCompletionService } from '@/services/taskCompletionService';

interface DailyStats {
  completedToday: number;
  dailyLimit: number;
  remainingTasks: number;
}

export const useTaskCompletion = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    completedToday: 0,
    dailyLimit: 0,
    remainingTasks: 0,
  });
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef<number>(0);
  const THROTTLE_MS = 1000; // Throttle real-time updates

  const fetchDailyStats = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const internalUserId = profile.id; // Use internal user ID from profile

      // Fetch completed tasks for today
      const completedIds = await taskCompletionService.getCompletedTasksToday(internalUserId);
      setCompletedTaskIds(completedIds);

      // Fetch user's current daily task limit from their membership plan
      const { data: membershipPlan, error: planError } = await supabase
        .from('membership_plans')
        .select('daily_video_limit')
        .eq('name', profile.vip_level)
        .single();

      const dailyLimit = membershipPlan?.daily_video_limit || 5; // Default to 5 if no plan or limit

      setDailyStats({
        completedToday: completedIds.length,
        dailyLimit: dailyLimit,
        remainingTasks: Math.max(0, dailyLimit - completedIds.length),
      });
    } catch (error) {
      console.error('Error fetching daily task stats:', error);
      // Fallback to default stats on error
      setDailyStats({ completedToday: 0, dailyLimit: 5, remainingTasks: 5 });
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchDailyStats();

      // Set up real-time subscription for task_completions
      const taskCompletionsChannel = supabase
        .channel(`task_completions_channel_${profile.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_completions',
          filter: `user_id=eq.${profile.id}`,
        }, (payload) => {
          const now = Date.now();
          if (now - lastRefreshRef.current > THROTTLE_MS) {
            lastRefreshRef.current = now;
            console.log('Real-time update for task_completions:', payload);
            fetchDailyStats(); // Re-fetch stats on any change
          }
        })
        .subscribe();

      // Set up real-time subscription for users table (for daily_video_limit changes)
      const usersChannel = supabase
        .channel(`users_channel_${profile.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${profile.id}`,
        }, (payload) => {
          const now = Date.now();
          if (now - lastRefreshRef.current > THROTTLE_MS) {
            lastRefreshRef.current = now;
            console.log('Real-time update for users table (daily_video_limit):', payload);
            fetchDailyStats(); // Re-fetch stats if user profile (e.g., VIP level) changes
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(taskCompletionsChannel);
        supabase.removeChannel(usersChannel);
      };
    }
  }, [authLoading, user, profile, fetchDailyStats]);

  // Handle page visibility/focus changes to refresh data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && profile) {
        fetchDailyStats();
      }
    };

    const handleFocus = () => {
      if (user && profile) {
        fetchDailyStats();
      }
    };

    const handleTaskCompleted = () => {
      if (user && profile) {
        console.log('Task completed event received, refreshing stats...');
        fetchDailyStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('taskCompleted', handleTaskCompleted);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('taskCompleted', handleTaskCompleted);
    };
  }, [user, profile, fetchDailyStats]);

  const completeTask = useCallback(async (taskId: string, taskTitle: string, taskType: 'video' | 'synthetic' | 'real_task', reward: number) => {
    if (!user) {
      console.error('User not authenticated for task completion.');
      return false;
    }
    const success = await taskCompletionService.completeTask(taskId, taskTitle, taskType, reward);
    if (success) {
      // Force immediate refresh of stats
      console.log('Task completed successfully, refreshing stats...');
      await fetchDailyStats();
      
      // Also trigger the custom event for additional refresh
      setTimeout(() => {
        window.dispatchEvent(new Event('taskCompleted'));
      }, 100);
    }
    return success;
  }, [user, fetchDailyStats]);

  return {
    dailyStats,
    loading,
    completeTask,
    completedTaskIds,
    completedToday: dailyStats.completedToday,
    dailyLimit: dailyStats.dailyLimit,
    remainingTasks: dailyStats.remainingTasks,
  };
};
