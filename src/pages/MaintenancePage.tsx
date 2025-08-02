import React from 'react';
import { Clock, Mail, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenancePageProps {
  title?: string;
  message?: string;
  estimatedCompletion?: string;
  contactInfo?: string;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  title = 'Site Under Maintenance',
  message = 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.',
  estimatedCompletion,
  contactInfo
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/95 backdrop-blur">
        <CardContent className="p-8 text-center">
          {/* Maintenance Icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-primary animate-pulse" />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {title}
          </h1>
          
          {/* Message */}
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {message}
          </p>
          
          {/* Estimated Completion */}
          {estimatedCompletion && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-foreground">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Estimated Completion</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(estimatedCompletion).toLocaleString()}
              </p>
            </div>
          )}
          
          {/* Contact Information */}
          {contactInfo && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-foreground mb-2">
                <Mail className="w-5 h-5" />
                <span className="font-medium">Need Help?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {contactInfo}
              </p>
            </div>
          )}
          
          {/* Footer */}
          <div className="pt-6 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Thank you for your patience while we improve our services.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};