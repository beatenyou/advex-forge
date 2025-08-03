import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/hooks/useUser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: UserRole;
  fallback?: ReactNode;
}

export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const { hasRole, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. 
            {requiredRole === 'pro' && ' Upgrade to Pro to access Attack Plans.'}
            {requiredRole === 'admin' && ' Admin access required.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}