export interface ParsedScenario {
  title: string;
  description?: string;
  phase: string;
  tags: string[];
  linked_techniques: string[];
  order_index?: number;
  is_active?: boolean;
}

export function parseScenarioMarkdown(markdownText: string): ParsedScenario {
  const lines = markdownText.split('\n');
  const scenario: ParsedScenario = {
    title: '',
    description: '',
    phase: 'Reconnaissance',
    tags: [],
    linked_techniques: [],
    order_index: 0,
    is_active: true,
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('**Title:**')) {
      scenario.title = trimmedLine.replace('**Title:**', '').trim();
    } else if (trimmedLine.startsWith('**Description:**')) {
      scenario.description = trimmedLine.replace('**Description:**', '').trim();
    } else if (trimmedLine.startsWith('**Phase:**')) {
      scenario.phase = trimmedLine.replace('**Phase:**', '').trim();
    } else if (trimmedLine.startsWith('**Tags:**')) {
      const tagsString = trimmedLine.replace('**Tags:**', '').trim();
      scenario.tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } else if (trimmedLine.startsWith('- ') && scenario.linked_techniques !== undefined) {
      // This is a linked technique
      const technique = trimmedLine.replace('- ', '').trim();
      if (technique) {
        scenario.linked_techniques.push(technique);
      }
    }
  }

  return scenario;
}

export function parseMultipleScenarios(markdownText: string): ParsedScenario[] {
  // Split by double newlines or markdown headers
  const scenarioBlocks = markdownText.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  
  return scenarioBlocks.map(block => parseScenarioMarkdown(block));
}

export const sampleScenarioMarkdown = `**Title:** External Network Reconnaissance
**Description:** Systematic discovery and enumeration of target network infrastructure from external perspective
**Phase:** Reconnaissance
**Tags:** reconnaissance, discovery, external, network
**Linked Techniques:**
- Port Scanning with Nmap
- DNS Enumeration
- Service Version Detection
- WHOIS Information Gathering
- Subdomain Enumeration

**Title:** Credential Harvesting Campaign
**Description:** Multi-vector approach to harvesting user credentials through various attack methods
**Phase:** Credential Access
**Tags:** credentials, phishing, brute-force, harvesting
**Linked Techniques:**
- Password Spraying
- Credential Dumping
- Kerberoasting
- Hash Cracking with Hashcat
- Social Engineering

**Title:** Post-Exploitation Persistence
**Description:** Establishing and maintaining long-term access to compromised systems
**Phase:** Persistence
**Tags:** persistence, backdoor, scheduled-tasks, registry
**Linked Techniques:**
- Registry Run Key Persistence
- Scheduled Task Creation
- Service Installation
- DLL Hijacking
- Startup Folder Modification

**Format Guidelines:**
- Use exact technique titles as they appear in the techniques database
- Available phases: Reconnaissance, Active Reconnaissance, Initial Access, Persistence, Privilege Escalation, Discovery, Lateral Movement, Collection, Command and Control, Credential Access, Enumeration
- Tags should be lowercase and comma-separated
- Each scenario should be separated by a blank line`;