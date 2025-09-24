import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
}

export const ErrorDebug: React.FC = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Checking...');
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setErrors(prev => [...prev, {
        message: errorMessage,
        timestamp: new Date()
      }]);
      
      originalError(...args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      setErrors(prev => [...prev, {
        message: event.message,
        stack: event.error?.stack,
        timestamp: new Date()
      }]);
    };

    window.addEventListener('error', handleError);

    // Test database connection
    testDbConnection();

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
    };
  }, []);

  const testDbConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        setDbStatus(`Database Error: ${error.message}`);
      } else {
        setDbStatus('Database connection OK');
      }
    } catch (err) {
      setDbStatus(`Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Authentication Status:</h3>
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>User: {user ? `${user.email} (${user.id})` : 'Not authenticated'}</p>
            <p>Profile: {profile ? `${profile.username} (VIP: ${profile.vip_level})` : 'No profile'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Database Status:</h3>
            <p>{dbStatus}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Environment:</h3>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set'}</p>
            <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Errors ({errors.length}):</h3>
              <Button onClick={clearErrors} variant="outline" size="sm">
                Clear Errors
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {errors.length === 0 ? (
                <p className="text-gray-500">No errors captured</p>
              ) : (
                errors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 p-2 rounded text-sm">
                    <div className="font-mono text-red-800">{error.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {error.timestamp.toLocaleTimeString()}
                    </div>
                    {error.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs">Stack trace</summary>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">{error.stack}</pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};