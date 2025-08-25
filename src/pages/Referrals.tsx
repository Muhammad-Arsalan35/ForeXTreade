import { useState, useEffect } from "react";
import { Users, Share2, Copy, DollarSign, TrendingUp, UserPlus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  referral_code: string;
  membership_level: string;
  total_referral_earnings: number;
  total_team_earnings: number;
  total_earnings: number;
}

interface ReferralCommission {
  id: string;
  referred_user_id: string;
  commission_amount: number;
  commission_type: string;
  status: string;
  created_at: string;
  referred_user: {
    full_name: string;
    username: string;
    membership_type: string;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
  username: string;
  membership_level: string;
  membership_type: string;
  total_earnings: number;
  created_at: string;
}

export const Referrals = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [referralCommissions, setReferralCommissions] = useState<ReferralCommission[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Fetch referral commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select(`
          *,
          referred_user:user_profiles!referral_commissions_referred_user_id_fkey(
            full_name,
            username,
            membership_type
          )
        `)
        .eq('referrer_id', profileData.id)
        .order('created_at', { ascending: false });

      if (commissionsError) throw commissionsError;
      setReferralCommissions(commissionsData || []);

      // Fetch team members (B-level members under this user)
      const { data: teamData, error: teamError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('team_leader_id', profileData.id)
        .order('created_at', { ascending: false });

      if (teamError) throw teamError;
      setTeamMembers(teamData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!userProfile) return;

    const referralLink = `${window.location.origin}/signup?ref=${userProfile.referral_code}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy referral link",
        variant: "destructive"
      });
    }
  };

  const shareReferralLink = async () => {
    if (!userProfile) return;

    const referralLink = `${window.location.origin}/signup?ref=${userProfile.referral_code}`;
    const shareText = `Join TaskMaster and start earning money! Use my referral code: ${userProfile.referral_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join TaskMaster',
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying
      copyReferralLink();
    }
  };

  const getMembershipLevelColor = (level: string) => {
    switch (level) {
      case 'b_level':
        return 'bg-blue-500 text-white';
      case 'a_level':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getMembershipTypeColor = (type: string) => {
    return type === 'vip' ? 'bg-gradient-golden text-primary-foreground' : 'bg-gray-500 text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-primary-foreground">Loading referral data...</div>
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
              <h1 className="text-3xl font-bold text-primary-foreground mb-2">Referral Program</h1>
              <p className="text-primary-foreground/80">Earn money by inviting friends and building your team</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={shareReferralLink}
                className="bg-gradient-golden hover:shadow-golden"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="border-primary/20 text-primary-foreground hover:bg-primary/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Referral Link Card */}
          {userProfile && (
            <Card className="bg-primary/10 border-primary/20 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-foreground mb-2">Your Referral Code</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-lg px-4 py-2 bg-gradient-golden text-primary-foreground">
                        {userProfile.referral_code}
                      </Badge>
                      <span className="text-primary-foreground/70 text-sm">
                        Share this code with friends to earn commissions
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-foreground">
                      {teamMembers.length}
                    </div>
                    <div className="text-sm text-primary-foreground/70">Team Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Grid */}
        {userProfile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 text-golden mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-foreground">
                  Rs. {userProfile.total_referral_earnings.toFixed(2)}
                </div>
                <div className="text-sm text-primary-foreground/70">Referral Earnings</div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-golden mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-foreground">
                  Rs. {userProfile.total_team_earnings.toFixed(2)}
                </div>
                <div className="text-sm text-primary-foreground/70">Team Earnings</div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-golden mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-foreground">
                  {teamMembers.length}
                </div>
                <div className="text-sm text-primary-foreground/70">B-Level Members</div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <Crown className="w-8 h-8 text-golden mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary-foreground">
                  {userProfile.membership_level.toUpperCase()}
                </div>
                <div className="text-sm text-primary-foreground/70">Your Level</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Members */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary-foreground mb-6">Your Team Members</h2>
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <Card key={member.id} className="bg-primary/10 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-primary-foreground">{member.full_name}</h3>
                        <p className="text-sm text-primary-foreground/70">@{member.username}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={getMembershipLevelColor(member.membership_level)}>
                          {member.membership_level.toUpperCase()}
                        </Badge>
                        <Badge className={getMembershipTypeColor(member.membership_type)}>
                          {member.membership_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-foreground/70">Total Earnings:</span>
                        <span className="text-primary-foreground font-semibold">
                          Rs. {member.total_earnings.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-foreground/70">Joined:</span>
                        <span className="text-primary-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-primary-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">No Team Members Yet</h3>
                <p className="text-primary-foreground/70 mb-4">
                  Start sharing your referral link to build your team and earn more money!
                </p>
                <Button
                  onClick={shareReferralLink}
                  className="bg-gradient-golden hover:shadow-golden"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Referral Link
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Referral Commissions */}
        <div>
          <h2 className="text-2xl font-bold text-primary-foreground mb-6">Referral Commissions</h2>
          {referralCommissions.length > 0 ? (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-primary/20">
                        <th className="text-left p-4 text-primary-foreground font-semibold">User</th>
                        <th className="text-left p-4 text-primary-foreground font-semibold">Type</th>
                        <th className="text-left p-4 text-primary-foreground font-semibold">Amount</th>
                        <th className="text-left p-4 text-primary-foreground font-semibold">Status</th>
                        <th className="text-left p-4 text-primary-foreground font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralCommissions.map((commission) => (
                        <tr key={commission.id} className="border-b border-primary/10">
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-primary-foreground">
                                {commission.referred_user?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-primary-foreground/70">
                                @{commission.referred_user?.username || 'unknown'}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="border-primary/20">
                              {commission.commission_type === 'signup' ? 'Signup Bonus' : 'Plan Purchase'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-primary-foreground">
                              Rs. {commission.commission_amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge 
                              className={
                                commission.status === 'paid' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-yellow-500 text-white'
                              }
                            >
                              {commission.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="p-4 text-primary-foreground/70">
                            {new Date(commission.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-primary-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">No Commissions Yet</h3>
                <p className="text-primary-foreground/70">
                  Start referring friends to earn commissions on their signups and plan purchases!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

