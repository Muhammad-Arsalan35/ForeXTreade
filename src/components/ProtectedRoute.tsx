import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'vip' | 'user';
  requiredVipLevel?: number;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiredVipLevel 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  // Check permissions when user/profile changes
  useEffect(() => {
    if (loading) return; // Still loading, don't check yet

    if (!user) {
      return; // Not authenticated, will redirect
    }

    if (!profile) {
      return; // Profile not loaded yet
    }

    // Check role-based access
    if (requiredRole) {
      const userRole = profile.vip_level === 'VIP10' ? 'admin' : 
                      profile.vip_level && profile.vip_level !== 'VIP1' ? 'vip' : 'user';
      
      if (userRole !== requiredRole) {
        toast({
          title: "Insufficient Permissions",
          description: `This page requires ${requiredRole} access`,
          variant: "destructive"
        });
        return;
      }
    }

    // Check VIP level access
    if (requiredVipLevel) {
      const currentVipNumber = profile.vip_level ? 
        parseInt(profile.vip_level.replace('VIP', '')) || 1 : 1;
      
      if (currentVipNumber < requiredVipLevel) {
        toast({
          title: "VIP Access Required",
          description: `This page requires VIP level ${requiredVipLevel} or higher. Your current level: ${profile.vip_level || 'VIP1'}`,
          variant: "destructive"
        });
        return;
      }
    }
  }, [user, profile, loading, requiredRole, requiredVipLevel, toast]);

  // Show loading while auth is being checked
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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};