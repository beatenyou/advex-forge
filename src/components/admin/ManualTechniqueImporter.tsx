import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Loader2,
  Edit,
  BookOpen
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { TechniqueImportService } from "@/services/TechniqueImportService";
import { parseMultipleMarkdownTechniques, type ParsedTechnique } from "@/lib/markdownParser";
import { TemplateEditor } from "./TemplateEditor";

interface ManualTechniqueImporterProps {
  onTechniquesImported?: (count: number) => void;
}

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export const ManualTechniqueImporter: React.FC<ManualTechniqueImporterProps> = ({ onTechniquesImported }) => {
  const [manualContent, setManualContent] = useState<string>('');
  const [parsedTechniques, setParsedTechniques] = useState<ParsedTechnique[]>([]);
  const [formatValidationErrors, setFormatValidationErrors] = useState<ValidationError[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  
  const { toast } = useToast();

  // Validation function for content format
  const validateTechniqueFormat = (content: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = content.split('\n');
    
    try {
      // Try JSON first
      const jsonData = JSON.parse(content);
      const techniques = Array.isArray(jsonData) ? jsonData : jsonData.techniques || [];
      
      if (!Array.isArray(techniques)) {
        errors.push({
          line: 1,
          message: "Content must be a JSON array or object with 'techniques' property containing an array",
          severity: 'error'
        });
        return errors;
      }
      
      if (techniques.length === 0) {
        errors.push({
          line: 1,
          message: "No techniques found in the content",
          severity: 'warning'
        });
      }
      
      techniques.forEach((technique: any, index: number) => {
        if (!technique.title) {
          errors.push({
            line: index + 1,
            message: `Technique ${index + 1}: Missing required 'title' field`,
            severity: 'error'
          });
        }
        if (!technique.description) {
          errors.push({
            line: index + 1,
            message: `Technique ${index + 1}: Missing required 'description' field`,
            severity: 'warning'
          });
        }
        if (!technique.phase) {
          errors.push({
            line: index + 1,
            message: `Technique ${index + 1}: Missing 'phase' field`,
            severity: 'warning'
          });
        }
      });
      
    } catch (jsonError) {
      // Validate as markdown
      const nameMatches = content.match(/\*\*Name:\*\*/g);
      if (!nameMatches || nameMatches.length === 0) {
        errors.push({
          line: 1,
          message: 'No techniques found. Content should be JSON or markdown with "**Name:**" markers',
          severity: 'error'
        });
      }
      
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
      });
    }
    
    return errors;
  };

  const parseContent = (content: string) => {
    try {
      console.log('📝 Parsing content:', content.substring(0, 200) + '...');
      
      let parsed: any[] = [];
      
      // Try parsing as JSON first
      try {
        const jsonData = JSON.parse(content);
        console.log('📊 Successfully parsed as JSON:', jsonData);
        
        const techniques = Array.isArray(jsonData) ? jsonData : jsonData.techniques || [];
        if (Array.isArray(techniques)) {
          parsed = techniques.map((technique: any, index: number) => ({
            id: technique.id || technique.mitreId || technique.mitre_id || `json-${index}`,
            title: technique.title || 'Untitled Technique',
            description: technique.description || '',
            phase: technique.phase || 'Reconnaissance',
            category: technique.category || 'General',
            mitreId: technique.mitreId || technique.mitre_id || null,
            tags: Array.isArray(technique.tags) ? technique.tags : 
                  typeof technique.tags === 'string' ? [technique.tags] : [],
            tools: Array.isArray(technique.tools) ? technique.tools : 
                   typeof technique.tools === 'string' ? [technique.tools] : [],
            commands: Array.isArray(technique.commands) ? technique.commands : [],
            referenceLinks: Array.isArray(technique.referenceLinks) ? technique.referenceLinks : 
                           Array.isArray(technique.reference_links) ? technique.reference_links : [],
            detection: Array.isArray(technique.detection) ? technique.detection : 
                      typeof technique.detection === 'string' ? [technique.detection] : [],
            mitigation: Array.isArray(technique.mitigation) ? technique.mitigation : 
                       typeof technique.mitigation === 'string' ? [technique.mitigation] : [],
            whenToUse: Array.isArray(technique.whenToUse) ? technique.whenToUse : 
                      Array.isArray(technique.when_to_use) ? technique.when_to_use :
                      typeof technique.whenToUse === 'string' ? [technique.whenToUse] :
                      typeof technique.when_to_use === 'string' ? [technique.when_to_use] : [],
            howToUse: Array.isArray(technique.howToUse) ? technique.howToUse : 
                     Array.isArray(technique.how_to_use) ? technique.how_to_use :
                     typeof technique.howToUse === 'string' ? [technique.howToUse] :
                     typeof technique.how_to_use === 'string' ? [technique.how_to_use] : []
          }));
          console.log('✅ Parsed', parsed.length, 'techniques from JSON');
        }
      } catch (jsonError) {
        console.log('⚠️ Not valid JSON, falling back to markdown parsing');
        // Fallback to markdown parsing
        parsed = parseMultipleMarkdownTechniques(content);
        console.log('🔍 Parsed', parsed.length, 'techniques from markdown');
      }
      
      setParsedTechniques(parsed);
      
      const validationErrors = validateTechniqueFormat(content);
      setFormatValidationErrors(validationErrors);
      
      // Select all techniques by default
      setSelectedTechniques(new Set(parsed.map((_, index) => index)));
      
      return parsed;
    } catch (error) {
      console.error('❌ Error parsing content:', error);
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
            mitre_id: technique.mitreId || technique.mitreMapping || null,
            detection: Array.isArray(technique.detection) ? technique.detection : 
                      typeof technique.detection === 'string' ? [technique.detection] : [],
            mitigation: Array.isArray(technique.mitigation) ? technique.mitigation : 
                       typeof technique.mitigation === 'string' ? [technique.mitigation] : [],
            when_to_use: Array.isArray(technique.whenToUse) ? technique.whenToUse : 
                        typeof technique.whenToUse === 'string' ? [technique.whenToUse] : [],
            how_to_use: Array.isArray(technique.howToUse) ? technique.howToUse : 
                       typeof technique.howToUse === 'string' ? [technique.howToUse] : [],
            reference_links: technique.referenceLinks || []
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Manual Technique Import</h3>
          <p className="text-sm text-muted-foreground">
            Paste JSON or Markdown content from your AI provider to import techniques
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowTemplateEditor(true)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Template
        </Button>
      </div>

      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Input
          </CardTitle>
          <CardDescription>
            Paste your AI-generated content in JSON or Markdown format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={manualContent}
              onChange={(e) => handleManualContentChange(e.target.value)}
              placeholder="Paste your AI-generated techniques here in JSON or Markdown format..."
              className="min-h-[200px] font-mono text-sm"
            />
            
            {/* Format validation errors */}
            {formatValidationErrors.length > 0 && (
              <Alert variant={formatValidationErrors.some(e => e.severity === 'error') ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Format Validation Issues:</div>
                    {formatValidationErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm">
                        Line {error.line}: {error.message}
                      </div>
                    ))}
                    {formatValidationErrors.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        +{formatValidationErrors.length - 5} more issues...
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Techniques Preview */}
      {parsedTechniques.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Parsed Techniques ({parsedTechniques.length})
            </CardTitle>
            <CardDescription>
              Select techniques to import into the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Selection controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllTechniques}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllTechniques}
                >
                  Deselect All
                </Button>
                <div className="text-sm text-muted-foreground">
                  {selectedTechniques.size} of {parsedTechniques.length} selected
                </div>
              </div>

              {/* Technique list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parsedTechniques.map((technique, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedTechniques.has(index) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTechniques.has(index)}
                        onCheckedChange={() => toggleTechniqueSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{technique.title}</h4>
                          {technique.mitreId && (
                            <Badge variant="outline" className="text-xs">
                              {technique.mitreId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {technique.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {technique.phase}
                          </Badge>
                          {technique.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {technique.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{technique.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSelectiveBulkImport}
                  disabled={isImporting || selectedTechniques.size === 0}
                  className="flex items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Import {selectedTechniques.size} Technique{selectedTechniques.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Editor Dialog */}
      <TemplateEditor
        open={showTemplateEditor}
        onOpenChange={setShowTemplateEditor}
        onTemplateUpdate={() => {
          toast({
            title: "Template Updated",
            description: "The extraction template has been updated successfully"
          });
        }}
      />
    </div>
  );
};