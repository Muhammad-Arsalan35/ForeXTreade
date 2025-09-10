import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SessionData {
  sessionId: string;
  isActive: boolean;
  loginTime: Date;
  lastActivity: Date;
}

export const useUserSession = () => {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const sessionIdRef = useRef<string>('');
  const isInitializedRef = useRef<boolean>(false);

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const initializeSession = async () => {
    if (!user || isInitializedRef.current) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (dbUser) {
        sessionIdRef.current = generateSessionId();
        isInitializedRef.current = true;

        // Start session in database
        await (supabase as any).rpc('start_user_session', {
          p_user_id: dbUser.id,
          p_session_id: sessionIdRef.current,
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });

        setSessionData({
          sessionId: sessionIdRef.current,
          isActive: true,
          loginTime: new Date(),
          lastActivity: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const updateLastActivity = async () => {
    if (!user || !sessionIdRef.current) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (dbUser) {
        await (supabase as any)
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', sessionIdRef.current)
          .eq('is_active', true);

        setSessionData(prev => prev ? {
          ...prev,
          lastActivity: new Date()
        } : null);
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  };

  const endSession = async () => {
    if (!sessionIdRef.current) return;

    try {
      await (supabase as any).rpc('end_user_session', {
        p_session_id: sessionIdRef.current
      });

      setSessionData(prev => prev ? {
        ...prev,
        isActive: false
      } : null);

      sessionIdRef.current = '';
      isInitializedRef.current = false;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const refreshSessionData = async () => {
    if (!user || !sessionIdRef.current) return;

    try {
      const { data: session } = await (supabase as any)
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionIdRef.current)
        .eq('is_active', true)
        .single();

      if (session) {
        setSessionData({
          sessionId: session.session_id,
          isActive: session.is_active,
          loginTime: new Date(session.login_at),
          lastActivity: new Date(session.last_activity_at)
        });
      }
    } catch (error) {
      console.error('Failed to refresh session data:', error);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (user) {
      initializeSession();
    }

    return () => {
      if (isInitializedRef.current) {
        endSession();
      }
    };
  }, [user]);

  // Update last activity on user interaction
  useEffect(() => {
    const handleUserActivity = () => {
      updateLastActivity();
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden, update last activity
        updateLastActivity();
      } else {
        // Page visible, refresh session data
        refreshSessionData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitializedRef.current) {
        endSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    sessionData,
    sessionId: sessionIdRef.current,
    updateLastActivity,
    endSession,
    refreshSessionData
  };
};
