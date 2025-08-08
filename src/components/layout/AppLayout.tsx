import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { TopHeader } from "./TopHeader";

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Set to false to require login

  // Don't show layout on auth pages
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);

  // Redirect to login if not authenticated and not on auth page
  useEffect(() => {
    if (!isAuthenticated && !isAuthPage) {
      navigate('/login');
    }
  }, [isAuthenticated, isAuthPage, navigate]);

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopHeader />
      
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
};