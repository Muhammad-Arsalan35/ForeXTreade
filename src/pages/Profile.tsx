import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, User, Phone, Crown, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  profile_avatar: string | null;
  referral_code: string;
  referral_level: number | null;
  vip_level: string | null;
  total_earnings: number | null;
  total_invested: number | null;
  income_wallet_balance: number | null;
  personal_wallet_balance: number | null;
  position_title: string | null;
  created_at: string | null;
}

export const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }
      setUser(authUser);

      // Fetch user profile from database
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error) throw error;

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-primary-foreground text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-primary-foreground text-lg">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-auto">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </Button>
        <h1 className="text-xl font-bold text-primary-foreground">Profile</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="relative mb-4">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src={profile.profile_avatar || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-golden text-primary-foreground">
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 className="text-xl font-bold mb-2">{profile.full_name}</h2>
            <p className="text-muted-foreground mb-3">@{profile.username}</p>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              {profile.vip_level && (
                <Badge variant="secondary" className="bg-gradient-golden text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  {profile.vip_level}
                </Badge>
              )}
              {profile.position_title && (
                <Badge variant="outline">{profile.position_title}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total Earnings</p>
                <p className="font-bold text-success">
                  PKR {profile.total_earnings?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Total Invested</p>
                <p className="font-bold text-primary">
                  PKR {profile.total_invested?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <p className="text-sm p-2 bg-muted rounded">{profile.full_name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </label>
              <p className="text-sm p-2 bg-muted rounded">@{profile.username}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <p className="text-sm p-2 bg-muted rounded">{profile.phone_number}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Position Title
              </label>
              <p className="text-sm p-2 bg-muted rounded">{profile.position_title || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Referral Code</span>
              <Badge variant="outline" className="font-mono">{profile.referral_code}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Referral Level</span>
              <Badge variant="secondary">{profile.referral_level || 'None'}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Information */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Income Wallet</span>
              <span className="font-bold text-success">
                PKR {profile.income_wallet_balance?.toLocaleString() || '0'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Personal Wallet</span>
              <span className="font-bold text-primary">
                PKR {profile.personal_wallet_balance?.toLocaleString() || '0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
