import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Crown, DollarSign, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const vipLevels: VIPLevel[] = [
  { id: 1, name: "VIP1", deposit: 100, dailyTasks: 5, dailyEarning: "50-80 PKR/day", color: "bg-gradient-to-r from-amber-500 to-orange-600" },
  { id: 2, name: "VIP2", deposit: 500, dailyTasks: 8, dailyEarning: "120-200 PKR/day", color: "bg-gradient-to-r from-gray-400 to-gray-600" },
  { id: 3, name: "VIP3", deposit: 1000, dailyTasks: 12, dailyEarning: "300-500 PKR/day", color: "bg-gradient-to-r from-yellow-400 to-yellow-600" },
  { id: 4, name: "VIP4", deposit: 2000, dailyTasks: 15, dailyEarning: "600-1000 PKR/day", color: "bg-gradient-to-r from-blue-400 to-blue-600" },
  { id: 5, name: "VIP5", deposit: 5000, dailyTasks: 20, dailyEarning: "1500-2500 PKR/day", color: "bg-gradient-to-r from-purple-400 to-purple-600" },
  { id: 6, name: "VIP6", deposit: 10000, dailyTasks: 25, dailyEarning: "3000-5000 PKR/day", color: "bg-gradient-to-r from-pink-400 to-pink-600" },
  { id: 7, name: "VIP7", deposit: 20000, dailyTasks: 30, dailyEarning: "6000-10000 PKR/day", color: "bg-gradient-to-r from-red-400 to-red-600" },
  { id: 8, name: "VIP8", deposit: 50000, dailyTasks: 35, dailyEarning: "15000-25000 PKR/day", color: "bg-gradient-to-r from-indigo-400 to-indigo-600" },
  { id: 9, name: "VIP9", deposit: 100000, dailyTasks: 40, dailyEarning: "30000-50000 PKR/day", color: "bg-gradient-to-r from-teal-400 to-teal-600" },
  { id: 10, name: "VIP10", deposit: 200000, dailyTasks: 50, dailyEarning: "60000-100000 PKR/day", color: "bg-gradient-to-r from-emerald-400 to-emerald-600" },
];

const commissions: Commission[] = [
  { level: 1, referral: "5% Direct Commission", task: "2% Task Earnings" },
  { level: 2, referral: "2% Second Level", task: "1% Task Earnings" },
  { level: 3, referral: "2% Third Level", task: "1% Task Earnings" },
  { level: 4, referral: "2% Fourth Level", task: "1% Task Earnings" },
  { level: 5, referral: "2% Fifth Level", task: "1% Task Earnings" },
];

const positions: Position[] = [
  {
    title: "Team Leader",
    teamSize: "50+ Active",
    salary: "10,000 PKR",
    benefits: ["Bonus Rewards", "Performance Incentives"]
  },
  {
    title: "Senior Manager",
    teamSize: "200+ Active",
    salary: "25,000 PKR",
    benefits: ["Leadership Bonus", "Performance Incentives"]
  },
  {
    title: "Regional Director",
    teamSize: "500+ Active",
    salary: "50,000 PKR",
    benefits: ["Leadership Bonus", "Performance Incentives"]
  }
];

const partners = [
  { name: "SHELL", color: "bg-red-500" },
  { name: "BANK", color: "bg-blue-500" },
  { name: "RBC", color: "bg-green-500" },
  { name: "CORP", color: "bg-purple-500" }
];

export const Handbook = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllVIPLevels, setShowAllVIPLevels] = useState(false);
  const navigate = useNavigate();

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
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-orange-600"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-orange-500 font-bold text-xs md:text-sm">CF</span>
            </div>
            <h1 className="text-sm md:text-lg font-bold">Clover Films - VIP Task Platform - Profit Distribution Details</h1>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-4 md:space-y-6">
        {/* Investment & Earning Opportunities */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Investment & Earning Opportunities</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Explore our comprehensive VIP membership levels designed to maximize your earning potential through task completion and strategic investments.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search VIP levels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
          />
        </div>

        {/* VIP Membership Levels */}
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
        {!showAllVIPLevels && filteredVIPLevels.length > 6 && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setShowAllVIPLevels(true)}
              variant="outline"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md"
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
              Business Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Referral Commission */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 text-blue-600">Referral Commission</h3>
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div key={commission.level} className="flex justify-between items-center p-2 md:p-3 bg-white rounded shadow-sm">
                      <span className="font-medium text-sm md:text-base">Level {commission.level}:</span>
                      <span className="text-green-600 font-semibold text-sm md:text-base truncate ml-2">{commission.referral}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Commission */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 text-green-600">Task Commission</h3>
                <div className="space-y-2">
                  {commissions.map((commission) => (
                    <div key={commission.level} className="flex justify-between items-center p-2 md:p-3 bg-white rounded shadow-sm">
                      <span className="font-medium text-sm md:text-base">Level {commission.level}:</span>
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
              Position Salary Schedule
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
            <CardTitle className="text-gray-800">Our Trusted Partners</CardTitle>
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
        <p>© 2024 Clover Films. All rights reserved.</p>
        <p className="mt-1">This document contains confidential information. Please read all terms and conditions carefully.</p>
      </div>
    </div>
  );
};
