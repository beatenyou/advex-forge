import { TemplateManagementService } from './TemplateManagementService';

interface ExtractionResult {
  success: boolean;
  techniques?: any[];
  rawContent?: string;
  error?: string;
}

export class TechniqueImportService {
  static async getDefaultExtractionTemplate(): Promise<string> {
    try {
      const template = await TemplateManagementService.getDefaultTemplateContent();
      return template;
    } catch (error) {
      console.warn('Failed to load template from database, using fallback:', error);
      return this.getHardcodedTemplate();
    }
  }

  static getHardcodedTemplate(): string {
    return `You are a cybersecurity expert tasked with extracting attack techniques from web content and converting them into structured JSON format for a security dashboard.

**EXTRACTION GUIDELINES:**
1. Only extract content that clearly describes cybersecurity attack techniques, tools, or procedures
2. Never invent or hallucinate information - only use what's explicitly stated
3. For missing information, use "TODO" placeholder
4. Keep all code snippets and commands exactly as written in the source
5. Extract reference links from the source content
6. **CRITICAL**: Always populate the "tools" array with ALL tools mentioned in the technique description and commands
7. Extract tool names from command descriptions, tool sections, and inline mentions

**CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON.**

**OUTPUT FORMAT:**
Return a JSON object with a techniques array. Each technique object must have this exact structure:

\`\`\`json
{
  "techniques": [
    {
      "title": "Exact technique name from source",
      "mitreId": "T####.### if mentioned, otherwise TODO",
      "phase": "One of: Reconnaissance, Enumeration, Initial Access, Privilege Escalation, Persistence, Credential Access, Lateral Movement, Collection, Command and Control",
      "description": "1-2 sentence description from source",
      "whenToUse": ["Conditions/scenarios when technique applies"],
      "howToUse": ["Step-by-step instructions formatted as **Step 1:**, **Step 2:**, etc. (without numbering like 1. 2. 3.)"],
      "tools": [
        "Tool Name 1",
        "Tool Name 2"
      ],
      "commands": [
        {
          "tool": "Tool Name",
          "command": "full command with <parameter> placeholders",
          "description": "Command description and purpose"
        }
      ],
      "referenceLinks": [
        {
          "title": "Link Title",
          "url": "URL",
          "description": "Description"
        }
      ],
      "detection": ["Blue team detection methods if mentioned"],
      "mitigation": ["Defense/prevention methods if mentioned"],
      "tags": ["tag1", "tag2"],
      "category": "General"
    }
  ]
}
\`\`\`

- Use <parameter> syntax for placeholders (e.g., <target>, <username>, <password>)
- Include full command syntax with all necessary flags
- Each command should be ready-to-use after parameter substitution

**VALIDATION REQUIREMENTS:**
- Response must be valid JSON only
- All string fields must be properly escaped
- Arrays must contain valid elements
- Do not include any text before or after the JSON

Now analyze the following content and extract cybersecurity techniques as JSON:

{content}`;
  }
}