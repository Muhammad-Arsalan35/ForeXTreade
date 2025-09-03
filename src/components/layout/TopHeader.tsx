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
    <header className="bg-gradient-cash border-b border-primary/20 sticky top-0 z-50 shadow-golden">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Menu and logo */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/20 hover-scale">
              <Menu className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <div className="text-primary-foreground">
              <h1 className="font-bold text-base md:text-lg">TaskMaster</h1>
              <p className="text-[10px] md:text-xs opacity-90">VIP Task Platform</p>
            </div>
          </div>

          {/* Right side - User info and notifications */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <Button variant="ghost" size="sm" className="text-primary-foreground relative hover:bg-primary/20 hover-scale">
              <Bell className="w-4 h-4 md:w-5 md:h-5" />
              <span className="absolute -top-0.5 md:-top-1 -right-0.5 md:-right-1 bg-destructive text-destructive-foreground text-[10px] md:text-xs rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                3
              </span>
            </Button>
            
            <div className="hidden sm:flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard/profile')}
                className="text-primary-foreground p-0 h-auto hover:bg-primary/20 hover-scale"
              >
                <img 
                  src={userAvatar} 
                  alt="User Avatar" 
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-primary-foreground/20 cursor-pointer hover:border-primary-foreground/40 transition-colors"
                />
              </Button>
              <div className="text-primary-foreground text-xs md:text-sm">
                <p className="font-medium">John Doe</p>
                <p className="text-[10px] md:text-xs opacity-75">VIP Level 2</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground hover:bg-primary/20 hover-scale">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};