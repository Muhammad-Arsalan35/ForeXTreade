import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Crown, DollarSign, Users, TrendingUp, Globe, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VIPLevel {
  id: number;
  name: string;
  deposit: number;
  dailyTasks: number;
  dailyEarning: string;
  color: string;
}

interface Commission {
  level: number;
  referral: string;
  task: string;
}

interface Position {
  title: string;
  teamSize: string;
  salary: string;
  benefits: string[];
}

// VIP Level colors for different levels
const getVIPColor = (level: number) => {
  const colors = [
    "bg-gradient-to-r from-amber-500 to-orange-600", // VIP1
    "bg-gradient-to-r from-gray-400 to-gray-600",    // VIP2
    "bg-gradient-to-r from-yellow-400 to-yellow-600", // VIP3
    "bg-gradient-to-r from-blue-400 to-blue-600",    // VIP4
    "bg-gradient-to-r from-purple-400 to-purple-600", // VIP5
    "bg-gradient-to-r from-pink-400 to-pink-600",    // VIP6
    "bg-gradient-to-r from-red-400 to-red-600",      // VIP7
    "bg-gradient-to-r from-indigo-400 to-indigo-600", // VIP8
    "bg-gradient-to-r from-teal-400 to-teal-600",    // VIP9
    "bg-gradient-to-r from-emerald-400 to-emerald-600" // VIP10
  ];
  return colors[level - 1] || colors[0];
};

const commissions: Commission[] = [
  { level: 1, referral: "10% VIP Upgrade Commission", task: "3% Video Earnings" },
  { level: 2, referral: "5% VIP Upgrade Commission", task: "1.5% Video Earnings" },
  { level: 3, referral: "2% VIP Upgrade Commission", task: "0.75% Video Earnings" },
  { level: 4, referral: "1% VIP Upgrade Commission", task: "0.25% Video Earnings" },
];

const positions: Position[] = [
  {
    title: "FXTrade Team Leader",
    teamSize: "18+ Direct Active Users",
    salary: "15,000 PKR/month",
    benefits: ["Referral Bonuses", "Video Earnings Bonus"]
  },
  {
    title: "FXTrade Senior Manager",
    teamSize: "40+ Direct Active Users",
    salary: "35,000 PKR/month",
    benefits: ["Leadership Bonus", "VIP Upgrade Commissions"]
  },
  {
    title: "FXTrade Regional Director",
    teamSize: "100+ Direct Active Users",
    salary: "75,000 PKR/month",
    benefits: ["Regional Bonus", "Premium VIP Benefits"]
  }
];

const partners = [
  { name: "FXTrade", color: "bg-gradient-primary" },
  { name: "EARN", color: "bg-green-500" },
  { name: "TASK", color: "bg-blue-500" },
  { name: "VIP", color: "bg-purple-500" }
];

