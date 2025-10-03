import { supabase } from '@/integrations/supabase/client';

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  task_key?: string;
  task_type: 'video' | 'synthetic' | 'real_task';
  reward_earned: number;
  completed_at: string;
  session_id?: string;
}

export interface DailyTaskStats {
  completed_today: number;
  daily_limit: number;
  remaining_tasks: number;
  completed_task_ids: string[];
}

class TaskCompletionService {
  private static instance: TaskCompletionService;
  private completedTodayCache: Map<string, string[]> = new Map();
  private lastRefreshTime: number = 0;
  private refreshThrottleMs: number = 1000;

  static getInstance(): TaskCompletionService {
    if (!TaskCompletionService.instance) {
      TaskCompletionService.instance = new TaskCompletionService();
    }
    return TaskCompletionService.instance;
  }

  private getTodayKey(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('task_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('task_session_id', sessionId);
    }
    return sessionId;
  }

  async getInternalUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (dbUser?.id) return dbUser.id;

      // If user row is missing, create a minimal default profile to ensure downstream flows work
      const emailLocal = user.email?.split('@')[0] || 'user';
      const derivedPhone = /\d{5,}/.test(emailLocal) ? emailLocal : '';
      const defaultProfile: any = {
        auth_user_id: user.id,
        full_name: 'User',
        username: emailLocal,
        phone_number: derivedPhone,
        vip_level: 'VIP1',
        referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
        personal_wallet_balance: 0.00,
        income_wallet_balance: 0.00,
        total_earnings: 0.00
      };

      const { error: insertError } = await supabase.from('users').insert(defaultProfile);
      if (insertError) {
        console.error('Error creating default user profile:', insertError);
        return null;
      }

