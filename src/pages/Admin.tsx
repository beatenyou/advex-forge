import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ResponsiveDashboard } from "@/components/ResponsiveDashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-border/50 shadow-lg shadow-primary/5">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Loading...</span>
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
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Please sign in to access the admin dashboard
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
      <ResponsiveDashboard />
    </MainLayout>
  );
};

export default Admin;