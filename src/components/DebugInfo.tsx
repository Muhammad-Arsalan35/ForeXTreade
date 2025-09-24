import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const DebugInfo: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { isOnline, connectionType } = useNetworkStatus();
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) {
          setConnectionStatus('error');
          setLastError(error.message);
        } else {
          setConnectionStatus('connected');
          setLastError(null);
        }
      } catch (err) {
        setConnectionStatus('error');
        setLastError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    checkConnection();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Auth Loading:</span>
          <Badge variant={loading ? 'destructive' : 'default'}>
            {loading ? 'Loading' : 'Loaded'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>User:</span>
          <Badge variant={user ? 'default' : 'secondary'}>
            {user ? 'Logged In' : 'Not Logged In'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Profile:</span>
          <Badge variant={profile ? 'default' : 'secondary'}>
            {profile ? 'Loaded' : 'Not Loaded'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Network:</span>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Connection:</span>
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Type:</span>
          <Badge variant="outline">
            {connectionType}
          </Badge>
        </div>
        {lastError && (
          <div className="text-red-600 text-xs">
            Error: {lastError}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugInfo;
