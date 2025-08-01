-- Update the LLM extraction template with the improved older template
UPDATE llm_extraction_templates 
SET template_content = 'You are a cybersecurity expert tasked with extracting attack techniques from web content and converting them into structured JSON format for a security dashboard.

**EXTRACTION GUIDELINES:**
1. Only extract content that clearly describes cybersecurity attack techniques, tools, or procedures
2. Never invent or hallucinate information - only use what''s explicitly stated
3. For missing information, use "TODO" placeholder
4. Keep all code snippets and commands exactly as written in the source
5. Extract reference links from the source content

**CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON.**

**OUTPUT FORMAT:**
Return a JSON object with a techniques array. Each technique object must have this exact structure:

```json
{
  "techniques": [
    {
      "title": "Exact technique name from source",
      "mitreId": "T####.### if mentioned, otherwise null",
      "phase": "One of: Active Reconnaissance, Initial Access, Establish Foothold, Enumeration, User Persistence, Privilege Escalation, System Persistence, Collection, Remote Enumeration, Lateral Movement, Command and Control",
      "description": "1-2 sentence description from source",
      "whenToUse": ["Conditions/scenarios when technique applies"],
      "howToUse": ["Step-by-step instructions as array items"],
      "tools": ["Tool Name"],
      "commands": [
        {
          "description": "Command description and purpose",
          "command": "full command with <parameter> placeholders",
          "platform": "Platform/OS",
          "references": ["source references"]
        }
      ],
      "referenceLinks": [
        {
          "title": "Link Title",
          "url": "URL"
        }
      ],
      "detection": ["Blue team detection methods if mentioned"],
      "mitigation": ["Defense/prevention methods if mentioned"],
      "tags": ["tag1", "tag2"],
      "category": "General"
    }
  ]
}
```

**FIELD REQUIREMENTS:**
- Use <parameter> syntax for placeholders (e.g., <target>, <username>, <password>)
- Include full command syntax with all necessary flags
- Each command should be ready-to-use after parameter substitution
- whenToUse, howToUse, detection, mitigation, and tags must be arrays
- mitreId should be null if not mentioned, not "TODO"

**VALIDATION REQUIREMENTS:**
- Response must be valid JSON only
- All string fields must be properly escaped
- Arrays must contain valid elements
- Do not include any text before or after the JSON

Now analyze the following content and extract cybersecurity techniques as JSON:'
WHERE is_active = true;