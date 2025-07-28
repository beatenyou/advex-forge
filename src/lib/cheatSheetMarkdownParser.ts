export interface CheatSheetCommand {
  command: string;
  description: string;
  category: string;
}

export interface ParsedCheatSheet {
  title: string;
  category: string;
  description: string;
  bg_color: string;
  commands: CheatSheetCommand[];
}

const backgroundColorMap: Record<string, string> = {
  'cyber-blue': 'bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10',
  'cyber-purple': 'bg-gradient-to-br from-purple-500/5 to-purple-500/10',
  'cyber-green': 'bg-gradient-to-br from-green-500/5 to-green-500/10',
  'cyber-red': 'bg-gradient-to-br from-red-500/5 to-red-500/10',
  'cyber-orange': 'bg-gradient-to-br from-orange-500/5 to-orange-500/10',
  'cyber-yellow': 'bg-gradient-to-br from-yellow-500/5 to-yellow-500/10',
  'default': 'bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10'
};

export function parseCheatSheetMarkdown(markdownText: string): ParsedCheatSheet[] {
  const cheatSheets: ParsedCheatSheet[] = [];
  
  // Split by --- to handle multiple cheat sheets
  const sections = markdownText.split(/^---\s*$/m).map(s => s.trim()).filter(s => s);
  
  for (const section of sections) {
    try {
      const cheatSheet = parseSingleCheatSheet(section);
      if (cheatSheet) {
        cheatSheets.push(cheatSheet);
      }
    } catch (error) {
      console.error('Error parsing cheat sheet section:', error);
      throw new Error(`Failed to parse cheat sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return cheatSheets;
}

function parseSingleCheatSheet(text: string): ParsedCheatSheet | null {
  const lines = text.split('\n').map(line => line.trim());
  
  let title = '';
  let category = '';
  let description = '';
  let bg_color = backgroundColorMap.default;
  const commands: CheatSheetCommand[] = [];
  
  let inCommandsSection = false;
  
  for (const line of lines) {
    if (!line) continue;
    
    // Parse metadata
    if (line.startsWith('**Title:**')) {
      title = line.replace('**Title:**', '').trim();
    } else if (line.startsWith('**Category:**')) {
      category = line.replace('**Category:**', '').trim();
    } else if (line.startsWith('**Description:**')) {
      description = line.replace('**Description:**', '').trim();
    } else if (line.startsWith('**Background:**')) {
      const bgKey = line.replace('**Background:**', '').trim().toLowerCase();
      bg_color = backgroundColorMap[bgKey] || backgroundColorMap.default;
    } else if (line.startsWith('### Commands')) {
      inCommandsSection = true;
    } else if (inCommandsSection && line.match(/^\d+\.\s+\*\*/)) {
      // Parse command line: 1. **Tool:** `command` | category | description
      const commandMatch = line.match(/^\d+\.\s+\*\*([^:*]+):\*\*\s*`([^`]+)`\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
      if (commandMatch) {
        const [, tool, command, cmdCategory, cmdDescription] = commandMatch;
        commands.push({
          command: `${tool}: ${command}`,
          description: cmdDescription.trim(),
          category: cmdCategory.trim()
        });
      }
    }
  }
  
  // Validate required fields
  if (!title) {
    throw new Error('Title is required');
  }
  if (!category) {
    throw new Error('Category is required');
  }
  if (commands.length === 0) {
    throw new Error('At least one command is required');
  }
  
  return {
    title,
    category,
    description: description || '',
    bg_color,
    commands
  };
}

export function generateCheatSheetTemplate(): string {
  return `**Title:** Your Cheat Sheet Title
**Category:** Your Category
**Description:** Brief description of what this cheat sheet covers
**Background:** cyber-blue

### Commands

1. **Tool Name:** \`your-command --option\` | Category | Description of what this command does
2. **Another Tool:** \`another-command -param value\` | Category | Another command description
3. **Third Tool:** \`third-command\` | Category | Yet another command description

---

**Title:** Second Cheat Sheet (optional)
**Category:** Another Category
**Description:** Description for the second cheat sheet
**Background:** cyber-purple

### Commands

1. **Tool:** \`command\` | Category | Description`;
}