import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserSession } from '@/hooks/useUserSession';

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
  referral_code: string;
  referred_by?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getUserRole: () => string;
  getVipLevel: () => number;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVip: boolean;
  vipLevel: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { endSession } = useUserSession();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, setting user state');
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, clearing state');
          // End session before clearing state
          await endSession();
          setUser(null);
          setProfile(null);
          // Clear any stored user data
          localStorage.removeItem('userData');
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('AuthProvider: Token refreshed, updating user state');
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Fetching user profile for:', userId);
      
      // Try to fetch user profile with a shorter timeout
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('AuthProvider: Error fetching user profile:', error);
        
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          console.log('AuthProvider: User profile not found, creating default profile');
          const defaultProfile = {
            auth_user_id: userId,
            full_name: 'User',
            username: 'user',
            phone_number: '',
            vip_level: 'VIP1',
            user_status: 'active',
            referral_code: Math.floor(100000 + Math.random() * 900000).toString()
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert(defaultProfile)
            .select()
            .single();
            
          if (insertError) {
            console.error('AuthProvider: Error creating default profile:', insertError);
            setProfile(defaultProfile as any);
          } else {
            console.log('AuthProvider: Default profile created:', insertData);
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

      console.log('AuthProvider: User profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('AuthProvider: Error fetching user profile:', error);
      
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
      // End session first
      await endSession();
      
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

  const value: AuthContextType = {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
