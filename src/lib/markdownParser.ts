export interface ParsedTechnique {
  id: string;
  title: string;
  description: string;
  phase: string;
  tags: string[];
  tools: string[];
  starred: boolean;
  category: string;
  whenToUse?: string;
  prerequisites?: string;
  howToUse?: string;
  commands?: Array<{
    tool: string;
    command: string;
    description: string;
  }>;
  detection?: string;
  mitigation?: string;
  mitreMapping?: string;
}

export function parseMarkdownTechnique(markdownText: string): ParsedTechnique {
  const lines = markdownText.trim().split('\n');
  
  let name = '';
  let mitreId = '';
  let phase = '';
  let description = '';
  let whenToUse = '';
  let prerequisites = '';
  let howToUse = '';
  let detection = '';
  let mitigation = '';
  const commands: Array<{ tool: string; command: string; description: string }> = [];
  const tools: string[] = [];
  
  let currentSection = '';
  let isToolsSection = false;
  let toolLines: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Parse header fields
    if (trimmedLine.startsWith('**Name:**')) {
      name = trimmedLine.replace('**Name:**', '').trim();
    } else if (trimmedLine.startsWith('**MITRE ID:**')) {
      mitreId = trimmedLine.replace('**MITRE ID:**', '').trim();
    } else if (trimmedLine.startsWith('**Phase:**')) {
      phase = trimmedLine.replace('**Phase:**', '').trim();
    } else if (trimmedLine.startsWith('**Description:**')) {
      description = trimmedLine.replace('**Description:**', '').trim();
    } else if (trimmedLine.startsWith('**When to use:**')) {
      whenToUse = trimmedLine.replace('**When to use:**', '').trim();
    } else if (trimmedLine.startsWith('**Prerequisites:**')) {
      prerequisites = trimmedLine.replace('**Prerequisites:**', '').trim();
    } else if (trimmedLine.startsWith('**Detection:**')) {
      detection = trimmedLine.replace('**Detection:**', '').trim();
    } else if (trimmedLine.startsWith('**Mitigation:**')) {
      mitigation = trimmedLine.replace('**Mitigation:**', '').trim();
    }
    
    // Handle sections
    if (trimmedLine.startsWith('**How to use:**')) {
      currentSection = 'howToUse';
      isToolsSection = false;
    } else if (trimmedLine.startsWith('### Tools')) {
      currentSection = 'tools';
      isToolsSection = true;
      toolLines = [];
    } else if (trimmedLine.startsWith('##') || trimmedLine.startsWith('###')) {
      currentSection = '';
      isToolsSection = false;
    }
    
    // Collect content for sections
    if (currentSection === 'howToUse' && !trimmedLine.startsWith('**How to use:**') && trimmedLine && !trimmedLine.startsWith('###')) {
      howToUse += (howToUse ? '\n' : '') + trimmedLine;
    }
    
    if (isToolsSection && trimmedLine && !trimmedLine.startsWith('### Tools')) {
      // Parse tool entries like: 1. **CrackMapExec:** `crackmapexec smb <targets> -u <users> -p <passwords>` | Automated password spraying.
      const toolMatch = trimmedLine.match(/^\d+\.\s*\*\*([^:]+):\*\*\s*`([^`]+)`\s*\|\s*(.+)$/);
      if (toolMatch) {
        const [, toolName, command, description] = toolMatch;
        tools.push(toolName.trim());
        commands.push({
          tool: toolName.trim(),
          command: command.trim(),
          description: description.trim()
        });
      }
    }
  }
  
  // Generate category from phase
  const categoryMap: Record<string, string> = {
    'Enumeration': 'enumeration',
    'Initial Access': 'initial-access',
    'Privilege Escalation': 'privilege-escalation',
    'Persistence': 'persistence',
    'Credential Access': 'credential-access',
    'Lateral Movement': 'lateral-movement'
  };
  
  const category = categoryMap[phase] || phase.toLowerCase().replace(/\s+/g, '-');
  
  // Generate tags from phase, tools, and description
  const tags = [
    phase,
    ...tools.slice(0, 2), // Include first 2 tools as tags
    ...(description.toLowerCase().includes('password') ? ['Password Attack'] : []),
    ...(description.toLowerCase().includes('kerberos') ? ['Kerberos'] : []),
    ...(description.toLowerCase().includes('ntlm') ? ['NTLM'] : [])
  ];
  
  return {
    id: mitreId,
    title: name,
    description,
    phase,
    tags: [...new Set(tags)], // Remove duplicates
    tools,
    starred: false,
    category,
    whenToUse,
    prerequisites,
    howToUse,
    commands,
    detection,
    mitigation,
    mitreMapping: mitreId
  };
}

export function parseMultipleMarkdownTechniques(markdownText: string): ParsedTechnique[] {
  // Split by double newlines or by "**Name:**" markers to separate techniques
  const techniques = markdownText.split(/(?=\*\*Name:\*\*)/g).filter(section => section.trim());
  
  return techniques.map(technique => parseMarkdownTechnique(technique));
}

// Sample data to replace initialTechniques
export const sampleMarkdownTechniques = `**Name:** Password Spraying
**MITRE ID:** T1110.003
**Phase:** Credential Access
**Description:** Attacker tries a small set of common passwords across many accounts to evade detection and account lockouts.
**When to use:** To identify weak passwords without triggering lockouts.
**Prerequisites:** List of usernames.
**How to use:**

1. Obtain a valid username list.
2. Try a few common passwords against all accounts.

### Tools

1. **CrackMapExec:** \`crackmapexec smb <targets> -u <users> -p <passwords>\` | Automated password spraying.
2. **Hydra:** \`hydra -L users.txt -P passwords.txt <target> <service>\` | Brute-force and spray attempts.

**Detection:** Multiple authentication attempts from single IP, use of known common passwords.
**Mitigation:** MFA, strong password complexity, lockout policies.

**Name:** Kerberoasting
**MITRE ID:** T1558.001
**Phase:** Credential Access
**Description:** Extract service account credentials by requesting service tickets and cracking them offline.
**When to use:** When service accounts have weak passwords or when offline cracking is preferred.
**Prerequisites:** Domain user account access.
**How to use:**

1. Enumerate service accounts with SPNs.
2. Request service tickets for these accounts.
3. Extract and crack the tickets offline.

### Tools

1. **Rubeus:** \`Rubeus.exe kerberoast /outfile:hashes.txt\` | Request and extract Kerberos tickets.
2. **Impacket:** \`GetUserSPNs.py domain/user:password -dc-ip <dc> -request\` | Python-based Kerberoasting.

**Detection:** Unusual TGS requests, service ticket requests from non-service accounts.
**Mitigation:** Strong service account passwords, managed service accounts.

**Name:** SMB Enumeration
**MITRE ID:** T1135
**Phase:** Enumeration
**Description:** Discover SMB shares and their contents to identify potential attack vectors.
**When to use:** During initial reconnaissance to map network resources.
**Prerequisites:** Network access to target systems.
**How to use:**

1. Scan for open SMB ports (445, 139).
2. Enumerate shares and permissions.
3. List contents of accessible shares.

### Tools

1. **smbclient:** \`smbclient -L //<target> -N\` | List SMB shares anonymously.
2. **enum4linux:** \`enum4linux -a <target>\` | Comprehensive SMB enumeration.

**Detection:** SMB connection logs, unusual share access patterns.
**Mitigation:** Disable unnecessary shares, implement proper access controls.`;