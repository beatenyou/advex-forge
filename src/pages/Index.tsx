import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, error, retry } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Index: Auth state changed - loading:', loading, 'user:', !!user, 'error:', !!error);
    if (!loading && !user) {
      console.log('Index: No user found, redirecting to auth');
      navigate("/auth");
    }
  }, [user, loading, navigate, error]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-border/50 shadow-lg shadow-primary/5">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg">Loading...</span>
              </div>
              <div className="text-center space-y-3">
                {error && <p className="text-sm text-destructive max-w-md">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={retry} variant="outline" size="sm">
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => navigate('/auth')} 
                    variant="default" 
                    size="sm"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => {
                      // Emergency escape - clear storage and force auth page
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.href = '/auth';
                    }} 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    Reset & Continue
                  </Button>
                </div>
              </div>
            </div>
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
