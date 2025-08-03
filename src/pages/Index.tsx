import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

const Index = () => {
  const { user, loading, nuclearReset, authError } = useAuth();
  const navigate = useNavigate();

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
              <span className="text-lg">Loading...</span>
            </div>
            
            {authError && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Authentication Issue Detected</span>
                </div>
                <p className="text-sm text-muted-foreground">{authError}</p>
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={nuclearReset}
                    variant="destructive"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nuclear Reset & Fix
                  </Button>
                  <Button 
                    onClick={() => navigate("/auth")}
                    variant="default"
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <Button 
                onClick={nuclearReset}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Having trouble? Nuclear Reset
              </Button>
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
