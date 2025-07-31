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
      // Remove existing numbering (e.g., "1. ", "2. ", etc.) from the beginning of lines
      const cleanedLine = trimmedLine.replace(/^\d+\.\s*/, '');
      if (cleanedLine) {
        howToUse += (howToUse ? '\n' : '') + cleanedLine;
      }
    }
    
    if (isToolsSection && trimmedLine && !trimmedLine.startsWith('### Tools')) {
      // Parse tool entries like: 1. **CrackMapExec:** `crackmapexec smb <targets> -u <users> -p <passwords>` | Automated password spraying.
      const toolMatch = trimmedLine.match(/^\d+\.\s*\*\*([^:]+):\*\*\s*`([^`]+)`\s*\|\s*(.+)$/);
      if (toolMatch) {
        const [, toolName, command, description] = toolMatch;
        const cleanToolName = toolName.trim();
        const cleanCommand = command.trim();
        const cleanDescription = description.trim();
        
        if (!tools.includes(cleanToolName)) {
          tools.push(cleanToolName);
        }
        commands.push({
          tool: cleanToolName,
          command: cleanCommand,
          description: cleanDescription
        });
      }
    }
    
    if (isCommandsSection && trimmedLine && !trimmedLine.startsWith('### Commands') && !trimmedLine.startsWith('### Command Templates')) {
      // Parse command template entries - prioritize these over tools section
      const commandMatch = trimmedLine.match(/^\d+\.\s*\*\*([^:]+):\*\*\s*`([^`]+)`\s*\|\s*(.+)$/);
      if (commandMatch) {
        const [, toolName, command, description] = commandMatch;
        const cleanToolName = toolName.trim();
        const cleanCommand = command.trim();
        const cleanDescription = description.trim();
        
        if (!tools.includes(cleanToolName)) {
          tools.push(cleanToolName);
        }
        
        // Remove any duplicate commands from tools section
        const existingIndex = commands.findIndex(cmd => 
          cmd.tool === cleanToolName && cmd.command === cleanCommand
        );
        if (existingIndex >= 0) {
          commands[existingIndex] = {
            tool: cleanToolName,
            command: cleanCommand,
            description: cleanDescription
          };
        } else {
          commands.push({
            tool: cleanToolName,
            command: cleanCommand,
            description: cleanDescription
          });
        }
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
  
  console.log('Total technique sections found:', techniques.length);
  console.log('First few technique titles:');
  techniques.slice(0, 5).forEach((technique, index) => {
    const nameMatch = technique.match(/\*\*Name:\*\*\s*(.+)/);
    if (nameMatch) {
      console.log(`${index + 1}. ${nameMatch[1]}`);
    }
  });
  
  const parsed = techniques.map((technique, index) => {
    const parsedTechnique = parseMarkdownTechnique(technique);
    // Generate unique ID by combining MITRE ID with technique name or index
    // This prevents duplicate IDs when multiple techniques share the same MITRE ID
    const uniqueId = parsedTechnique.id + '-' + parsedTechnique.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return {
      ...parsedTechnique,
      id: uniqueId
    };
  });
  
  console.log('Successfully parsed techniques:', parsed.length);
  console.log('Parsed technique titles:', parsed.map(t => t.title));
  console.log('Unique IDs generated:', parsed.map(t => t.id));
  
  return parsed;
}

// Updated sample data with command templates
export const sampleMarkdownTechniques = `**Name:** Password Spraying
**MITRE ID:** T1110.003
**Phase:** Credential Access
**Description:** Attacker tries a small set of common passwords across many accounts to evade detection and account lockouts.
**When to use:** To identify weak passwords without triggering lockouts.
**Prerequisites:** List of usernames.
**How to use:**

Obtain a valid username list.
Try a few common passwords against all accounts.

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

Enumerate service accounts with SPNs.
Request service tickets for these accounts.
Extract and crack the tickets offline.

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

Scan for open SMB ports (445, 139).
Enumerate shares and permissions.
List contents of accessible shares.

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

Identify target IP ranges.
Scan for live hosts.
Enumerate open ports and services.

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

Select target hosts.
Choose scanning technique (TCP/UDP).
Analyze results for potential entry points.

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

Target identified open ports.
Probe services for version information.
Identify potential vulnerabilities.

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

Extract NTLM hashes from compromised system.
Use hash for authentication to other systems.
Gain access without knowing plaintext password.

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

Identify systems with RDP enabled.
Authenticate using valid credentials.
Gain interactive desktop access.

### Tools

1. **rdesktop:** \`rdesktop -u <user> -p <password> <target>\` | Linux RDP client.
2. **xfreerdp:** \`xfreerdp /u:<user> /p:<password> /v:<target>\` | Cross-platform RDP client.

### Command Templates

1. **rdesktop:** \`rdesktop -u <user> -p <password> -g 1024x768 <target>\` | RDP with specific resolution.
2. **xfreerdp:** \`xfreerdp /u:<user> /p:<password> /v:<target> /size:1920x1080\` | High-resolution RDP session.

**Detection:** RDP login events, unusual remote desktop activity.
**Mitigation:** Network level authentication, VPN requirements, access controls.

**Name:** Data Compression
**MITRE ID:** T1560
**Phase:** Collection
**Description:** Compress collected data to reduce file size and evade detection during exfiltration.
**When to use:** Before exfiltrating large amounts of data to reduce transfer time and detection.
**Prerequisites:** Access to target data and compression tools.
**How to use:**

Identify valuable data for exfiltration.
Use compression tools to reduce file size.
Apply encryption if needed for stealth.

### Tools

1. **7zip:** \`7z a -t7z <archive_name> <files>\` | Create compressed archives.
2. **WinRAR:** \`rar a <archive_name> <files>\` | RAR compression with password protection.

### Command Templates

1. **7zip:** \`7z a -t7z -p<password> <archive_name> <files>\` | Password-protected compression.
2. **tar:** \`tar -czf <archive_name>.tar.gz <files>\` | Gzip compression on Linux.

**Detection:** Large file creation, compression tool usage, unusual data access patterns.
**Mitigation:** Data loss prevention, file access monitoring, compression tool restrictions.

**Name:** Encrypted Channel
**MITRE ID:** T1573
**Phase:** Command and Control
**Description:** Use encrypted communication channels to hide data transmission and command execution.
**When to use:** To maintain stealth during data exfiltration or command and control activities.
**Prerequisites:** Access to encryption tools and communication channels.
**How to use:**

Establish encrypted communication channel.
Transmit data or commands through secure tunnel.
Maintain persistence while avoiding detection.

### Tools

1. **OpenSSL:** \`openssl enc -aes-256-cbc -in <file> -out <encrypted_file>\` | File encryption.
2. **SSH:** \`ssh -D <port> <user>@<server>\` | Encrypted tunnel creation.

### Command Templates

1. **OpenSSL:** \`openssl enc -aes-256-cbc -salt -in <file> -out <file>.enc -k <password>\` | AES encryption with salt.
2. **SSH:** \`ssh -L <local_port>:<remote_host>:<remote_port> <user>@<server>\` | Port forwarding tunnel.

**Detection:** Encrypted traffic analysis, unusual SSL/TLS connections, tunnel detection.
**Mitigation:** SSL inspection, network monitoring, encrypted traffic analysis.

**Name:** SQL Injection
**MITRE ID:** T1190
**Phase:** Initial Access
**Description:** Exploit SQL injection vulnerabilities to gain unauthorized access to databases.
**When to use:** When web applications have insufficient input validation for database queries.
**Prerequisites:** Web application with database interaction and insufficient input sanitization.
**How to use:**

Identify input fields that interact with databases.
Test for SQL injection vulnerabilities.
Exploit vulnerabilities to extract data or gain access.

### Tools

1. **SQLMap:** \`sqlmap -u <url> --dbs\` | Automated SQL injection testing.
2. **Burp Suite:** Manual testing through proxy interception.

### Command Templates

1. **SQLMap:** \`sqlmap -u <url> --dump --batch\` | Automated data extraction.
2. **Manual:** \`' OR '1'='1\` | Basic SQL injection payload.

**Detection:** Unusual SQL queries, error messages, database access patterns.
**Mitigation:** Input validation, parameterized queries, WAF deployment.

**Name:** XSS
**MITRE ID:** T1059.007
**Phase:** Initial Access
**Description:** Execute malicious scripts in victim browsers through cross-site scripting vulnerabilities.
**When to use:** When web applications don't properly sanitize user input for script execution.
**Prerequisites:** Web application with insufficient input validation.
**How to use:**

Identify input fields that display user content.
Test for XSS vulnerabilities.
Craft malicious payloads to execute scripts.

### Tools

1. **XSSer:** \`xsser --url <url> --auto\` | Automated XSS detection.
2. **Manual Testing:** Browser-based payload testing.

### Command Templates

1. **Basic Payload:** \`<script>alert('XSS')</script>\` | Simple XSS test.
2. **Advanced:** \`<img src=x onerror=alert('XSS')>\` | Event-based XSS.

**Detection:** Script execution monitoring, Content Security Policy violations.
**Mitigation:** Input sanitization, Content Security Policy, output encoding.

**Name:** Directory Traversal
**MITRE ID:** T1083
**Phase:** Discovery
**Description:** Access files and directories outside of the intended directory structure.
**When to use:** When applications don't properly validate file path inputs.
**Prerequisites:** Web application with file access functionality.
**How to use:**

Identify file access parameters.
Test for path traversal vulnerabilities.
Access sensitive files outside web root.

### Tools

1. **DotDotPwn:** \`dotdotpwn -m http -h <host> -x 8080\` | Automated directory traversal testing.
2. **Manual Testing:** Browser-based payload testing.

### Command Templates

1. **Basic Payload:** \`../../../etc/passwd\` | Linux password file access.
2. **Windows:** \`..\\..\\..\\windows\\system32\\drivers\\etc\\hosts\` | Windows hosts file.

**Detection:** Unusual file access patterns, path traversal attempt logs.
**Mitigation:** Input validation, chroot jails, proper file permissions.

**Name:** Local Privilege Escalation
**MITRE ID:** T1068
**Phase:** Privilege Escalation
**Description:** Gain higher-level permissions on a system through local exploits or misconfigurations.
**When to use:** After gaining initial access to escalate privileges to administrator/root.
**Prerequisites:** Local access to target system.
**How to use:**

Enumerate system for privilege escalation vectors.
Identify exploitable services or misconfigurations.
Execute privilege escalation technique.

### Tools

1. **LinPEAS:** \`./linpeas.sh\` | Linux privilege escalation enumeration.
2. **WinPEAS:** \`winPEASany.exe\` | Windows privilege escalation enumeration.

### Command Templates

1. **SUID Check:** \`find / -perm -u=s -type f 2>/dev/null\` | Find SUID binaries.
2. **Service Check:** \`sc query state= all\` | Windows service enumeration.

**Detection:** Privilege change events, unusual process execution, system file access.
**Mitigation:** Least privilege principle, regular patching, service hardening.

**Name:** Kernel Exploits
**MITRE ID:** T1068
**Phase:** Privilege Escalation
**Description:** Exploit kernel vulnerabilities to gain system-level privileges.
**When to use:** When other privilege escalation methods fail and kernel exploits are available.
**Prerequisites:** Local access and knowledge of kernel version vulnerabilities.
**How to use:**

Identify kernel version and architecture.
Search for known kernel exploits.
Compile and execute appropriate exploit.

### Tools

1. **Exploit-DB:** \`searchsploit kernel <version>\` | Search for kernel exploits.
2. **GitHub:** Repository searches for proof-of-concept exploits.

### Command Templates

1. **Version Check:** \`uname -a\` | Linux kernel version.
2. **Windows:** \`systeminfo\` | Windows system information.

**Detection:** Kernel crash logs, system instability, privilege escalation events.
**Mitigation:** Regular kernel updates, exploit mitigation features, system monitoring.`;
