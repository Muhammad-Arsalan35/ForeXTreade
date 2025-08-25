import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Phone, 
  Crown, 
  Wallet, 
  Users, 
  MessageCircle, 
  BookOpen, 
  Download, 
  LogOut,
  UserCheck,
  BarChart3
} from "lucide-react";
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = "+923001234567"; // Replace with actual support number
    const message = "Hello! I need 24/7 support assistance.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleHiringManagerContact = () => {
    const phoneNumber = "+923001234568"; // Replace with actual hiring manager number
    const message = "Hello! I would like to discuss hiring opportunities.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
        <div className="w-10"></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : profile ? (
        <>
          {/* User Info Card */}
          <Card className="card-golden hover-glow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20 border-4 border-primary/30">
                  <AvatarImage src={profile.profile_avatar || undefined} />
                  <AvatarFallback className="bg-gradient-cash text-primary-foreground text-2xl">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-primary">{profile.full_name || 'User'}</h2>
                  <p className="text-muted-foreground flex items-center gap-2">
                    📱 {profile.phone_number || 'No phone number'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-gradient-cash text-primary-foreground">
                      {profile.vip_level || 'VIP1'} {profile.position_title || 'General Employee'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Balances */}
          <Card className="card-golden hover-scale">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                💰 Wallet Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-cash rounded-lg text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Income Wallet</p>
                      <p className="text-2xl font-bold">
                        PKR {profile.income_wallet_balance?.toLocaleString() || '0.00'}
                      </p>
                    </div>
                    <Wallet className="w-8 h-8" />
                  </div>
                </div>
                <div className="p-4 bg-gradient-cash rounded-lg text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Personal Wallet</p>
                      <p className="text-2xl font-bold">
                        PKR {profile.personal_wallet_balance?.toLocaleString() || '0.00'}
                      </p>
                    </div>
                    <Wallet className="w-8 h-8" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold text-primary">
                    PKR {profile.total_earnings?.toLocaleString() || '0.00'}
                  </p>
                </div>
                <div className="p-4 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-xl font-bold text-primary">
                    PKR {profile.total_invested?.toLocaleString() || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="card-golden hover-scale">
            <CardHeader>
              <CardTitle className="text-primary">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-primary">Hiring Manager</p>
                    <p className="text-sm text-muted-foreground">Contact your manager for support</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHiringManagerContact}
                  className="border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                >
                  Contact
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-primary">24/7 WhatsApp Support</p>
                    <p className="text-sm text-muted-foreground">Get instant help anytime</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppContact}
                  className="border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                >
                  Chat Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-golden hover-scale">
            <CardHeader>
              <CardTitle className="text-primary">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                  onClick={() => navigate('/dashboard/messages')}
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-sm">Messages</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                  onClick={() => navigate('/dashboard/handbook')}
                >
                  <BookOpen className="w-6 h-6" />
                  <span className="text-sm">Profits Plan</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                  onClick={() => navigate('/dashboard/download')}
                >
                  <Download className="w-6 h-6" />
                  <span className="text-sm">Download</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-primary/30 text-primary hover:bg-primary/10 hover-scale"
                  onClick={() => navigate('/dashboard/records')}
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="text-sm">Records</span>
                </Button>
              </div>
              <div className="mt-6">
                <Button
                  variant="destructive"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 hover-scale"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="card-golden">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load profile</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
