import { useState, useEffect } from "react";
import { Crown, Check, Star, Users, DollarSign, Clock } from "lucide-react";
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
  duration_days: number;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  membership_type: string;
  total_earnings: number;
}

export const Plans = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch user profile from users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, vip_level, total_earnings')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Set default profile if user doesn't exist
        setUserProfile({ id: user.id, vip_level: 'VIP1', total_earnings: 0 });
      } else {
        setUserProfile(profileData);
      }

      // Set default membership plans since the table doesn't exist
      const plansData = [
        { id: 1, name: 'VIP1', price: 0, features: ['Basic tasks', 'Standard rewards'] },
        { id: 2, name: 'VIP2', price: 100, features: ['More tasks', 'Higher rewards'] },
        { id: 3, name: 'VIP3', price: 500, features: ['Premium tasks', 'Maximum rewards'] }
      ];
      setPlans(plansData || []);

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

      // For now, we'll simulate a successful purchase
      // In a real implementation, you'd integrate with a payment gateway
      
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

      // Update user VIP level in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ vip_level: 'VIP1' })
        .eq('auth_user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Plan Purchased!",
        description: `Welcome to ${plan.name}! You can now watch up to ${plan.daily_video_limit} videos per day.`,
      });

      // Navigate to videos page
      navigate('/videos');

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

  const getPlanFeatures = (plan: MembershipPlan) => {
    const features = [
      `${plan.daily_video_limit} videos per day`,
      `${plan.duration_days} days access`,
      "Higher earning potential",
      "Priority support",
      "Exclusive content access"
    ];

    if (plan.price >= 1000) {
      features.push("Team leader bonuses");
      features.push("Advanced analytics");
    }

    if (plan.price >= 2000) {
      features.push("VIP customer support");
      features.push("Early access to new features");
    }

    return features;
  };

  const getPlanBadge = (plan: MembershipPlan) => {
    if (plan.price >= 2000) {
      return <Badge className="bg-gradient-golden text-primary-foreground">Ultimate</Badge>;
    } else if (plan.price >= 1000) {
      return <Badge className="bg-blue-500 text-white">Premium</Badge>;
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
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">Choose Your VIP Plan</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Upgrade to VIP and unlock unlimited earning potential with more daily videos and exclusive benefits
          </p>
        </div>

        {/* Current Status */}
        {userProfile && (
          <Card className="bg-primary/10 border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary-foreground">
                    Current Status: {userProfile.membership_type === 'vip' ? 'VIP Member' : 'Free Member'}
                  </h3>
                  <p className="text-primary-foreground/70">
                    Total Earnings: Rs. {userProfile.total_earnings.toFixed(2)}
                  </p>
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
              {plan.price >= 2000 && (
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
                  Rs. {plan.price.toFixed(2)}
                  <span className="text-lg font-normal text-primary-foreground/70">/month</span>
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
                    Rs. {plans.find(p => p.id === selectedPlan)?.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-primary-foreground/70">One-time payment</div>
                </div>
              </div>
              
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
                  disabled={processing}
                  className="bg-gradient-golden hover:shadow-golden px-8"
                >
                  {processing ? "Processing..." : "Purchase Now"}
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


