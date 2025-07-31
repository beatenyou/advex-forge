import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseMultipleMarkdownTechniques } from "@/lib/markdownParser";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";

interface BulkTechniqueImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function BulkTechniqueImporter({ isOpen, onClose, onImportComplete }: BulkTechniqueImporterProps) {
  const [markdownText, setMarkdownText] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const handlePreview = () => {
    if (!markdownText.trim()) {
      toast({
        title: "No Content",
        description: "Please paste markdown content to preview.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = parseMultipleMarkdownTechniques(markdownText);
      setPreview(parsed.slice(0, 10)); // Show first 10 for preview
      
      toast({
        title: "Preview Generated",
        description: `Found ${parsed.length} techniques. Showing first 10 for preview.`
      });
    } catch (error) {
      console.error('Error parsing markdown:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse markdown. Please check the format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!markdownText.trim()) return;

    setIsImporting(true);
    setImportStats(null);
    
    try {
      const parsed = parseMultipleMarkdownTechniques(markdownText);
      const stats = {
        total: parsed.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Convert to database format in batches
      const batchSize = 20;
      
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        
        const dbTechniques = batch.map(technique => ({
          mitre_id: technique.id,
          title: technique.title,
          description: technique.description,
          phase: technique.phase,
          tags: technique.tags || [],
          tools: technique.tools || [],
          category: technique.category || 'General',
          when_to_use: Array.isArray(technique.whenToUse) 
            ? technique.whenToUse 
            : (technique.whenToUse ? [technique.whenToUse] : []),
          how_to_use: Array.isArray(technique.howToUse) 
            ? technique.howToUse 
            : (technique.howToUse ? [technique.howToUse] : []),
          commands: technique.commands || [],
          detection: Array.isArray(technique.detection) 
            ? technique.detection 
            : (technique.detection ? [technique.detection] : []),
          mitigation: Array.isArray(technique.mitigation) 
            ? technique.mitigation 
            : (technique.mitigation ? [technique.mitigation] : []),
          reference_links: [
            {
              title: "MITRE ATT&CK",
              url: `https://attack.mitre.org/techniques/${technique.id}/`,
              description: "Official MITRE documentation for this technique"
            }
          ],
          is_active: true
        }));

        const { error } = await supabase
          .from('techniques')
          .insert(dbTechniques);

        if (error) {
          console.error('Batch import error:', error);
          stats.failed += batch.length;
          stats.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        } else {
          stats.successful += batch.length;
        }
      }

      setImportStats(stats);
      
      if (stats.successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${stats.successful} out of ${stats.total} techniques.`
        });
        onImportComplete();
      } else {
        toast({
          title: "Import Failed",
          description: "No techniques were imported successfully.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "An error occurred during import.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setMarkdownText('');
    setPreview([]);
    setImportStats(null);
    setIsProcessing(false);
    setIsImporting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Techniques
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import Stats */}
          {importStats && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total</div>
                    <div className="text-2xl font-bold">{importStats.total}</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">Successful</div>
                    <div className="text-2xl font-bold text-green-600">{importStats.successful}</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">Failed</div>
                    <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                  </div>
                </div>
                {importStats.errors.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium text-red-600 mb-2">Errors:</div>
                    <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                      {importStats.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Markdown Input */}
          <div>
            <Label htmlFor="markdown-input">Markdown Content</Label>
            <Textarea
              id="markdown-input"
              value={markdownText}
              onChange={(e) => setMarkdownText(e.target.value)}
              placeholder="Paste your markdown techniques here..."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports multiple techniques. Each technique should start with **Name:** field.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handlePreview}
              disabled={isProcessing || isImporting}
              variant="outline"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleImport}
              disabled={isProcessing || isImporting || !markdownText.trim()}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import All
                </>
              )}
            </Button>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Preview (First 10 techniques)</Label>
                <Badge variant="secondary">{preview.length} shown</Badge>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {preview.map((technique, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{technique.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {technique.id} • {technique.phase}
                        </div>
                        <div className="text-sm mt-1">{technique.description}</div>
                        
                        {technique.commands && technique.commands.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {technique.commands.length} command{technique.commands.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <Badge variant="secondary" className="ml-2">
                        {technique.category}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}