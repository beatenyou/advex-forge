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
  let isCommandsSection = false;
  
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
      isCommandsSection = false;
    } else if (trimmedLine.startsWith('### Tools') || trimmedLine.startsWith('### Tools and Commands')) {
      currentSection = 'tools';
      isToolsSection = true;
      isCommandsSection = false;
    } else if (trimmedLine.startsWith('### Commands') || trimmedLine.startsWith('### Command Templates')) {
      currentSection = 'commands';
      isToolsSection = false;
      isCommandsSection = true;
    } else if (trimmedLine.startsWith('##') || trimmedLine.startsWith('###')) {
      currentSection = '';
      isToolsSection = false;
      isCommandsSection = false;
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
    
    if (isCommandsSection && trimmedLine && !trimmedLine.startsWith('### Commands') && !trimmedLine.startsWith('### Command Templates')) {
      // Parse command template entries
      const commandMatch = trimmedLine.match(/^\d+\.\s*\*\*([^:]+):\*\*\s*`([^`]+)`\s*\|\s*(.+)$/);
      if (commandMatch) {
        const [, toolName, command, description] = commandMatch;
        if (!tools.includes(toolName.trim())) {
          tools.push(toolName.trim());
        }
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

// Updated sample data with command templates
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

1. **CrackMapExec:** \`crackmapexec smb <target> -u <username> -p <password>\` | Automated password spraying.
2. **Hydra:** \`hydra -L <userlist> -P <passlist> <target> <service>\` | Brute-force and spray attempts.

### Command Templates

1. **CrackMapExec:** \`crackmapexec smb <target> -u <username> -p <password> --continue-on-success\` | Spray passwords across multiple targets.
2. **Hydra:** \`hydra -L <userlist> -p <password> <target> <service> -t 1 -W 30\` | Controlled password spraying with delays.

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

1. **Rubeus:** \`Rubeus.exe kerberoast /outfile:<output_file>\` | Request and extract Kerberos tickets.
2. **Impacket:** \`GetUserSPNs.py <domain>/<user>:<password> -dc-ip <dc_ip> -request\` | Python-based Kerberoasting.

### Command Templates

1. **Rubeus:** \`Rubeus.exe kerberoast /outfile:<output_file> /domain:<domain> /dc:<dc_ip>\` | Full Kerberoasting with domain specification.
2. **Impacket:** \`GetUserSPNs.py <domain>/<user>:<password> -dc-ip <dc_ip> -request -outputfile <output_file>\` | Save hashes to file.

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

### Command Templates

1. **smbclient:** \`smbclient -L //<target> -U <username>%<password>\` | Authenticated share enumeration.
2. **enum4linux:** \`enum4linux -a <target> -u <username> -p <password>\` | Authenticated comprehensive enumeration.

**Detection:** SMB connection logs, unusual share access patterns.
**Mitigation:** Disable unnecessary shares, implement proper access controls.

**Name:** Network Scanning
**MITRE ID:** T1046
**Phase:** Reconnaissance
**Description:** Scan networks to identify live hosts, open ports, and services running on target systems.
**When to use:** During initial reconnaissance phase to map the target network.
**Prerequisites:** Network access to target range.
**How to use:**

1. Identify target IP ranges.
2. Scan for live hosts.
3. Enumerate open ports and services.

### Tools

1. **Nmap:** \`nmap -sS -A <target>\` | Comprehensive network scan.
2. **Masscan:** \`masscan -p1-65535 <target> --rate=1000\` | High-speed port scanner.

### Command Templates

1. **Nmap:** \`nmap -sS -sV -sC <target>\` | Service version detection with default scripts.
2. **Masscan:** \`masscan -p80,443,22,21,25 <target_range> --rate=10000\` | Fast scan of common ports.

**Detection:** Network scanning signatures, port scan alerts, unusual connection patterns.
**Mitigation:** Network segmentation, IDS/IPS deployment, rate limiting.

**Name:** Port Scanning
**MITRE ID:** T1046
**Phase:** Reconnaissance
**Description:** Systematically probe target systems to identify open ports and available services.
**When to use:** To discover potential attack vectors through open services.
**Prerequisites:** Target IP addresses or hostnames.
**How to use:**

1. Select target hosts.
2. Choose scanning technique (TCP/UDP).
3. Analyze results for potential entry points.

### Tools

1. **Nmap:** \`nmap -p- <target>\` | Scan all 65535 ports.
2. **Zmap:** \`zmap -p 80 <target_range>\` | Internet-wide port scanning.

### Command Templates

1. **Nmap:** \`nmap -sS -T4 -p1-1000 <target>\` | Fast TCP SYN scan of common ports.
2. **Zmap:** \`zmap -p 443 <target_range> -o results.txt\` | HTTPS port scan with output.

**Detection:** Port scan detection systems, connection attempt logging.
**Mitigation:** Firewall rules, port scan detection tools, network monitoring.

**Name:** Service Enumeration
**MITRE ID:** T1046
**Phase:** Reconnaissance
**Description:** Identify and fingerprint services running on discovered open ports to understand target capabilities.
**When to use:** After port scanning to gather detailed service information.
**Prerequisites:** List of open ports on target systems.
**How to use:**

1. Target identified open ports.
2. Probe services for version information.
3. Identify potential vulnerabilities.

### Tools

1. **Nmap:** \`nmap -sV <target>\` | Service version detection.
2. **Banner:** \`nc -nv <target> <port>\` | Manual banner grabbing.

### Command Templates

1. **Nmap:** \`nmap -sV -sC --script=banner <target>\` | Version detection with banner scripts.
2. **Telnet:** \`telnet <target> <port>\` | Manual service interaction.

**Detection:** Service fingerprinting attempts, banner grabbing activity.
**Mitigation:** Service hardening, banner removal, intrusion detection.

**Name:** Pass the Hash
**MITRE ID:** T1550.002
**Phase:** Lateral Movement
**Description:** Use captured password hashes to authenticate to other systems without cracking the password.
**When to use:** When NTLM hashes are obtained but password cracking is not feasible.
**Prerequisites:** Valid NTLM hash from compromised system.
**How to use:**

1. Extract NTLM hashes from compromised system.
2. Use hash for authentication to other systems.
3. Gain access without knowing plaintext password.

### Tools

1. **CrackMapExec:** \`crackmapexec smb <target> -u <user> -H <hash>\` | Pass the hash authentication.
2. **Impacket:** \`psexec.py <domain>/<user>@<target> -hashes <lm>:<ntlm>\` | Remote command execution with hash.

### Command Templates

1. **CrackMapExec:** \`crackmapexec smb <target_range> -u <user> -H <hash> --local-auth\` | Local authentication with hash.
2. **Impacket:** \`wmiexec.py <domain>/<user>@<target> -hashes :<ntlm>\` | WMI execution with NTLM hash.

**Detection:** Unusual authentication patterns, NTLM authentication monitoring.
**Mitigation:** Disable NTLM authentication, use Kerberos, credential guard.

**Name:** Remote Desktop Protocol
**MITRE ID:** T1021.001
**Phase:** Lateral Movement
**Description:** Use RDP to gain interactive access to remote systems using valid credentials.
**When to use:** When RDP is enabled and valid credentials are available.
**Prerequisites:** Valid credentials and RDP access to target system.
**How to use:**

1. Identify systems with RDP enabled.
2. Authenticate using valid credentials.
3. Gain interactive desktop access.

### Tools

1. **rdesktop:** \`rdesktop -u <user> -p <password> <target>\` | Linux RDP client.
2. **xfreerdp:** \`xfreerdp /u:<user> /p:<password> /v:<target>\` | Cross-platform RDP client.

### Command Templates

1. **rdesktop:** \`rdesktop -u <user> -p <password> -g 1024x768 <target>\` | RDP with specific resolution.
2. **xfreerdp:** \`xfreerdp /u:<user> /p:<password> /v:<target> /size:1920x1080\` | High-resolution RDP session.

**Detection:** RDP login events, unusual remote desktop activity.
**Mitigation:** Network level authentication, VPN requirements, access controls.`;
