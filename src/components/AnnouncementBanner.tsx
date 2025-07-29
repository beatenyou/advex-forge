import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  target_audience: string;
}

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchAnnouncements();
      loadDismissedBanners();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchAnnouncements = async () => {
    if (!user) return;

    try {
      // Fetch active announcements based on user role
      let query = supabase
        .from('announcements')
        .select('id, title, message, type, priority, target_audience')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filter announcements based on target audience and user role
      const filteredData = (data?.filter(announcement => {
        if (announcement.target_audience === 'all') return true;
        if (announcement.target_audience === 'admins' && isAdmin) return true;
        if (announcement.target_audience === 'users' && !isAdmin) return true;
        return false;
      }) || []) as Announcement[];

      setAnnouncements(filteredData);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const loadDismissedBanners = () => {
    const dismissed = localStorage.getItem('dismissedBanners');
    if (dismissed) {
      setDismissedBanners(new Set(JSON.parse(dismissed)));
    }
  };

  const saveDismissedBanners = (banners: Set<string>) => {
    localStorage.setItem('dismissedBanners', JSON.stringify([...banners]));
  };

  const dismissBanner = async (announcementId: string) => {
    const newDismissed = new Set(dismissedBanners);
    newDismissed.add(announcementId);
    setDismissedBanners(newDismissed);
    saveDismissedBanners(newDismissed);

    // Record the view in the database
    if (user) {
      try {
        await supabase
          .from('user_announcement_views')
          .upsert({ 
            user_id: user.id, 
            announcement_id: announcementId 
          }, { onConflict: 'user_id,announcement_id' });
      } catch (error) {
        console.error('Error recording announcement view:', error);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getBannerStyles = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';
    }
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedBanners.has(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            'relative flex items-start gap-3 p-4 border rounded-lg shadow-sm',
            getBannerStyles(announcement.type)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(announcement.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{announcement.title}</h3>
            <p className="text-sm mt-1 leading-relaxed">{announcement.message}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-6 w-6 p-0 hover:bg-background/50"
            onClick={() => dismissBanner(announcement.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}