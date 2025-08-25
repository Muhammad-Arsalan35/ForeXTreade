import React from 'react';
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

const Dashboard = () => {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">VIP 1</h3>
              <p className="text-sm text-yellow-600">$50-80 rewards</p>
              <Badge className="mt-2 bg-yellow-100 text-yellow-800">Available</Badge>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">VIP 2</h3>
              <p className="text-sm text-yellow-600">$120-200 rewards</p>
              <Badge className="mt-2 bg-green-100 text-green-800">Unlocked</Badge>
            </div>
            
            <div className="text-center p-4 bg-white rounded-lg border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">VIP 3</h3>
              <p className="text-sm text-yellow-600">$300-500 rewards</p>
              <Badge className="mt-2 bg-gray-100 text-gray-600">Locked</Badge>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Zap className="mr-2 h-4 w-4" />
              Upgrade VIP Level
            </Button>
          </div>
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
