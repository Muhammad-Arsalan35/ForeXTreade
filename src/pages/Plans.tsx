import { useState, useEffect } from "react";
import { Crown, Check, Star, Users, DollarSign, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface MembershipPlan {
  id: string;
  name: string;
  daily_video_limit: number;
  price: number;
  video_rate: number;
  duration_days: number;
  is_active: boolean;
}

interface VideoEarningRate {
  id: string;
  vip_level: string;
  rate_per_video: number;
}

interface UserProfile {
  id: string;
  membership_type: string;
  total_earnings: number;
  personal_wallet_balance: number;
}

export const Plans = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [videoRates, setVideoRates] = useState<VideoEarningRate[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
    
    // Check if plan was pre-selected from videos page
    if (location.state?.selectedPlan) {
      setSelectedPlan(location.state.selectedPlan);
    }
  }, [location.state]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch user profile from users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Set default profile if user doesn't exist
        setUserProfile({ id: user.id, membership_type: 'free', total_earnings: 0, personal_wallet_balance: 0 });
      } else {
        setUserProfile(profileData);
      }

      // Fetch membership plans from the database
      const { data: plansData, error: plansError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch video earning rates from the database
      const { data: ratesData, error: ratesError } = await supabase
        .from('video_earning_rates')
        .select('*')
        .order('rate_per_video', { ascending: true });

      if (ratesError) {
        console.error('Error fetching video rates:', ratesError);
      } else {
        setVideoRates(ratesData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load plans. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !userProfile) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan not found');

      // Check if user has sufficient balance in personal wallet
      if (userProfile.personal_wallet_balance < plan.price) {
        toast({
          title: "Insufficient Balance",
          description: `You need Rs. ${plan.price.toFixed(2)} in your personal wallet to purchase this plan. Current balance: Rs. ${userProfile.personal_wallet_balance.toFixed(2)}`,
          variant: "destructive"
        });
        return;
      }

      // Deduct amount from personal wallet
      const newBalance = userProfile.personal_wallet_balance - plan.price;
      
      const { error: walletError } = await supabase
        .from('users')
        .update({ personal_wallet_balance: newBalance })
        .eq('auth_user_id', user.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'purchase',
          amount: plan.price,
          description: `VIP Plan Purchase - ${plan.name}`,
          status: 'completed'
        });

      if (transactionError) throw transactionError;
      
      // Create user plan subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const { error: planError } = await supabase
        .from('user_plans')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true
        });

      if (planError) throw planError;

      // Update user membership type in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ membership_type: 'vip' })
        .eq('auth_user_id', user.id);

      if (profileError) throw profileError;

      // Update local state
      setUserProfile(prev => prev ? { ...prev, personal_wallet_balance: newBalance, membership_type: 'vip' } : null);

      toast({
        title: "Plan Purchased!",
        description: `Welcome to ${plan.name}! Rs. ${plan.price.toFixed(2)} has been deducted from your personal wallet.`,
      });

      // Navigate to videos page
      navigate('/dashboard/task');

    } catch (error) {
      console.error('Error purchasing plan:', error);
      toast({
        title: "Purchase Failed",
        description: "Failed to purchase plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getVideoRate = (planName: string) => {
    const rate = videoRates.find(r => r.vip_level === planName);
    return rate ? rate.rate_per_video : 0;
  };

  const getDailyEarningPotential = (plan: MembershipPlan) => {
    const rate = getVideoRate(plan.name);
    return rate * plan.daily_video_limit;
  };

  const getPlanFeatures = (plan: MembershipPlan) => {
    const rate = getVideoRate(plan.name);
    const dailyEarning = getDailyEarningPotential(plan);
    
    const features = [
      `${plan.daily_video_limit} videos per day`,
      `Rs. ${rate} per video`,
      `Up to Rs. ${dailyEarning.toFixed(0)} daily earning`,
      `${plan.duration_days} days access`,
      "Priority support",
      "Exclusive content access"
    ];

    if (plan.price >= 100000) {
      features.push("Team leader bonuses");
      features.push("Advanced analytics");
    }

    if (plan.price >= 500000) {
      features.push("VIP customer support");
      features.push("Early access to new features");
    }

    return features;
  };

  const getPlanBadge = (plan: MembershipPlan) => {
    if (plan.price >= 1000000) {
      return <Badge className="bg-gradient-golden text-primary-foreground">Ultimate</Badge>;
    } else if (plan.price >= 500000) {
      return <Badge className="bg-purple-500 text-white">Elite</Badge>;
    } else if (plan.price >= 100000) {
      return <Badge className="bg-blue-500 text-white">Premium</Badge>;
    } else if (plan.price >= 50000) {
      return <Badge className="bg-green-500 text-white">Advanced</Badge>;
    } else {
      return <Badge variant="outline">Basic</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-primary-foreground">Loading plans...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-golden rounded-full mx-auto mb-6 flex items-center justify-center">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">FXTrade VIP Plans</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            EARN WITH TASK - Upgrade to VIP and unlock unlimited earning potential with more daily videos and exclusive benefits
          </p>
        </div>

        {/* Current Status */}
        {userProfile && (
          <Card className="bg-primary/10 border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary-foreground">
                    Current Status: {userProfile.membership_type === 'vip' ? 'VIP Member' : 'Free Member'}
                  </h3>
                  <p className="text-primary-foreground/70">
                    Total Earnings: Rs. {userProfile.total_earnings.toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-primary-foreground/70" />
                    <p className="text-primary-foreground/70">
                      Personal Wallet: Rs. {userProfile.personal_wallet_balance.toLocaleString()}
                    </p>
                  </div>
                </div>
                {userProfile.membership_type === 'vip' && (
                  <Badge className="bg-gradient-golden text-primary-foreground">
                    <Star className="w-4 h-4 mr-1" />
                    VIP Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 ${
                selectedPlan === plan.id 
                  ? 'bg-gradient-golden/20 border-golden shadow-golden scale-105' 
                  : 'bg-primary/10 border-primary/20 hover:shadow-golden hover:scale-102'
              }`}
            >
              {plan.name === 'VIP5' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-golden text-primary-foreground px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  {getPlanBadge(plan)}
                </div>
                <CardTitle className="text-2xl text-primary-foreground">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-primary-foreground">
                  Rs. {plan.price.toLocaleString()}
                  <span className="text-lg font-normal text-primary-foreground/70">/120 days</span>
                </div>
                <div className="mt-2 p-2 bg-gradient-golden/20 rounded-lg">
                  <div className="text-sm text-primary-foreground/70">Daily Earning Potential</div>
                  <div className="text-xl font-bold text-golden">
                    Rs. {getDailyEarningPotential(plan).toLocaleString()}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {getPlanFeatures(plan).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-primary-foreground/90">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => handlePlanSelection(plan.id)}
                    variant={selectedPlan === plan.id ? "default" : "outline"}
                    className={`w-full ${
                      selectedPlan === plan.id 
                        ? 'bg-gradient-golden hover:shadow-golden' 
                        : 'border-primary/20 text-primary-foreground hover:bg-primary/20'
                    }`}
                  >
                    {selectedPlan === plan.id ? "Selected" : "Choose Plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Purchase Section */}
        {selectedPlan && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-primary-foreground">Ready to Upgrade?</h3>
                  <p className="text-primary-foreground/70">
                    Selected Plan: {plans.find(p => p.id === selectedPlan)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-foreground">
                    Rs. {plans.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-primary-foreground/70">120 days access</div>
                </div>
              </div>

              {/* Wallet Balance Check */}
              {userProfile && (
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-primary-foreground/70" />
                      <span className="text-sm text-primary-foreground/70">Personal Wallet Balance:</span>
                    </div>
                    <span className="font-semibold text-primary-foreground">
                      Rs. {userProfile.personal_wallet_balance.toLocaleString()}
                    </span>
                  </div>
                  {userProfile.personal_wallet_balance < (plans.find(p => p.id === selectedPlan)?.price || 0) && (
                    <div className="mt-2 text-sm text-red-500">
                      ⚠️ Insufficient balance. Please deposit Rs. {((plans.find(p => p.id === selectedPlan)?.price || 0) - userProfile.personal_wallet_balance).toLocaleString()} more to purchase this plan.
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-primary-foreground/70">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Instant activation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-primary-foreground/70">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Secure payment</span>
                  </div>
                </div>
                
                <Button
                  onClick={handlePurchase}
                  disabled={processing || (userProfile && userProfile.personal_wallet_balance < (plans.find(p => p.id === selectedPlan)?.price || 0))}
                  className="bg-gradient-golden hover:shadow-golden px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : 
                   userProfile && userProfile.personal_wallet_balance < (plans.find(p => p.id === selectedPlan)?.price || 0) ? "Insufficient Balance" : "Purchase Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-primary-foreground text-center mb-8">
            Why Choose VIP?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-primary/10 border-primary/20 text-center">
              <CardContent className="p-6">
                <Users className="w-12 h-12 text-golden mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">More Videos</h3>
                <p className="text-primary-foreground/70">
                  Watch up to 100 videos per day and maximize your earnings potential
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/10 border-primary/20 text-center">
              <CardContent className="p-6">
                <DollarSign className="w-12 h-12 text-golden mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">Higher Earnings</h3>
                <p className="text-primary-foreground/70">
                  Earn more money with exclusive high-paying videos and bonuses
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/10 border-primary/20 text-center">
              <CardContent className="p-6">
                <Crown className="w-12 h-12 text-golden mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">VIP Benefits</h3>
                <p className="text-primary-foreground/70">
                  Get priority support, exclusive content, and team leader bonuses
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};


