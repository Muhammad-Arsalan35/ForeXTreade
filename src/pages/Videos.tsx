import { useState, useEffect } from "react";
import { Play, Clock, DollarSign, Users, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  reward_per_watch: number;
  category: string;
}

interface UserProfile {
  id: string;
  membership_level: string;
  membership_type: string;
  videos_watched_today: number;
  total_video_earnings: number;
  is_trial_active: boolean;
  trial_end_date: string;
}

interface MembershipPlan {
  id: string;
  name: string;
  daily_video_limit: number;
  price: number;
  duration_days: number;
}

export const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchingVideo, setWatchingVideo] = useState<string | null>(null);
  const [currentVideoLimit, setCurrentVideoLimit] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

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
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Set default profile if user doesn't exist
        setUserProfile({ id: user.id, vip_level: 'VIP1', daily_video_limit: 5 });
      } else {
        setUserProfile(profileData);
      }

      // Set default videos since videos table might not exist
      setVideos([
        { id: 1, title: 'Sample Video 1', description: 'Watch this video to earn rewards', duration: 30, reward: 50 },
        { id: 2, title: 'Sample Video 2', description: 'Another great video for earning', duration: 45, reward: 75 }
      ]);

      // Set default membership plans since the table doesn't exist
      const plansData = [
        { id: 1, name: 'VIP1', price: 0, daily_video_limit: 5 },
        { id: 2, name: 'VIP2', price: 100, daily_video_limit: 10 },
        { id: 3, name: 'VIP3', price: 500, daily_video_limit: 20 }
      ];

      setMembershipPlans(plansData || []);

      // Get current video limit
      const { data: limitData, error: limitError } = await supabase
        .rpc('get_user_video_limit', { user_uuid: user.id });

      if (limitError) throw limitError;
      setCurrentVideoLimit(limitData || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWatchVideo = async (videoId: string) => {
    if (!userProfile) return;

    // Check if user can watch more videos
    if (userProfile.videos_watched_today >= currentVideoLimit) {
      if (userProfile.membership_type === 'free') {
        setShowUpgradeModal(true);
      } else {
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily video limit. Come back tomorrow!",
          variant: "destructive"
        });
      }
      return;
    }

    setWatchingVideo(videoId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Process video watch
      const { data: rewardData, error: watchError } = await supabase
        .rpc('process_video_watch', {
          user_uuid: user.id,
          video_uuid: videoId
        });

      if (watchError) throw watchError;

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        videos_watched_today: prev.videos_watched_today + 1,
        total_video_earnings: prev.total_video_earnings + rewardData
      } : null);

      toast({
        title: "Video Watched!",
        description: `You earned Rs. ${rewardData.toFixed(2)} for watching this video.`,
      });

      // Refresh data
      fetchData();

    } catch (error) {
      console.error('Error watching video:', error);
      toast({
        title: "Error",
        description: "Failed to process video watch. Please try again.",
        variant: "destructive"
      });
    } finally {
      setWatchingVideo(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMembershipBadge = () => {
    if (!userProfile) return null;

    if (userProfile.membership_type === 'vip') {
      return <Badge className="bg-gradient-golden text-primary-foreground">VIP Member</Badge>;
    }

    if (userProfile.is_trial_active && new Date(userProfile.trial_end_date) >= new Date()) {
      return <Badge variant="secondary">Free Trial</Badge>;
    }

    return <Badge variant="outline">Free Member</Badge>;
  };

  const getProgressPercentage = () => {
    if (!userProfile || currentVideoLimit === 0) return 0;
    return (userProfile.videos_watched_today / currentVideoLimit) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-primary-foreground">Loading videos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground mb-2">Watch & Earn</h1>
              <p className="text-primary-foreground/80">Watch videos to earn money daily</p>
            </div>
            {getMembershipBadge()}
          </div>

          {/* User Stats */}
          {userProfile && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-foreground">
                      {userProfile.videos_watched_today}/{currentVideoLimit}
                    </div>
                    <div className="text-sm text-primary-foreground/70">Videos Today</div>
                    <Progress value={getProgressPercentage()} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-foreground">
                      Rs. {userProfile.total_video_earnings.toFixed(2)}
                    </div>
                    <div className="text-sm text-primary-foreground/70">Total Earnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-foreground">
                      {userProfile.membership_level.toUpperCase()}
                    </div>
                    <div className="text-sm text-primary-foreground/70">Membership Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-foreground">
                      {userProfile.is_trial_active ? 'Active' : 'Expired'}
                    </div>
                    <div className="text-sm text-primary-foreground/70">Trial Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trial Warning */}
        {userProfile && userProfile.membership_type === 'free' && !userProfile.is_trial_active && (
          <Card className="bg-destructive/10 border-destructive/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">Trial Expired</h3>
                  <p className="text-sm text-destructive/80">
                    Your free trial has expired. Upgrade to a VIP plan to continue watching videos and earning money.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="ml-auto bg-destructive hover:bg-destructive/90"
                >
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="bg-primary/10 border-primary/20 hover:shadow-golden transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {video.category}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-primary-foreground/70">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                </div>
                <CardTitle className="text-lg text-primary-foreground">{video.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-primary/20 rounded-lg flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Play className="w-12 h-12 text-primary-foreground/50" />
                  )}
                </div>
                
                <p className="text-sm text-primary-foreground/80 line-clamp-2">
                  {video.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-primary-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">Rs. {video.reward_per_watch.toFixed(2)}</span>
                  </div>
                  
                  <Button
                    onClick={() => handleWatchVideo(video.id)}
                    disabled={
                      watchingVideo === video.id ||
                      (userProfile && userProfile.videos_watched_today >= currentVideoLimit) ||
                      (userProfile && userProfile.membership_type === 'free' && !userProfile.is_trial_active)
                    }
                    className="bg-gradient-golden hover:shadow-golden"
                  >
                    {watchingVideo === video.id ? (
                      "Processing..."
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Watch & Earn
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-primary/95 border-primary/20">
              <CardHeader>
                <CardTitle className="text-center text-primary-foreground">
                  <Crown className="w-8 h-8 mx-auto mb-2 text-golden" />
                  Upgrade to VIP
                </CardTitle>
                <p className="text-center text-primary-foreground/80">
                  Choose a plan to unlock unlimited video watching and earn more money!
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {membershipPlans.map((plan) => (
                  <div key={plan.id} className="border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-primary-foreground">{plan.name}</h3>
                      <Badge className="bg-gradient-golden text-primary-foreground">
                        Rs. {plan.price.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-sm text-primary-foreground/80 mb-3">
                      <div>• {plan.daily_video_limit} videos per day</div>
                      <div>• {plan.duration_days} days duration</div>
                      <div>• Higher earning potential</div>
                    </div>
                    <Button 
                      onClick={() => navigate('/plans', { state: { selectedPlan: plan.id } })}
                      className="w-full bg-gradient-golden hover:shadow-golden"
                    >
                      Choose Plan
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full"
                >
                  Maybe Later
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};


