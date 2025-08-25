import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Clock, DollarSign, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import taskCommercial from "@/assets/task-commercial.jpg";

interface Task {
  id: string;
  title: string;
  category: string;
  duration: number; // in seconds
  reward: number; // in PKR
  status: 'available' | 'in_progress' | 'completed';
  image_url: string;
  video_url?: string;
  description?: string;
}

interface UserLevel {
  level: number;
  name: string;
  multiplier: number; // earnings multiplier
  daily_task_limit: number;
}

export const Task = () => {
  const [activeTab, setActiveTab] = useState('doing');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>({
    level: 1,
    name: 'Basic',
    multiplier: 1.0,
    daily_task_limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sample tasks data
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Watch Product Advertisement',
      category: 'Commercial Advertisement',
      duration: 10,
      reward: 50,
      status: 'available',
      image_url: taskCommercial,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      description: 'Watch this 10-second product advertisement to earn PKR 50'
    },
    {
      id: '2',
      title: 'Watch Product Advertisement',
      category: 'Commercial Advertisement',
      duration: 10,
      reward: 50,
      status: 'in_progress',
      image_url: taskCommercial,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      description: 'Watch this 10-second product advertisement to earn PKR 50'
    },
    {
      id: '3',
      title: 'Watch Brand Video',
      category: 'Brand Promotion',
      duration: 10,
      reward: 100,
      status: 'available',
      image_url: taskCommercial,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      description: 'Watch this 10-second brand video to earn PKR 100'
    },
    {
      id: '4',
      title: 'Watch Service Ad',
      category: 'Service Advertisement',
      duration: 8,
      reward: 80,
      status: 'completed',
      image_url: taskCommercial,
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      description: 'Watch this 8-second service advertisement to earn PKR 80'
    }
  ];

  useEffect(() => {
    fetchUserLevel();
    setTasks(sampleTasks);
  }, []);

  const fetchUserLevel = async () => {
    try {
      // TODO: Fetch user level from database
      // const { data: { user } } = await supabase.auth.getUser();
      // if (user) {
      //   const { data: profile } = await supabase
      //     .from('profiles')
      //     .select('vip_level')
      //     .eq('id', user.id)
      //     .single();
      //   
      //   if (profile) {
      //     const levelData = getLevelData(profile.vip_level);
      //     setUserLevel(levelData);
      //   }
      // }
    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const getLevelData = (level: number): UserLevel => {
    const levels: { [key: number]: UserLevel } = {
      1: { level: 1, name: 'Basic', multiplier: 1.0, daily_task_limit: 10 },
      2: { level: 2, name: 'Silver', multiplier: 1.5, daily_task_limit: 15 },
      3: { level: 3, name: 'Gold', multiplier: 2.0, daily_task_limit: 20 },
      4: { level: 4, name: 'Platinum', multiplier: 2.5, daily_task_limit: 25 },
      5: { level: 5, name: 'Diamond', multiplier: 3.0, daily_task_limit: 30 }
    };
    return levels[level] || levels[1];
  };

  const calculateReward = (baseReward: number): number => {
    return Math.round(baseReward * userLevel.multiplier);
  };

  const startTask = async (task: Task) => {
    setCurrentTask(task);
    setTaskProgress(0);
    setVideoTime(0);
    setCanSubmit(false);
    setVideoLoading(false);
    setVideoError(false);
    setShowVideoPopup(true);
    setLoading(true);

    // Update task status to in_progress
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'in_progress' } : t
    ));

    // Simulate video watching progress
    progressIntervalRef.current = setInterval(() => {
      setVideoTime(prev => {
        const newTime = prev + 1;
        const progress = (newTime / task.duration) * 100;
        setTaskProgress(Math.min(progress, 100));
        
        if (newTime >= task.duration) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          setCanSubmit(true);
          setTaskProgress(100);
          return task.duration;
        }
        return newTime;
      });
    }, 1000);

    toast({
      title: "Task Started",
      description: `Watching ${task.title} for ${task.duration} seconds`,
    });
  };

  const handleVideoTimeUpdate = (currentTime: number, task: Task) => {
    setVideoTime(currentTime);
    const progress = (currentTime / task.duration) * 100;
    setTaskProgress(Math.min(progress, 100));
    
    // Enable submit button when video reaches the required duration
    if (currentTime >= task.duration) {
      setCanSubmit(true);
    }
  };

  const handleVideoEnd = (task: Task) => {
    setCanSubmit(true);
    setTaskProgress(100);
  };

  const submitTask = async (task: Task) => {
    if (!canSubmit) return;
    
    setLoading(false);
    setCurrentTask(null);
    setTaskProgress(0);
    setShowVideoPopup(false);
    setCanSubmit(false);
    setVideoTime(0);

    const actualReward = calculateReward(task.reward);

    // Update task status to completed
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'completed' } : t
    ));

    // TODO: Save task completion to database
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   await supabase.from('task_completions').insert({
    //     user_id: user.id,
    //     task_id: task.id,
    //     reward_earned: actualReward,
    //     completed_at: new Date().toISOString()
    //   });
    // }

    toast({
      title: "Task Completed!",
      description: `You earned PKR ${actualReward} (Level ${userLevel.level} bonus applied)`,
    });
  };

  const closeVideoPopup = () => {
    // Clear the progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setShowVideoPopup(false);
    setCurrentTask(null);
    setTaskProgress(0);
    setCanSubmit(false);
    setVideoTime(0);
    setLoading(false);
    setVideoLoading(false);
    setVideoError(false);
  };

  const completeTask = async (task: Task) => {
    setLoading(false);
    setCurrentTask(null);
    setTaskProgress(0);

    const actualReward = calculateReward(task.reward);

    // Update task status to completed
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'completed' } : t
    ));

    // TODO: Save task completion to database
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   await supabase.from('task_completions').insert({
    //     user_id: user.id,
    //     task_id: task.id,
    //     reward_earned: actualReward,
    //     completed_at: new Date().toISOString()
    //   });
    // }

    toast({
      title: "Task Completed!",
      description: `You earned PKR ${actualReward} (Level ${userLevel.level} bonus applied)`,
    });
  };

  const getFilteredTasks = (status: string) => {
    return tasks.filter(task => {
      if (status === 'doing') {
        return task.status === 'available' || task.status === 'in_progress';
      } else if (status === 'audit') {
        return task.status === 'in_progress';
      } else if (status === 'completed') {
        return task.status === 'completed';
      }
      return false;
    });
  };

  const getTaskCount = (status: string) => {
    return getFilteredTasks(status).length;
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pt-2 md:pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-primary-foreground"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <h1 className="text-lg md:text-xl font-bold text-primary-foreground">Task List</h1>
      </div>

      {/* User Level Info */}
      <Card className="mb-4 md:mb-6 shadow-elegant">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">Your Level</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {userLevel.name} - {userLevel.multiplier}x Earnings
              </p>
            </div>
            <Badge className="bg-blue-500 text-white text-xs md:text-sm">
              Level {userLevel.level}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Daily limit: {userLevel.daily_task_limit} tasks
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6">
          <TabsTrigger value="doing" className="flex items-center gap-2">
            Doing
            {getTaskCount('doing') > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getTaskCount('doing')}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            Audit
            {getTaskCount('audit') > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getTaskCount('audit')}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            {getTaskCount('completed') > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getTaskCount('completed')}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Task Content */}
        <TabsContent value="doing" className="space-y-4">
          {getFilteredTasks('doing').map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userLevel={userLevel}
              onStart={startTask}
              onComplete={completeTask}
              isCurrentTask={currentTask?.id === task.id}
              progress={taskProgress}
              loading={loading}
            />
          ))}
          {getFilteredTasks('doing').length === 0 && (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No tasks available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {getFilteredTasks('audit').map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userLevel={userLevel}
              onStart={startTask}
              onComplete={completeTask}
              isCurrentTask={currentTask?.id === task.id}
              progress={taskProgress}
              loading={loading}
            />
          ))}
          {getFilteredTasks('audit').length === 0 && (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No tasks in progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {getFilteredTasks('completed').map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userLevel={userLevel}
              onStart={startTask}
              onComplete={completeTask}
              isCurrentTask={false}
              progress={100}
              loading={false}
            />
          ))}
          {getFilteredTasks('completed').length === 0 && (
            <Card className="shadow-elegant">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No completed tasks</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Popup Modal */}
      {showVideoPopup && currentTask && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{currentTask.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeVideoPopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video Player */}
            <div className="p-4">
              <div className="relative">
                {videoLoading && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Loading video...</p>
                    </div>
                  </div>
                )}
                
                {videoError && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
                    <div className="text-white text-center p-4">
                      <p className="mb-2">Video unavailable</p>
                      <p className="text-sm text-gray-300">Task will auto-complete in 5 seconds</p>
                    </div>
                  </div>
                )}

                <div className="w-full h-64 bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Video Placeholder with Animation */}
                  <div className="text-center text-white z-10">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{currentTask.title}</h3>
                    <p className="text-sm text-gray-300 mb-4">{currentTask.description}</p>
                    
                    {/* Simulated Video Progress */}
                    <div className="w-full max-w-xs mx-auto">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Watching...</span>
                        <span>{Math.round(videoTime)}s / {currentTask.duration}s</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${taskProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated Background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse"></div>
                  </div>
                </div>

                {/* Hidden video element for time tracking */}
                <video
                  className="hidden"
                  onTimeUpdate={(e) => handleVideoTimeUpdate(e.currentTarget.currentTime, currentTask)}
                  onEnded={() => handleVideoEnd(currentTask)}
                  onError={(e) => {
                    console.error('Video error:', e);
                    setVideoLoading(false);
                    setVideoError(true);
                    toast({
                      title: "Video Error",
                      description: "Using fallback mode - task will complete automatically",
                      variant: "destructive"
                    });
                    // Enable submit after a delay as fallback
                    setTimeout(() => {
                      setCanSubmit(true);
                      setTaskProgress(100);
                    }, 5000);
                  }}
                >
                  <source src={currentTask.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'} type="video/mp4" />
                  <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
                </video>


              </div>

              {/* Task Info */}
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">{currentTask.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{currentTask.duration}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-green-600 font-medium">
                        {calculateReward(currentTask.reward)} PKR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closeVideoPopup}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitTask(currentTask)}
                  disabled={!canSubmit}
                  className={`flex-1 ${
                    canSubmit 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {canSubmit ? 'Submit & Earn' : `Watch ${currentTask.duration}s to Submit`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  userLevel: UserLevel;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  isCurrentTask: boolean;
  progress: number;
  loading: boolean;
}

const TaskCard = ({ 
  task, 
  userLevel, 
  onStart, 
  onComplete, 
  isCurrentTask, 
  progress, 
  loading 
}: TaskCardProps) => {
  const calculateReward = (baseReward: number): number => {
    return Math.round(baseReward * userLevel.multiplier);
  };

  const actualReward = calculateReward(task.reward);

  return (
    <Card className="shadow-elegant overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="flex gap-3 md:gap-4">
          {/* Task Image */}
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
            <img
              src={task.image_url}
              alt={task.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/src/assets/placeholder.svg';
              }}
            />
          </div>

          {/* Task Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-sm md:text-base">
                  {task.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {task.category}
                </p>
              </div>
              <Badge 
                variant={task.status === 'available' ? 'secondary' : 
                        task.status === 'in_progress' ? 'default' : 'outline'}
                className="ml-2 flex-shrink-0 text-xs"
              >
                {task.status === 'available' ? 'Available' : 
                 task.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </Badge>
            </div>

            {/* Task Info */}
            <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span>{task.duration}s</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-green-600 font-medium">
                  {actualReward} PKR
                </span>
                {userLevel.multiplier > 1 && (
                  <span className="text-xs text-blue-600">
                    (Level {userLevel.level} bonus)
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              {task.status === 'available' && (
                <Button
                  onClick={() => onStart(task)}
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs md:text-sm py-1 md:py-2"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Start
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  variant="outline"
                  disabled
                  className="text-blue-600 border-blue-600 text-xs md:text-sm py-1 md:py-2"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  In Progress
                </Button>
              )}
              {task.status === 'completed' && (
                <Button
                  variant="outline"
                  disabled
                  className="text-green-600 border-green-600 text-xs md:text-sm py-1 md:py-2"
                >
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
