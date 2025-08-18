import { Bell, Search, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import userAvatar from "@/assets/user-avatar.jpg";

export const TopHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="bg-gradient-primary border-b border-border sticky top-0 z-50 shadow-elegant">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Menu and logo */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-primary-foreground">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="text-primary-foreground">
              <h1 className="font-bold text-lg">TaskMaster</h1>
              <p className="text-xs opacity-90">VIP Task Platform</p>
            </div>
          </div>

          {/* Right side - User info and notifications */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-primary-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/profile')}
                className="text-primary-foreground p-0 h-auto"
              >
                <img 
                  src={userAvatar} 
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full border-2 border-primary-foreground/20 cursor-pointer hover:border-primary-foreground/40 transition-colors"
                />
              </Button>
              <div className="text-primary-foreground text-sm">
                <p className="font-medium">John Doe</p>
                <p className="text-xs opacity-75">VIP Level 2</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};