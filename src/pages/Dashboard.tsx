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

type MembershipPlan = {
  id: string;
  name: string;
  daily_video_limit: number;
  price: number;
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
};

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfilesRow | null>(null);
  const [userRecord, setUserRecord] = useState<UsersTableRow | null>(null);
  const [loadingVip, setLoadingVip] = useState<boolean>(true);
  const [processingJoin, setProcessingJoin] = useState<boolean>(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan | null>(null);
  const [currentVideoLimit, setCurrentVideoLimit] = useState<number>(0);
  const [averageRewardPerWatch, setAverageRewardPerWatch] = useState<number>(0);

  useEffect(() => {
    const fetchVipData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profileData, error: profileError }, { data: usersData, error: usersError }, { data: plansData, error: plansError }] = await Promise.all([
          supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('users').select('id, auth_user_id, personal_wallet_balance').eq('auth_user_id', user.id).single(),
          supabase.from('membership_plans').select('*').eq('is_active', true).order('price', { ascending: true })
        ]);

        if (profileError) throw profileError;
        if (usersError) throw usersError;
        if (plansError) throw plansError;

        setUserProfile(profileData as unknown as UserProfilesRow);
        setUserRecord(usersData as unknown as UsersTableRow);
        setPlans((plansData || []) as MembershipPlan[]);

        // Determine user's active plan if any
        const { data: userPlanRow, error: userPlanErr } = await supabase
          .from('user_plans')
          .select('plan_id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();
        if (!userPlanErr && userPlanRow?.plan_id) {
          const plan = (plansData || []).find((p: any) => p.id === userPlanRow.plan_id) || null;
          setActivePlan(plan as MembershipPlan | null);
        } else {
          setActivePlan(null);
        }

        // Fetch current video limit via RPC if available
        try {
          const { data: limitData, error: limitError } = await supabase.rpc('get_user_video_limit', { user_uuid: user.id });
          if (!limitError && typeof limitData === 'number') {
            setCurrentVideoLimit(limitData);
          }
        } catch (e) {
          // ignore if RPC not present
        }

        // Compute average reward per active video to estimate daily earnings
        try {
          const { data: videosData, error: videosError } = await supabase
            .from('videos')
            .select('reward_per_watch')
            .eq('is_active', true)
            .limit(1000);
          if (!videosError) {
            const rewards = (videosData || []).map((v: any) => Number(v.reward_per_watch)).filter((n: number) => !isNaN(n));
            const avg = rewards.length ? (rewards.reduce((a: number, b: number) => a + b, 0) / rewards.length) : 0;
            setAverageRewardPerWatch(avg);
          }
        } catch (e) {
          // ignore if table not available
        }
      } catch (error) {
        console.error('Error loading VIP data:', error);
      } finally {
        setLoadingVip(false);
      }
    };
    fetchVipData();
  }, []);

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

      // Update membership to VIP
      const { error: profErr } = await supabase
        .from('user_profiles')
        .update({ membership_type: 'vip' })
        .eq('user_id', user.id);
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
      navigate('/videos');
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

  const getPlanForLevel = (level: number): MembershipPlan | null => {
    if (!plans.length) return null;
    // Try exact name match like "VIP1", fallback to contains
    const exact = plans.find(p => p.name?.toLowerCase() === `vip${level}`.toLowerCase());
    if (exact) return exact;
    const contains = plans.find(p => (p.name || '').toLowerCase().includes(`vip ${level}`) || (p.name || '').toLowerCase().includes(`vip${level}`));
    return contains || null;
  };

  // Fixed VIP table values as per provided specification
  type VipSpec = { level: number; name: string; deposit: number; tasks: number; unitPrice: number };
  const vipSpecs: VipSpec[] = [
    { level: 0, name: 'Intern', deposit: 0, tasks: 5, unitPrice: 50 },
    { level: 1, name: 'VIP1', deposit: 9000, tasks: 5, unitPrice: 60 },
    { level: 2, name: 'VIP2', deposit: 24000, tasks: 10, unitPrice: 80 },
    { level: 3, name: 'VIP3', deposit: 70000, tasks: 16, unitPrice: 156 },
    { level: 4, name: 'VIP4', deposit: 185000, tasks: 31, unitPrice: 215 },
    { level: 5, name: 'VIP5', deposit: 500000, tasks: 50, unitPrice: 390 },
    { level: 6, name: 'VIP6', deposit: 1330000, tasks: 75, unitPrice: 668 },
    { level: 7, name: 'VIP7', deposit: 3000000, tasks: 150, unitPrice: 830 },
    { level: 8, name: 'VIP8', deposit: 6300000, tasks: 220, unitPrice: 1250 },
    { level: 9, name: 'VIP9', deposit: 12000000, tasks: 300, unitPrice: 1800 },
    { level: 10, name: 'VIP10', deposit: 23000000, tasks: 380, unitPrice: 2720 },
  ];

  const calcDaily = (tasks: number, unit: number) => tasks * unit;
  const calcMonthly = (daily: number) => daily * 30;
  const calcAnnual = (monthly: number) => monthly * 12;

  const handleJoinPlan = async (plan: MembershipPlan) => {
    if (processingJoin) return;
    if (plan.price > balance) {
      toast({ title: 'Insufficient Balance', description: 'Add funds to your personal wallet to join this plan.', variant: 'destructive' });
      return;
    }
    try {
      setProcessingJoin(true);
      setProcessingPlanId(plan.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + plan.duration_days);

      const { error: planErr } = await supabase.from('user_plans').insert({
        user_id: user.id,
        plan_id: plan.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        is_active: true
      });
      if (planErr) throw planErr;

      const { error: profErr } = await supabase
        .from('user_profiles')
        .update({ membership_type: 'vip' })
        .eq('user_id', user.id);
      if (profErr) throw profErr;

      if (userRecord?.id) {
        const newBalance = Math.max(0, balance - plan.price);
        const { error: userUpdateErr } = await supabase
          .from('users')
          .update({ personal_wallet_balance: newBalance })
          .eq('id', userRecord.id);
        if (userUpdateErr) throw userUpdateErr;
        setUserRecord(prev => prev ? { ...prev, personal_wallet_balance: newBalance } : prev);
      }

      toast({ title: 'VIP Activated', description: `Welcome to ${plan.name}!` });
      navigate('/videos');
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
            <div className="text-2xl font-bold">$1,234.56</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 tasks due today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              +2 new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$89.40</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
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
            <div className="text-yellow-700">Loading VIP options...</div>
          ) : userProfile?.membership_type === 'vip' ? (
            <div className="flex flex-col items-center gap-3">
              <Badge className="bg-green-100 text-green-800">VIP Active{activePlan ? ` • ${activePlan.name}` : ''}</Badge>
              <div className="text-yellow-800 text-sm">
                Daily Video Limit: {currentVideoLimit || (activePlan?.daily_video_limit ?? '—')}
              </div>
              <div className="text-yellow-900 font-semibold">
                Estimated Daily Earnings: Rs. {((currentVideoLimit || activePlan?.daily_video_limit || 0) as number * averageRewardPerWatch).toFixed(2)}
              </div>
              <Button onClick={() => navigate('/videos')} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Zap className="mr-2 h-4 w-4" />
                Go to Videos
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {/* Intern row */}
                <div className={`rounded-xl border border-yellow-200 p-4 md:p-5 ${getVipStripeClasses(0)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-yellow-700">JOB</div>
                      <div className="text-xl font-semibold text-yellow-900">Intern</div>
                      <div className="text-xs text-yellow-700/80 mt-1">Daily Tasks: 5</div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700">Free</Badge>
                  </div>
                </div>

                {vipSpecs.filter(s => s.level > 0).map((spec) => {
                  const level = spec.level;
                  const plan = getPlanForLevel(level);
                  const locked = !plan || (plan.price > balance);
                  const daily = calcDaily(spec.tasks, spec.unitPrice);
                  const monthly = calcMonthly(daily);
                  const annual = calcAnnual(monthly);
                  const planId = plan ? plan.id : `vip-${level}`;
                  return (
                    <div key={planId} className={`rounded-xl border border-yellow-200 p-4 md:p-6 ${getVipStripeClasses(level)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg md:text-xl font-semibold text-yellow-900">{spec.name}</div>
                          <div className="text-xs md:text-sm text-yellow-800 mt-1">Deposit: Rs. {spec.deposit.toLocaleString()}</div>
                          <div className="text-xs md:text-sm text-yellow-800">Number of tasks: {spec.tasks}</div>
                          <div className="text-xs md:text-sm text-yellow-800">Unit price: Rs. {spec.unitPrice.toLocaleString()}</div>
                          <div className="text-xs md:text-sm text-yellow-900 font-semibold mt-1">Daily wages: Rs. {daily.toLocaleString()}</div>
                          <div className="text-[11px] md:text-xs text-yellow-800/90">Monthly: Rs. {monthly.toLocaleString()} • Annual: Rs. {annual.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {locked ? (
                            <Badge className="bg-gray-100 text-gray-600">Locked</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          )}
                          <Button
                            size="sm"
                            disabled={locked || (!!plan && processingPlanId === plan.id)}
                            onClick={() => plan && handleJoinPlan(plan)}
                            className={`${locked ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
                          >
                            {plan && processingPlanId === plan.id ? 'Joining...' : 'Join now'}
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
