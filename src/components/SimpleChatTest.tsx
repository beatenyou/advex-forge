import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

export const SimpleChatTest = () => {
  const [message, setMessage] = useState('Hello, how are you?');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testChat = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      console.log('🧪 Testing AI chat with message:', message);
      
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: message.trim(),
          sessionId: `test-${Date.now()}`,
          selectedModelId: ''
        }
      });

      if (error) {
        console.error('❌ Chat test error:', error);
        setResponse(`Error: ${error.message}`);
        toast({
          title: "Chat Test Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Chat test success:', data);
        setResponse(data?.message || JSON.stringify(data, null, 2));
        toast({
          title: "Chat Test Success",
          description: "AI responded successfully",
        });
      }
    } catch (error: any) {
      console.error('💥 Chat test exception:', error);
      setResponse(`Exception: ${error.message}`);
      toast({
        title: "Chat Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Chat Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter test message..."
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && testChat()}
          />
          <Button onClick={testChat} disabled={isLoading || !message.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {response && (
          <div className="p-3 bg-muted rounded border">
            <h4 className="font-medium mb-2">Response:</h4>
            <pre className="whitespace-pre-wrap text-sm">{response}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};