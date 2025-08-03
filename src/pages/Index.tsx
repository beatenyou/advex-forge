import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

const Index = () => {
  const { 
    user, 
    loading, 
    authError, 
    isRecovering, 
    recoverSession, 
    emergencyAdminAccess 
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if not loading, no user, no error, and not recovering
    if (!loading && !user && !authError && !isRecovering) {
      console.log('No authenticated user, redirecting to auth');
      navigate("/auth", { replace: true });
    }
  }, [loading, user, authError, isRecovering, navigate]);

  // Handle emergency admin access
  const handleEmergencyAccess = async () => {
    const success = await emergencyAdminAccess();
    if (!success) {
      navigate("/auth");
    }
  };

  // Show loading state
  if (loading || isRecovering) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 shadow-lg shadow-primary/5 max-w-md w-full">
          <CardContent className="text-center p-8 space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">
                {isRecovering ? "Recovering session..." : "Loading..."}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state with recovery options
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border/50 shadow-lg shadow-primary/5 max-w-md w-full">
          <CardContent className="text-center p-8 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Authentication Error</h1>
            <p className="text-muted-foreground">
              There was a problem with your session
            </p>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                onClick={recoverSession} 
                variant="outline"
                className="w-full"
                disabled={isRecovering}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Recovery
              </Button>
              
              <Button 
                onClick={() => navigate("/auth")} 
                variant="cyber"
                className="w-full"
              >
                Sign In Again
              </Button>
              
              {window.location.hash === '#admin-emergency' && (
                <Button 
                  onClick={handleEmergencyAccess} 
                  variant="secondary"
                  className="w-full"
                >
                  Emergency Admin Access
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign-in prompt if no user
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