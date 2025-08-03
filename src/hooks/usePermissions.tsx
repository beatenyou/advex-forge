import { useUser, UserRole } from './useUser';

export function usePermissions() {
  const { profile, loading } = useUser();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!profile) return false;
    
    const userRole = profile.role_enum;
    
    switch (requiredRole) {
      case 'admin':
        return userRole === 'admin';
      case 'pro':
        return userRole === 'pro' || userRole === 'admin';
      case 'user':
        return userRole === 'user' || userRole === 'pro' || userRole === 'admin';
      default:
        return false;
    }
  };

  const isAdmin = hasRole('admin');
  const isProUser = hasRole('pro');
  const isUser = hasRole('user');

  return {
    profile,
    loading,
    hasRole,
    isAdmin,
    isProUser,
    isUser,
    canAccessAdminDashboard: isAdmin,
    canAccessAttackPlans: isProUser,
    canAccessMainDashboard: isUser
  };
}