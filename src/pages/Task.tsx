import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Clock, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserActivity } from "@/hooks/useUserActivity";
import taskCommercial from "@/assets/task-commercial.jpg";

interface Task {
  id: string;
  title: string;
  category: string;
  duration: number; // in seconds
  reward: number; // in PKR
  status: 'available' | 'in_progress' | 'completed';
  image_url: string;
  video_url?: string;
  description?: string;
}

interface UserLevel {
  level: number;
  name: string;
  multiplier: number; // earnings multiplier
  daily_task_limit: number;
}

interface MembershipPlan {
  id: string;
  name: string;
  unit_price: number;
  daily_tasks_limit: number;
}

export const Task = () => {
  const [activeTab, setActiveTab] = useState('doing');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>({
    level: 1,
    name: 'Basic',
    multiplier: 1.0,
    daily_task_limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan | null>(null);
  const [completedTodayIds, setCompletedTodayIds] = useState<string[]>([]);
  const [todayKey, setTodayKey] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackPageView, trackTaskCompletion, trackActivity } = useUserActivity();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTasksRefreshAtRef = useRef<number>(0);
  const lastCompletionsRefreshAtRef = useRef<number>(0);
  const THROTTLE_MS = 1000;

  // DB-backed task list
  const sampleTasks: Task[] = [];

  useEffect(() => {
    fetchUserLevel();
    fetchMembershipPlan();
    loadCompletedToday();
    loadCompletedTodayFromDb(); // Load from database on initial load
    setTodayKey(getTodayKey());
    
    // Track page view
    trackPageView('/task');
    // subscribe to realtime updates
    let tasksChannel: any;
    let userTasksChannel: any;
    let videosChannel: any;
    let plansChannel: any;
    let usersChannel: any;
    let taskCompletionsChannel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Resolve internal user id
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id, vip_level')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;

      tasksChannel = (supabase as unknown as any)
        .channel('rt-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          const now = Date.now();
          if (now - lastTasksRefreshAtRef.current > THROTTLE_MS) {
            lastTasksRefreshAtRef.current = now;
            void fetchTasksForPlan();
          }
        })
        .subscribe();

      userTasksChannel = (supabase as unknown as any)
        .channel('rt-user-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tasks', filter: `user_id=eq.${internalUserId}` }, () => {
          const now = Date.now();
          if (now - lastCompletionsRefreshAtRef.current > THROTTLE_MS) {
            lastCompletionsRefreshAtRef.current = now;
            void loadCompletedTodayFromDb();
          }
        })
        .subscribe();

      videosChannel = (supabase as unknown as any)
        .channel('rt-videos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
          const now = Date.now();
          if (now - lastTasksRefreshAtRef.current > THROTTLE_MS) {
            lastTasksRefreshAtRef.current = now;
            void fetchTasksForPlan();
          }
        })
        .subscribe();

      plansChannel = (supabase as unknown as any)
        .channel('rt-membership-plans')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_plans' }, () => {
          const now = Date.now();
          if (now - lastTasksRefreshAtRef.current > THROTTLE_MS) {
            lastTasksRefreshAtRef.current = now;
            fetchMembershipPlan();
          }
        })
        .subscribe();

      usersChannel = (supabase as unknown as any)
        .channel('rt-users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${internalUserId}` }, () => {
          const now = Date.now();
          if (now - lastTasksRefreshAtRef.current > THROTTLE_MS) {
            lastTasksRefreshAtRef.current = now;
            fetchMembershipPlan();
          }
        })
        .subscribe();

      // Subscribe to task_completions for real-time updates
      taskCompletionsChannel = (supabase as unknown as any)
        .channel('rt-task-completions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions', filter: `user_id=eq.${internalUserId}` }, () => {
          const now = Date.now();
          if (now - lastCompletionsRefreshAtRef.current > THROTTLE_MS) {
            lastCompletionsRefreshAtRef.current = now;
            void loadCompletedTodayFromDb();
          }
        })
        .subscribe();
    })();

    return () => {
      try {
        if (tasksChannel) (supabase as unknown as any).removeChannel(tasksChannel);
        if (userTasksChannel) (supabase as unknown as any).removeChannel(userTasksChannel);
        if (videosChannel) (supabase as unknown as any).removeChannel(videosChannel);
        if (plansChannel) (supabase as unknown as any).removeChannel(plansChannel);
        if (usersChannel) (supabase as unknown as any).removeChannel(usersChannel);
        if (taskCompletionsChannel) (supabase as unknown as any).removeChannel(taskCompletionsChannel);
      } catch {}
    };
  }, []);

  // Detect date change while app is open and reset today's completions
  useEffect(() => {
    const timer = setInterval(() => {
      const key = getTodayKey();
      if (key !== todayKey) {
        setTodayKey(key);
        loadCompletedToday();
      }
    }, 60000); // check every 60s
    return () => clearInterval(timer);
  }, [todayKey]);

  useEffect(() => {
    if (membershipPlan) {
      // Always refresh both DB and local completions before computing lists
      (async () => {
        await loadCompletedTodayFromDb();
        await fetchTasksForPlan();
      })();
    } else {
      setTasks(sampleTasks);
    }
  }, [membershipPlan]);

  const fetchUserLevel = async () => {
    try {
      // TODO: Fetch user level from database
      // const { data: { user } } = await supabase.auth.getUser();
      // if (user) {
      //   const { data: profile } = await supabase
      //     .from('profiles')
      //     .select('vip_level')
      //     .eq('id', user.id)
      //     .single();
      //   
      //   if (profile) {
      //     const levelData = getLevelData(profile.vip_level);
      //     setUserLevel(levelData);
      //   }
      // }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const getLevelData = (level: number): UserLevel => {
    const levels: { [key: number]: UserLevel } = {
      1: { level: 1, name: 'Basic', multiplier: 1.0, daily_task_limit: 10 },
      2: { level: 2, name: 'Silver', multiplier: 1.5, daily_task_limit: 15 },
      3: { level: 3, name: 'Gold', multiplier: 2.0, daily_task_limit: 20 },
      4: { level: 4, name: 'Platinum', multiplier: 2.5, daily_task_limit: 25 },
      5: { level: 5, name: 'Diamond', multiplier: 3.0, daily_task_limit: 30 }
    };
    return levels[level] || levels[1];
  };

  const getVipRate = (vipName?: string): number => {
    // Per-level per-task rates provided in requirements
    const map: Record<string, number> = {
      VIP1: 30,
      VIP2: 50,
      VIP3: 70,
      VIP4: 80,
      VIP5: 100,
      VIP6: 115,
      VIP7: 160,
      VIP8: 220,
      VIP9: 260,
      VIP10: 440
    };
    const key = (vipName || '').toUpperCase();
    return map[key] ?? 30; // default to VIP1 rate
  };

  const calculateReward = (baseReward: number): number => {
    // Prefer explicit plan rate if available; else map by VIP name; else fallback multiplier
    if (membershipPlan && typeof membershipPlan.unit_price === 'number') {
      return Math.round(membershipPlan.unit_price);
    }
    // Try to infer from membership plan name if missing unit_price
    if (membershipPlan?.name) {
      return getVipRate(membershipPlan.name);
    }
    return Math.round(baseReward * userLevel.multiplier);
  };

  const fetchTasksForPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const levelName = membershipPlan?.name || 'VIP1';
      const levelNum = Number((levelName || 'VIP1').replace('VIP', '')) || 1;
      const allowedLevels = Array.from({ length: levelNum }, (_, i) => `VIP${i + 1}`);

      // Fetch active tasks for this VIP range
      const { data: dbTasks } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('task_status', 'active')
        .or(`min_vip_level.is.null,min_vip_level.in.(${allowedLevels.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(Math.max(1, membershipPlan?.daily_tasks_limit || 10));

      const unit = Math.round(membershipPlan?.unit_price || 30);
      let mappedTasks: Task[] = (dbTasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        category: t.category || 'Task',
        duration: t.duration_seconds || 10,
        reward: unit,
        status: 'available',
        image_url: taskCommercial,
        video_url: t.media_url || undefined,
        description: t.description || ''
      }));
      // Also fetch active videos to surface as tasks
      const { data: dbVideos } = await (supabase as any)
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const mappedVideos: Task[] = (dbVideos || []).map((v: any, idx: number) => ({
        id: `video-${v.id}`,
        title: v.title || `Video Task ${idx + 1}`,
        category: v.category || 'Video',
        duration: v.duration || 30,
        reward: unit,
        status: 'available',
        image_url: v.thumbnail_url || taskCommercial,
        video_url: v.video_url,
        description: v.description || 'Watch video to earn'
      }));

      let merged: Task[] = [...mappedTasks, ...mappedVideos];
      if (!merged.length) {
        // Fallback synthetic tasks so user always sees tasks per daily limit
        const count = Math.max(1, membershipPlan?.daily_tasks_limit || 5);
        merged = Array.from({ length: count }).map((_, i) => ({
          id: `synthetic-${i + 1}`,
          title: `Watch & Earn Task ${i + 1}`,
          category: 'Commercial Advertisement',
          duration: 10,
          reward: unit,
          status: 'available',
          image_url: taskCommercial,
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          description: 'Watch this short video to earn'
        }));
      }
      const limit = Math.max(1, membershipPlan?.daily_tasks_limit || 10);
      setTasks(merged.slice(0, limit));
    } catch (e) {
      console.warn('Failed to fetch tasks for plan', e);
      setTasks(sampleTasks);
    }
  };

  const fetchMembershipPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('vip_level')
        .eq('auth_user_id', user.id)
        .single();

      const levelName = dbUser?.vip_level || 'VIP1';
      const { data: plan } = await (supabase as any)
        .from('membership_plans')
        .select('id,name,daily_video_limit,is_active')
        .eq('name', levelName)
        .eq('is_active', true)
        .single();

      if (plan) {
        setMembershipPlan({
          id: plan.id,
          name: plan.name,
          unit_price: getVipRate(levelName),
          daily_tasks_limit: plan.daily_video_limit || (levelName === 'VIP1' ? 5 : 10)
        });
      } else {
        // Fallback plan using provided mapping
        setMembershipPlan({
          id: 'fallback',
          name: levelName,
          unit_price: getVipRate(levelName),
          daily_tasks_limit: levelName === 'VIP1' ? 5 :
                             levelName === 'VIP2' ? 10 :
                             levelName === 'VIP3' ? 16 :
                             levelName === 'VIP4' ? 31 :
                             levelName === 'VIP5' ? 50 :
                             levelName === 'VIP6' ? 75 :
                             levelName === 'VIP7' ? 100 :
                             levelName === 'VIP8' ? 120 :
                             levelName === 'VIP9' ? 150 :
                             levelName === 'VIP10' ? 180 : 5
        });
      }
    } catch (e) {
      console.warn('Failed to fetch membership plan, using defaults.');
      // Default to VIP1
      setMembershipPlan({ id: 'fallback', name: 'VIP1', unit_price: 30, daily_tasks_limit: 5 });
    }
  };

  // Daily-completion tracking (local only)
  const getTodayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadCompletedToday = () => {
    try {
      const key = `task_completions_${getTodayKey()}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      setCompletedTodayIds(Array.isArray(list) ? list : []);
    } catch {
      setCompletedTodayIds([]);
    }
  };

  const loadCompletedTodayFromDb = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;

      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const { data: ut } = await (supabase as any)
        .from('user_tasks')
        .select('task_id, status, completed_at')
        .eq('user_id', internalUserId)
        .eq('status', 'completed')
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString());
      const idsUserTasks = (ut || []).map((r: any) => r.task_id);

      // Also include fallback completions from optional task_completions table (for non-UUID tasks/videos)
      const { data: tc } = await (supabase as any)
        .from('task_completions')
        .select('task_id, task_key, created_at')
        .eq('user_id', internalUserId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      const idsTaskCompletions = (tc || []).map((r: any) => r.task_id || r.task_key).filter(Boolean);

      // Get completed tasks from transactions table (for video tasks and other completions)
      const { data: transactions } = await (supabase as any)
        .from('transactions')
        .select('description, created_at')
        .eq('user_id', internalUserId)
        .eq('transaction_type', 'task_reward')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      // Extract task IDs from transaction descriptions
      const idsFromTransactions = (transactions || []).map((t: any) => {
        const desc = t.description || '';
        // Try to extract task ID from description like "Task reward: Video Task 1" or "Task reward: <task_title>"
        if (desc.includes('Video Task')) {
          const match = desc.match(/Video Task (\d+)/);
          return match ? `video-${match[1]}` : null;
        }
        // For synthetic tasks, extract the number
        if (desc.includes('Watch & Earn Task')) {
          const match = desc.match(/Watch & Earn Task (\d+)/);
          return match ? `synthetic-${match[1]}` : null;
        }
        // For other tasks, we'll use the description as a key
        return desc.replace('Task reward: ', '');
      }).filter(Boolean);

      // Merge all completion sources and replace completely (don't merge with prev state)
      const allCompletedIds = Array.from(new Set([...idsUserTasks, ...idsTaskCompletions, ...idsFromTransactions]));
      
      // Set completed tasks and save to localStorage
      setCompletedTodayIds(allCompletedIds);
      try {
        const key = `task_completions_${getTodayKey()}`;
        localStorage.setItem(key, JSON.stringify(allCompletedIds));
      } catch {}
    } catch {
      // ignore
    }
  };

  const saveCompletedToday = (ids: string[]) => {
    try {
      const key = `task_completions_${getTodayKey()}`;
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  };

  const startTask = async (task: Task) => {
    // Prevent starting a task already completed today
    if (completedTodayIds.includes(task.id)) {
      toast({
        title: "Already Completed",
        description: "You've already completed this task today.",
        variant: "destructive"
      });
      return;
    }
    
    // Track task start
    await trackActivity('task_start', {
      task_id: task.id,
      task_title: task.title,
      task_category: task.category,
      reward: task.reward
    });
    
    setCurrentTask(task);
    setTaskProgress(0);
    setVideoTime(0);
    setCanSubmit(false);
    setVideoLoading(false);
    setVideoError(false);
    setShowVideoPopup(true);
    setLoading(true);

    // Update task status to in_progress
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'in_progress' } : t
    ));

    // Simulate video watching progress
    progressIntervalRef.current = setInterval(() => {
      setVideoTime(prev => {
        const newTime = prev + 1;
        const progress = (newTime / task.duration) * 100;
        setTaskProgress(Math.min(progress, 100));
        
        if (newTime >= task.duration) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          setCanSubmit(true);
          setTaskProgress(100);
          return task.duration;
        }
        return newTime;
      });
    }, 1000);

    toast({
      title: "Task Started",
      description: `Watching ${task.title} for ${task.duration} seconds`,
    });
  };

  const handleVideoTimeUpdate = (currentTime: number, task: Task) => {
    setVideoTime(currentTime);
    const progress = (currentTime / task.duration) * 100;
    setTaskProgress(Math.min(progress, 100));
    
    // Enable submit button when video reaches the required duration
    if (currentTime >= task.duration) {
      setCanSubmit(true);
    }
  };

  const handleVideoEnd = (task: Task) => {
    setCanSubmit(true);
    setTaskProgress(100);
  };

  const submitTask = async (task: Task) => {
    if (!canSubmit) return;
    
    setLoading(false);
    setCurrentTask(null);
    setTaskProgress(0);
    setShowVideoPopup(false);
    setCanSubmit(false);
    setVideoTime(0);

    const actualReward = calculateReward(task.reward);

    // Update task status to completed
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'completed' } : t
    ));

    // Credit income wallet and record completion
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('id,income_wallet_balance,total_earnings')
          .eq('auth_user_id', user.id)
          .single();

        const newIncome = (profile?.income_wallet_balance || 0) + actualReward;
        const newTotal = (profile?.total_earnings || 0) + actualReward;

        await (supabase as any)
          .from('users')
          .update({ income_wallet_balance: newIncome, total_earnings: newTotal })
          .eq('auth_user_id', user.id);

        const internalUserId = profile?.id || user.id;

        // Always record a revenue transaction for reliable financial reporting
        await (supabase as any)
          .from('transactions')
          .insert({
            user_id: internalUserId,
            transaction_type: 'task_reward',
            amount: Number(actualReward || 0),
            description: `Task reward: ${task.title}`,
            status: 'completed'
          });

        // Only write to user_tasks if task.id is a real UUID referencing tasks table
        const isUuid = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(task.id);
        if (isUuid) {
          await (supabase as any)
            .from('user_tasks')
            .upsert({
              user_id: internalUserId,
              task_id: task.id,
              status: 'completed',
              reward_earned: Number(actualReward || 0),
              completed_at: new Date().toISOString()
            }, { onConflict: 'user_id,task_id' });
        }

        // Always record completion in task_completions table for persistence across sessions
        await (supabase as any)
          .from('task_completions')
          .insert({
            user_id: internalUserId,
            task_id: task.id,
            task_key: task.title,
            reward_earned: Number(actualReward || 0),
            completed_at: new Date().toISOString()
          });
      }
    } catch (e) {
      console.warn('Failed to persist task completion; credited locally only.');
    }

    // Track task completion
    await trackTaskCompletion(task.id, task.title, actualReward);

    // Mark task completed for today (persist to local and keep in state)
    setCompletedTodayIds(prev => {
      const next = Array.from(new Set([...(prev || []), task.id]));
      saveCompletedToday(next);
      return next;
    });

    toast({
      title: "Task Completed!",
      description: `You earned PKR ${actualReward} (Level ${userLevel.level} bonus applied)`,
    });
  };

  const closeVideoPopup = () => {
    // Clear the progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setShowVideoPopup(false);
    setCurrentTask(null);
    setTaskProgress(0);
    setCanSubmit(false);
    setVideoTime(0);
    setLoading(false);
    setVideoLoading(false);
    setVideoError(false);
  };

  const completeTask = async (task: Task) => {
    setLoading(false);
    setCurrentTask(null);
    setTaskProgress(0);

    const actualReward = calculateReward(task.reward);

    // Update task status to completed
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'completed' } : t
    ));

    // Credit income wallet and record completion
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('id,income_wallet_balance,total_earnings')
          .eq('auth_user_id', user.id)
          .single();

        const newIncome = (profile?.income_wallet_balance || 0) + actualReward;
        const newTotal = (profile?.total_earnings || 0) + actualReward;

        await (supabase as any)
          .from('users')
          .update({ income_wallet_balance: newIncome, total_earnings: newTotal })
          .eq('auth_user_id', user.id);

        await (supabase as any)
          .from('task_completions')
          .insert({ user_id: profile?.id || user.id, task_id: task.id, reward_earned: actualReward });
      }
    } catch (e) {
      console.warn('Failed to persist task completion; credited locally only.');
    }

    // Mark task completed for today and hide it
    setCompletedTodayIds(prev => {
      const next = Array.from(new Set([...prev, task.id]));
      saveCompletedToday(next);
      return next;
    });

    toast({
      title: "Task Completed!",
      description: `You earned PKR ${actualReward} (Level ${userLevel.level} bonus applied)`,
    });
  };

  const getDailyLimit = () => {
    return membershipPlan?.daily_tasks_limit || userLevel.daily_task_limit;
  };

  const getFilteredTasks = (status: string) => {
    const dailyLimit = getDailyLimit();
    const remaining = Math.max(0, dailyLimit - completedTodayIds.length);

    if (status === 'doing') {
      const seen = new Set<string>();
      const normalizeId = (id: string) => id?.startsWith('video-') ? id.replace(/^video-/, '') : id;
      const completedSet = new Set(completedTodayIds.map(normalizeId));
      const inProgress = tasks.filter(t => t.status === 'in_progress' && !completedSet.has(normalizeId(t.id)) && !seen.has(t.id) && (seen.add(t.id), true));
      const available = tasks.filter(t => t.status === 'available' && !completedSet.has(normalizeId(t.id)) && !seen.has(t.id) && (seen.add(t.id), true));
      const availableNeeded = Math.max(0, remaining - inProgress.length);
      return [...inProgress, ...available.slice(0, availableNeeded)];
    }
    if (status === 'completed') {
      const completedSeen = new Set<string>();
      const normalizeId = (id: string) => id?.startsWith('video-') ? id.replace(/^video-/, '') : id;
      const completedSet = new Set(completedTodayIds.map(normalizeId));
      const completed = tasks.filter(t => (completedSet.has(normalizeId(t.id)) || t.status === 'completed') && !completedSeen.has(t.id) && (completedSeen.add(t.id), true));
      return completed;
    }
    return [];
  };

  const getTaskCount = (status: string) => {
    return getFilteredTasks(status).length;
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pt-2 md:pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-primary-foreground"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <h1 className="text-lg md:text-xl font-bold text-primary-foreground">Task List</h1>
      </div>

      {/* User Level Info */}
      <Card className="mb-4 md:mb-6 shadow-elegant">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">Your Level</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {(membershipPlan?.name || userLevel.name)} - {calculateReward(1)} PKR per task
              </p>
            </div>
            <Badge className="bg-blue-500 text-white text-xs md:text-sm">
              {(membershipPlan?.name || `Level ${userLevel.level}`)}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Daily limit: {membershipPlan?.daily_tasks_limit || userLevel.daily_task_limit} tasks
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
          <TabsTrigger value="doing" className="flex items-center gap-2">
            Doing
            {getTaskCount('doing') > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getTaskCount('doing')}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            {getTaskCount('completed') > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getTaskCount('completed')}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Task Content */}
        <TabsContent value="doing" className="space-y-4">
          {getFilteredTasks('doing').map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userLevel={userLevel}
              onStart={startTask}
              onComplete={completeTask}
              isCurrentTask={currentTask?.id === task.id}
              progress={taskProgress}
              loading={loading}
            />
          ))}
          {getFilteredTasks('doing').length === 0 && (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No tasks available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        

        <TabsContent value="completed" className="space-y-4">
          {getFilteredTasks('completed').map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userLevel={userLevel}
              onStart={startTask}
              onComplete={completeTask}
              isCurrentTask={false}
              progress={100}
              loading={false}
            />
          ))}
          {getFilteredTasks('completed').length === 0 && (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No completed tasks</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Popup Modal */}
      {showVideoPopup && currentTask && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{currentTask.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeVideoPopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video Player */}
            <div className="p-4">
              <div className="relative">
                {videoLoading && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Loading video...</p>
                    </div>
                  </div>
                )}
                
                {videoError && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                    <div className="text-white text-center p-4">
                      <p className="mb-2">Video unavailable</p>
                      <p className="text-sm text-gray-300">Task will auto-complete in 5 seconds</p>
                    </div>
                  </div>
                )}

                <div className="w-full h-64 bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Video Placeholder with Animation */}
                  <div className="text-center text-white z-10">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{currentTask.title}</h3>
                    <p className="text-sm text-gray-300 mb-4">{currentTask.description}</p>
                    
                    {/* Simulated Video Progress */}
                    <div className="w-full max-w-xs mx-auto">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Watching...</span>
                        <span>{Math.round(videoTime)}s / {currentTask.duration}s</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${taskProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated Background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse"></div>
                  </div>
                </div>

                {/* Hidden video element for time tracking */}
                <video
                  className="hidden"
                  onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget.currentTime, currentTask)}
                  onEnded={() => handleVideoEnd(currentTask)}
                  onError={(e) => {
                    console.error('Video error:', e);
                    setVideoLoading(false);
                    setVideoError(true);
                    toast({
                      title: "Video Error",
                      description: "Using fallback mode - task will complete automatically",
                      variant: "destructive"
                    });
                    // Enable submit after a delay as fallback
                    setTimeout(() => {
                      setCanSubmit(true);
                      setTaskProgress(100);
                    }, 5000);
                  }}
                >
                  <source src={currentTask.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'} type="video/mp4" />
                  <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
                </video>


              </div>

              {/* Task Info */}
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">{currentTask.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{currentTask.duration}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      <span className="text-green-600 font-medium">
                        {calculateReward(currentTask.reward)} PKR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closeVideoPopup}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitTask(currentTask)}
                  disabled={!canSubmit}
                  className={`flex-1 ${
                    canSubmit 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {canSubmit ? 'Submit & Earn' : `Watch ${currentTask.duration}s to Submit`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  userLevel: UserLevel;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  isCurrentTask: boolean;
  progress: number;
  loading: boolean;
}

const TaskCard = ({ 
  task, 
  userLevel, 
  onStart, 
  onComplete, 
  isCurrentTask, 
  progress, 
  loading 
}: TaskCardProps) => {
  const calculateReward = (baseReward: number): number => {
    return Math.round(baseReward * userLevel.multiplier);
  };

  const actualReward = calculateReward(task.reward);

  return (
    <Card className="shadow-elegant overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="flex gap-3 md:gap-4">
          {/* Task Image */}
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
            <img
              src={task.image_url}
              alt={task.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/src/assets/placeholder.svg';
              }}
            />
          </div>

          {/* Task Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-sm md:text-base">
                  {task.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {task.category}
                </p>
              </div>
              <Badge 
                variant={task.status === 'available' ? 'secondary' : 
                        task.status === 'in_progress' ? 'default' : 'outline'}
                className="ml-2 flex-shrink-0 text-xs"
              >
                {task.status === 'available' ? 'Available' : 
                 task.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </Badge>
            </div>

            {/* Task Info */}
            <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span>{task.duration}s</span>
              </div>
              <div className="flex items-center gap-1">
                <Play className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-green-600 font-medium">
                  {actualReward} PKR
                </span>
                {userLevel.multiplier > 1 && (
                  <span className="text-xs text-blue-600">
                    (Level {userLevel.level} bonus)
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              {task.status === 'available' && (
                <Button
                  onClick={() => onStart(task)}
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs md:text-sm py-1 md:py-2"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Start
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  variant="outline"
                  onClick={() => onStart(task)}
                  className="text-blue-600 border-blue-600 text-xs md:text-sm py-1 md:py-2"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  In Progress
                </Button>
              )}
              {task.status === 'completed' && (
                <Button
                  variant="outline"
                  disabled
                  className="text-green-600 border-green-600 text-xs md:text-sm py-1 md:py-2"
                >
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
