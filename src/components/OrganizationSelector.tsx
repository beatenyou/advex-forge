import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Shield } from 'lucide-react';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

export function OrganizationSelector() {
  const { currentOrganization, availableOrganizations, setCurrentOrganization, loading } = useOrganizationContext();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        Loading organizations...
      </div>
    );
  }

  if (availableOrganizations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        No organizations
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3" />;
      case 'admin': return <Shield className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4" />
        <span className="text-muted-foreground">Organization:</span>
      </div>
      
      <Select 
        value={currentOrganization?.id || ''} 
        onValueChange={setCurrentOrganization}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select organization">
            {currentOrganization && (
              <div className="flex items-center gap-2">
                <span>{currentOrganization.name}</span>
                <Badge variant="outline" className="text-xs">
                  <div className="flex items-center gap-1">
                    {getRoleIcon(currentOrganization.role)}
                    {currentOrganization.role}
                  </div>
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableOrganizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center gap-2 w-full">
                <span>{org.name}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  <div className="flex items-center gap-1">
                    {getRoleIcon(org.role)}
                    {org.role}
                  </div>
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentOrganization && (
        <div className="text-xs text-muted-foreground">
          Managing: <span className="font-medium">{currentOrganization.name}</span>
        </div>
      )}
    </div>
  );
}