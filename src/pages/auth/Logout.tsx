import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear local storage
        localStorage.clear();
        
        // Clear session storage
        sessionStorage.clear();
        
        // Wait a moment for cleanup
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1000);
      } catch (error) {
        console.error("Logout error:", error);
        // Even if there's an error, redirect to login
        navigate("/login", { replace: true });
      }
    };

    handleLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Logging Out</h2>
          <p className="text-muted-foreground">
            Please wait while we securely log you out...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};