      const { data: created } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      return created?.id || null;
    } catch (error) {
      console.error('Error getting internal user ID:', error);
      return null;
    }
  }

  async getDailyTaskStats(): Promise<DailyTaskStats> {
    try {
      const internalUserId = await this.getInternalUserId();
      if (!internalUserId) {
        return { completed_today: 0, daily_limit: 5, remaining_tasks: 5, completed_task_ids: [] };
      }

      // Get user's VIP level and daily limit
      const { data: userData } = await supabase
        .from('users')
        .select('vip_level')
        .eq('id', internalUserId)
        .maybeSingle();

      const vipLevel = userData?.vip_level || 'VIP1';
      const dailyLimit = this.getDailyLimitForVipLevel(vipLevel);

      // Get today's completions
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id, completed_at')
        .eq('user_id', internalUserId)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());

      // Check if the table doesn't exist
      if (completionsError && completionsError.code === 'PGRST205') {
        console.warn('⚠️ task_completions table does not exist. Task completion tracking is disabled.');
        console.warn('💡 Please create the task_completions table in your Supabase dashboard.');
        return {
          completed_today: 0,
          daily_limit: dailyLimit,
          remaining_tasks: dailyLimit,
          completed_task_ids: []
        };
      }

      if (completionsError) {
        console.error('Error fetching task completions:', completionsError);
        return {
          completed_today: 0,
          daily_limit: dailyLimit,
          remaining_tasks: dailyLimit,
          completed_task_ids: []
        };
      }

      const completedTaskIds = completions?.map(c => c.task_id) || [];
      const completedToday = completedTaskIds.length;
      const remainingTasks = Math.max(0, dailyLimit - completedToday);

      return {
        completed_today: completedToday,
        daily_limit: dailyLimit,
        remaining_tasks: remainingTasks,
        completed_task_ids: completedTaskIds
      };
    } catch (error) {
      console.error('Error getting daily task stats:', error);
      return { completed_today: 0, daily_limit: 5, remaining_tasks: 5, completed_task_ids: [] };
    }
  }

  private getDailyLimitForVipLevel(vipLevel: string): number {
    const limits: Record<string, number> = {
      'VIP1': 5,
      'VIP2': 10,
      'VIP3': 16,
      'VIP4': 31,
      'VIP5': 50,
      'VIP6': 75,
      'VIP7': 100,
      'VIP8': 120,
      'VIP9': 150,
      'VIP10': 180
    };
    return limits[vipLevel] || 5;
  }

  async getVipRate(vipLevel: string): Promise<number> {
    const rates: Record<string, number> = {
      'VIP1': 30,
      'VIP2': 50,
      'VIP3': 70,
      'VIP4': 80,
      'VIP5': 100,
      'VIP6': 115,
      'VIP7': 160,
      'VIP8': 220,
      'VIP9': 260,
      'VIP10': 440
    };
    return rates[vipLevel] || 30;
  }

  async completeTask(taskId: string, taskTitle: string, taskType: 'video' | 'synthetic' | 'real_task' = 'video', reward?: number): Promise<boolean> {
    try {
      const internalUserId = await this.getInternalUserId();
      if (!internalUserId) {
        console.error('No user ID available for task completion');
        return false;
      }

      // Get user's VIP level and calculate reward if not provided
      if (!reward) {
        const { data: userData } = await supabase
          .from('users')
          .select('vip_level')
          .eq('id', internalUserId)
          .single();
        
        const vipLevel = userData?.vip_level || 'Intern';
        reward = await this.getVipRate(vipLevel);
      }

      // Check if task already completed today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: existingCompletion, error: checkError } = await supabase
        .from('task_completions')
        .select('id')
        .eq('user_id', internalUserId)
        .eq('task_id', taskId)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString())
        .maybeSingle();

      // Handle missing table - skip completion check but continue with reward
      if (checkError && checkError.code === 'PGRST205') {
        console.warn('⚠️ task_completions table does not exist. Skipping completion tracking but processing reward.');
      } else if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected when no completion exists
        console.error('Error checking existing completion:', checkError);
        return false;
      } else if (existingCompletion) {
        console.log('Task already completed today:', taskId);
        return false;
      }

      // Try to record task completion (will fail gracefully if table doesn't exist)
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert({
          user_id: internalUserId,
          task_id: taskId,
          task_key: taskTitle,
          task_type: taskType,
          reward_earned: reward,
          completed_at: new Date().toISOString(),
          session_id: this.getSessionId()
        });

      if (completionError && completionError.code === 'PGRST205') {
        console.warn('⚠️ task_completions table does not exist. Task completion not recorded but reward will be processed.');
      } else if (completionError) {
        console.error('Error recording task completion:', completionError);
        return false;
      }

      // Update user's income wallet
      const { data: userData } = await supabase
        .from('users')
        .select('income_wallet_balance, total_earnings')
        .eq('id', internalUserId)
        .maybeSingle();

      if (userData) {
        const newIncomeBalance = (userData.income_wallet_balance || 0) + reward;
        const newTotalEarnings = (userData.total_earnings || 0) + reward;

        await supabase
          .from('users')
          .update({
            income_wallet_balance: newIncomeBalance,
            total_earnings: newTotalEarnings
          })
          .eq('id', internalUserId);
      }

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: internalUserId,
          transaction_type: 'task_reward',
          amount: reward,
          description: `Task reward: ${taskTitle}`,
          status: 'completed'
        });

      // Clear cache to force refresh
      this.completedTodayCache.clear();
      this.lastRefreshTime = 0;

      console.log('Task completed successfully:', taskId);
      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  async isTaskCompletedToday(taskId: string): Promise<boolean> {
    try {
      const stats = await this.getDailyTaskStats();
      return stats.completed_task_ids.includes(taskId);
    } catch (error) {
      console.error('Error checking if task completed today:', error);
      return false;
    }
  }

  async getCompletedTasksToday(userId?: string): Promise<string[]> {
    try {
      const internalUserId = userId || await this.getInternalUserId();
      if (!internalUserId) {
        return [];
      }

      // Get today's completions
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', internalUserId)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());

      // Handle missing table gracefully
      if (completionsError && completionsError.code === 'PGRST205') {
        console.warn('⚠️ task_completions table does not exist. Returning empty completion list.');
        return [];
      }

      if (completionsError) {
        console.error('Error fetching completed tasks:', completionsError);
        return [];
      }

      return completions?.map(c => c.task_id) || [];
    } catch (error) {
      console.error('Error getting completed tasks today:', error);
      return [];
    }
  }

  async refreshDailyStats(): Promise<DailyTaskStats> {
    const now = Date.now();
    if (now - this.lastRefreshTime < this.refreshThrottleMs) {
      // Return cached data if refreshed recently
      const todayKey = this.getTodayKey();
      const cachedIds = this.completedTodayCache.get(todayKey) || [];
      return {
        completed_today: cachedIds.length,
        daily_limit: 5, // Will be updated by actual call
        remaining_tasks: 5 - cachedIds.length,
        completed_task_ids: cachedIds
      };
    }

    this.lastRefreshTime = now;
    const stats = await this.getDailyTaskStats();
    
    // Cache the results
    const todayKey = this.getTodayKey();
    this.completedTodayCache.set(todayKey, stats.completed_task_ids);
    
    return stats;
  }

  // Real-time subscription for task completions
  subscribeToTaskCompletions(callback: (stats: DailyTaskStats) => void): () => void {
    let channel: any = null;

    const setupSubscription = async () => {
      const internalUserId = await this.getInternalUserId();
      if (!internalUserId) return;

      channel = supabase
        .channel('task-completions-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_completions',
          filter: `user_id=eq.${internalUserId}`
        }, async () => {
          // Refresh stats when completions change
          const stats = await this.refreshDailyStats();
          callback(stats);
        })
        .subscribe();

      // Also listen to user balance changes
      const userChannel = supabase
        .channel('user-balance-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${internalUserId}`
        }, async () => {
          const stats = await this.refreshDailyStats();
          callback(stats);
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }

  // Clear all cached data (useful for logout)
  clearCache(): void {
    this.completedTodayCache.clear();
    this.lastRefreshTime = 0;
    sessionStorage.removeItem('task_session_id');
  }
}

export const taskCompletionService = TaskCompletionService.getInstance();
