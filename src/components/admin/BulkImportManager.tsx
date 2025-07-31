import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Globe, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  FileText,
  Loader2,
  Edit,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  Copy,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { WebScraperService } from "@/services/WebScraperService";
import { parseMultipleMarkdownTechniques, type ParsedTechnique } from "@/lib/markdownParser";
import { migrateTechniquesToDatabase } from "@/lib/techniqueDataMigration";

interface BulkImportManagerProps {
  onTechniquesImported?: (count: number) => void;
}

interface ExtractionProgress {
  completed: number;
  total: number;
  currentUrl: string;
}

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
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
  
  // New state for enhanced functionality
  const [customTemplate, setCustomTemplate] = useState<string>('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [manualContent, setManualContent] = useState<string>('');
  const [parsedTechniques, setParsedTechniques] = useState<ParsedTechnique[]>([]);
  const [formatValidationErrors, setFormatValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTechniques, setSelectedTechniques] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();

  // Load default template on mount
  useEffect(() => {
    const defaultTemplate = WebScraperService.getDefaultExtractionTemplate();
    setCustomTemplate(defaultTemplate);
  }, []);

  // Validation functions
  const validateTechniqueFormat = (content: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for required fields
      if (line.includes('**Name:**') && line.includes('TODO')) {
        errors.push({
          line: lineNum,
          message: 'Technique name is missing (TODO placeholder found)',
          severity: 'error'
        });
      }
      
      if (line.includes('**Description:**') && line.includes('TODO')) {
        errors.push({
          line: lineNum,
          message: 'Description is missing (TODO placeholder found)',
          severity: 'warning'
        });
      }
      
      // Check command template syntax
      if (line.includes('`') && line.includes('<') && line.includes('>')) {
        const commandMatch = line.match(/`([^`]+)`/);
        if (commandMatch) {
          const command = commandMatch[1];
          const parameters = command.match(/<[^>]+>/g);
          if (parameters) {
            parameters.forEach(param => {
              if (!param.match(/^<[a-zA-Z_][a-zA-Z0-9_]*>$/)) {
                errors.push({
                  line: lineNum,
                  message: `Invalid parameter syntax: ${param}. Use <parameter_name> format.`,
                  severity: 'warning'
                });
              }
            });
          }
        }
      }
    });
    
    return errors;
  };

  const parseContent = (content: string) => {
    try {
      const parsed = parseMultipleMarkdownTechniques(content);
      setParsedTechniques(parsed);
      
      const validationErrors = validateTechniqueFormat(content);
      setFormatValidationErrors(validationErrors);
      
      // Select all techniques by default
      setSelectedTechniques(new Set(parsed.map((_, index) => index)));
      
      return parsed;
    } catch (error) {
      setFormatValidationErrors([{
        line: 1,
        message: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }]);
      return [];
    }
  };

  const handleManualContentChange = (content: string) => {
    setManualContent(content);
    if (content.trim()) {
      parseContent(content);
    } else {
      setParsedTechniques([]);
      setFormatValidationErrors([]);
    }
  };

  const resetToDefaultTemplate = () => {
    const defaultTemplate = WebScraperService.getDefaultExtractionTemplate();
    setCustomTemplate(defaultTemplate);
    toast({
      title: "Template Reset",
      description: "Extraction template has been reset to default"
    });
  };

  const saveCustomTemplate = () => {
    localStorage.setItem('custom_extraction_template', customTemplate);
    toast({
      title: "Template Saved",
      description: "Custom extraction template has been saved"
    });
  };

  const loadSavedTemplate = () => {
    const saved = localStorage.getItem('custom_extraction_template');
    if (saved) {
      setCustomTemplate(saved);
      toast({
        title: "Template Loaded",
        description: "Saved template has been loaded"
      });
    } else {
      toast({
        title: "No Saved Template",
        description: "No custom template found in storage",
        variant: "destructive"
      });
    }
  };

  const testTemplate = () => {
    const testContent = "Sample cybersecurity content for testing template...";
    const prompt = customTemplate.replace('{sourceUrl}', 'https://example.com').replace('{content}', testContent);
    
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Template Test",
      description: "Test prompt copied to clipboard. Paste into your AI provider to test."
    });
  };

  const handleSelectiveBulkImport = async () => {
    const selectedTechniquesList = Array.from(selectedTechniques).map(index => parsedTechniques[index]);
    
    if (selectedTechniquesList.length === 0) {
      toast({
        title: "Error",
        description: "No techniques selected for import",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const technique of selectedTechniquesList) {
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
            mitre_id: technique.mitreMapping,
            detection: technique.detection ? [technique.detection] : [],
            mitigation: technique.mitigation ? [technique.mitigation] : [],
            when_to_use: technique.whenToUse ? [technique.whenToUse] : [],
            how_to_use: technique.howToUse ? [technique.howToUse] : []
          });
          
        if (error) {
          console.error('Error inserting technique:', error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} techniques. ${errorCount} errors.`
      });

      onTechniquesImported?.(successCount);
      
      // Clear the data after successful import
      setManualContent('');
      setParsedTechniques([]);
      setSelectedTechniques(new Set());

    } catch (error) {
      console.error('Selective import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleTechniqueSelection = (index: number) => {
    const newSelection = new Set(selectedTechniques);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTechniques(newSelection);
  };

  const selectAllTechniques = () => {
    setSelectedTechniques(new Set(parsedTechniques.map((_, index) => index)));
  };

  const deselectAllTechniques = () => {
    setSelectedTechniques(new Set());
  };

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

      {/* Main Content Tabs */}
      <Tabs defaultValue="url-extraction" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url-extraction">URL Extraction</TabsTrigger>
          <TabsTrigger value="manual-import">Manual Import</TabsTrigger>
        </TabsList>

        {/* URL Extraction Tab */}
        <TabsContent value="url-extraction" className="space-y-6">
          {/* Advanced Template Settings */}
          <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Advanced Template Settings
                    </div>
                    {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="custom-template">LLM Extraction Template</Label>
                    <Textarea
                      id="custom-template"
                      value={customTemplate}
                      onChange={(e) => setCustomTemplate(e.target.value)}
                      className="min-h-[200px] font-mono text-xs"
                      placeholder="Enter your custom extraction template..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {'{sourceUrl}'} and {'{content}'} as placeholders. Template will be used to generate prompts for LLM processing.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={resetToDefaultTemplate}>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset to Default
                    </Button>
                    <Button variant="outline" size="sm" onClick={saveCustomTemplate}>
                      <Save className="w-3 h-3 mr-1" />
                      Save Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadSavedTemplate}>
                      <Download className="w-3 h-3 mr-1" />
                      Load Saved
                    </Button>
                    <Button variant="outline" size="sm" onClick={testTemplate}>
                      <Copy className="w-3 h-3 mr-1" />
                      Test Template
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
        </TabsContent>

        {/* Manual Import Tab */}
        <TabsContent value="manual-import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Manual Content Import
              </CardTitle>
              <CardDescription>
                Paste AI-generated technique content for format validation and import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manual-content">Technique Content (Markdown)</Label>
                <Textarea
                  id="manual-content"
                  value={manualContent}
                  onChange={(e) => handleManualContentChange(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Paste your AI-generated technique content here..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste content from your AI provider. The system will automatically validate format and parse techniques.
                </p>
              </div>

              {/* Format Validation Errors */}
              {formatValidationErrors.length > 0 && (
                <Alert variant={formatValidationErrors.some(e => e.severity === 'error') ? "destructive" : "default"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Format Validation Issues:</p>
                      <ul className="list-disc list-inside text-sm">
                        {formatValidationErrors.map((error, index) => (
                          <li key={index} className={error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}>
                            Line {error.line}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Parsed Techniques Preview */}
              {parsedTechniques.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Parsed Techniques ({parsedTechniques.length})</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllTechniques}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllTechniques}>
                        Deselect All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {showPreview ? 'Hide' : 'Show'} Preview
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {parsedTechniques.map((technique, index) => (
                      <Card key={index} className={`${selectedTechniques.has(index) ? 'ring-2 ring-primary' : 'ring-1 ring-border'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTechniques.has(index)}
                              onChange={() => toggleTechniqueSelection(index)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{technique.title}</h4>
                                <Badge variant="outline">{technique.phase}</Badge>
                                {technique.category && <Badge variant="secondary">{technique.category}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{technique.description}</p>
                              
                              {showPreview && (
                                <div className="space-y-2 text-xs">
                                  {technique.tags.length > 0 && (
                                    <div>
                                      <span className="font-medium">Tags: </span>
                                      {technique.tags.join(', ')}
                                    </div>
                                  )}
                                  {technique.tools.length > 0 && (
                                    <div>
                                      <span className="font-medium">Tools: </span>
                                      {technique.tools.join(', ')}
                                    </div>
                                  )}
                                  {technique.commands && technique.commands.length > 0 && (
                                    <div>
                                      <span className="font-medium">Commands: </span>
                                      {technique.commands.length} command templates
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSelectiveBulkImport}
                      disabled={isImporting || selectedTechniques.size === 0}
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
                          Import Selected ({selectedTechniques.size})
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(manualContent);
                        toast({
                          title: "Copied",
                          description: "Manual content copied to clipboard"
                        });
                      }}
                    >
                      Copy Content
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};