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

export const sampleScenarioMarkdown = `**Title:** Advanced Persistent Threat (APT) Simulation
**Description:** A comprehensive scenario simulating advanced persistent threat tactics
**Phase:** Reconnaissance
**Tags:** apt, advanced, persistent, threat
**Linked Techniques:**
- Network Scanning
- Social Engineering
- Spear Phishing
- Lateral Movement

**Title:** Red Team Assessment
**Description:** Full-scale red team assessment of enterprise infrastructure
**Phase:** Initial Access
**Tags:** red team, assessment, enterprise
**Linked Techniques:**
- Vulnerability Scanning
- Exploitation
- Privilege Escalation
- Persistence

**Title:** Web Application Penetration Test
**Description:** Focused testing of web application security vulnerabilities
**Phase:** Initial Access
**Tags:** web, application, penetration, testing
**Linked Techniques:**
- SQL Injection
- XSS
- CSRF
- Directory Traversal`;