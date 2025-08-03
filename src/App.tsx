import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAnalytics } from "@/hooks/useAnalytics";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { ChatProvider } from "@/contexts/ChatContext";
import { useMaintenanceCheck } from "@/hooks/useMaintenanceCheck";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminStats from "./pages/AdminStats";
import UserPreferences from "./pages/UserPreferences";
import FullScreenChat from "./pages/FullScreenChat";
import AttackPlans from "./pages/AttackPlans";
// import AuthDebug from "./pages/AuthDebug"; // Removed - using simplified auth
import NotFound from "./pages/NotFound";
import { MaintenancePage } from "./pages/MaintenancePage";

// Component to initialize tracking (without immediate auth dependency)
function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useAnalytics();
  const performance = usePerformanceMonitoring();
  
  // Don't use the returned values to prevent re-renders
  return <>{children}</>;
}

// Component to handle maintenance mode routing
function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const { maintenanceData, shouldRedirect, loading } = useMaintenanceCheck();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (shouldRedirect && maintenanceData) {
    return (
      <MaintenancePage
        title={maintenanceData.maintenance_title}
        message={maintenanceData.maintenance_message}
        estimatedCompletion={maintenanceData.estimated_completion}
        contactInfo={maintenanceData.contact_info}
      />
    );
  }

  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatProvider>
        <AnalyticsProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MaintenanceWrapper>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/preferences" element={
                  <ProtectedRoute>
                    <UserPreferences />
                  </ProtectedRoute>
                } />
                <Route path="/admin/stats" element={
                  <ProtectedRoute>
                    <RoleGuard requiredRole="admin">
                      <AdminStats />
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                <Route path="/attack-plans" element={
                  <ProtectedRoute>
                    <RoleGuard requiredRole="pro">
                      <AttackPlans />
                    </RoleGuard>
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <FullScreenChat />
                  </ProtectedRoute>
                } />
                <Route path="/chat/:sessionId" element={
                  <ProtectedRoute>
                    <FullScreenChat />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MaintenanceWrapper>
          </BrowserRouter>
          </TooltipProvider>
        </AnalyticsProvider>
      </ChatProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
