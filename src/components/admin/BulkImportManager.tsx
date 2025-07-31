import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  FileText,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { WebScraperService } from "@/services/WebScraperService";
import { parseMultipleMarkdownTechniques } from "@/lib/markdownParser";
import { migrateTechniquesToDatabase } from "@/lib/techniqueDataMigration";

interface BulkImportManagerProps {
  onTechniquesImported?: (count: number) => void;
}

interface ExtractionProgress {
  completed: number;
  total: number;
  currentUrl: string;
}

export const BulkImportManager: React.FC<BulkImportManagerProps> = ({ onTechniquesImported }) => {
  const [urls, setUrls] = useState<string>('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState(WebScraperService.getFirecrawlApiKey() || '');
  const [perplexityApiKey, setPerplexityApiKey] = useState(WebScraperService.getPerplexityApiKey() || '');
  const [usePerplexityValidation, setUsePerplexityValidation] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any[]>([]);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [extractedContent, setExtractedContent] = useState<string>('');
  const { toast } = useToast();

  const handleApiKeysSave = () => {
    if (firecrawlApiKey) {
      WebScraperService.saveFirecrawlApiKey(firecrawlApiKey);
    }
    if (perplexityApiKey) {
      WebScraperService.savePerplexityApiKey(perplexityApiKey);
    }
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved securely."
    });
  };

  const handleBulkExtraction = async () => {
    const urlList = urls.split('\n').map(url => url.trim()).filter(Boolean);
    
    if (urlList.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one URL",
        variant: "destructive"
      });
      return;
    }

    if (!firecrawlApiKey) {
      toast({
        title: "Error",
        description: "Firecrawl API key is required",
        variant: "destructive"
      });
      return;
    }

    if (usePerplexityValidation && !perplexityApiKey) {
      toast({
        title: "Error",
        description: "Perplexity API key is required when validation is enabled",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setExtractionResults([]);
    setValidationErrors([]);
    setExtractedContent('');

    try {
      const results = await WebScraperService.bulkProcessUrls(
        urlList,
        usePerplexityValidation,
        (progress) => setExtractionProgress(progress)
      );

      setExtractionResults(results);
      
      // Combine all successful extractions
      const combinedContent = results
        .filter(result => result.success && result.rawContent)
        .map(result => `<!-- Source: ${result.sourceUrl} -->\n${result.rawContent}`)
        .join('\n\n---\n\n');

      setExtractedContent(combinedContent);

      // Validate results
      const errors: string[] = [];
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (failureCount > 0) {
        errors.push(`${failureCount} URLs failed to process`);
      }

      if (successCount === 0) {
        errors.push('No techniques were successfully extracted');
      }

      setValidationErrors(errors);

      toast({
        title: "Extraction Complete",
        description: `Processed ${urlList.length} URLs. ${successCount} successful, ${failureCount} failed.`
      });

    } catch (error) {
      console.error('Bulk extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  const handleBulkImport = async () => {
    if (!extractedContent.trim()) {
      toast({
        title: "Error",
        description: "No content to import",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);

    try {
      // Parse the extracted techniques
      const parsedTechniques = parseMultipleMarkdownTechniques(extractedContent);
      
      if (parsedTechniques.length === 0) {
        toast({
          title: "Error",
          description: "No valid techniques found in extracted content",
          variant: "destructive"
        });
        return;
      }

      // Import directly to database - migrateTechniquesToDatabase doesn't take parameters
      // We'll need to create the techniques in the database manually
      const { supabase } = await import("@/integrations/supabase/client");
      
      for (const technique of parsedTechniques) {
        const { error } = await supabase
          .from('techniques')
          .insert({
            title: technique.title,
            description: technique.description,
            phase: technique.phase,
            tags: technique.tags,
            tools: technique.tools,
            category: technique.category,
            commands: technique.commands || [],
            reference_links: []
          });
          
        if (error) {
          console.error('Error inserting technique:', error);
        }
      }

      toast({
        title: "Import Successful",
        description: `Successfully imported ${parsedTechniques.length} techniques`
      });

      onTechniquesImported?.(parsedTechniques.length);
      
      // Clear the data after successful import
      setExtractionResults([]);
      setExtractedContent('');
      setUrls('');

    } catch (error) {
      console.error('Bulk import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const qualityScore = extractedContent ? WebScraperService.calculateQualityScore(extractedContent) : null;

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure your API keys for automated web scraping and content extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firecrawl-key">Firecrawl API Key (Required)</Label>
              <Input
                id="firecrawl-key"
                type="password"
                value={firecrawlApiKey}
                onChange={(e) => setFirecrawlApiKey(e.target.value)}
                placeholder="fc-..."
              />
            </div>
            <div>
              <Label htmlFor="perplexity-key">Perplexity API Key (Optional)</Label>
              <Input
                id="perplexity-key"
                type="password"
                value={perplexityApiKey}
                onChange={(e) => setPerplexityApiKey(e.target.value)}
                placeholder="pplx-..."
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="perplexity-validation"
              checked={usePerplexityValidation}
              onCheckedChange={setUsePerplexityValidation}
            />
            <Label htmlFor="perplexity-validation">
              Use Perplexity AI for content validation and enhancement
            </Label>
          </div>

          <Button onClick={handleApiKeysSave}>
            Save API Keys
          </Button>
        </CardContent>
      </Card>

      {/* Bulk URL Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Bulk URL Processing
          </CardTitle>
          <CardDescription>
            Enter multiple URLs to automatically extract cybersecurity techniques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="urls-input">Target URLs (one per line)</Label>
            <Textarea
              id="urls-input"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={`https://example.com/technique1
https://example.com/technique2
https://github.com/user/repo`}
              className="min-h-[120px]"
            />
          </div>

          {extractionProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing: {extractionProgress.currentUrl}</span>
                <span>{extractionProgress.completed} / {extractionProgress.total}</span>
              </div>
              <Progress 
                value={(extractionProgress.completed / extractionProgress.total) * 100} 
              />
            </div>
          )}

          <Button 
            onClick={handleBulkExtraction}
            disabled={isExtracting || !firecrawlApiKey}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Techniques...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Extract Techniques from URLs
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Extraction Results */}
      {extractionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Extraction Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {extractionResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {new URL(result.sourceUrl).hostname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.success ? 'Success' : result.error}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {qualityScore && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Content Quality Score</span>
                  <span className={`font-bold ${getQualityScoreColor(qualityScore.score)}`}>
                    {qualityScore.score.toFixed(0)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(qualityScore.details).map(([key, value]) => (
                    <Badge key={key} variant={value ? "default" : "secondary"}>
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Content Preview */}
      {extractedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Content Preview</CardTitle>
            <CardDescription>
              Review the extracted techniques before importing to database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={extractedContent}
              onChange={(e) => setExtractedContent(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
              placeholder="Extracted techniques will appear here..."
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkImport}
                disabled={isImporting || !extractedContent.trim()}
                className="flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import to Database
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(extractedContent);
                  toast({
                    title: "Copied",
                    description: "Extracted content copied to clipboard"
                  });
                }}
              >
                Copy to Clipboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};