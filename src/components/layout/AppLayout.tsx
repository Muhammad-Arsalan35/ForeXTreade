import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { TopHeader } from "./TopHeader";

export const AppLayout = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Mock authentication

  // Don't show layout on auth pages
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);

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