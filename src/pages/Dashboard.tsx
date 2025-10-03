import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  ArrowRight,
  Calendar,
  Clock,
  Trophy,
  Star,
  Crown,
  Bell,
  Award,
  Gift,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useTaskCompletion } from "@/hooks/useTaskCompletion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type MembershipPlan = {
  id: string;
  name: string;
  daily_video_limit: number;
  price: number;
  video_rate: number;
  duration_days: number;
  is_active: boolean;
};

type UserProfilesRow = {
  id: string;
  user_id: string;
  membership_type: string;
  membership_level?: string;
  total_earnings?: number;
};

type UsersTableRow = {
  id: string;
  auth_user_id: string;
  personal_wallet_balance: number | null;
  total_earnings: number | null;
  referral_count: number | null;
  vip_level?: string | null;
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackPageView, trackVipUpgrade } = useUserActivity();
  const { completedToday, dailyLimit, remainingTasks } = useTaskCompletion();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfilesRow | null>(null);
  const [userRecord, setUserRecord] = useState<UsersTableRow | null>(null);
  const [loadingVip, setLoadingVip] = useState<boolean>(true);
  const [processingJoin, setProcessingJoin] = useState<boolean>(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan | null>(null);
  const [currentVideoLimit, setCurrentVideoLimit] = useState<number>(0);
  const [completedTodayCount, setCompletedTodayCount] = useState<number>(0);
  const [averageRewardPerWatch, setAverageRewardPerWatch] = useState<number>(0);

  useEffect(() => {
    // Track page view
    trackPageView('/dashboard');
    
    // Fetch membership plans first (public data)
    const fetchMembershipPlans = async () => {
      try {
        const { data: plansData, error: plansError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (plansError) {
          console.error('Error fetching plans:', plansError);
        } else {
          setPlans(plansData || []);
        }
      } catch (error) {
        console.error('Error fetching membership plans:', error);
      }
    };
    
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingVip(false);
          return;
        }

        const [{ data: usersData, error: usersError }] = await Promise.all([
          supabase.from('users').select('*').eq('auth_user_id', user.id).maybeSingle()
        ]);

        if (usersError) {
          console.error('Error fetching user data:', usersError);
          // If user doesn't exist in users table, create a basic profile
          if (usersError.code === 'PGRST116') {
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                auth_user_id: user.id,
                full_name: user.user_metadata?.full_name || 'User',
                username: user.email?.split('@')[0] || 'user',
                phone_number: user.phone || (user.email?.split('@')[0] || ''),
                referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
                vip_level: null,
                total_earnings: 0,
                referral_count: 0
              })
              .select()
              .maybeSingle();
              
            if (createError) {
              console.error('Create user error:', createError);
              throw createError;
            }
            
            setUserRecord(newUser as unknown as UsersTableRow);
          } else {
            throw usersError;
          }
        } else {
          // Get referral count if not already in user record
          if (usersData && !usersData.referral_count) {
            // Count referrals from team_structure table
            const { count, error: countError } = await supabase
              .from('team_structure')
              .select('*', { count: 'exact', head: true })
              .eq('parent_id', usersData.id);
              
            if (!countError) {
              // Update user record with referral count
              await supabase
                .from('users')
                .update({ referral_count: count || 0 })
                .eq('id', usersData.id);
                
              usersData.referral_count = count || 0;
            }
          }
          
          setUserRecord(usersData as unknown as UsersTableRow);
        }

        // Fetch active plan if any
        const { data: activePlanData, error: activePlanError } = await supabase
          .from('user_plans')
          .select('plan_id, membership_plans(*)')
          .eq('user_id', internalUserId)
          .eq('is_active', true)
          .single();

        if (!activePlanError && activePlanData && activePlanData.membership_plans) {
          // Fix: membership_plans is already a single object, not an array
          setActivePlan(activePlanData.membership_plans);
        }

      } catch (error) {
        console.error('Error in fetchUserData:', error);
        toast({
          title: "Error",
          description: "Failed to load user data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingVip(false);
      }
    };

    // Fetch membership plans immediately (public data)
    fetchMembershipPlans();
    
    // Fetch user-specific data
    fetchUserData();
  }, [toast]);

  // Update earning rate and display values when active plan changes
  useEffect(() => {
    if (activePlan) {
      const rate = getVideoRateForPlan(activePlan.name || '');
      setAverageRewardPerWatch(rate);
      if (activePlan.daily_video_limit && completedTodayCount >= 0) {
        setCurrentVideoLimit(Math.max(0, (activePlan.daily_video_limit || 0) - (completedTodayCount || 0)));
      }
    }
  }, [activePlan, completedTodayCount]);

  useEffect(() => {
    let usersChannel: any;
    let plansChannel: any;
    let userPlansChannel: any;
    let userTasksChannel: any;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Resolve internal user id
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;

      usersChannel = (supabase as unknown as any)
        .channel('dashboard-users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${internalUserId}` }, () => {
          // refresh core user data and balances
          (async () => {
            const { data: usersData } = await supabase.from('users').select('*').eq('id', internalUserId).single();
            if (usersData) setUserRecord(usersData as unknown as UsersTableRow);
          })();
        })
        .subscribe();

      plansChannel = (supabase as unknown as any)
        .channel('dashboard-plans')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_plans' }, () => {
          (async () => {
            const { data: plansData } = await supabase.from('membership_plans').select('*').eq('is_active', true).order('price', { ascending: true });
            setPlans(plansData || []);
          })();
        })
        .subscribe();

      userPlansChannel = (supabase as unknown as any)
        .channel('dashboard-user-plans')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_plans', filter: `user_id=eq.${internalUserId}` }, () => {
          (async () => {
            const { data: activePlanData } = await supabase
              .from('user_plans')
              .select('plan_id, membership_plans(*)')
              .eq('user_id', internalUserId)
              .eq('is_active', true)
              .single();
            if (activePlanData && activePlanData.membership_plans) {
              // Fix: membership_plans is already a single object, not an array
              setActivePlan(activePlanData.membership_plans);
            }
            // Recompute today's remaining tasks whenever plan changes
            await recomputeTodaysRemainingTasks(user.id, activePlanData?.membership_plans?.daily_video_limit);
          })();
        })
        .subscribe();

      // Subscribe to daily_video_tasks changes for real-time active tasks count
      userTasksChannel = (supabase as unknown as any)
        .channel('dashboard-user-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_video_tasks', filter: `user_id=eq.${user.id}` }, () => {
          (async () => {
            await recomputeTodaysRemainingTasks(user.id, activePlan?.daily_video_limit);
          })();
        })
        .subscribe();
      
      // Initial compute
      await recomputeTodaysRemainingTasks(user.id, activePlan?.daily_video_limit);
    })();

    return () => {
      try {
        if (usersChannel) (supabase as unknown as any).removeChannel(usersChannel);
        if (plansChannel) (supabase as unknown as any).removeChannel(plansChannel);
        if (userPlansChannel) (supabase as unknown as any).removeChannel(userPlansChannel);
        if (userTasksChannel) (supabase as unknown as any).removeChannel(userTasksChannel);
      } catch {}
    };
  }, []);

  const recomputeTodaysRemainingTasks = async (authUserId: string, dailyLimit?: number) => {
    try {
      // Resolve internal users.id for foreign key usage
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      const internalUserId = dbUser?.id || authUserId;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { count, error } = await supabase
        .from('task_completions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', internalUserId)
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString());

      if (error && (error as any).code === 'PGRST205') {
        // Table missing: treat as zero completed
        console.warn('task_completions table missing when computing today count');
      } else if (error) {
        console.error('Error counting today completions:', error);
      }

      const completed = count || 0;
      setCompletedTodayCount(completed);

      const limit = typeof dailyLimit === 'number' ? dailyLimit : (activePlan?.daily_video_limit || 0);
      setCurrentVideoLimit(Math.max(0, limit - completed));
    } catch (e) {
      console.error('Failed to compute today\'s tasks:', e);
    }
  };

  const affordablePlan = useMemo(() => {
    if (!plans.length || !userRecord) return null;
    const balance = userRecord.personal_wallet_balance || 0;
    // pick the highest priced plan that the user can afford
    const affordable = plans.filter(p => p.price <= balance);
    if (!affordable.length) return null;
    return affordable[affordable.length - 1];
  }, [plans, userRecord]);

  const handleJoinVip = async () => {
    if (processingJoin) return;
    try {
      setProcessingJoin(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!affordablePlan) {
        toast({ title: 'Insufficient Balance', description: 'Not enough funds in personal wallet.', variant: 'destructive' });
        return;
      }

      // Create/insert user plan subscription
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + affordablePlan.duration_days);

      const { error: planErr } = await supabase.from('user_plans').insert({
        user_id: user.id,
        plan_id: affordablePlan.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        is_active: true
      });
      if (planErr) throw planErr;

      // Update user VIP level in users table
      const { error: profErr } = await supabase
        .from('users')
        .update({ vip_level: 'VIP1' })
        .eq('auth_user_id', user.id);
      if (profErr) throw profErr;

      // Deduct from personal wallet if present
      if (userRecord?.id) {
        const currentBalance = userRecord.personal_wallet_balance || 0;
        const newBalance = Math.max(0, currentBalance - affordablePlan.price);
        const { error: userUpdateErr } = await supabase
          .from('users')
          .update({ personal_wallet_balance: newBalance })
          .eq('id', userRecord.id);
        if (userUpdateErr) throw userUpdateErr;
        setUserRecord(prev => prev ? { ...prev, personal_wallet_balance: newBalance } : prev);
      }

      toast({ title: 'VIP Activated', description: `Welcome to ${affordablePlan.name}. Enjoy increased video earnings!` });
      navigate('/dashboard/task');
    } catch (err) {
      console.error('Join VIP failed:', err);
      toast({ title: 'Activation Failed', description: 'Could not activate VIP. Please try again.', variant: 'destructive' });
    } finally {
      setProcessingJoin(false);
    }
  };

  const balance = (userRecord?.personal_wallet_balance || 0);

  const getVipStripeClasses = (index: number) => {
    const palettes = [
      'from-gray-50 to-gray-100',
      'from-emerald-50 to-lime-100',
      'from-cyan-50 to-teal-100',
      'from-sky-50 to-blue-100',
      'from-fuchsia-50 to-pink-100',
      'from-green-100 to-green-300',
      'from-teal-100 to-emerald-300',
      'from-blue-100 to-indigo-300',
      'from-violet-200 to-fuchsia-300',
      'from-rose-300 to-rose-600',
      'from-stone-700 to-stone-900',
    ];
    return `bg-gradient-to-r ${palettes[index % palettes.length]}`;
  };

  // Map plan name to per-video rate for daily earning calculation
  const getVideoRateForPlan = (planName: string): number => {
    const rates: Record<string, number> = {
      VIP1: 30,
      VIP2: 50,
      VIP3: 70,
      VIP4: 80,
      VIP5: 100,
      VIP6: 115,
      VIP7: 160,
      VIP8: 220,
      VIP9: 260,
      VIP10: 440,
    };
    const key = (planName || '').toUpperCase().replace(/\s+/g, '');
    return rates[key] ?? 0;
  };

  const handleJoinPlan = async (plan: MembershipPlan) => {
    if (processingJoin) return;
    try {
      setProcessingJoin(true);
      setProcessingPlanId(plan.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine if this is an upgrade (active plan exists and target price is higher)
      const isUpgrade = !!activePlan && plan.id !== activePlan.id && (plan.price > (activePlan.price || 0));

      // Require sufficient personal wallet for the new plan price
      if (plan.price > balance) {
        toast({ title: 'Insufficient Balance', description: 'Please add funds to your personal wallet before upgrading/joining.', variant: 'destructive' });
        return;
      }

      // Resolve internal user id for user_plans relation
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, income_wallet_balance, personal_wallet_balance, vip_level')
        .eq('auth_user_id', user.id)
        .single();
      const internalUserId = dbUser?.id || user.id;

      // Start transaction
      const { error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) throw transactionError;

      try {
        // Deduct new plan price from personal wallet
        const newPersonal = Math.max(0, balance - plan.price);
        const { error: walletUpdateErr } = await supabase
          .from('users')
          .update({ personal_wallet_balance: newPersonal })
          .eq('id', internalUserId);
        if (walletUpdateErr) throw walletUpdateErr;

        // Create new active subscription
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + plan.duration_days);

        const { error: planErr } = await supabase.from('user_plans').insert({
          user_id: internalUserId,
          plan_id: plan.id,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
          is_active: true
        });
        if (planErr) throw planErr;

        // Update user's vip_level and daily_task_limit
        const { error: profErr2 } = await supabase
          .from('users')
          .update({ 
            vip_level: plan.name,
            daily_task_limit: plan.daily_video_limit
          })
          .eq('id', internalUserId);
        if (profErr2) throw profErr2;

        // Record upgrade event if applicable
        if (isUpgrade) {
          await supabase.from('vip_upgrades').insert({
            user_id: internalUserId,
            from_level: (dbUser?.vip_level as any) || null,
            to_level: plan.name as any,
            upgrade_amount: plan.price,
            status: 'completed',
            upgrade_date: new Date().toISOString()
          });
        }

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: internalUserId,
          transaction_type: 'vip_activation',
          amount: plan.price,
          description: `${isUpgrade ? 'Upgraded to' : 'Activated'} ${plan.name} plan`,
          status: 'completed'
        });

        // If upgrading, deactivate old plan and refund its price to income wallet
        if (isUpgrade) {
          await supabase
            .from('user_plans')
            .update({ is_active: false })
            .eq('user_id', internalUserId)
            .eq('is_active', true)
            .neq('plan_id', plan.id);

          const previousPrice = activePlan?.price || 0;
          const { data: freshUser } = await supabase
            .from('users')
            .select('income_wallet_balance')
            .eq('id', internalUserId)
            .single();
          const newIncome = (freshUser?.income_wallet_balance || 0) + previousPrice;
          const { error: incomeUpdateErr } = await supabase
            .from('users')
            .update({ income_wallet_balance: newIncome })
            .eq('id', internalUserId);
          if (incomeUpdateErr) throw incomeUpdateErr;
        }

        // Commit transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) throw commitError;

        // Update local state
        setUserRecord(prev => prev ? { ...prev, personal_wallet_balance: newPersonal } : prev);

        // Track VIP upgrade activity
        if (isUpgrade) {
          await trackVipUpgrade(activePlan?.name || 'None', plan.name, plan.price);
        } else {
          await trackVipUpgrade('None', plan.name, plan.price);
        }

        toast({ 
          title: isUpgrade ? 'Plan Upgraded' : 'VIP Activated', 
          description: isUpgrade ? `Upgraded to ${plan.name}. Daily limit: ${plan.daily_video_limit} tasks` : `Welcome to ${plan.name}! Daily limit: ${plan.daily_video_limit} tasks` 
        });
        navigate('/dashboard/task');
      } catch (error) {
        // Rollback transaction
        await supabase.rpc('rollback_transaction');
        throw error;
      }
    } catch (err) {
      console.error('Join plan failed:', err);
      toast({ title: 'Activation Failed', description: 'Could not activate VIP. Please try again.', variant: 'destructive' });
    } finally {
      setProcessingJoin(false);
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your account today.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {userRecord?.personal_wallet_balance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Available in your wallet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyLimit}</div>
            <p className="text-xs text-muted-foreground">
              Remaining tasks ({remainingTasks}/{dailyLimit})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRecord?.referral_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {userRecord?.total_earnings?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>
      </div>



      {/* VIP Member Activation Section */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Crown className="h-6 w-6 text-yellow-600" />
            VIP Member Activation
          </CardTitle>
          <CardDescription className="text-yellow-700">
            Unlock exclusive benefits and higher rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVip ? (
            <LoadingSpinner 
              size="sm" 
              text="Loading VIP options..." 
              className="text-yellow-700 py-8"
            />
          ) : (
            <>
              <div className="space-y-3">
                {plans.map((plan, index) => {
                  const locked = plan.price > balance;
                  const rate = getVideoRateForPlan(plan.name);
                  const daily = (plan.daily_video_limit || 0) * rate;
                  return (
                    <div key={plan.id} className={`rounded-xl border border-yellow-200 p-4 md:p-6 ${getVipStripeClasses(index)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg md:text-xl font-semibold text-yellow-900">{plan.name}</div>
                          <div className="text-xs md:text-sm text-yellow-800 mt-1">Price: Rs. {plan.price.toLocaleString()}</div>
                          <div className="text-xs md:text-sm text-yellow-800">Daily tasks: {plan.daily_video_limit}</div>
                          <div className="text-xs md:text-sm text-yellow-800">Rate per video: Rs. {rate.toLocaleString()}</div>
                          <div className="text-xs md:text-sm text-yellow-900 font-semibold mt-1">Daily earning: Rs. {daily.toLocaleString()}</div>
                          <div className="text-[11px] md:text-xs text-yellow-800/90">Duration: {plan.duration_days} days</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {locked ? (
                            <Badge className="bg-gray-100 text-gray-600">Locked</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          )}
                          <Button
                            size="sm"
                            disabled={locked || processingPlanId === plan.id}
                            onClick={() => handleJoinPlan(plan)}
                            className={`${locked ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
                          >
                            {processingPlanId === plan.id ? 'Joining...' : 'Join now'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-right text-yellow-800">
                Personal Wallet: Rs. {balance.toFixed(2)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Company Activity & Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Company Activity & Announcements
          </CardTitle>
          <CardDescription>
            Latest company achievements and important announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-blue-900">Company Milestone Achieved!</h4>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">Achievement</Badge>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  We've reached 10,000 active users! Thank you to all our members for making this possible.
                </p>
                <p className="text-xs text-blue-500">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-green-900">Special Bonus Event</h4>
                  <Badge className="bg-green-100 text-green-800 text-xs">Event</Badge>
                </div>
                <p className="text-sm text-green-700 mb-2">
                  Double rewards weekend! Complete tasks this weekend to earn 2x rewards. Valid until Sunday 11:59 PM.
                </p>
                <p className="text-xs text-green-500">1 day ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-purple-900">New VIP Benefits</h4>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Update</Badge>
                </div>
                <p className="text-sm text-purple-700 mb-2">
                  VIP members now get exclusive access to premium tasks and priority support. Upgrade now to unlock these benefits!
                </p>
                <p className="text-xs text-purple-500">3 days ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-orange-900">Community Challenge</h4>
                  <Badge className="bg-orange-100 text-orange-800 text-xs">Challenge</Badge>
                </div>
                <p className="text-sm text-orange-700 mb-2">
                  Invite 5 friends this week and earn a $50 bonus! Top referrer gets an additional $100 reward.
                </p>
                <p className="text-xs text-orange-500">1 week ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
