import { useState } from "react";
import { Send, Loader2, Copy, X, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export const AIQAWidget = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      // Simulate AI response - replace with actual webhook call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnswer(`Here's information about "${question}": This is a simulated AI response providing details about Active Directory security concepts, attack techniques, and best practices. In a real implementation, this would connect to your AI agent webhook.`);
      toast({
        title: "AI Response Ready",
        description: "Your question has been answered."
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyAnswer = () => {
    navigator.clipboard.writeText(answer);
    toast({
      title: "Copied",
      description: "Answer copied to clipboard."
    });
  };

  const clearAll = () => {
    setQuestion("");
    setAnswer("");
  };

  return (
    <Card className="bg-gradient-glow border-primary/20 border-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ask AI</h3>
            <p className="text-xs text-muted-foreground">Get instant answers about AD security</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything about Active Directory, attacks, or using this dashboard..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-muted/30 border-border/50 focus:border-primary"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={!question.trim() || isLoading}
              className="bg-gradient-cyber hover:shadow-lg hover:shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {answer && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border/30">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm">AI Response:</h4>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAnswer}
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{answer}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};