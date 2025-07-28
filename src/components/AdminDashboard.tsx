import { useState } from "react";
import { Settings, Upload, FileText, Globe, Plus, Edit, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { parseMarkdownTechnique, ParsedTechnique } from "@/lib/markdownParser";

interface AdminDashboardProps {
  techniques: ParsedTechnique[];
  onTechniquesUpdate: (techniques: ParsedTechnique[]) => void;
  onClose: () => void;
}

export const AdminDashboard = ({ techniques, onTechniquesUpdate, onClose }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [markdownInput, setMarkdownInput] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState<ParsedTechnique | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<ParsedTechnique | null>(null);
  const [webscraperUrl, setWebscraperUrl] = useState("");
  
  const markdownTemplate = `**Name:** [Technique Name]
**MITRE ID:** [T####.###]
**Phase:** [Enumeration/Initial Access/Privilege Escalation/Persistence/Credential Access/Lateral Movement]
**Description:** [Brief description of the technique]
**When to use:** [When to apply this technique]
**Prerequisites:** [What's needed before using this technique]
**How to use:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Tools

1. **[Tool Name]:** \`[command template with <parameters>]\` | [Description]
2. **[Tool Name 2]:** \`[command template with <parameters>]\` | [Description]

**Detection:** [How to detect this technique]
**Mitigation:** [How to prevent/mitigate this technique]`;

  const llmPrompt = `You are a cybersecurity expert tasked with extracting attack techniques from web content and converting them into a structured markdown format for a security dashboard.

**EXTRACTION GUIDELINES:**
1. Only extract content that clearly describes cybersecurity attack techniques, tools, or procedures
2. Never invent or hallucinate information - only use what's explicitly stated
3. For missing information, use "TODO" placeholder
4. Keep all code snippets and commands exactly as written in the source

**OUTPUT FORMAT:**
For each technique found, use this exact markdown structure:

\`\`\`markdown
**Name:** [Exact technique name from source]
**MITRE ID:** [T####.### if mentioned, otherwise "TODO"]
**Phase:** [One of: Enumeration, Initial Access, Privilege Escalation, Persistence, Credential Access, Lateral Movement]
**Description:** [1-2 sentence description from source]
**When to use:** [Conditions/scenarios when technique applies]
**Prerequisites:** [Requirements before using technique]
**How to use:**

1. [Step-by-step instructions from source]
2. [Keep original formatting and details]

### Tools

1. **[Tool Name]:** \`[exact command/syntax from source]\` | [Tool description]
2. **[Additional tools if present]:** \`[commands]\` | [descriptions]

**Detection:** [Blue team detection methods if mentioned]
**Mitigation:** [Defense/prevention methods if mentioned]
\`\`\`

**MULTIPLE TECHNIQUES:**
If multiple techniques are found, separate each with "---"

**SCENARIOS:**
If attack workflows/scenarios are found, format as:
\`\`\`markdown
## Scenario: [Title]
**Description:** [Brief summary]
**Tags:** [comma-separated tags]
### Linked Techniques
- [Technique names or IDs]
\`\`\`

Now analyze the following webpage content and extract cybersecurity techniques:`;

  const handleMarkdownUpload = () => {
    try {
      if (!markdownInput.trim()) {
        toast({
          title: "Error",
          description: "Please enter markdown content to parse",
          variant: "destructive"
        });
        return;
      }

      // Split by "---" or multiple newlines to handle multiple techniques
      const sections = markdownInput.split(/---|\n\n\n+/).filter(section => section.trim());
      const newTechniques: ParsedTechnique[] = [];

      sections.forEach(section => {
        try {
          const parsed = parseMarkdownTechnique(section.trim());
          if (parsed.title && parsed.id) {
            newTechniques.push(parsed);
          }
        } catch (error) {
          console.error("Error parsing section:", error);
        }
      });

      if (newTechniques.length > 0) {
        const updatedTechniques = [...techniques, ...newTechniques];
        onTechniquesUpdate(updatedTechniques);
        setMarkdownInput("");
        toast({
          title: "Success",
          description: `Added ${newTechniques.length} technique(s) successfully`
        });
      } else {
        toast({
          title: "Error",
          description: "No valid techniques found in the markdown",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse markdown content",
        variant: "destructive"
      });
    }
  };

  const handleTechniqueUpdate = (updatedTechnique: ParsedTechnique) => {
    const updatedTechniques = techniques.map(t => 
      t.id === updatedTechnique.id ? updatedTechnique : t
    );
    onTechniquesUpdate(updatedTechniques);
    setEditingTechnique(null);
    toast({
      title: "Success",
      description: "Technique updated successfully"
    });
  };

  const handleTechniqueDelete = (techniqueId: string) => {
    const updatedTechniques = techniques.filter(t => t.id !== techniqueId);
    onTechniquesUpdate(updatedTechniques);
    toast({
      title: "Success",
      description: "Technique deleted successfully"
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard"
    });
  };

  const generateWebscraperPrompt = () => {
    const fullPrompt = `${llmPrompt}\n\nTarget URL: ${webscraperUrl}`;
    copyToClipboard(fullPrompt);
    toast({
      title: "Prompt Generated",
      description: "LLM webscraper prompt copied to clipboard. Use this with ChatGPT or similar LLM to extract techniques from the target URL."
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <Tabs defaultValue="guidance" className="p-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="guidance">Guidance</TabsTrigger>
              <TabsTrigger value="upload">Upload Cards</TabsTrigger>
              <TabsTrigger value="manage">Manage Cards</TabsTrigger>
              <TabsTrigger value="webscraper">LLM Webscraper</TabsTrigger>
            </TabsList>

            <TabsContent value="guidance" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Administrator Guidance
                  </CardTitle>
                  <CardDescription>
                    Step-by-step guide for managing techniques and scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Adding New Techniques</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Use the "Upload Cards" tab to add techniques via markdown</li>
                      <li>Follow the exact markdown schema provided in the template</li>
                      <li>Include all required fields: Name, MITRE ID, Phase, Description</li>
                      <li>Add tools with command templates using &lt;parameter&gt; syntax</li>
                      <li>Separate multiple techniques with "---"</li>
                    </ol>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Data Consistency Best Practices</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Use consistent phase names: Enumeration, Initial Access, Privilege Escalation, Persistence, Credential Access, Lateral Movement</li>
                      <li>Include MITRE ATT&CK IDs for proper mapping (format: T####.###)</li>
                      <li>Keep tool command templates consistent with parameter syntax</li>
                      <li>Tag techniques appropriately for better searchability</li>
                      <li>Include both detection and mitigation information when available</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Linking Guidelines</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Link related techniques through similar tags</li>
                      <li>Group techniques by attack phases for logical progression</li>
                      <li>Reference tools consistently across related techniques</li>
                      <li>Maintain scenario connections through technique references</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Technique Cards
                  </CardTitle>
                  <CardDescription>
                    Add new techniques using structured markdown format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="markdown-input">Markdown Content</Label>
                      <Textarea
                        id="markdown-input"
                        value={markdownInput}
                        onChange={(e) => setMarkdownInput(e.target.value)}
                        placeholder="Paste your technique markdown here..."
                        className="min-h-[400px] font-mono text-sm"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button onClick={handleMarkdownUpload} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add Techniques
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => copyToClipboard(markdownTemplate)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Copy Template
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Markdown Schema Template</Label>
                      <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[400px] border">
                        {markdownTemplate}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Manage Technique Cards
                  </CardTitle>
                  <CardDescription>
                    Edit or delete existing techniques ({techniques.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {techniques.map((technique) => (
                      <div key={technique.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{technique.title}</h4>
                            <Badge variant="outline">{technique.id}</Badge>
                            <Badge variant="secondary">{technique.phase}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTechnique(technique)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleTechniqueDelete(technique.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{technique.description}</p>
                        <div className="flex gap-1 mt-2">
                          {technique.tools.map((tool) => (
                            <Badge key={tool} variant="outline" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webscraper" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    LLM Webscraper Prompt Generator
                  </CardTitle>
                  <CardDescription>
                    Generate prompts for LLMs to extract techniques from web content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="webscraper-url">Target URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="webscraper-url"
                        value={webscraperUrl}
                        onChange={(e) => setWebscraperUrl(e.target.value)}
                        placeholder="https://example.com/attack-techniques"
                        className="flex-1"
                      />
                      <Button onClick={generateWebscraperPrompt} disabled={!webscraperUrl.trim()}>
                        Generate Prompt
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will copy a prompt to your clipboard that you can use with ChatGPT or other LLMs to extract techniques from the target URL.
                    </p>
                  </div>
                  
                  <div>
                    <Label>Generated Prompt Preview</Label>
                    <Textarea
                      value={llmPrompt}
                      readOnly
                      className="min-h-[300px] font-mono text-xs"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(llmPrompt)}
                      className="mt-2"
                    >
                      Copy Base Prompt
                    </Button>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Usage Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Enter the target URL containing cybersecurity techniques</li>
                      <li>Click "Generate Prompt" to copy the complete prompt</li>
                      <li>Paste the prompt into ChatGPT, Claude, or another LLM</li>
                      <li>Provide the webpage content to the LLM</li>
                      <li>Copy the extracted markdown back to the "Upload Cards" tab</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Technique Modal */}
      {editingTechnique && (
        <TechniqueEditModal
          technique={editingTechnique}
          onSave={handleTechniqueUpdate}
          onClose={() => setEditingTechnique(null)}
        />
      )}
    </div>
  );
};

// Separate component for editing techniques
interface TechniqueEditModalProps {
  technique: ParsedTechnique;
  onSave: (technique: ParsedTechnique) => void;
  onClose: () => void;
}

const TechniqueEditModal = ({ technique, onSave, onClose }: TechniqueEditModalProps) => {
  const [editedTechnique, setEditedTechnique] = useState<ParsedTechnique>(technique);

  const handleSave = () => {
    onSave(editedTechnique);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Edit Technique</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editedTechnique.title}
                onChange={(e) => setEditedTechnique({ ...editedTechnique, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-id">MITRE ID</Label>
              <Input
                id="edit-id"
                value={editedTechnique.id}
                onChange={(e) => setEditedTechnique({ ...editedTechnique, id: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editedTechnique.description}
              onChange={(e) => setEditedTechnique({ ...editedTechnique, description: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-phase">Phase</Label>
              <Input
                id="edit-phase"
                value={editedTechnique.phase}
                onChange={(e) => setEditedTechnique({ ...editedTechnique, phase: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-tools">Tools (comma-separated)</Label>
              <Input
                id="edit-tools"
                value={editedTechnique.tools.join(", ")}
                onChange={(e) => setEditedTechnique({ 
                  ...editedTechnique, 
                  tools: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};