import { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface CheatSheetCommand {
  command: string;
  description: string;
  category: string;
}
interface CheatSheet {
  id: string;
  title: string;
  description: string;
  category: string;
  bg_color: string;
  commands: CheatSheetCommand[];
}
const copyCommand = (command: string) => {
  navigator.clipboard.writeText(command);
  toast({
    title: "Copied",
    description: `Command "${command}" copied to clipboard.`
  });
};
const CommandCard = ({
  cheatSheet
}: {
  cheatSheet: CheatSheet;
}) => {
  const sectionId = `cheat-sheet-${cheatSheet.title.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <Card id={sectionId} className={`${cheatSheet.bg_color} border-border/30`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground">{cheatSheet.title}</CardTitle>
        {cheatSheet.description && <p className="text-sm text-muted-foreground">{cheatSheet.description}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {cheatSheet.commands.map((cmd, index) => <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/20">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono text-primary">{cmd.command}</code>
                <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                  {cmd.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => copyCommand(cmd.command)} className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
              <Copy className="w-3 h-3" />
            </Button>
          </div>)}
      </CardContent>
    </Card>
  );
};
export const QuickReference = () => {
  const [cheatSheets, setCheatSheets] = useState<CheatSheet[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCheatSheets();

    // Set up real-time subscription for cheat sheets
    const cheatSheetsChannel = supabase
      .channel('cheat-sheets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cheat_sheets'
        },
        () => {
          console.log('Cheat sheets table changed, refreshing...');
          fetchCheatSheets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cheatSheetsChannel);
    };
  }, []);
  const fetchCheatSheets = async () => {
    try {
      console.log('🔄 Fetching cheat sheets...');
      const { data, error } = await supabase
        .from('cheat_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Raw cheat sheets data:', data);

      // Type assertion for commands field
      const typedData = data?.map(sheet => ({
        ...sheet,
        commands: sheet.commands as unknown as CheatSheetCommand[]
      })) || [];

      console.log('✅ Processed cheat sheets:', typedData);
      setCheatSheets(typedData);
    } catch (error) {
      console.error('❌ Error fetching cheat sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load cheat sheets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Quick Reference Cheat Sheets</h2>
        </div>
        <div className="flex justify-center p-8">
          <div className="text-muted-foreground">Loading cheat sheets...</div>
        </div>
      </div>;
  }
  return <div className="space-y-6" id="cheat-sheets-section">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Cheat Sheets</h2>
      </div>

      {cheatSheets.length === 0 ? <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No Cheat Sheets Available</h3>
          <p className="text-muted-foreground">
            Cheat sheets will appear here once they are created by an administrator.
          </p>
        </div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cheatSheets.map(cheatSheet => <CommandCard key={cheatSheet.id} cheatSheet={cheatSheet} />)}
        </div>}
    </div>;
};