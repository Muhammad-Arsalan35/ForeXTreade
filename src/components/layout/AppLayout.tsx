import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { TopHeader } from "./TopHeader";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DebugInfo } from "@/components/DebugInfo";

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Don't show layout on auth pages
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);

  // Redirect to login if not authenticated and not on auth page
  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      navigate('/login');
    }
  }, [user, isAuthPage, navigate, loading]);

  // Redirect to dashboard if authenticated and on root
  useEffect(() => {
    if (!loading && user && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, loading, location.pathname, navigate]);

  if (isAuthPage) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <LoadingSpinner 
          size="md" 
          text="Loading..." 
          className="text-primary-foreground"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopHeader />
      
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <BottomNavigation />
      <DebugInfo />
    </div>
  );
};