import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [vipLevel, setVipLevel] = useState<number | null>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthenticated(false);
          return;
        }

        // Fetch user profile and permissions
        const { data: profile, error } = await supabase
          .from('users')
          .select('vip_level, user_status')  // Remove 'role' field as it doesn't exist in schema
          .eq('auth_user_id', user.id)
          .single();

        // Set user data (role is determined by VIP level and admin status)
        const userRole = profile.vip_level === 'VIP10' ? 'admin' : 
                        profile.vip_level && profile.vip_level !== 'VIP1' ? 'vip' : 'user';
        
        setUserRole(userRole);
        setVipLevel(profile.vip_level);
        setIsAuthenticated(true);

        // Check role-based access
        if (requiredRole && userRole !== requiredRole) {
          toast({
            title: "Insufficient Permissions",
            description: `This page requires ${requiredRole} access`,
            variant: "destructive"
          });
          setIsAuthenticated(false);
          return;
        }

        // Check VIP level access only if required
        if (requiredVipLevel) {
          // Extract numeric value from VIP level (e.g., 'VIP1' -> 1, default to 1 if no level)
          const currentVipNumber = profile.vip_level ? 
            parseInt(profile.vip_level.replace('VIP', '')) || 1 : 1;
          
          if (currentVipNumber < requiredVipLevel) {
            toast({
              title: "VIP Access Required",
              description: `This page requires VIP level ${requiredVipLevel} or higher. Your current level: ${profile.vip_level || 'VIP1'}`,
              variant: "destructive"
            });
            setIsAuthenticated(false);
            return;
          }
        }

      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location.pathname, requiredRole, requiredVipLevel]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};