export const Handbook = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllVIPLevels, setShowAllVIPLevels] = useState(false);
  const [vipLevels, setVipLevels] = useState<VIPLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVIPLevels();
  }, []);

  const fetchVIPLevels = async () => {
    try {
      setLoading(true);
      const { data: membershipPlans, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching membership plans:', error);
        toast({
          title: "Error",
          description: "Failed to load VIP levels",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched membership plans:', membershipPlans);

      const formattedVIPLevels: VIPLevel[] = membershipPlans?.map((plan, index) => ({
        id: index + 1, // Use array index + 1 as level
        name: plan.name,
        deposit: plan.price,
        dailyTasks: plan.daily_video_limit || 5,
        dailyEarning: `${(plan.daily_video_limit * (plan.video_rate || 30)).toFixed(0)}-${(plan.daily_video_limit * (plan.video_rate || 30) * 1.5).toFixed(0)} PKR/day`,
        color: getVIPColor(index + 1)
      })) || [];

      console.log('Formatted VIP levels:', formattedVIPLevels);
      setVipLevels(formattedVIPLevels);
    } catch (error) {
      console.error('Error fetching VIP levels:', error);
      toast({
        title: "Error",
        description: "Failed to load VIP levels from database. Showing sample data.",
        variant: "destructive"
      });
      
      // Fallback to sample data if database fails
      const fallbackVIPLevels: VIPLevel[] = [
        { id: 1, name: "VIP1", deposit: 5000, dailyTasks: 5, dailyEarning: "150-225 PKR/day", color: "bg-gradient-to-r from-amber-500 to-orange-600" },
        { id: 2, name: "VIP2", deposit: 16000, dailyTasks: 10, dailyEarning: "500-750 PKR/day", color: "bg-gradient-to-r from-gray-400 to-gray-600" },
        { id: 3, name: "VIP3", deposit: 36000, dailyTasks: 16, dailyEarning: "1120-1680 PKR/day", color: "bg-gradient-to-r from-yellow-400 to-yellow-600" },
        { id: 4, name: "VIP4", deposit: 78000, dailyTasks: 31, dailyEarning: "2480-3720 PKR/day", color: "bg-gradient-to-r from-blue-400 to-blue-600" },
        { id: 5, name: "VIP5", deposit: 160000, dailyTasks: 50, dailyEarning: "5000-7500 PKR/day", color: "bg-gradient-to-r from-purple-400 to-purple-600" },
        { id: 6, name: "VIP6", deposit: 260000, dailyTasks: 75, dailyEarning: "8625-12937 PKR/day", color: "bg-gradient-to-r from-pink-400 to-pink-600" }
      ];
      setVipLevels(fallbackVIPLevels);
    } finally {
      setLoading(false);
    }
  };

  const filteredVIPLevels = vipLevels.filter(level =>
    level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    level.dailyEarning.includes(searchTerm)
  );

  const displayedVIPLevels = showAllVIPLevels ? filteredVIPLevels : filteredVIPLevels.slice(0, 6);

  // Reset show all state when search term changes
  useEffect(() => {
    setShowAllVIPLevels(false);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-golden rounded-full flex items-center justify-center">
              <Globe className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm md:text-lg font-bold">FXTrade - EARN WITH TASK - VIP Handbook</h1>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-4 md:space-y-6">
        {/* Investment & Earning Opportunities */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">FXTrade VIP Investment & Earning Opportunities</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Explore our comprehensive VIP membership levels designed to maximize your earning potential through video watching tasks and strategic investments in FXTrade.
          </p>
        </div>

        {/* Search and Refresh */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search VIP levels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
            />
          </div>
          <Button
            onClick={fetchVIPLevels}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* VIP Membership Levels */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 md:gap-4">
            {displayedVIPLevels.map((level) => (
            <Card key={level.id} className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden hover:scale-105">
              <CardHeader className={`${level.color} text-white p-3 md:p-4`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm md:text-lg font-bold truncate">{level.name}</CardTitle>
                  <Badge className="bg-white text-gray-800 font-semibold text-xs md:text-sm">Level {level.id}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3 bg-white">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-green-600 flex-shrink-0" />
                  <span className="font-semibold text-xs md:text-sm truncate">{level.deposit.toLocaleString()} PKR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs md:text-sm truncate">{level.dailyTasks} tasks/day</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-orange-600 flex-shrink-0" />
                  <span className="font-medium text-green-600 text-xs md:text-sm truncate">{level.dailyEarning}</span>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
        {!loading && !showAllVIPLevels && filteredVIPLevels.length > 6 && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setShowAllVIPLevels(true)}
              variant="outline"
              className="bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground border-0 shadow-md"
            >
              <Crown className="w-4 h-4 mr-2" />
              View All VIP Levels ({filteredVIPLevels.length})
            </Button>
          </div>
        )}
        {showAllVIPLevels && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setShowAllVIPLevels(false)}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              Show Less VIP Levels
            </Button>
          </div>
        )}

        {/* Business Opportunity */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Users className="w-5 h-5" />
              FXTrade Referral & Video Commission System (A, B, C, D Levels)
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              ✅ <strong>Automatic Commission Sharing:</strong> All commissions are automatically calculated and added to your income wallet when your referrals watch videos or upgrade to VIP plans.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* VIP Upgrade Commission */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 text-blue-600">VIP Upgrade Commission</h3>
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div key={commission.level} className="flex justify-between items-center p-2 md:p-3 bg-white rounded shadow-sm">
                      <span className="font-medium text-sm md:text-base">{String.fromCharCode(64 + commission.level)}-Level:</span>
                      <span className="text-green-600 font-semibold text-sm md:text-base truncate ml-2">{commission.referral}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Earnings Commission */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 text-green-600">Video Earnings Commission</h3>
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div key={commission.level} className="flex justify-between items-center p-2 md:p-3 bg-white rounded shadow-sm">
                      <span className="font-medium text-sm md:text-base">{String.fromCharCode(64 + commission.level)}-Level:</span>
                      <span className="text-blue-600 font-semibold text-sm md:text-base truncate ml-2">{commission.task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Salary Schedule */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Crown className="w-5 h-5" />
              FXTrade Leadership Position Salary Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 md:p-3 border border-gray-200 font-semibold text-xs md:text-sm">Position</th>
                    <th className="text-left p-2 md:p-3 border border-gray-200 font-semibold text-xs md:text-sm">Team Size</th>
                    <th className="text-left p-2 md:p-3 border border-gray-200 font-semibold text-xs md:text-sm">Monthly Salary</th>
                    <th className="text-left p-2 md:p-3 border border-gray-200 font-semibold text-xs md:text-sm">Benefits</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-2 md:p-3 border border-gray-200 font-medium text-xs md:text-sm">{position.title}</td>
                      <td className="p-2 md:p-3 border border-gray-200 text-xs md:text-sm">{position.teamSize}</td>
                      <td className="p-2 md:p-3 border border-gray-200 font-semibold text-green-600 text-xs md:text-sm">{position.salary}</td>
                      <td className="p-2 md:p-3 border border-gray-200">
                        {position.benefits.map((benefit, idx) => (
                          <div key={idx} className="text-xs md:text-sm text-gray-600">
                            {benefit}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Trusted Partners */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="text-gray-800">FXTrade Platform Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {partners.map((partner, index) => (
                <div key={index} className="text-center">
                  <div className={`w-12 h-12 md:w-16 md:h-16 ${partner.color} rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                    <span className="text-white font-bold text-xs md:text-sm">{partner.name}</span>
                  </div>
                                      <span className="text-xs md:text-sm font-medium text-gray-700">{partner.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-4 text-center text-sm text-gray-600 mt-8">
        <p>© 2024 FXTrade. All rights reserved.</p>
        <p className="mt-1">EARN WITH TASK - This document contains confidential information. Please read all terms and conditions carefully.</p>
      </div>
    </div>
  );
};
