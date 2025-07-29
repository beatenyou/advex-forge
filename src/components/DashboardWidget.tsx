import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardWidgetProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DashboardWidget = ({ 
  title, 
  icon: Icon, 
  children, 
  className = '',
  size = 'md'
}: DashboardWidgetProps) => {
  const sizeClasses = {
    sm: 'min-h-[200px]',
    md: 'min-h-[300px]',
    lg: 'min-h-[400px]'
  };

  return (
    <Card className={`${sizeClasses[size]} ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {children}
      </CardContent>
    </Card>
  );
};