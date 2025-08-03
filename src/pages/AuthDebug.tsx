import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';


export default function AuthDebug() {
  const { user, session, loading, authError, nuclearReset } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const collectDebugInfo = async () => {
    setRefreshing(true);
    
    const info: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      localStorage: {},
      sessionStorage: {},
      supabaseSession: null,
      databaseSessions: [],
    };

    // Collect storage data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('sb-') || key.includes('supabase') || key.includes('auth')) {
        info.localStorage[key] = localStorage.getItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('sb-') || key.includes('supabase') || key.includes('auth')) {
        info.sessionStorage[key] = sessionStorage.getItem(key);
      }
    });

    // Get current Supabase session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      info.supabaseSession = { session: session ? 'exists' : 'null', error };
    } catch (error) {
      info.supabaseSession = { error: error.message };
    }

    // Get database sessions if user exists
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .is('session_end', null)
          .order('created_at', { ascending: false })
          .limit(5);
        
        info.databaseSessions = { data, error };
      } catch (error) {
        info.databaseSessions = { error: error.message };
      }
    }

    setDebugInfo(info);
    setRefreshing(false);
  };

  useEffect(() => {
    collectDebugInfo();
  }, [user]);

  const clearSpecificStorage = (key: string, storage: 'local' | 'session') => {
    if (storage === 'local') {
      localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
    }
    collectDebugInfo();
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="secondary">Loading</Badge>;
    if (authError) return <Badge variant="destructive">Error</Badge>;
    if (user && session) return <Badge variant="default">Authenticated</Badge>;
    return <Badge variant="outline">Not Authenticated</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Authentication Debug</h1>
          <p className="text-muted-foreground">
            Diagnostic information for authentication issues
          </p>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Status
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground">{user?.id || 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Session</p>
                <p className="text-sm text-muted-foreground">{session ? 'Active' : 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Loading</p>
                <p className="text-sm text-muted-foreground">{loading ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Error</p>
                <p className="text-sm text-muted-foreground">{authError || 'None'}</p>
              </div>
            </div>

            {authError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={collectDebugInfo} disabled={refreshing} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Info
              </Button>
              <Button onClick={nuclearReset} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Nuclear Reset
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* localStorage */}
        <Card>
          <CardHeader>
            <CardTitle>LocalStorage Auth Data</CardTitle>
            <CardDescription>
              Authentication-related data in browser localStorage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(debugInfo.localStorage || {}).length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No auth data in localStorage (this is good!)
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(debugInfo.localStorage || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{key}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {typeof value === 'string' ? value.substring(0, 50) + '...' : String(value)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearSpecificStorage(key, 'local')}
                    >
                      Clear
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* sessionStorage */}
        <Card>
          <CardHeader>
            <CardTitle>SessionStorage Auth Data</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(debugInfo.sessionStorage || {}).length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No auth data in sessionStorage
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(debugInfo.sessionStorage || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{key}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {typeof value === 'string' ? value.substring(0, 50) + '...' : String(value)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearSpecificStorage(key, 'session')}
                    >
                      Clear
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Sessions */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Database Sessions</CardTitle>
              <CardDescription>
                Active user sessions in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo.databaseSessions?.data?.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No active sessions in database
                </div>
              ) : (
                <div className="space-y-2">
                  {debugInfo.databaseSessions?.data?.map((session: any) => (
                    <div key={session.id} className="p-2 border rounded">
                      <p className="text-sm font-medium">Session: {session.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(session.session_start).toLocaleString()}
                      </p>
                      {session.user_agent && (
                        <p className="text-xs text-muted-foreground truncate">
                          User Agent: {session.user_agent}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Raw Debug Data */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Debug Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-muted p-4 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}