import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Settings, Upload, FileText, Globe, Plus, Edit, Trash2, Save, Zap, CheckCircle, Clock, ArrowRight, Users, Database, Shield, Target, Rocket, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { parseMarkdownTechnique, ParsedTechnique } from "@/lib/markdownParser";
import { CheatSheetManager } from "@/components/CheatSheetManager";
import { LinkTabsManager } from "@/components/LinkTabsManager";
import { ScenarioManager } from "@/components/ScenarioManager";
import { UserManager } from "@/components/UserManager";
import AIProviderManager from "@/components/AIProviderManager";
import ModelAccessManager from "@/components/admin/ModelAccessManager";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import FAQManager from "@/components/admin/FAQManager";
import SupportTicketManager from "@/components/admin/SupportTicketManager";
import TechniqueManager from "@/components/admin/TechniqueManager";
import { BulkImportManager } from "@/components/admin/BulkImportManager";

interface AdminDashboardProps {
  techniques: ParsedTechnique[];
  onTechniquesUpdate: (techniques: ParsedTechnique[]) => void;
  onClose: () => void;
}

export const AdminDashboard = ({ techniques, onTechniquesUpdate, onClose }: AdminDashboardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [markdownInput, setMarkdownInput] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState<ParsedTechnique | null>(null);
  const [editingTechnique, setEditingTechnique] = useState<ParsedTechnique | null>(null);
  const [webscraperUrl, setWebscraperUrl] = useState("");
  
  const markdownTemplate = `**Name:** SMB Enumeration
**MITRE ID:** T1021.002
**Phase:** Enumeration
**Description:** Enumerate SMB shares and services to gather information about network resources and potential attack vectors.
**When to use:** During initial network reconnaissance when SMB ports (445/139) are open on target systems.
**Prerequisites:** Network access to target, SMB client tools installed
**How to use:**

1. Scan for SMB services using port scanning
2. Enumerate shares using various tools
3. List share contents and permissions
4. Identify writable shares and sensitive files

### Tools

1. **smbclient:** \`smbclient -L //<target> -U <username>\` | List SMB shares on target system
2. **enum4linux:** \`enum4linux -a <target>\` | Comprehensive SMB enumeration tool
3. **smbmap:** \`smbmap -H <target> -u <username> -p <password>\` | SMB share discovery and access testing

### Command Templates

1. **smbclient:** \`smbclient -L //<target> -U <username>%<password> --option='client min protocol=NT1'\` | List all available SMB shares with authentication
2. **smbclient:** \`smbclient //<target>/<share> -U <username>%<password> -c 'ls; exit'\` | Connect to specific share and list contents
3. **enum4linux:** \`enum4linux -a -u <username> -p <password> <target>\` | Full enumeration with credentials
4. **smbmap:** \`smbmap -H <target> -u <username> -p <password> -R <share>\` | Recursively list share contents with permissions
5. **crackmapexec:** \`crackmapexec smb <target> -u <username> -p <password> --shares\` | Modern SMB enumeration and share listing
6. **rpcclient:** \`rpcclient -U <username>%<password> <target> -c 'enumdomusers; quit'\` | Enumerate domain users via RPC

**Detection:** Monitor for multiple SMB connection attempts, unusual share access patterns, tools like enum4linux signatures
**Mitigation:** Disable SMBv1, implement proper share permissions, use network segmentation, monitor SMB traffic

---

**Name:** SQL Injection Testing
**MITRE ID:** T1190
**Phase:** Initial Access
**Description:** Test web applications for SQL injection vulnerabilities to gain unauthorized database access.
**When to use:** When testing web applications with database backends during penetration testing.
**Prerequisites:** Target web application with input fields, SQL injection testing tools
**How to use:**

1. Identify input parameters in web application
2. Test for basic SQL injection with simple payloads
3. Determine database type and structure
4. Extract sensitive data or gain shell access

### Tools

1. **sqlmap:** \`sqlmap -u "<url>" --data="<post_data>"\` | Automated SQL injection testing tool
2. **manual testing:** \`' OR 1=1-- \` | Basic SQL injection payload for manual testing
3. **burp suite:** \`Intercept and modify requests\` | Professional web application security scanner

### Command Templates

1. **sqlmap:** \`sqlmap -u "<target_url>" --data="<post_parameters>" --dbs --batch\` | Enumerate databases automatically
2. **sqlmap:** \`sqlmap -u "<target_url>" --data="<post_parameters>" -D <database> --tables\` | List tables in specific database
3. **sqlmap:** \`sqlmap -u "<target_url>" --data="<post_parameters>" -D <database> -T <table> --dump\` | Dump table contents
4. **sqlmap:** \`sqlmap -u "<target_url>" --data="<post_parameters>" --os-shell\` | Attempt to get OS command shell
5. **curl:** \`curl -X POST -d "<parameter>=<payload>" "<target_url>"\` | Manual payload testing with curl
6. **sqlmap:** \`sqlmap -r <request_file> --level=<level> --risk=<risk> --tamper=<tamper_script>\` | Advanced testing with request file and evasion

**Detection:** Monitor for SQL error messages in logs, unusual database queries, multiple failed login attempts
**Mitigation:** Use parameterized queries, input validation, least privilege database accounts, WAF deployment`;

  const llmPrompt = `You are a cybersecurity expert tasked with extracting attack techniques from web content and converting them into a structured markdown format for a security dashboard.

**EXTRACTION GUIDELINES:**
1. Only extract content that clearly describes cybersecurity attack techniques, tools, or procedures
2. Never invent or hallucinate information - only use what's explicitly stated
3. For missing information, use "TODO" placeholder
4. Keep all code snippets and commands exactly as written in the source
5. Extract and preserve reference links from the source content

**OUTPUT FORMAT:**
For each technique found, use this exact markdown structure:

\`\`\`markdown
**Name:** [Exact technique name from source]
**MITRE ID:** [T####.### if mentioned, otherwise "TODO"]
**Phase:** [One of: Reconnaissance, Enumeration, Initial Access, Privilege Escalation, Persistence, Credential Access, Lateral Movement, Collection, Command and Control]
**Description:** [1-2 sentence description from source]
**When to use:** [Conditions/scenarios when technique applies]
**Prerequisites:** [Requirements before using technique]
**How to use:**

1. [Step-by-step instructions from source]
2. [Keep original formatting and details]

### Tools

1. **[Tool Name]:** \`[basic command/syntax from source]\` | [Tool description]
2. **[Additional tools if present]:** \`[commands]\` | [descriptions]

### Command Templates

1. **[Tool Name]:** \`[full command with <parameter> placeholders]\` | [Command description and purpose]
2. **[Tool Name 2]:** \`[full command with <parameter> placeholders]\` | [Command description and purpose]

### Reference Links

1. [Link Title] - [URL from source]
2. [Additional reference links if present]

**Detection:** [Blue team detection methods if mentioned]
**Mitigation:** [Defense/prevention methods if mentioned]
\`\`\`

**COMMAND TEMPLATE GUIDELINES:**
- Use <parameter> syntax for placeholders (e.g., <target>, <username>, <password>)
- Include full command syntax with all necessary flags
- Each command should be ready-to-use after parameter substitution
- Focus on practical, executable commands
- Maintain parameter consistency across related techniques

**REFERENCE LINKS GUIDELINES:**
- Extract all relevant URLs mentioned in the source content
- Include official documentation, tools, and related resources
- Format as descriptive title followed by URL
- Prioritize authoritative sources and official documentation

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
            // Check for duplicate IDs and generate unique ones if needed
            let uniqueId = parsed.id;
            let counter = 1;
            while (techniques.some(t => t.id === uniqueId) || newTechniques.some(t => t.id === uniqueId)) {
              uniqueId = `${parsed.id}.${counter}`;
              counter++;
            }
            parsed.id = uniqueId;
            newTechniques.push(parsed);
          }
        } catch (error) {
          console.error("Error parsing section:", error);
        }
      });

      if (newTechniques.length > 0) {
        // Filter out any existing techniques with the same ID to prevent duplicates
        const existingIds = new Set(techniques.map(t => t.id));
        const uniqueNewTechniques = newTechniques.filter(t => !existingIds.has(t.id));
        
        const updatedTechniques = [...techniques, ...uniqueNewTechniques];
        onTechniquesUpdate(updatedTechniques);
        setMarkdownInput("");
        toast({
          title: "Success",
          description: `Added ${uniqueNewTechniques.length} technique(s) successfully`
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

  // Show loading state while checking admin status
  if (adminLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

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
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-15 gap-1 p-2 h-auto">
          <TabsTrigger 
            value="guidance" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Guidance
          </TabsTrigger>
          <TabsTrigger 
            value="upload" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Upload Cards
          </TabsTrigger>
          <TabsTrigger 
            value="manage" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Manage Cards
          </TabsTrigger>
          <TabsTrigger 
            value="cheatsheets" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Cheat Sheets
          </TabsTrigger>
          <TabsTrigger 
            value="linktabs" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Link Tabs
          </TabsTrigger>
          <TabsTrigger 
            value="scenarios" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Scenarios
          </TabsTrigger>
          <TabsTrigger 
            value="techniques" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Techniques
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="ai-providers" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            AI Chat
          </TabsTrigger>
          <TabsTrigger 
            value="model-access" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Model Access
          </TabsTrigger>
          <TabsTrigger 
            value="announcements" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Announcements
          </TabsTrigger>
          <TabsTrigger 
            value="faq" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            FAQ
          </TabsTrigger>
          <TabsTrigger 
            value="support" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Support
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="bulk-import" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            Bulk Import
          </TabsTrigger>
          <TabsTrigger 
            value="webscraper" 
            className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
          >
            LLM Webscraper
          </TabsTrigger>
        </TabsList>

            <TabsContent value="guidance" className="space-y-6 mt-6">
              <div className="grid gap-6">
                {/* Welcome Section */}
                <Card className="bg-gradient-cyber border-cyber-blue/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Rocket className="w-6 h-6 text-cyber-blue" />
                      Welcome to Admin Dashboard
                    </CardTitle>
                    <CardDescription className="text-base">
                      Complete guide for new administrators to manage cybersecurity techniques efficiently
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-card/80 border-border/50 hover:border-cyber-blue/30 transition-colors">
                        <CardContent className="p-4 text-center">
                          <Database className="w-8 h-8 mx-auto mb-2 text-cyber-blue" />
                          <h4 className="font-semibold text-sm">Real-time Database</h4>
                          <p className="text-xs text-muted-foreground">All changes sync instantly</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/80 border-border/50 hover:border-cyber-green/30 transition-colors">
                        <CardContent className="p-4 text-center">
                          <Zap className="w-8 h-8 mx-auto mb-2 text-cyber-green" />
                          <h4 className="font-semibold text-sm">Automated Import</h4>
                          <p className="text-xs text-muted-foreground">Bulk process websites</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/80 border-border/50 hover:border-cyber-purple/30 transition-colors">
                        <CardContent className="p-4 text-center">
                          <Users className="w-8 h-8 mx-auto mb-2 text-cyber-purple" />
                          <h4 className="font-semibold text-sm">Multi-Admin</h4>
                          <p className="text-xs text-muted-foreground">Collaborate in real-time</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                {/* Main Workflows */}
                <Accordion type="multiple" defaultValue={["getting-started", "automated-workflows"]} className="space-y-4">
                  
                  {/* Getting Started Workflow */}
                  <AccordionItem value="getting-started" className="border border-cyber-green/20 rounded-lg bg-gradient-glow">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-gradient-to-r from-cyber-green/10 to-cyber-green/5 hover:from-cyber-green/15 hover:to-cyber-green/10 rounded-t-lg transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyber-green flex items-center justify-center shadow-lg">
                          <Rocket className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">🚀 Getting Started (New Administrators)</h3>
                          <p className="text-sm text-muted-foreground">Essential first steps to understand the system</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-6">
                        <div className="grid gap-4">
                          {[
                            {
                              step: 1,
                              title: "Explore the Database",
                              time: "5 mins",
                              description: "Understand how techniques are stored and organized",
                              action: "Go to Techniques tab",
                              status: "start"
                            },
                            {
                              step: 2,
                              title: "Review Existing Data",
                              time: "10 mins", 
                              description: "Browse current techniques, understand data structure",
                              action: "Browse current cards",
                              status: "ready"
                            },
                            {
                              step: 3,
                              title: "Test Manual Upload",
                              time: "15 mins",
                              description: "Try adding a single technique using markdown format",
                              action: "Go to Upload Cards tab",
                              status: "ready"
                            },
                            {
                              step: 4,
                              title: "Learn Quality Standards",
                              time: "10 mins",
                              description: "Understand validation rules and quality scoring",
                              action: "Review validation criteria",
                              status: "ready"
                            }
                          ].map((item) => (
                            <Card key={item.step} className="p-4 border-l-4 border-l-green-500">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 text-sm font-semibold">
                                    {item.step}
                                  </div>
                                  <h4 className="font-semibold">{item.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.time}
                                  </Badge>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                              <Button size="sm" variant="outline" className="text-xs">
                                {item.action}
                              </Button>
                            </Card>
                          ))}
                        </div>
                        
                        <div className="bg-cyber-green/10 border border-cyber-green/20 p-4 rounded-lg">
                          <h4 className="font-semibold text-cyber-green mb-2">💡 Success Indicators</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-cyber-green" />
                              You can navigate between all admin tabs
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-cyber-green" />
                              You successfully added at least one technique
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-cyber-green" />
                              You understand the markdown format requirements
                            </li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Automated Workflows */}
                  <AccordionItem value="automated-workflows" className="border border-cyber-blue/20 rounded-lg bg-gradient-glow">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-gradient-to-r from-cyber-blue/10 to-cyber-blue/5 hover:from-cyber-blue/15 hover:to-cyber-blue/10 rounded-t-lg transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyber-blue flex items-center justify-center shadow-lg">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">⚡ Automated Workflows (Bulk Operations)</h3>
                          <p className="text-sm text-muted-foreground">Scale your content management with automation</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-6">
                        
                        {/* Bulk Import Workflow */}
                        <div className="border border-cyber-blue/20 rounded-lg p-4 bg-gradient-to-r from-cyber-blue/5 to-cyber-blue/10">
                          <h4 className="font-semibold text-cyber-blue mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Bulk Import Workflow (30-60 mins)
                          </h4>
                          
                          <div className="grid gap-3">
                            {[
                              {
                                step: 1,
                                title: "Setup API Keys",
                                description: "Configure Firecrawl API for web scraping",
                                action: "Go to Bulk Import tab → Configure APIs",
                                prereq: "Firecrawl account required"
                              },
                              {
                                step: 2,
                                title: "Prepare URLs",
                                description: "Collect cybersecurity websites with technique content",
                                action: "Create list of target URLs",
                                prereq: "Research relevant sources"
                              },
                              {
                                step: 3,
                                title: "Start Extraction",
                                description: "Input URLs and monitor extraction progress",
                                action: "Bulk Import tab → Add URLs → Extract",
                                prereq: "Valid API keys"
                              },
                              {
                                step: 4,
                                title: "Review Quality",
                                description: "Check quality scores and validation results",
                                action: "Review extracted techniques",
                                prereq: "Extraction completed"
                              },
                              {
                                step: 5,
                                title: "Import to Database",
                                description: "Import validated techniques with duplicate detection",
                                action: "Bulk Import → Import Selected",
                                prereq: "Quality review completed"
                              }
                            ].map((item) => (
                              <div key={item.step} className="flex items-start gap-3 p-3 bg-card/40 rounded border border-cyber-blue/20 hover:border-cyber-blue/40 transition-colors">
                                <div className="w-6 h-6 rounded-full bg-cyber-blue text-black flex items-center justify-center text-sm font-semibold mt-1">
                                  {item.step}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm">{item.title}</h5>
                                  <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="text-xs">{item.action}</Badge>
                                    <Badge variant="outline" className="text-xs text-warning">
                                      Prereq: {item.prereq}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* LLM Webscraper Workflow */}
                        <div className="border border-cyber-purple/20 rounded-lg p-4 bg-gradient-to-r from-cyber-purple/5 to-cyber-purple/10">
                          <h4 className="font-semibold text-cyber-purple mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            LLM Webscraper Workflow (15-30 mins)
                          </h4>
                          
                          <div className="grid gap-3">
                            {[
                              {
                                step: 1,
                                title: "Generate Prompt",
                                description: "Create specialized prompt for technique extraction",
                                action: "LLM Webscraper tab → Enter URL → Generate"
                              },
                              {
                                step: 2, 
                                title: "Use with ChatGPT/Claude",
                                description: "Copy prompt and use with your preferred LLM",
                                action: "Copy prompt → Paste in LLM → Add web content"
                              },
                              {
                                step: 3,
                                title: "Extract Techniques",
                                description: "LLM will analyze and format technique data",
                                action: "Wait for LLM processing"
                              },
                              {
                                step: 4,
                                title: "Import Results",
                                description: "Copy markdown output back to upload tab",
                                action: "Upload Cards tab → Paste markdown → Add"
                              }
                            ].map((item) => (
                              <div key={item.step} className="flex items-start gap-3 p-3 bg-card/40 rounded border border-cyber-purple/20 hover:border-cyber-purple/40 transition-colors">
                                <div className="w-6 h-6 rounded-full bg-cyber-purple text-black flex items-center justify-center text-sm font-semibold mt-1">
                                  {item.step}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm">{item.title}</h5>
                                  <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                  <Badge variant="secondary" className="text-xs">{item.action}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
                          <h4 className="font-semibold text-warning mb-2">⚠️ Best Practices</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Start with small batches (5-10 URLs) to test extraction quality</li>
                            <li>• Always review quality scores before importing to database</li>
                            <li>• Monitor API usage limits to avoid service interruptions</li>
                            <li>• Keep extracted content as backup before importing</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Advanced Management */}
                  <AccordionItem value="advanced-management" className="border border-cyber-orange/20 rounded-lg bg-gradient-glow">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline bg-gradient-to-r from-cyber-orange/10 to-cyber-orange/5 hover:from-cyber-orange/15 hover:to-cyber-orange/10 rounded-t-lg transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyber-orange flex items-center justify-center shadow-lg">
                          <Wrench className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-lg">🛠️ Advanced Management (Database Operations)</h3>
                          <p className="text-sm text-muted-foreground">Maintain data quality and system performance</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            {
                              icon: Target,
                              title: "Data Quality Management",
                              description: "Monitor and improve technique data quality",
                              actions: ["Run quality audits", "Fix validation errors", "Update incomplete data"],
                              tab: "Techniques",
                              color: "cyber-blue"
                            },
                            {
                              icon: Users,
                              title: "User Management", 
                              description: "Manage user accounts and permissions",
                              actions: ["Add/remove users", "Manage admin access", "Monitor user activity"],
                              tab: "Users",
                              color: "cyber-green"
                            },
                            {
                              icon: Shield,
                              title: "Security & Access",
                              description: "Configure security settings and API access",
                              actions: ["Manage API keys", "Set user permissions", "Monitor access logs"],
                              tab: "Model Access",
                              color: "cyber-red"
                            },
                            {
                              icon: Database,
                              title: "Performance Monitoring",
                              description: "Track system performance and usage",
                              actions: ["Review analytics", "Monitor API usage", "Check system health"],
                              tab: "Analytics",
                              color: "cyber-purple"
                            }
                          ].map((item) => (
                            <Card key={item.title} className="p-4 border-l-4 border-l-current hover:shadow-md transition-shadow bg-card/50 hover:bg-card/80"
                              style={{ borderLeftColor: `hsl(var(--${item.color}))` }}>
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center"
                                  style={{ backgroundColor: `hsl(var(--${item.color}) / 0.1)` }}>
                                  <item.icon className="w-4 h-4" style={{ color: `hsl(var(--${item.color}))` }} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                                  <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                                  <div className="space-y-1">
                                    {item.actions.map((action) => (
                                      <div key={action} className="text-xs text-muted-foreground flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                        {action}
                                      </div>
                                    ))}
                                  </div>
                                  <Button size="sm" variant="outline" className="text-xs mt-3">
                                    Go to {item.tab}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>

                        <div className="bg-cyber-orange/10 border border-cyber-orange/20 p-4 rounded-lg">
                          <h4 className="font-semibold text-cyber-orange mb-2">🎯 Maintenance Schedule</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <h5 className="font-medium text-cyber-orange">Daily (5 mins)</h5>
                              <ul className="text-muted-foreground text-xs space-y-1">
                                <li>• Check for new import requests</li>
                                <li>• Review quality alerts</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-cyber-orange">Weekly (30 mins)</h5>
                              <ul className="text-muted-foreground text-xs space-y-1">
                                <li>• Run full quality audit</li>
                                <li>• Update incomplete techniques</li>
                                <li>• Check broken links</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-cyber-orange">Monthly (60 mins)</h5>
                              <ul className="text-muted-foreground text-xs space-y-1">
                                <li>• Review user activity</li>
                                <li>• Update MITRE mappings</li>
                                <li>• Performance optimization</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Quick Actions */}
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-cyber-blue" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>
                      Common tasks for efficient administration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Add Single Technique", tab: "upload", icon: Plus },
                        { label: "Bulk Import", tab: "bulk-import", icon: Upload },
                        { label: "Manage Users", tab: "users", icon: Users },
                        { label: "View Analytics", tab: "analytics", icon: Target }
                      ].map((item) => (
                        <Button key={item.label} variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
                          <item.icon className="w-4 h-4" />
                          <span className="text-xs">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
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

            <TabsContent value="cheatsheets" className="space-y-6 mt-6">
              <CheatSheetManager />
            </TabsContent>

            <TabsContent value="linktabs" className="space-y-6 mt-6">
              <LinkTabsManager />
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-6 mt-6">
              <ScenarioManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-6 mt-6">
              <UserManager />
            </TabsContent>

            <TabsContent value="ai-providers" className="space-y-6 mt-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <AIProviderManager />
            </TabsContent>

            <TabsContent value="model-access" className="space-y-6 mt-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <ModelAccessManager />
            </TabsContent>

            <TabsContent value="announcements" className="space-y-6 mt-6">
              <AnnouncementManager />
            </TabsContent>

            <TabsContent value="faq" className="space-y-6 mt-6">
              <FAQManager />
            </TabsContent>

            <TabsContent value="techniques" className="space-y-6 mt-6">
              <TechniqueManager />
            </TabsContent>

            <TabsContent value="support" className="space-y-6 mt-6">
              <SupportTicketManager />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription>
                    Comprehensive user and system analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Click the button below to open the full analytics dashboard in a new tab.
                  </p>
                  <Button 
                    onClick={() => navigate('/admin/stats')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Open Analytics Dashboard
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk-import" className="space-y-6 mt-6">
              <BulkImportManager />
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

// Enhanced TechniqueEditModal with command template support
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

  const addCommandTemplate = () => {
    const newCommand = {
      tool: "New Tool",
      command: "command <parameter>",
      description: "Description"
    };
    setEditedTechnique({
      ...editedTechnique,
      commands: [...(editedTechnique.commands || []), newCommand]
    });
  };

  const removeCommandTemplate = (index: number) => {
    const updatedCommands = editedTechnique.commands?.filter((_, i) => i !== index) || [];
    setEditedTechnique({
      ...editedTechnique,
      commands: updatedCommands
    });
  };

  const updateCommandTemplate = (index: number, field: string, value: string) => {
    const updatedCommands = editedTechnique.commands?.map((cmd, i) => 
      i === index ? { ...cmd, [field]: value } : cmd
    ) || [];
    setEditedTechnique({
      ...editedTechnique,
      commands: updatedCommands
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
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

          {/* Command Templates Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Command Templates</Label>
              <Button size="sm" onClick={addCommandTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </div>
            
            {editedTechnique.commands?.map((command, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Command Template {index + 1}</Label>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => removeCommandTemplate(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tool Name</Label>
                      <Input
                        value={command.tool}
                        onChange={(e) => updateCommandTemplate(index, 'tool', e.target.value)}
                        placeholder="Tool Name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={command.description}
                        onChange={(e) => updateCommandTemplate(index, 'description', e.target.value)}
                        placeholder="Command description"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Command Template</Label>
                    <Textarea
                      value={command.command}
                      onChange={(e) => updateCommandTemplate(index, 'command', e.target.value)}
                      placeholder="command <parameter1> <parameter2>"
                      className="font-mono text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
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
