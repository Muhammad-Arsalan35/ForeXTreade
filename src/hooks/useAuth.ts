import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email?: string;
  phone?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  vip_level: string;
  user_status: string;
  phone_number: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('useAuth: Getting initial session...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('useAuth: Initial session result:', session?.user?.id ? 'User found' : 'No user');
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        console.log('useAuth: Setting loading to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          // Clear any stored user data
          localStorage.removeItem('userData');
          // Redirect to login
          navigate('/login', { replace: true });
          toast({
            title: "Logged Out",
            description: "You have been logged out successfully.",
          });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const fetchUserProfile = async (userId: string) => {
    console.log('useAuth: Fetching user profile for:', userId);
    try {
      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
      console.log('useAuth: Profile fetch result:', error ? 'Error' : 'Success');

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, create a default one with 0.00 values
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating default profile');
          const defaultProfile = {
            auth_user_id: userId,
            full_name: 'User',
            username: 'user',
            phone_number: '',
            vip_level: 'VIP1',
            user_status: 'active',
            referral_code: Math.floor(100000 + Math.random() * 900000).toString(),
            personal_wallet_balance: 0.00,
            income_wallet_balance: 0.00,
            total_earnings: 0.00,
            tasks_completed_today: 0,
            daily_task_limit: 5,
            referral_count: 0,
            position_title: 'Member'
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert(defaultProfile)
            .select()
            .single();
            
          if (insertError) {
            console.error('Error creating default profile:', insertError);
            setProfile(defaultProfile as any);
          } else {
            console.log('Default profile created:', insertData);
            setProfile(insertData);
          }
        } else {
          // For other errors, set a minimal profile to prevent blocking
          const minimalProfile = {
            auth_user_id: userId,
            full_name: 'User',
            username: 'user',
            phone_number: '',
            vip_level: 'VIP1',
            user_status: 'active',
            referral_code: Math.floor(100000 + Math.random() * 900000).toString()
          };
          setProfile(minimalProfile as any);
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set a minimal profile to prevent blocking
      const minimalProfile = {
        auth_user_id: userId,
        full_name: 'User',
        username: 'user',
        phone_number: '',
        vip_level: 'VIP1',
        user_status: 'active',
        referral_code: Math.floor(100000 + Math.random() * 900000).toString()
      };
      setProfile(minimalProfile as any);
    }
  };

  const signOut = async () => {
    try {
      // Clear task completion cache
      const { taskCompletionService } = await import('@/services/taskCompletionService');
      taskCompletionService.clearCache();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserRole = () => {
    if (!profile) return 'user';
    return profile.vip_level === 'VIP10' ? 'admin' : 
           profile.vip_level && profile.vip_level !== 'VIP1' ? 'vip' : 'user';
  };

  const getVipLevel = () => {
    if (!profile?.vip_level) return 1;
    return parseInt(profile.vip_level.replace('VIP', '')) || 1;
  };

  return {
    user,
    profile,
    loading,
    signOut,
    getUserRole,
    getVipLevel,
    isAuthenticated: !!user,
    isAdmin: getUserRole() === 'admin',
    isVip: getUserRole() === 'vip',
    vipLevel: getVipLevel()
  };
};


