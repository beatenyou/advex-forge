import { useState, useEffect } from "react";
import { Send, Loader2, Copy, X, Bot, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkTab {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

export const AIQAWidget = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkTabs, setLinkTabs] = useState<LinkTab[]>([]);

  useEffect(() => {
    fetchLinkTabs();
  }, []);

  const fetchLinkTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_link_tabs')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setLinkTabs(data || []);
    } catch (error) {
      console.error('Error fetching link tabs:', error);
    }
  };

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

  const groupedTabs = linkTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, LinkTab[]>);

  const hasLinkTabs = linkTabs.length > 0;

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

        {hasLinkTabs && (
          <Tabs defaultValue="chat" className="w-full mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Ask AI</TabsTrigger>
              <TabsTrigger value="links">Quick Links</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="mt-4">
              <AIQuestionForm 
                question={question}
                setQuestion={setQuestion}
                answer={answer}
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                copyAnswer={copyAnswer}
                clearAll={clearAll}
              />
            </TabsContent>
            <TabsContent value="links" className="mt-4">
              <div className="space-y-3">
                {Object.entries(groupedTabs).map(([category, tabs]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-foreground mb-2">{category}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {tabs.map((tab) => (
                        <a
                          key={tab.id}
                          href={tab.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/50 hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-primary" />
                            <div>
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {tab.title}
                              </span>
                              {tab.description && (
                                <p className="text-xs text-muted-foreground">{tab.description}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {tab.category}
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className={hasLinkTabs ? "hidden" : "space-y-3"}>
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

const AIQuestionForm = ({ 
  question, 
  setQuestion, 
  answer, 
  isLoading, 
  handleSubmit, 
  copyAnswer, 
  clearAll 
}: {
  question: string;
  setQuestion: (q: string) => void;
  answer: string;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  copyAnswer: () => void;
  clearAll: () => void;
}) => (
  <div className="space-y-3">
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
        onClick={handleSubmit}
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
  </div>
);