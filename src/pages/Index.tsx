import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

const Index = () => {
  const { user, loading, nuclearReset, authError, isStuck, forceRestore } = useAuth();
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 shadow-lg shadow-primary/5 max-w-md w-full">
          <CardContent className="text-center p-8 space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Loading authentication...</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Status: {loading ? 'Loading' : 'Ready'}</p>
              <p>User: {user ? 'Authenticated' : 'Not authenticated'}</p>
              {showDebug && (
                <div className="mt-2 p-2 bg-muted/20 rounded text-left">
                  <pre className="text-xs">
                    {JSON.stringify({ loading, hasUser: !!user, hasError: !!authError }, null, 2)}
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
