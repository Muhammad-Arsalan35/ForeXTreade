import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RefreshConfig {
  tables: string[];
  onDataChange?: (table: string, data: any) => void;
  throttleMs?: number;
}

export const useDataRefresh = (config: RefreshConfig) => {
  const { user } = useAuth();
  const channelsRef = useRef<Map<string, any>>(new Map());
  const lastRefreshRef = useRef<Map<string, number>>(new Map());
  const throttleMs = config.throttleMs || 1000;

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((channel, table) => {
      try {
        (supabase as any).removeChannel(channel);
      } catch (error) {
        console.warn(`Failed to remove channel for ${table}:`, error);
      }
    });
    channelsRef.current.clear();
    lastRefreshRef.current.clear();
  }, []);

  const setupRealtimeSubscription = useCallback(async (table: string) => {
    if (!user || channelsRef.current.has(table)) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!dbUser) return;

      const channel = (supabase as any)
        .channel(`rt-${table}-${dbUser.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: table,
            filter: `user_id=eq.${dbUser.id}`
          }, 
          (payload: any) => {
            const now = Date.now();
            const lastRefresh = lastRefreshRef.current.get(table) || 0;
            
            if (now - lastRefresh > throttleMs) {
              lastRefreshRef.current.set(table, now);
              config.onDataChange?.(table, payload);
            }
          }
        )
        .subscribe();

      channelsRef.current.set(table, channel);
    } catch (error) {
      console.error(`Failed to setup realtime subscription for ${table}:`, error);
    }
  }, [user, config, throttleMs]);

  const refreshData = useCallback(async (table: string) => {
    if (!user) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!dbUser) return;

      // Trigger a manual refresh by calling the onDataChange callback
      config.onDataChange?.(table, { new: null, old: null, eventType: 'REFRESH' });
    } catch (error) {
      console.error(`Failed to refresh data for ${table}:`, error);
    }
  }, [user, config]);

  const refreshAllData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!dbUser) return;

      // Trigger refresh for all tables
      config.tables.forEach(table => {
        config.onDataChange?.(table, { new: null, old: null, eventType: 'REFRESH' });
      });
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    }
  }, [user, config]);

  // Setup subscriptions on mount
  useEffect(() => {
    if (user && config.tables.length > 0) {
      config.tables.forEach(table => {
        setupRealtimeSubscription(table);
      });
    }

    return cleanup;
  }, [user, config.tables, setupRealtimeSubscription, cleanup]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh all data
        refreshAllData();
      }
    };

    const handleFocus = () => {
      // Window gained focus, refresh all data
      refreshAllData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAllData]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      // Connection restored, refresh all data
      refreshAllData();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshAllData]);

  return {
    refreshData,
    refreshAllData,
    cleanup
  };
};
