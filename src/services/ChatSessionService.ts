// ============= Chat Session Service =============

import { supabase } from "@/integrations/supabase/client";
import { ChatMessage, ChatSession } from "@/types/chat";

export class ChatSessionService {
  private static instance: ChatSessionService;

  static getInstance(): ChatSessionService {
    if (!ChatSessionService.instance) {
      ChatSessionService.instance = new ChatSessionService();
    }
    return ChatSessionService.instance;
  }

  async createSession(userId: string, title = 'New Conversation'): Promise<ChatSession> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ ChatSessionService: Session created', data.id);
      return data as ChatSession;
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to create session', error);
      throw new Error('Failed to create chat session');
    }
  }

  async loadSession(sessionId: string, userId: string): Promise<ChatSession> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      console.log('✅ ChatSessionService: Session loaded', sessionId);
      return data as ChatSession;
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to load session', sessionId, error);
      throw new Error('Failed to load chat session');
    }
  }

  async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('✅ ChatSessionService: Messages loaded', {
        sessionId,
        count: data?.length || 0
      });
      
      return (data || []) as ChatMessage[];
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to load messages', sessionId, error);
      throw new Error('Failed to load messages');
    }
  }

  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    providerName?: string,
    tokensUsed?: number
  ): Promise<ChatMessage> {
    try {
      const messageData = {
        session_id: sessionId,
        role,
        content,
        ...(providerName && { provider_name: providerName }),
        ...(tokensUsed && { tokens_used: tokensUsed })
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ ChatSessionService: Message saved', {
        sessionId,
        role,
        messageId: data.id
      });

      return data as ChatMessage;
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to save message', {
        sessionId,
        role,
        error
      });
      throw new Error('Failed to save message');
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      const truncatedTitle = title.length > 50 
        ? title.substring(0, 50) + "..." 
        : title;

      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: truncatedTitle })
        .eq('id', sessionId);

      if (error) throw error;

      console.log('✅ ChatSessionService: Session title updated', {
        sessionId,
        title: truncatedTitle
      });
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to update session title', {
        sessionId,
        title,
        error
      });
      // Don't throw here as title updates are not critical
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // Delete messages first
      await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      // Delete session
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('✅ ChatSessionService: Session deleted', sessionId);
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to delete session', sessionId, error);
      throw new Error('Failed to delete session');
    }
  }

  async deleteAllSessions(userId: string): Promise<void> {
    try {
      // Get all session IDs first
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);

        // Delete all messages for these sessions
        await supabase
          .from('chat_messages')
          .delete()
          .in('session_id', sessionIds);

        // Delete all sessions
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      }

      console.log('✅ ChatSessionService: All sessions deleted for user', userId);
    } catch (error) {
      console.error('❌ ChatSessionService: Failed to delete all sessions', userId, error);
      throw new Error('Failed to delete all sessions');
    }
  }
}

export const chatSessionService = ChatSessionService.getInstance();