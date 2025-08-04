import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatSystemValidation {
  isReady: boolean;
  isValidating: boolean;
  errors: string[];
  warnings: string[];
  canSendMessage: boolean;
  validationDetails: {
    hasUser: boolean;
    hasSession: boolean;
    hasSelectedModel: boolean;
    hasUsageQuota: boolean;
    modelsLoaded: boolean;
  };
  retry: () => void;
}

export const useChatSystemValidation = (): ChatSystemValidation => {
  const { user } = useAuth();
  const { selectedModel, selectedModelId, loading: modelsLoading, userModels } = useUserModelAccess();
  const { canUseAI, loading: usageLoading } = useAIUsage();
  const { currentSession } = useChatContext();
  
  const [isValidating, setIsValidating] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const validateSystem = useCallback(() => {
    setIsValidating(true);
    setErrors([]);
    setWarnings([]);

    const newErrors: string[] = [];
    const newWarnings: string[] = [];

    // Check user authentication
    if (!user) {
      newErrors.push('User not authenticated');
    }

    // Check if models are loaded
    if (modelsLoading) {
      newWarnings.push('AI models are still loading');
    } else if (!userModels || userModels.length === 0) {
      newErrors.push('No AI models available');
    } else if (!selectedModelId) {
      newErrors.push('No AI model selected');
    } else if (!selectedModel) {
      newErrors.push('Selected AI model not found');
    }

    // Check usage quota
    if (usageLoading) {
      newWarnings.push('Usage quota is being checked');
    } else if (!canUseAI) {
      newErrors.push('AI usage quota exceeded');
    }

    // Check session
    if (!currentSession) {
      newWarnings.push('Chat session not initialized');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setIsValidating(false);
  }, [user, modelsLoading, userModels, selectedModelId, selectedModel, usageLoading, canUseAI, currentSession]);

  // Validate on component mount and when dependencies change
  useEffect(() => {
    validateSystem();
  }, [validateSystem]);

  // Auto-retry validation when loading states change
  useEffect(() => {
    if (!modelsLoading && !usageLoading && isValidating) {
      validateSystem();
    }
  }, [modelsLoading, usageLoading, isValidating, validateSystem]);

  const validationDetails = {
    hasUser: !!user,
    hasSession: !!currentSession,
    hasSelectedModel: !!selectedModel && !!selectedModelId,
    hasUsageQuota: canUseAI,
    modelsLoaded: !modelsLoading && userModels && userModels.length > 0
  };

  const isReady = errors.length === 0 && !isValidating && !modelsLoading && !usageLoading;
  const canSendMessage = isReady && validationDetails.hasUser && validationDetails.hasSelectedModel && validationDetails.hasUsageQuota;

  return {
    isReady,
    isValidating: isValidating || modelsLoading || usageLoading,
    errors,
    warnings,
    canSendMessage,
    validationDetails,
    retry: validateSystem
  };
};