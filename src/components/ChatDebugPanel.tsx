import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bug, 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAIChatDebugger } from '@/hooks/useAIChatDebugger';
import { useAIChatErrorHandler } from '@/hooks/useAIChatErrorHandler';

interface ChatDebugPanelProps {
  sessionId?: string;
  messageCount?: number;
  totalTokensUsed?: number;
}

export const ChatDebugPanel = ({ 
  sessionId, 
  messageCount = 0, 
  totalTokensUsed = 0 
}: ChatDebugPanelProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const {
    debugMode,
    requestHistory,
    sessionDebugInfo,
    getPerformanceAnalytics,
    toggleDebugMode,
    clearDebugHistory,
    updateSessionDebugInfo
  } = useAIChatDebugger();

  const {
    lastError,
    errorHistory,
    getErrorPatterns,
    clearErrorHistory
  } = useAIChatErrorHandler();

  // Update session info when props change
  React.useEffect(() => {
    if (sessionId) {
      updateSessionDebugInfo(sessionId, messageCount, totalTokensUsed);
    }
  }, [sessionId, messageCount, totalTokensUsed, updateSessionDebugInfo]);

  const performanceAnalytics = getPerformanceAnalytics();
  const errorPatterns = getErrorPatterns();

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="shadow-lg"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[600px] max-w-[90vw] max-h-[80vh] z-50 shadow-xl border-2 border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span className="font-semibold">AI Chat Debug</span>
            <Badge variant={debugMode ? "default" : "secondary"}>
              {debugMode ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button
              onClick={toggleDebugMode}
              size="sm"
              variant="ghost"
            >
              {debugMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
            >
              ×
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 px-3 flex-shrink-0">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">Errors</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="space-y-3 pt-2">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Session Info</span>
                      <Button onClick={clearDebugHistory} size="sm" variant="ghost">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {sessionDebugInfo && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Session ID:</span>
                          <span className="font-mono text-xs">{sessionDebugInfo.sessionId.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Messages:</span>
                          <span>{sessionDebugInfo.messageCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tokens Used:</span>
                          <span>{sessionDebugInfo.totalTokensUsed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Response:</span>
                          <span>{sessionDebugInfo.averageResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className={sessionDebugInfo.successRate > 90 ? "text-green-600" : "text-yellow-600"}>
                            {sessionDebugInfo.successRate.toFixed(1)}%
                          </span>
                        </div>
                        {sessionDebugInfo.memoryUsage && (
                          <div className="flex justify-between">
                            <span>Memory:</span>
                            <span>{(sessionDebugInfo.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {lastError && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-red-600">Last Error</span>
                      <div className="bg-red-50 p-2 rounded text-xs">
                        <div className="font-medium">{lastError.type}</div>
                        <div className="text-red-700">{lastError.message}</div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="space-y-2 pt-2">
                  {requestHistory.slice(-20).reverse().map((request) => (
                    <Collapsible key={request.requestId}>
                      <CollapsibleTrigger className="w-full">
                        <div className="border rounded p-2 text-xs text-left hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <span className="font-mono break-all">{request.requestId.slice(0, 12)}</span>
                            <div className="flex items-center space-x-1">
                              {request.success ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span>{request.duration?.toFixed(0)}ms</span>
                            </div>
                          </div>
                          <div className="text-gray-600 break-words">
                            Model: {request.modelId.slice(0, 25)}...
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="text-xs bg-muted/20 p-2 rounded mt-1">
                        <div className="space-y-1 break-words">
                          {request.tokensUsed && (
                            <div className="text-gray-600">
                              Tokens: {request.tokensUsed}
                            </div>
                          )}
                          {request.retryAttempts > 0 && (
                            <div className="text-yellow-600">
                              Retries: {request.retryAttempts}
                            </div>
                          )}
                          {!request.success && request.errorMessage && (
                            <div className="text-red-600 mt-1 whitespace-pre-wrap">
                              {request.errorMessage}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="errors" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Error Patterns</span>
                    <Button onClick={clearErrorHistory} size="sm" variant="ghost">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {errorPatterns.map((pattern) => (
                      <div key={pattern.type} className="border rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{pattern.type}</span>
                          <Badge variant="destructive">{pattern.count}</Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          {pattern.percentage.toFixed(1)}% of errors
                        </div>
                      </div>
                    ))}
                    
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Recent Errors</span>
                      {errorHistory.slice(-5).reverse().map((error, index) => (
                        <Collapsible key={index}>
                          <CollapsibleTrigger className="w-full text-left">
                            <div className="bg-red-50 p-2 rounded text-xs hover:bg-red-100">
                              <div className="font-medium text-red-800 break-words">{error.type}</div>
                              <div className="text-xs text-gray-500">
                                Recent error
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="text-xs bg-red-100 p-2 rounded mt-1">
                            <div className="text-red-600 break-words whitespace-pre-wrap">{error.message}</div>
                            {error.suggestedActions && (
                              <div className="mt-1 text-gray-600">
                                Suggested: {error.suggestedActions[0]}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-3 pb-3">
                <div className="pt-2">
                  {performanceAnalytics ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-2 border rounded">
                          <div className="text-lg font-bold">{performanceAnalytics.totalRequests}</div>
                          <div className="text-xs text-gray-600">Total Requests</div>
                        </div>
                        <div className="text-center p-2 border rounded">
                          <div className="text-lg font-bold text-green-600">
                            {performanceAnalytics.successRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">Success Rate</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-2 border rounded">
                          <div className="text-lg font-bold">
                            {performanceAnalytics.averageResponseTime.toFixed(0)}ms
                          </div>
                          <div className="text-xs text-gray-600">Avg Response</div>
                        </div>
                        <div className="text-center p-2 border rounded">
                          <div className="text-lg font-bold">{performanceAnalytics.totalTokensUsed}</div>
                          <div className="text-xs text-gray-600">Total Tokens</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm font-medium">Model Usage</span>
                        {Object.entries(performanceAnalytics.modelUsage).map(([model, count]) => (
                          <div key={model} className="flex justify-between text-sm">
                            <span className="font-mono text-xs">{model.slice(0, 20)}...</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm font-medium">Common Errors</span>
                        {Object.entries(performanceAnalytics.commonErrors).map(([error, count]) => (
                          <div key={error} className="flex justify-between text-sm">
                            <span>{error}</span>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      No performance data available yet.
                      <br />
                      Send some messages to see analytics.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
};