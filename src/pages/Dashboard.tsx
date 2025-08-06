import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award, 
  Clock,
  Eye,
  PlayCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import userAvatar from "@/assets/user-avatar.jpg";
import vipCard from "@/assets/vip-card.jpg";
import taskCommercial from "@/assets/task-commercial.jpg";

const statsData = [
  {
    title: "Income Wallet",
    value: "5,855.00",
    currency: "PKR",
    icon: DollarSign,
    trend: "+12.3%",
    color: "text-success"
  },
  {
    title: "Personal Wallet", 
    value: "0.00",
    currency: "PKR",
    icon: DollarSign,
    trend: "0%",
    color: "text-muted-foreground"
  },
  {
    title: "Team Members",
    value: "23",
    icon: Users,
    trend: "+5 today",
    color: "text-primary"
  },
  {
    title: "Tasks Completed",
    value: "147",
    icon: Award,
    trend: "+8 today",
    color: "text-success"
  }
];

const todayTasks = [
  {
    id: 1,
    title: "Watch Product Advertisement",
    category: "Commercial Advertisement",
    duration: "5 seconds",
    reward: 80.00,
    image: taskCommercial,
    progress: 0,
    timeLeft: "23:45:12"
  },
  {
    id: 2,
    title: "Review Clothing Collection",
    category: "Commodity Advertising", 
    duration: "10 seconds",
    reward: 120.00,
    image: taskCommercial,
    progress: 60,
    timeLeft: "22:15:30"
  },
  {
    id: 3,
    title: "Movie Trailer Preview",
    category: "Film Publicity",
    duration: "15 seconds", 
    reward: 200.00,
    image: taskCommercial,
    progress: 100,
    timeLeft: "Completed"
  }
];

const vipLevels = [
  { level: "VIP1", deposit: "100", dailyTasks: 5, earning: "50-80", color: "bg-vip-bronze" },
  { level: "VIP2", deposit: "500", dailyTasks: 8, earning: "120-200", color: "bg-vip-silver" },
  { level: "VIP3", deposit: "1000", dailyTasks: 12, earning: "300-500", color: "bg-vip-gold" },
  { level: "VIP4", deposit: "2000", dailyTasks: 15, earning: "600-1000", color: "bg-vip-platinum" },
  { level: "VIP5", deposit: "5000", dailyTasks: 20, earning: "1500-2500", color: "bg-vip-diamond" },
];

export const Dashboard = () => {
  const [selectedTask, setSelectedTask] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* User Profile Card */}
      <Card className="bg-gradient-golden shadow-golden border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <img 
              src={userAvatar} 
              alt="User Avatar" 
              className="w-16 h-16 rounded-full border-4 border-primary-foreground/20"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-primary-foreground">John Doe</h2>
              <p className="text-primary-foreground/80">General Employee • Member since Jan 2024</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className="bg-vip-gold text-foreground">VIP Level 2</Badge>
                <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground">
                  ID: 7685856
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary-foreground/80 text-sm">Daily Progress</p>
              <div className="w-20 h-20 relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="2"
                    strokeDasharray="75, 100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">75%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <Card key={index} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                    {stat.currency && <span className="text-sm ml-1">{stat.currency}</span>}
                  </p>
                  <p className={`text-xs ${stat.color}`}>{stat.trend}</p>
                </div>
                <stat.icon className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Tasks */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Tasks</span>
            <Badge variant="secondary">8 available</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayTasks.map((task) => (
            <div key={task.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <img 
                  src={task.image} 
                  alt={task.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.category}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{task.duration}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{task.reward} PKR</span>
                    </span>
                  </div>
                  {task.progress < 100 && (
                    <div className="mt-2">
                      <Progress value={task.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Progress: {task.progress}% • Time left: {task.timeLeft}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {task.progress === 100 ? (
                    <Badge className="bg-success">Completed</Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      className="bg-gradient-golden"
                      onClick={() => setSelectedTask(task.id)}
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VIP Levels */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>VIP Membership Levels</CardTitle>
          <p className="text-muted-foreground">Unlock higher rewards with VIP membership</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vipLevels.map((vip, index) => (
              <div key={index} className={`p-4 rounded-lg ${vip.color} text-white relative overflow-hidden`}>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">{vip.level}</h3>
                  <div className="space-y-2 text-sm">
                    <p>Deposit: {vip.deposit} PKR</p>
                    <p>Daily Tasks: {vip.dailyTasks}</p>
                    <p>Earning: {vip.earning} PKR/day</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-3 w-full bg-white/20 hover:bg-white/30 border-white/30"
                  >
                    Join Now
                  </Button>
                </div>
                {/* Geometric pattern overlay */}
                <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
                  <div className="w-full h-full bg-white transform rotate-45 translate-x-10 -translate-y-10"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};