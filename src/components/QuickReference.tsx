import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const powerViewCommands = [
  { command: "Get-NetDomain", description: "Current domain info", category: "Domain Info" },
  { command: "Get-NetUser", description: "All domain users", category: "User Enum" },
  { command: "Get-NetGroup *admin*", description: "Admin groups", category: "Group Enum" },
  { command: "Get-NetComputer", description: "All computers", category: "Computer Enum" },
  { command: "Invoke-UserHunter", description: "Find user sessions", category: "Session Hunt" },
  { command: "Get-NetShare", description: "Network shares", category: "Share Enum" },
  { command: "Get-NetGPO", description: "Group policies", category: "GPO Enum" }
];

const impacketCommands = [
  { command: "GetUserSPNs.py", description: "Kerberoasting", category: "Credential Access" },
  { command: "GetNPUsers.py", description: "AS-REP roasting", category: "Credential Access" },
  { command: "secretsdump.py", description: "Extract secrets", category: "Credential Dump" },
  { command: "psexec.py", description: "Remote execution", category: "Lateral Movement" },
  { command: "smbexec.py", description: "SMB-based execution", category: "Execution" },
  { command: "wmiexec.py", description: "WMI-based execution", category: "Execution" }
];

const copyCommand = (command: string) => {
  navigator.clipboard.writeText(command);
  toast({
    title: "Copied",
    description: `Command "${command}" copied to clipboard.`
  });
};

const CommandCard = ({ title, commands, bgColor }: { 
  title: string; 
  commands: typeof powerViewCommands; 
  bgColor: string; 
}) => (
  <Card className={`${bgColor} border-border/30`}>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {commands.map((cmd, index) => (
        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/20">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-primary">{cmd.command}</code>
              <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                {cmd.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{cmd.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyCommand(cmd.command)}
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const QuickReference = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Quick Reference Cheat Sheets</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommandCard 
          title="PowerView Quick Reference" 
          commands={powerViewCommands}
          bgColor="bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10"
        />
        <CommandCard 
          title="Impacket Tools" 
          commands={impacketCommands}
          bgColor="bg-gradient-to-br from-cyber-purple/5 to-cyber-purple/10"
        />
      </div>
    </div>
  );
};