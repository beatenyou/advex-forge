import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

const Index = () => {
  const { 
    user, 
    loading, 
    nuclearReset, 
    authError, 
    isStuck, 
    forceRestore,
    authInitialized,
    redirecting,
    redirectCount,
    debugInfo,
    incrementRedirectCount
  } = useAuth();
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Simple redirect logic: only redirect once when auth is ready and no user
    if (authInitialized && !loading && !user && !authError && !isStuck) {
      console.log('Redirecting to auth page - no authenticated user');
      navigate("/auth", { replace: true });
    }
  }, [authInitialized, loading, user, authError, isStuck, navigate]);

  // Show loading state
  if (loading || !authInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 shadow-lg shadow-primary/5 max-w-md w-full">
          <CardContent className="text-center p-8 space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">
                {redirecting ? 'Redirecting...' : 'Loading authentication...'}
              </span>
            </div>

            {redirectCount >= 3 && (
              <div className="space-y-4 text-left">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">Redirect Loop Detected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Circuit breaker activated after {redirectCount} redirect attempts. Please try manual recovery.
                </p>
                <Button 
                  onClick={() => navigate("/auth")}
                  variant="default"
                  className="w-full"
                >
                  Manual Login
                </Button>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Auth Initialized: {authInitialized ? 'Yes' : 'No'}</p>
              <p>Redirect Count: {redirectCount}/3</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              <p>User: {user ? 'Authenticated' : 'None'}</p>
              <p>Redirecting: {redirecting ? 'Yes' : 'No'}</p>
              {showDebug && (
                <div className="mt-2 p-2 bg-muted/20 rounded text-left">
                  <pre className="text-xs">
                    {JSON.stringify({ 
                      loading, 
                      hasUser: !!user, 
                      hasError: !!authError, 
                      authInitialized,
                      redirectCount,
                      redirecting 
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowDebug(!showDebug)}
                variant="outline"
                size="sm"
              >
                {showDebug ? 'Hide' : 'Show'} Debug
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>

            {debugInfo.length > 0 && (
              <div className="text-xs space-y-1 p-2 bg-muted/20 rounded text-left max-h-32 overflow-y-auto">
                <div className="font-medium">Debug Log:</div>
                {debugInfo.map((info, index) => (
                  <div key={index} className="text-muted-foreground">{info}</div>
                ))}
              </div>
            )}
            
            {(authError || isStuck) && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">
                    {isStuck ? 'Authentication Stuck' : 'Authentication Issue'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {authError || 'Authentication is taking longer than expected. Try force restore or reset.'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate("/auth")}
                    variant="default"
                    className="flex-1"
                  >
                    Go to Login
                  </Button>
                  {isStuck && (
                    <Button 
                      onClick={forceRestore}
                      variant="outline"
                      size="sm"
                    >
                      Force Restore
                    </Button>
                  )}
                  <Button 
                    onClick={nuclearReset}
                    variant="destructive"
                    size="sm"
                  >
                    Reset Auth
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 shadow-lg shadow-primary/5 max-w-md w-full">
          <CardContent className="text-center p-8 space-y-4">
            <Shield className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold bg-gradient-cyber bg-clip-text text-transparent">
              AD Dashboard
            </h1>
            <p className="text-muted-foreground">
              Please sign in to access the Active Directory Attack & Enumeration Platform
            </p>
            <Button 
              onClick={() => navigate("/auth")} 
              variant="cyber" 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
};

export default Index;
