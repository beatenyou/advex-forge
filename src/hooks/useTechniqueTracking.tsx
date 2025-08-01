import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TechniqueTrackingData {
  techniqueId: string;
  techniqueTitle: string;
  mitreId?: string;
  phase?: string;
  category?: string;
  additionalData?: Record<string, any>;
}

export const useTechniqueTracking = () => {
  const { user } = useAuth();

  const trackTechniqueActivity = async (
    activityType: string,
    techniqueData: TechniqueTrackingData
  ) => {
    if (!user) return;

    try {
      const description = `${activityType}: ${techniqueData.techniqueTitle}${
        techniqueData.mitreId ? ` (${techniqueData.mitreId})` : ''
      }${techniqueData.phase ? ` - Phase: ${techniqueData.phase}` : ''}`;

      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: activityType,
        description,
        ip_address: null, // Will be handled by edge functions if needed
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to track technique activity:', error);
    }
  };

  const trackTechniqueViewed = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_viewed', techniqueData);
  };

  const trackTechniqueFavorited = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_favorited', techniqueData);
  };

  const trackTechniqueUnfavorited = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_unfavorited', techniqueData);
  };

  const trackTechniqueCommandGenerated = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_command_generated', techniqueData);
  };

  const trackTechniqueAIQuery = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_ai_query', techniqueData);
  };

  const trackTechniqueMitreLinkAccessed = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_mitre_link_accessed', techniqueData);
  };

  const trackTechniqueModalOpened = (techniqueData: TechniqueTrackingData) => {
    trackTechniqueActivity('technique_modal_opened', techniqueData);
  };

  return {
    trackTechniqueViewed,
    trackTechniqueFavorited,
    trackTechniqueUnfavorited,
    trackTechniqueCommandGenerated,
    trackTechniqueAIQuery,
    trackTechniqueMitreLinkAccessed,
    trackTechniqueModalOpened
  };
};