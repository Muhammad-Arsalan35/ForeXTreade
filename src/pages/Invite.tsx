import { useState } from "react";
import { 
  Share2, 
  Copy, 
  QrCode, 
  Users, 
  TrendingUp, 
  Gift,
  MessageSquare,
  Facebook,
  Twitter,
  Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const referralStats = [
  {
    title: "Total Referrals",
    value: "23",
    icon: Users,
    color: "text-primary"
  },
  {
    title: "Active Referrals", 
    value: "18",
    icon: TrendingUp,
    color: "text-success"
  },
  {
    title: "Referral Earnings",
    value: "2,340",
    currency: "PKR",
    icon: Gift,
    color: "text-success"
  }
];

const teamStructure = [
  {
    level: "A Team (Direct)",
    members: 8,
    commission: "12%",
    earnings: "1,440 PKR",
    validity: "8/8"
  },
  {
    level: "B Team (Level 2)",
    members: 12,
    commission: "4%",
    earnings: "576 PKR", 
    validity: "12/15"
  },
  {
    level: "C Team (Level 3)",
    members: 3,
    commission: "2%",
    earnings: "324 PKR",
    validity: "3/8"
  }
];

export const Invite = () => {
  const [inviteCode] = useState("7685856");
  const [referralUrl] = useState("https://taskmaster.app/7685856");
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const shareViaApp = (platform: string) => {
    const text = `Join TaskMaster and start earning! Use my invite code: ${inviteCode} or visit: ${referralUrl}`;
    
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else if (platform === "telegram") {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`);
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`);
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Invite Friends</h1>
        <p className="text-muted-foreground">Share and earn rewards together</p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-3 gap-4">
        {referralStats.map((stat, index) => (
          <Card key={index} className="shadow-card">
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold">
                {stat.value}
                {stat.currency && <span className="text-sm ml-1">{stat.currency}</span>}
              </p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Code and Invite Code */}
      <Card className="bg-gradient-golden shadow-golden">
        <CardContent className="p-6 text-center">
          <div className="bg-white p-6 rounded-lg inline-block mb-4">
            <QrCode className="w-32 h-32 mx-auto text-foreground" />
          </div>
          
          <h3 className="text-xl font-bold text-primary-foreground mb-2">Your Invitation Code</h3>
          
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-3xl font-bold text-primary-foreground tracking-widest">
              {inviteCode}
            </p>
          </div>

          <Button 
            variant="secondary" 
            onClick={() => copyToClipboard(inviteCode, "Invite code")}
            className="bg-white/20 hover:bg-white/30 border-white/30 text-primary-foreground mb-4"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>

          <div className="space-y-2 text-primary-foreground/90 text-sm">
            <p>✓ Share link or invitation code</p>
            <p>✓ Send to friends who need jobs</p>
            <p>✓ A-level subordinate creation when someone joins</p>
            <p>✓ Referral bonuses and task management fees</p>
          </div>
        </CardContent>
      </Card>

      {/* Referral URL */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input 
              value={referralUrl} 
              readOnly 
              className="flex-1"
            />
            <Button 
              variant="outline"
              onClick={() => copyToClipboard(referralUrl, "Referral link")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => shareViaApp("whatsapp")}
              className="justify-start space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => shareViaApp("telegram")}
              className="justify-start space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => shareViaApp("facebook")}
              className="justify-start space-x-2"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => shareViaApp("twitter")}
              className="justify-start space-x-2"
            >
              <Twitter className="w-4 h-4" />
              <span>Twitter</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Structure */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>My Team Structure</CardTitle>
          <p className="text-muted-foreground">Multi-level commission system</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamStructure.map((team, index) => (
            <div key={index} className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{team.level}</h3>
                <Badge variant="outline">{team.commission} Commission</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Members</p>
                  <p className="font-semibold text-lg">{team.members}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Earnings</p>
                  <p className="font-semibold text-lg text-success">{team.earnings}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Validity</p>
                  <p className="font-semibold text-lg">{team.validity}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Total Accumulated Revenue</p>
            <p className="text-2xl font-bold text-success">2,340 PKR</p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <p>Share your unique invite code or referral link with friends</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <p>When they sign up and become active, they join your A-level team</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <p>Earn 12% commission on their task earnings</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">4</div>
            <p>Also earn from their referrals (B & C teams) at 4% and 2%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};